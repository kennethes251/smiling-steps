const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');

// @route   POST api/sessions
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
router.get('/', (req, res, next) => {
  console.log('🚀 SESSIONS ROUTE HIT - Before auth middleware');
  console.log('🔍 Headers:', req.headers['x-auth-token'] ? 'Token present' : 'No token');
  next();
}, auth, async (req, res) => {
  console.log('📋 GET /api/sessions - After auth middleware');
  console.log('👤 User from auth:', req.user);
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    let sessions;

    console.log('🔍 User role check:', { 
      userId: user._id, 
      userRole: user.role, 
      roleType: typeof user.role 
    });
    try {
      if (user.role === 'client') {
        console.log('✅ User is client, fetching client sessions');
        console.log('🔍 About to query Session model...');
        console.log('🔍 Query params:', { client: req.user.id });
        
        // Test if Session model is accessible
        console.log('🔍 Session model:', typeof Session);
        
        sessions = await Session.find({ client: req.user.id }).populate('psychologist', 'name email');
        console.log('📊 Found sessions for client:', sessions.length);
      } else if (user.role === 'psychologist') {
        console.log('✅ User is psychologist, fetching psychologist sessions');
        sessions = await Session.find({ psychologist: req.user.id }).populate('client', 'name email');
        console.log('📊 Found sessions for psychologist:', sessions.length);
      } else {
        console.log('❌ User role not recognized:', user.role);
        return res.status(403).json({ msg: `User role '${user.role}' not authorized to view sessions` });
      }

      console.log('✅ Sending sessions response:', sessions.length, 'sessions');
      res.json(sessions);
    } catch (dbError) {
      console.error('❌ Database error in sessions query:', dbError);
      return res.status(500).json({ msg: 'Database error', error: dbError.message });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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

// @route   PUT api/sessions/:id/approve
// @desc    Approve a pending session
// @access  Private (Psychologist only)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if the logged-in user is the assigned psychologist
    if (session.psychologist.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Check if the session is pending
    if (session.status !== 'Pending') {
      return res.status(400).json({ msg: 'Session is not pending and cannot be approved' });
    }

    // Get psychologist's session rate
    const psychologist = await User.findById(req.user.id);
    const sessionRate = req.body.sessionRate || psychologist?.sessionRate || 0;
    
    session.status = 'Booked';
    session.paymentAmount = sessionRate;
    session.paymentStatus = 'Pending';
    session.paymentInstructions = 'Send payment to M-Pesa number: 0707439299';
    session.paymentNotifiedAt = new Date();
    
    await session.save();

    console.log('✅ Session approved with payment info:', {
      sessionId: session._id,
      paymentAmount: sessionRate,
      paymentStatus: 'Pending'
    });

    res.json(session);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id/link
// @desc    Add a meeting link to a session
// @access  Private (Psychologist only)
router.put('/:id/link', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologist.toString() !== req.user.id) {
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
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologist.toString() !== req.user.id) {
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
