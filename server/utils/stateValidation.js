/**
 * State Validation Utilities
 * 
 * This module provides validation functions for state transitions across
 * the Flow Integrity system. These functions enforce the state machines
 * defined in the constants files.
 * 
 * CRITICAL: All state changes must go through these validation functions.
 * REFINEMENT #5: Includes kill switch support for enforcement levels.
 */

const { PAYMENT_STATES, PAYMENT_TRANSITIONS } = require('../constants/paymentStates');
const { SESSION_STATES, SESSION_TRANSITIONS } = require('../constants/sessionStates');
const { VIDEO_STATES, VIDEO_TRANSITIONS } = require('../constants/videoStates');
const { integrityConfig } = require('../config/integrityConfig');

/**
 * Payment State Validation
 * 
 * Validates that a payment state transition is allowed according to
 * the payment state machine.
 * 
 * @param {string} currentState - Current payment state
 * @param {string} newState - Desired new payment state
 * @throws {Error} If transition is not allowed
 * @returns {boolean} True if transition is valid
 */
function validatePaymentTransition(currentState, newState) {
  // Check if states are valid
  if (!Object.values(PAYMENT_STATES).includes(currentState)) {
    throw new Error(`Invalid current payment state: ${currentState}`);
  }
  
  if (!Object.values(PAYMENT_STATES).includes(newState)) {
    throw new Error(`Invalid new payment state: ${newState}`);
  }
  
  // Check if transition is allowed
  const allowedTransitions = PAYMENT_TRANSITIONS[currentState] || [];
  
  if (!allowedTransitions.includes(newState)) {
    throw new Error(
      `FORBIDDEN PAYMENT TRANSITION: ${currentState} → ${newState}. ` +
      `Allowed transitions: [${allowedTransitions.join(', ')}]`
    );
  }
  
  return true;
}

/**
 * Session State Validation
 * 
 * Validates that a session state transition is allowed according to
 * the session state machine.
 * 
 * @param {string} currentState - Current session state
 * @param {string} newState - Desired new session state
 * @throws {Error} If transition is not allowed
 * @returns {boolean} True if transition is valid
 */
function validateSessionTransition(currentState, newState) {
  // Check if states are valid
  if (!Object.values(SESSION_STATES).includes(currentState)) {
    throw new Error(`Invalid current session state: ${currentState}`);
  }
  
  if (!Object.values(SESSION_STATES).includes(newState)) {
    throw new Error(`Invalid new session state: ${newState}`);
  }
  
  // Check if transition is allowed
  const allowedTransitions = SESSION_TRANSITIONS[currentState] || [];
  
  if (!allowedTransitions.includes(newState)) {
    throw new Error(
      `FORBIDDEN SESSION TRANSITION: ${currentState} → ${newState}. ` +
      `Allowed transitions: [${allowedTransitions.join(', ')}]`
    );
  }
  
  return true;
}

/**
 * Video Call State Validation
 * 
 * Validates that a video call state transition is allowed according to
 * the video call state machine.
 * 
 * @param {string} currentState - Current video call state
 * @param {string} newState - Desired new video call state
 * @throws {Error} If transition is not allowed
 * @returns {boolean} True if transition is valid
 */
function validateVideoTransition(currentState, newState) {
  // Check if states are valid
  if (!Object.values(VIDEO_STATES).includes(currentState)) {
    throw new Error(`Invalid current video call state: ${currentState}`);
  }
  
  if (!Object.values(VIDEO_STATES).includes(newState)) {
    throw new Error(`Invalid new video call state: ${newState}`);
  }
  
  // Check if transition is allowed
  const allowedTransitions = VIDEO_TRANSITIONS[currentState] || [];
  
  if (!allowedTransitions.includes(newState)) {
    throw new Error(
      `FORBIDDEN VIDEO TRANSITION: ${currentState} → ${newState}. ` +
      `Allowed transitions: [${allowedTransitions.join(', ')}]`
    );
  }
  
  return true;
}

/**
 * Cross-State Synchronization Validation
 * 
 * Validates that payment, session, and video call states are synchronized
 * according to the Flow Integrity rules.
 * 
 * @param {string} paymentState - Current payment state
 * @param {string} sessionState - Current session state
 * @param {string} videoState - Current video call state (optional)
 * @throws {Error} If states are not synchronized
 * @returns {object} Validation result with required actions
 */
function validateCrossStateSync(paymentState, sessionState, videoState = null) {
  // Payment ↔ Session Synchronization Rules
  const PAYMENT_SESSION_SYNC_RULES = {
    [PAYMENT_STATES.PENDING]: {
      allowedSessionStates: [SESSION_STATES.REQUESTED, SESSION_STATES.APPROVED],
      requiredActions: []
    },
    [PAYMENT_STATES.INITIATED]: {
      allowedSessionStates: [SESSION_STATES.PAYMENT_PENDING],
      requiredActions: []
    },
    [PAYMENT_STATES.CONFIRMED]: {
      allowedSessionStates: [
        SESSION_STATES.PAID, 
        SESSION_STATES.FORMS_REQUIRED, 
        SESSION_STATES.READY,
        SESSION_STATES.IN_PROGRESS,
        SESSION_STATES.COMPLETED
      ],
      requiredActions: []
    },
    [PAYMENT_STATES.FAILED]: {
      allowedSessionStates: [SESSION_STATES.PAYMENT_PENDING, SESSION_STATES.CANCELLED],
      requiredActions: ['ALERT_CLIENT_RETRY']
    },
    [PAYMENT_STATES.REFUNDED]: {
      allowedSessionStates: [SESSION_STATES.CANCELLED, SESSION_STATES.NO_SHOW_THERAPIST],
      requiredActions: []
    },
    [PAYMENT_STATES.CANCELLED]: {
      allowedSessionStates: [SESSION_STATES.CANCELLED],
      requiredActions: []
    }
  };

  // Session ↔ Video Call Synchronization Rules
  const SESSION_VIDEO_SYNC_RULES = {
    [SESSION_STATES.READY]: {
      allowedVideoStates: [VIDEO_STATES.NOT_STARTED, VIDEO_STATES.WAITING_FOR_PARTICIPANTS],
      canJoinCall: true
    },
    [SESSION_STATES.IN_PROGRESS]: {
      allowedVideoStates: [VIDEO_STATES.WAITING_FOR_PARTICIPANTS, VIDEO_STATES.ACTIVE],
      canJoinCall: true
    },
    [SESSION_STATES.COMPLETED]: {
      allowedVideoStates: [VIDEO_STATES.ENDED],
      canJoinCall: false
    },
    [SESSION_STATES.CANCELLED]: {
      allowedVideoStates: [VIDEO_STATES.NOT_STARTED, VIDEO_STATES.ENDED],
      canJoinCall: false
    }
  };

  // Check Payment ↔ Session sync
  const paymentRules = PAYMENT_SESSION_SYNC_RULES[paymentState];
  if (!paymentRules) {
    throw new Error(`Unknown payment state for sync validation: ${paymentState}`);
  }
  
  if (!paymentRules.allowedSessionStates.includes(sessionState)) {
    throw new Error(
      `PAYMENT-SESSION SYNC VIOLATION: payment=${paymentState}, session=${sessionState}. ` +
      `Allowed session states for payment ${paymentState}: [${paymentRules.allowedSessionStates.join(', ')}]`
    );
  }

  // Check Session ↔ Video sync (if video state provided)
  if (videoState) {
    const sessionRules = SESSION_VIDEO_SYNC_RULES[sessionState];
    if (sessionRules && !sessionRules.allowedVideoStates.includes(videoState)) {
      throw new Error(
        `SESSION-VIDEO SYNC VIOLATION: session=${sessionState}, video=${videoState}. ` +
        `Allowed video states for session ${sessionState}: [${sessionRules.allowedVideoStates.join(', ')}]`
      );
    }
  }

  return {
    valid: true,
    requiredActions: paymentRules.requiredActions || []
  };
}

/**
 * Forbidden Transition Checker
 * 
 * Checks for specific forbidden transitions that bypass critical business rules.
 * These are the most dangerous transitions that could leave users in broken states.
 * 
 * @param {string} currentState - Current state
 * @param {string} newState - Desired new state
 * @param {object} context - Additional context (entityType, sessionStatus, etc.)
 * @throws {Error} If transition is forbidden
 * @returns {boolean} True if transition is allowed
 */
function checkForbiddenTransitions(currentState, newState, context = {}) {
  const FORBIDDEN_TRANSITIONS = {
    // Payment bypassing - CRITICAL
    'session.requested → session.ready': 'PAYMENT_REQUIRED',
    'session.approved → session.in_progress': 'PAYMENT_REQUIRED',
    'session.payment_pending → session.ready': 'PAYMENT_NOT_CONFIRMED',
    
    // Form bypassing - CRITICAL
    'session.paid → session.in_progress': 'FORMS_REQUIRED',
    
    // Retroactive changes - CRITICAL
    'session.completed → session.payment_pending': 'RETROACTIVE_PAYMENT_CHANGE',
    'payment.confirmed → payment.pending': 'RETROACTIVE_PAYMENT_CHANGE',
    'session.completed → session.paid': 'RETROACTIVE_STATUS_CHANGE',
    
    // Video access violations - CRITICAL
    'video.not_started → video.active + session.payment_pending': 'UNPAID_VIDEO_ACCESS',
    'video.not_started → video.active + forms.incomplete': 'FORMS_INCOMPLETE_VIDEO_ACCESS'
  };

  const transitionKey = `${context.entityType}.${currentState} → ${context.entityType}.${newState}`;
  
  if (FORBIDDEN_TRANSITIONS[transitionKey]) {
    throw new Error(
      `FORBIDDEN TRANSITION BLOCKED: ${transitionKey}. ` +
      `Reason: ${FORBIDDEN_TRANSITIONS[transitionKey]}`
    );
  }

  // Cross-entity forbidden checks
  if (context.entityType === 'video' && newState === VIDEO_STATES.ACTIVE) {
    if (context.sessionStatus === SESSION_STATES.PAYMENT_PENDING) {
      throw new Error('FORBIDDEN: Cannot start video call with pending payment');
    }
    if (!context.formsComplete) {
      throw new Error('FORBIDDEN: Cannot start video call with incomplete forms');
    }
  }

  return true;
}

/**
 * Comprehensive State Validation
 * 
 * Performs all validation checks for a state transition:
 * 1. Individual state machine validation
 * 2. Cross-state synchronization validation
 * 3. Forbidden transition checks
 * 4. Kill switch enforcement
 * 
 * @param {object} params - Validation parameters
 * @param {string} params.entityType - Type of entity ('payment', 'session', 'video')
 * @param {string} params.currentState - Current state
 * @param {string} params.newState - Desired new state
 * @param {string} params.paymentState - Current payment state (for cross-validation)
 * @param {string} params.sessionState - Current session state (for cross-validation)
 * @param {string} params.videoState - Current video state (optional)
 * @param {boolean} params.formsComplete - Whether forms are complete (optional)
 * @throws {Error} If any validation fails
 * @returns {object} Validation result
 */
function validateStateTransition(params) {
  const {
    entityType,
    currentState,
    newState,
    paymentState,
    sessionState,
    videoState = null,
    formsComplete = true
  } = params;

  // Check if integrity enforcement is disabled (kill switch)
  if (!integrityConfig.isEnforcementEnabled()) {
    integrityConfig.stats.checksSkipped++;
    return {
      valid: true,
      entityType,
      transition: `${currentState} → ${newState}`,
      requiredActions: [],
      enforcementLevel: 'off',
      message: 'Validation skipped - enforcement disabled'
    };
  }

  try {
    // 1. Validate individual state machine transition
    switch (entityType) {
      case 'payment':
        validatePaymentTransition(currentState, newState);
        break;
      case 'session':
        validateSessionTransition(currentState, newState);
        break;
      case 'video':
        validateVideoTransition(currentState, newState);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    // 2. Check forbidden transitions
    checkForbiddenTransitions(currentState, newState, {
      entityType,
      sessionStatus: sessionState,
      formsComplete
    });

    // 3. Validate cross-state synchronization (if we have all required states)
    if (paymentState && sessionState) {
      const syncResult = validateCrossStateSync(paymentState, sessionState, videoState);
      
      return {
        valid: true,
        entityType,
        transition: `${currentState} → ${newState}`,
        requiredActions: syncResult.requiredActions,
        enforcementLevel: integrityConfig.enforcementLevel
      };
    }

    return {
      valid: true,
      entityType,
      transition: `${currentState} → ${newState}`,
      requiredActions: [],
      enforcementLevel: integrityConfig.enforcementLevel
    };

  } catch (error) {
    // Add context to error for better debugging
    error.context = {
      entityType,
      currentState,
      newState,
      paymentState,
      sessionState,
      videoState,
      formsComplete
    };
    
    // Handle violation based on enforcement level (kill switch)
    try {
      integrityConfig.handleViolation(error, error.context);
      
      // If we reach here, violation was handled (warn mode)
      return {
        valid: true,
        entityType,
        transition: `${currentState} → ${newState}`,
        requiredActions: [],
        enforcementLevel: integrityConfig.enforcementLevel,
        warning: error.message
      };
      
    } catch (enforcedError) {
      // Strict mode - re-throw the error
      throw enforcedError;
    }
  }
}

module.exports = {
  validatePaymentTransition,
  validateSessionTransition,
  validateVideoTransition,
  validateCrossStateSync,
  checkForbiddenTransitions,
  validateStateTransition
};