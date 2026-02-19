# Flow Integrity State Machines - Implementation Reference

## 🎯 Purpose
This document provides **copy-paste state transition tables** for implementing Phase 0 flow integrity. These are the exact rules your code must enforce to prevent users from getting stuck in broken states.

---

## 🔒 PAYMENT STATE MACHINE

### Valid Payment States
```javascript
const PAYMENT_STATES = {
  PENDING: 'pending',
  INITIATED: 'initiated', 
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};
```

### Payment State Transitions (ALLOWED)
```javascript
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
```

### Payment Validation Function (Copy-Paste Ready)
```javascript
function validatePaymentTransition(currentState, newState) {
  const allowedTransitions = PAYMENT_TRANSITIONS[currentState] || [];
  
  if (!allowedTransitions.includes(newState)) {
    throw new Error(
      `Invalid payment transition: ${currentState} → ${newState}. ` +
      `Allowed: [${allowedTransitions.join(', ')}]`
    );
  }
  
  return true;
}
```

---

## 📅 SESSION STATE MACHINE

### Valid Session States
```javascript
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
```

### Session State Transitions (ALLOWED)
```javascript
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
```

### Session Validation Function (Copy-Paste Ready)
```javascript
function validateSessionTransition(currentState, newState) {
  const allowedTransitions = SESSION_TRANSITIONS[currentState] || [];
  
  if (!allowedTransitions.includes(newState)) {
    throw new Error(
      `Invalid session transition: ${currentState} → ${newState}. ` +
      `Allowed: [${allowedTransitions.join(', ')}]`
    );
  }
  
  return true;
}
```

---

## 🎥 VIDEO CALL STATE MACHINE

### Valid Video Call States
```javascript
const VIDEO_STATES = {
  NOT_STARTED: 'not_started',
  WAITING_FOR_PARTICIPANTS: 'waiting_for_participants',
  ACTIVE: 'active',
  ENDED: 'ended',
  FAILED: 'failed'
};
```

### Video Call State Transitions (ALLOWED)
```javascript
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
```

---

## 🔄 CROSS-STATE VALIDATION RULES

### Payment ↔ Session Synchronization Matrix
```javascript
const PAYMENT_SESSION_SYNC_RULES = {
  // [paymentState]: { allowedSessionStates: [], requiredActions: [] }
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
```

### Session ↔ Video Call Synchronization Matrix
```javascript
const SESSION_VIDEO_SYNC_RULES = {
  // [sessionState]: { allowedVideoStates: [], canJoinCall: boolean }
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
```

---

## 🛡️ VALIDATION MIDDLEWARE (Copy-Paste Ready)

### State Transition Middleware
```javascript
function createStateValidationMiddleware(entityType) {
  return async (req, res, next) => {
    try {
      const { currentState, newState } = req.body;
      
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
      
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Invalid state transition',
        message: error.message,
        code: 'INVALID_STATE_TRANSITION'
      });
    }
  };
}
```

### Cross-State Validation Function
```javascript
function validateCrossStateSync(paymentState, sessionState, videoState = null) {
  // Check Payment ↔ Session sync
  const paymentRules = PAYMENT_SESSION_SYNC_RULES[paymentState];
  if (!paymentRules.allowedSessionStates.includes(sessionState)) {
    throw new Error(
      `Payment-Session sync violation: payment=${paymentState}, session=${sessionState}`
    );
  }
  
  // Check Session ↔ Video sync (if video state provided)
  if (videoState) {
    const sessionRules = SESSION_VIDEO_SYNC_RULES[sessionState];
    if (sessionRules && !sessionRules.allowedVideoStates.includes(videoState)) {
      throw new Error(
        `Session-Video sync violation: session=${sessionState}, video=${videoState}`
      );
    }
  }
  
  return {
    valid: true,
    requiredActions: paymentRules.requiredActions || []
  };
}
```

---

## 🔧 ATOMIC UPDATE PATTERNS

### Payment Callback Handler (Idempotent)
```javascript
async function handlePaymentCallback(transactionId, paymentData) {
  // Idempotency check
  const existingCallback = await PaymentCallback.findOne({ transactionId });
  if (existingCallback) {
    console.log(`Duplicate callback ignored: ${transactionId}`);
    return existingCallback.result;
  }
  
  // Atomic transaction
  const session = await db.transaction(async (trx) => {
    // 1. Update payment
    const payment = await Payment.findById(paymentData.paymentId).transacting(trx);
    validatePaymentTransition(payment.status, 'confirmed');
    await payment.update({ status: 'confirmed' }).transacting(trx);
    
    // 2. Update session
    const session = await Session.findById(payment.sessionId).transacting(trx);
    validateSessionTransition(session.status, 'paid');
    await session.update({ status: 'paid' }).transacting(trx);
    
    // 3. Validate cross-state sync
    validateCrossStateSync('confirmed', 'paid');
    
    // 4. Log callback (idempotency record)
    await PaymentCallback.create({
      transactionId,
      paymentId: payment.id,
      sessionId: session.id,
      result: 'success'
    }).transacting(trx);
    
    return session;
  });
  
  return session;
}
```

### Session Status Update (Atomic)
```javascript
async function updateSessionStatus(sessionId, newStatus, reason = null) {
  return await db.transaction(async (trx) => {
    // 1. Get current session with payment
    const session = await Session.findById(sessionId)
      .with('payment')
      .transacting(trx);
    
    // 2. Validate session transition
    validateSessionTransition(session.status, newStatus);
    
    // 3. Validate cross-state sync
    validateCrossStateSync(session.payment.status, newStatus);
    
    // 4. Update session
    await session.update({ 
      status: newStatus,
      statusUpdatedAt: new Date(),
      statusReason: reason
    }).transacting(trx);
    
    // 5. Audit log
    await AuditLog.create({
      entityType: 'session',
      entityId: sessionId,
      action: 'status_change',
      oldValue: session.status,
      newValue: newStatus,
      reason: reason
    }).transacting(trx);
    
    return session;
  });
}
```

---

## 🚨 FORBIDDEN TRANSITIONS (CRITICAL BLOCKS)

### Hard Blocks (System MUST Prevent)
```javascript
const FORBIDDEN_TRANSITIONS = {
  // Payment bypassing
  'session.requested → session.ready': 'PAYMENT_REQUIRED',
  'session.approved → session.in_progress': 'PAYMENT_REQUIRED',
  
  // Form bypassing  
  'session.paid → session.in_progress': 'FORMS_REQUIRED',
  
  // Retroactive changes
  'session.completed → session.payment_pending': 'RETROACTIVE_PAYMENT',
  'payment.confirmed → payment.pending': 'RETROACTIVE_CHANGE',
  
  // Video access violations
  'video.join + session.payment_pending': 'UNPAID_ACCESS',
  'video.join + forms.incomplete': 'FORMS_INCOMPLETE'
};
```

### Forbidden Transition Checker
```javascript
function checkForbiddenTransitions(currentState, newState, context = {}) {
  const transitionKey = `${context.entityType}.${currentState} → ${context.entityType}.${newState}`;
  
  if (FORBIDDEN_TRANSITIONS[transitionKey]) {
    throw new Error(
      `FORBIDDEN TRANSITION: ${transitionKey}. ` +
      `Reason: ${FORBIDDEN_TRANSITIONS[transitionKey]}`
    );
  }
  
  // Cross-entity forbidden checks
  if (context.entityType === 'video' && newState === 'join') {
    if (context.sessionStatus === 'payment_pending') {
      throw new Error('FORBIDDEN: Cannot join video call with pending payment');
    }
    if (!context.formsComplete) {
      throw new Error('FORBIDDEN: Cannot join video call with incomplete forms');
    }
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 0 Priority 1 (Days 1-3): State Validation
- [ ] Copy payment state machine into your codebase
- [ ] Copy session state machine into your codebase  
- [ ] Add state validation middleware to all update endpoints
- [ ] Test forbidden transitions are properly blocked
- [ ] Add state transition logging

### Phase 0 Priority 2 (Days 4-5): Atomic Updates
- [ ] Implement atomic payment callback handler
- [ ] Implement atomic session status updates
- [ ] Add database transaction wrappers
- [ ] Test rollback on partial failures

### Phase 0 Priority 3 (Days 6-7): Idempotency
- [ ] Add idempotency keys to payment callbacks
- [ ] Add duplicate detection for M-Pesa transactions
- [ ] Test safe retry behavior
- [ ] Add idempotency logging

---

## 🎯 SUCCESS CRITERIA

After implementing these state machines, your system will:

✅ **Never allow invalid state transitions**
✅ **Prevent payment bypassing** 
✅ **Block unpaid video call access**
✅ **Handle duplicate callbacks safely**
✅ **Maintain atomic consistency**
✅ **Provide clear error messages**

This is your **system constitution** - every feature must obey these rules.

---

## 🔄 CANONICAL FLOW EXAMPLE

Here's the **Payment → Session → Video Join** reference implementation:

```javascript
// 1. Client initiates payment
await updatePaymentStatus(paymentId, 'initiated');
await updateSessionStatus(sessionId, 'payment_pending');

// 2. M-Pesa callback (idempotent)
await handlePaymentCallback(transactionId, {
  paymentId,
  status: 'confirmed'
});
// → payment: 'confirmed', session: 'paid'

// 3. Forms completion
await updateSessionStatus(sessionId, 'forms_required');
await completeFormsAndUpdateSession(sessionId);
// → session: 'ready'

// 4. Video call join (with validation)
const canJoin = validateVideoCallAccess(sessionId);
if (canJoin) {
  await startVideoCall(sessionId);
  await updateSessionStatus(sessionId, 'in_progress');
}
```

**This pattern becomes your template for all other flows.**