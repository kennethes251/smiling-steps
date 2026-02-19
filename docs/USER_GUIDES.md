# Smiling Steps - User Guides

## Table of Contents

1. [Client Booking Guide](#client-booking-guide)
2. [Therapist Availability Management Guide](#therapist-availability-management-guide)
3. [Admin Monitoring Guide](#admin-monitoring-guide)
4. [Cancellation and Rescheduling Guide](#cancellation-and-rescheduling-guide)

---

## Client Booking Guide

### Overview

This guide walks you through the complete process of booking a therapy session on Smiling Steps.

### Step 1: Browse Therapists

1. Navigate to the **Therapists** page from the main menu
2. View available therapists with their:
   - Specializations
   - Experience
   - Ratings
   - Session rates
3. Click on a therapist to view their full profile

### Step 2: Select Session Type and Time

1. Choose your preferred **session type**:
   - Individual (1-on-1 therapy)
   - Couples (relationship counseling)
   - Family (family therapy)
   - Group (group sessions)

2. Select a **date** from the calendar
   - Only dates with available slots are selectable
   - Slots are shown based on therapist availability

3. Choose an **available time slot**
   - Green slots = Available
   - Gray slots = Unavailable/Booked

### Step 3: Submit Booking Request

1. Review your booking details:
   - Therapist name
   - Session type
   - Date and time
   - Session rate

2. Click **Submit Booking Request**

3. You'll receive:
   - A unique **booking reference number** (SS-YYYYMMDD-XXXX)
   - Email confirmation with booking details

### Step 4: Wait for Therapist Approval

- Your booking status is now **"Pending Approval"**
- The therapist will review your request
- You'll be notified when approved or declined

### Step 5: Make Payment

Once approved:

1. You'll receive **payment instructions** via email and SMS
2. Payment details include:
   - Amount (in KES)
   - M-Pesa number
   - Payment reference

3. Make payment via M-Pesa:
   - Go to M-Pesa menu
   - Select "Lipa na M-Pesa"
   - Enter the provided number
   - Enter the amount
   - Use your name as reference

4. Submit payment proof in the app:
   - Enter M-Pesa transaction code
   - Optionally upload screenshot

### Step 6: Complete Required Forms

After payment verification:

1. **Confidentiality Agreement**
   - Read the terms carefully
   - Type your full name as digital signature
   - Check the confirmation box
   - Click "Accept Agreement"

2. **Intake Form**
   - Complete all required sections
   - You can save progress and continue later
   - Sensitive information is encrypted

### Step 7: Session Ready

Once all forms are complete:

- Session status changes to **"Ready"**
- You'll receive the **meeting link** via email
- Calendar invite is sent automatically

### Step 8: Join Your Session

- Click the **"Join Session"** button on your dashboard
- Or use the meeting link from your email
- Join 5 minutes before scheduled time

### Viewing Session History

1. Go to **Dashboard** → **Session History**
2. View past and upcoming sessions
3. Access:
   - Session details
   - Therapist-approved notes
   - Session recordings (if available)
4. Export your session history as PDF

---

## Therapist Availability Management Guide

### Overview

This guide explains how therapists can manage their availability and session rates.

### Setting Up Availability Windows

#### Recurring Availability (Weekly Schedule)

1. Go to **Profile** → **Availability Calendar**
2. Click **"Add Availability"**
3. Select **"Recurring"** window type
4. Configure:
   - Day of week (Sunday-Saturday)
   - Start time
   - End time
   - Session types accepted
   - Maximum sessions per window

5. Click **Save**

Example: Set Monday 9:00 AM - 5:00 PM for Individual sessions

#### One-Time Availability

For special availability on specific dates:

1. Select **"One-Time"** window type
2. Choose the specific date
3. Set start and end times
4. Save

#### Blocking Time (Exceptions)

To block time on a recurring schedule:

1. Select **"Exception"** window type
2. Choose the date to block
3. Set the time range to block
4. Add a note (e.g., "Vacation", "Conference")
5. Save

### Managing Existing Windows

#### View All Windows

- Calendar view shows all availability
- Color coding:
  - Green: Recurring availability
  - Blue: One-time availability
  - Red: Blocked/Exception times

#### Edit a Window

1. Click on the window in the calendar
2. Modify times, session types, or notes
3. Save changes

**Note:** Changes won't affect existing confirmed sessions

#### Deactivate/Delete a Window

1. Click on the window
2. Choose:
   - **Deactivate**: Temporarily disable (can reactivate later)
   - **Delete**: Permanently remove

**Warning:** Cannot delete windows with confirmed sessions

### Setting Session Rates

1. Go to **Profile** → **Session Rates**
2. For each session type, set:
   - Amount (in KES)
   - Duration (in minutes)
3. Click **Update Rate**

**Important:**
- New rates apply only to future bookings
- Existing bookings keep their original rates
- Rate history is maintained for reference

### Handling Booking Requests

#### Viewing Pending Requests

1. Dashboard shows pending requests
2. Each request shows:
   - Client name
   - Requested session type
   - Requested date/time
   - Client's previous sessions (if any)

#### Approving a Request

1. Review the request details
2. Optionally adjust the session rate
3. Click **Approve**
4. Client receives payment instructions automatically

#### Declining a Request

1. Click **Decline**
2. Provide a reason (required)
3. Client is notified with the reason

### Session Reminders

- 24-hour reminder sent automatically
- 1-hour reminder with meeting link
- Customize reminder preferences in settings

---

## Admin Monitoring Guide

### Overview

This guide covers administrative monitoring and management features.

### Dashboard Overview

The admin dashboard provides:

- **User Statistics**: Total clients, therapists, pending approvals
- **Session Metrics**: Bookings today, this week, this month
- **Payment Overview**: Revenue, pending payments, refunds
- **System Health**: Server status, error rates

### User Management

#### Viewing Users

1. Go to **Admin** → **Users**
2. Filter by:
   - Role (Client/Psychologist/Admin)
   - Status (Active/Inactive/Pending)
   - Registration date

#### Approving Psychologists

1. Go to **Admin** → **Pending Approvals**
2. Review psychologist applications:
   - Credentials
   - Specializations
   - License information
3. Click **Approve** or **Reject**

#### Managing User Accounts

- **Deactivate**: Temporarily disable account
- **Reactivate**: Re-enable deactivated account
- **Delete**: Permanently remove (with data retention compliance)

### Payment Monitoring

#### Payment Dashboard

View:
- Total revenue (daily/weekly/monthly)
- Payment success rates
- Pending verifications
- Refund requests

#### Manual Payment Verification

1. Go to **Admin** → **Pending Payments**
2. Review payment proof:
   - Transaction code
   - Screenshot (if provided)
3. Verify against M-Pesa records
4. Click **Verify** or **Reject**

#### Processing Refunds

1. Go to **Admin** → **Refund Requests**
2. Review refund details:
   - Original payment
   - Cancellation reason
   - Refund amount (based on policy)
3. Process refund via M-Pesa
4. Enter transaction ID
5. Click **Mark as Processed**

### Performance Monitoring

#### Accessing Metrics

Go to **Admin** → **Performance Dashboard**

#### Key Metrics

1. **Response Times**
   - Booking page load time (target: <2s)
   - API response times (target: <1s)
   - M-Pesa initiation time (target: <3s)

2. **Booking Funnel**
   - Conversion rates
   - Drop-off points
   - Average completion time

3. **Payment Analytics**
   - Success rates
   - Error code breakdown
   - Average transaction amount

#### Setting Alert Thresholds

1. Go to **Performance** → **Alert Settings**
2. Configure thresholds for:
   - Response time warnings
   - Error rate alerts
   - Payment failure alerts
3. Set notification preferences

### Security Monitoring

#### Security Dashboard

View:
- Failed login attempts
- Unusual access patterns
- Data export anomalies
- Active security incidents

#### Handling Security Incidents

1. Go to **Admin** → **Security Incidents**
2. Review incident details:
   - Alert type
   - Severity
   - Affected users/data
3. Update incident status:
   - Investigating
   - Contained
   - Resolved
4. Add notes for audit trail

#### Breach Response

If a breach is detected:
1. System automatically alerts admins within 15 minutes
2. Review the incident immediately
3. Follow incident response workflow
4. Document all actions taken

### Audit Logs

#### Viewing Audit Logs

1. Go to **Admin** → **Audit Logs**
2. Filter by:
   - Date range
   - User
   - Action type
   - Entity type

#### Audit Log Contents

Each log entry includes:
- Timestamp
- User ID and role
- Action performed
- Before/after state
- IP address
- Tamper-evident hash

### Reminder Management

#### Monitoring Reminders

1. Go to **Admin** → **Reminders**
2. View:
   - Scheduler status
   - Recent reminders sent
   - Failed deliveries

#### Manual Reminder Trigger

1. Click **Trigger Reminder Check**
2. Select type: 24-hour, 1-hour, or both
3. Review results

---

## Cancellation and Rescheduling Guide

### Cancellation Policy

| Time Before Session | Refund Amount |
|--------------------|---------------|
| More than 48 hours | 100% refund   |
| 24-48 hours        | 75% refund    |
| 12-24 hours        | 50% refund    |
| 6-12 hours         | 25% refund    |
| Less than 6 hours  | No refund     |

### How to Cancel a Session (Client)

1. Go to **Dashboard** → **Upcoming Sessions**
2. Find the session to cancel
3. Click **Cancel Session**
4. Select a reason:
   - Schedule conflict
   - Emergency
   - Illness
   - Other
5. Add optional notes
6. Review refund amount
7. Confirm cancellation

### What Happens After Cancellation

1. Session status changes to **"Cancelled"**
2. Both client and therapist are notified
3. Refund is processed (if applicable)
4. Calendar invites are cancelled

### Rescheduling Policy

| Time Before Session | Approval Required |
|--------------------|-------------------|
| More than 24 hours | Automatic         |
| Less than 24 hours | Therapist approval|

### How to Reschedule a Session (Client)

1. Go to **Dashboard** → **Upcoming Sessions**
2. Find the session to reschedule
3. Click **Reschedule**
4. Select a new date and time
5. Choose a reason:
   - Schedule conflict
   - Emergency
   - Illness
   - Therapist request
   - Other
6. Submit request

### Reschedule Approval Process

**If > 24 hours before session:**
- Automatically approved
- Both parties notified immediately
- Calendar updated

**If < 24 hours before session:**
- Request sent to therapist
- Status: "Pending Reschedule Approval"
- Therapist reviews and approves/rejects
- Client notified of decision

### Handling Reschedule Requests (Therapist)

1. Go to **Dashboard** → **Pending Reschedule Requests**
2. Review request details:
   - Original date/time
   - Requested new date/time
   - Client's reason
3. Check your availability
4. Click **Approve** or **Reject**
5. If rejecting, provide a reason

### Notifications

All cancellation and rescheduling actions trigger:
- Email notifications to both parties
- SMS notifications (if enabled)
- Dashboard notifications
- Audit log entries

### Limits and Restrictions

- Maximum 2 reschedules per session
- Cannot reschedule completed sessions
- Cannot cancel sessions in progress
- Admin can override policies when necessary

---

## Getting Help

### Contact Support

- Email: support@smilingsteps.com
- In-app: Click the help icon in the bottom right

### FAQ

Visit our FAQ section for common questions about:
- Account management
- Payment issues
- Technical problems
- Privacy and security

### Emergency Resources

If you're experiencing a mental health emergency:
- Kenya Emergency: 999
- Crisis Helpline: 0800 723 253
