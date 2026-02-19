/**
 * Availability Conflict Service
 * 
 * Implements Requirements 2.5 from teletherapy-booking-enhancement
 * - Check new availability against existing sessions
 * - Prevent overlapping availability windows
 * - Validate time ranges
 */

const AvailabilityWindow = require('../models/AvailabilityWindow');
const Session = require('../models/Session');
const User = require('../models/User');

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
 * Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return compareTimes(start1, end2) < 0 && compareTimes(end1, start2) > 0;
}

/**
 * Validate time range (start must be before end)
 * @param {String} startTime - Start time in HH:MM format
 * @param {String} endTime - End time in HH:MM format
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateTimeRange(startTime, endTime) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(startTime)) {
    return { valid: false, error: 'Invalid start time format. Use HH:MM' };
  }
  
  if (!timeRegex.test(endTime)) {
    return { valid: false, error: 'Invalid end time format. Use HH:MM' };
  }
  
  if (compareTimes(startTime, endTime) >= 0) {
    return { valid: false, error: 'Start time must be before end time' };
  }
  
  return { valid: true };
}


/**
 * Check for conflicts between a proposed availability window and existing sessions
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Object} proposedWindow - The proposed availability window
 * @param {String} proposedWindow.windowType - 'recurring', 'one-time', or 'exception'
 * @param {Number} proposedWindow.dayOfWeek - Day of week (0-6) for recurring
 * @param {Date} proposedWindow.specificDate - Specific date for one-time/exception
 * @param {String} proposedWindow.startTime - Start time in HH:MM format
 * @param {String} proposedWindow.endTime - End time in HH:MM format
 * @returns {Promise<Object>} - { hasConflicts: boolean, conflicts: Array }
 */
async function checkSessionConflicts(therapistId, proposedWindow) {
  const { windowType, dayOfWeek, specificDate, startTime, endTime } = proposedWindow;
  
  // Validate time range
  const timeValidation = validateTimeRange(startTime, endTime);
  if (!timeValidation.valid) {
    return { hasConflicts: true, error: timeValidation.error, conflicts: [] };
  }
  
  const now = new Date();
  const conflicts = [];
  
  // Get all future confirmed sessions for this therapist
  const sessions = await Session.find({
    psychologist: therapistId,
    sessionDate: { $gte: now },
    status: { $in: ['Pending Approval', 'Approved', 'Confirmed', 'Booked', 'In Progress'] }
  }).populate('client', 'name email');
  
  for (const session of sessions) {
    const sessionDate = new Date(session.sessionDate);
    const sessionDayOfWeek = sessionDate.getDay();
    const sessionTime = sessionDate.toTimeString().slice(0, 5);
    const sessionDuration = session.duration || 60;
    const sessionEndMinutes = (parseInt(sessionTime.split(':')[0]) * 60 + 
                               parseInt(sessionTime.split(':')[1])) + sessionDuration;
    const sessionEndH = Math.floor(sessionEndMinutes / 60);
    const sessionEndM = sessionEndMinutes % 60;
    const sessionEndTime = `${String(sessionEndH).padStart(2, '0')}:${String(sessionEndM).padStart(2, '0')}`;
    
    let isRelevantDay = false;
    
    if (windowType === 'recurring') {
      // For recurring windows, check if session falls on the same day of week
      isRelevantDay = sessionDayOfWeek === dayOfWeek;
    } else if (windowType === 'one-time' || windowType === 'exception') {
      // For one-time/exception windows, check if session is on the specific date
      const windowDate = new Date(specificDate).toISOString().split('T')[0];
      const sessDate = sessionDate.toISOString().split('T')[0];
      isRelevantDay = windowDate === sessDate;
    }
    
    if (isRelevantDay) {
      // For exception windows (blocked times), any session during this time is a conflict
      if (windowType === 'exception') {
        if (timesOverlap(sessionTime, sessionEndTime, startTime, endTime)) {
          conflicts.push({
            sessionId: session._id,
            sessionDate: session.sessionDate,
            sessionTime,
            sessionEndTime,
            status: session.status,
            clientName: session.client?.name || 'Unknown',
            reason: 'Session falls within blocked time'
          });
        }
      } else {
        // For availability windows, check if session would be OUTSIDE the new window
        const sessionWithinWindow = compareTimes(sessionTime, startTime) >= 0 && 
                                    compareTimes(sessionEndTime, endTime) <= 0;
        
        if (!sessionWithinWindow) {
          conflicts.push({
            sessionId: session._id,
            sessionDate: session.sessionDate,
            sessionTime,
            sessionEndTime,
            status: session.status,
            clientName: session.client?.name || 'Unknown',
            reason: 'Session would be outside new availability window'
          });
        }
      }
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    checkedSessions: sessions.length
  };
}

/**
 * Check for overlapping availability windows
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Object} proposedWindow - The proposed availability window
 * @param {ObjectId} excludeWindowId - Window ID to exclude (for updates)
 * @returns {Promise<Object>} - { hasOverlap: boolean, overlappingWindows: Array }
 */
async function checkWindowOverlaps(therapistId, proposedWindow, excludeWindowId = null) {
  const { windowType, dayOfWeek, specificDate, startTime, endTime } = proposedWindow;
  
  // Validate time range
  const timeValidation = validateTimeRange(startTime, endTime);
  if (!timeValidation.valid) {
    return { hasOverlap: true, error: timeValidation.error, overlappingWindows: [] };
  }
  
  // Build query for existing windows
  const query = {
    therapist: therapistId,
    isActive: true,
    windowType: windowType
  };
  
  if (excludeWindowId) {
    query._id = { $ne: excludeWindowId };
  }
  
  const existingWindows = await AvailabilityWindow.find(query);
  const overlappingWindows = [];
  
  for (const existing of existingWindows) {
    let sameDay = false;
    
    if (windowType === 'recurring') {
      sameDay = existing.dayOfWeek === dayOfWeek;
    } else {
      if (existing.specificDate && specificDate) {
        const existingDate = new Date(existing.specificDate).toISOString().split('T')[0];
        const proposedDate = new Date(specificDate).toISOString().split('T')[0];
        sameDay = existingDate === proposedDate;
      }
    }
    
    if (sameDay && timesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
      overlappingWindows.push({
        windowId: existing._id,
        windowType: existing.windowType,
        dayOfWeek: existing.dayOfWeek,
        specificDate: existing.specificDate,
        startTime: existing.startTime,
        endTime: existing.endTime,
        title: existing.title
      });
    }
  }
  
  return {
    hasOverlap: overlappingWindows.length > 0,
    overlappingWindows
  };
}


/**
 * Check if a proposed booking time slot is available
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Date} proposedDateTime - The proposed session start time
 * @param {Number} durationMinutes - Session duration in minutes
 * @returns {Promise<Object>} - { available: boolean, reason?: string, suggestions?: Array }
 */
async function checkBookingSlotAvailability(therapistId, proposedDateTime, durationMinutes = 60) {
  const proposedDate = new Date(proposedDateTime);
  const dayOfWeek = proposedDate.getDay();
  const startTime = proposedDate.toTimeString().slice(0, 5);
  
  // Calculate end time
  const endMinutes = (parseInt(startTime.split(':')[0]) * 60 + 
                      parseInt(startTime.split(':')[1])) + durationMinutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  
  // Get availability windows for this date
  const windows = await AvailabilityWindow.findForDate(therapistId, proposedDate);
  
  // Check for exceptions (blocked times)
  for (const exception of windows.exceptions) {
    if (timesOverlap(startTime, endTime, exception.startTime, exception.endTime)) {
      return {
        available: false,
        reason: 'Time slot is blocked by therapist',
        blockedBy: exception.title || 'Blocked time'
      };
    }
  }
  
  // Check if slot falls within any availability window
  const allAvailableWindows = [...windows.recurring, ...windows.oneTime];
  let withinAvailability = false;
  let matchingWindow = null;
  
  for (const window of allAvailableWindows) {
    if (compareTimes(startTime, window.startTime) >= 0 && 
        compareTimes(endTime, window.endTime) <= 0) {
      withinAvailability = true;
      matchingWindow = window;
      break;
    }
  }
  
  if (!withinAvailability) {
    // Get available slots for suggestions
    const availableSlots = await AvailabilityWindow.getAvailableSlots(
      therapistId, 
      proposedDate, 
      durationMinutes
    );
    
    return {
      available: false,
      reason: 'Time slot is outside therapist availability',
      suggestions: availableSlots.slice(0, 5) // Return up to 5 suggestions
    };
  }
  
  // Check for existing sessions at this time
  const startOfSlot = new Date(proposedDate);
  const endOfSlot = new Date(proposedDate.getTime() + durationMinutes * 60000);
  
  const existingSessions = await Session.find({
    psychologist: therapistId,
    sessionDate: {
      $lt: endOfSlot,
      $gte: new Date(startOfSlot.getTime() - durationMinutes * 60000)
    },
    status: { $in: ['Pending Approval', 'Approved', 'Confirmed', 'Booked', 'In Progress'] }
  });
  
  for (const session of existingSessions) {
    const sessionStart = new Date(session.sessionDate);
    const sessionDuration = session.duration || 60;
    const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60000);
    
    // Check for overlap
    if (startOfSlot < sessionEnd && endOfSlot > sessionStart) {
      return {
        available: false,
        reason: 'Time slot conflicts with an existing session',
        conflictingSession: {
          sessionId: session._id,
          startTime: sessionStart.toISOString(),
          endTime: sessionEnd.toISOString()
        }
      };
    }
  }
  
  // Check minimum advance booking time
  const now = new Date();
  const hoursUntilSession = (proposedDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const minAdvanceHours = matchingWindow?.minAdvanceBookingHours || 24;
  
  if (hoursUntilSession < minAdvanceHours) {
    return {
      available: false,
      reason: `Bookings must be made at least ${minAdvanceHours} hours in advance`
    };
  }
  
  // Check maximum advance booking time
  const daysUntilSession = hoursUntilSession / 24;
  const maxAdvanceDays = matchingWindow?.maxAdvanceBookingDays || 30;
  
  if (daysUntilSession > maxAdvanceDays) {
    return {
      available: false,
      reason: `Bookings cannot be made more than ${maxAdvanceDays} days in advance`
    };
  }
  
  return {
    available: true,
    window: {
      windowId: matchingWindow._id,
      sessionTypes: matchingWindow.sessionTypes || ['Individual', 'Couples', 'Family', 'Group']
    }
  };
}

/**
 * Get comprehensive availability report for a therapist
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Object>} - Availability report
 */
async function getAvailabilityReport(therapistId, startDate, endDate) {
  const report = {
    therapistId,
    dateRange: { start: startDate, end: endDate },
    totalDays: 0,
    availableDays: 0,
    totalSlots: 0,
    bookedSlots: 0,
    availableSlots: 0,
    dailyBreakdown: []
  };
  
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    const dayReport = {
      date: currentDate.toISOString().split('T')[0],
      dayOfWeek: currentDate.getDay(),
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()],
      windows: [],
      totalSlots: 0,
      bookedSlots: 0,
      availableSlots: 0
    };
    
    // Get windows for this day
    const windows = await AvailabilityWindow.findForDate(therapistId, currentDate);
    const allWindows = [...windows.recurring, ...windows.oneTime];
    
    if (allWindows.length > 0) {
      report.availableDays++;
      
      // Get available slots
      const slots = await AvailabilityWindow.getAvailableSlots(therapistId, currentDate, 60);
      
      // Get booked sessions
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const bookedSessions = await Session.countDocuments({
        psychologist: therapistId,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['Pending Approval', 'Approved', 'Confirmed', 'Booked', 'In Progress'] }
      });
      
      dayReport.windows = allWindows.map(w => ({
        startTime: w.startTime,
        endTime: w.endTime,
        type: w.windowType
      }));
      dayReport.totalSlots = slots.length + bookedSessions;
      dayReport.bookedSlots = bookedSessions;
      dayReport.availableSlots = slots.length;
      
      report.totalSlots += dayReport.totalSlots;
      report.bookedSlots += dayReport.bookedSlots;
      report.availableSlots += dayReport.availableSlots;
    }
    
    report.dailyBreakdown.push(dayReport);
    report.totalDays++;
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  report.utilizationRate = report.totalSlots > 0 
    ? Math.round((report.bookedSlots / report.totalSlots) * 100) 
    : 0;
  
  return report;
}

module.exports = {
  validateTimeRange,
  timesOverlap,
  compareTimes,
  checkSessionConflicts,
  checkWindowOverlaps,
  checkBookingSlotAvailability,
  getAvailabilityReport
};
