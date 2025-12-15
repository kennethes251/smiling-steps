const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
// Use Mongoose models
const Session = require('../models/Session');
const User = require('../models/User');

// @route   POST api/sessions/request
// @desc    Create a new session booking request (pending therapist approval)
// @access  Private (Client only)
router.post('/request', auth, async (req, res) => {
  const { psychologistId, sessionType, sessionDate, sessionRate, price } = req.body;

  console.log('📝 Booking request received:', {
    userId: req.user.id,
    psychologistId,
    sessionType,
    sessionDate,
    sessionRate
  });

  try {
    // The logged-in user is the client
    const client = await User.findByPk(req.user.id);
    console.log('👤 Client found:', { id: client?.id, name: client?.name, role: client?.role });
    if (!client || client.role !== 'client') {
      return res.status(403).json({ msg: 'User is not authorized to book sessions' });
    }

    // Verify psychologist exists
    const psychologist = await User.findByPk(psychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(400).json({ msg: 'Invalid psychologist selected' });
    }

    // Check for scheduling conflicts (Sequelize syntax)
    const { Op } = require('sequelize');
    const existingSession = await Session.findOne({ 
      where: {
        psychologistId: psychologistId, 
        sessionDate: sessionDate, 
        status: { 
          [Op.in]: ['Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'In Progress'] 
        }
      }
    });

    if (existingSession) {
      return res.status(400).json({ msg: 'This time slot is already booked. Please choose another time.' });
    }

    const session = await Session.create({
      clientId: req.user.id,
      psychologistId: psychologistId,
      sessionType,
      sessionDate,
      price: sessionRate || price,
      sessionRate: sessionRate || price,
      status: 'Pending Approval',
      paymentStatus: 'Pending'
    });

    console.log('✅ Session request created successfully:', session.id);
    
    // TODO: Send notification to psychologist
    
    res.status(201).json({ 
      success: true,
      msg: 'Booking request submitted successfully',
      session 
    });
  } catch (err) {
    console.error('❌ Session creation error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/sessions (legacy endpoint - keep for backward compatibility)
// @desc    Book a new session
// @access  Private
router.post('/', auth, async (req, res) => {
  const { psychologistId, sessionType, sessionDate, price } = req.body;

  console.log('📝 Booking request received:', {
    userId: req.user.id,
    psychologistId,
    sessionType,
    sessionDate,
    price
  });

  try {
    // The logged-in user is the client
    const client = await User.findById(req.user.id);
    console.log('👤 Client found:', { id: client?._id, name: client?.name, role: client?.role });
    if (!client || client.role !== 'client') {
      return res.status(403).json({ msg: 'User is not authorized to book sessions' });
    }

    // Check for scheduling conflicts
    const existingSession = await Session.findOne({ 
      psychologist: psychologistId, 
      sessionDate: sessionDate, 
      status: { $in: ['Booked', 'Pending'] } // Check against both booked and pending sessions
    });

    if (existingSession) {
      return res.status(400).json({ msg: 'This time slot is already booked or pending confirmation. Please choose another time.' });
    }

    const newSession = new Session({
      client: req.user.id,
      psychologist: psychologistId,
      sessionType,
      sessionDate,
      price,
    });

    const session = await newSession.save();
    console.log('✅ Session created successfully:', session._id);
    res.json(session);
  } catch (err) {
    console.error('❌ Session creation error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions
// @desc    Get all sessions for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  console.log('📋 GET /api/sessions');
  console.log('👤 User from auth:', req.user);
  try {
    // Mongoose - findById
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    let sessions;

    console.log('🔍 User role:', user.role);
    
    if (user.role === 'client') {
      console.log('✅ Fetching client sessions');
      sessions = await Session.find({ client: req.user.id })
        .populate('psychologist', 'name email')
        .sort({ sessionDate: 1 });
    } else if (user.role === 'psychologist') {
      console.log('✅ Fetching psychologist sessions');
      sessions = await Session.find({ psychologist: req.user.id })
        .populate('client', 'name email')
        .sort({ sessionDate: 1 });
    } else if (user.role === 'admin') {
      console.log('✅ Fetching all sessions (admin)');
      sessions = await Session.find({})
        .populate('client', 'name email')
        .populate('psychologist', 'name email')
        .sort({ sessionDate: 1 });
    } else {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    console.log('✅ Found', sessions.length, 'sessions');
    res.json(sessions);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/:id
// @desc    Get a specific session by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('client', 'name email role')
      .populate('psychologist', 'name email role');

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if user is authorized to view this session
    if (session.client._id.toString() !== req.user.id && 
        session.psychologist._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }

    res.json(session);
  } catch (err) {
    console.error('Error fetching session:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   DELETE api/sessions/:id
// @desc    Cancel a session
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if the user is either the client or psychologist for this session
    if (session.client.toString() !== req.user.id && session.psychologist.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to cancel this session' });
    }

    // Update session status to 'Cancelled' instead of deleting
    session.status = 'Cancelled';
    await session.save();

    res.json({ msg: 'Session successfully cancelled' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/sessions/pending-approval
// @desc    Get sessions pending therapist approval
// @access  Private (Psychologist only)
router.get('/pending-approval', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const sessions = await Session.find({
      psychologist: req.user.id,
      status: 'Pending Approval'
    })
    .populate('client', 'name email')
    .sort({ createdAt: -1 });

    res.json({ success: true, sessions });
  } catch (err) {
    console.error('Error fetching pending sessions:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT api/sessions/:id/approve
// @desc    Approve a pending session and send payment instructions
// @access  Private (Psychologist only)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    // Use Sequelize findByPk instead of Mongoose findById
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if the logged-in user is the assigned psychologist
    if (session.psychologistId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Check if the session is pending approval
    if (session.status !== 'Pending Approval' && session.status !== 'Pending') {
      return res.status(400).json({ msg: 'Session is not pending approval' });
    }

    // Get psychologist's payment info
    const psychologist = await User.findByPk(req.user.id);
    const sessionRate = req.body.sessionRate || psychologist?.psychologistDetails?.sessionRate || 2500;
    const mpesaNumber = psychologist?.psychologistDetails?.paymentInfo?.mpesaNumber || '0707439299';
    const mpesaName = psychologist?.psychologistDetails?.paymentInfo?.mpesaName || psychologist?.name;
    
    // Update session
    session.status = 'Approved';
    session.approvedBy = req.user.id;
    session.approvedAt = new Date();
    session.paymentStatus = 'Pending';
    session.sessionRate = sessionRate;
    session.price = sessionRate;
    session.paymentInstructions = `Send KSh ${sessionRate} to M-Pesa: ${mpesaNumber} (${mpesaName}). Use your name as reference.`;
    
    await session.save();

    console.log('✅ Session approved:', {
      sessionId: session.id,
      amount: sessionRate,
      status: 'Approved'
    });

    // Send email notification to client with payment instructions
    try {
      const { sendSessionApprovalNotification } = require('../utils/notificationService');
      const client = await User.findByPk(session.clientId);
      
      await sendSessionApprovalNotification(session, client, psychologist);
      console.log('✅ Session approval notification sent to client');
    } catch (notificationError) {
      console.error('⚠️ Failed to send approval notification:', notificationError.message);
      // Don't fail the approval if notification fails
    }

    res.json({ 
      success: true,
      msg: 'Session approved successfully',
      session 
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id/decline
// @desc    Decline a pending session
// @access  Private (Psychologist only)
router.put('/:id/decline', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologistId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (session.status !== 'Pending Approval') {
      return res.status(400).json({ msg: 'Session is not pending approval' });
    }

    session.status = 'Declined';
    session.declineReason = reason || 'Not available at this time';
    
    await session.save();

    console.log('❌ Session declined:', session.id);

    // TODO: Send notification to client

    res.json({ 
      success: true,
      msg: 'Session declined',
      session 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/sessions/:id/submit-payment
// @desc    Submit payment proof for a session
// @access  Private (Client only)
router.post('/:id/submit-payment', auth, async (req, res) => {
  try {
    const { transactionCode, screenshot } = req.body;
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.clientId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (session.status !== 'Approved') {
      return res.status(400).json({ msg: 'Session must be approved before submitting payment' });
    }

    session.paymentProof = {
      transactionCode,
      screenshot,
      submittedAt: new Date()
    };
    session.status = 'Payment Submitted';
    session.paymentStatus = 'Submitted';
    
    await session.save();

    console.log('💰 Payment proof submitted:', session.id);

    // TODO: Notify therapist/admin to verify payment

    res.json({ 
      success: true,
      msg: 'Payment proof submitted successfully',
      session 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id/verify-payment
// @desc    Verify payment and confirm session
// @access  Private (Psychologist/Admin only)
router.put('/:id/verify-payment', auth, async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    const user = await User.findByPk(req.user.id);
    
    // Check authorization - must be the psychologist or an admin
    if (session.psychologistId !== req.user.id && user.role !== 'admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (session.status !== 'Payment Submitted') {
      return res.status(400).json({ msg: 'No payment proof submitted yet' });
    }

    session.status = 'Confirmed';
    session.paymentStatus = 'Verified';
    session.paymentVerifiedBy = req.user.id;
    session.paymentVerifiedAt = new Date();
    
    await session.save();

    console.log('✅ Payment verified, session confirmed:', session.id);

    // TODO: Send confirmation email/SMS to client with meeting link

    res.json({ 
      success: true,
      msg: 'Payment verified and session confirmed',
      session 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id/link
// @desc    Add a meeting link to a session
// @access  Private (Psychologist only)
router.put('/:id/link', auth, async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologistId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    session.meetingLink = req.body.meetingLink;
    await session.save();

    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/sessions/:id/complete
// @desc    Mark a session as complete and add notes/proof
// @access  Private (Psychologist only)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { sessionNotes, sessionProof } = req.body;
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologistId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    session.status = 'Completed';
    session.sessionNotes = sessionNotes;
    session.sessionProof = sessionProof; // Assuming this is a URL to the proof
    await session.save();

    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/sessions/instant
// @desc    Create an instant video session
// @access  Private
router.post('/instant', auth, async (req, res) => {
  try {
    const { psychologistId, sessionType = 'Individual', title } = req.body;
    
    // Verify psychologist exists and is approved
    const psychologist = await User.findById(psychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(400).json({ msg: 'Invalid psychologist selected' });
    }

    // Create instant session
    const newSession = new Session({
      client: req.user.id,
      psychologist: psychologistId,
      sessionType,
      sessionDate: new Date(), // Immediate
      price: 1500, // Instant session price
      status: 'Booked', // Auto-approve instant sessions
      isVideoCall: true,
      isInstantSession: true,
      title: title || 'Instant Video Consultation'
    });

    const session = await newSession.save();
    await session.populate('psychologist', 'name email');
    await session.populate('client', 'name email');

    res.json(session);
  } catch (err) {
    console.error('Instant session creation error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   PUT api/sessions/:id/start-call
// @desc    Mark video call as started
// @access  Private
router.put('/:id/start-call', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check authorization
    if (session.client.toString() !== req.user.id && 
        session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Update session status and start time
    session.status = 'In Progress';
    session.videoCallStarted = new Date();
    await session.save();

    res.json({ msg: 'Video call started', session });
  } catch (err) {
    console.error('Error starting video call:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT api/sessions/:id/end-call
// @desc    Mark video call as ended and calculate duration
// @access  Private
router.put('/:id/end-call', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check authorization
    if (session.client.toString() !== req.user.id && 
        session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Calculate duration if call was started
    let duration = 0;
    if (session.videoCallStarted) {
      const endTime = new Date();
      duration = Math.round((endTime - session.videoCallStarted) / (1000 * 60)); // minutes
      session.videoCallEnded = endTime;
      session.callDuration = duration;
    }

    // Update session status
    session.status = 'Completed';
    await session.save();

    res.json({ 
      msg: 'Video call ended', 
      session,
      duration: `${duration} minutes`
    });
  } catch (err) {
    console.error('Error ending video call:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Debug route to test session creation (remove in production)
router.get('/debug/test', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get first client and psychologist for testing
    const client = await User.findOne({ role: 'client' });
    const psychologist = await User.findOne({ role: 'psychologist' });
    
    if (!client) {
      return res.status(400).json({ error: 'No client found' });
    }
    if (!psychologist) {
      return res.status(400).json({ error: 'No psychologist found' });
    }

    const testSession = new Session({
      client: client._id,
      psychologist: psychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: 2000,
      status: 'Pending',
      isVideoCall: true
    });

    const savedSession = await testSession.save();
    res.json({ 
      success: true, 
      message: 'Test session created successfully',
      session: savedSession,
      client: { name: client.name, email: client.email },
      psychologist: { name: psychologist.name, email: psychologist.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
