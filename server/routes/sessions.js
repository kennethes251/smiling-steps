const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { sessionEncryptionMiddleware } = require('../middleware/sessionEncryption');
const { 
  validateSessionState, 
  logStateTransition,
  handleStateValidationError 
} = require('../middleware/stateValidation');
const { generateMeetingLink } = require('../utils/meetingLinkGenerator');
const SessionStatusManager = require('../utils/sessionStatusManager');
const { logSessionStatusChange } = require('../utils/auditLogger');
// Use Mongoose models
const Session = require('../models/Session');
const User = require('../models/User');

/**
 * Session Status Transition Validation
 * 
 * Valid transitions according to Requirements 9.1-9.6:
 * - pending → approved (therapist approves)
 * - approved → confirmed (payment verified)
 * - confirmed → in_progress (session starts)
 * - in_progress → completed (session ends)
 * - Any non-terminal state → cancelled
 * 
 * Legacy status mappings:
 * - 'Pending Approval' / 'Pending' → pending
 * - 'Approved' → approved
 * - 'Payment Submitted' → payment_submitted
 * - 'Confirmed' / 'Booked' → confirmed
 * - 'In Progress' → in_progress
 * - 'Completed' → completed
 * - 'Cancelled' / 'Declined' → cancelled
 */
const VALID_SESSION_TRANSITIONS = {
  'Pending': ['Approved', 'Cancelled', 'Declined'],
  'Pending Approval': ['Approved', 'Cancelled', 'Declined'],
  'Approved': ['Payment Submitted', 'Confirmed', 'Cancelled', 'Declined'],
  'Payment Submitted': ['Confirmed', 'Cancelled'],
  'Confirmed': ['In Progress', 'Cancelled'],
  'Booked': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  'Completed': [], // Terminal state
  'Cancelled': [], // Terminal state
  'Declined': [] // Terminal state
};

/**
 * Validates if a session status transition is allowed
 * @param {string} currentStatus - Current session status
 * @param {string} newStatus - Desired new status
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateSessionStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_SESSION_TRANSITIONS[currentStatus];
  
  if (!allowedTransitions) {
    return { 
      valid: false, 
      error: `Unknown current status: ${currentStatus}` 
    };
  }
  
  if (allowedTransitions.length === 0) {
    return { 
      valid: false, 
      error: `Cannot transition from terminal state: ${currentStatus}` 
    };
  }
  
  if (!allowedTransitions.includes(newStatus)) {
    return { 
      valid: false, 
      error: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: [${allowedTransitions.join(', ')}]` 
    };
  }
  
  return { valid: true };
}

/**
 * Middleware to validate session status transitions
 * Applies to routes that change session status
 */
const validateStatusTransition = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const newStatus = req.body.newStatus || req.statusTransition?.newStatus;
    
    if (!sessionId || !newStatus) {
      return next(); // Skip validation if no status change
    }
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    const validation = validateSessionStatusTransition(session.status, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Session status transition rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: session.status,
        requestedStatus: newStatus
      });
    }
    
    // Store validation info for downstream use
    req.statusValidation = {
      currentStatus: session.status,
      newStatus,
      valid: true
    };
    
    next();
  } catch (err) {
    console.error('Status validation error:', err);
    res.status(500).json({ msg: 'Server Error during status validation' });
  }
};

// @route   POST api/sessions/request
// @desc    Create a new session booking request (pending therapist approval)
// @access  Private (Client only)
router.post('/request', auth, sessionEncryptionMiddleware, async (req, res) => {
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
    const client = await User.findById(req.user.id);
    console.log('👤 Client found:', { id: client?._id, name: client?.name, role: client?.role });
    if (!client || client.role !== 'client') {
      return res.status(403).json({ msg: 'User is not authorized to book sessions' });
    }

    // Verify psychologist exists
    const psychologist = await User.findById(psychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(400).json({ msg: 'Invalid psychologist selected' });
    }

    // Check for scheduling conflicts (Mongoose syntax)
    const existingSession = await Session.findOne({ 
      psychologist: psychologistId, 
      sessionDate: sessionDate, 
      status: { 
        $in: ['Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'In Progress'] 
      }
    });

    if (existingSession) {
      return res.status(400).json({ msg: 'This time slot is already booked. Please choose another time.' });
    }

    // Lock the current rate for this booking (Requirements 14.3, 14.4)
    const { lockRateForBooking } = require('../utils/rateLockingService');
    const rateLockResult = await lockRateForBooking(psychologistId, sessionType);
    
    if (!rateLockResult.success) {
      console.error('❌ Failed to lock rate:', rateLockResult.error);
      return res.status(400).json({ 
        msg: 'Failed to determine session rate', 
        error: rateLockResult.error 
      });
    }
    
    const lockedRate = rateLockResult.lockedRate;
    console.log('🔒 Rate locked for booking:', {
      sessionType,
      amount: lockedRate.amount,
      duration: lockedRate.duration,
      source: lockedRate.source
    });

    // Generate unique meeting link for video call
    const meetingLink = generateMeetingLink();

    const newSession = new Session({
      client: req.user.id,
      psychologist: psychologistId,
      sessionType,
      sessionDate,
      price: lockedRate.amount, // Use locked rate amount
      sessionRate: lockedRate.amount, // For backward compatibility
      status: 'Pending Approval',
      paymentStatus: 'Pending',
      meetingLink: meetingLink,
      isVideoCall: true
    });

    const session = await newSession.save();
    console.log('✅ Session request created successfully:', session._id);
    console.log('📋 Booking reference generated:', session.bookingReference);
    console.log('🎥 Meeting link generated:', meetingLink);
    
    // Send booking confirmation to client and notification to psychologist (Requirement 1.5)
    try {
      const { 
        sendBookingConfirmationNotification, 
        sendBookingConfirmationSMS,
        sendSessionRequestNotification 
      } = require('../utils/notificationService');
      
      // Send confirmation to client with booking reference
      await sendBookingConfirmationNotification(session, client, psychologist);
      console.log('✅ Booking confirmation sent to client');
      
      // Send SMS confirmation if client has phone
      if (client.phone) {
        await sendBookingConfirmationSMS(session, client);
        console.log('✅ Booking confirmation SMS sent to client');
      }
      
      // Send notification to psychologist
      await sendSessionRequestNotification(session, client, psychologist);
      console.log('✅ Session request notification sent to psychologist');
    } catch (notificationError) {
      console.error('⚠️ Failed to send booking notifications:', notificationError.message);
      // Don't fail the booking if notification fails
    }
    
    res.status(201).json({ 
      success: true,
      msg: 'Booking request submitted successfully',
      bookingReference: session.bookingReference,
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

    // Lock the current rate for this booking (Requirements 14.3, 14.4)
    const { lockRateForBooking } = require('../utils/rateLockingService');
    const rateLockResult = await lockRateForBooking(psychologistId, sessionType);
    
    if (!rateLockResult.success) {
      console.error('❌ Failed to lock rate:', rateLockResult.error);
      return res.status(400).json({ 
        msg: 'Failed to determine session rate', 
        error: rateLockResult.error 
      });
    }
    
    const lockedRate = rateLockResult.lockedRate;
    console.log('🔒 Rate locked for booking:', {
      sessionType,
      amount: lockedRate.amount,
      duration: lockedRate.duration,
      source: lockedRate.source
    });

    // Generate unique meeting link for video call
    const meetingLink = generateMeetingLink();

    const newSession = new Session({
      client: req.user.id,
      psychologist: psychologistId,
      sessionType,
      sessionDate,
      price: lockedRate.amount, // Use locked rate amount instead of client-provided price
      sessionRate: lockedRate.amount, // For backward compatibility
      meetingLink: meetingLink,
      isVideoCall: true
    });

    const session = await newSession.save();
    console.log('✅ Session created successfully:', session._id);
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
router.get('/', auth, sessionEncryptionMiddleware, async (req, res) => {
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
router.get('/:id([0-9a-fA-F]{24})', auth, sessionEncryptionMiddleware, async (req, res) => {
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
router.delete('/:id([0-9a-fA-F]{24})', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if the user is either the client or psychologist for this session
    const isClient = session.client.toString() === req.user.id;
    const isPsychologist = session.psychologist.toString() === req.user.id;
    
    if (!isClient && !isPsychologist) {
      return res.status(401).json({ msg: 'User not authorized to cancel this session' });
    }

    // Validate status transition using new validation function
    const previousStatus = session.status;
    const newStatus = 'Cancelled';
    const validation = validateSessionStatusTransition(previousStatus, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Session cancellation rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: previousStatus,
        requestedStatus: newStatus
      });
    }

    // Update session status to 'Cancelled' instead of deleting
    session.status = newStatus;
    session.cancelledBy = req.user.id;
    session.cancelledAt = new Date();
    await session.save();

    // Log status change to audit trail
    const userRole = isClient ? 'client' : 'psychologist';
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus,
        reason: `Session cancelled by ${userRole}`,
        userId: req.user.id,
        userRole,
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log session status change:', auditError.message);
    }

    console.log('🚫 Session cancelled with status validation:', {
      sessionId: session._id,
      previousStatus,
      newStatus,
      cancelledBy: userRole
    });

    res.json({ 
      msg: 'Session successfully cancelled',
      statusTransition: {
        from: previousStatus,
        to: newStatus,
        valid: true
      }
    });
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
    // Use Mongoose findById
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check if the logged-in user is the assigned psychologist
    if (session.psychologist.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Validate status transition
    const previousStatus = session.status;
    const newStatus = 'Approved';
    const validation = validateSessionStatusTransition(previousStatus, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Session approval rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: previousStatus,
        requestedStatus: newStatus
      });
    }

    // Get psychologist's payment info
    const psychologist = await User.findById(req.user.id);
    const sessionRate = req.body.sessionRate || psychologist?.psychologistDetails?.sessionRate || 2500;
    const mpesaNumber = psychologist?.psychologistDetails?.paymentInfo?.mpesaNumber || '0707439299';
    const mpesaName = psychologist?.psychologistDetails?.paymentInfo?.mpesaName || psychologist?.name;
    
    // Update session with validated state transition
    session.status = newStatus;
    session.approvedBy = req.user.id;
    session.approvedAt = new Date();
    session.paymentStatus = 'Pending';
    session.sessionRate = sessionRate;
    session.price = sessionRate;
    session.paymentInstructions = `Send KSh ${sessionRate} to M-Pesa: ${mpesaNumber} (${mpesaName}). Use your name as reference.`;
    
    await session.save();

    // Log status change to audit trail
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus,
        reason: 'Psychologist approved session booking',
        userId: req.user.id,
        userRole: 'psychologist',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log session status change:', auditError.message);
      // Don't fail the operation if audit logging fails
    }

    console.log('✅ Session approved with status validation:', {
      sessionId: session._id,
      amount: sessionRate,
      previousStatus,
      newStatus,
      transition: `${previousStatus} → ${newStatus}`
    });

    // Send email notification to client with payment instructions
    try {
      const { sendSessionApprovalNotification } = require('../utils/notificationService');
      const client = await User.findById(session.client);
      
      await sendSessionApprovalNotification(session, client, psychologist);
      console.log('✅ Session approval notification sent to client');
    } catch (notificationError) {
      console.error('⚠️ Failed to send approval notification:', notificationError.message);
      // Don't fail the approval if notification fails
    }

    res.json({ 
      success: true,
      msg: 'Session approved successfully',
      session,
      statusTransition: {
        from: previousStatus,
        to: newStatus,
        valid: true
      }
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
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologist.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Validate status transition
    const previousStatus = session.status;
    const newStatus = 'Declined';
    const validation = validateSessionStatusTransition(previousStatus, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Session decline rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: previousStatus,
        requestedStatus: newStatus
      });
    }

    session.status = newStatus;
    session.declineReason = reason || 'Not available at this time';
    
    await session.save();

    // Log status change to audit trail
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus,
        reason: reason || 'Not available at this time',
        userId: req.user.id,
        userRole: 'psychologist',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log session status change:', auditError.message);
    }

    console.log('❌ Session declined with status validation:', {
      sessionId: session._id,
      previousStatus,
      newStatus,
      reason: session.declineReason
    });

    // TODO: Send notification to client

    res.json({ 
      success: true,
      msg: 'Session declined',
      session,
      statusTransition: {
        from: previousStatus,
        to: newStatus,
        valid: true
      }
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
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.client.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Validate status transition using new validation function
    const previousStatus = session.status;
    const newStatus = 'Payment Submitted';
    const validation = validateSessionStatusTransition(previousStatus, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Payment submission rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: previousStatus,
        requestedStatus: newStatus
      });
    }

    session.paymentProof = {
      transactionCode,
      screenshot,
      submittedAt: new Date()
    };
    session.status = newStatus;
    session.paymentStatus = 'Submitted';
    
    await session.save();

    // Log status change to audit trail
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus,
        reason: `Payment proof submitted with transaction code: ${transactionCode || 'N/A'}`,
        userId: req.user.id,
        userRole: 'client',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log session status change:', auditError.message);
    }

    console.log('💰 Payment proof submitted with status validation:', {
      sessionId: session._id,
      previousStatus,
      newStatus,
      transactionCode
    });

    // TODO: Notify therapist/admin to verify payment

    res.json({ 
      success: true,
      msg: 'Payment proof submitted successfully',
      session,
      statusTransition: {
        from: previousStatus,
        to: newStatus,
        valid: true
      }
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
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    const user = await User.findById(req.user.id);
    
    // Check authorization - must be the psychologist or an admin
    if (session.psychologist.toString() !== req.user.id && user.role !== 'admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Validate status transition using new validation function
    const previousStatus = session.status;
    const newStatus = 'Confirmed';
    const validation = validateSessionStatusTransition(previousStatus, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Payment verification rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: previousStatus,
        requestedStatus: newStatus
      });
    }

    session.status = newStatus;
    session.paymentStatus = 'Verified';
    session.paymentVerifiedBy = req.user.id;
    session.paymentVerifiedAt = new Date();
    
    await session.save();

    // Log status change to audit trail
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus,
        reason: 'Payment verified and session confirmed',
        userId: req.user.id,
        userRole: user.role,
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log session status change:', auditError.message);
    }

    console.log('✅ Payment verified, session confirmed with status validation:', {
      sessionId: session._id,
      previousStatus,
      newStatus,
      transition: `${previousStatus} → ${newStatus}`
    });

    // TODO: Send confirmation email/SMS to client with meeting link

    res.json({ 
      success: true,
      msg: 'Payment verified and session confirmed',
      session,
      statusTransition: {
        from: previousStatus,
        to: newStatus,
        valid: true
      }
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
router.post('/:id/complete', auth, sessionEncryptionMiddleware, async (req, res) => {
  try {
    const { sessionNotes, sessionProof } = req.body;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.psychologist.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Validate status transition using new validation function
    const previousStatus = session.status;
    const newStatus = 'Completed';
    const validation = validateSessionStatusTransition(previousStatus, newStatus);
    
    if (!validation.valid) {
      console.error(`❌ Session completion rejected: ${validation.error}`);
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: validation.error,
        currentStatus: previousStatus,
        requestedStatus: newStatus
      });
    }

    session.status = newStatus;
    session.sessionNotes = sessionNotes;
    session.sessionProof = sessionProof; // Assuming this is a URL to the proof
    await session.save();

    // Log status change to audit trail
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus,
        reason: 'Session marked as completed by psychologist',
        userId: req.user.id,
        userRole: 'psychologist',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log session status change:', auditError.message);
    }

    console.log('✅ Session completed with status validation:', {
      sessionId: session._id,
      previousStatus,
      newStatus,
      transition: `${previousStatus} → ${newStatus}`
    });

    res.json({
      session,
      statusTransition: {
        from: previousStatus,
        to: newStatus,
        valid: true
      }
    });
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

    // Lock the current rate for this instant booking (Requirements 14.3, 14.4)
    const { lockRateForBooking } = require('../utils/rateLockingService');
    const rateLockResult = await lockRateForBooking(psychologistId, sessionType);
    
    if (!rateLockResult.success) {
      console.error('❌ Failed to lock rate for instant session:', rateLockResult.error);
      return res.status(400).json({ 
        msg: 'Failed to determine session rate', 
        error: rateLockResult.error 
      });
    }
    
    const lockedRate = rateLockResult.lockedRate;
    console.log('🔒 Rate locked for instant booking:', {
      sessionType,
      amount: lockedRate.amount,
      duration: lockedRate.duration,
      source: lockedRate.source
    });

    // Generate unique meeting link for instant video call
    const meetingLink = generateMeetingLink();

    // Create instant session
    const newSession = new Session({
      client: req.user.id,
      psychologist: psychologistId,
      sessionType,
      sessionDate: new Date(), // Immediate
      price: lockedRate.amount, // Use locked rate amount instead of hardcoded price
      sessionRate: lockedRate.amount, // For backward compatibility
      status: 'Booked', // Auto-approve instant sessions
      paymentStatus: 'Pending', // Still needs payment
      isVideoCall: true,
      isInstantSession: true,
      title: title || 'Instant Video Consultation',
      meetingLink: meetingLink
    });

    const session = await newSession.save();
    await session.populate('psychologist', 'name email');
    await session.populate('client', 'name email');

    console.log('🎥 Instant session meeting link generated:', meetingLink);
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
    const userId = req.user.id;
    const result = await SessionStatusManager.startVideoCall(req.params.id, userId);
    
    res.json({ 
      msg: result.message, 
      session: result.session,
      success: result.success
    });
  } catch (error) {
    console.error('Error starting video call:', error);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({ msg: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ msg: error.message });
    }
    if (error.message.includes('Payment') || error.message.includes('cancelled') || error.message.includes('declined')) {
      return res.status(400).json({ msg: error.message });
    }
    
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT api/sessions/:id/end-call
// @desc    Mark video call as ended and calculate duration
// @access  Private
router.put('/:id/end-call', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await SessionStatusManager.endVideoCall(req.params.id, userId);
    
    res.json({ 
      msg: result.message, 
      session: result.session,
      duration: `${result.duration} minutes`,
      success: result.success
    });
  } catch (error) {
    console.error('Error ending video call:', error);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({ msg: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ msg: error.message });
    }
    
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/sessions/history
// @desc    Get session history with call details for the logged-in user
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0, includeActive = false } = req.query;
    
    // Get user to determine role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Build query based on user role
    let matchQuery = {};
    if (user.role === 'client') {
      matchQuery.client = userId;
    } else if (user.role === 'psychologist') {
      matchQuery.psychologist = userId;
    } else if (user.role === 'admin') {
      // Admin can see all sessions - no additional filter
    } else {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    // Filter for sessions with call data or completed sessions
    const statusFilter = includeActive === 'true' 
      ? { $in: ['Completed', 'In Progress'] }
      : 'Completed';
    
    matchQuery.status = statusFilter;

    // Get sessions with call history
    const sessions = await Session.find(matchQuery)
      .populate('client', 'name email profilePicture')
      .populate('psychologist', 'name email profilePicture psychologistDetails')
      .sort({ sessionDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Process sessions to include call statistics
    const { getCallStatistics } = require('../utils/callDurationUtils');
    
    const sessionHistory = sessions.map(session => {
      const callStats = getCallStatistics(session);
      
      return {
        sessionId: session._id,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        client: {
          id: session.client._id,
          name: session.client.name,
          profilePicture: session.client.profilePicture
        },
        psychologist: {
          id: session.psychologist._id,
          name: session.psychologist.name,
          profilePicture: session.psychologist.profilePicture,
          specializations: session.psychologist.psychologistDetails?.specializations || []
        },
        callData: {
          startTime: session.videoCallStarted,
          endTime: session.videoCallEnded,
          duration: session.callDuration,
          durationFormatted: callStats.durationFormatted,
          status: callStats.status,
          hasCallData: callStats.hasCallData
        },
        meetingLink: session.meetingLink,
        price: session.price || session.sessionRate,
        paymentStatus: session.paymentStatus,
        createdAt: session.createdAt
      };
    });

    // Get total count for pagination
    const totalCount = await Session.countDocuments(matchQuery);

    res.json({
      success: true,
      sessionHistory,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount,
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });

  } catch (err) {
    console.error('Session history error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/search/reference
// @desc    Search sessions by booking reference number
// @access  Private
router.get('/search/reference', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        msg: 'Search query must be at least 2 characters',
        sessions: []
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Search by booking reference
    const sessions = await Session.searchByBookingReference(q.trim(), {
      limit: parseInt(limit),
      populate: true
    });

    // Filter results based on user role
    let filteredSessions = sessions;
    if (user.role === 'client') {
      filteredSessions = sessions.filter(s => s.client._id.toString() === req.user.id);
    } else if (user.role === 'psychologist') {
      filteredSessions = sessions.filter(s => s.psychologist._id.toString() === req.user.id);
    }
    // Admin can see all sessions

    console.log(`🔍 Booking reference search: "${q}" found ${filteredSessions.length} results`);

    res.json({
      success: true,
      query: q,
      count: filteredSessions.length,
      sessions: filteredSessions.map(session => ({
        _id: session._id,
        bookingReference: session.bookingReference,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        paymentStatus: session.paymentStatus,
        client: session.client,
        psychologist: session.psychologist,
        price: session.price || session.sessionRate,
        createdAt: session.createdAt
      }))
    });
  } catch (err) {
    console.error('Booking reference search error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/by-reference/:reference
// @desc    Get a specific session by booking reference number
// @access  Private
router.get('/by-reference/:reference', auth, async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ msg: 'Booking reference is required' });
    }

    const session = await Session.findByBookingReference(reference);
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found with this booking reference' });
    }

    // Populate client and psychologist
    await session.populate('client', 'name email');
    await session.populate('psychologist', 'name email');

    // Check authorization
    const user = await User.findById(req.user.id);
    if (user.role === 'client' && session.client._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }
    if (user.role === 'psychologist' && session.psychologist._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }

    console.log(`📋 Session found by reference: ${reference}`);

    res.json({
      success: true,
      session
    });
  } catch (err) {
    console.error('Get session by reference error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/therapist/history
// @desc    Get session history for therapist with advanced filtering
// @access  Private (Psychologist only)
// Requirements: 11.4 - Session history filtered by client name, date range, or session type
router.get('/therapist/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is a psychologist
    const user = await User.findById(userId);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied. Psychologists only.' });
    }
    
    // Extract query parameters
    const {
      clientName,
      clientId,
      startDate,
      endDate,
      sessionType,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'sessionDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = { psychologist: userId };
    
    // Filter by session type
    if (sessionType) {
      query.sessionType = sessionType;
    }
    
    // Filter by status
    if (status) {
      if (status === 'completed') {
        query.status = 'Completed';
      } else if (status === 'upcoming') {
        query.status = { $in: ['Confirmed', 'Booked', 'Approved', 'Payment Submitted'] };
        query.sessionDate = { $gte: new Date() };
      } else if (status === 'all') {
        // No status filter
      } else {
        query.status = status;
      }
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.sessionDate = query.sessionDate || {};
      if (startDate) {
        query.sessionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.sessionDate.$lte = new Date(endDate);
      }
    }
    
    // Filter by specific client ID
    if (clientId) {
      query.client = clientId;
    }
    
    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    let sessionsQuery = Session.find(query)
      .populate('client', 'name email phone profilePicture')
      .sort(sortObj)
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    let sessions = await sessionsQuery;
    
    // Filter by client name (post-query filter for populated field)
    if (clientName) {
      const searchTerm = clientName.toLowerCase();
      sessions = sessions.filter(session => 
        session.client && 
        session.client.name && 
        session.client.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Get total count for pagination (without client name filter for accurate count)
    let totalQuery = { ...query };
    const totalCount = await Session.countDocuments(totalQuery);
    
    // Get intake forms for these sessions
    const IntakeForm = require('../models/IntakeForm');
    const sessionIds = sessions.map(s => s._id);
    const intakeForms = await IntakeForm.find({ session: { $in: sessionIds } });
    const intakeFormMap = {};
    intakeForms.forEach(form => {
      intakeFormMap[form.session.toString()] = {
        hasIntakeForm: true,
        completedAt: form.completedAt,
        isComplete: form.isComplete
      };
    });
    
    // Get session notes for these sessions
    const SessionNote = require('../models/SessionNote');
    const sessionNotes = await SessionNote.find({ 
      session: { $in: sessionIds },
      isLatest: true 
    }).select('session noteType createdAt');
    
    const notesMap = {};
    sessionNotes.forEach(note => {
      const sessionId = note.session.toString();
      if (!notesMap[sessionId]) {
        notesMap[sessionId] = [];
      }
      notesMap[sessionId].push({
        noteType: note.noteType,
        createdAt: note.createdAt
      });
    });
    
    // Format response
    const formattedSessions = sessions.map(session => {
      const sessionId = session._id.toString();
      return {
        _id: session._id,
        bookingReference: session.bookingReference,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        paymentStatus: session.paymentStatus,
        price: session.price || session.sessionRate,
        client: {
          _id: session.client._id,
          name: session.client.name,
          email: session.client.email,
          phone: session.client.phone,
          profilePicture: session.client.profilePicture
        },
        callData: {
          startTime: session.videoCallStarted,
          endTime: session.videoCallEnded,
          duration: session.callDuration,
          hasCallData: !!(session.videoCallStarted || session.videoCallEnded)
        },
        intakeForm: intakeFormMap[sessionId] || { hasIntakeForm: false },
        notes: notesMap[sessionId] || [],
        hasNotes: (notesMap[sessionId] || []).length > 0,
        createdAt: session.createdAt
      };
    });
    
    // Get unique clients for filter dropdown
    const uniqueClients = await Session.aggregate([
      { $match: { psychologist: user._id } },
      { $group: { _id: '$client' } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'clientInfo' } },
      { $unwind: '$clientInfo' },
      { $project: { _id: '$clientInfo._id', name: '$clientInfo.name', email: '$clientInfo.email' } }
    ]);
    
    res.json({
      success: true,
      sessions: formattedSessions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      },
      filters: {
        applied: {
          clientName: clientName || null,
          clientId: clientId || null,
          startDate: startDate || null,
          endDate: endDate || null,
          sessionType: sessionType || null,
          status: status || null
        },
        available: {
          sessionTypes: ['Individual', 'Couples', 'Family', 'Group'],
          statuses: ['Pending', 'Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Declined'],
          clients: uniqueClients
        }
      }
    });
  } catch (err) {
    console.error('Therapist session history error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/therapist/session/:sessionId/details
// @desc    Get detailed session info including intake form and notes
// @access  Private (Psychologist only)
// Requirements: 11.1, 11.2 - View client intake form responses and previous session notes
router.get('/therapist/session/:sessionId/details', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // Verify user is a psychologist
    const user = await User.findById(userId);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied. Psychologists only.' });
    }
    
    // Get session
    const session = await Session.findById(sessionId)
      .populate('client', 'name email phone profilePicture createdAt');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Verify authorization
    if (session.psychologist.toString() !== userId) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }
    
    // Get intake form (decrypted)
    const IntakeForm = require('../models/IntakeForm');
    let intakeFormData = null;
    const intakeForm = await IntakeForm.findOne({ session: sessionId });
    if (intakeForm) {
      intakeFormData = intakeForm.getDecryptedData();
      // Remove sensitive metadata
      delete intakeFormData.submittedFrom;
    }
    
    // Get session notes (decrypted)
    const SessionNote = require('../models/SessionNote');
    const notes = await SessionNote.find({ session: sessionId, isLatest: true })
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });
    
    const decryptedNotes = notes.map(note => ({
      _id: note._id,
      content: note.getDecryptedContent(),
      noteType: note.noteType,
      version: note.version,
      author: note.author,
      isClientVisible: note.isClientVisible,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }));
    
    // Get previous sessions with this client
    const previousSessions = await Session.find({
      psychologist: userId,
      client: session.client._id,
      _id: { $ne: sessionId },
      status: 'Completed'
    })
      .select('sessionType sessionDate status callDuration bookingReference')
      .sort({ sessionDate: -1 })
      .limit(10);
    
    // Get notes from previous sessions
    const previousSessionIds = previousSessions.map(s => s._id);
    const previousNotes = await SessionNote.find({
      session: { $in: previousSessionIds },
      isLatest: true
    })
      .populate('session', 'sessionDate sessionType')
      .sort({ createdAt: -1 });
    
    const previousNotesFormatted = previousNotes.map(note => ({
      _id: note._id,
      sessionId: note.session._id,
      sessionDate: note.session.sessionDate,
      sessionType: note.session.sessionType,
      content: note.getDecryptedContent(),
      noteType: note.noteType,
      createdAt: note.createdAt
    }));
    
    res.json({
      success: true,
      session: {
        _id: session._id,
        bookingReference: session.bookingReference,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        paymentStatus: session.paymentStatus,
        price: session.price || session.sessionRate,
        meetingLink: session.getDecryptedMeetingLink ? session.getDecryptedMeetingLink() : session.meetingLink,
        callData: {
          startTime: session.videoCallStarted,
          endTime: session.videoCallEnded,
          duration: session.callDuration
        }
      },
      client: {
        _id: session.client._id,
        name: session.client.name,
        email: session.client.email,
        phone: session.client.phone,
        profilePicture: session.client.profilePicture,
        memberSince: session.client.createdAt
      },
      intakeForm: intakeFormData,
      notes: decryptedNotes,
      previousSessions: previousSessions.map(s => ({
        _id: s._id,
        bookingReference: s.bookingReference,
        sessionType: s.sessionType,
        sessionDate: s.sessionDate,
        status: s.status,
        duration: s.callDuration
      })),
      previousNotes: previousNotesFormatted
    });
  } catch (err) {
    console.error('Session details error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// ============================================================================
// CLIENT SESSION ACCESS ENDPOINTS (Requirements 12.1, 12.2, 12.3, 12.4, 12.5)
// ============================================================================

// @route   GET api/sessions/my-history
// @desc    Get session history for client with past and upcoming sessions
// @access  Private (Client only)
// Requirements: 12.1, 12.2 - Display past and upcoming sessions with therapist info
router.get('/my-history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is a client
    const user = await User.findById(userId);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ msg: 'Access denied. Clients only.' });
    }
    
    // Extract query parameters
    const {
      therapistId,
      startDate,
      endDate,
      sessionType,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'sessionDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = { client: userId };
    
    // Filter by session type
    if (sessionType) {
      query.sessionType = sessionType;
    }
    
    // Filter by status
    if (status) {
      if (status === 'completed') {
        query.status = 'Completed';
      } else if (status === 'upcoming') {
        query.status = { $in: ['Confirmed', 'Booked', 'Approved', 'Payment Submitted', 'Pending Approval'] };
        query.sessionDate = { $gte: new Date() };
      } else if (status === 'cancelled') {
        query.status = { $in: ['Cancelled', 'Declined'] };
      } else if (status === 'all') {
        // No status filter
      } else {
        query.status = status;
      }
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.sessionDate = query.sessionDate || {};
      if (startDate) {
        query.sessionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.sessionDate.$lte = new Date(endDate);
      }
    }
    
    // Filter by specific therapist ID
    if (therapistId) {
      query.psychologist = therapistId;
    }
    
    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const sessions = await Session.find(query)
      .populate('psychologist', 'name email profilePicture psychologistDetails.specializations')
      .sort(sortObj)
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await Session.countDocuments(query);
    
    // Get session notes that are visible to client (Requirement 12.4)
    const SessionNote = require('../models/SessionNote');
    const sessionIds = sessions.map(s => s._id);
    const clientVisibleNotes = await SessionNote.find({ 
      session: { $in: sessionIds },
      isLatest: true,
      isClientVisible: true  // Only notes marked as visible to client
    }).select('session noteType createdAt');
    
    const notesMap = {};
    clientVisibleNotes.forEach(note => {
      const sessionId = note.session.toString();
      if (!notesMap[sessionId]) {
        notesMap[sessionId] = [];
      }
      notesMap[sessionId].push({
        noteType: note.noteType,
        createdAt: note.createdAt
      });
    });
    
    // Format response - filter out sensitive clinical information
    const formattedSessions = sessions.map(session => {
      const sessionId = session._id.toString();
      
      // Determine if session has recording with consent (Requirement 12.3)
      const hasRecording = session.recordingUrl && session.recordingConsent;
      
      return {
        _id: session._id,
        bookingReference: session.bookingReference,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        paymentStatus: session.paymentStatus,
        price: session.price || session.sessionRate,
        therapist: session.psychologist ? {
          _id: session.psychologist._id,
          name: session.psychologist.name,
          email: session.psychologist.email,
          profilePicture: session.psychologist.profilePicture,
          specializations: session.psychologist.psychologistDetails?.specializations || []
        } : null,
        callData: {
          startTime: session.videoCallStarted,
          endTime: session.videoCallEnded,
          duration: session.callDuration,
          hasCallData: !!(session.videoCallStarted || session.videoCallEnded)
        },
        // Only include client-visible notes (Requirement 12.4)
        sharedNotes: notesMap[sessionId] || [],
        hasSharedNotes: (notesMap[sessionId] || []).length > 0,
        // Recording info (Requirement 12.3)
        hasRecording: hasRecording,
        recordingConsent: session.recordingConsent || false,
        // Meeting link only for upcoming confirmed sessions
        meetingLink: (session.status === 'Confirmed' || session.status === 'In Progress') 
          ? (session.getDecryptedMeetingLink ? session.getDecryptedMeetingLink() : session.meetingLink)
          : null,
        createdAt: session.createdAt
      };
    });
    
    // Get unique therapists for filter dropdown
    const uniqueTherapists = await Session.aggregate([
      { $match: { client: user._id } },
      { $group: { _id: '$psychologist' } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'therapistInfo' } },
      { $unwind: '$therapistInfo' },
      { $project: { _id: '$therapistInfo._id', name: '$therapistInfo.name', email: '$therapistInfo.email' } }
    ]);
    
    // Calculate summary stats
    const stats = {
      totalSessions: totalCount,
      completedSessions: await Session.countDocuments({ client: userId, status: 'Completed' }),
      upcomingSessions: await Session.countDocuments({ 
        client: userId, 
        status: { $in: ['Confirmed', 'Booked', 'Approved'] },
        sessionDate: { $gte: new Date() }
      }),
      cancelledSessions: await Session.countDocuments({ client: userId, status: { $in: ['Cancelled', 'Declined'] } })
    };
    
    res.json({
      success: true,
      sessions: formattedSessions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      },
      stats,
      filters: {
        applied: {
          therapistId: therapistId || null,
          startDate: startDate || null,
          endDate: endDate || null,
          sessionType: sessionType || null,
          status: status || null
        },
        available: {
          sessionTypes: ['Individual', 'Couples', 'Family', 'Group'],
          statuses: ['Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'Completed', 'Cancelled', 'Declined'],
          therapists: uniqueTherapists
        }
      }
    });
  } catch (err) {
    console.error('Client session history error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/my-session/:sessionId
// @desc    Get detailed session info for client (with therapist-approved notes only)
// @access  Private (Client only)
// Requirements: 12.2, 12.4 - Display session details and therapist-approved notes
router.get('/my-session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // Verify user is a client
    const user = await User.findById(userId);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ msg: 'Access denied. Clients only.' });
    }
    
    // Get session
    const session = await Session.findById(sessionId)
      .populate('psychologist', 'name email phone profilePicture psychologistDetails.specializations psychologistDetails.bio');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Verify authorization - client must own this session
    if (session.client.toString() !== userId) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }
    
    // Get session notes that are visible to client only (Requirement 12.4)
    // Filter out confidential clinical observations
    const SessionNote = require('../models/SessionNote');
    const clientVisibleNotes = await SessionNote.find({ 
      session: sessionId, 
      isLatest: true,
      isClientVisible: true  // Only therapist-approved notes visible to client
    })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    
    const decryptedNotes = clientVisibleNotes.map(note => ({
      _id: note._id,
      content: note.getDecryptedContent ? note.getDecryptedContent() : note.content,
      noteType: note.noteType,
      author: note.author?.name || 'Therapist',
      createdAt: note.createdAt
    }));
    
    // Get previous sessions with this therapist for continuity
    const previousSessions = await Session.find({
      client: userId,
      psychologist: session.psychologist._id,
      _id: { $ne: sessionId },
      status: 'Completed'
    })
      .select('sessionType sessionDate status callDuration bookingReference')
      .sort({ sessionDate: -1 })
      .limit(5);
    
    // Determine if recording is available (Requirement 12.3)
    const hasRecording = session.recordingUrl && session.recordingConsent;
    
    res.json({
      success: true,
      session: {
        _id: session._id,
        bookingReference: session.bookingReference,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        paymentStatus: session.paymentStatus,
        price: session.price || session.sessionRate,
        meetingLink: (session.status === 'Confirmed' || session.status === 'In Progress')
          ? (session.getDecryptedMeetingLink ? session.getDecryptedMeetingLink() : session.meetingLink)
          : null,
        callData: {
          startTime: session.videoCallStarted,
          endTime: session.videoCallEnded,
          duration: session.callDuration
        },
        hasRecording: hasRecording,
        recordingConsent: session.recordingConsent || false
      },
      therapist: {
        _id: session.psychologist._id,
        name: session.psychologist.name,
        email: session.psychologist.email,
        phone: session.psychologist.phone,
        profilePicture: session.psychologist.profilePicture,
        specializations: session.psychologist.psychologistDetails?.specializations || [],
        bio: session.psychologist.psychologistDetails?.bio || ''
      },
      // Only therapist-approved notes (Requirement 12.4)
      sharedNotes: decryptedNotes,
      previousSessions: previousSessions.map(s => ({
        _id: s._id,
        bookingReference: s.bookingReference,
        sessionType: s.sessionType,
        sessionDate: s.sessionDate,
        duration: s.callDuration
      }))
    });
  } catch (err) {
    console.error('Client session details error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/sessions/my-session/:sessionId/recording
// @desc    Get secure recording link for a session (if consent was given)
// @access  Private (Client only)
// Requirements: 12.3 - Secure link to access session recording
router.get('/my-session/:sessionId/recording', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // Verify user is a client
    const user = await User.findById(userId);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ msg: 'Access denied. Clients only.' });
    }
    
    // Get session
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Verify authorization
    if (session.client.toString() !== userId) {
      return res.status(403).json({ msg: 'Not authorized to access this recording' });
    }
    
    // Check if recording exists and consent was given
    if (!session.recordingUrl) {
      return res.status(404).json({ msg: 'No recording available for this session' });
    }
    
    if (!session.recordingConsent) {
      return res.status(403).json({ msg: 'Recording consent was not provided for this session' });
    }
    
    // Generate secure time-limited access link
    // In production, this would generate a signed URL with expiration
    const crypto = require('crypto');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    const token = crypto.randomBytes(32).toString('hex');
    
    // Log access for audit trail
    try {
      const { logPHIAccess } = require('../utils/auditLogger');
      await logPHIAccess({
        userId: userId,
        action: 'RECORDING_ACCESS',
        resourceType: 'session_recording',
        resourceId: sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      console.error('Failed to log recording access:', auditError);
    }
    
    res.json({
      success: true,
      recording: {
        sessionId: session._id,
        bookingReference: session.bookingReference,
        sessionDate: session.sessionDate,
        // In production, this would be a signed URL
        accessUrl: session.recordingUrl,
        accessToken: token,
        expiresAt: expiresAt,
        consentGiven: true,
        consentDate: session.recordingConsentDate || session.sessionDate
      }
    });
  } catch (err) {
    console.error('Recording access error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Session not found' });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message });
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

    // Generate meeting link for test session
    const meetingLink = generateMeetingLink();

    const testSession = new Session({
      client: client._id,
      psychologist: psychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: 2000,
      status: 'Pending',
      isVideoCall: true,
      meetingLink: meetingLink
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

// Add state validation error handler
router.use(handleStateValidationError);

module.exports = router;
