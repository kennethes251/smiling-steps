const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { findOrCreateConversation, rolesAllowed } = require('../services/directMessageSocketService');

// POST /api/chat/conversations
// Find or create a conversation between the current user and a target user.
// Supports: client<->psychologist, psychologist<->admin, client<->admin
router.post('/conversations', auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    // Legacy support: accept psychologistId or clientId
    const resolvedTargetId = targetUserId || req.body.psychologistId || req.body.clientId;
    if (!resolvedTargetId) {
      return res.status(400).json({ msg: 'targetUserId is required' });
    }

    const currentUser = await User.findById(req.user.id).select('name role');
    const targetUser = await User.findById(resolvedTargetId).select('name role');

    if (!currentUser) return res.status(404).json({ msg: 'Current user not found' });
    if (!targetUser) return res.status(404).json({ msg: 'Target user not found' });

    if (!rolesAllowed(currentUser.role, targetUser.role)) {
      return res.status(403).json({
        msg: `Messaging not allowed between ${currentUser.role} and ${targetUser.role}`,
      });
    }

    const conversation = await findOrCreateConversation(
      { id: req.user.id },
      { id: resolvedTargetId }
    );

    res.json(conversation);
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).send('Server Error');
  }
});

// GET /api/chat/conversations
// Get all conversations for the current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find by participants array (new) OR legacy client/psychologist fields
    const conversations = await Conversation.find({
      $or: [
        { participants: userId },
        { client: userId },
        { psychologist: userId },
      ],
    })
      .populate('participants', 'name email role profilePicture')
      .populate('client', 'name email role profilePicture')
      .populate('psychologist', 'name email role profilePicture')
      .sort({ 'lastMessage.timestamp': -1 });

    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          isRead: false,
          isDeleted: false,
        });
        return { ...conv.toObject(), unreadCount };
      })
    );

    res.json(withUnread);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET /api/chat/conversations/:id
router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate('participants', 'name email role profilePicture')
      .populate('client', 'name email role profilePicture')
      .populate('psychologist', 'name email role profilePicture');

    if (!conv) return res.status(404).json({ msg: 'Conversation not found' });

    const userId = req.user.id;
    const participantIds = conv.participants?.length
      ? conv.participants.map((p) => p._id.toString())
      : [conv.client?._id?.toString(), conv.psychologist?._id?.toString()].filter(Boolean);

    if (!participantIds.includes(userId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.id, isDeleted: false })
      .populate('sender', 'name role profilePicture')
      .sort({ createdAt: 'asc' });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// POST /api/chat/conversations/:id/messages  (REST fallback — real-time via socket)
router.post('/conversations/:id/messages', auth, async (req, res) => {
  const { text } = req.body;
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ msg: 'Conversation not found' });

    const userId = req.user.id;
    const participantIds = conv.participants?.length
      ? conv.participants.map((p) => p.toString())
      : [conv.client?.toString(), conv.psychologist?.toString()].filter(Boolean);

    if (!participantIds.includes(userId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const message = await Message.create({ conversation: req.params.id, sender: userId, text });
    conv.lastMessage = { text, sender: userId, timestamp: new Date() };
    await conv.save();

    const populated = await message.populate('sender', 'name role profilePicture');

    // Also push via socket if available
    const dmIO = req.app.get('dmIO');
    if (dmIO) {
      dmIO.to(`dm:${req.params.id}`).emit('dm:message', {
        conversationId: req.params.id,
        message: populated,
      });
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// PUT /api/chat/conversations/:id/read
router.put('/conversations/:id/read', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ msg: 'Conversation not found' });

    const result = await Message.updateMany(
      { conversation: req.params.id, sender: { $ne: req.user.id }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ msg: 'Messages marked as read', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET /api/chat/unread-count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({
      $or: [{ participants: userId }, { client: userId }, { psychologist: userId }],
    });
    const ids = conversations.map((c) => c._id);
    const unreadCount = await Message.countDocuments({
      conversation: { $in: ids },
      sender: { $ne: userId },
      isRead: false,
      isDeleted: false,
    });
    res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
