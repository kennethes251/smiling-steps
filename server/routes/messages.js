const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Message = require('../models/Message');
const Session = require('../models/Session');
const User = require('../models/User');

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
  const { sessionId, content } = req.body;

  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Determine receiver
    const senderId = req.user.id;
    let receiverId;
    if (session.client.toString() === senderId) {
      receiverId = session.psychologist;
    } else if (session.psychologist.toString() === senderId) {
      receiverId = session.client;
    } else {
      return res.status(401).json({ msg: 'User not authorized to send messages for this session' });
    }

    const newMessage = new Message({
      session: sessionId,
      sender: senderId,
      receiver: receiverId,
      content,
    });

    const message = await newMessage.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages
// @desc    Get all messages for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find({ receiver: req.user.id })
      .populate('sender', 'name')
      .populate('session', 'sessionDate sessionType')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
