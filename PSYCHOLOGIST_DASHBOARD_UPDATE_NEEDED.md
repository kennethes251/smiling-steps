# 🔄 Psychologist Dashboard Update Needed

## Current Status

The psychologist dashboard exists but needs updates for the new booking workflow.

## What Needs to Be Added

### 1. **Pending Approval Section** (New!)
Show bookings waiting for therapist approval:
- Status: "Pending Approval"
- Client name
- Session type & date
- **Approve** and **Decline** buttons

### 2. **Approved Appointments** (New!)
Show approved bookings waiting for payment:
- Status: "Approved"
- Payment instructions sent
- Waiting for client payment

### 3. **Payment Verification Queue** (New!)
Show bookings with payment submitted:
- Status: "Payment Submitted"
- Transaction code
- **Verify Payment** button

### 4. **Confirmed Appointments**
Show confirmed upcoming sessions:
- Status: "Confirmed"
- Ready for session
- Meeting link

### 5. **Real-Time Updates**
- Auto-refresh every 30 seconds
- Manual refresh button
- Notification badges for new requests

## Implementation Plan

### Phase 1: Update Dashboard Layout
- Add tabs for different statuses
- Organize by workflow stage
- Add counters/badges

### Phase 2: Add Approval Actions
- Approve button → calls `/api/sessions/:id/approve`
- Decline button → calls `/api/sessions/:id/decline`
- Payment verify button → calls `/api/sessions/:id/verify-payment`

### Phase 3: Real-Time Updates
- Use `setInterval` for polling
- Add refresh button
- Show "New request!" notifications

## Quick Implementation

The dashboard file is at:
`client/src/components/dashboards/PsychologistDashboard.js`

Key changes needed:
1. Update `fetchData()` to use new endpoints
2. Add sections for each status
3. Add approve/decline/verify actions
4. Add auto-refresh timer

## Timeline

- **Now**: Dashboard works with old flow
- **After update**: Dashboard shows new workflow
- **Estimated time**: 30 minutes to update

## Next Steps

1. Update PsychologistDashboard.js
2. Test with real bookings
3. Add real-time polling
4. Deploy

---

**Status**: Ready to implement
**Priority**: High (needed for new booking flow)
