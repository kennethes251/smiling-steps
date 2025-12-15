# 🚀 New Booking System - Quick Start Guide

## What's New?

The booking system has been completely redesigned with a better workflow:

**Old Flow**: Client books → Session created → Done ❌

**New Flow**: Client requests → Therapist approves → Client pays → Payment verified → Session confirmed ✅

## 🎯 Quick Setup (5 minutes)

### Step 1: Update App.js Routes

Open `client/src/App.js` and update the booking route:

```javascript
// Replace this:
import BookingPage from './pages/BookingPage';

// With this:
import BookingPageNew from './pages/BookingPageNew';

// Then update the route:
<Route path="/booking" element={<BookingPageNew />} />
```

### Step 2: Run Database Migration

```bash
# Update existing data to work with new system
node update-booking-system.js
```

This will:
- Update session statuses
- Add default rates to psychologist profiles
- Add payment information
- Add specializations

### Step 3: Restart Your Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test the Flow

1. **As Client**:
   - Go to `/booking`
   - Select a psychologist
   - Choose session type
   - Pick date/time
   - Submit booking request
   - Check dashboard for status

2. **As Therapist**:
   - View pending requests
   - Approve a booking
   - Client receives payment instructions

3. **As Client Again**:
   - Submit payment proof (Phase 2)
   - Wait for verification

4. **As Therapist**:
   - Verify payment
   - Session confirmed!

## 📱 User Experience

### Client Journey:
```
1. Browse Therapists
   ↓
2. Select Session Type & See Rates
   ↓
3. Choose Date & Time
   ↓
4. Submit Request → "Pending Approval"
   ↓
5. Wait for Therapist Approval
   ↓
6. Receive Payment Instructions
   ↓
7. Submit Payment Proof
   ↓
8. Session Confirmed! 🎉
```

### Therapist Journey:
```
1. Receive Booking Request Notification
   ↓
2. Review Client Details
   ↓
3. Approve or Decline
   ↓
4. If Approved: Payment Instructions Sent
   ↓
5. Receive Payment Proof
   ↓
6. Verify Payment
   ↓
7. Session Confirmed! 🎉
```

## 🔧 Customization

### Update Therapist Rates

Therapists can update their rates in their profile:

```javascript
// In therapist profile or admin panel:
psychologistDetails: {
  rates: {
    Individual: { amount: 2500, duration: 60 },  // Your rate
    Couples: { amount: 4000, duration: 75 },
    Family: { amount: 5000, duration: 90 },
    Group: { amount: 1800, duration: 90 }
  },
  paymentInfo: {
    mpesaNumber: '0712345678',  // Your M-Pesa number
    mpesaName: 'Dr. Your Name'
  }
}
```

### Update Payment Instructions

Default: "Send KSh [amount] to M-Pesa: [number] ([name])"

You can customize this in `server/routes/sessions.js` in the approve endpoint.

## 📊 Session Status Flow

```
Pending Approval  →  Therapist reviews
       ↓
   Approved       →  Payment instructions sent
       ↓
Payment Submitted →  Client uploaded proof
       ↓
   Confirmed      →  Payment verified
       ↓
  In Progress     →  Session happening
       ↓
   Completed      →  Session finished
```

Alternative paths:
- `Declined` - Therapist not available
- `Cancelled` - Either party cancelled

## 🎨 UI Features

- ✅ Beautiful step-by-step wizard
- ✅ Progress indicator
- ✅ Therapist cards with ratings
- ✅ Color-coded session types
- ✅ Interactive calendar
- ✅ Time slot picker
- ✅ Booking summary
- ✅ Success animations
- ✅ Mobile responsive

## 🔌 API Endpoints

### For Frontend Integration:

**Client Actions:**
```javascript
// Create booking request
POST /api/sessions/request
Body: { psychologistId, sessionType, sessionDate, sessionRate }

// Submit payment proof
POST /api/sessions/:id/submit-payment
Body: { transactionCode, screenshot }

// View my sessions
GET /api/sessions
```

**Therapist Actions:**
```javascript
// Get pending requests
GET /api/sessions/pending-approval

// Approve booking
PUT /api/sessions/:id/approve

// Decline booking
PUT /api/sessions/:id/decline
Body: { reason }

// Verify payment
PUT /api/sessions/:id/verify-payment
```

## 🚧 What's Not Done Yet (Phase 2)

These features are planned but not implemented:

- [ ] Confidentiality agreement form
- [ ] Client intake form
- [ ] Payment screenshot upload
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Therapist dashboard updates
- [ ] Client dashboard updates

## 💡 Tips

1. **For Testing**: Create test accounts for client, therapist, and admin roles

2. **Payment Verification**: Currently manual - therapist/admin reviews and confirms

3. **M-Pesa Integration**: Can be added later without changing the flow

4. **Notifications**: Add email service (SendGrid, Mailgun) in Phase 2

5. **Forms**: The database is ready for confidentiality agreements and intake forms

## 🐛 Troubleshooting

### "Session not found" error
- Make sure you're using the correct session ID
- Check that the session exists in the database

### "User not authorized" error
- Verify the user role (client/therapist/admin)
- Check that the user is associated with the session

### Rates not showing
- Run the migration script: `node update-booking-system.js`
- Manually add rates to psychologist profiles

### Old booking page still showing
- Clear browser cache
- Check App.js imports and routes
- Restart development server

## 📞 Support

If you encounter issues:
1. Check the console for errors
2. Review the implementation docs: `BOOKING_FLOW_IMPLEMENTATION.md`
3. Check the design doc: `NEW_BOOKING_FLOW_DESIGN.md`

## ✅ Checklist

Before going live:
- [ ] Migration script run successfully
- [ ] App.js updated with new route
- [ ] Server restarted
- [ ] Tested client booking flow
- [ ] Tested therapist approval flow
- [ ] Tested payment submission
- [ ] Tested payment verification
- [ ] All psychologists have rates configured
- [ ] Payment instructions are correct
- [ ] Mobile UI tested
- [ ] Error handling tested

## 🎉 You're Ready!

The new booking system is now active. Clients can start booking sessions with the improved workflow!

Next: Implement Phase 2 features (forms, uploads, notifications) for the complete experience.
