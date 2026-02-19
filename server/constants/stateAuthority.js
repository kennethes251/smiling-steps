/**
 * State Authority Rules
 * 
 * Defines which entity is authoritative for each type of state transition.
 * This prevents circular logic and race conditions by establishing clear
 * ownership of state changes.
 * 
 * CRITICAL RULE: Only the authoritative entity may initiate downstream state transitions.
 */

const { PAYMENT_STATES } = require('./paymentStates');
const { SESSION_STATES } = require('./sessionStates');
const { VIDEO_STATES } = require('./videoStates');

/**
 * State Authority Matrix
 * 
 * Defines which entity has authority over specific state transitions.
 * This is the single source of truth for state ownership.
 */
const STATE_AUTHORITY = {
  // Payment is authoritative for payment-related session transitions
  PAYMENT_TO_SESSION: {
    authority: 'payment',
    transitions: {
      [PAYMENT_STATES.CONFIRMED]: SESSION_STATES.PAID,
      [PAYMENT_STATES.FAILED]: SESSION_STATES.PAYMENT_PENDING, // stays pending for retry
      [PAYMENT_STATES.REFUNDED]: SESSION_STATES.CANCELLED,
      [PAYMENT_STATES.CANCELLED]: SESSION_STATES.CANCELLED
    }
  },

  // Session is authoritative for video call access
  SESSION_TO_VIDEO: {
    authority: 'session',
    transitions: {
      [SESSION_STATES.READY]: VIDEO_STATES.WAITING_FOR_PARTICIPANTS,
      [SESSION_STATES.IN_PROGRESS]: VIDEO_STATES.ACTIVE,
      [SESSION_STATES.COMPLETED]: VIDEO_STATES.ENDED,
      [SESSION_STATES.CANCELLED]: VIDEO_STATES.ENDED
    }
  },

  // Video is NEVER authoritative for session state changes
  // Video state changes are always downstream from session changes
  VIDEO_TO_SESSION: {
    authority: 'session', // Session remains authoritative
    forbidden: true, // Video cannot change session state
    message: 'Video calls cannot change session state - session is authoritative'
  }
};

/**
 * Authority Validation Rules
 * 
 * These rules enforce the authority matrix and prevent unauthorized
 * cross-entity state changes.
 */
const AUTHORITY_RULES = {
  // Rule 1: Payment Authority
  PAYMENT_AUTHORITY: {
    description: 'Payment is authoritative for session → paid transitions',
    rule: 'Only payment confirmations can mark sessions as paid',
    enforcement: 'Block direct session.status = "paid" without payment.status = "confirmed"'
  },

  // Rule 2: Session Authority  
  SESSION_AUTHORITY: {
    description: 'Session is authoritative for video → joinable transitions',
    rule: 'Only ready/in-progress sessions can allow video calls',
    enforcement: 'Block video joins unless session.status allows it'
  },

  // Rule 3: No Circular Authority
  NO_CIRCULAR_AUTHORITY: {
    description: 'Video is never authoritative for session state',
    rule: 'Video state changes cannot trigger session state changes',
    enforcement: 'Block any video → session state transitions'
  }
};

/**
 * Check if an entity has authority for a specific transition
 * 
 * @param {string} sourceEntity - Entity initiating the change ('payment', 'session', 'video')
 * @param {string} targetEntity - Entity being changed
 * @param {string} sourceState - Current state of source entity
 * @param {string} targetState - Desired state of target entity
 * @returns {object} Authority check result
 */
function checkStateAuthority(sourceEntity, targetEntity, sourceState, targetState) {
  const transitionKey = `${sourceEntity.toUpperCase()}_TO_${targetEntity.toUpperCase()}`;
  const authorityRule = STATE_AUTHORITY[transitionKey];

  if (!authorityRule) {
    return {
      hasAuthority: false,
      reason: `No authority rule defined for ${sourceEntity} → ${targetEntity}`,
      blocked: true
    };
  }

  // Check if transition is forbidden
  if (authorityRule.forbidden) {
    return {
      hasAuthority: false,
      reason: authorityRule.message,
      blocked: true
    };
  }

  // Check if source entity has authority
  if (authorityRule.authority !== sourceEntity) {
    return {
      hasAuthority: false,
      reason: `${targetEntity} state changes must be initiated by ${authorityRule.authority}, not ${sourceEntity}`,
      blocked: true
    };
  }

  // Check if specific transition is allowed
  const allowedTargetState = authorityRule.transitions[sourceState];
  if (allowedTargetState && allowedTargetState !== targetState) {
    return {
      hasAuthority: false,
      reason: `${sourceEntity} state ${sourceState} should transition ${targetEntity} to ${allowedTargetState}, not ${targetState}`,
      blocked: true
    };
  }

  return {
    hasAuthority: true,
    reason: `${sourceEntity} has authority over ${targetEntity} state changes`,
    blocked: false
  };
}

/**
 * Get the authoritative entity for a specific target entity
 * 
 * @param {string} targetEntity - Entity whose authority we want to know
 * @returns {string|null} Authoritative entity or null if none
 */
function getAuthoritativeEntity(targetEntity) {
  for (const [transitionKey, rule] of Object.entries(STATE_AUTHORITY)) {
    if (transitionKey.endsWith(`_TO_${targetEntity.toUpperCase()}`)) {
      return rule.authority;
    }
  }
  return null;
}

/**
 * Validate that only authoritative entities can make state changes
 * 
 * @param {string} initiatingEntity - Entity trying to make the change
 * @param {string} targetEntity - Entity being changed
 * @param {object} context - Additional context for validation
 * @throws {Error} If authority rules are violated
 */
function enforceStateAuthority(initiatingEntity, targetEntity, context = {}) {
  const authoritative = getAuthoritativeEntity(targetEntity);
  
  if (authoritative && authoritative !== initiatingEntity) {
    throw new Error(
      `AUTHORITY VIOLATION: ${targetEntity} state changes must be initiated by ${authoritative}, ` +
      `not ${initiatingEntity}. This prevents circular dependencies and race conditions.`
    );
  }
}

module.exports = {
  STATE_AUTHORITY,
  AUTHORITY_RULES,
  checkStateAuthority,
  getAuthoritativeEntity,
  enforceStateAuthority
};