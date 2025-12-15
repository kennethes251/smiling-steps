# M-Pesa Payment Integration - Implementation Tasks

## Overview

This document outlines the implementation tasks for the M-Pesa payment integration feature. Tasks are organized sequentially to ensure each step builds on previous work, with testing integrated throughout the development process.

## Task List

- [x] 1. Environment Setup and Configuration





  - Set up M-Pesa Daraja API credentials in environment variables
  - Configure sandbox and production environments
  - Install required npm packages (axios for HTTP requests)
  - Create credential validation script
  - _Requirements: All (foundational)_

- [x] 2. Database Schema Updates





  - [x] 2.1 Extend Session model with M-Pesa payment fields


    - Add mpesaCheckoutRequestID, mpesaMerchantRequestID, mpesaTransactionID fields
    - Add mpesaAmount, mpesaPhoneNumber, mpesaResultCode, mpesaResultDesc fields
    - Add paymentMethod, paymentStatus, paymentInitiatedAt, paymentVerifiedAt fields
    - Add paymentAttempts array for audit trail
    - _Requirements: 5.3, 5.4, 5.5, 11.1, 13.2_
  
  - [x] 2.2 Create database indexes for performance


    - Add compound index on mpesaCheckoutRequestID and paymentStatus
    - Add index on client, paymentStatus, and scheduledDate
    - Add index on psychologist, paymentStatus, and scheduledDate
    - Add sparse unique index on mpesaTransactionID
    - _Requirements: 10.3_
  
  - [x] 2.3 Write database migration script


    - Create script to add M-Pesa fields to existing sessions
    - Set default values for existing records
    - Test migration on development database
    - _Requirements: All (foundational)_

- [x] 3. M-Pesa API Service Implementation










  - [x] 3.1 Create MpesaAPI class structure


    - Implement constructor with configuration
    - Add environment variable loading
    - Set up base URL for sandbox/production
    - _Requirements: 2.4, 15.1_
  
  - [x] 3.2 Implement OAuth token management


    - Create getAccessToken() method
    - Implement token caching (50-minute expiry)
    - Add token refresh logic
    - Handle authentication errors
    - _Requirements: 2.4, 8.5_
  
  - [x] 3.3 Implement STK Push functionality


    - Create stkPush() method
    - Generate password for API authentication
    - Format timestamp in M-Pesa format
    - Build STK Push request payload
    - Handle API response and errors
    - _Requirements: 2.4, 2.6, 3.2, 3.3_
  
  - [x] 3.4 Implement payment status query


    - Create stkQuery() method
    - Build status query request
    - Parse status response
    - Handle query errors
    - _Requirements: 4.5, 14.4_
  
  - [x] 3.5 Implement phone number formatting


    - Create formatPhoneNumber() method
    - Handle 07XX format → 2547XX conversion
    - Handle 01XX format → 2541XX conversion
    - Handle already formatted 254XXX numbers
    - _Requirements: 2.3_
  
  - [x] 3.6 Write property tests for MpesaAPI





    - **Property 7: Phone Number Validation**
    - **Property 12: STK Push Contains Business Name**
    - **Property 13: STK Push Contains Correct Amount**
    - **Property 77: Sandbox Mode Uses Sandbox Credentials**
    - **Validates: Requirements 2.3, 3.2, 3.3, 15.1**

- [x] 4. Payment Routes Implementation













  - [x] 4.1 Create payment routes file



    - Set up Express router
    - Import required dependencies
    - Configure middleware
    - _Requirements: All (foundational)_
  

  - [x] 4.2 Implement POST /api/mpesa/initiate endpoint


    - Add authentication middleware
    - Validate request body (sessionId, phoneNumber)
    - Verify session ownership
    - Check session status is "Approved"
    - Prevent duplicate payments
    - Format phone number
    - Call MpesaAPI.stkPush()
    - Store CheckoutRequestID in session
    - Update payment status to "Processing"
    - Return success response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 4.3 Write property tests for payment initiation









    - **Property 5: Pending Sessions Block Payment**
    - **Property 8: Valid Phone Number Triggers STK Push**
    - **Property 9: Invalid Phone Number Shows Error**
    - **Property 10: STK Push Stores Checkout ID**
    - **Property 51: Payment Initiation Response Time**
    - **Validates: Requirements 1.5, 2.4, 2.5, 2.6, 10.1**

  
  - [x] 4.4 Implement POST /api/mpesa/callback endpoint


    - Add webhook signature verification
    - Parse M-Pesa callback payload
    - Extract CheckoutRequestID
    - Find session by CheckoutRequestID
    - Parse result code and metadata
    - Update session with payment details
    - Update payment status (Paid/Failed)
    - Update session status (Confirmed if paid)
    - Send notifications to client and therapist
    - Log transaction for audit
    - Return acknowledgment
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x] 4.5 Write property tests for callback processing










    - **Property 20: Callback Signature Verification**
    - **Property 21: Confirmed Payment Updates Payment Status**
    - **Property 22: Confirmed Payment Updates Session Status**
    - **Property 23: Confirmed Payment Stores Transaction ID**
    - **Property 53: Callback Processing Time**
    - **Property 75: Duplicate Callback Detection**

    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 10.3, 14.5**
  
  - [x] 4.6 Implement GET /api/mpesa/status/:sessionId endpoint


    - Add authentication middleware
    - Validate session ownership
    - Retrieve session from database
    - If status unclear, query M-Pesa API
    - Return payment status
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 4.7 Write property tests for status checking






    - **Property 19: Unclear Status Triggers Direct Query**

    - **Property 74: Unclear Status Triggers Direct Query**
    - **Validates: Requirements 4.5, 14.4**
  
  - [x] 4.8 Implement POST /api/mpesa/test-connection endpoint


    - Add admin authentication middleware
    - Test OAuth token generation

    - Verify API connectivity
    - Return connection status
    - _Requirements: 8.5_
  
  - [x] 4.9 Register routes in main server file



    - Import mpesa routes
    - Mount routes at /api/mpesa
    - Test route registration
    - _Requirements: All (foundational)_

- [x] 5. Error Handling and Recovery




  - [x] 5.1 Implement error mapping


    - Map M-Pesa result codes to user-friendly messages
    - Create error response formatter
    - Add error logging
    - _Requirements: 6.1, 6.2, 6.3, 6.7_
  
  - [x] 5.2 Implement retry logic


    - Add exponential backoff for API calls
    - Implement request queuing for API unavailability
    - Add callback retry mechanism
    - _Requirements: 14.1, 14.2_
  
  - [x] 5.3 Implement transaction rollback


    - Add database transaction handling
    - Implement rollback on failure
    - Add client notification on rollback
    - _Requirements: 14.3_
  
  - [x] 5.4 Write property tests for error handling










    - **Property 27: Cancelled Payment Shows Retry Option**
    - **Property 28: Failed Payment Maintains Approved Status**
    - **Property 29: Failed Payment Allows Retry**
    - **Property 30: Failed Payment Logs Failure Reason**
    - **Property 71: API Unavailability Queues and Retries**
    - **Property 72: Callback Failure Retries With Backoff**
    - **Property 73: Database Failure Rolls Back Transaction**
    - **Validates: Requirements 6.1, 6.4, 6.5, 6.6, 14.1, 14.2, 14.3**

- [x] 6. Frontend Payment Component





  - [x] 6.1 Create MpesaPayment React component


    - Set up component structure with props and state
    - Add phone number input field
    - Implement real-time phone number validation
    - Add auto-formatting for phone numbers
    - Display session amount and details
    - Add "Pay" button
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 6.2 Implement payment initiation


    - Call /api/mpesa/initiate on button click
    - Handle loading state
    - Display "Check your phone" message
    - Handle initiation errors
    - _Requirements: 2.4, 2.7_
  
  - [x] 6.3 Implement payment status polling


    - Set up polling interval (3 seconds)
    - Call /api/mpesa/status endpoint
    - Update UI based on status
    - Stop polling on success/failure
    - Implement 2-minute timeout
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.4 Implement success and failure states


    - Display success message with transaction ID
    - Display failure message with retry option
    - Add retry functionality
    - Handle timeout scenarios
    - _Requirements: 5.6, 6.1, 6.7_
  
  - [x] 6.5 Write property tests for payment component





    - **Property 11: STK Push Shows Check Phone Message**
    - **Property 15: Payment Status Polling Frequency**
    - **Property 16: Status Change Updates UI**
    - **Property 17: Processing Shows Progress Indicator**
    - **Property 24: Confirmed Payment Shows Success Message**
    - **Validates: Requirements 2.7, 4.1, 4.2, 4.3, 5.6**

- [ ] 7. Dashboard Integration



  - [x] 7.1 Update Client Dashboard

    - ✅ Display payment status for each session
    - ✅ Add "Pay Now" button for approved sessions (integrated with MpesaPayment component)
    - ✅ Show payment history section (dedicated table with all payment details)
    - ✅ Add transaction receipt download button (available in payment history, confirmed sessions, and session history)
    - _Requirements: 2.1, 7.2_
  
  - [x] 7.2 Update Therapist Dashboard





    - Display payment status indicators
    - Show M-Pesa Transaction ID for paid sessions
    - Add visual distinction for paid/unpaid sessions
    - Implement automatic status updates
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [x] 7.3 Write property tests for dashboard updates






    - **Property 32: Confirmed Payment Updates Therapist Dashboard**
    - **Property 33: Dashboard Shows Payment Status**
    - **Property 34: Session Details Show Transaction ID**
    - **Property 36: Dashboard Distinguishes Payment Status**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [-] 8. Admin Payment Management


  - [x] 8.1 Create admin payment dashboard


    - Display all M-Pesa transactions
    - Show transaction details (date, amount, client, therapist, ID)
    - Add search and filter functionality
    - Implement pagination
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 8.2 Implement payment reconciliation


    - Create reconciliation logic
    - Compare stored transactions with M-Pesa records
    - Flag discrepancies
    - Generate reconciliation report
    - _Requirements: 11.2, 11.3, 11.4_
  
  - [x] 8.3 Implement report generation





    - Create CSV export functionality
    - Include all transaction fields
    - Add date range filtering
    - _Requirements: 8.4_
  
  - [x] 8.4 Write property tests for admin features






    - **Property 37: Admin Dashboard Shows All Transactions**
    - **Property 38: Transaction Display Contains Required Fields**
    - **Property 39: Transaction Search Filters Results**
    - **Property 40: Report Generation Creates CSV**
    - **Property 57: Reconciliation Compares Transactions**
    - **Property 58: Discrepancy Flags Transaction**
    - **Property 59: Reconciliation Generates Report**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 11.2, 11.3, 11.4**

- [x] 9. Notification System




  - [x] 9.1 Implement payment notifications


    - Send email on session approval with payment instructions
    - Send email on payment confirmation with transaction ID
    - Send in-app notification to therapist on payment
    - Send in-app notification to client on failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 9.2 Implement session reminders



    - Create 24-hour reminder job
    - Create 1-hour reminder job
    - Send SMS to client and therapist
    - _Requirements: 12.5, 12.6_
  
  - [x] 9.3 Write property tests for notifications






    - **Property 4: Approval Triggers Payment Notification**
    - **Property 25: Confirmed Payment Notifies Therapist**
    - **Property 26: Confirmed Payment Sends Email**
    - **Property 60: Approval Sends Email Notification**
    - **Property 61: Confirmed Payment Sends Email Within 30 Seconds**
    - **Property 62: Confirmed Payment Sends In-App Notification Within 5 Seconds**
    - **Property 63: Failed Payment Sends Notification With Reason**
    - **Property 64: 24-Hour Reminder Sends SMS**
    - **Property 65: 1-Hour Reminder Sends SMS to Both**
    - **Validates: Requirements 1.4, 5.7, 5.8, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

- [x] 10. Security Implementation





  - [x] 10.1 Implement webhook signature verification


    - Add signature generation logic
    - Verify incoming webhook signatures
    - Reject invalid signatures
    - _Requirements: 9.3_
  
  - [x] 10.2 Implement data encryption


    - Encrypt M-Pesa credentials at rest
    - Use TLS 1.2+ for all communications
    - Mask phone numbers in logs
    - _Requirements: 9.1, 9.2, 9.4_
  
  - [x] 10.3 Implement authentication and authorization



    - Add JWT validation to payment endpoints
    - Verify session ownership
    - Add admin-only endpoint protection
    - _Requirements: 9.7_
  
  - [x] 10.4 Write property tests for security






    - **Property 44: Payment Data Uses TLS Encryption**
    - **Property 45: Credentials Are Encrypted**
    - **Property 46: Webhook Signature Verified Before Processing**
    - **Property 47: Phone Numbers Masked in Logs**
    - **Property 48: No PIN Storage**
    - **Property 50: Payment Endpoints Require Authentication**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**

- [x] 11. Audit Trail and Logging





  - [x] 11.1 Implement payment action logging


    - Log all payment actions with timestamp, user ID, action type
    - Log payment initiations with required fields
    - Log status changes with transition details
    - Log admin access to payment data
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 11.2 Implement tamper-evident logging


    - Create log format with integrity checks
    - Implement log retrieval functionality
    - _Requirements: 13.6_
  
  - [x] 11.3 Write property tests for audit trail






    - **Property 66: Payment Action Logs Required Fields**
    - **Property 67: Payment Initiation Records Required Fields**
    - **Property 68: Status Change Logs Transition Details**
    - **Property 69: Admin Access Logs Required Fields**
    - **Property 70: Audit Logs Have Tamper-Evident Format**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.6**

- [ ] 12. Testing and Quality Assurance







  - [ ] 12.1 Write integration tests





    - Test complete payment flow end-to-end
    - Test error scenarios and recovery
    - Test concurrent payment processing
    - Test webhook callback handling
    - _Requirements: All_
  -

  - [-] 12.2 Write unit tests



    - Test MpesaAPI methods
    - Test payment validation logic
    - Test error handling functions
    - Test phone number formatting
    - _Requirements: All_
  
  - [x] 12.3 Perform security testing


    - Test authentication and authorization
    - Test webhook signature verification
    - Test data encryption
    - Test for common vulnerabilities
    - _Requirements: 9.1, 9.2, 9.3, 9.7_
  
  - [x] 12.4 Perform performance testing




    - Test payment initiation response time
    - Test callback processing time
    - Test concurrent payment handling
    - Test database query performance
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [-] 13. Deployment Preparation


  - [x] 13.1 Set up production environment



    - Configure production M-Pesa credentials
    - Set up SSL certificates for webhooks
    - Configure production database
    - Set up monitoring and alerting
    - _Requirements: All (foundational)_
  
  - [x] 13.2 Run database migration


    - Back up production database
    - Run migration script
    - Verify migration success
    - Test with existing data
    - _Requirements: All (foundational)_
  
  - [x] 13.3 Configure monitoring

    - Set up payment event logging
    - Configure M-Pesa API health checks
    - Set up error rate monitoring
    - Configure alerting thresholds
    - _Requirements: 10.6_
  
  - [x] 13.4 Deploy to production



    - Deploy backend changes
    - Deploy frontend changes
    - Verify webhook endpoint accessibility
    - Test payment flow in production
    - Monitor initial transactions
    - _Requirements: All_

- [ ] 14. Post-Deployment
  - [ ] 14.1 Monitor payment transactions
    - Track payment success rate
    - Monitor error rates
    - Review failed payments
    - Verify reconciliation accuracy
    - _Requirements: All_
  
  - [ ] 14.2 Gather user feedback
    - Collect client feedback on payment experience
    - Collect therapist feedback on payment visibility
    - Identify pain points and improvements
    - _Requirements: All_
  
  - [ ] 14.3 Optimize based on metrics
    - Analyze performance metrics
    - Optimize slow queries
    - Improve error messages based on feedback
    - Enhance UI/UX based on user behavior
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP delivery
- Property-based tests use the **fast-check** library for JavaScript/TypeScript
- Each property test should run a minimum of 100 iterations
- Property tests must include comments referencing the design document property number
- All core implementation tasks must be completed before deployment
- Testing tasks can be parallelized with implementation where appropriate

## Success Criteria

- Payment completion rate > 95%
- Average payment processing time < 60 seconds
- Payment error rate < 2%
- All property-based tests passing
- Zero security vulnerabilities
- 100% compliance with requirements


## Payment Reconciliation Implementation

- [x] 11. Payment Reconciliation System
  - [x] 11.1 Create reconciliation utility module
    - Implement reconcilePayments() for date range reconciliation
    - Implement reconcileSession() for individual session verification
    - Implement compareTransactions() for data consistency checks
    - Implement findOrphanedPayments() for detecting incomplete payments
    - Add ReconciliationStatus enum (matched, unmatched, discrepancy, pending_verification)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 11.2 Create reconciliation API endpoints
    - POST /api/reconciliation/run - Run reconciliation for date range
    - GET /api/reconciliation/report - Generate and download CSV report
    - GET /api/reconciliation/session/:sessionId - Reconcile specific session
    - POST /api/reconciliation/verify/:sessionId - Verify against M-Pesa API
    - GET /api/reconciliation/orphaned - Find orphaned payments
    - GET /api/reconciliation/summary - Get dashboard statistics
    - Add admin-only access control middleware
    - _Requirements: 11.2, 11.3, 11.4, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 11.3 Implement automatic daily reconciliation
    - Create schedule-reconciliation.js script
    - Use node-cron for scheduling at 11 PM EAT
    - Implement performDailyReconciliation() function
    - Add error handling and retry logic
    - Log reconciliation results
    - _Requirements: 11.5_
  
  - [x] 11.4 Create admin reconciliation dashboard
    - Build ReconciliationDashboard.js component
    - Display summary cards (today, week, month, orphaned)
    - Add date range selector for manual reconciliation
    - Show reconciliation results with status indicators
    - Implement CSV report download
    - Add transaction details dialog
    - Display orphaned payments table
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_
  
  - [x] 11.5 Create reconciliation documentation
    - Write PAYMENT_RECONCILIATION_GUIDE.md with full documentation
    - Create RECONCILIATION_QUICK_START.md for quick setup
    - Document all API endpoints with examples
    - Add troubleshooting guide
    - Include best practices and security considerations
    - _Requirements: All reconciliation requirements_
  
  - [x] 11.6 Create reconciliation test suite
    - Write test-reconciliation.js for automated testing
    - Test admin authentication
    - Test summary endpoint
    - Test orphaned payments detection
    - Test manual reconciliation
    - Test report generation
    - Test access control
    - _Requirements: 15.1, 15.2, 15.3_

## Reconciliation System Features Implemented

✅ **Core Functionality**
- Automatic daily reconciliation at 11 PM EAT
- Manual reconciliation for any date range
- Individual session verification
- Transaction verification against M-Pesa API
- Orphaned payment detection
- Duplicate transaction ID detection
- Amount consistency validation
- Status consistency validation

✅ **Admin Dashboard**
- Real-time payment statistics
- Visual reconciliation results
- Detailed issue tracking
- CSV report export
- Transaction details view
- Orphaned payments management

✅ **API Endpoints**
- 6 comprehensive endpoints
- Admin-only access control
- Proper error handling
- Detailed response data

✅ **Documentation**
- Complete implementation guide
- Quick start guide (10 minutes)
- API documentation with examples
- Troubleshooting guide
- Best practices

✅ **Testing**
- Automated test suite
- 7 comprehensive tests
- Access control verification
- Error handling validation

## Next Steps (Optional Enhancements)

- [x] Email alerts for discrepancies

- [x] SMS notifications to admin





- [-] Automatic resolution of common issues



- [x] Machine learning for fraud detection



- [x] Integration with accounting software





- [x] Real-time reconciliation (not just daily)





- [x] Webhook for reconciliation completion





- [x] Historical trend analysis





- [x] Predictive analytics






---

**Reconciliation System Status:** ✅ Complete and Production Ready
**Last Updated:** December 10, 2024
