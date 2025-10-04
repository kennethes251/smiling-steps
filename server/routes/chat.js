const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @route   POST /api/chat/conversations
// @desc    Create or find a conversation, possibly linked to an assessment
// @access  Private
router.post('/conversations', auth, async (req, res) => {
  const { psychologistId, assessmentResultId } = req.body;

  try {
    // Find a psychologist if one isn't provided (e.g., for a general chat)
    // This logic can be as simple or complex as needed (e.g., random, least busy)
    const psychologist = await User.findOne({ role: 'psychologist' });
    if (!psychologist) {
      return res.status(404).json({ msg: 'No available psychologists.' });
    }

    let conversation = await Conversation.findOne({
      client: req.user.id,
      psychologist: psychologist._id,
      ...(assessmentResultId && { assessmentResult: assessmentResultId }),
    });

    if (conversation) {
      return res.json(conversation);
    }

    conversation = new Conversation({
      client: req.user.id,
      psychologist: psychologist._id,
      ...(assessmentResultId && { assessmentResult: assessmentResultId }),
    });

    await conversation.save();
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
      .populate('client', 'name')
      .populate('psychologist', 'name')
      .sort({ 'lastMessage.timestamp': -1 });

    res.json(conversations);
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
