const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Models are initialized globally in server/index.js
// Access them via global.Session and global.User

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
    const client = await global.User.findByPk(req.user.id);
    console.log('👤 Client found:', { id: client?.id, name: client?.name, role: client?.role });
    
    if (!client || client.role !== 'client') {
      return res.status(403).json({ msg: 'User is not authorized to book sessions' });
    }

    // Verify psychologist exists
    const psychologist = await global.User.findByPk(psychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(400).json({ msg: 'Invalid psychologist selected' });
    }

    // Check for scheduling conflicts (Sequelize syntax)
    const existingSession = await global.Session.findOne({ 
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

    // Generate unique meeting link for video call
    const meetingLink = `room-${uuidv4()}`;

    const session = await global.Session.create({
      clientId: req.user.id,
      psychologistId: psychologistId,
      sessionType,
      sessionDate,
      price: sessionRate || price,
      sessionRate: sessionRate || price,
      status: 'Pending Approval',
      paymentStatus: 'Pending',
      meetingLink: meetingLink,
      isVideoCall: true
    });

    console.log('✅ Session request created successfully:', session.id);
    console.log('🎥 Meeting link generated:', meetingLink);
    
    // Send notification to psychologist
    try {
      const { sendSessionRequestNotification } = require('../utils/notificationService');
      await sendSessionRequestNotification(session, client, psychologist);
      console.log('✅ Session request notification sent to psychologist');
    } catch (notificationError) {
      console.error('⚠️ Failed to send request notification:', notificationError.message);
      // Don't fail the booking if notification fails
    }
    
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

  console.log('📝 Booking request received (legacy endpoint):', {
    userId: req.user.id,
    psychologistId,
    sessionType,
    sessionDate,
    price
  });

  try {
    // The logged-in user is the client
    const client = await global.User.findByPk(req.user.id);
    console.log('👤 Client found:', { id: client?.id, name: client?.name, role: client?.role });
    
    if (!client || client.role !== 'client') {
      return res.status(403).json({ msg: 'User is not authorized to book sessions' });
    }

    // Check for scheduling conflicts
    const existingSession = await global.Session.findOne({ 
      where: {
        psychologistId: psychologistId, 
        sessionDate: sessionDate, 
        status: { 
          [Op.in]: ['Pending Approval', 'Approved', 'Confirmed', 'In Progress'] 
        }
      }
    });

    if (existingSession) {
      return res.status(400).json({ msg: 'This time slot is already booked or pending confirmation. Please choose another time.' });
    }

    // Generate unique meeting link for video call
    const meetingLink = `room-${uuidv4()}`;

    const session = await global.Session.create({
      clientId: req.user.id,
      psychologistId: psychologistId,
      sessionType,
      sessionDate,
      price,
      sessionRate: price,
      status: 'Pending Approval',
      paymentStatus: 'Pending',
      meetingLink: meetingLink,
      isVideoCall: true
    });

    console.log('✅ Session created successfully:', session.id);
    console.log('🎥 Meeting link generated:', meetingLink);
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
    const user = await global.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    let sessions;
    console.log('🔍 User role:', user.role);
    
    if (user.role === 'client') {
      console.log('✅ Fetching client sessions');
      sessions = await global.Session.findAll({ 
        where: { clientId: req.user.id },
        include: [{ 
          model: global.User, 
          as: 'psychologist', 
          attributes: ['id', 'name', 'email'] 
        }],
        order: [['sessionDate', 'ASC']]
      });
    } else if (user.role === 'psychologist') {
      console.log('✅ Fetching psychologist sessions');
      sessions = await global.Session.findAll({ 
        where: { psychologistId: req.user.id },
        include: [{ 
          model: global.User, 
          as: 'client', 
          attributes: ['id', 'name', 'email'] 
        }],
        order: [['sessionDate', 'ASC']]
      });
    } else if (user.role === 'admin') {
      console.log('✅ Fetching all sessions (admin)');
      sessions = await global.Session.findAll({
        include: [
          { model: global.User, as: 'client', attributes: ['id', 'name', 'email'] },
          { model: global.User, as: 'psychologist', attributes: ['id', 'name', 'email'] }
        ],
        order: [['sessionDate', 'ASC']]
      });
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
    const session = await global.Session.findByPk(req.params.id, {
      include: [
        { model: global.User, as: 'client', attributes: ['id', 'name', 'email', 'role'] },
        { model: global.User, as: 'psychologist', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if user is authorized to view this session
    if (session.clientId !== req.user.id && 
        session.psychologistId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }

    res.json(session);
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   DELETE api/sessions/:id
// @desc    Cancel a session
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await global.Session.findByPk(req.params.id);
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if the user is either the client or psychologist for this session
    if (session.clientId !== req.user.id && session.psychologistId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to cancel this session' });
    }

    // Update session status to 'Cancelled' instead of deleting
    session.status = 'Cancelled';
    session.cancellationReason = req.body.reason || 'Cancelled by user';
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
    const user = await global.User.findByPk(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const sessions = await global.Session.findAll({
      where: {
        psychologistId: req.user.id,
        status: 'Pending Approval'
      },
      include: [{ 
        model: global.User, 
        as: 'client', 
        attributes: ['id', 'name', 'email'] 
      }],
      order: [['createdAt', 'DESC']]
    });

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
    const session = await global.Session.findByPk(req.params.id);

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
    const psychologist = await global.User.findByPk(req.user.id);
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
      const client = await global.User.findByPk(session.clientId);
      
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
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id/decline
// @desc    Decline a pending session
// @access  Private (Psychologist only)
router.put('/:id/decline', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const session = await global.Session.findByPk(req.params.id);

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

    // Send notification to client
    try {
      const { sendSessionDeclinedNotification } = require('../utils/notificationService');
      const client = await global.User.findByPk(session.clientId);
      const psychologist = await global.User.findByPk(session.psychologistId);
      
      await sendSessionDeclinedNotification(session, client, psychologist);
      console.log('✅ Session declined notification sent to client');
    } catch (notificationError) {
      console.error('⚠️ Failed to send declined notification:', notificationError.message);
    }

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
    const session = await global.Session.findByPk(req.params.id);

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

    // Notify therapist/admin to verify payment
    try {
      const { sendPaymentSubmittedNotification } = require('../utils/notificationService');
      const psychologist = await global.User.findByPk(session.psychologistId);
      const client = await global.User.findByPk(session.clientId);
      
      await sendPaymentSubmittedNotification(session, client, psychologist);
      console.log('✅ Payment submitted notification sent to psychologist');
    } catch (notificationError) {
      console.error('⚠️ Failed to send payment notification:', notificationError.message);
    }

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
    const session = await global.Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    const user = await global.User.findByPk(req.user.id);
    
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

    // Send confirmation email/SMS to client with meeting link
    try {
      const { sendSessionConfirmedNotification } = require('../utils/notificationService');
      const client = await global.User.findByPk(session.clientId);
      const psychologist = await global.User.findByPk(session.psychologistId);
      
      await sendSessionConfirmedNotification(session, client, psychologist);
      console.log('✅ Session confirmed notification sent to client');
    } catch (notificationError) {
      console.error('⚠️ Failed to send confirmation notification:', notificationError.message);
    }

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
    const session = await global.Session.findByPk(req.params.id);

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
    const session = await global.Session.findByPk(req.params.id);

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
    const psychologist = await global.User.findByPk(psychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(400).json({ msg: 'Invalid psychologist selected' });
    }

    // Generate unique meeting link for instant video call
    const meetingLink = `room-${uuidv4()}`;

    // Create instant session
    const session = await global.Session.create({
      clientId: req.user.id,
      psychologistId: psychologistId,
      sessionType,
      sessionDate: new Date(), // Immediate
      price: 1500, // Instant session price
      sessionRate: 1500,
      status: 'Confirmed', // Auto-approve instant sessions
      paymentStatus: 'Pending',
      isVideoCall: true,
      title: title || 'Instant Video Consultation',
      meetingLink: meetingLink
    });

    // Fetch with associations
    const sessionWithDetails = await global.Session.findByPk(session.id, {
      include: [
        { model: global.User, as: 'psychologist', attributes: ['id', 'name', 'email'] },
        { model: global.User, as: 'client', attributes: ['id', 'name', 'email'] }
      ]
    });

    console.log('🎥 Instant session meeting link generated:', meetingLink);
    res.json(sessionWithDetails);
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
    const session = await global.Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check authorization
    if (session.clientId !== req.user.id && 
        session.psychologistId !== req.user.id) {
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
    const session = await global.Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check authorization
    if (session.clientId !== req.user.id && 
        session.psychologistId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Calculate duration if call was started
    let duration = 0;
    if (session.videoCallStarted) {
      const endTime = new Date();
      duration = Math.round((endTime - session.videoCallStarted) / (1000 * 60)); // minutes
      session.videoCallEnded = endTime;
      session.duration = duration;
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
    // Get first client and psychologist for testing
    const client = await global.User.findOne({ where: { role: 'client' } });
    const psychologist = await global.User.findOne({ where: { role: 'psychologist' } });
    
    if (!client) {
      return res.status(400).json({ error: 'No client found' });
    }
    if (!psychologist) {
      return res.status(400).json({ error: 'No psychologist found' });
    }

    // Generate meeting link for test session
    const meetingLink = `room-${uuidv4()}`;

    const testSession = await global.Session.create({
      clientId: client.id,
      psychologistId: psychologist.id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: 2000,
      sessionRate: 2000,
      status: 'Pending Approval',
      paymentStatus: 'Pending',
      isVideoCall: true,
      meetingLink: meetingLink
    });

    res.json({ 
      success: true, 
      message: 'Test session created successfully',
      session: testSession,
      client: { name: client.name, email: client.email },
      psychologist: { name: psychologist.name, email: psychologist.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
