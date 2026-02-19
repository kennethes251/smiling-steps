/**
 * Availability Management Routes
 * 
 * Implements availability management endpoints for Requirements 6.1-6.5
 * 
 * Endpoints:
 * - GET /api/users/availability - Get current availability schedule (6.1)
 * - PUT /api/users/availability - Update availability schedule (6.2, 6.4)
 * - POST /api/users/availability/block - Block specific dates (6.3)
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
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
 * Create audit log entry for availability changes
 * Requirements: 5.5, 8.6
 */
async function createAvailabilityAuditLog(actionType, data) {
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
 * Compare two times in HH:MM format
 * Returns: negative if time1 < time2, 0 if equal, positive if time1 > time2
 */
function compareTimes(time1, time2) {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  if (h1 !== h2) return h1 - h2;
  return m1 - m2;
}

/**
 * Check if a date falls within an availability slot
 */
function isDateInAvailabilitySlot(date, availability) {
  const dayOfWeek = date.getDay();
  const timeStr = date.toTimeString().slice(0, 5); // HH:MM format
  
  for (const slot of availability) {
    if (slot.dayOfWeek === dayOfWeek) {
      if (compareTimes(timeStr, slot.startTime) >= 0 && compareTimes(timeStr, slot.endTime) <= 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check for conflicts with confirmed sessions
 * @param {ObjectId} psychologistId - The psychologist's user ID
 * @param {Array} newAvailability - The new availability slots
 * @returns {Array} - Array of conflicting sessions
 */
async function checkSessionConflicts(psychologistId, newAvailability) {
  // Get all confirmed/approved sessions for this psychologist in the future
  const now = new Date();
  const confirmedSessions = await Session.find({
    psychologist: psychologistId,
    sessionDate: { $gte: now },
    status: { $in: ['Confirmed', 'Approved', 'Booked', 'In Progress'] }
  }).select('sessionDate sessionType status');
  
  const conflicts = [];
  
  for (const session of confirmedSessions) {
    const sessionDate = new Date(session.sessionDate);
    const dayOfWeek = sessionDate.getDay();
    const sessionTime = sessionDate.toTimeString().slice(0, 5);
    
    // Check if this session falls within any of the new availability slots
    let isWithinAvailability = false;
    
    for (const slot of newAvailability) {
      if (slot.dayOfWeek === dayOfWeek) {
        if (compareTimes(sessionTime, slot.startTime) >= 0 && 
            compareTimes(sessionTime, slot.endTime) <= 0) {
          isWithinAvailability = true;
          break;
        }
      }
    }
    
    // If the session is NOT within the new availability, it's a conflict
    if (!isWithinAvailability) {
      conflicts.push({
        sessionId: session._id,
        sessionDate: session.sessionDate,
        sessionType: session.sessionType,
        status: session.status
      });
    }
  }
  
  return conflicts;
}

/**
 * Check for conflicts when blocking dates
 * @param {ObjectId} psychologistId - The psychologist's user ID
 * @param {Array} datesToBlock - Array of dates to block
 * @returns {Array} - Array of conflicting sessions
 */
async function checkBlockedDateConflicts(psychologistId, datesToBlock) {
  const conflicts = [];
  
  for (const dateToBlock of datesToBlock) {
    const blockDate = new Date(dateToBlock);
    const startOfDay = new Date(blockDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(blockDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Find any confirmed sessions on this date
    const sessionsOnDate = await Session.find({
      psychologist: psychologistId,
      sessionDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['Confirmed', 'Approved', 'Booked', 'In Progress'] }
    }).select('sessionDate sessionType status');
    
    for (const session of sessionsOnDate) {
      conflicts.push({
        sessionId: session._id,
        sessionDate: session.sessionDate,
        sessionType: session.sessionType,
        status: session.status,
        blockedDate: dateToBlock
      });
    }
  }
  
  return conflicts;
}

/**
 * @route   GET /api/users/availability
 * @desc    Get current availability schedule and blocked dates
 * @access  Private (Psychologist only)
 * Requirements: 6.1
 */
router.get('/', auth, async (req, res) => {
  try {
    console.log('📅 Availability fetch request for user:', req.user.id);
    
    const user = await User.findById(req.user.id).select('role availability blockedDates');
    
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
        message: 'Only psychologists can access availability settings'
      });
    }
    
    // Return current availability schedule and blocked dates
    const availabilityData = {
      availability: user.availability || [],
      blockedDates: user.blockedDates || []
    };
    
    console.log('✅ Availability fetched successfully');
    
    res.json({
      success: true,
      data: availabilityData
    });
    
  } catch (err) {
    console.error('❌ Availability fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching availability'
    });
  }
});

/**
 * @route   PUT /api/users/availability
 * @desc    Update availability schedule
 * @access  Private (Psychologist only)
 * Requirements: 6.2, 6.4
 */
router.put('/', auth, async (req, res) => {
  try {
    console.log('🔄 Availability update request for user:', req.user.id);
    
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
        message: 'Only psychologists can update availability settings'
      });
    }
    
    const { availability } = req.body;
    
    // Validate availability array
    if (!Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: 'Availability must be an array of time slots'
      });
    }
    
    // Validate each availability slot
    const errors = [];
    const validatedSlots = [];
    
    for (let i = 0; i < availability.length; i++) {
      const slot = availability[i];
      
      // Validate dayOfWeek
      if (slot.dayOfWeek === undefined || slot.dayOfWeek === null) {
        errors.push(`Slot ${i + 1}: dayOfWeek is required`);
        continue;
      }
      
      const dayOfWeek = Number(slot.dayOfWeek);
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        errors.push(`Slot ${i + 1}: dayOfWeek must be a number between 0 (Sunday) and 6 (Saturday)`);
        continue;
      }
      
      // Validate startTime format
      if (!isValidTimeFormat(slot.startTime)) {
        errors.push(`Slot ${i + 1}: startTime must be in HH:MM format`);
        continue;
      }
      
      // Validate endTime format
      if (!isValidTimeFormat(slot.endTime)) {
        errors.push(`Slot ${i + 1}: endTime must be in HH:MM format`);
        continue;
      }
      
      // Validate startTime < endTime - Requirement 6.2
      if (compareTimes(slot.startTime, slot.endTime) >= 0) {
        errors.push(`Slot ${i + 1}: startTime must be before endTime`);
        continue;
      }
      
      validatedSlots.push({
        dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime
      });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Check for conflicts with confirmed sessions - Requirement 6.4
    const conflicts = await checkSessionConflicts(user._id, validatedSlots);
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Availability update conflicts with existing confirmed sessions',
        conflicts: conflicts.map(c => ({
          sessionDate: c.sessionDate,
          sessionType: c.sessionType,
          status: c.status
        }))
      });
    }
    
    // Store previous values for audit log
    const previousAvailability = user.availability ? [...user.availability] : [];
    
    // Update availability
    user.availability = validatedSlots;
    await user.save();
    
    // Log changes to audit log
    await createAvailabilityAuditLog('AVAILABILITY_UPDATE', {
      userId: user._id,
      targetType: 'Availability',
      targetId: user._id,
      previousValue: { availability: previousAvailability },
      newValue: { availability: validatedSlots },
      action: 'Availability schedule updated',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    console.log('✅ Availability updated successfully');
    
    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: {
        availability: user.availability
      }
    });
    
  } catch (err) {
    console.error('❌ Availability update error:', err);
    
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
      message: 'An error occurred while updating availability'
    });
  }
});

/**
 * @route   POST /api/users/availability/block
 * @desc    Block specific dates
 * @access  Private (Psychologist only)
 * Requirements: 6.3
 */
router.post('/block', auth, async (req, res) => {
  try {
    console.log('🚫 Block dates request for user:', req.user.id);
    
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
        message: 'Only psychologists can block dates'
      });
    }
    
    const { dates } = req.body;
    
    // Validate dates array
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be a non-empty array of date strings'
      });
    }
    
    // Validate and parse each date
    const errors = [];
    const validDates = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const parsedDate = new Date(dateStr);
      
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Date ${i + 1}: Invalid date format`);
        continue;
      }
      
      // Check if date is in the past
      const dateOnly = new Date(parsedDate);
      dateOnly.setHours(0, 0, 0, 0);
      
      if (dateOnly < now) {
        errors.push(`Date ${i + 1}: Cannot block dates in the past`);
        continue;
      }
      
      validDates.push(parsedDate);
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Check for conflicts with confirmed sessions - Requirement 6.3
    const conflicts = await checkBlockedDateConflicts(user._id, validDates);
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot block dates with existing confirmed sessions',
        conflicts: conflicts.map(c => ({
          sessionDate: c.sessionDate,
          sessionType: c.sessionType,
          status: c.status,
          blockedDate: c.blockedDate
        }))
      });
    }
    
    // Store previous blocked dates for audit log
    const previousBlockedDates = user.blockedDates ? [...user.blockedDates] : [];
    
    // Add new blocked dates (avoid duplicates)
    const existingDates = new Set(
      (user.blockedDates || []).map(d => new Date(d).toISOString().split('T')[0])
    );
    
    const newDatesToAdd = validDates.filter(d => {
      const dateStr = d.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    });
    
    if (newDatesToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All specified dates are already blocked'
      });
    }
    
    // Initialize blockedDates if not exists
    if (!user.blockedDates) {
      user.blockedDates = [];
    }
    
    // Add new blocked dates
    user.blockedDates.push(...newDatesToAdd);
    await user.save();
    
    // Log changes to audit log
    await createAvailabilityAuditLog('DATES_BLOCKED', {
      userId: user._id,
      targetType: 'Availability',
      targetId: user._id,
      previousValue: { blockedDates: previousBlockedDates },
      newValue: { blockedDates: user.blockedDates },
      action: `Blocked ${newDatesToAdd.length} date(s)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        datesBlocked: newDatesToAdd.map(d => d.toISOString())
      }
    });
    
    console.log('✅ Dates blocked successfully');
    
    res.json({
      success: true,
      message: `Successfully blocked ${newDatesToAdd.length} date(s)`,
      data: {
        blockedDates: user.blockedDates,
        newlyBlocked: newDatesToAdd
      }
    });
    
  } catch (err) {
    console.error('❌ Block dates error:', err);
    
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
      message: 'An error occurred while blocking dates'
    });
  }
});

/**
 * @route   DELETE /api/users/availability/block
 * @desc    Unblock specific dates
 * @access  Private (Psychologist only)
 */
router.delete('/block', auth, async (req, res) => {
  try {
    console.log('✅ Unblock dates request for user:', req.user.id);
    
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
        message: 'Only psychologists can manage blocked dates'
      });
    }
    
    const { dates } = req.body;
    
    // Validate dates array
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be a non-empty array of date strings'
      });
    }
    
    // Store previous blocked dates for audit log
    const previousBlockedDates = user.blockedDates ? [...user.blockedDates] : [];
    
    // Convert dates to remove to a Set for efficient lookup
    const datesToRemove = new Set(
      dates.map(d => new Date(d).toISOString().split('T')[0])
    );
    
    // Filter out the dates to unblock
    const originalCount = (user.blockedDates || []).length;
    user.blockedDates = (user.blockedDates || []).filter(d => {
      const dateStr = new Date(d).toISOString().split('T')[0];
      return !datesToRemove.has(dateStr);
    });
    
    const removedCount = originalCount - user.blockedDates.length;
    
    if (removedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the specified dates were blocked'
      });
    }
    
    await user.save();
    
    // Log changes to audit log
    await createAvailabilityAuditLog('DATES_UNBLOCKED', {
      userId: user._id,
      targetType: 'Availability',
      targetId: user._id,
      previousValue: { blockedDates: previousBlockedDates },
      newValue: { blockedDates: user.blockedDates },
      action: `Unblocked ${removedCount} date(s)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        datesUnblocked: Array.from(datesToRemove)
      }
    });
    
    console.log('✅ Dates unblocked successfully');
    
    res.json({
      success: true,
      message: `Successfully unblocked ${removedCount} date(s)`,
      data: {
        blockedDates: user.blockedDates,
        removedCount
      }
    });
    
  } catch (err) {
    console.error('❌ Unblock dates error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while unblocking dates'
    });
  }
});

module.exports = router;
