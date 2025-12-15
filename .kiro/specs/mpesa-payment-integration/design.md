# M-Pesa Payment Integration - Design Document

## Overview

The M-Pesa payment integration provides a secure, automated payment processing system for the Smiling Steps teletherapy platform. The design follows a microservices-inspired architecture with clear separation between payment processing, session management, and user interfaces. The system leverages M-Pesa's STK Push technology to deliver payment prompts directly to users' phones, eliminating the need for manual payment codes or complex checkout processes.

### Key Design Goals

1. **Seamless User Experience**: Minimize steps from payment initiation to confirmation
2. **Security First**: Protect sensitive payment data and comply with regulations
3. **Reliability**: Handle network issues, timeouts, and edge cases gracefully
4. **Observability**: Comprehensive logging and monitoring for troubleshooting
5. **Maintainability**: Modular, testable code with clear interfaces

### Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB (with PostgreSQL compatibility layer)
- **Payment API**: Safaricom M-Pesa Daraja API v1.0
- **Frontend**: React with Material-UI
- **Authentication**: JWT tokens
- **Encryption**: TLS 1.2+, AES-256 for stored credentials

## Architecture

The system follows a layered architecture with clear separation of concerns:

1. **Presentation Layer**: React components for user interaction
2. **API Layer**: Express.js routes handling HTTP requests
3. **Business Logic Layer**: Payment processing and validation
4. **Data Layer**: MongoDB for persistence
5. **External Integration Layer**: M-Pesa Daraja API communication

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Booking Page    │  │  Payment Page    │  │  Dashboard   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Smiling Steps Backend                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   API Gateway / Router                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                    │                    │            │
│           ▼                    ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Session    │    │   Payment    │    │     User     │     │
│  │  Management  │    │   Service    │    │  Management  │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│           │                    │                    │            │
│           └────────────────────┴────────────────────┘            │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │  MongoDB/Postgres │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    M-Pesa Daraja API                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    OAuth     │  │  STK Push    │  │   Callback   │         │
│  │    Token     │  │   Request    │  │   Handler    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Payment Flow Sequence

```
Client          Frontend        Backend         M-Pesa API      Database
  │                │               │                 │              │
  │ 1. Click Pay   │               │                 │              │
  ├───────────────►│               │                 │              │
  │                │ 2. POST       │                 │              │
  │                │ /mpesa/init   │                 │              │
  │                ├──────────────►│                 │              │
  │                │               │ 3. Validate     │              │
  │                │               │    Session      │              │
  │                │               ├────────────────────────────────►│
  │                │               │                 │              │
  │                │               │ 4. Get OAuth    │              │
  │                │               ├────────────────►│              │
  │                │               │◄────────────────┤              │
  │                │               │                 │              │
  │                │               │ 5. STK Push     │              │
  │                │               ├────────────────►│              │
  │                │               │◄────────────────┤              │
  │                │               │                 │              │
  │                │               │ 6. Store        │              │
  │                │               │    Checkout ID  │              │
  │                │               ├────────────────────────────────►│
  │                │               │                 │              │
  │                │ 7. Response   │                 │              │
  │                │◄──────────────┤                 │              │
  │                │               │                 │              │
  │ 8. Check Phone │               │                 │              │
  │◄───────────────┤               │                 │              │
  │                │               │                 │              │
  │ 9. Enter PIN   │               │                 │              │
  │ on Phone       │               │                 │              │
  │                │               │                 │              │
  │                │               │ 10. Callback    │              │
  │                │               │◄────────────────┤              │
  │                │               │                 │              │
  │                │               │ 11. Verify      │              │
  │                │               │     Signature   │              │
  │                │               │                 │              │
  │                │               │ 12. Update      │              │
  │                │               │     Session     │              │
  │                │               ├────────────────────────────────►│
  │                │               │                 │              │
  │                │ 13. Poll      │                 │              │
  │                │     Status    │                 │              │
  │                ├──────────────►│                 │              │
  │                │◄──────────────┤                 │              │
  │                │               │                 │              │
  │ 14. Success!   │               │                 │              │
  │◄───────────────┤               │                 │              │
```

## Components and Interfaces

### 1. MpesaAPI Service (`server/config/mpesa.js`)

**Purpose**: Encapsulates all interactions with M-Pesa Daraja API

**Responsibilities**:
- OAuth token management with caching
- STK Push request formatting and sending
- Payment status queries
- Error handling and retry logic

**Key Methods**:

```javascript
class MpesaAPI {
  async getAccessToken()
  async stkPush(phoneNumber, amount, accountReference, transactionDesc)
  async stkQuery(checkoutRequestID)
  generatePassword(timestamp)
  getTimestamp()
  formatPhoneNumber(phone)
}
```

### 2. Payment Routes (`server/routes/mpesa.js`)

**Endpoints**:
- POST /api/mpesa/initiate - Initiate payment
- POST /api/mpesa/callback - Receive M-Pesa callbacks
- GET /api/mpesa/status/:sessionId - Check payment status
- POST /api/mpesa/test-connection - Test API connectivity (Admin)

### 3. Database Schema Extensions

Session model extended with M-Pesa payment fields for tracking transactions, status, and audit trail.

### 4. Frontend Components

- **MpesaPayment Component**: Payment UI with phone input and status polling
- **Payment Page**: Dedicated payment processing page
- **Dashboard Integration**: Payment status display for clients and therapists

## Data Models

### Session Model (Extended)

```javascript
{
  // Existing fields
  client, psychologist, sessionType, scheduledDate, price, status,
  
  // M-Pesa fields
  mpesaCheckoutRequestID, mpesaMerchantRequestID, mpesaTransactionID,
  mpesaAmount, mpesaPhoneNumber, mpesaResultCode, mpesaResultDesc,
  
  // Payment tracking
  paymentMethod, paymentStatus, paymentInitiatedAt, paymentVerifiedAt,
  paymentFailureReason, paymentAttempts[]
}
```

## Error Handling

### Client-Side Error Handling

**Phone Number Validation**:
- Real-time format validation
- Clear error messages for invalid formats
- Auto-formatting assistance

**Payment Error States**:
- User cancelled: Show retry option
- Insufficient funds: Instruct to add funds
- Incorrect PIN: Prompt to re-enter
- Network timeout: Auto-retry with status check
- Unknown error: Contact support option

### Server-Side Error Handling

**M-Pesa API Errors**:
- Map M-Pesa result codes to user-friendly messages
- Retry logic with exponential backoff
- Fallback to status query on timeout

**Database Errors**:
- Transaction rollback on failure
- Duplicate payment prevention
- Data integrity checks

### Error Recovery Strategies

1. **Automatic Retry**: Network errors retry up to 3 times
2. **Status Reconciliation**: Query M-Pesa if status unclear
3. **Manual Intervention**: Flag for admin review if auto-recovery fails
4. **User Notification**: Clear communication at every step

## Security Design

### Authentication and Authorization

- JWT token validation for all payment endpoints
- Session ownership verification
- Admin-only endpoints for sensitive operations
- Webhook signature verification

### Data Protection

- TLS 1.2+ for all communications
- AES-256 encryption for stored credentials
- Phone number masking in logs
- No storage of M-Pesa PINs
- Secure environment variable management

### Audit Trail

- Log all payment operations with timestamps
- Track user actions and system responses
- Maintain 7-year retention for compliance
- Tamper-evident log format

## Performance Optimization

### Caching Strategy

- OAuth token cached for 50 minutes
- Session data cached during payment flow
- Database query optimization with indexes

### Database Optimization

- Compound indexes for fast lookups
- Lean queries for read-only operations
- Connection pooling for scalability

### API Optimization

- Request queuing to prevent duplicates
- Batch status updates where possible
- Efficient polling intervals (3 seconds)

## Testing Strategy

### Unit Testing

- MpesaAPI class methods
- Payment validation logic
- Phone number formatting
- Error handling scenarios

### Integration Testing

- End-to-end payment flow
- M-Pesa sandbox testing
- Webhook callback processing
- Database transaction integrity

### Property-Based Testing

Property-based testing will be used to verify universal correctness properties across all valid inputs. The testing framework will be **fast-check** for JavaScript/TypeScript.

**Configuration**: Each property test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Test Tagging**: Each property-based test will include a comment explicitly referencing the correctness property from the design document using the format:
```javascript
// Feature: mpesa-payment-integration, Property X: [property description]
```

## Monitoring and Logging

### Payment Event Logging

- Payment initiated
- STK Push sent
- Payment success/failure
- Callback received
- Status queries

### Health Monitoring

- M-Pesa API connectivity
- Payment success rate
- Average processing time
- Error rate tracking
- System uptime

### Alerting

- M-Pesa API downtime
- High error rates
- Payment processing delays
- Security incidents

## Deployment Configuration

### Environment Variables

```
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_BUSINESS_SHORT_CODE
MPESA_PASSKEY
MPESA_CALLBACK_URL
MPESA_ENVIRONMENT (sandbox/production)
```

### SSL Configuration

- Valid SSL certificates for webhook endpoints
- HTTPS enforcement for all payment operations

### Database Migration

- Add M-Pesa fields to existing sessions
- Create required indexes
- Migrate existing payment data


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Session Creation Sets Pending Status
*For any* client and therapist selection with valid session details, creating a session should result in a session record with status "Pending Approval"
**Validates: Requirements 1.1**

### Property 2: Session Creation Triggers Therapist Notification
*For any* newly created session, a notification should be sent to the selected therapist
**Validates: Requirements 1.2**

### Property 3: Therapist Approval Updates Session Status
*For any* session with status "Pending Approval", when a therapist approves it, the session status should change to "Approved"
**Validates: Requirements 1.3**

### Property 4: Approval Triggers Payment Notification
*For any* session that transitions to "Approved" status, a payment notification should be sent to the client
**Validates: Requirements 1.4**

### Property 5: Pending Sessions Block Payment
*For any* session with status "Pending Approval", attempting to initiate payment should be prevented
**Validates: Requirements 1.5**

### Property 6: Approved Sessions Show Payment Option
*For any* approved session accessed by the client, the UI should display a "Pay with M-Pesa" option
**Validates: Requirements 2.1**

### Property 7: Phone Number Validation
*For any* phone number input, the system should validate it matches Kenyan mobile number patterns (07XX/01XX or 2547XX/2541XX)
**Validates: Requirements 2.3**

### Property 8: Valid Phone Number Triggers STK Push
*For any* valid phone number submission, an STK Push request should be sent to M-Pesa Daraja API within 3 seconds
**Validates: Requirements 2.4**

### Property 9: Invalid Phone Number Shows Error
*For any* invalid phone number format, an error message specifying the correct format should be displayed
**Validates: Requirements 2.5**

### Property 10: STK Push Stores Checkout ID
*For any* initiated STK Push, the Checkout Request ID should be stored in the session record
**Validates: Requirements 2.6**

### Property 11: STK Push Shows Check Phone Message
*For any* sent STK Push, a "Check your phone" message should be displayed to the client
**Validates: Requirements 2.7**

### Property 12: STK Push Contains Business Name
*For any* STK Push request, the business name "Smiling Steps Therapy" should be included in the request payload
**Validates: Requirements 3.2**

### Property 13: STK Push Contains Correct Amount
*For any* session payment, the STK Push should display the exact session amount
**Validates: Requirements 3.3**

### Property 14: STK Push Timeout Handling
*For any* STK Push that receives no response within 120 seconds, the payment attempt should be marked as timed out
**Validates: Requirements 3.5**

### Property 15: Payment Status Polling Frequency
*For any* active STK Push, the system should poll payment status every 3 seconds
**Validates: Requirements 4.1**

### Property 16: Status Change Updates UI
*For any* payment status change, the user interface should update within 1 second
**Validates: Requirements 4.2**

### Property 17: Processing Shows Progress Indicator
*For any* payment in "Processing" status, a progress indicator should be displayed to the client
**Validates: Requirements 4.3**

### Property 18: Processing Continues Polling
*For any* payment with status "Processing", polling should continue for up to 120 seconds
**Validates: Requirements 4.4**

### Property 19: Unclear Status Triggers Direct Query
*For any* payment with unclear status after 120 seconds, the system should query the M-Pesa Daraja API directly
**Validates: Requirements 4.5**

### Property 20: Callback Signature Verification
*For any* received payment callback, the signature should be verified before processing
**Validates: Requirements 5.2**

### Property 21: Confirmed Payment Updates Payment Status
*For any* confirmed payment, the session payment status should be updated to "Paid"
**Validates: Requirements 5.3**

### Property 22: Confirmed Payment Updates Session Status
*For any* confirmed payment, the session status should be updated to "Confirmed"
**Validates: Requirements 5.4**

### Property 23: Confirmed Payment Stores Transaction ID
*For any* confirmed payment, the M-Pesa Transaction ID should be stored in the session record
**Validates: Requirements 5.5**

### Property 24: Confirmed Payment Shows Success Message
*For any* confirmed payment, a success message with transaction details should be displayed to the client
**Validates: Requirements 5.6**

### Property 25: Confirmed Payment Notifies Therapist
*For any* confirmed payment, a confirmation notification should be sent to the therapist
**Validates: Requirements 5.7**

### Property 26: Confirmed Payment Sends Email
*For any* confirmed payment, a confirmation email containing the M-Pesa Transaction ID should be sent to the client
**Validates: Requirements 5.8**

### Property 27: Cancelled Payment Shows Retry Option
*For any* client-cancelled STK Push, a "Payment Cancelled" message with retry option should be displayed
**Validates: Requirements 6.1**

### Property 28: Failed Payment Maintains Approved Status
*For any* payment failure, the session status should remain as "Approved"
**Validates: Requirements 6.4**

### Property 29: Failed Payment Allows Retry
*For any* failed payment, the client should be able to retry payment immediately
**Validates: Requirements 6.5**

### Property 30: Failed Payment Logs Failure Reason
*For any* payment failure, the failure reason should be logged for support team review
**Validates: Requirements 6.6**

### Property 31: Timeout Shows Retry Instructions
*For any* payment timeout, a message with instructions to check M-Pesa messages and retry should be displayed
**Validates: Requirements 6.7**

### Property 32: Confirmed Payment Updates Therapist Dashboard
*For any* confirmed payment, the therapist's dashboard should update within 5 seconds
**Validates: Requirements 7.1**

### Property 33: Dashboard Shows Payment Status
*For any* session viewed by a therapist, the payment status should be displayed
**Validates: Requirements 7.2**

### Property 34: Session Details Show Transaction ID
*For any* paid session viewed by a therapist, the M-Pesa Transaction ID should be displayed
**Validates: Requirements 7.3**

### Property 35: Confirmed Payment Notifies Therapist
*For any* confirmed payment, a notification should be sent to the therapist
**Validates: Requirements 7.4**

### Property 36: Dashboard Distinguishes Payment Status
*For any* sessions viewed by a therapist, paid and unpaid sessions should be visually distinguished
**Validates: Requirements 7.5**

### Property 37: Admin Dashboard Shows All Transactions
*For any* admin accessing the payment dashboard, all M-Pesa transactions should be displayed
**Validates: Requirements 8.1**

### Property 38: Transaction Display Contains Required Fields
*For any* transaction viewed by an admin, the display should include transaction date, amount, client, therapist, and M-Pesa Transaction ID
**Validates: Requirements 8.2**

### Property 39: Transaction Search Filters Results
*For any* admin search by date range, client, therapist, or transaction ID, the results should be filtered accordingly
**Validates: Requirements 8.3**

### Property 40: Report Generation Creates CSV
*For any* admin report request, a downloadable CSV file of transactions should be generated
**Validates: Requirements 8.4**

### Property 41: Connectivity Test Verifies Credentials
*For any* admin connectivity test, the system should verify API credentials and display connection status
**Validates: Requirements 8.5**

### Property 42: Failed Payment Logs Error Details
*For any* payment failure, error details should be logged and visible to admins
**Validates: Requirements 8.6**

### Property 43: Failed Payment Display Shows Details
*For any* failed payment viewed by an admin, the failure reason and timestamp should be displayed
**Validates: Requirements 8.7**

### Property 44: Payment Data Uses TLS Encryption
*For any* payment data transmission, TLS 1.2 or higher encryption should be used
**Validates: Requirements 9.1**

### Property 45: Credentials Are Encrypted
*For any* stored M-Pesa credentials, industry-standard encryption should be applied
**Validates: Requirements 9.2**

### Property 46: Webhook Signature Verified Before Processing
*For any* webhook callback, the signature should be verified before processing
**Validates: Requirements 9.3**

### Property 47: Phone Numbers Masked in Logs
*For any* payment data logged, phone numbers should be masked showing only the last 4 digits
**Validates: Requirements 9.4**

### Property 48: No PIN Storage
*For any* system operation, M-Pesa PINs should never be stored
**Validates: Requirements 9.5**

### Property 49: Data Deletion Anonymizes Records
*For any* user data deletion request, payment records should be anonymized while retaining transaction IDs
**Validates: Requirements 9.6**

### Property 50: Payment Endpoints Require Authentication
*For any* payment endpoint access, valid authentication tokens should be required
**Validates: Requirements 9.7**

### Property 51: Payment Initiation Response Time
*For any* payment initiation, the system should respond within 3 seconds
**Validates: Requirements 10.1**

### Property 52: STK Push Delivery Time
*For any* STK Push sent, it should be delivered to the client's phone within 10 seconds
**Validates: Requirements 10.2**

### Property 53: Callback Processing Time
*For any* payment callback received, it should be processed within 5 seconds
**Validates: Requirements 10.3**

### Property 54: Concurrent Payments Process Independently
*For any* multiple concurrent payment requests, each transaction should process independently without interference
**Validates: Requirements 10.4**

### Property 55: API Unavailability Shows Error and Retry
*For any* M-Pesa API unavailability, an error message should be displayed and retry allowed after 30 seconds
**Validates: Requirements 10.5**

### Property 56: Confirmed Payment Stores Required Fields
*For any* confirmed payment, the M-Pesa Transaction ID, amount, phone number, and timestamp should be stored
**Validates: Requirements 11.1**

### Property 57: Reconciliation Compares Transactions
*For any* admin reconciliation request, stored transactions should be compared with M-Pesa records
**Validates: Requirements 11.2**

### Property 58: Discrepancy Flags Transaction
*For any* detected discrepancy, the transaction should be flagged for manual review
**Validates: Requirements 11.3**

### Property 59: Reconciliation Generates Report
*For any* completed reconciliation, a report showing matched and unmatched transactions should be generated
**Validates: Requirements 11.4**

### Property 60: Approval Sends Email Notification
*For any* approved session, an email notification with payment instructions should be sent to the client
**Validates: Requirements 12.1**

### Property 61: Confirmed Payment Sends Email Within 30 Seconds
*For any* confirmed payment, an email confirmation should be sent to the client within 30 seconds
**Validates: Requirements 12.2**

### Property 62: Confirmed Payment Sends In-App Notification Within 5 Seconds
*For any* confirmed payment, an in-app notification should be sent to the therapist within 5 seconds
**Validates: Requirements 12.3**

### Property 63: Failed Payment Sends Notification With Reason
*For any* payment failure, an in-app notification with the failure reason should be sent to the client
**Validates: Requirements 12.4**

### Property 64: 24-Hour Reminder Sends SMS
*For any* session 24 hours away, an SMS reminder should be sent to the client
**Validates: Requirements 12.5**

### Property 65: 1-Hour Reminder Sends SMS to Both
*For any* session 1 hour away, SMS reminders should be sent to both client and therapist
**Validates: Requirements 12.6**

### Property 66: Payment Action Logs Required Fields
*For any* payment action, the log should contain timestamp, user ID, and action type
**Validates: Requirements 13.1**

### Property 67: Payment Initiation Records Required Fields
*For any* payment initiation, the client ID, session ID, amount, and phone number should be recorded
**Validates: Requirements 13.2**

### Property 68: Status Change Logs Transition Details
*For any* payment status change, the previous status, new status, and reason should be recorded
**Validates: Requirements 13.3**

### Property 69: Admin Access Logs Required Fields
*For any* admin access to payment data, the admin ID, accessed data, and timestamp should be logged
**Validates: Requirements 13.4**

### Property 70: Audit Logs Have Tamper-Evident Format
*For any* audit log request, the logs should be provided in a tamper-evident format
**Validates: Requirements 13.6**

### Property 71: API Unavailability Queues and Retries
*For any* M-Pesa API temporary unavailability, payment requests should be queued and retried after 30 seconds
**Validates: Requirements 14.1**

### Property 72: Callback Failure Retries With Backoff
*For any* webhook callback processing failure, the system should retry up to 3 times with exponential backoff
**Validates: Requirements 14.2**

### Property 73: Database Failure Rolls Back Transaction
*For any* database connection failure during payment processing, the transaction should be rolled back and client notified to retry
**Validates: Requirements 14.3**

### Property 74: Unclear Status Triggers Direct Query
*For any* unclear payment status, the system should query the M-Pesa API directly to verify the transaction
**Validates: Requirements 14.4**

### Property 75: Duplicate Callback Detection
*For any* duplicate payment callback, the system should detect and ignore it to prevent double-charging
**Validates: Requirements 14.5**

### Property 76: System Restart Resumes Pending Payments
*For any* system restart, monitoring of all pending payments should resume
**Validates: Requirements 14.6**

### Property 77: Sandbox Mode Uses Sandbox Credentials
*For any* system operation in sandbox mode, M-Pesa sandbox credentials should be used
**Validates: Requirements 15.1**

### Property 78: Sandbox Mode Indicates Test Mode
*For any* payment initiated in sandbox mode, "TEST MODE" should be clearly indicated to users
**Validates: Requirements 15.2**

### Property 79: Sandbox Mode Uses Test Phone Numbers
*For any* sandbox mode operation, test phone numbers provided by Safaricom should be used
**Validates: Requirements 15.3**

### Property 80: Mode Switching Requires Admin Authentication
*For any* switch between sandbox and production modes, admin authentication should be required
**Validates: Requirements 15.4**

### Property 81: Sandbox Transactions Isolated From Production
*For any* sandbox transaction, it should not affect production data
**Validates: Requirements 15.5**

### Property 82: Testing Provides Transaction Summary
*For any* completed testing session, a summary of test transactions should be provided for verification
**Validates: Requirements 15.6**

