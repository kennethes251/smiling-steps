# Flow Integrity Implementation - Task Progress Tracker

## 🎯 **2-Week Sprint Overview**
**Goal:** Implement end-to-end flow integrity to prevent users from getting stuck in broken states.

**Success Criteria:**
- ✅ System cannot enter illegal states
- ✅ Payment and session states always agree  
- ✅ Double callbacks handled safely
- ✅ Predictable failure recovery
- ✅ Real-time monitoring of integrity violations

---

## 🔴 **PRIORITY 1: State Validation + Forbidden Transitions (Days 1-3)**
*Critical Foundation - Maximum Risk Reduction*

### Day 1: Core State Machines
- [ ] **1.1** Copy payment state machine constants into codebase
  - [ ] Create `server/constants/paymentStates.js`
  - [ ] Define PAYMENT_STATES enum
  - [ ] Define PAYMENT_TRANSITIONS mapping
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 15-35

- [ ] **1.2** Copy session state machine constants into codebase  
  - [ ] Create `server/constants/sessionStates.js`
  - [ ] Define SESSION_STATES enum
  - [ ] Define SESSION_TRANSITIONS mapping
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 55-95

- [ ] **1.3** Copy video call state machine constants into codebase
  - [ ] Create `server/constants/videoStates.js` 
  - [ ] Define VIDEO_STATES enum
  - [ ] Define VIDEO_TRANSITIONS mapping
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 105-125

### Day 2: Validation Functions
- [ ] **2.1** Implement payment state validation
  - [ ] Create `server/utils/stateValidation.js`
  - [ ] Add `validatePaymentTransition()` function
  - [ ] Add comprehensive error messages
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 40-50

- [ ] **2.2** Implement session state validation
  - [ ] Add `validateSessionTransition()` function
  - [ ] Add comprehensive error messages
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 100-110

- [ ] **2.3** Implement cross-state synchronization validation
  - [ ] Add `validateCrossStateSync()` function
  - [ ] Implement payment-session sync rules
  - [ ] Implement session-video sync rules
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 130-180

### Day 3: Middleware Integration
- [ ] **3.1** Create state validation middleware
  - [ ] Create `server/middleware/stateValidation.js`
  - [ ] Implement `createStateValidationMiddleware()` 
  - [ ] Add proper error responses (400 status codes)
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 185-205

- [ ] **3.2** Add middleware to payment endpoints
  - [ ] Update `server/routes/mpesa.js` 
  - [ ] Add validation to payment callback endpoint
  - [ ] Add validation to payment initiation endpoint
  - **Test:** Try invalid payment transitions, verify rejection

- [ ] **3.3** Add middleware to session endpoints  
  - [ ] Update `server/routes/sessions.js`
  - [ ] Add validation to session status update endpoints
  - [ ] Add validation to session creation endpoints
  - **Test:** Try forbidden transitions, verify rejection

**🎯 End of Day 3 Checkpoint:**
- System literally cannot enter illegal states
- All forbidden transitions are blocked server-side
- Clear error messages for invalid state changes

---

## 🔴 **PRIORITY 2: Atomic State Updates (Days 4-5)**
*Prevent Partial Truth - Money and Therapy Always Agree*

### Day 4: Database Transaction Wrappers
- [ ] **4.1** Create atomic update utilities
  - [ ] Create `server/utils/atomicUpdates.js`
  - [ ] Add database transaction wrapper functions
  - [ ] Add rollback logic for failed operations
  - **Pattern:** All payment+session updates must be atomic

- [ ] **4.2** Implement atomic payment callback handler
  - [ ] Update payment callback processing
  - [ ] Wrap payment confirmation + session update in single transaction
  - [ ] Add comprehensive error handling and rollback
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 210-240

- [ ] **4.3** Test atomic payment processing
  - [ ] Create test for successful payment callback
  - [ ] Create test for failed payment callback (rollback)
  - [ ] Verify no partial state updates occur
  - **Test:** Simulate database failure mid-transaction

### Day 5: Session Status Updates
- [ ] **5.1** Implement atomic session status updates
  - [ ] Create `updateSessionStatus()` function with transactions
  - [ ] Include audit logging in same transaction
  - [ ] Add cross-state validation before commit
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 245-275

- [ ] **5.2** Update all session status change points
  - [ ] Session approval → payment pending
  - [ ] Payment confirmed → session paid  
  - [ ] Forms completed → session ready
  - [ ] Video started → session in progress
  - **Verify:** Each change validates and logs atomically

- [ ] **5.3** Test atomic session updates
  - [ ] Test successful status transitions
  - [ ] Test failed transitions with rollback
  - [ ] Verify audit logs are consistent
  - **Test:** Database connection loss during update

**🎯 End of Day 5 Checkpoint:**
- No partial truths possible
- Payment and session states always synchronized
- All state changes are atomic and logged

---

## 🔴 **PRIORITY 3: Idempotency Layer (Days 6-7)**
*Safe Retries - Double Callbacks ≠ Double Sessions*

### Day 6: Payment Idempotency
- [ ] **6.1** Create idempotency tracking
  - [ ] Create `PaymentCallback` model/collection
  - [ ] Add transaction ID tracking
  - [ ] Add callback result storage
  - **Purpose:** Detect and ignore duplicate M-Pesa callbacks

- [ ] **6.2** Implement idempotent payment processing
  - [ ] Check for existing callback before processing
  - [ ] Return cached result for duplicates
  - [ ] Log duplicate attempts for monitoring
  - **Files:** Reference `FLOW_INTEGRITY_STATE_MACHINES.md` lines 210-240

- [ ] **6.3** Test payment idempotency
  - [ ] Send same callback twice, verify single processing
  - [ ] Test with different transaction IDs
  - [ ] Verify duplicate detection logging
  - **Test:** Rapid duplicate callback simulation

### Day 7: General Idempotency Patterns
- [ ] **7.1** Add idempotency to form submissions
  - [ ] Create form submission tracking
  - [ ] Prevent duplicate form processing
  - [ ] Return cached results for duplicates
  - **Pattern:** Safe retry for network failures

- [ ] **7.2** Add idempotency to video call joins
  - [ ] Allow multiple join attempts safely
  - [ ] Return existing session for duplicates
  - [ ] Handle connection retry scenarios
  - **Pattern:** Network resilience

- [ ] **7.3** Create idempotency middleware
  - [ ] Generic idempotency key handling
  - [ ] Configurable for different endpoints
  - [ ] Automatic duplicate detection
  - **Usage:** Apply to critical state-changing endpoints

**🎯 End of Day 7 Checkpoint:**
- External system retries handled safely
- Double callbacks cannot create double sessions
- All critical operations are idempotent

---

## 🟠 **PRIORITY 4: Failure Recovery Paths (Days 8-10)**
*Predictable Endings to Messy Situations*

### Day 8: Payment Failure Recovery
- [ ] **8.1** Implement delayed payment detection
  - [ ] Create background job to check pending payments >5 minutes
  - [ ] Auto-alert admins for delayed callbacks
  - [ ] Provide manual verification interface
  - **Files:** Reference teletherapy spec Phase 0 tasks 0.6.1

- [ ] **8.2** Implement payment failure handling
  - [ ] Detect invalid callback signatures
  - [ ] Log security incidents
  - [ ] Provide retry mechanisms for clients
  - **Recovery:** Clear escalation paths for each failure type

- [ ] **8.3** Test payment failure scenarios
  - [ ] Simulate delayed callbacks
  - [ ] Test invalid signature handling
  - [ ] Verify admin alerting works
  - **Test:** Various M-Pesa failure modes

### Day 9: Session Failure Recovery
- [ ] **9.1** Implement no-show detection
  - [ ] Auto-detect therapist no-show (15 min after start)
  - [ ] Auto-detect client no-show (15 min after start)
  - [ ] Trigger appropriate refund/policy actions
  - **Files:** Reference teletherapy spec Phase 0 tasks 0.6.2

- [ ] **9.2** Implement video call failure recovery
  - [ ] Detect video call technical failures
  - [ ] Provide phone backup options
  - [ ] Log technical details for debugging
  - **Recovery:** Graceful degradation to phone calls

- [ ] **9.3** Test session failure scenarios
  - [ ] Simulate no-show scenarios
  - [ ] Test video call failures
  - [ ] Verify recovery mechanisms work
  - **Test:** Various session failure modes

### Day 10: System Failure Recovery
- [ ] **10.1** Implement database failure recovery
  - [ ] Queue operations during database outages
  - [ ] Automatic retry with exponential backoff
  - [ ] Alert on persistent failures
  - **Files:** Reference teletherapy spec Phase 0 tasks 0.6.4

- [ ] **10.2** Implement email service failure recovery
  - [ ] Queue emails during service outages
  - [ ] Retry delivery every 15 minutes for 24 hours
  - [ ] Show "email pending" status to users
  - **Recovery:** Graceful degradation of notifications

- [ ] **10.3** Test system failure scenarios
  - [ ] Simulate database connection loss
  - [ ] Test email service outages
  - [ ] Verify queuing and retry mechanisms
  - **Test:** Infrastructure failure resilience

**🎯 End of Day 10 Checkpoint:**
- Predictable recovery from all failure modes
- No user gets permanently stuck
- Clear escalation paths for manual intervention

---

## 🟠 **PRIORITY 5: Monitoring & Alerting (Days 11-12)**
*Know When Something Breaks Before Users Complain*

### Day 11: Integrity Monitoring
- [ ] **11.1** Create state transition logging
  - [ ] Log all state changes with before/after values
  - [ ] Include user ID, timestamp, and reason
  - [ ] Store in searchable audit log
  - **Files:** Reference teletherapy spec Phase 0 tasks 0.8.2

- [ ] **11.2** Create integrity violation detection
  - [ ] Background job to scan for state inconsistencies
  - [ ] Detect payment-session sync violations
  - [ ] Flag sessions stuck in transitional states
  - **Purpose:** Proactive problem detection

- [ ] **11.3** Test integrity monitoring
  - [ ] Verify all state changes are logged
  - [ ] Test violation detection accuracy
  - [ ] Confirm log searchability
  - **Test:** Monitoring system effectiveness

### Day 12: Alerting System
- [ ] **12.1** Create real-time alerts
  - [ ] Alert on state transition violations
  - [ ] Alert on stuck payments (>30 minutes)
  - [ ] Alert on sessions stuck in progress (>2 hours)
  - **Files:** Reference teletherapy spec Phase 0 tasks 0.8.1

- [ ] **12.2** Create admin dashboard
  - [ ] Display integrity health metrics
  - [ ] Show recent state transition violations
  - [ ] Provide manual intervention tools
  - **Purpose:** Admin visibility and control

- [ ] **12.3** Test alerting system
  - [ ] Trigger various alert conditions
  - [ ] Verify alert delivery mechanisms
  - [ ] Test admin dashboard functionality
  - **Test:** End-to-end alerting workflow

**🎯 End of Day 12 Checkpoint:**
- Real-time visibility into system integrity
- Proactive problem detection and alerting
- Admin tools for manual intervention

---

## 🟢 **PRIORITY 6: Non-Happy Path Polish (Days 13-14)**
*Confidence Polish - Handle Edge Cases Gracefully*

### Day 13: User Behavior Edge Cases
- [ ] **13.1** Handle page refresh during payment
  - [ ] Detect existing payment attempts
  - [ ] Resume from current payment state
  - [ ] Update UI accordingly
  - **Files:** Reference teletherapy spec Phase 0 tasks 0.7.1

- [ ] **13.2** Handle late session joins
  - [ ] Allow join but adjust billing
  - [ ] Mark session as "partial" with actual duration
  - [ ] Provide therapist options for early end/continue
  - **Recovery:** Flexible session management

- [ ] **13.3** Handle session overtime
  - [ ] Track actual session duration
  - [ ] Calculate overtime charges
  - [ ] Require client approval for extra charges
  - **Recovery:** Fair billing for extended sessions

### Day 14: Final Integration & Testing
- [ ] **14.1** End-to-end flow testing
  - [ ] Test complete payment → session → video flow
  - [ ] Verify all integrity rules are enforced
  - [ ] Test failure recovery mechanisms
  - **Test:** Canonical flow implementation

- [ ] **14.2** Performance impact assessment
  - [ ] Measure validation overhead
  - [ ] Optimize critical path performance
  - [ ] Ensure <100ms impact on API responses
  - **Verify:** Integrity doesn't hurt performance

- [ ] **14.3** Documentation and handoff
  - [ ] Document all integrity rules
  - [ ] Create troubleshooting guide
  - [ ] Train team on monitoring tools
  - **Deliverable:** Operational readiness

**🎯 End of Day 14 Checkpoint:**
- Complete flow integrity implementation
- All edge cases handled gracefully
- System ready for production hardening

---

## 📊 **PROGRESS TRACKING**

### Overall Progress: ⬜⬜⬜⬜⬜⬜ (0/6 priorities complete)

**Priority Status:**
- 🔴 P1 - State Validation: ⬜⬜⬜ (0/3 days)
- 🔴 P2 - Atomic Updates: ⬜⬜ (0/2 days)  
- 🔴 P3 - Idempotency: ⬜⬜ (0/2 days)
- 🟠 P4 - Failure Recovery: ⬜⬜⬜ (0/3 days)
- 🟠 P5 - Monitoring: ⬜⬜ (0/2 days)
- 🟢 P6 - Edge Cases: ⬜⬜ (0/2 days)

### Key Milestones:
- [ ] **Day 3:** System cannot enter illegal states
- [ ] **Day 5:** Payment and session always synchronized  
- [ ] **Day 7:** Double callbacks handled safely
- [ ] **Day 10:** Predictable failure recovery
- [ ] **Day 12:** Real-time integrity monitoring
- [ ] **Day 14:** Production-ready flow integrity

---

## 🚨 **CRITICAL SUCCESS METRICS**

After completing this task list, your system will have:

✅ **Zero Invalid State Transitions**
- Forbidden transitions blocked at API level
- Clear error messages for invalid requests
- Comprehensive state validation

✅ **Atomic Consistency**  
- Payment and session states always agree
- No partial updates possible
- Transaction rollback on failures

✅ **Idempotent Operations**
- Safe retry for all critical operations
- Duplicate detection and handling
- External system resilience

✅ **Predictable Recovery**
- Defined recovery path for every failure mode
- Automatic escalation where appropriate
- Manual intervention tools for admins

✅ **Real-time Monitoring**
- Proactive integrity violation detection
- Admin alerts for critical issues
- Comprehensive audit logging

**This is your path to a production-grade system that users can trust with money and mental health.**

---

## 📝 **DAILY STANDUP FORMAT**

Use this format for daily progress updates:

**Yesterday:** [Completed tasks with checkmarks]
**Today:** [Tasks in progress]  
**Blockers:** [Any issues preventing progress]
**Integrity Status:** [Current system safety level]

**Example:**
- Yesterday: ✅ 1.1, ✅ 1.2, ✅ 1.3 (All state machines implemented)
- Today: Working on 2.1, 2.2 (Validation functions)
- Blockers: None
- Integrity Status: 🟡 Basic validation in place, atomic updates pending