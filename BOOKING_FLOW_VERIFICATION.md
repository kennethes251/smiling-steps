# 🔍 Session Booking Flow Verification Guide

## ✅ What Was Implemented

Both Client and Psychologist dashboards have been updated with:
1. **Real-time synchronization** (auto-refresh every 30 seconds)
2. **Complete booking workflow** with 4 status stages
3. **Visual indicators** (color-coded sections, badges, borders)
4. **Clear action buttons** at each stage

## 📋 Manual Testing Checklist

### Prerequisites
- Server running: `npm start` in server folder
- Client running: `npm start` in client folder
- At least 1 client and 1 psychologist account

### Test Scenario: Complete Booking Flow

#### STEP 1: Client Creates Booking Request
**As Client:**
1. Login to client account
2. Go to Dashboard
3. Click "New Session" button
4. Select a psychologist
5. Choose session type and date/time
6. Submit booking request

**Expected Result:**
- ✅ Success message appears
- ✅ Booking appears in "Pending Approval" section (orange border)
- ✅ Shows "Awaiting Therapist Approval" chip
- ✅ Can cancel the request

#### STEP 2: Psychologist Sees Request
**As Psychologist:**
1. Login to psychologist account
2. Go to Dashboard
3. Check "Pending Approval" section

**Expected Result:**
- ✅ Section has orange border (if requests exist)
- ✅ Badge shows count of pending requests
- ✅ Request shows client name, date, and session rate
- ✅ "Approve" button is visible

#### STEP 3: Psychologist Approves
**As Psychologist:**
1. Click "Approve" button on the request
2. Confirm approval

**Expected Result:**
- ✅ Success message: "Session approved! Client will be notified to submit payment."
- ✅ Request moves from "Pending Approval" to "Confirmed Sessions" (or disappears if not yet confirmed)
- ✅ Dashboard refreshes automatically

#### STEP 4: Client Sees Approval
**As Client:**
1. Wait for auto-refresh (30 seconds) OR refresh page
2. Check "Approved - Payment Required" section

**Expected Result:**
- ✅ Section has blue border
- ✅ Badge shows count
- ✅ Session shows payment amount (KES)
- ✅ "Submit Payment" button is visible
- ✅ "Approved - Submit Payment" chip displayed

#### STEP 5: Client Submits Payment
**As Client:**
1. Click "Submit Payment" button
2. Enter M-Pesa transaction code
3. Upload payment screenshot (optional)
4. Submit

**Expected Result:**
- ✅ Success message appears
- ✅ Session moves to "Payment Submitted" section (purple)
- ✅ Shows "Awaiting Payment Verification" chip

#### STEP 6: Psychologist Sees Payment Submission
**As Psychologist:**
1. Wait for auto-refresh OR refresh page
2. Check "Verify Payment" section

**Expected Result:**
- ✅ Section has blue border
- ✅ Badge shows count
- ✅ Session shows "Payment Submitted" chip
- ✅ "Verify" button is visible

#### STEP 7: Psychologist Verifies Payment
**As Psychologist:**
1. Click "Verify" button
2. Confirm verification

**Expected Result:**
- ✅ Success message: "Payment verified! Session is now confirmed."
- ✅ Session moves to "Confirmed Upcoming Sessions" (green)
- ✅ Dashboard refreshes

#### STEP 8: Both See Confirmed Session
**As Both Client and Psychologist:**
1. Check "Confirmed Sessions" section

**Expected Result:**
- ✅ Section has green border
- ✅ Badge shows count
- ✅ Session shows "Confirmed & Paid" chip (client) or just "Confirmed" (psychologist)
- ✅ Meeting link visible (if added)
- ✅ "Join" button appears when session is live (within 30 minutes)

## 🎨 Visual Verification

### Color Coding
- **Orange (#ff9800)**: Pending Approval
- **Blue (#2196f3)**: Payment Processing (Approved or Submitted)
- **Green (#4caf50)**: Confirmed
- **Purple (#9c27b0)**: Payment Submitted (client view)

### Badges
- Small circular badges showing count
- Appear next to section titles
- Update in real-time

### Borders
- 2px solid border on sections with items
- Matches section color theme
- Highlights sections needing attention

## 🔄 Real-Time Sync Verification

### Test Auto-Refresh
1. Open client dashboard in one browser
2. Open psychologist dashboard in another browser
3. Perform an action (approve, submit payment, etc.)
4. Wait up to 30 seconds
5. Both dashboards should update automatically

**Expected Result:**
- ✅ Changes appear without manual refresh
- ✅ Counts update
- ✅ Sessions move between sections
- ✅ No page reload needed

## 🐛 Common Issues & Solutions

### Issue: Sessions not appearing
**Solution:** 
- Check if user is logged in correctly
- Verify session was created successfully
- Check browser console for errors

### Issue: Auto-refresh not working
**Solution:**
- Check browser console for errors
- Verify API endpoints are accessible
- Check if interval is set correctly (30000ms)

### Issue: Wrong status displayed
**Solution:**
- Refresh page manually
- Check database for actual status
- Verify API response

### Issue: Payment button not working
**Solution:**
- Check if PaymentNotification component is imported
- Verify session has price/sessionRate set
- Check browser console for errors

## 📊 Database Status Values

The workflow uses these status values:
1. `Pending Approval` - Initial booking request
2. `Approved` - Therapist approved, awaiting payment
3. `Payment Submitted` - Client submitted payment proof
4. `Confirmed` - Payment verified, session ready
5. `Completed` - Session conducted
6. `Cancelled` - Session cancelled

## ✨ Success Criteria

The booking flow is working correctly if:
- ✅ All 8 test steps complete successfully
- ✅ Both dashboards show synchronized data
- ✅ Auto-refresh works (30-second interval)
- ✅ Visual indicators (colors, badges, borders) display correctly
- ✅ Action buttons work at each stage
- ✅ Status transitions happen smoothly
- ✅ No console errors appear

## 🚀 Next Steps After Verification

Once verified:
1. Test with multiple concurrent bookings
2. Test cancellation at different stages
3. Test with different session types
4. Test meeting link generation
5. Test video call functionality
6. Deploy to production

## 📝 Notes

- Auto-refresh interval: 30 seconds
- Session is "live" when within 30 minutes of scheduled time
- Payment verification is manual (therapist confirms)
- Meeting links can be added at any time after confirmation
