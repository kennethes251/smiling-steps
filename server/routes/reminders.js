/**
 * Reminder Routes
 * 
 * API endpoints for managing automated session reminders.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const {
  getReminderStatus,
  triggerReminderCheck,
  startReminderJobs,
  stopReminderJobs
} = require('../services/reminderSchedulerService');
const Session = require('../models/Session');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @route   GET /api/reminders/status
 * @desc    Get reminder scheduler status
 * @access  Admin only
 */
router.get('/status', auth, requireRole('admin'), async (req, res) => {
  try {
    const status = getReminderStatus();
    
    // Get recent reminder statistics
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const stats = await Session.aggregate([
      {
        $match: {
          $or: [
            { reminder24HourSentAt: { $gte: last24Hours } },
            { reminder1HourSentAt: { $gte: last24Hours } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total24HourReminders: {
            $sum: { $cond: [{ $gte: ['$reminder24HourSentAt', last24Hours] }, 1, 0] }
          },
          total1HourReminders: {
            $sum: { $cond: [{ $gte: ['$reminder1HourSentAt', last24Hours] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        ...status,
        statistics: {
          last24Hours: stats[0] || { total24HourReminders: 0, total1HourReminders: 0 }
        }
      }
    });
  } catch (error) {
    console.error('Error getting reminder status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/reminders/trigger
 * @desc    Manually trigger reminder check
 * @access  Admin only
 */
router.post('/trigger', auth, requireRole('admin'), async (req, res) => {
  try {
    const { type = 'both' } = req.body;
    
    if (!['24hour', '1hour', 'both'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder type. Use: 24hour, 1hour, or both'
      });
    }
    
    console.log(`📧 Admin ${req.user.name} triggered ${type} reminder check`);
    
    // Log audit event
    await logAuditEvent({
      action: 'REMINDER_MANUAL_TRIGGER',
      userId: req.user._id,
      details: { type, triggeredAt: new Date().toISOString() }
    });
    
    const results = await triggerReminderCheck(type);
    
    res.json({
      success: true,
      message: `Reminder check triggered successfully`,
      data: results
    });
  } catch (error) {
    console.error('Error triggering reminder check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger reminder check',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/reminders/start
 * @desc    Start reminder scheduler
 * @access  Admin only
 */
router.post('/start', auth, requireRole('admin'), async (req, res) => {
  try {
    startReminderJobs();
    
    await logAuditEvent({
      action: 'REMINDER_SCHEDULER_STARTED',
      userId: req.user._id,
      details: { startedAt: new Date().toISOString() }
    });
    
    res.json({
      success: true,
      message: 'Reminder scheduler started',
      data: getReminderStatus()
    });
  } catch (error) {
    console.error('Error starting reminder scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start reminder scheduler',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/reminders/stop
 * @desc    Stop reminder scheduler
 * @access  Admin only
 */
router.post('/stop', auth, requireRole('admin'), async (req, res) => {
  try {
    stopReminderJobs();
    
    await logAuditEvent({
      action: 'REMINDER_SCHEDULER_STOPPED',
      userId: req.user._id,
      details: { stoppedAt: new Date().toISOString() }
    });
    
    res.json({
      success: true,
      message: 'Reminder scheduler stopped',
      data: getReminderStatus()
    });
  } catch (error) {
    console.error('Error stopping reminder scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop reminder scheduler',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reminders/history
 * @desc    Get reminder history for sessions
 * @access  Admin only
 */
router.get('/history', auth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    const query = {
      $or: [
        { reminder24HourSent: true },
        { reminder1HourSent: true }
      ]
    };
    
    if (startDate || endDate) {
      query.sessionDate = {};
      if (startDate) query.sessionDate.$gte = new Date(startDate);
      if (endDate) query.sessionDate.$lte = new Date(endDate);
    }
    
    const sessions = await Session.find(query)
      .select('sessionDate sessionType status reminder24HourSent reminder24HourSentAt reminder1HourSent reminder1HourSentAt client psychologist')
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .sort({ sessionDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Session.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting reminder history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder history',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reminders/pending
 * @desc    Get sessions pending reminders
 * @access  Admin only
 */
router.get('/pending', auth, requireRole('admin'), async (req, res) => {
  try {
    const now = new Date();
    const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const pendingSessions = await Session.find({
      sessionDate: {
        $gte: now,
        $lte: next48Hours
      },
      status: { $in: ['Confirmed', 'Booked'] },
      paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] },
      $or: [
        { reminder24HourSent: { $ne: true } },
        { reminder1HourSent: { $ne: true } }
      ]
    })
    .select('sessionDate sessionType status reminder24HourSent reminder1HourSent client psychologist')
    .populate('client', 'name email phone')
    .populate('psychologist', 'name email phone')
    .sort({ sessionDate: 1 });
    
    res.json({
      success: true,
      data: {
        count: pendingSessions.length,
        sessions: pendingSessions
      }
    });
  } catch (error) {
    console.error('Error getting pending reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending reminders',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/reminders/send/:sessionId
 * @desc    Manually send reminder for a specific session
 * @access  Admin only
 */
router.post('/send/:sessionId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type } = req.body; // '24hour' or '1hour'
    
    if (!['24hour', '1hour'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder type. Use: 24hour or 1hour'
      });
    }
    
    const session = await Session.findById(sessionId)
      .populate('client', 'name email phone notifications emailNotifications smsNotifications reminderNotifications')
      .populate('psychologist', 'name email phone notifications emailNotifications smsNotifications reminderNotifications');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    const { sendReminderToUser } = require('../services/reminderSchedulerService');
    
    const results = {
      client: null,
      therapist: null
    };
    
    if (session.client) {
      results.client = await sendReminderToUser(session, session.client, type, false);
    }
    
    if (session.psychologist) {
      results.therapist = await sendReminderToUser(session, session.psychologist, type, true);
    }
    
    // Update session reminder status
    if (type === '24hour') {
      session.reminder24HourSent = true;
      session.reminder24HourSentAt = new Date();
    } else {
      session.reminder1HourSent = true;
      session.reminder1HourSentAt = new Date();
    }
    await session.save();
    
    await logAuditEvent({
      action: `REMINDER_MANUAL_SEND_${type.toUpperCase()}`,
      userId: req.user._id,
      targetId: sessionId,
      targetType: 'Session',
      details: { results, sentAt: new Date().toISOString() }
    });
    
    res.json({
      success: true,
      message: `${type} reminder sent successfully`,
      data: results
    });
  } catch (error) {
    console.error('Error sending manual reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error.message
    });
  }
});

module.exports = router;
