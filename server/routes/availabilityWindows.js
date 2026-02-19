/**
 * Availability Windows Management Routes
 * 
 * Implements Requirements 2.1, 2.5 from teletherapy-booking-enhancement
 * 
 * Endpoints:
 * - POST /api/availability-windows - Create new availability window
 * - GET /api/availability-windows/:therapistId - Get therapist's availability windows
 * - PUT /api/availability-windows/:id - Update availability window
 * - DELETE /api/availability-windows/:id - Delete/deactivate availability window
 * - GET /api/availability-windows/:therapistId/slots - Get available time slots for a date
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const AvailabilityWindow = require('../models/AvailabilityWindow');
const Session = require('../models/Session');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// Previous log hash for tamper-evident chain
let previousLogHash = null;

/**
 * Generate a hash for tamper-evident logging
 */
function generateLogHash(logEntry) {
  const logString = JSON.stringify(logEntry);
  const dataToHash = previousLogHash ? `${previousLogHash}${logString}` : logString;
  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return hash;
}

/**
 * Create audit log entry for availability window changes
 */
async function createAuditLog(actionType, data) {
  const logEntry = {
    timestamp: new Date(),
    actionType,
    ...data
  };
  
  const hash = generateLogHash(logEntry);
  const prevHash = previousLogHash;
  previousLogHash = hash;
  
  const completeLogEntry = {
    ...logEntry,
    logHash: hash,
    previousHash: prevHash
  };
  
  try {
    await AuditLog.create(completeLogEntry);
  } catch (dbError) {
    console.error('⚠️ Failed to persist audit log:', dbError.message);
  }
  
  return completeLogEntry;
}

/**
 * Validate time format (HH:MM)
 */
function isValidTimeFormat(time) {
  if (!time || typeof time !== 'string') return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}


/**
 * @route   POST /api/availability-windows
 * @desc    Create a new availability window
 * @access  Private (Psychologist only)
 * Requirements: 2.1
 */
router.post('/', auth, async (req, res) => {
  try {
    console.log('📅 Create availability window request for user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify user is a psychologist
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can create availability windows'
      });
    }
    
    const {
      windowType,
      dayOfWeek,
      specificDate,
      startTime,
      endTime,
      title,
      notes,
      sessionTypes,
      maxSessions,
      recurrence,
      timezone,
      bufferMinutes,
      minAdvanceBookingHours,
      maxAdvanceBookingDays
    } = req.body;
    
    // Validate required fields
    if (!windowType) {
      return res.status(400).json({
        success: false,
        message: 'Window type is required'
      });
    }
    
    if (!['recurring', 'one-time', 'exception'].includes(windowType)) {
      return res.status(400).json({
        success: false,
        message: 'Window type must be recurring, one-time, or exception'
      });
    }
    
    // Validate dayOfWeek for recurring windows
    if (windowType === 'recurring') {
      if (dayOfWeek === undefined || dayOfWeek === null) {
        return res.status(400).json({
          success: false,
          message: 'Day of week is required for recurring windows'
        });
      }
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({
          success: false,
          message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)'
        });
      }
    }
    
    // Validate specificDate for one-time and exception windows
    if ((windowType === 'one-time' || windowType === 'exception') && !specificDate) {
      return res.status(400).json({
        success: false,
        message: 'Specific date is required for one-time and exception windows'
      });
    }
    
    // Validate time formats
    if (!isValidTimeFormat(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in HH:MM format'
      });
    }
    
    if (!isValidTimeFormat(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be in HH:MM format'
      });
    }
    
    // Validate startTime < endTime
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }
    
    // Check for overlapping windows
    const existingWindows = await AvailabilityWindow.find({
      therapist: user._id,
      isActive: true,
      windowType: windowType
    });
    
    for (const existing of existingWindows) {
      // Check same day/date
      let sameDay = false;
      if (windowType === 'recurring' && existing.dayOfWeek === dayOfWeek) {
        sameDay = true;
      } else if (windowType !== 'recurring' && existing.specificDate) {
        const existingDate = new Date(existing.specificDate).toISOString().split('T')[0];
        const newDate = new Date(specificDate).toISOString().split('T')[0];
        sameDay = existingDate === newDate;
      }
      
      if (sameDay) {
        // Check time overlap
        if (AvailabilityWindow.timesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
          return res.status(409).json({
            success: false,
            message: 'This availability window overlaps with an existing window',
            conflictingWindow: {
              id: existing._id,
              startTime: existing.startTime,
              endTime: existing.endTime
            }
          });
        }
      }
    }
    
    // Create the availability window
    const windowData = {
      therapist: user._id,
      windowType,
      startTime,
      endTime,
      createdBy: user._id
    };
    
    if (windowType === 'recurring') {
      windowData.dayOfWeek = dayOfWeek;
    } else {
      windowData.specificDate = new Date(specificDate);
    }
    
    if (title) windowData.title = title;
    if (notes) windowData.notes = notes;
    if (sessionTypes && sessionTypes.length > 0) windowData.sessionTypes = sessionTypes;
    if (maxSessions) windowData.maxSessions = maxSessions;
    if (recurrence) windowData.recurrence = recurrence;
    if (timezone) windowData.timezone = timezone;
    if (bufferMinutes !== undefined) windowData.bufferMinutes = bufferMinutes;
    if (minAdvanceBookingHours !== undefined) windowData.minAdvanceBookingHours = minAdvanceBookingHours;
    if (maxAdvanceBookingDays !== undefined) windowData.maxAdvanceBookingDays = maxAdvanceBookingDays;
    
    const newWindow = new AvailabilityWindow(windowData);
    await newWindow.save();
    
    // Log the creation
    await createAuditLog('AVAILABILITY_WINDOW_CREATED', {
      userId: user._id,
      targetType: 'AvailabilityWindow',
      targetId: newWindow._id,
      newValue: windowData,
      action: `Created ${windowType} availability window`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    console.log('✅ Availability window created successfully:', newWindow._id);
    
    res.status(201).json({
      success: true,
      message: 'Availability window created successfully',
      data: newWindow
    });
    
  } catch (err) {
    console.error('❌ Create availability window error:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating availability window'
    });
  }
});


/**
 * @route   GET /api/availability-windows/:therapistId
 * @desc    Get all availability windows for a therapist
 * @access  Public (for booking) / Private (for management)
 * Requirements: 2.1
 */
router.get('/:therapistId', async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { activeOnly, windowType, includeExpired } = req.query;
    
    console.log('📅 Get availability windows for therapist:', therapistId);
    
    // Verify therapist exists
    const therapist = await User.findById(therapistId);
    if (!therapist || therapist.role !== 'psychologist') {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found'
      });
    }
    
    // Build query
    const query = { therapist: therapistId };
    
    // Filter by active status (default: active only)
    if (activeOnly !== 'false') {
      query.isActive = true;
    }
    
    // Filter by window type
    if (windowType && ['recurring', 'one-time', 'exception'].includes(windowType)) {
      query.windowType = windowType;
    }
    
    // Exclude expired one-time windows unless requested
    if (includeExpired !== 'true') {
      const now = new Date();
      query.$or = [
        { windowType: 'recurring' },
        { windowType: { $ne: 'recurring' }, specificDate: { $gte: now } }
      ];
    }
    
    const windows = await AvailabilityWindow.find(query)
      .sort({ dayOfWeek: 1, startTime: 1, specificDate: 1 });
    
    // Group by type for easier consumption
    const grouped = {
      recurring: windows.filter(w => w.windowType === 'recurring'),
      oneTime: windows.filter(w => w.windowType === 'one-time'),
      exceptions: windows.filter(w => w.windowType === 'exception')
    };
    
    res.json({
      success: true,
      data: {
        therapistId,
        therapistName: therapist.name,
        windows,
        grouped,
        total: windows.length
      }
    });
    
  } catch (err) {
    console.error('❌ Get availability windows error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching availability windows'
    });
  }
});

/**
 * @route   GET /api/availability-windows/:therapistId/slots
 * @desc    Get available time slots for a specific date
 * @access  Public (for booking)
 * Requirements: 1.3
 */
router.get('/:therapistId/slots', async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date, duration } = req.query;
    
    console.log('📅 Get available slots for therapist:', therapistId, 'date:', date);
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    // Verify therapist exists
    const therapist = await User.findById(therapistId);
    if (!therapist || therapist.role !== 'psychologist') {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found'
      });
    }
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Get available slots from the model
    const slotDuration = parseInt(duration) || 60;
    const availableSlots = await AvailabilityWindow.getAvailableSlots(
      therapistId,
      targetDate,
      slotDuration
    );
    
    // Get existing sessions for this date to filter out booked slots
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingSessions = await Session.find({
      psychologist: therapistId,
      sessionDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['Pending Approval', 'Approved', 'Confirmed', 'Booked', 'In Progress'] }
    }).select('sessionDate duration');
    
    // Filter out slots that overlap with existing sessions
    const bookedTimes = existingSessions.map(session => {
      const sessionStart = new Date(session.sessionDate);
      const sessionDuration = session.duration || 60;
      const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60000);
      return {
        start: sessionStart.toTimeString().slice(0, 5),
        end: sessionEnd.toTimeString().slice(0, 5)
      };
    });
    
    const finalSlots = availableSlots.filter(slot => {
      for (const booked of bookedTimes) {
        if (AvailabilityWindow.timesOverlap(slot.startTime, slot.endTime, booked.start, booked.end)) {
          return false;
        }
      }
      return true;
    });
    
    res.json({
      success: true,
      data: {
        therapistId,
        therapistName: therapist.name,
        date: targetDate.toISOString().split('T')[0],
        slotDuration,
        availableSlots: finalSlots,
        totalAvailable: finalSlots.length,
        bookedCount: bookedTimes.length
      }
    });
    
  } catch (err) {
    console.error('❌ Get available slots error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching available slots'
    });
  }
});


/**
 * @route   PUT /api/availability-windows/:id
 * @desc    Update an availability window
 * @access  Private (Psychologist only - owner)
 * Requirements: 2.1, 2.5
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Update availability window:', id, 'by user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify user is a psychologist
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can update availability windows'
      });
    }
    
    const window = await AvailabilityWindow.findById(id);
    if (!window) {
      return res.status(404).json({
        success: false,
        message: 'Availability window not found'
      });
    }
    
    // Verify ownership
    if (window.therapist.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own availability windows'
      });
    }
    
    const {
      startTime,
      endTime,
      title,
      notes,
      sessionTypes,
      maxSessions,
      recurrence,
      bufferMinutes,
      minAdvanceBookingHours,
      maxAdvanceBookingDays,
      isActive
    } = req.body;
    
    // Store previous values for audit
    const previousValue = {
      startTime: window.startTime,
      endTime: window.endTime,
      title: window.title,
      notes: window.notes,
      sessionTypes: window.sessionTypes,
      isActive: window.isActive
    };
    
    // Validate time formats if provided
    if (startTime && !isValidTimeFormat(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in HH:MM format'
      });
    }
    
    if (endTime && !isValidTimeFormat(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be in HH:MM format'
      });
    }
    
    // Validate startTime < endTime
    const newStartTime = startTime || window.startTime;
    const newEndTime = endTime || window.endTime;
    const [startH, startM] = newStartTime.split(':').map(Number);
    const [endH, endM] = newEndTime.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }
    
    // Check for conflicts with existing sessions (Requirement 2.5)
    if (startTime || endTime) {
      const conflicts = await checkSessionConflicts(
        user._id,
        window,
        newStartTime,
        newEndTime
      );
      
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Update conflicts with existing confirmed sessions',
          conflicts: conflicts.map(c => ({
            sessionId: c._id,
            sessionDate: c.sessionDate,
            status: c.status
          }))
        });
      }
    }
    
    // Check for overlapping windows (excluding current window)
    if (startTime || endTime) {
      const existingWindows = await AvailabilityWindow.find({
        therapist: user._id,
        isActive: true,
        _id: { $ne: id },
        windowType: window.windowType
      });
      
      for (const existing of existingWindows) {
        let sameDay = false;
        if (window.windowType === 'recurring' && existing.dayOfWeek === window.dayOfWeek) {
          sameDay = true;
        } else if (window.windowType !== 'recurring' && existing.specificDate && window.specificDate) {
          const existingDate = new Date(existing.specificDate).toISOString().split('T')[0];
          const windowDate = new Date(window.specificDate).toISOString().split('T')[0];
          sameDay = existingDate === windowDate;
        }
        
        if (sameDay && AvailabilityWindow.timesOverlap(newStartTime, newEndTime, existing.startTime, existing.endTime)) {
          return res.status(409).json({
            success: false,
            message: 'Updated times overlap with an existing window',
            conflictingWindow: {
              id: existing._id,
              startTime: existing.startTime,
              endTime: existing.endTime
            }
          });
        }
      }
    }
    
    // Update fields
    if (startTime) window.startTime = startTime;
    if (endTime) window.endTime = endTime;
    if (title !== undefined) window.title = title;
    if (notes !== undefined) window.notes = notes;
    if (sessionTypes) window.sessionTypes = sessionTypes;
    if (maxSessions !== undefined) window.maxSessions = maxSessions;
    if (recurrence) window.recurrence = recurrence;
    if (bufferMinutes !== undefined) window.bufferMinutes = bufferMinutes;
    if (minAdvanceBookingHours !== undefined) window.minAdvanceBookingHours = minAdvanceBookingHours;
    if (maxAdvanceBookingDays !== undefined) window.maxAdvanceBookingDays = maxAdvanceBookingDays;
    if (isActive !== undefined) window.isActive = isActive;
    
    window.updatedBy = user._id;
    await window.save();
    
    // Log the update
    await createAuditLog('AVAILABILITY_WINDOW_UPDATED', {
      userId: user._id,
      targetType: 'AvailabilityWindow',
      targetId: window._id,
      previousValue,
      newValue: {
        startTime: window.startTime,
        endTime: window.endTime,
        title: window.title,
        notes: window.notes,
        sessionTypes: window.sessionTypes,
        isActive: window.isActive
      },
      action: 'Updated availability window',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    console.log('✅ Availability window updated successfully');
    
    res.json({
      success: true,
      message: 'Availability window updated successfully',
      data: window
    });
    
  } catch (err) {
    console.error('❌ Update availability window error:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating availability window'
    });
  }
});

/**
 * Check for conflicts with existing sessions when updating availability
 */
async function checkSessionConflicts(therapistId, window, newStartTime, newEndTime) {
  const now = new Date();
  const query = {
    psychologist: therapistId,
    sessionDate: { $gte: now },
    status: { $in: ['Confirmed', 'Approved', 'Booked', 'In Progress'] }
  };
  
  const sessions = await Session.find(query);
  const conflicts = [];
  
  for (const session of sessions) {
    const sessionDate = new Date(session.sessionDate);
    const sessionDayOfWeek = sessionDate.getDay();
    const sessionTime = sessionDate.toTimeString().slice(0, 5);
    const sessionDuration = session.duration || 60;
    const sessionEndTime = new Date(sessionDate.getTime() + sessionDuration * 60000)
      .toTimeString().slice(0, 5);
    
    // Check if session falls on the same day/date as the window
    let sameDay = false;
    if (window.windowType === 'recurring' && sessionDayOfWeek === window.dayOfWeek) {
      sameDay = true;
    } else if (window.windowType !== 'recurring' && window.specificDate) {
      const windowDate = new Date(window.specificDate).toISOString().split('T')[0];
      const sessDate = sessionDate.toISOString().split('T')[0];
      sameDay = windowDate === sessDate;
    }
    
    if (sameDay) {
      // Check if session would be outside the new availability window
      const sessionWithinWindow = sessionTime >= newStartTime && sessionEndTime <= newEndTime;
      if (!sessionWithinWindow) {
        conflicts.push(session);
      }
    }
  }
  
  return conflicts;
}


/**
 * @route   DELETE /api/availability-windows/:id
 * @desc    Delete/deactivate an availability window
 * @access  Private (Psychologist only - owner)
 * Requirements: 2.1
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent, reason } = req.query;
    
    console.log('🗑️ Delete availability window:', id, 'by user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify user is a psychologist
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can delete availability windows'
      });
    }
    
    const window = await AvailabilityWindow.findById(id);
    if (!window) {
      return res.status(404).json({
        success: false,
        message: 'Availability window not found'
      });
    }
    
    // Verify ownership
    if (window.therapist.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own availability windows'
      });
    }
    
    // Check for conflicts with existing sessions
    const conflicts = await checkSessionConflicts(
      user._id,
      window,
      '00:00',
      '00:00' // Empty window means all sessions would be outside
    );
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete availability window with existing confirmed sessions',
        conflicts: conflicts.map(c => ({
          sessionId: c._id,
          sessionDate: c.sessionDate,
          status: c.status
        })),
        suggestion: 'Please reschedule or cancel these sessions first, or deactivate the window instead'
      });
    }
    
    if (permanent === 'true') {
      // Permanent deletion
      await AvailabilityWindow.findByIdAndDelete(id);
      
      await createAuditLog('AVAILABILITY_WINDOW_DELETED', {
        userId: user._id,
        targetType: 'AvailabilityWindow',
        targetId: id,
        previousValue: {
          windowType: window.windowType,
          dayOfWeek: window.dayOfWeek,
          specificDate: window.specificDate,
          startTime: window.startTime,
          endTime: window.endTime
        },
        action: 'Permanently deleted availability window',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: reason || 'Not specified' }
      });
      
      console.log('✅ Availability window permanently deleted');
      
      res.json({
        success: true,
        message: 'Availability window permanently deleted'
      });
    } else {
      // Soft delete (deactivate)
      await window.deactivate(user._id, reason || 'Deactivated by user');
      
      await createAuditLog('AVAILABILITY_WINDOW_DEACTIVATED', {
        userId: user._id,
        targetType: 'AvailabilityWindow',
        targetId: id,
        previousValue: { isActive: true },
        newValue: { isActive: false },
        action: 'Deactivated availability window',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: reason || 'Not specified' }
      });
      
      console.log('✅ Availability window deactivated');
      
      res.json({
        success: true,
        message: 'Availability window deactivated',
        data: window
      });
    }
    
  } catch (err) {
    console.error('❌ Delete availability window error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting availability window'
    });
  }
});

/**
 * @route   POST /api/availability-windows/:id/reactivate
 * @desc    Reactivate a deactivated availability window
 * @access  Private (Psychologist only - owner)
 */
router.post('/:id/reactivate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 Reactivate availability window:', id, 'by user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can reactivate availability windows'
      });
    }
    
    const window = await AvailabilityWindow.findById(id);
    if (!window) {
      return res.status(404).json({
        success: false,
        message: 'Availability window not found'
      });
    }
    
    if (window.therapist.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reactivate your own availability windows'
      });
    }
    
    if (window.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Availability window is already active'
      });
    }
    
    // Check for overlapping active windows
    const existingWindows = await AvailabilityWindow.find({
      therapist: user._id,
      isActive: true,
      _id: { $ne: id },
      windowType: window.windowType
    });
    
    for (const existing of existingWindows) {
      let sameDay = false;
      if (window.windowType === 'recurring' && existing.dayOfWeek === window.dayOfWeek) {
        sameDay = true;
      } else if (window.windowType !== 'recurring' && existing.specificDate && window.specificDate) {
        const existingDate = new Date(existing.specificDate).toISOString().split('T')[0];
        const windowDate = new Date(window.specificDate).toISOString().split('T')[0];
        sameDay = existingDate === windowDate;
      }
      
      if (sameDay && AvailabilityWindow.timesOverlap(window.startTime, window.endTime, existing.startTime, existing.endTime)) {
        return res.status(409).json({
          success: false,
          message: 'Cannot reactivate - overlaps with an existing active window',
          conflictingWindow: {
            id: existing._id,
            startTime: existing.startTime,
            endTime: existing.endTime
          }
        });
      }
    }
    
    await window.reactivate(user._id);
    
    await createAuditLog('AVAILABILITY_WINDOW_REACTIVATED', {
      userId: user._id,
      targetType: 'AvailabilityWindow',
      targetId: id,
      previousValue: { isActive: false },
      newValue: { isActive: true },
      action: 'Reactivated availability window',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    console.log('✅ Availability window reactivated');
    
    res.json({
      success: true,
      message: 'Availability window reactivated',
      data: window
    });
    
  } catch (err) {
    console.error('❌ Reactivate availability window error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while reactivating availability window'
    });
  }
});

/**
 * @route   POST /api/availability-windows/bulk
 * @desc    Create multiple availability windows at once
 * @access  Private (Psychologist only)
 */
router.post('/bulk', auth, async (req, res) => {
  try {
    console.log('📅 Bulk create availability windows for user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can create availability windows'
      });
    }
    
    const { windows } = req.body;
    
    if (!Array.isArray(windows) || windows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Windows must be a non-empty array'
      });
    }
    
    const created = [];
    const errors = [];
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      
      try {
        // Validate required fields
        if (!windowData.windowType || !windowData.startTime || !windowData.endTime) {
          errors.push({ index: i, error: 'Missing required fields' });
          continue;
        }
        
        if (!isValidTimeFormat(windowData.startTime) || !isValidTimeFormat(windowData.endTime)) {
          errors.push({ index: i, error: 'Invalid time format' });
          continue;
        }
        
        const newWindow = new AvailabilityWindow({
          ...windowData,
          therapist: user._id,
          createdBy: user._id
        });
        
        await newWindow.save();
        created.push(newWindow);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }
    
    if (created.length > 0) {
      await createAuditLog('AVAILABILITY_WINDOWS_BULK_CREATED', {
        userId: user._id,
        targetType: 'AvailabilityWindow',
        action: `Bulk created ${created.length} availability windows`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { createdCount: created.length, errorCount: errors.length }
      });
    }
    
    res.status(created.length > 0 ? 201 : 400).json({
      success: created.length > 0,
      message: `Created ${created.length} windows, ${errors.length} failed`,
      data: {
        created,
        errors
      }
    });
    
  } catch (err) {
    console.error('❌ Bulk create availability windows error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating availability windows'
    });
  }
});

module.exports = router;
