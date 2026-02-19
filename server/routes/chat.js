const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @route   POST /api/chat/conversations
// @desc    Create or find a conversation between client and psychologist
// @access  Private
router.post('/conversations', auth, async (req, res) => {
  const { psychologistId, clientId, assessmentResultId } = req.body;

  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    let targetClientId, targetPsychologistId;

    // Determine client and psychologist based on who is making the request
    if (currentUser.role === 'client') {
      targetClientId = req.user.id;
      targetPsychologistId = psychologistId;
      
      // If no psychologist specified, find one (for general chat)
      if (!targetPsychologistId) {
        const psychologist = await User.findOne({ role: 'psychologist', approvalStatus: 'approved' });
        if (!psychologist) {
          return res.status(404).json({ msg: 'No available psychologists.' });
        }
        targetPsychologistId = psychologist._id;
      }
    } else if (currentUser.role === 'psychologist') {
      targetPsychologistId = req.user.id;
      targetClientId = clientId;
      
      if (!targetClientId) {
        return res.status(400).json({ msg: 'Client ID is required for psychologist to start conversation.' });
      }
    } else {
      return res.status(403).json({ msg: 'Only clients and psychologists can start conversations.' });
    }

    // Validate the other party exists
    const psychologist = await User.findById(targetPsychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ msg: 'Psychologist not found.' });
    }

    const client = await User.findById(targetClientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ msg: 'Client not found.' });
    }

    // Find existing conversation or create new one
    let conversation = await Conversation.findOne({
      client: targetClientId,
      psychologist: targetPsychologistId,
      ...(assessmentResultId && { assessmentResult: assessmentResultId }),
    });

    if (conversation) {
      // Populate and return existing conversation
      await conversation.populate('client', 'name email');
      await conversation.populate('psychologist', 'name email');
      return res.json(conversation);
    }

    conversation = new Conversation({
      client: targetClientId,
      psychologist: targetPsychologistId,
      ...(assessmentResultId && { assessmentResult: assessmentResultId }),
    });

    await conversation.save();
    await conversation.populate('client', 'name email');
    await conversation.populate('psychologist', 'name email');
    
    res.status(201).json(conversation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations for a user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ client: req.user.id }, { psychologist: req.user.id }],
    })
      .populate('client', 'name email profilePicture')
      .populate('psychologist', 'name email profilePicture')
      .sort({ 'lastMessage.timestamp': -1 });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user.id },
          isRead: false,
          isDeleted: false
        });
        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    res.json(conversationsWithUnread);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/chat/conversations/:id
// @desc    Get a specific conversation by ID
// @access  Private
router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('client', 'name email profilePicture')
      .populate('psychologist', 'name email profilePicture');

    if (!conversation) {
      return res.status(404).json({ msg: 'Conversation not found' });
    }

    // Ensure the user is part of the conversation
    if (conversation.client._id.toString() !== req.user.id && 
        conversation.psychologist._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'User not authorized for this conversation' });
    }

    res.json(conversation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/chat/conversations/:id/messages
// @desc    Get all messages for a conversation
// @access  Private
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 'asc' });

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/chat/conversations/:id/messages
// @desc    Send a message
// @access  Private
router.post('/conversations/:id/messages', auth, async (req, res) => {
  const { text } = req.body;

  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ msg: 'Conversation not found' });
    }

    // Ensure the user is part of the conversation
    if (conversation.client.toString() !== req.user.id && conversation.psychologist.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'User not authorized for this conversation' });
    }

    const message = new Message({
      conversation: req.params.id,
      sender: req.user.id,
      text,
    });

    await message.save();

    // Update the last message in the conversation
    conversation.lastMessage = {
        text,
        sender: req.user.id,
        timestamp: new Date()
    };
    await conversation.save();

    // In a real-time app, you would emit this message via WebSockets
    const populatedMessage = await message.populate('sender', 'name avatar');
    res.status(201).json(populatedMessage);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;


// @route   PUT /api/chat/conversations/:id/read
// @desc    Mark all messages in a conversation as read
// @access  Private
router.put('/conversations/:id/read', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ msg: 'Conversation not found' });
    }

    // Ensure the user is part of the conversation
    if (conversation.client.toString() !== req.user.id && 
        conversation.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'User not authorized for this conversation' });
    }

    // Mark all messages from the other party as read
    const result = await Message.updateMany(
      {
        conversation: req.params.id,
        sender: { $ne: req.user.id },
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.json({ 
      msg: 'Messages marked as read',
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/chat/unread-count
// @desc    Get total unread message count for user
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    // Find all conversations the user is part of
    const conversations = await Conversation.find({
      $or: [{ client: req.user.id }, { psychologist: req.user.id }],
    });

    const conversationIds = conversations.map(c => c._id);

    // Count unread messages across all conversations
    const unreadCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: req.user.id },
      isRead: false,
      isDeleted: false
    });

    res.json({ unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
