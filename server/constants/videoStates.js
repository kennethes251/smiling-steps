/**
 * Video Call State Machine Constants
 * 
 * This file defines the canonical video call states and allowed transitions
 * for the Flow Integrity system. These rules are enforced at the API level
 * to prevent invalid state transitions.
 * 
 * CRITICAL: These states are the single source of truth for video call status.
 * All video call logic must use these constants.
 */

const VIDEO_STATES = {
  NOT_STARTED: 'not_started',
  WAITING_FOR_PARTICIPANTS: 'waiting_for_participants',
  ACTIVE: 'active',
  ENDED: 'ended',
  FAILED: 'failed'
};

/**
 * Video Call State Transitions Matrix
 * 
 * Defines which state transitions are allowed. Any transition not listed
 * here is FORBIDDEN and will be rejected by the validation system.
 */
const VIDEO_TRANSITIONS = {
  [VIDEO_STATES.NOT_STARTED]: [
    VIDEO_STATES.WAITING_FOR_PARTICIPANTS
  ],
  [VIDEO_STATES.WAITING_FOR_PARTICIPANTS]: [
    VIDEO_STATES.ACTIVE,
    VIDEO_STATES.FAILED,
    VIDEO_STATES.ENDED // if cancelled before starting
  ],
  [VIDEO_STATES.ACTIVE]: [
    VIDEO_STATES.ENDED,
    VIDEO_STATES.FAILED
  ],
  [VIDEO_STATES.ENDED]: [], // terminal
  [VIDEO_STATES.FAILED]: [
    VIDEO_STATES.WAITING_FOR_PARTICIPANTS // retry
  ]
};

/**
 * Terminal States - No further transitions allowed
 */
const VIDEO_TERMINAL_STATES = [
  VIDEO_STATES.ENDED
];

/**
 * Active States - Video call is in progress
 */
const VIDEO_ACTIVE_STATES = [
  VIDEO_STATES.WAITING_FOR_PARTICIPANTS,
  VIDEO_STATES.ACTIVE
];

/**
 * Joinable States - Participants can join the call
 */
const VIDEO_JOINABLE_STATES = [
  VIDEO_STATES.WAITING_FOR_PARTICIPANTS,
  VIDEO_STATES.ACTIVE
];

/**
 * Retry States - Can attempt to restart
 */
const VIDEO_RETRY_STATES = [
  VIDEO_STATES.FAILED
];

module.exports = {
  VIDEO_STATES,
  VIDEO_TRANSITIONS,
  VIDEO_TERMINAL_STATES,
  VIDEO_ACTIVE_STATES,
  VIDEO_JOINABLE_STATES,
  VIDEO_RETRY_STATES
};