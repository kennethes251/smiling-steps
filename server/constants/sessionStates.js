/**
 * Session State Machine Constants
 * 
 * This file defines the canonical session states and allowed transitions
 * for the Flow Integrity system. These rules are enforced at the API level
 * to prevent invalid state transitions.
 * 
 * CRITICAL: These states are the single source of truth for session status.
 * All session logic must use these constants.
 */

const SESSION_STATES = {
  REQUESTED: 'requested',
  APPROVED: 'approved', 
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  FORMS_REQUIRED: 'forms_required',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW_CLIENT: 'no_show_client',
  NO_SHOW_THERAPIST: 'no_show_therapist'
};

/**
 * Session State Transitions Matrix
 * 
 * Defines which state transitions are allowed. Any transition not listed
 * here is FORBIDDEN and will be rejected by the validation system.
 */
const SESSION_TRANSITIONS = {
  [SESSION_STATES.REQUESTED]: [
    SESSION_STATES.APPROVED,
    SESSION_STATES.CANCELLED
  ],
  [SESSION_STATES.APPROVED]: [
    SESSION_STATES.PAYMENT_PENDING,
    SESSION_STATES.CANCELLED
  ],
  [SESSION_STATES.PAYMENT_PENDING]: [
    SESSION_STATES.PAID,
    SESSION_STATES.CANCELLED
  ],
  [SESSION_STATES.PAID]: [
    SESSION_STATES.FORMS_REQUIRED,
    SESSION_STATES.READY, // if no forms needed
    SESSION_STATES.CANCELLED
  ],
  [SESSION_STATES.FORMS_REQUIRED]: [
    SESSION_STATES.READY,
    SESSION_STATES.CANCELLED
  ],
  [SESSION_STATES.READY]: [
    SESSION_STATES.IN_PROGRESS,
    SESSION_STATES.NO_SHOW_CLIENT,
    SESSION_STATES.NO_SHOW_THERAPIST,
    SESSION_STATES.CANCELLED
  ],
  [SESSION_STATES.IN_PROGRESS]: [
    SESSION_STATES.COMPLETED,
    SESSION_STATES.CANCELLED // mid-session cancellation
  ],
  [SESSION_STATES.COMPLETED]: [], // terminal
  [SESSION_STATES.CANCELLED]: [], // terminal
  [SESSION_STATES.NO_SHOW_CLIENT]: [], // terminal
  [SESSION_STATES.NO_SHOW_THERAPIST]: [] // terminal
};

/**
 * Terminal States - No further transitions allowed
 */
const SESSION_TERMINAL_STATES = [
  SESSION_STATES.COMPLETED,
  SESSION_STATES.CANCELLED,
  SESSION_STATES.NO_SHOW_CLIENT,
  SESSION_STATES.NO_SHOW_THERAPIST
];

/**
 * Active States - Session is in progress or scheduled
 */
const SESSION_ACTIVE_STATES = [
  SESSION_STATES.REQUESTED,
  SESSION_STATES.APPROVED,
  SESSION_STATES.PAYMENT_PENDING,
  SESSION_STATES.PAID,
  SESSION_STATES.FORMS_REQUIRED,
  SESSION_STATES.READY,
  SESSION_STATES.IN_PROGRESS
];

/**
 * Pre-Payment States - Payment not yet confirmed
 */
const SESSION_PRE_PAYMENT_STATES = [
  SESSION_STATES.REQUESTED,
  SESSION_STATES.APPROVED,
  SESSION_STATES.PAYMENT_PENDING
];

/**
 * Post-Payment States - Payment confirmed
 */
const SESSION_POST_PAYMENT_STATES = [
  SESSION_STATES.PAID,
  SESSION_STATES.FORMS_REQUIRED,
  SESSION_STATES.READY,
  SESSION_STATES.IN_PROGRESS,
  SESSION_STATES.COMPLETED
];

/**
 * Video Call Eligible States - Can join video call
 */
const SESSION_VIDEO_ELIGIBLE_STATES = [
  SESSION_STATES.READY,
  SESSION_STATES.IN_PROGRESS
];

module.exports = {
  SESSION_STATES,
  SESSION_TRANSITIONS,
  SESSION_TERMINAL_STATES,
  SESSION_ACTIVE_STATES,
  SESSION_PRE_PAYMENT_STATES,
  SESSION_POST_PAYMENT_STATES,
  SESSION_VIDEO_ELIGIBLE_STATES
};