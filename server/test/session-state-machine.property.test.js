/**
 * Property-Based Tests for Session State Machine Validity
 * 
 * Feature: admin-user-management, Property 14: Session State Machine Validity
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 * 
 * For any session, the status transitions SHALL follow the valid state machine:
 * pending → approved → confirmed → in_progress → completed, OR pending → cancelled,
 * OR approved → cancelled, with no invalid transitions allowed.
 */

const fc = require('fast-check');
const { 
  SESSION_STATES, 
  SESSION_TRANSITIONS, 
  SESSION_TERMINAL_STATES,
  SESSION_ACTIVE_STATES 
} = require('../constants/sessionStates');
const { validateSessionTransition } = require('../utils/stateValidation');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('Session State Machine Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 14: Session State Machine Validity', () => {
    /**
     * Feature: admin-user-management, Property 14: Session State Machine Validity
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
     */

    // Get all valid states as an array
    const allStates = Object.values(SESSION_STATES);
    const terminalStates = SESSION_TERMINAL_STATES;
    const activeStates = SESSION_ACTIVE_STATES;

    test('should allow all valid transitions defined in the state machine', () => {
      fc.assert(
        fc.property(
          // Generate a current state that has at least one valid transition
          fc.constantFrom(...allStates.filter(s => SESSION_TRANSITIONS[s]?.length > 0)),
          (currentState) => {
            const allowedTransitions = SESSION_TRANSITIONS[currentState] || [];
            
            // For each allowed transition, validation should pass
            allowedTransitions.forEach(newState => {
              expect(() => validateSessionTransition(currentState, newState)).not.toThrow();
            });
            
            // Property: All defined transitions should be valid
            expect(allowedTransitions.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject all invalid transitions not in the state machine', () => {
      fc.assert(
        fc.property(
          // Generate any current state
          fc.constantFrom(...allStates),
          // Generate any potential new state
          fc.constantFrom(...allStates),
          (currentState, newState) => {
            const allowedTransitions = SESSION_TRANSITIONS[currentState] || [];
            
            if (!allowedTransitions.includes(newState) && currentState !== newState) {
              // Invalid transition should throw an error
              expect(() => validateSessionTransition(currentState, newState)).toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should not allow any transitions from terminal states (Req 9.5, 9.6)', () => {
      fc.assert(
        fc.property(
          // Generate a terminal state
          fc.constantFrom(...terminalStates),
          // Generate any potential new state
          fc.constantFrom(...allStates),
          (terminalState, newState) => {
            // Terminal states should have no allowed transitions
            const allowedTransitions = SESSION_TRANSITIONS[terminalState] || [];
            expect(allowedTransitions).toHaveLength(0);
            
            // Any transition from terminal state should fail (except to itself)
            if (terminalState !== newState) {
              expect(() => validateSessionTransition(terminalState, newState)).toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow session creation with requested status (Req 9.1)', () => {
      fc.assert(
        fc.property(
          // Generate session data
          fc.record({
            clientId: fc.string({ minLength: 24, maxLength: 24 }),
            psychologistId: fc.string({ minLength: 24, maxLength: 24 }),
            dateTime: fc.date({ min: new Date() }),
            sessionType: fc.constantFrom('individual', 'couples', 'family', 'group')
          }),
          (sessionData) => {
            // Property: New sessions should start with 'requested' status
            const initialStatus = SESSION_STATES.REQUESTED;
            
            // Verify requested is a valid initial state
            expect(allStates).toContain(initialStatus);
            
            // Verify requested has valid transitions (can move forward)
            const transitions = SESSION_TRANSITIONS[initialStatus];
            expect(transitions.length).toBeGreaterThan(0);
            expect(transitions).toContain(SESSION_STATES.APPROVED);
            expect(transitions).toContain(SESSION_STATES.CANCELLED);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow therapist approval transition (Req 9.2)', () => {
      fc.assert(
        fc.property(
          // Generate session in requested state
          fc.record({
            status: fc.constant(SESSION_STATES.REQUESTED),
            sessionId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          (session) => {
            // Property: Requested sessions can be approved
            expect(() => 
              validateSessionTransition(session.status, SESSION_STATES.APPROVED)
            ).not.toThrow();
            
            // Verify the transition is in the allowed list
            const allowedFromRequested = SESSION_TRANSITIONS[SESSION_STATES.REQUESTED];
            expect(allowedFromRequested).toContain(SESSION_STATES.APPROVED);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow payment confirmation transition (Req 9.3)', () => {
      fc.assert(
        fc.property(
          // Generate session in payment_pending state
          fc.record({
            status: fc.constant(SESSION_STATES.PAYMENT_PENDING),
            sessionId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          (session) => {
            // Property: Payment pending sessions can transition to paid
            expect(() => 
              validateSessionTransition(session.status, SESSION_STATES.PAID)
            ).not.toThrow();
            
            // Verify the transition is in the allowed list
            const allowedFromPaymentPending = SESSION_TRANSITIONS[SESSION_STATES.PAYMENT_PENDING];
            expect(allowedFromPaymentPending).toContain(SESSION_STATES.PAID);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow session start transition (Req 9.4)', () => {
      fc.assert(
        fc.property(
          // Generate session in ready state
          fc.record({
            status: fc.constant(SESSION_STATES.READY),
            sessionId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          (session) => {
            // Property: Ready sessions can transition to in_progress
            expect(() => 
              validateSessionTransition(session.status, SESSION_STATES.IN_PROGRESS)
            ).not.toThrow();
            
            // Verify the transition is in the allowed list
            const allowedFromReady = SESSION_TRANSITIONS[SESSION_STATES.READY];
            expect(allowedFromReady).toContain(SESSION_STATES.IN_PROGRESS);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow session completion transition (Req 9.5)', () => {
      fc.assert(
        fc.property(
          // Generate session in in_progress state
          fc.record({
            status: fc.constant(SESSION_STATES.IN_PROGRESS),
            sessionId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          (session) => {
            // Property: In-progress sessions can be completed
            expect(() => 
              validateSessionTransition(session.status, SESSION_STATES.COMPLETED)
            ).not.toThrow();
            
            // Verify the transition is in the allowed list
            const allowedFromInProgress = SESSION_TRANSITIONS[SESSION_STATES.IN_PROGRESS];
            expect(allowedFromInProgress).toContain(SESSION_STATES.COMPLETED);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow cancellation from any active state (Req 9.6)', () => {
      fc.assert(
        fc.property(
          // Generate any active (non-terminal) state
          fc.constantFrom(...activeStates),
          (activeState) => {
            const allowedTransitions = SESSION_TRANSITIONS[activeState] || [];
            
            // Property: All active states should allow cancellation
            expect(allowedTransitions).toContain(SESSION_STATES.CANCELLED);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate complete happy path flow', () => {
      fc.assert(
        fc.property(
          // Generate session data
          fc.record({
            sessionId: fc.string({ minLength: 24, maxLength: 24 }),
            clientId: fc.string({ minLength: 24, maxLength: 24 }),
            psychologistId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          (sessionData) => {
            // Property: Complete flow should be valid
            // requested → approved → payment_pending → paid → ready → in_progress → completed
            
            const happyPath = [
              { from: SESSION_STATES.REQUESTED, to: SESSION_STATES.APPROVED },
              { from: SESSION_STATES.APPROVED, to: SESSION_STATES.PAYMENT_PENDING },
              { from: SESSION_STATES.PAYMENT_PENDING, to: SESSION_STATES.PAID },
              { from: SESSION_STATES.PAID, to: SESSION_STATES.READY },
              { from: SESSION_STATES.READY, to: SESSION_STATES.IN_PROGRESS },
              { from: SESSION_STATES.IN_PROGRESS, to: SESSION_STATES.COMPLETED }
            ];
            
            happyPath.forEach(transition => {
              expect(() => 
                validateSessionTransition(transition.from, transition.to)
              ).not.toThrow();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent skipping payment step', () => {
      fc.assert(
        fc.property(
          // Generate session in requested or approved state
          fc.constantFrom(SESSION_STATES.REQUESTED, SESSION_STATES.APPROVED),
          (prePaymentState) => {
            // Property: Cannot skip directly to ready or in_progress without payment
            expect(() => 
              validateSessionTransition(prePaymentState, SESSION_STATES.READY)
            ).toThrow();
            
            expect(() => 
              validateSessionTransition(prePaymentState, SESSION_STATES.IN_PROGRESS)
            ).toThrow();
            
            expect(() => 
              validateSessionTransition(prePaymentState, SESSION_STATES.COMPLETED)
            ).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent backward transitions', () => {
      fc.assert(
        fc.property(
          // Generate a state that is past the initial state
          fc.constantFrom(
            SESSION_STATES.APPROVED,
            SESSION_STATES.PAYMENT_PENDING,
            SESSION_STATES.PAID,
            SESSION_STATES.READY,
            SESSION_STATES.IN_PROGRESS
          ),
          (currentState) => {
            // Property: Cannot go back to requested state
            expect(() => 
              validateSessionTransition(currentState, SESSION_STATES.REQUESTED)
            ).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject invalid state values', () => {
      fc.assert(
        fc.property(
          // Generate invalid state strings
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !allStates.includes(s)),
          fc.constantFrom(...allStates),
          (invalidState, validState) => {
            // Property: Invalid current state should throw
            expect(() => 
              validateSessionTransition(invalidState, validState)
            ).toThrow(/Invalid current session state/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject invalid target state values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allStates),
          // Generate invalid state strings
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !allStates.includes(s)),
          (validState, invalidState) => {
            // Property: Invalid new state should throw
            expect(() => 
              validateSessionTransition(validState, invalidState)
            ).toThrow(/Invalid new session state/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle forms_required path correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.string({ minLength: 24, maxLength: 24 }),
            formsRequired: fc.boolean()
          }),
          (sessionData) => {
            // Property: Paid sessions can go to forms_required or directly to ready
            const allowedFromPaid = SESSION_TRANSITIONS[SESSION_STATES.PAID];
            expect(allowedFromPaid).toContain(SESSION_STATES.FORMS_REQUIRED);
            expect(allowedFromPaid).toContain(SESSION_STATES.READY);
            
            // Forms required can only go to ready
            const allowedFromFormsRequired = SESSION_TRANSITIONS[SESSION_STATES.FORMS_REQUIRED];
            expect(allowedFromFormsRequired).toContain(SESSION_STATES.READY);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle no-show states correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          (sessionData) => {
            // Property: Ready state can transition to no-show states
            const allowedFromReady = SESSION_TRANSITIONS[SESSION_STATES.READY];
            expect(allowedFromReady).toContain(SESSION_STATES.NO_SHOW_CLIENT);
            expect(allowedFromReady).toContain(SESSION_STATES.NO_SHOW_THERAPIST);
            
            // No-show states are terminal
            expect(SESSION_TRANSITIONS[SESSION_STATES.NO_SHOW_CLIENT]).toHaveLength(0);
            expect(SESSION_TRANSITIONS[SESSION_STATES.NO_SHOW_THERAPIST]).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should ensure all states have defined transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allStates),
          (state) => {
            // Property: Every state should have a defined transitions array (even if empty)
            expect(SESSION_TRANSITIONS[state]).toBeDefined();
            expect(Array.isArray(SESSION_TRANSITIONS[state])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate state machine is deterministic', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allStates),
          fc.constantFrom(...allStates),
          (currentState, newState) => {
            const allowedTransitions = SESSION_TRANSITIONS[currentState] || [];
            const isAllowed = allowedTransitions.includes(newState);
            
            // Property: Same input should always produce same result (deterministic)
            // Run validation multiple times and ensure consistent results
            for (let i = 0; i < 3; i++) {
              if (isAllowed) {
                expect(() => validateSessionTransition(currentState, newState)).not.toThrow();
              } else if (currentState !== newState) {
                expect(() => validateSessionTransition(currentState, newState)).toThrow();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
