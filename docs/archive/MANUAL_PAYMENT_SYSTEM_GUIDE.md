# Manual Payment Verification System

A simple Till Number + Confirmation Code payment system for Smiling Steps that doesn't require external API integration.

## Overview

This system allows clients to pay via M-Pesa to a Till number and submit their confirmation code for admin verification. It's simpler than full M-Pesa API integration and provides good fraud protection.

## How It Works

### Payment Flow

1. **Session Approved** → Psychologist approves the booking request
2. **Client Gets Instructions** → Client sees Till number and amount to pay
3. **Client Pays via M-Pesa** → Client pays to Till number on their phone
4. **Client Submits Code** → Client enters M-Pesa confirmation code in the app
5. **Admin Verifies** → Admin checks code against M-Pesa statement
6. **Session Confirmed** → Payment verified, session is confirmed

### Fraud Prevention

- M-Pesa confirmation codes are unique and can only be used once
- System checks for duplicate codes across all sessions
- Admin manually verifies against actual M-Pesa statement
- Audit trail logs all payment submissions and verifications

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Till Number for M-Pesa payments
MPESA_TILL_NUMBER=5678901

# Business name shown to clients
BUSINESS_NAME=Smiling Steps

# Default session rate in KES
DEFAULT_SESSION_RATE=2500

# Optional: Use Paybill instead of Till
# MPESA_PAYBILL_NUMBER=123456
# MPESA_ACCOUNT_NUMBER=SmilingSessions
```

## API Endpoints

### Client Endpoints

#### Get Payment Instructions
```
GET /api/manual-payments/instructions/:sessionId
Authorization: x-auth-token (client)

Response:
{
  "success": true,
  "sessionId": "...",
  "bookingReference": "SS-ABC123",
  "psychologistName": "Dr. Jane",
  "sessionDate": "2026-01-15T10:00:00Z",
  "amount": 2500,
  "paymentInstructions": {
    "type": "till",
    "tillNumber": "5678901",
    "amount": 2500,
    "businessName": "Smiling Steps",
    "instructions": "1. Go to M-Pesa..."
  }
}
```

#### Submit Payment Code
```
POST /api/manual-payments/submit-code/:sessionId
Authorization: x-auth-token (client)
Body: { "confirmationCode": "RKJ7ABCD12" }

Response:
{
  "success": true,
  "msg": "Payment confirmation code submitted successfully...",
  "session": { ... }
}
```

### Admin Endpoints

#### Get Pending Payments
```
GET /api/manual-payments/pending
Authorization: x-auth-token (admin)

Response:
{
  "success": true,
  "count": 3,
  "pendingPayments": [
    {
      "_id": "...",
      "bookingReference": "SS-ABC123",
      "client": { "name": "John", "email": "...", "phone": "..." },
      "psychologist": { "name": "Dr. Jane" },
      "amount": 2500,
      "confirmationCode": "RKJ7ABCD12",
      "submittedAt": "2026-01-01T10:00:00Z"
    }
  ]
}
```

#### Verify Payment
```
POST /api/manual-payments/verify/:sessionId
Authorization: x-auth-token (admin)
Body: { "notes": "Verified against statement dated..." }

Response:
{
  "success": true,
  "msg": "Payment verified and session confirmed",
  "session": { ... }
}
```

#### Reject Payment
```
POST /api/manual-payments/reject/:sessionId
Authorization: x-auth-token (admin)
Body: { "reason": "Code not found in M-Pesa statement" }

Response:
{
  "success": true,
  "msg": "Payment rejected. Client can submit a new code.",
  "session": { ... }
}
```

#### Get Payment Stats
```
GET /api/manual-payments/stats
Authorization: x-auth-token (admin)

Response:
{
  "success": true,
  "stats": {
    "pendingVerification": 3,
    "verifiedToday": 5,
    "verifiedThisMonth": 42,
    "totalVerified": 156,
    "totalRevenue": 390000
  }
}
```

## Frontend Components

### ManualPaymentSubmit
Client component for viewing payment instructions and submitting confirmation code.

```jsx
import ManualPaymentSubmit from './components/ManualPaymentSubmit';

<ManualPaymentSubmit 
  sessionId={session._id}
  onPaymentSubmitted={(session) => console.log('Submitted!')}
  onClose={() => setShowPayment(false)}
/>
```

### PaymentVerificationPanel
Admin dashboard component for verifying pending payments.

```jsx
import PaymentVerificationPanel from './components/dashboards/PaymentVerificationPanel';

// Already integrated into AdminDashboard
<PaymentVerificationPanel />
```

## M-Pesa Code Format

M-Pesa confirmation codes follow this format:
- 10 characters total
- Starts with a letter
- Mix of letters and numbers
- Example: `RKJ7ABCD12`

The system validates this format before accepting submissions.

## Admin Verification Process

1. Log into Admin Dashboard
2. Find the Payment Verification panel
3. See list of pending payments with:
   - Booking reference
   - Client name and contact
   - Amount
   - M-Pesa confirmation code
   - Submission time
4. Open your M-Pesa statement/app
5. Search for the confirmation code
6. Verify amount matches
7. Click "Verify" or "Reject" with reason

## Session Status Flow

```
Pending → Approved → Payment Submitted → Confirmed → In Progress → Completed
                          ↓
                    (if rejected)
                          ↓
                      Approved (client can resubmit)
```

## Files Created/Modified

### New Files
- `server/config/paymentConfig.js` - Payment configuration
- `server/routes/manualPayments.js` - API routes
- `client/src/components/ManualPaymentSubmit.js` - Client payment UI
- `client/src/components/dashboards/PaymentVerificationPanel.js` - Admin verification UI

### Modified Files
- `server/index.js` - Route registration
- `server/utils/notificationService.js` - Payment verification email
- `client/src/components/dashboards/AdminDashboard.js` - Added verification panel

## Testing

To test the system:

1. Create a session booking as a client
2. Have psychologist approve the session
3. As client, view payment instructions
4. Submit a test confirmation code (e.g., "TEST123456")
5. As admin, verify or reject the payment

## Benefits Over M-Pesa API

1. **No API credentials needed** - Works immediately
2. **No callback URL required** - No server configuration
3. **Simple to understand** - Clear manual process
4. **Audit trail** - All actions logged
5. **Flexible** - Works with any Till/Paybill number
6. **Reliable** - No API downtime issues

## Future Enhancements

- SMS notification when payment is verified
- Automatic reminder for pending verifications
- Bulk verification for multiple payments
- Export verification reports
- Integration with accounting software
