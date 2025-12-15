# Booking Status Enum Fixed

## Problem
Session booking was failing with validation error:
```
Session validation failed: status: `Pending Approval` is not a valid enum value for path `status`.
```

## Root Cause
The Session model's status enum didn't include all the statuses used by the booking workflow. The model only had:
- 'Pending', 'Booked', 'In Progress', 'Completed', 'Cancelled'

But the booking routes were trying to use:
- 'Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'Declined'

## Solution
Updated `server/models/Session.js` to include all required statuses and fields:

### 1. Expanded Status Enum
```javascript
status: {
  type: String,
  enum: [
    'Pending',
    'Pending Approval',  // ← Added
    'Approved',          // ← Added
    'Payment Submitted', // ← Added
    'Confirmed',         // ← Added
    'Booked',
    'In Progress',
    'Completed',
    'Cancelled',
    'Declined'           // ← Added
  ],
  default: 'Pending',
}
```

### 2. Added Missing Fields
- `sessionRate`: Number - The rate for this specific session
- `paymentProof`: Object with transactionCode, screenshot, submittedAt
- `approvedBy`: Reference to User who approved
- `approvedAt`: Date of approval
- `declineReason`: String explaining why session was declined
- `paymentVerifiedBy`: Reference to User who verified payment

### 3. Expanded Payment Status Enum
Added 'Submitted' and 'Verified' to payment status options:
```javascript
paymentStatus: {
  type: String,
  enum: ['Pending', 'Submitted', 'Verified', 'Processing', 'Paid', 'Confirmed', 'Failed'],
  default: 'Pending'
}
```

## Booking Workflow Statuses

### Client Perspective:
1. **Pending Approval** - Client submits booking request
2. **Approved** - Psychologist approves, client receives payment instructions
3. **Payment Submitted** - Client submits payment proof
4. **Confirmed** - Payment verified, session confirmed
5. **In Progress** - Session is happening
6. **Completed** - Session finished

### Alternative Paths:
- **Declined** - Psychologist declines the booking
- **Cancelled** - Either party cancels

## Testing
Restart your server and try booking a session again. The validation error should be resolved.

## Status
✅ Session model updated with all required statuses
✅ All missing fields added
✅ Ready for testing
