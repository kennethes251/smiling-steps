# Smiling Steps - Teletherapy Booking API Reference

## Overview

This document provides comprehensive API documentation for the Smiling Steps teletherapy booking system. All endpoints require authentication unless otherwise noted.

**Base URL:** `/api`

**Authentication:** JWT Bearer token in Authorization header
```
Authorization: Bearer <token>
```

---

## Table of Contents

1. [Sessions & Booking](#sessions--booking)
2. [Cancellations](#cancellations)
3. [Rescheduling](#rescheduling)
4. [Agreements](#agreements)
5. [Intake Forms](#intake-forms)
6. [Availability Windows](#availability-windows)
7. [Reminders](#reminders)
8. [Session Rates](#session-rates)
9. [Performance Metrics](#performance-metrics)
10. [Security Monitoring](#security-monitoring)

---

## Sessions & Booking

### Create Booking Request
```
POST /api/sessions/request
```

Creates a new session booking request (pending therapist approval).

**Access:** Client only

**Request Body:**
```json
{
  "psychologistId": "string (required)",
  "sessionType": "string (required) - Individual|Couples|Family|Group",
  "sessionDate": "ISO date string (required)",
  "sessionRate": "number (optional)",
  "price": "number (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "msg": "Booking request submitted successfully",
  "session": {
    "id": "string",
    "clientId": "string",
    "psychologistId": "string",
    "sessionType": "string",
    "sessionDate": "ISO date",
    "status": "Pending Approval",
    "paymentStatus": "Pending",
    "meetingLink": "string",
    "bookingReference": "SS-YYYYMMDD-XXXX"
  }
}
```

### Get User Sessions
```
GET /api/sessions
```

Get all sessions for the logged-in user with pagination and caching.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status

**Response:**
```json
{
  "success": true,
  "sessions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Get Session by ID
```
GET /api/sessions/:id
```

**Access:** Session participants only

### Approve Session
```
PUT /api/sessions/:id/approve
```

Approve a pending session and send payment instructions.

**Access:** Psychologist only

**Request Body:**
```json
{
  "sessionRate": "number (optional)"
}
```

### Decline Session
```
PUT /api/sessions/:id/decline
```

**Access:** Psychologist only

**Request Body:**
```json
{
  "reason": "string (required)"
}
```

### Submit Payment Proof
```
POST /api/sessions/:id/submit-payment
```

**Access:** Client only

**Request Body:**
```json
{
  "transactionCode": "string (required)",
  "screenshot": "string (optional) - base64 or URL"
}
```

### Verify Payment
```
PUT /api/sessions/:id/verify-payment
```

**Access:** Psychologist or Admin

### Start Video Call
```
PUT /api/sessions/:id/start-call
```

Marks video call as started and records start time.

### End Video Call
```
PUT /api/sessions/:id/end-call
```

Marks video call as ended and calculates duration.

### Complete Session
```
POST /api/sessions/:id/complete
```

**Access:** Psychologist only

**Request Body:**
```json
{
  "sessionNotes": "string (encrypted)",
  "sessionProof": "string (URL)"
}
```

---

## Cancellations

### Check Cancellation Eligibility
```
GET /api/sessions/:id/cancellation-eligibility
```

Returns refund percentage based on cancellation timing.

**Response:**
```json
{
  "canCancel": true,
  "refundPercentage": 100,
  "refundAmount": 2500,
  "hoursUntilSession": 72,
  "policy": "Full refund for cancellations >48 hours before session"
}
```

### Cancel Session
```
POST /api/sessions/:id/cancel
```

**Request Body:**
```json
{
  "reason": "string (required) - schedule_conflict|emergency|illness|other",
  "notes": "string (optional)"
}
```

**Refund Policy:**
| Hours Before Session | Refund Percentage |
|---------------------|-------------------|
| > 48 hours          | 100%              |
| 24-48 hours         | 75%               |
| 12-24 hours         | 50%               |
| 6-12 hours          | 25%               |
| < 6 hours           | 0%                |

### Get Cancellation History
```
GET /api/cancellations/history
```

### Get Cancellation Policy
```
GET /api/cancellations/policy
```

**Access:** Public

### Admin: Get Pending Refunds
```
GET /api/admin/refunds/pending
```

**Access:** Admin only

### Admin: Process Refund
```
POST /api/admin/refunds/:sessionId/process
```

**Access:** Admin only

**Request Body:**
```json
{
  "transactionId": "string (required)"
}
```

### Get Refund Status
```
GET /api/refunds/:sessionId/status
```

---

## Rescheduling

### Check Reschedule Eligibility
```
GET /api/sessions/:id/reschedule-eligibility
```

**Response:**
```json
{
  "canReschedule": true,
  "requiresApproval": false,
  "hoursUntilSession": 36,
  "policy": "Automatic approval for reschedules >24 hours before session"
}
```

### Check Availability for Rescheduling
```
GET /api/sessions/:id/availability
```

**Query Parameters:**
- `date` (required): ISO date string
- `duration` (optional): Session duration in minutes (default: 60)

### Request Reschedule
```
POST /api/sessions/:id/reschedule
```

**Request Body:**
```json
{
  "newDate": "ISO date string (required)",
  "reason": "string (required) - schedule_conflict|emergency|illness|therapist_request|other",
  "notes": "string (optional)"
}
```

**Reschedule Policy:**
- > 24 hours before session: Automatic approval
- < 24 hours before session: Requires therapist approval

### Approve Reschedule
```
POST /api/sessions/:id/reschedule/approve
```

**Access:** Psychologist only

### Reject Reschedule
```
POST /api/sessions/:id/reschedule/reject
```

**Access:** Psychologist only

**Request Body:**
```json
{
  "reason": "string (required)"
}
```

### Get Pending Reschedule Requests
```
GET /api/reschedule/pending
```

**Access:** Psychologist only

### Get Reschedule History
```
GET /api/sessions/:id/reschedule/history
GET /api/reschedule/history
```

### Get Reschedule Policy
```
GET /api/reschedule/policy
```

**Access:** Public

---

## Agreements

### Get Current Agreement
```
GET /api/agreements/current
```

Returns the current confidentiality agreement version and content.

**Response:**
```json
{
  "success": true,
  "agreement": {
    "version": "1.0",
    "content": "string (agreement text)",
    "contentHash": "string",
    "alreadySigned": false,
    "signedAt": null
  }
}
```

### Accept Agreement
```
POST /api/agreements/accept
```

**Request Body:**
```json
{
  "typedSignature": "string (required) - full name",
  "signatureConfirmation": true,
  "agreementVersion": "string (optional)",
  "contentHash": "string (optional)"
}
```

### Check Agreement Status
```
GET /api/agreements/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "hasValidAgreement": true,
    "currentVersion": "1.0",
    "signedVersion": "1.0",
    "signedAt": "ISO date",
    "needsUpdate": false
  }
}
```

### Get Agreement History
```
GET /api/agreements/history
```

### Check Session Agreement
```
GET /api/agreements/:sessionId/check
```

---

## Intake Forms

### Get Form Template
```
GET /api/intake-forms/template
```

Returns the intake form structure with field definitions.

**Response:**
```json
{
  "success": true,
  "template": {
    "version": "1.0",
    "sections": [
      {
        "id": "basic",
        "title": "Basic Information",
        "fields": [
          {
            "name": "reasonForTherapy",
            "label": "What brings you to therapy?",
            "type": "textarea",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### Submit Intake Form
```
POST /api/intake-forms
```

**Request Body:**
```json
{
  "sessionId": "string (required)",
  "reasonForTherapy": "string",
  "previousTherapyExperience": "string",
  "currentMedications": "string (encrypted)",
  "medicalConditions": "string (encrypted)",
  "allergies": "string (encrypted)",
  "mentalHealthHistory": "string (encrypted)",
  "substanceUseHistory": "string (encrypted)",
  "suicidalThoughts": "boolean",
  "suicidalThoughtsDetails": "string (encrypted)",
  "currentSymptoms": "string (encrypted)",
  "symptomSeverity": "Mild|Moderate|Severe",
  "symptomDuration": "string",
  "therapyGoals": "string",
  "preferredApproach": "string",
  "emergencyContactName": "string (encrypted)",
  "emergencyContactPhone": "string (encrypted)",
  "emergencyContactRelationship": "string (encrypted)"
}
```

### Update/Partial Save Form
```
PUT /api/intake-forms/:id
```

Allows saving progress without completing the form.

### Get Form for Session
```
GET /api/intake-forms/:sessionId
```

**Access:** Client (own form), Psychologist (assigned sessions), Admin

### Check Form Status
```
GET /api/intake-forms/status/:sessionId
```

---

## Availability Windows

### Create Availability Window
```
POST /api/availability-windows
```

**Access:** Psychologist only

**Request Body:**
```json
{
  "windowType": "recurring|one-time|exception (required)",
  "dayOfWeek": "0-6 (required for recurring)",
  "specificDate": "ISO date (required for one-time/exception)",
  "startTime": "HH:MM (required)",
  "endTime": "HH:MM (required)",
  "title": "string (optional)",
  "notes": "string (optional)",
  "sessionTypes": ["Individual", "Couples"],
  "maxSessions": "number (optional)",
  "bufferMinutes": "number (optional)",
  "minAdvanceBookingHours": "number (optional)",
  "maxAdvanceBookingDays": "number (optional)"
}
```

### Get Therapist Availability Windows
```
GET /api/availability-windows/:therapistId
```

**Query Parameters:**
- `activeOnly` (boolean): Filter active only (default: true)
- `windowType` (string): Filter by type
- `includeExpired` (boolean): Include expired one-time windows

### Get Available Time Slots
```
GET /api/availability-windows/:therapistId/slots
```

**Query Parameters:**
- `date` (required): ISO date string
- `duration` (optional): Slot duration in minutes (default: 60)

**Response:**
```json
{
  "success": true,
  "data": {
    "therapistId": "string",
    "therapistName": "string",
    "date": "YYYY-MM-DD",
    "slotDuration": 60,
    "availableSlots": [
      { "startTime": "09:00", "endTime": "10:00" },
      { "startTime": "10:00", "endTime": "11:00" }
    ],
    "totalAvailable": 8,
    "bookedCount": 2
  }
}
```

### Update Availability Window
```
PUT /api/availability-windows/:id
```

**Access:** Psychologist (owner only)

### Delete Availability Window
```
DELETE /api/availability-windows/:id
```

**Query Parameters:**
- `permanent` (boolean): Permanently delete vs deactivate
- `reason` (string): Deletion reason

### Reactivate Availability Window
```
POST /api/availability-windows/:id/reactivate
```

---

## Reminders

### Get Reminder Status
```
GET /api/reminders/status
```

**Access:** Admin only

### Trigger Reminder Check
```
POST /api/reminders/trigger
```

**Access:** Admin only

**Request Body:**
```json
{
  "type": "24hour|1hour|both"
}
```

### Start/Stop Reminder Scheduler
```
POST /api/reminders/start
POST /api/reminders/stop
```

**Access:** Admin only

### Get Reminder History
```
GET /api/reminders/history
```

**Access:** Admin only

**Query Parameters:**
- `page`, `limit`: Pagination
- `startDate`, `endDate`: Date range filter

### Get Pending Reminders
```
GET /api/reminders/pending
```

**Access:** Admin only

### Send Manual Reminder
```
POST /api/reminders/send/:sessionId
```

**Access:** Admin only

**Request Body:**
```json
{
  "type": "24hour|1hour"
}
```

---

## Session Rates

### Get Therapist Rates (Own)
```
GET /api/therapist/rates
```

**Access:** Psychologist only

### Get Rate History
```
GET /api/therapist/rates/history
```

**Access:** Psychologist only

**Query Parameters:**
- `sessionType`: Filter by type
- `limit`, `skip`: Pagination

### Set/Update Rate
```
POST /api/therapist/rates
```

**Access:** Psychologist only

**Request Body:**
```json
{
  "sessionType": "Individual|Couples|Family|Group (required)",
  "amount": "number (required) - in KES",
  "duration": "number (required) - minutes",
  "changeReason": "string (optional)"
}
```

### Get Therapist Rates (Public)
```
GET /api/therapist/:therapistId/rates
GET /api/therapist/:therapistId/rates/:sessionType
```

**Access:** Public

### Get Locked Rate for Session
```
GET /api/sessions/:sessionId/locked-rate
```

Returns the rate that was effective when the session was created.

---

## Performance Metrics

### Get Metrics Summary
```
GET /api/performance-metrics/summary
```

**Access:** Admin only

### Get Detailed Metrics
```
GET /api/performance-metrics/detailed
```

**Access:** Admin only

**Query Parameters:**
- `startTime` (required): ISO date
- `endTime` (required): ISO date

### Get Booking Funnel Analytics
```
GET /api/performance-metrics/booking-funnel
```

**Access:** Admin only

**Query Parameters:**
- `timeWindow`: Hours (default: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeWindow": "24 hours",
    "conversionRate": "45.50%",
    "averageCompletionTime": "120.50 seconds",
    "funnelSteps": {
      "started": 100,
      "therapist_selected": 85,
      "time_selected": 70,
      "submitted": 55,
      "completed": 45
    },
    "dropoffRates": {...}
  }
}
```

### Get Payment Analytics
```
GET /api/performance-metrics/payment-analytics
```

**Access:** Admin only

### Get Response Time Analytics
```
GET /api/performance-metrics/response-times
```

**Access:** Admin only

### Export Metrics
```
GET /api/performance-metrics/export
```

**Access:** Admin only

**Query Parameters:**
- `format`: json (default)

### Get Performance Alerts
```
GET /api/performance-metrics/alerts
```

**Access:** Admin only

### Acknowledge Alert
```
POST /api/performance-metrics/alerts/:alertId/acknowledge
```

**Access:** Admin only

### Update Alert Thresholds
```
PUT /api/performance-metrics/alert-thresholds
```

**Access:** Admin only

---

## Security Monitoring

### Get Security Statistics
```
GET /api/security-monitoring/statistics
```

**Access:** Admin only

### Run Security Check
```
POST /api/security-monitoring/run-check
```

**Access:** Admin only

**Request Body:**
```json
{
  "context": {
    "actionType": "string (required)",
    "userId": "string (optional)",
    "sessionId": "string (optional)"
  }
}
```

### Get Security Incidents
```
GET /api/security-monitoring/incidents
```

**Access:** Admin only

**Query Parameters:**
- `status`: Filter by incident status

### Get Incident Details
```
GET /api/security-monitoring/incidents/:incidentId
```

**Access:** Admin only

### Update Incident Status
```
PUT /api/security-monitoring/incidents/:incidentId/status
```

**Access:** Admin only

**Request Body:**
```json
{
  "status": "detected|investigating|contained|resolved|closed",
  "note": "string (optional)"
}
```

### Archive Incident
```
POST /api/security-monitoring/incidents/:incidentId/archive
```

**Access:** Admin only

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)",
  "errors": ["Array of validation errors (if applicable)"]
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Missing/invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found |
| 409  | Conflict - Resource conflict (e.g., double booking) |
| 500  | Internal Server Error |

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 10 requests per 15 minutes
- Payment endpoints: 20 requests per 15 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Data Encryption

The following fields are encrypted at rest using AES-256-GCM:

- Session notes
- Intake form PHI fields (medications, conditions, mental health history, etc.)
- Emergency contact information

Encrypted data is automatically decrypted when accessed by authorized users.

---

## Audit Logging

All sensitive operations are logged with:
- User ID and role
- Action type
- Timestamp
- IP address
- Before/after state (for updates)
- Tamper-evident hash chain

Audit logs can be queried via `/api/audit-logs` (Admin only).
