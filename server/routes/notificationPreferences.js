/**
 * Notification Preferences Routes
 * 
 * API endpoints for managing user notification preferences.
 * 
 * Requirements: 15.5
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @route   GET /api/notification-preferences
 * @desc    Get current user's notification preferences
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications emailNotifications smsNotifications reminderNotifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Merge legacy and new notification preferences
    const preferences = {
      email: user.notifications?.email ?? user.emailNotifications ?? true,
      sms: user.notifications?.sms ?? user.smsNotifications ?? false,
      sessionReminders: user.notifications?.sessionReminders ?? user.reminderNotifications ?? true,
      paymentAlerts: user.notifications?.paymentAlerts ?? true,
      marketingEmails: user.notifications?.marketingEmails ?? false,
      quietHours: {
        enabled: !!(user.notifications?.quietHoursStart && user.notifications?.quietHoursEnd),
        start: user.notifications?.quietHoursStart || null,
        end: user.notifications?.quietHoursEnd || null
      }
    };
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/notification-preferences
 * @desc    Update user's notification preferences
 * @access  Private
 */
router.put('/', auth, async (req, res) => {
  try {
    const {
      email,
      sms,
      sessionReminders,
      paymentAlerts,
      marketingEmails,
      quietHoursStart,
      quietHoursEnd
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Initialize notifications object if not exists
    if (!user.notifications) {
      user.notifications = {};
    }
    
    // Update preferences
    if (typeof email === 'boolean') {
      user.notifications.email = email;
      user.emailNotifications = email; // Legacy field
    }
    
    if (typeof sms === 'boolean') {
      user.notifications.sms = sms;
      user.smsNotifications = sms; // Legacy field
    }
    
    if (typeof sessionReminders === 'boolean') {
      user.notifications.sessionReminders = sessionReminders;
      user.reminderNotifications = sessionReminders; // Legacy field
    }
    
    if (typeof paymentAlerts === 'boolean') {
      user.notifications.paymentAlerts = paymentAlerts;
    }
    
    if (typeof marketingEmails === 'boolean') {
      user.notifications.marketingEmails = marketingEmails;
    }
    
    // Validate and set quiet hours
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (quietHoursStart !== undefined) {
      if (quietHoursStart === null || quietHoursStart === '') {
        user.notifications.quietHoursStart = undefined;
      } else if (timeRegex.test(quietHoursStart)) {
        user.notifications.quietHoursStart = quietHoursStart;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid quiet hours start time format. Use HH:MM (24-hour format)'
        });
      }
    }
    
    if (quietHoursEnd !== undefined) {
      if (quietHoursEnd === null || quietHoursEnd === '') {
        user.notifications.quietHoursEnd = undefined;
      } else if (timeRegex.test(quietHoursEnd)) {
        user.notifications.quietHoursEnd = quietHoursEnd;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid quiet hours end time format. Use HH:MM (24-hour format)'
        });
      }
    }
    
    await user.save();
    
    // Log audit event
    await logAuditEvent({
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      userId: req.user._id,
      targetId: req.user._id,
      targetType: 'User',
      details: {
        email: user.notifications.email,
        sms: user.notifications.sms,
        sessionReminders: user.notifications.sessionReminders,
        paymentAlerts: user.notifications.paymentAlerts,
        marketingEmails: user.notifications.marketingEmails,
        quietHoursStart: user.notifications.quietHoursStart,
        quietHoursEnd: user.notifications.quietHoursEnd
      }
    });
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        email: user.notifications.email,
        sms: user.notifications.sms,
        sessionReminders: user.notifications.sessionReminders,
        paymentAlerts: user.notifications.paymentAlerts,
        marketingEmails: user.notifications.marketingEmails,
        quietHours: {
          enabled: !!(user.notifications.quietHoursStart && user.notifications.quietHoursEnd),
          start: user.notifications.quietHoursStart || null,
          end: user.notifications.quietHoursEnd || null
        }
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/notification-preferences/reminders
 * @desc    Toggle session reminders on/off (quick toggle)
 * @access  Private
 */
router.put('/reminders', auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled must be a boolean value'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Initialize notifications object if not exists
    if (!user.notifications) {
      user.notifications = {};
    }
    
    user.notifications.sessionReminders = enabled;
    user.reminderNotifications = enabled; // Legacy field
    
    await user.save();
    
    // Log audit event
    await logAuditEvent({
      action: enabled ? 'SESSION_REMINDERS_ENABLED' : 'SESSION_REMINDERS_DISABLED',
      userId: req.user._id,
      targetId: req.user._id,
      targetType: 'User',
      details: { sessionReminders: enabled }
    });
    
    res.json({
      success: true,
      message: `Session reminders ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: { sessionReminders: enabled }
    });
  } catch (error) {
    console.error('Error toggling session reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle session reminders',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/notification-preferences/quiet-hours
 * @desc    Set quiet hours for notifications
 * @access  Private
 */
router.put('/quiet-hours', auth, async (req, res) => {
  try {
    const { start, end, enabled } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Initialize notifications object if not exists
    if (!user.notifications) {
      user.notifications = {};
    }
    
    // If disabling quiet hours
    if (enabled === false) {
      user.notifications.quietHoursStart = undefined;
      user.notifications.quietHoursEnd = undefined;
      await user.save();
      
      return res.json({
        success: true,
        message: 'Quiet hours disabled',
        data: { quietHours: { enabled: false, start: null, end: null } }
      });
    }
    
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!start || !timeRegex.test(start)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format. Use HH:MM (24-hour format)'
      });
    }
    
    if (!end || !timeRegex.test(end)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format. Use HH:MM (24-hour format)'
      });
    }
    
    user.notifications.quietHoursStart = start;
    user.notifications.quietHoursEnd = end;
    
    await user.save();
    
    // Log audit event
    await logAuditEvent({
      action: 'QUIET_HOURS_UPDATED',
      userId: req.user._id,
      targetId: req.user._id,
      targetType: 'User',
      details: { quietHoursStart: start, quietHoursEnd: end }
    });
    
    res.json({
      success: true,
      message: 'Quiet hours updated successfully',
      data: {
        quietHours: {
          enabled: true,
          start,
          end
        }
      }
    });
  } catch (error) {
    console.error('Error updating quiet hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiet hours',
      error: error.message
    });
  }
});

module.exports = router;
