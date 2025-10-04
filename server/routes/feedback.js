const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Session = require('../models/Session');
const User = require('../models/User');

// @route   POST api/feedback
// @desc    Submit feedback for a session
// @access  Private (Client only)
router.post('/', auth, async (req, res) => {
  const { sessionId, rating, comment } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'client') {
      return res.status(403).json({ msg: 'Only clients can submit feedback' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Verify the user is the client for this session
    if (session.client.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to leave feedback for this session' });
    }

    // Optional: Check if session is completed. For now, we'll allow feedback on any 'Booked' session.
    if (session.status !== 'Booked') {
        return res.status(400).json({ msg: 'Feedback can only be left for booked sessions.' });
    }

    // Check if feedback already exists for this session
    let existingFeedback = await Feedback.findOne({ session: sessionId });
    if (existingFeedback) {
      return res.status(400).json({ msg: 'Feedback has already been submitted for this session' });
    }

    const newFeedback = new Feedback({
      session: sessionId,
      client: req.user.id,
      psychologist: session.psychologist,
      rating,
      comment,
    });

    const feedback = await newFeedback.save();
    res.json(feedback);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/feedback/psychologist/:id
// @desc    Get all feedback for a specific psychologist
// @access  Private
router.get('/psychologist/:id', auth, async (req, res) => {
    try {
        const feedback = await Feedback.find({ psychologist: req.params.id })
            .populate('client', 'name')
            .populate('session', 'sessionType sessionDate');

        if (!feedback) {
            return res.status(404).json({ msg: 'No feedback found for this psychologist' });
        }

        res.json(feedback);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/feedback/client
// @desc    Get all feedback submitted by the logged-in client
// @access  Private (Client only)
router.get('/client', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'client') {
          return res.status(403).json({ msg: 'Only clients can view their submitted feedback' });
        }

        const feedback = await Feedback.find({ client: req.user.id });

        if (!feedback) {
            return res.status(404).json({ msg: 'No feedback found for this client' });
        }

        res.json(feedback);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
