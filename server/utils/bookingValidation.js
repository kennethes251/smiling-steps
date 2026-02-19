/**
 * Booking Validation Utilities
 * 
 * Shared validation logic for session booking operations.
 * Used by both production code and property-based tests.
 * 
 * @module utils/bookingValidation
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Session duration in milliseconds (1 hour)
 */
const SESSION_DURATION_MS = 60 * 60 * 1000;

/**
 * Session duration in minutes
 */
const SESSION_DURATION_MINUTES = 60;

/**
 * Valid session types
 */
const VALID_SESSION_TYPES = ['Individual', 'Couples', 'Family', 'Group'];

/**
 * Valid payment statuses for admin booking
 */
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'waived'];

/**
 * Session statuses that block time slots (non-cancelled)
 */
const ACTIVE_SESSION_STATUSES = ['Pending', 'Approved', 'Confirmed', 'InProgress', 'Completed'];

/**
 * Session statuses that do NOT block time slots
 */
const CANCELLED_SESSION_STATUSES = ['Cancelled', 'Declined'];

// ============================================================================
// DOUBLE-BOOKING DETECTION
// ============================================================================

/**
 * Check if a booking request conflicts with an existing session.
 * 
 * @param {Object} existingSession - The existing session to check against
 * @param {Date} requestedDateTime - The requested booking date/time
 * @param {string} psychologistId - The psychologist ID for the booking
 * @returns {Object} Result with isConflict boolean and details
 */
function checkForDoubleBooking(existingSession, requestedDateTime, psychologistId) {
  if (!existingSession) {
    return { isConflict: false };
  }
  
  // Check if the existing session is for the same psychologist
  if (existingSession.psychologist !== psychologistId) {
    return { isConflict: false };
  }

  // Check if the existing session is in a non-cancelled status
  if (CANCELLED_SESSION_STATUSES.includes(existingSession.status)) {
    return { isConflict: false };
  }

  // Session duration is 1 hour - check for overlap
  const requestedStart = new Date(requestedDateTime);
  const requestedEnd = new Date(requestedStart.getTime() + SESSION_DURATION_MS);
  const existingStart = new Date(existingSession.sessionDate);
  const existingEnd = new Date(existingStart.getTime() + SESSION_DURATION_MS);

  // Check for time overlap
  const hasOverlap = requestedStart < existingEnd && requestedEnd > existingStart;

  return {
    isConflict: hasOverlap,
    existingSession: existingSession,
    requestedTime: requestedDateTime,
    details: hasOverlap ? {
      requestedWindow: { start: requestedStart, end: requestedEnd },
      existingWindow: { start: existingStart, end: existingEnd }
    } : null
  };
}

/**
 * Build MongoDB query for finding conflicting sessions.
 * 
 * @param {string} psychologistId - The psychologist ID
 * @param {Date} requestedDateTime - The requested booking date/time
 * @returns {Object} MongoDB query object
 */
function buildConflictQuery(psychologistId, requestedDateTime) {
  const requestedTime = new Date(requestedDateTime);
  
  return {
    psychologist: psychologistId,
    sessionDate: {
      $gte: new Date(requestedTime.getTime() - SESSION_DURATION_MS),
      $lt: new Date(requestedTime.getTime() + SESSION_DURATION_MS)
    },
    status: { $nin: CANCELLED_SESSION_STATUSES }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  SESSION_DURATION_MS,
  SESSION_DURATION_MINUTES,
  VALID_SESSION_TYPES,
  VALID_PAYMENT_STATUSES,
  ACTIVE_SESSION_STATUSES,
  CANCELLED_SESSION_STATUSES,
  
  // Functions
  checkForDoubleBooking,
  buildConflictQuery
};
