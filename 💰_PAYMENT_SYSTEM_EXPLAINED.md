# Payment System Structure 💰

## Current Payment Flow

Your app uses a **manual payment verification system** with M-Pesa as the payment method.

### Step-by-Step Flow

#### 1. **Client Books Session**
```
Client → Booking Page → Select Psychologist, Date, Time, Type
Status: "Pending Approval"
```

#### 2. **Psychologist Approves**
```
Psychologist Dashboard → Reviews Request → Clicks "Approve"
- Session status changes to: "Approved"
- Payment instructions generated with:
  - Amount (session rate)
  - M-Pesa number
  - Psychologist name
  - Reference instructions
```

**Example Payment Instructions:**
```
Send KSh 2500 to M-Pesa: 0707439299 (Nancy)
Use your name as reference.
```

#### 3. **Client Makes Payment (Outside App)**
```
Client → M-Pesa App → Sends money to psychologist
Client → Dashboard → Clicks "I've Paid" button
Status: "Payment Submitted"
```

#### 4. **Psychologist Verifies Payment**
```
Psychologist → Checks M-Pesa → Confirms payment received
Psychologist Dashboard → Clicks "Verify Payment"
Status: "Confirmed"
```

#### 5. **Session Happens**
```
Both parties see session in "Confirmed Sessions"
On session date → Can start video call
After session → Psychologist marks as complete
```

## Payment Data Structure

### Session Model Fields
```javascript
{
  price: Number,              // Total amount
  sessionRate: Number,        // Rate per session
  paymentStatus: String,      // 'Pending', 'Paid', 'Verified'
  paymentMethod: String,      // 'M-Pesa', 'Bank Transfer', etc.
  paymentProof: String,       // Optional: Screenshot/reference
  paymentInstructions: String, // Generated instructions
  paymentVerifiedBy: ObjectId, // Psychologist who verified
  paymentVerifiedAt: Date     // When verified
}
```

### Psychologist Payment Info
```javascript
psychologistDetails: {
  paymentInfo: {
    mpesaNumber: String,  // e.g., "0707439299"
    mpesaName: String,    // e.g., "Nancy Wanjiru"
    bankAccount: String,  // Optional
    bankName: String      // Optional
  },
  sessionRate: Number,    // Default rate
  rates: {                // Rates by session type
    Individual: { amount: 2500, duration: 60 },
    Couples: { amount: 3500, duration: 75 },
    Family: { amount: 4500, duration: 90 },
    Group: { amount: 1500, duration: 90 }
  }
}
```

## Payment System Type

### Current: **Manual Verification**
✅ **Pros:**
- Simple to implement
- No payment gateway fees
- Direct payment to psychologist
- Works with M-Pesa (popular in Kenya)
- No PCI compliance needed

❌ **Cons:**
- Manual verification required
- No automatic confirmation
- Potential for disputes
- Psychologist must check M-Pesa manually
- No payment tracking/receipts

## API Endpoints

### 1. Approve Session (Generate Payment Instructions)
```
PUT /api/sessions/:id/approve
Body: { sessionRate: 2500 }
Response: {
  session: {
    status: "Approved",
    paymentInstructions: "Send KSh 2500 to M-Pesa: 0707439299..."
  }
}
```

### 2. Submit Payment (Client confirms they paid)
```
PUT /api/sessions/:id/payment-sent
Body: { paymentProof: "optional reference number" }
Response: {
  session: {
    status: "Payment Submitted",
    paymentStatus: "Paid"
  }
}
```

### 3. Verify Payment (Psychologist confirms)
```
PUT /api/sessions/:id/verify-payment
Response: {
  session: {
    status: "Confirmed",
    paymentStatus: "Verified",
    paymentVerifiedAt: "2024-01-15T10:30:00Z"
  }
}
```

## Dashboard Views

### Client Dashboard Sections:
1. **Pending Approval** - Waiting for psychologist
2. **Approved (Payment Required)** - Shows payment instructions
3. **Payment Submitted** - Waiting for verification
4. **Confirmed Sessions** - Ready to go

### Psychologist Dashboard Sections:
1. **Pending Approval** - New requests to approve
2. **Verify Payment** - Payments to confirm
3. **Confirmed Sessions** - Upcoming sessions
4. **Completed Sessions** - Past sessions

## Upgrading to Automated Payments

If you want to add automated payment processing, you could integrate:

### Option 1: M-Pesa API (Daraja API)
- Direct M-Pesa integration
- Automatic payment confirmation
- Real-time callbacks
- Popular in Kenya

### Option 2: Stripe
- International payments
- Card processing
- Automatic verification
- Built-in receipts

### Option 3: Flutterwave
- African payment gateway
- M-Pesa + cards
- Multi-currency
- Good for Kenya

## Current Implementation Files

**Backend:**
- `server/routes/sessions.js` - Payment workflow endpoints
- `server/models/Session.js` - Payment fields

**Frontend:**
- `client/src/components/dashboards/ClientDashboard.js` - Payment submission
- `client/src/components/dashboards/PsychologistDashboard.js` - Payment verification
- `client/src/components/PaymentNotification.js` - Payment UI

## Summary

Your current system is a **manual, trust-based payment system** where:
1. Psychologist provides M-Pesa details
2. Client pays outside the app
3. Client confirms payment in app
4. Psychologist manually verifies
5. Session is confirmed

It's simple and works well for MVP, but could be upgraded to automated payment processing for better user experience.
