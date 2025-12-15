const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique meeting link for video call sessions
 * @returns {string} Unique meeting link in format "room-{uuid}"
 */
function generateMeetingLink() {
  return `room-${uuidv4()}`;
}

/**
 * Generate a secure meeting link with timestamp for enhanced security
 * @returns {string} Secure meeting link in format "room-{uuid}-{timestamp}"
 */
function generateSecureMeetingLink() {
  return `room-${uuidv4()}-${Date.now()}`;
}

/**
 * Validate meeting link format
 * @param {string} meetingLink - The meeting link to validate
 * @returns {boolean} True if valid format
 */
function isValidMeetingLink(meetingLink) {
  if (!meetingLink || typeof meetingLink !== 'string') {
    return false;
  }
  
  // Check for basic format: room-{uuid} or room-{uuid}-{timestamp}
  const basicPattern = /^room-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const securePattern = /^room-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+$/i;
  
  return basicPattern.test(meetingLink) || securePattern.test(meetingLink);
}

/**
 * Ensure a session has a meeting link, generate one if missing
 * @param {Object} session - The session object
 * @returns {string} The meeting link (existing or newly generated)
 */
function ensureMeetingLink(session) {
  if (!session.meetingLink || !isValidMeetingLink(session.meetingLink)) {
    session.meetingLink = generateMeetingLink();
  }
  return session.meetingLink;
}

module.exports = {
  generateMeetingLink,
  generateSecureMeetingLink,
  isValidMeetingLink,
  ensureMeetingLink
};