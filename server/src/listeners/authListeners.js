/**
 * Auth Event Listeners
 * 
 * Handles side effects for auth events without coupling to core logic.
 * Listeners are isolated and replaceable.
 * 
 * @module listeners/authListeners
 */

const { eventBus, AUTH_EVENTS, NOTIFICATION_EVENTS } = require('../events/eventBus');

/**
 * Initialize all auth-related event listeners
 * Call this once during application startup
 */
function initAuthListeners() {
  // Registration success - log and queue welcome email
  eventBus.on(AUTH_EVENTS.REGISTER_SUCCESS, async (data) => {
    console.log(`[AUTH] User registered: ${data.email} (${data.role})`);
    
    // Queue welcome email notification
    eventBus.emitEvent(NOTIFICATION_EVENTS.EMAIL_QUEUED, {
      type: 'welcome',
      to: data.email,
      userId: data.userId,
      correlationId: data.correlationId
    });
  });

  // Registration failure - log for monitoring
  eventBus.on(AUTH_EVENTS.REGISTER_FAILURE, (data) => {
    console.warn(`[AUTH] Registration failed: ${data.email} - ${data.reason}`);
    
    // Could emit to monitoring system here
  });

  // Login success - log
  eventBus.on(AUTH_EVENTS.LOGIN_SUCCESS, (data) => {
    console.log(`[AUTH] User logged in: ${data.email}`);
  });

  // Login failure - log and potentially alert on repeated failures
  eventBus.on(AUTH_EVENTS.LOGIN_FAILURE, (data) => {
    console.warn(`[AUTH] Login failed: ${data.email} - ${data.reason}`);
    
    // Could implement rate limiting alerts here
  });

  // Account locked - notify user and admin
  eventBus.on(AUTH_EVENTS.ACCOUNT_LOCKED, (data) => {
    console.warn(`[AUTH] Account locked: ${data.email}`);
    
    // Queue account locked notification
    eventBus.emitEvent(NOTIFICATION_EVENTS.EMAIL_QUEUED, {
      type: 'account_locked',
      to: data.email,
      userId: data.userId,
      correlationId: data.correlationId
    });
  });

  // Email verification sent - log
  eventBus.on(AUTH_EVENTS.EMAIL_VERIFICATION_SENT, (data) => {
    console.log(`[AUTH] Verification email queued for: ${data.email}`);
    
    // Queue verification email
    eventBus.emitEvent(NOTIFICATION_EVENTS.EMAIL_QUEUED, {
      type: 'email_verification',
      to: data.email,
      userId: data.userId,
      token: data.token,
      correlationId: data.correlationId
    });
  });

  // Email verification success - log
  eventBus.on(AUTH_EVENTS.EMAIL_VERIFICATION_SUCCESS, (data) => {
    console.log(`[AUTH] Email verified: ${data.email}`);
  });

  console.log('[LISTENERS] Auth listeners initialized');
}

/**
 * Remove all auth listeners (useful for testing)
 */
function removeAuthListeners() {
  Object.values(AUTH_EVENTS).forEach(event => {
    eventBus.removeAllListeners(event);
  });
}

module.exports = {
  initAuthListeners,
  removeAuthListeners
};
