/**
 * Audit Logs API Routes
 * 
 * Provides endpoints for retrieving and verifying audit logs
 * Requirements: 13.6
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { retrieveAuditLogs, verifyLogIntegrity } = require('../utils/auditLogger');

/**
 * Middleware to check admin access
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// @route   GET api/audit-logs
// @desc    Retrieve audit logs with filters
// @access  Private (Admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const {
      actionType,
      userId,
      adminId,
      sessionId,
      transactionID,
      startDate,
      endDate,
      limit,
      skip
    } = req.query;

    const filters = {
      actionType,
      userId,
      adminId,
      sessionId,
      transactionID,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
      skip: skip ? parseInt(skip) : 0
    };

    const result = await retrieveAuditLogs(filters);

    res.json(result);

  } catch (error) {
    console.error('❌ Audit log retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve audit logs',
      error: error.message 
    });
  }
});

// @route   GET api/audit-logs/session/:sessionId
// @desc    Retrieve audit logs for a specific session
// @access  Private (Admin only)
router.get('/session/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const result = await retrieveAuditLogs({
      sessionId: req.params.sessionId,
      limit: 1000 // Get all logs for this session
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Session audit log retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve session audit logs',
      error: error.message 
    });
  }
});

// @route   GET api/audit-logs/user/:userId
// @desc    Retrieve audit logs for a specific user
// @access  Private (Admin only)
router.get('/user/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const result = await retrieveAuditLogs({
      userId: req.params.userId,
      limit: 1000 // Get all logs for this user
    });

    res.json(result);

  } catch (error) {
    console.error('❌ User audit log retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve user audit logs',
      error: error.message 
    });
  }
});

// @route   POST api/audit-logs/verify
// @desc    Verify integrity of audit log chain
// @access  Private (Admin only)
router.post('/verify', auth, requireAdmin, async (req, res) => {
  try {
    const { logs } = req.body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ 
        msg: 'Logs array is required for verification' 
      });
    }

    // Verify each log in the chain
    const verificationResults = [];
    let previousHash = null;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const isValid = verifyLogIntegrity(log, previousHash);
      
      verificationResults.push({
        logHash: log.logHash,
        timestamp: log.timestamp,
        actionType: log.actionType,
        isValid,
        position: i
      });

      previousHash = log.logHash;
    }

    const allValid = verificationResults.every(r => r.isValid);

    res.json({
      success: true,
      chainValid: allValid,
      totalLogs: logs.length,
      verificationResults,
      message: allValid 
        ? 'All logs verified successfully - chain integrity intact'
        : 'Chain integrity compromised - one or more logs failed verification'
    });

  } catch (error) {
    console.error('❌ Audit log verification error:', error);
    res.status(500).json({ 
      msg: 'Failed to verify audit logs',
      error: error.message 
    });
  }
});

// @route   GET api/audit-logs/video-calls
// @desc    Retrieve video call specific audit logs
// @access  Private (Admin only)
router.get('/video-calls', auth, requireAdmin, async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      roomId,
      startDate,
      endDate,
      limit,
      skip
    } = req.query;

    const filters = {
      actionType: {
        $in: [
          'VIDEO_CALL_ACCESS',
          'VIDEO_CALL_START',
          'VIDEO_CALL_END',
          'VIDEO_CALL_JOIN_ATTEMPT',
          'VIDEO_CALL_SECURITY_VALIDATION'
        ]
      }
    };

    if (sessionId) filters.sessionId = sessionId;
    if (userId) filters.userId = userId;
    if (roomId) filters.roomId = roomId;
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const result = await retrieveAuditLogs({
      ...filters,
      limit: limit ? parseInt(limit) : 100,
      skip: skip ? parseInt(skip) : 0
    });

    res.json({
      ...result,
      filterType: 'video-calls'
    });

  } catch (error) {
    console.error('❌ Video call audit log retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve video call audit logs',
      error: error.message 
    });
  }
});

// @route   GET api/audit-logs/video-calls/session/:sessionId
// @desc    Retrieve all video call audit logs for a specific session
// @access  Private (Admin only)
router.get('/video-calls/session/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    
    const logs = await AuditLog.find({
      sessionId: req.params.sessionId,
      actionType: {
        $in: [
          'VIDEO_CALL_ACCESS',
          'VIDEO_CALL_START',
          'VIDEO_CALL_END',
          'VIDEO_CALL_JOIN_ATTEMPT',
          'VIDEO_CALL_SECURITY_VALIDATION'
        ]
      }
    })
    .sort({ timestamp: 1 }) // Chronological order for session timeline
    .lean();

    // Create session timeline
    const timeline = logs.map(log => ({
      timestamp: log.timestamp,
      actionType: log.actionType,
      action: log.action,
      userId: log.userId,
      userType: log.userType,
      success: log.metadata?.success,
      reason: log.metadata?.reason,
      ipAddress: log.ipAddress
    }));

    res.json({
      success: true,
      sessionId: req.params.sessionId,
      totalLogs: logs.length,
      timeline,
      fullLogs: logs
    });

  } catch (error) {
    console.error('❌ Session video call audit log retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve session video call audit logs',
      error: error.message 
    });
  }
});

// @route   GET api/audit-logs/video-calls/security
// @desc    Retrieve security validation audit logs
// @access  Private (Admin only)
router.get('/video-calls/security', auth, requireAdmin, async (req, res) => {
  try {
    const result = await retrieveAuditLogs({
      actionType: 'VIDEO_CALL_SECURITY_VALIDATION',
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0
    });

    // Analyze security validation results
    const securityStats = {
      totalValidations: result.logs.length,
      passedValidations: result.logs.filter(log => log.validationPassed === true).length,
      failedValidations: result.logs.filter(log => log.validationPassed === false).length,
      validationTypes: {}
    };

    result.logs.forEach(log => {
      const validationType = log.validationType || 'unknown';
      if (!securityStats.validationTypes[validationType]) {
        securityStats.validationTypes[validationType] = { total: 0, passed: 0, failed: 0 };
      }
      securityStats.validationTypes[validationType].total++;
      if (log.validationPassed === true) {
        securityStats.validationTypes[validationType].passed++;
      } else {
        securityStats.validationTypes[validationType].failed++;
      }
    });

    res.json({
      ...result,
      securityStats
    });

  } catch (error) {
    console.error('❌ Security validation audit log retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve security validation audit logs',
      error: error.message 
    });
  }
});

// @route   GET api/audit-logs/stats
// @desc    Get audit log statistics
// @access  Private (Admin only)
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');

    // Get statistics
    const [totalLogs, actionTypeStats, recentLogs, videoCallStats] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.aggregate([
        {
          $group: {
            _id: '$actionType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .select('timestamp actionType action')
        .lean(),
      AuditLog.countDocuments({
        actionType: {
          $in: [
            'VIDEO_CALL_ACCESS',
            'VIDEO_CALL_START',
            'VIDEO_CALL_END',
            'VIDEO_CALL_JOIN_ATTEMPT',
            'VIDEO_CALL_SECURITY_VALIDATION'
          ]
        }
      })
    ]);

    // Get date range
    const oldestLog = await AuditLog.findOne().sort({ timestamp: 1 }).select('timestamp');
    const newestLog = await AuditLog.findOne().sort({ timestamp: -1 }).select('timestamp');

    res.json({
      success: true,
      statistics: {
        totalLogs,
        videoCallLogs: videoCallStats,
        actionTypes: actionTypeStats,
        dateRange: {
          oldest: oldestLog?.timestamp,
          newest: newestLog?.timestamp
        },
        recentActivity: recentLogs
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Audit log statistics error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve audit log statistics',
      error: error.message 
    });
  }
});

module.exports = router;
