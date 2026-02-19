/**
 * Notification Event Listeners
 * 
 * Handles email/SMS sending as side effects.
 * Isolated from core business logic.
 * 
 * @module listeners/notificationListeners
 */

const { eventBus, NOTIFICATION_EVENTS } = require('../events/eventBus');

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Initialize notification listeners
 */
function initNotificationListeners() {
  // Email queued - process and send
  eventBus.on(NOTIFICATION_EVENTS.EMAIL_QUEUED, async (data) => {
    console.log(`[NOTIFICATION] Email queued: ${data.type} to ${data.to}`);
    
    try {
      await sendEmailWithRetry(data);
      
      eventBus.emitEvent(NOTIFICATION_EVENTS.EMAIL_SENT, {
        type: data.type,
        to: data.to,
        correlationId: data.correlationId
      });
    } catch (error) {
      eventBus.emitEvent(NOTIFICATION_EVENTS.EMAIL_FAILED, {
        type: data.type,
        to: data.to,
        error: error.message,
        correlationId: data.correlationId
      });
    }
  });

  // Email sent - log success
  eventBus.on(NOTIFICATION_EVENTS.EMAIL_SENT, (data) => {
    console.log(`[NOTIFICATION] Email sent: ${data.type} to ${data.to}`);
  });

  // Email failed - log for monitoring
  eventBus.on(NOTIFICATION_EVENTS.EMAIL_FAILED, (data) => {
    console.error(`[NOTIFICATION] Email failed: ${data.type} to ${data.to} - ${data.error}`);
    
    // Could alert monitoring system here
  });

  console.log('[LISTENERS] Notification listeners initialized');
}

/**
 * Send email with retry logic
 * @param {object} emailData - Email configuration
 * @param {number} attempt - Current attempt number
 */
async function sendEmailWithRetry(emailData, attempt = 1) {
  try {
    await sendEmail(emailData);
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`[NOTIFICATION] Retry ${attempt}/${MAX_RETRIES} for ${emailData.to}`);
      await delay(RETRY_DELAY * attempt);
      return sendEmailWithRetry(emailData, attempt + 1);
    }
    throw error;
  }
}

/**
 * Send email (placeholder - integrate with actual email service)
 * @param {object} emailData - Email configuration
 */
async function sendEmail(emailData) {
  // This is a placeholder - integrate with nodemailer or email service
  // The actual implementation would be in a separate email service
  
  const { type, to, token } = emailData;
  
  // Simulate email sending
  console.log(`[EMAIL] Sending ${type} email to ${to}`);
  
  // In production, this would call the actual email service
  // Example:
  // const emailService = require('../services/emailService');
  // await emailService.send(emailData);
  
  return true;
}

/**
 * Delay helper for retries
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Remove notification listeners
 */
function removeNotificationListeners() {
  Object.values(NOTIFICATION_EVENTS).forEach(event => {
    eventBus.removeAllListeners(event);
  });
}

module.exports = {
  initNotificationListeners,
  removeNotificationListeners
};
