const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Session = require('../models/Session');
const mongoose = require('mongoose');

/**
 * Feedback Routes
 * 
 * Provides endpoints for clients to submit and retrieve session feedback.
 * All routes require authentication.
 */

// @route   POST /api/feedback
// @desc    Submit feedback for a completed session
// @access  Private (Client only)
router.post('/', auth, async (req, res) => {
  try {
    const { sessionId, rating, comment, isAnonymous } = req.body;
    const clientId = req.user.id;

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Session ID is required' 
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Rating must be between 1 and 5' 
      });
    }

    // Validate sessionId format
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid session ID format' 
      });
    }

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Session not found' 
      });
    }

    // Verify the client is the session's client
    if (session.client.toString() !== clientId) {
      return res.status(403).json({ 
        success: false, 
        msg: 'You can only submit feedback for your own sessions' 
      });
    }

    // Verify session is completed
    if (session.status !== 'Completed') {
      return res.status(400).json({ 
        success: false, 
        msg: 'Feedback can only be submitted for completed sessions' 
      });
    }

    // Check for duplicate feedback
    const existingFeedback = await Feedback.findOne({ session: sessionId });
    if (existingFeedback) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Feedback has already been submitted for this session' 
      });
    }

    // Create feedback record
    const feedback = new Feedback({
      session: sessionId,
      client: clientId,
      psychologist: session.psychologist,
      rating: Math.round(rating), // Ensure integer
      comment: comment ? comment.trim() : '',
      isAnonymous: isAnonymous || false
    });

    await feedback.save();

    console.log(`✅ Feedback submitted for session ${sessionId} by client ${clientId}`);

    res.status(201).json({
      success: true,
      msg: 'Feedback submitted successfully',
      feedback: {
        _id: feedback._id,
        session: feedback.session,
        rating: feedback.rating,
        comment: feedback.comment,
        isAnonymous: feedback.isAnonymous,
        createdAt: feedback.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    
    // Handle duplicate key error (unique constraint on session)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Feedback has already been submitted for this session' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while submitting feedback' 
    });
  }
});

// @route   GET /api/feedback/client
// @desc    Get all feedback submitted by the logged-in client
// @access  Private (Client only)
router.get('/client', auth, async (req, res) => {
  try {
    const clientId = req.user.id;

    const feedback = await Feedback.find({ client: clientId })
      .populate('session', 'sessionDate sessionType bookingReference')
      .populate('psychologist', 'name')
      .sort({ createdAt: -1 });

    // Always return array (empty if no feedback) - never 404
    res.json({
      success: true,
      feedback: feedback || [],
      count: feedback.length
    });

  } catch (error) {
    console.error('❌ Error fetching client feedback:', error);
    // Return empty array on error to prevent frontend issues
    res.json({ 
      success: true, 
      feedback: [],
      count: 0
    });
  }
});

// @route   GET /api/feedback/session/:sessionId
// @desc    Get feedback for a specific session
// @access  Private (Client who owns session or Psychologist of session)
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Validate sessionId format
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid session ID format' 
      });
    }

    // Find the session to verify authorization
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Session not found' 
      });
    }

    // Verify user is either the client or psychologist of this session
    const isClient = session.client.toString() === userId;
    const isPsychologist = session.psychologist.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isPsychologist && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        msg: 'You are not authorized to view feedback for this session' 
      });
    }

    // Find feedback for this session
    const feedback = await Feedback.findOne({ session: sessionId })
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!feedback) {
      return res.json({ 
        success: true, 
        feedback: null,
        msg: 'No feedback submitted for this session yet'
      });
    }

    // If feedback is anonymous and viewer is psychologist, hide client info
    let responseData = {
      _id: feedback._id,
      session: feedback.session,
      rating: feedback.rating,
      comment: feedback.comment,
      isAnonymous: feedback.isAnonymous,
      createdAt: feedback.createdAt
    };

    // Include client info only if not anonymous or if viewer is the client/admin
    if (!feedback.isAnonymous || isClient || isAdmin) {
      responseData.client = feedback.client;
    }

    responseData.psychologist = feedback.psychologist;

    res.json({
      success: true,
      feedback: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching session feedback:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while fetching feedback' 
    });
  }
});

module.exports = router;
