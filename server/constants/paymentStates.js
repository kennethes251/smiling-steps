/**
 * Payment State Machine Constants
 * 
 * This file defines the canonical payment states and allowed transitions
 * for the Flow Integrity system. These rules are enforced at the API level
 * to prevent invalid state transitions.
 * 
 * CRITICAL: These states are the single source of truth for payment status.
 * All payment logic must use these constants.
 */

const PAYMENT_STATES = {
  PENDING: 'pending',
  INITIATED: 'initiated', 
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

/**
 * Payment State Transitions Matrix
 * 
 * Defines which state transitions are allowed. Any transition not listed
 * here is FORBIDDEN and will be rejected by the validation system.
 */
const PAYMENT_TRANSITIONS = {
  [PAYMENT_STATES.PENDING]: [
    PAYMENT_STATES.INITIATED,
    PAYMENT_STATES.CANCELLED
  ],
  [PAYMENT_STATES.INITIATED]: [
    PAYMENT_STATES.CONFIRMED,
    PAYMENT_STATES.FAILED,
    PAYMENT_STATES.CANCELLED
  ],
  [PAYMENT_STATES.CONFIRMED]: [
    PAYMENT_STATES.REFUNDED
  ],
  [PAYMENT_STATES.FAILED]: [
    PAYMENT_STATES.INITIATED, // retry
    PAYMENT_STATES.CANCELLED
  ],
  [PAYMENT_STATES.REFUNDED]: [], // terminal
  [PAYMENT_STATES.CANCELLED]: [] // terminal
};

/**
 * Terminal States - No further transitions allowed
 */
const PAYMENT_TERMINAL_STATES = [
  PAYMENT_STATES.REFUNDED,
  PAYMENT_STATES.CANCELLED
];

/**
 * Active States - Payment is in progress
 */
const PAYMENT_ACTIVE_STATES = [
  PAYMENT_STATES.PENDING,
  PAYMENT_STATES.INITIATED
];

/**
 * Success States - Payment completed successfully
 */
const PAYMENT_SUCCESS_STATES = [
  PAYMENT_STATES.CONFIRMED
];

/**
 * Failure States - Payment failed or was cancelled
 */
const PAYMENT_FAILURE_STATES = [
  PAYMENT_STATES.FAILED,
  PAYMENT_STATES.CANCELLED
];

module.exports = {
  PAYMENT_STATES,
  PAYMENT_TRANSITIONS,
  PAYMENT_TERMINAL_STATES,
  PAYMENT_ACTIVE_STATES,
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES
};