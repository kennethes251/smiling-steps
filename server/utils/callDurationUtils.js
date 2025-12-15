/**
 * Call Duration Utility Functions
 * 
 * Provides utilities for calculating and formatting video call durations
 */

/**
 * Calculate call duration in minutes from start and end times
 * @param {Date} startTime - Call start time
 * @param {Date} endTime - Call end time (defaults to current time)
 * @returns {number} Duration in minutes (rounded)
 */
function calculateCallDuration(startTime, endTime = new Date()) {
  if (!startTime) {
    return null;
  }
  
  const durationMs = endTime - startTime;
  return Math.round(durationMs / 60000); // Convert to minutes and round
}

/**
 * Format duration in seconds to HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
function formatDurationHMS(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in minutes to human-readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Human-readable duration string
 */
function formatDurationMinutes(minutes) {
  if (!minutes || minutes === 0) {
    return '0 minutes';
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  } else if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Validate call duration for billing purposes
 * @param {number} duration - Duration in minutes
 * @returns {object} Validation result with billing information
 */
function validateCallDuration(duration) {
  const minBillableMinutes = 1; // Minimum billable duration
  const maxSessionMinutes = 120; // Maximum session duration (2 hours)
  
  const result = {
    isValid: true,
    billableDuration: duration,
    warnings: [],
    errors: []
  };
  
  if (duration < 0) {
    result.isValid = false;
    result.errors.push('Duration cannot be negative');
    return result;
  }
  
  if (duration === 0) {
    result.warnings.push('Call duration is 0 minutes - no billing will occur');
    result.billableDuration = 0;
  } else if (duration < minBillableMinutes) {
    result.warnings.push(`Duration less than ${minBillableMinutes} minute - billing rounded up`);
    result.billableDuration = minBillableMinutes;
  }
  
  if (duration > maxSessionMinutes) {
    result.warnings.push(`Duration exceeds maximum session time of ${maxSessionMinutes} minutes`);
  }
  
  return result;
}

/**
 * Get call statistics for a session
 * @param {object} session - Session object with call timing data
 * @returns {object} Call statistics
 */
function getCallStatistics(session) {
  const stats = {
    hasCallData: false,
    startTime: null,
    endTime: null,
    duration: null,
    durationFormatted: null,
    status: 'No call data'
  };
  
  if (session.videoCallStarted) {
    stats.hasCallData = true;
    stats.startTime = session.videoCallStarted;
    
    if (session.videoCallEnded) {
      stats.endTime = session.videoCallEnded;
      stats.duration = session.callDuration || calculateCallDuration(session.videoCallStarted, session.videoCallEnded);
      stats.durationFormatted = formatDurationMinutes(stats.duration);
      stats.status = 'Completed';
    } else {
      // Call is still in progress
      const currentDuration = calculateCallDuration(session.videoCallStarted);
      stats.duration = currentDuration;
      stats.durationFormatted = formatDurationMinutes(currentDuration);
      stats.status = 'In Progress';
    }
  }
  
  return stats;
}

/**
 * Calculate billing amount based on duration and rate
 * @param {number} duration - Duration in minutes
 * @param {number} hourlyRate - Hourly rate
 * @returns {object} Billing calculation
 */
function calculateBilling(duration, hourlyRate) {
  const validation = validateCallDuration(duration);
  const billableMinutes = validation.billableDuration;
  const amount = (billableMinutes / 60) * hourlyRate;
  
  return {
    duration: duration,
    billableDuration: billableMinutes,
    hourlyRate: hourlyRate,
    amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
    validation: validation
  };
}

module.exports = {
  calculateCallDuration,
  formatDurationHMS,
  formatDurationMinutes,
  validateCallDuration,
  getCallStatistics,
  calculateBilling
};