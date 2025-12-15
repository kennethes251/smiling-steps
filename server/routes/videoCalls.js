const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { 
  videoCallSecurity, 
  basicVideoCallSecurity,
  validateEncryption 
} = require('../middleware/videoCallSecurity');
const { sessionEncryptionMiddleware } = require('../middleware/sessionEncryption');
const encryptionValidator = require('../utils/encryptionValidator');
const { generateMeetingLink } = require('../utils/meetingLinkGenerator');
const { 
  calculateCallDuration, 
  getCallStatistics, 
  validateCallDuration 
} = require('../utils/callDurationUtils');
const SessionStatusManager = require('../utils/sessionStatusManager');
const { 
  logVideoCallAccess,
  logVideoCallStart,
  logVideoCallEnd,
  logVideoCallJoinAttempt,
  logVideoCallSecurityValidation
} = require('../utils/auditLogger');

// Get WebRTC configuration (ICE servers)
router.get('/config', auth, basicVideoCallSecurity, async (req, res) => {
  try {
    const webrtcConfig = require('../config/webrtc');
    res.json({ iceServers: webrtcConfig.iceServers });
  } catch (error) {
    console.error('Get WebRTC config error:', error);
    res.status(500).json({ error: 'Failed to get WebRTC configuration' });
  }
});

// Generate video call room for session
router.post('/generate-room/:sessionId', auth, videoCallSecurity, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const session = await global.Session.findByPk(sessionId, {
      include: [
        { 
          model: global.User, 
          as: 'client',
          attributes: ['id', 'name', 'email', 'profileInfo']
        },
        { 
          model: global.User, 
          as: 'psychologist',
          attributes: ['id', 'name', 'email', 'profileInfo', 'psychologistDetails']
        }
      ]
    });
    
    if (!session) {
      // Log failed access attempt
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'generate-room',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'Session not found'
      });
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user is part of this session
    const isClient = session.clientId === userId;
    const isPsychologist = session.psychologistId === userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isClient && !isPsychologist && !isAdmin) {
      // Log unauthorized access attempt
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'generate-room',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'Unauthorized access to session',
        sessionDetails: {
          sessionDate: session.sessionDate,
          sessionType: session.sessionType,
          paymentStatus: session.paymentStatus,
          status: session.status
        }
      });
      return res.status(403).json({ error: 'Unauthorized access to this session' });
    }
    
    // Verify payment status (must be confirmed to join call)
    if (session.paymentStatus !== 'Confirmed' && 
        session.paymentStatus !== 'Paid' &&
        session.paymentStatus !== 'Verified') {
      // Log payment not confirmed
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'generate-room',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: `Payment not confirmed: ${session.paymentStatus}`,
        sessionDetails: {
          sessionDate: session.sessionDate,
          sessionType: session.sessionType,
          paymentStatus: session.paymentStatus,
          status: session.status
        }
      });
      return res.status(403).json({ 
        error: 'Payment must be confirmed before joining video call',
        paymentStatus: session.paymentStatus
      });
    }
    
    // Verify session is not cancelled or declined
    if (session.status === 'Cancelled' || session.status === 'Declined') {
      // Log cancelled/declined session access attempt
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'generate-room',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: `Session ${session.status.toLowerCase()}`,
        sessionDetails: {
          sessionDate: session.sessionDate,
          sessionType: session.sessionType,
          paymentStatus: session.paymentStatus,
          status: session.status
        }
      });
      return res.status(400).json({ 
        error: 'Cannot join cancelled or declined session',
        status: session.status
      });
    }
    
    // Generate unique room ID if not exists (fallback for older sessions)
    if (!session.meetingLink) {
      session.meetingLink = generateMeetingLink();
      await session.save();
      console.log(`🎥 Generated room ID for session ${session.id}: ${session.meetingLink}`);
    } else {
      console.log(`🎥 Using existing room ID for session ${session.id}: ${session.meetingLink}`);
    }
    
    // Log successful room generation
    await logVideoCallAccess({
      userId,
      sessionId,
      action: 'generate-room',
      userRole: req.user.role,
      ipAddress,
      success: true,
      sessionDetails: {
        sessionDate: session.sessionDate,
        sessionType: session.sessionType,
        paymentStatus: session.paymentStatus,
        status: session.status
      }
    });
    
    res.json({
      roomId: session.meetingLink,
      sessionId: session.id,
      sessionDate: session.sessionDate,
      sessionType: session.sessionType,
      participants: {
        client: { 
          id: session.client.id, 
          name: session.client.name,
          profilePicture: session.client.profileInfo?.profilePicture || null
        },
        psychologist: { 
          id: session.psychologist.id, 
          name: session.psychologist.name,
          profilePicture: session.psychologist.profileInfo?.profilePicture || null,
          specializations: session.psychologist.psychologistDetails?.specializations || []
        }
      }
    });
  } catch (error) {
    console.error('Generate room error:', error);
    
    // Log system error
    await logVideoCallAccess({
      userId,
      sessionId,
      action: 'generate-room',
      userRole: req.user.role,
      ipAddress,
      success: false,
      reason: `System error: ${error.message}`
    });
    
    res.status(500).json({ error: 'Failed to generate video call room' });
  }
});

// Start video call (update session status)
router.post('/start/:sessionId', auth, basicVideoCallSecurity, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const result = await SessionStatusManager.startVideoCall(sessionId, userId);
    
    // Get session details for audit logging
    const session = await global.Session.findByPk(sessionId, {
      include: [
        { 
          model: global.User, 
          as: 'client',
          attributes: ['id', 'name']
        },
        { 
          model: global.User, 
          as: 'psychologist',
          attributes: ['id', 'name']
        }
      ]
    });
    
    // Log successful call start
    await logVideoCallStart({
      userId,
      sessionId,
      roomId: session?.meetingLink || 'unknown',
      userRole: req.user.role,
      participants: {
        client: { id: session?.client?.id, name: session?.client?.name },
        psychologist: { id: session?.psychologist?.id, name: session?.psychologist?.name }
      },
      ipAddress
    });
    
    res.json(result);
  } catch (error) {
    console.error('Start call error:', error);
    
    // Log failed call start attempt
    await logVideoCallAccess({
      userId,
      sessionId,
      action: 'start-call',
      userRole: req.user.role,
      ipAddress,
      success: false,
      reason: error.message
    });
    
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Payment') || error.message.includes('cancelled') || error.message.includes('declined')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to start video call' });
  }
});

// End video call (calculate duration, update status)
router.post('/end/:sessionId', auth, basicVideoCallSecurity, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const result = await SessionStatusManager.endVideoCall(sessionId, userId);
    
    // Get session details for audit logging
    const session = await global.Session.findByPk(sessionId);
    
    // Log successful call end
    await logVideoCallEnd({
      userId,
      sessionId,
      roomId: session?.meetingLink || 'unknown',
      userRole: req.user.role,
      duration: result.duration || 0,
      ipAddress,
      endReason: 'normal'
    });
    
    res.json(result);
  } catch (error) {
    console.error('End call error:', error);
    
    // Log failed call end attempt
    await logVideoCallAccess({
      userId,
      sessionId,
      action: 'end-call',
      userRole: req.user.role,
      ipAddress,
      success: false,
      reason: error.message
    });
    
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to end video call' });
  }
});

// Get active call info
router.get('/session/:sessionId', auth, sessionEncryptionMiddleware, async (req, res) => {
  try {
    const session = await global.Session.findByPk(req.params.sessionId, {
      include: [
        { 
          model: global.User, 
          as: 'client',
          attributes: ['id', 'name', 'email', 'profileInfo']
        },
        { 
          model: global.User, 
          as: 'psychologist',
          attributes: ['id', 'name', 'email', 'profileInfo', 'psychologistDetails']
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify authorization
    const userId = req.user.id;
    const isAuthorized = 
      session.clientId === userId ||
      session.psychologistId === userId ||
      req.user.role === 'admin';
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized access to this session' });
    }
    
    // Get call statistics using utility function
    const callStats = getCallStatistics(session);
    
    res.json({ 
      session: {
        id: session.id,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        paymentStatus: session.paymentStatus,
        meetingLink: session.meetingLink,
        videoCallStarted: session.videoCallStarted,
        videoCallEnded: session.videoCallEnded,
        callDuration: session.duration, // Use 'duration' field from Sequelize model
        callStatistics: callStats,
        client: {
          id: session.client.id,
          name: session.client.name,
          email: session.client.email,
          profilePicture: session.client.profileInfo?.profilePicture || null
        },
        psychologist: {
          id: session.psychologist.id,
          name: session.psychologist.name,
          email: session.psychologist.email,
          profilePicture: session.psychologist.profileInfo?.profilePicture || null,
          specializations: session.psychologist.psychologistDetails?.specializations || []
        }
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session information' });
  }
});

// Check if user can join call (time-based access control)
router.get('/can-join/:sessionId', auth, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const session = await global.Session.findByPk(sessionId);
    
    if (!session) {
      // Log failed join eligibility check
      await logVideoCallJoinAttempt({
        userId,
        sessionId,
        roomId: 'unknown',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'Session not found'
      });
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify authorization
    const isAuthorized = 
      session.clientId === userId ||
      session.psychologistId === userId ||
      req.user.role === 'admin';
    
    if (!isAuthorized) {
      // Log unauthorized join attempt
      await logVideoCallJoinAttempt({
        userId,
        sessionId,
        roomId: session.meetingLink || 'unknown',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'Unauthorized access to session'
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check time window (15 minutes before to 2 hours after)
    const now = new Date();
    const sessionDate = new Date(session.sessionDate);
    const timeDiffMinutes = (sessionDate - now) / (1000 * 60);
    
    const canJoin = 
      session.status === 'Confirmed' &&
      (session.paymentStatus === 'Confirmed' || session.paymentStatus === 'Paid' || session.paymentStatus === 'Verified') &&
      timeDiffMinutes <= 15 && 
      timeDiffMinutes >= -120;
    
    const reason = !canJoin ? getCannotJoinReason(session, timeDiffMinutes) : null;
    
    // Log join eligibility check
    await logVideoCallJoinAttempt({
      userId,
      sessionId,
      roomId: session.meetingLink || 'unknown',
      userRole: req.user.role,
      ipAddress,
      success: canJoin,
      reason: reason,
      timeValidation: {
        canJoin,
        minutesUntilSession: Math.round(timeDiffMinutes),
        sessionDate: session.sessionDate
      }
    });
    
    res.json({ 
      canJoin,
      reason,
      sessionDate: session.sessionDate,
      currentTime: now,
      minutesUntilSession: Math.round(timeDiffMinutes)
    });
  } catch (error) {
    console.error('Can join check error:', error);
    
    // Log system error
    await logVideoCallAccess({
      userId,
      sessionId,
      action: 'can-join-check',
      userRole: req.user.role,
      ipAddress,
      success: false,
      reason: `System error: ${error.message}`
    });
    
    res.status(500).json({ error: 'Failed to check join eligibility' });
  }
});

// Helper function to determine why user cannot join
function getCannotJoinReason(session, timeDiffMinutes) {
  if (session.status !== 'Confirmed') {
    return `Session status is ${session.status}. Must be Confirmed.`;
  }
  if (session.paymentStatus !== 'Confirmed' && session.paymentStatus !== 'Paid' && session.paymentStatus !== 'Verified') {
    return `Payment not confirmed. Current status: ${session.paymentStatus}`;
  }
  if (timeDiffMinutes < -120) {
    return 'Session time has passed (more than 2 hours ago)';
  }
  if (timeDiffMinutes > 15) {
    return `Session starts in ${Math.round(timeDiffMinutes)} minutes. Join window opens 15 minutes before.`;
  }
  return 'Unknown reason';
}

// Get call history for a user (client or psychologist)
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;
    
    // Build query based on user role
    let whereClause = {};
    if (req.user.role === 'client') {
      whereClause.clientId = userId;
    } else if (req.user.role === 'psychologist') {
      whereClause.psychologistId = userId;
    } else if (req.user.role === 'admin') {
      // Admin can see all sessions
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Only include sessions with video call data
    whereClause.videoCallStarted = { [require('sequelize').Op.ne]: null };
    
    const sessions = await global.Session.findAll({
      where: whereClause,
      include: [
        { 
          model: global.User, 
          as: 'client',
          attributes: ['id', 'name', 'email', 'profileInfo']
        },
        { 
          model: global.User, 
          as: 'psychologist',
          attributes: ['id', 'name', 'email', 'profileInfo', 'psychologistDetails']
        }
      ],
      order: [['videoCallStarted', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const callHistory = sessions.map(session => {
      const callStats = getCallStatistics(session);
      return {
        sessionId: session.id,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        status: session.status,
        client: {
          id: session.client.id,
          name: session.client.name,
          profilePicture: session.client.profileInfo?.profilePicture || null
        },
        psychologist: {
          id: session.psychologist.id,
          name: session.psychologist.name,
          profilePicture: session.psychologist.profileInfo?.profilePicture || null,
          specializations: session.psychologist.psychologistDetails?.specializations || []
        },
        callData: {
          startTime: session.videoCallStarted,
          endTime: session.videoCallEnded,
          duration: session.duration, // Use 'duration' field from Sequelize model
          durationFormatted: callStats.durationFormatted,
          status: callStats.status
        }
      };
    });
    
    const totalCount = await global.Session.count({
      where: whereClause
    });
    
    res.json({ 
      callHistory,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount
      }
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Failed to get call history' });
  }
});

// Get security validation report for a session
router.get('/security-report/:sessionId', auth, basicVideoCallSecurity, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    // Verify authorization
    const session = await global.Session.findByPk(sessionId);
    
    if (!session) {
      // Log failed security report access
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'security-report',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'Session not found'
      });
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const isAuthorized = 
      session.clientId === userId ||
      session.psychologistId === userId ||
      req.user.role === 'admin';
    
    if (!isAuthorized) {
      // Log unauthorized security report access
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'security-report',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'Unauthorized access to security report'
      });
      return res.status(403).json({ error: 'Unauthorized access to security report' });
    }
    
    // Get validation results
    const validationResults = encryptionValidator.getValidationResults(sessionId);
    
    if (!validationResults) {
      // Log no validation results found
      await logVideoCallAccess({
        userId,
        sessionId,
        action: 'security-report',
        userRole: req.user.role,
        ipAddress,
        success: false,
        reason: 'No security validation results found'
      });
      return res.status(404).json({ 
        error: 'No security validation results found for this session',
        sessionId 
      });
    }
    
    // Generate compliance report
    const complianceReport = encryptionValidator.generateComplianceReport(sessionId);
    
    // Log successful security report access
    await logVideoCallSecurityValidation({
      userId,
      sessionId,
      validationType: 'security-report',
      passed: true,
      validationResults: {
        hasResults: true,
        complianceGenerated: true
      },
      ipAddress
    });
    
    res.json({
      sessionId,
      validationResults,
      complianceReport,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Security report error:', error);
    
    // Log system error
    await logVideoCallAccess({
      userId,
      sessionId,
      action: 'security-report',
      userRole: req.user.role,
      ipAddress,
      success: false,
      reason: `System error: ${error.message}`
    });
    
    res.status(500).json({ error: 'Failed to generate security report' });
  }
});

// Validate real-time connection security (for active calls)
router.post('/validate-connection/:sessionId', auth, validateEncryption, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const rtcStats = req.body.rtcStats || {};
    
    // Verify authorization
    const session = await global.Session.findByPk(sessionId);
    
    if (!session) {
      // Log failed validation attempt
      await logVideoCallSecurityValidation({
        userId,
        sessionId,
        validationType: 'real-time-connection',
        passed: false,
        validationResults: { error: 'Session not found' },
        ipAddress
      });
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const isAuthorized = 
      session.clientId === userId ||
      session.psychologistId === userId ||
      req.user.role === 'admin';
    
    if (!isAuthorized) {
      // Log unauthorized validation attempt
      await logVideoCallSecurityValidation({
        userId,
        sessionId,
        validationType: 'real-time-connection',
        passed: false,
        validationResults: { error: 'Unauthorized access' },
        ipAddress
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Validate real-time connection
    const validation = encryptionValidator.validateRealTimeConnection(sessionId, rtcStats);
    
    // Log security validation
    await logVideoCallSecurityValidation({
      userId,
      sessionId,
      validationType: 'real-time-connection',
      passed: validation.overall,
      validationResults: {
        overall: validation.overall,
        dtlsEnabled: validation.dtls,
        srtpEnabled: validation.srtp,
        rtcStatsProvided: Object.keys(rtcStats).length > 0
      },
      ipAddress
    });
    
    res.json({
      sessionId,
      validation,
      timestamp: new Date(),
      secure: validation.overall
    });
  } catch (error) {
    console.error('Real-time validation error:', error);
    
    // Log system error
    await logVideoCallSecurityValidation({
      userId,
      sessionId,
      validationType: 'real-time-connection',
      passed: false,
      validationResults: { error: error.message },
      ipAddress
    });
    
    res.status(500).json({ error: 'Failed to validate connection security' });
  }
});

module.exports = router;
