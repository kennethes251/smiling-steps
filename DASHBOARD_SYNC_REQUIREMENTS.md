# 📊 Dashboard Synchronization Requirements

## Goal
Both client and psychologist dashboards should show booking status in real-time and stay synchronized.

---

## Client Dashboard Requirements

### Show Bookings by Status:

#### 1. **Pending Approval** 🟡
```
Your Booking Request
├─ Therapist: Dr. Sarah
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000
└─ Status: ⏳ Waiting for therapist approval
   Actions: [Cancel Request]
```

#### 2. **Approved - Payment Required** 🟢
```
Payment Required
├─ Therapist: Dr. Sarah
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000
├─ Status: ✅ Approved! Please submit payment
└─ Payment Instructions:
   Send KSh 2,000 to M-Pesa: 0707439299
   Reference: Your Name
   
   Actions: [Submit Payment Proof] [Cancel]
```

#### 3. **Payment Submitted** 🔵
```
Payment Under Review
├─ Therapist: Dr. Sarah
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000
├─ Status: 💰 Payment submitted, waiting for verification
└─ Transaction: ABC123XYZ
   Actions: [View Details]
```

#### 4. **Confirmed** ✅
```
Confirmed Session
├─ Therapist: Dr. Sarah
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000 (Paid ✓)
├─ Status: ✅ Confirmed! Session ready
└─ Meeting Link: [Join Session]
   Actions: [Join] [Reschedule] [Cancel]
```

#### 5. **Declined** ❌
```
Booking Declined
├─ Therapist: Dr. Sarah
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Status: ❌ Therapist not available
└─ Reason: "Fully booked on this date"
   Actions: [Book Another Time]
```

---

## Psychologist Dashboard Requirements

### Show Bookings by Status:

#### 1. **Pending Approval** 🟡 (Action Required!)
```
New Booking Request
├─ Client: John Doe
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000
├─ Status: ⏳ Awaiting your approval
└─ Requested: 2 hours ago
   
   Actions: [✅ Approve] [❌ Decline]
```

#### 2. **Approved - Awaiting Payment** 🟢
```
Approved - Waiting for Payment
├─ Client: John Doe
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000
├─ Status: ✅ Approved, payment instructions sent
└─ Approved: 1 hour ago
   Actions: [View Details]
```

#### 3. **Payment Verification** 🔵 (Action Required!)
```
Payment Submitted - Verify
├─ Client: John Doe
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000
├─ Status: 💰 Payment proof submitted
├─ Transaction: ABC123XYZ
└─ Submitted: 30 minutes ago
   
   Actions: [✅ Verify Payment] [❌ Reject]
```

#### 4. **Confirmed Sessions** ✅
```
Upcoming Session
├─ Client: John Doe
├─ Type: Individual Therapy
├─ Date: Oct 25, 2024 at 10:00 AM
├─ Price: KSh 2,000 (Paid ✓)
├─ Status: ✅ Confirmed
└─ Meeting Link: [Start Session]
   Actions: [Start] [Reschedule] [Cancel]
```

---

## Real-Time Synchronization

### Auto-Refresh Strategy:

```javascript
useEffect(() => {
  // Initial fetch
  fetchSessions();
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(() => {
    fetchSessions();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

### Manual Refresh:
```javascript
<Button onClick={fetchSessions}>
  🔄 Refresh
</Button>
```

### Notification Badges:
```javascript
{pendingCount > 0 && (
  <Badge badgeContent={pendingCount} color="error">
    Pending Approvals
  </Badge>
)}
```

---

## Data Flow Synchronization

### When Client Books:
```
Client Dashboard                    Psychologist Dashboard
─────────────────                   ──────────────────────
[Submit Booking]
     ↓
Status: "Pending Approval" ←────→  🔔 New Request!
                                    Status: "Pending Approval"
                                    [Approve] [Decline]
```

### When Therapist Approves:
```
Client Dashboard                    Psychologist Dashboard
─────────────────                   ──────────────────────
🔔 Approved!                   ←────  [Approve] ✓
Status: "Approved"                   Status: "Approved"
[Submit Payment]                     Waiting for payment...
```

### When Client Pays:
```
Client Dashboard                    Psychologist Dashboard
─────────────────                   ──────────────────────
[Submit Payment] ✓              ────→  🔔 Payment Submitted!
Status: "Payment Submitted"          Status: "Payment Submitted"
Waiting for verification...          [Verify Payment]
```

### When Therapist Verifies:
```
Client Dashboard                    Psychologist Dashboard
─────────────────                   ──────────────────────
🔔 Confirmed!                   ←────  [Verify Payment] ✓
Status: "Confirmed"                  Status: "Confirmed"
[Join Session]                       [Start Session]
```

---

## Implementation Checklist

### Client Dashboard Updates:
- [ ] Add status-based sections
- [ ] Show pending approvals
- [ ] Show approved (payment required)
- [ ] Show payment submitted
- [ ] Show confirmed sessions
- [ ] Add payment submission form
- [ ] Add real-time refresh
- [ ] Add status badges
- [ ] Add action buttons per status

### Psychologist Dashboard Updates:
- [ ] Add pending approval section (with badge)
- [ ] Add approve/decline buttons
- [ ] Add approved sessions section
- [ ] Add payment verification section
- [ ] Add verify payment button
- [ ] Add confirmed sessions section
- [ ] Add real-time refresh
- [ ] Add notification badges
- [ ] Add action buttons per status

### Synchronization Features:
- [ ] Auto-refresh every 30 seconds
- [ ] Manual refresh button
- [ ] Status change notifications
- [ ] Badge counters
- [ ] Last updated timestamp
- [ ] Loading states during refresh

---

## Status Color Coding

```
🟡 Pending Approval     - Yellow/Warning
🟢 Approved             - Green/Success
🔵 Payment Submitted    - Blue/Info
✅ Confirmed            - Green/Success (darker)
🎥 In Progress          - Purple/Primary
✔️ Completed            - Gray/Default
❌ Declined             - Red/Error
⛔ Cancelled            - Red/Error
```

---

## API Endpoints Needed

### Client:
- `GET /api/sessions` - Get all my sessions
- `POST /api/sessions/:id/submit-payment` - Submit payment
- `DELETE /api/sessions/:id` - Cancel booking

### Psychologist:
- `GET /api/sessions` - Get all my sessions
- `GET /api/sessions/pending-approval` - Get pending only
- `PUT /api/sessions/:id/approve` - Approve booking
- `PUT /api/sessions/:id/decline` - Decline booking
- `PUT /api/sessions/:id/verify-payment` - Verify payment

---

## Real-Time Update Flow

```
1. User performs action (book, approve, pay, verify)
   ↓
2. API updates database
   ↓
3. Response sent to user
   ↓
4. Dashboard updates immediately (optimistic update)
   ↓
5. Auto-refresh confirms change (30s later)
   ↓
6. Other user's dashboard updates on next refresh
```

---

## Next Steps

1. Update ClientDashboard.js
2. Update PsychologistDashboard.js
3. Test synchronization
4. Add real-time polling
5. Deploy

**Estimated time**: 1 hour for both dashboards

---

**Status**: Requirements documented, ready to implement
