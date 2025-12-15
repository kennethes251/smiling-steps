# M-Pesa Payment Integration - Requirements Document

## Introduction

This document specifies the requirements for integrating M-Pesa STK Push payment functionality into the Smiling Steps teletherapy platform. The integration enables clients to pay for therapy sessions using M-Pesa, Kenya's leading mobile money service, providing a seamless, secure, and familiar payment experience. The system automates payment verification, reduces manual reconciliation, and ensures compliance with financial and healthcare data protection regulations.

## Glossary

- **Client**: A user seeking therapy services who books and pays for sessions
- **Therapist**: A licensed mental health professional providing therapy services
- **Session**: A scheduled therapy appointment between a client and therapist
- **M-Pesa**: Safaricom's mobile money transfer service used for payments
- **STK Push**: SIM Toolkit Push technology that sends payment prompts to user's phone
- **Payment System**: The Smiling Steps platform component handling payment processing
- **Daraja API**: Safaricom's M-Pesa API for business integrations
- **Checkout Request ID**: Unique identifier for each M-Pesa payment transaction
- **Transaction ID**: M-Pesa receipt number confirming successful payment
- **Payment Status**: Current state of payment (Pending, Processing, Paid, Failed)
- **Session Status**: Current state of session (Pending, Approved, Confirmed, Completed)
- **Webhook**: Server endpoint receiving payment notifications from M-Pesa
- **Admin**: Platform administrator managing system configuration and monitoring
- **Fraud Detection System**: Machine learning-based system for identifying suspicious payment patterns
- **Risk Score**: Numerical value (0-100) indicating the likelihood of fraudulent activity
- **Fraud Alert**: Notification triggered when suspicious activity is detected
- **Behavioral Pattern**: Historical user payment and session booking patterns
- **Anomaly**: Payment behavior that deviates significantly from established patterns
- **Fraud Model**: Machine learning algorithm trained to identify fraudulent transactions
- **Feature Vector**: Set of transaction attributes used for fraud detection analysis

## Requirements

### Requirement 1: Session Booking and Approval

**User Story:** As a client, I want to book therapy sessions and receive approval from therapists, so that I can proceed to payment once my session is confirmed.

#### Acceptance Criteria

1. WHEN a client selects a therapist and session details, THE Payment System SHALL create a session record with status "Pending Approval"
2. WHEN a session is created, THE Payment System SHALL send a notification to the selected therapist
3. WHEN a therapist approves a session, THE Payment System SHALL update the session status to "Approved"
4. WHEN a session status changes to "Approved", THE Payment System SHALL send a payment notification to the client
5. WHILE a session has status "Pending Approval", THE Payment System SHALL prevent payment initiation

### Requirement 2: M-Pesa Payment Initiation

**User Story:** As a client with an approved session, I want to initiate payment using my M-Pesa phone number, so that I can pay quickly using a familiar method.

#### Acceptance Criteria

1. WHEN a client accesses an approved session, THE Payment System SHALL display a "Pay with M-Pesa" option
2. WHEN a client selects M-Pesa payment, THE Payment System SHALL display a phone number input field
3. WHEN a client enters a phone number, THE Payment System SHALL validate the format matches Kenyan mobile number patterns
4. WHEN a client submits a valid phone number, THE Payment System SHALL send an STK Push request to the M-Pesa Daraja API within 3 seconds
5. IF a phone number format is invalid, THEN THE Payment System SHALL display an error message specifying the correct format
6. WHEN an STK Push is initiated, THE Payment System SHALL store the Checkout Request ID in the session record
7. WHEN an STK Push is sent, THE Payment System SHALL display a "Check your phone" message to the client

### Requirement 3: STK Push Delivery and User Interaction

**User Story:** As a client who initiated payment, I want to receive a payment prompt on my phone, so that I can authorize the payment using my M-Pesa PIN.

#### Acceptance Criteria

1. WHEN the M-Pesa Daraja API receives an STK Push request, THE Payment System SHALL deliver the prompt to the client's phone within 10 seconds
2. WHEN an STK Push is delivered, THE Payment System SHALL display the business name "Smiling Steps Therapy" on the client's phone
3. WHEN an STK Push is delivered, THE Payment System SHALL display the exact session amount on the client's phone
4. WHILE an STK Push is active, THE Payment System SHALL allow the client 120 seconds to respond
5. IF 120 seconds elapse without response, THEN THE Payment System SHALL mark the payment attempt as timed out

### Requirement 4: Payment Status Monitoring

**User Story:** As a client completing payment, I want to see real-time status updates, so that I know when my payment is being processed and confirmed.

#### Acceptance Criteria

1. WHEN an STK Push is active, THE Payment System SHALL poll payment status every 3 seconds
2. WHEN payment status changes, THE Payment System SHALL update the user interface within 1 second
3. WHILE payment is processing, THE Payment System SHALL display a progress indicator to the client
4. WHEN payment status is "Processing", THE Payment System SHALL continue polling for up to 120 seconds
5. IF payment status remains unclear after 120 seconds, THEN THE Payment System SHALL query the M-Pesa Daraja API directly

### Requirement 5: Successful Payment Processing

**User Story:** As a client who completed payment, I want to receive immediate confirmation with transaction details, so that I have proof of payment and my session is confirmed.

#### Acceptance Criteria

1. WHEN M-Pesa processes a successful payment, THE Payment System SHALL receive a callback notification within 15 seconds
2. WHEN a payment callback is received, THE Payment System SHALL verify the callback signature matches the expected value
3. WHEN a payment is confirmed, THE Payment System SHALL update the session payment status to "Paid"
4. WHEN a payment is confirmed, THE Payment System SHALL update the session status to "Confirmed"
5. WHEN a payment is confirmed, THE Payment System SHALL store the M-Pesa Transaction ID in the session record
6. WHEN a payment is confirmed, THE Payment System SHALL display a success message with transaction details to the client
7. WHEN a payment is confirmed, THE Payment System SHALL send a confirmation notification to the therapist
8. WHEN a payment is confirmed, THE Payment System SHALL send a confirmation email to the client containing the M-Pesa Transaction ID

### Requirement 6: Payment Failure Handling

**User Story:** As a client experiencing payment issues, I want to understand what went wrong and how to resolve it, so that I can successfully complete my payment.

#### Acceptance Criteria

1. WHEN a client cancels an STK Push prompt, THE Payment System SHALL display a message "Payment Cancelled" with an option to retry
2. WHEN M-Pesa returns insufficient funds error, THE Payment System SHALL display a message instructing the client to add funds and retry
3. WHEN M-Pesa returns incorrect PIN error, THE Payment System SHALL display a message instructing the client to enter the correct PIN and retry
4. WHEN a payment fails, THE Payment System SHALL maintain the session status as "Approved"
5. WHEN a payment fails, THE Payment System SHALL allow the client to retry payment immediately
6. WHEN a payment fails, THE Payment System SHALL log the failure reason for support team review
7. IF a payment times out, THEN THE Payment System SHALL display a message with instructions to check M-Pesa messages and retry if needed

### Requirement 7: Therapist Payment Visibility

**User Story:** As a therapist, I want to see payment confirmations automatically in my dashboard, so that I know which sessions are confirmed without manual verification.

#### Acceptance Criteria

1. WHEN a payment is confirmed, THE Payment System SHALL update the therapist's dashboard within 5 seconds
2. WHEN a therapist views their dashboard, THE Payment System SHALL display payment status for each session
3. WHEN a therapist views session details, THE Payment System SHALL display the M-Pesa Transaction ID
4. WHEN a payment is confirmed, THE Payment System SHALL send a notification to the therapist
5. WHILE viewing sessions, THE Payment System SHALL visually distinguish between paid and unpaid sessions

### Requirement 8: Admin Payment Management

**User Story:** As an admin, I want to monitor and reconcile M-Pesa payments, so that I can ensure all transactions are properly recorded and resolve any discrepancies.

#### Acceptance Criteria

1. WHEN an admin accesses the payment dashboard, THE Payment System SHALL display all M-Pesa transactions
2. WHEN an admin views transactions, THE Payment System SHALL display transaction date, amount, client, therapist, and M-Pesa Transaction ID
3. WHEN an admin searches transactions, THE Payment System SHALL filter results by date range, client, therapist, or transaction ID
4. WHEN an admin requests a report, THE Payment System SHALL generate a downloadable CSV file of transactions
5. WHEN an admin tests M-Pesa connectivity, THE Payment System SHALL verify API credentials and display connection status
6. WHEN a payment fails, THE Payment System SHALL log the error details visible to admins
7. WHEN an admin views failed payments, THE Payment System SHALL display the failure reason and timestamp

### Requirement 9: Security and Data Protection

**User Story:** As a platform user, I want my payment data to be secure and private, so that my financial information is protected.

#### Acceptance Criteria

1. WHEN any payment data is transmitted, THE Payment System SHALL use TLS 1.2 or higher encryption
2. WHEN M-Pesa credentials are stored, THE Payment System SHALL encrypt them using industry-standard encryption
3. WHEN a webhook callback is received, THE Payment System SHALL verify the signature before processing
4. WHEN payment data is logged, THE Payment System SHALL mask phone numbers showing only the last 4 digits
5. THE Payment System SHALL NOT store M-Pesa PINs at any time
6. WHEN a user requests data deletion, THE Payment System SHALL anonymize payment records while retaining transaction IDs for compliance
7. WHEN accessing payment endpoints, THE Payment System SHALL require valid authentication tokens

### Requirement 10: Performance and Reliability

**User Story:** As a client making payment, I want the process to be fast and reliable, so that I can complete my booking without delays or technical issues.

#### Acceptance Criteria

1. WHEN a client initiates payment, THE Payment System SHALL respond within 3 seconds
2. WHEN an STK Push is sent, THE Payment System SHALL deliver it to the client's phone within 10 seconds
3. WHEN a payment callback is received, THE Payment System SHALL process it within 5 seconds
4. WHEN multiple clients make concurrent payments, THE Payment System SHALL process each transaction independently without interference
5. WHEN the M-Pesa API is unavailable, THE Payment System SHALL display an error message and allow retry after 30 seconds
6. THE Payment System SHALL maintain 99.9% uptime for payment services during business hours (6 AM - 10 PM EAT)

### Requirement 11: Payment Reconciliation

**User Story:** As an admin, I want automatic payment reconciliation, so that I can verify all M-Pesa transactions match our records without manual checking.

#### Acceptance Criteria

1. WHEN a payment is confirmed, THE Payment System SHALL store the M-Pesa Transaction ID, amount, phone number, and timestamp
2. WHEN an admin requests reconciliation, THE Payment System SHALL compare stored transactions with M-Pesa records
3. WHEN a discrepancy is detected, THE Payment System SHALL flag the transaction for manual review
4. WHEN reconciliation is complete, THE Payment System SHALL generate a report showing matched and unmatched transactions
5. THE Payment System SHALL perform automatic reconciliation daily at 11 PM EAT

### Requirement 12: Notification System

**User Story:** As a user, I want to receive timely notifications about payment status, so that I stay informed throughout the payment process.

#### Acceptance Criteria

1. WHEN a session is approved, THE Payment System SHALL send an email notification to the client with payment instructions
2. WHEN a payment is confirmed, THE Payment System SHALL send an email confirmation to the client within 30 seconds
3. WHEN a payment is confirmed, THE Payment System SHALL send an in-app notification to the therapist within 5 seconds
4. WHEN a payment fails, THE Payment System SHALL send an in-app notification to the client with the failure reason
5. WHEN a session is 24 hours away, THE Payment System SHALL send an SMS reminder to the client
6. WHEN a session is 1 hour away, THE Payment System SHALL send an SMS reminder to both client and therapist

### Requirement 13: Compliance and Audit Trail

**User Story:** As a compliance officer, I want complete audit trails of all payment transactions, so that we can demonstrate regulatory compliance.

#### Acceptance Criteria

1. WHEN any payment action occurs, THE Payment System SHALL log the action with timestamp, user ID, and action type
2. WHEN a payment is initiated, THE Payment System SHALL record the client ID, session ID, amount, and phone number
3. WHEN a payment status changes, THE Payment System SHALL record the previous status, new status, and reason for change
4. WHEN an admin accesses payment data, THE Payment System SHALL log the admin ID, accessed data, and timestamp
5. THE Payment System SHALL retain payment audit logs for 7 years
6. WHEN audit logs are requested, THE Payment System SHALL provide them in a tamper-evident format
7. THE Payment System SHALL comply with Kenya Data Protection Act requirements for financial data

### Requirement 14: Error Recovery and Resilience

**User Story:** As a system administrator, I want the payment system to recover gracefully from errors, so that temporary issues don't result in lost payments or data.

#### Acceptance Criteria

1. WHEN the M-Pesa API is temporarily unavailable, THE Payment System SHALL queue payment requests and retry after 30 seconds
2. WHEN a webhook callback fails to process, THE Payment System SHALL retry processing up to 3 times with exponential backoff
3. WHEN a database connection fails during payment processing, THE Payment System SHALL rollback the transaction and notify the client to retry
4. WHEN payment status is unclear, THE Payment System SHALL query the M-Pesa API directly to verify the transaction
5. WHEN a duplicate payment callback is received, THE Payment System SHALL detect and ignore it to prevent double-charging
6. WHEN the system restarts, THE Payment System SHALL resume monitoring all pending payments

### Requirement 15: Testing and Sandbox Support

**User Story:** As a developer, I want to test payment functionality in a sandbox environment, so that I can verify the integration without processing real payments.

#### Acceptance Criteria

1. WHEN the system is in sandbox mode, THE Payment System SHALL use M-Pesa sandbox credentials
2. WHEN a payment is initiated in sandbox mode, THE Payment System SHALL clearly indicate "TEST MODE" to users
3. WHEN sandbox mode is active, THE Payment System SHALL use test phone numbers provided by Safaricom
4. WHEN switching between sandbox and production, THE Payment System SHALL require admin authentication
5. THE Payment System SHALL prevent sandbox transactions from affecting production data
6. WHEN testing is complete, THE Payment System SHALL provide a summary of test transactions for verification

### Requirement 16: Fraud Detection and Prevention

**User Story:** As a platform administrator, I want an intelligent fraud detection system to identify and prevent suspicious payment activities, so that we can protect clients and maintain payment system integrity.

#### Acceptance Criteria

1. WHEN a payment is initiated, THE Fraud Detection System SHALL analyze the transaction within 2 seconds and assign a risk score
2. WHEN a transaction receives a risk score above 70, THE Fraud Detection System SHALL flag it for manual review before processing
3. WHEN a transaction receives a risk score above 90, THE Fraud Detection System SHALL automatically block the payment and notify the admin
4. WHEN analyzing transactions, THE Fraud Detection System SHALL consider payment amount, frequency, time patterns, device fingerprints, and user behavior history
5. WHEN a user attempts multiple failed payments within 10 minutes, THE Fraud Detection System SHALL temporarily block further payment attempts for 30 minutes
6. WHEN suspicious patterns are detected, THE Fraud Detection System SHALL send real-time alerts to administrators within 30 seconds
7. WHEN a payment is blocked due to fraud detection, THE Payment System SHALL display a security message to the user and provide contact information for support

### Requirement 17: Machine Learning Model Training and Updates

**User Story:** As a data scientist, I want the fraud detection system to continuously learn and improve from new transaction data, so that it becomes more accurate at identifying fraudulent activities over time.

#### Acceptance Criteria

1. WHEN new transaction data is available, THE Fraud Detection System SHALL retrain the machine learning model weekly using the latest 90 days of transaction data
2. WHEN retraining the model, THE Fraud Detection System SHALL use confirmed fraud cases, successful payments, and admin-reviewed transactions as training data
3. WHEN a new model is trained, THE Fraud Detection System SHALL validate its performance against a holdout dataset before deployment
4. WHEN model performance metrics (precision, recall, F1-score) drop below 85%, THE Fraud Detection System SHALL alert administrators and revert to the previous model
5. WHEN deploying a new model, THE Fraud Detection System SHALL perform A/B testing with 10% of transactions for 48 hours before full deployment
6. WHEN model training is complete, THE Fraud Detection System SHALL generate a performance report showing accuracy improvements and false positive rates

### Requirement 18: Behavioral Pattern Analysis

**User Story:** As a security analyst, I want the system to learn normal user behavior patterns, so that it can detect when users deviate from their typical payment and booking habits.

#### Acceptance Criteria

1. WHEN a user makes their first payment, THE Fraud Detection System SHALL establish a baseline behavioral profile including typical payment amounts, session types, and timing patterns
2. WHEN a user has completed 5 or more transactions, THE Fraud Detection System SHALL calculate their normal payment range and flag transactions exceeding 3 standard deviations
3. WHEN a user typically books sessions during business hours but attempts payment at 3 AM, THE Fraud Detection System SHALL increase the risk score by 20 points
4. WHEN a user's payment amount is 5 times higher than their historical average, THE Fraud Detection System SHALL flag the transaction for review
5. WHEN a user attempts to book multiple sessions with different therapists simultaneously, THE Fraud Detection System SHALL flag this as suspicious behavior
6. WHEN analyzing behavior patterns, THE Fraud Detection System SHALL consider session frequency, preferred therapists, payment timing, and geographic location consistency

### Requirement 19: Real-time Fraud Monitoring Dashboard

**User Story:** As an administrator, I want a real-time dashboard showing fraud detection metrics and alerts, so that I can monitor system security and respond quickly to threats.

#### Acceptance Criteria

1. WHEN an admin accesses the fraud monitoring dashboard, THE Fraud Detection System SHALL display current risk score distribution, blocked transactions, and alert summary
2. WHEN displaying fraud metrics, THE Fraud Detection System SHALL show hourly transaction volume, fraud detection rate, false positive rate, and model accuracy
3. WHEN a high-risk transaction is detected, THE Fraud Detection System SHALL display it prominently on the dashboard with user details and risk factors
4. WHEN an admin reviews a flagged transaction, THE Fraud Detection System SHALL provide detailed analysis including risk factors, user history, and recommended actions
5. WHEN fraud patterns are identified, THE Fraud Detection System SHALL generate trend reports showing attack vectors, affected user segments, and prevention effectiveness
6. WHEN the dashboard is accessed, THE Fraud Detection System SHALL update all metrics in real-time with no more than 5-second delay

### Requirement 20: Fraud Investigation and Response

**User Story:** As a security administrator, I want comprehensive tools to investigate suspected fraud cases and take appropriate action, so that I can protect the platform and its users.

#### Acceptance Criteria

1. WHEN a transaction is flagged for manual review, THE Fraud Detection System SHALL provide a detailed investigation interface with user history, transaction timeline, and risk analysis
2. WHEN investigating a fraud case, THE Fraud Detection System SHALL display related transactions, device information, IP addresses, and behavioral anomalies
3. WHEN an admin confirms a transaction as fraudulent, THE Fraud Detection System SHALL automatically block the associated user account and phone number
4. WHEN fraud is confirmed, THE Fraud Detection System SHALL add the case to the training dataset and update risk scoring algorithms within 24 hours
5. WHEN a user account is blocked for fraud, THE Fraud Detection System SHALL send notifications to affected therapists and cancel any pending sessions
6. WHEN investigating patterns, THE Fraud Detection System SHALL provide tools to search transactions by risk factors, user attributes, and time ranges
7. WHEN fraud investigation is complete, THE Fraud Detection System SHALL generate a case report with findings, actions taken, and prevention recommendations

### Requirement 21: Integration with External Fraud Databases

**User Story:** As a risk management officer, I want the system to check against external fraud databases and blacklists, so that we can identify known fraudulent phone numbers and patterns.

#### Acceptance Criteria

1. WHEN a payment is initiated, THE Fraud Detection System SHALL check the phone number against known fraud databases within 1 second
2. WHEN a phone number is found in fraud databases, THE Fraud Detection System SHALL automatically block the transaction and log the attempt
3. WHEN integrating with external databases, THE Fraud Detection System SHALL maintain an updated local cache refreshed every 6 hours
4. WHEN external database queries fail, THE Fraud Detection System SHALL continue processing with internal fraud detection only and log the failure
5. WHEN a new fraud pattern is identified internally, THE Fraud Detection System SHALL have the capability to report it to external fraud prevention networks
6. WHEN checking external databases, THE Fraud Detection System SHALL ensure all queries are encrypted and comply with data protection regulations

### Requirement 22: Fraud Detection Performance and Scalability

**User Story:** As a system architect, I want the fraud detection system to perform efficiently under high transaction volumes, so that it doesn't impact payment processing speed.

#### Acceptance Criteria

1. WHEN processing fraud detection, THE Fraud Detection System SHALL complete analysis within 2 seconds for 99% of transactions
2. WHEN transaction volume increases, THE Fraud Detection System SHALL automatically scale processing capacity to maintain performance
3. WHEN the system processes 1000 concurrent transactions, THE Fraud Detection System SHALL maintain sub-2-second response times
4. WHEN fraud detection services are unavailable, THE Payment System SHALL continue processing with basic rule-based checks and alert administrators
5. WHEN system load is high, THE Fraud Detection System SHALL prioritize high-risk transactions for immediate analysis
6. WHEN performance degrades, THE Fraud Detection System SHALL automatically switch to a lightweight detection mode and notify administrators

## Non-Functional Requirements

### Usability
- Payment interface SHALL be accessible on mobile devices with screen sizes 320px and above
- Payment flow SHALL require no more than 4 user interactions from initiation to confirmation
- Error messages SHALL use plain language without technical jargon
- Payment status SHALL be visible at all times during the process
- Fraud detection alerts SHALL be presented in user-friendly language without technical details

### Scalability
- Payment System SHALL support up to 100 concurrent payment transactions
- Payment System SHALL handle up to 1000 transactions per day
- Database queries SHALL complete within 100 milliseconds for 95% of requests
- Fraud Detection System SHALL scale to analyze 10,000 transactions per day
- Machine learning model inference SHALL complete within 500 milliseconds

### Maintainability
- Payment code SHALL be modular and follow single responsibility principle
- Payment API SHALL be versioned to support backward compatibility
- Payment configuration SHALL be externalized in environment variables
- Payment logs SHALL be structured for easy parsing and analysis
- Fraud detection models SHALL be versioned and deployable independently
- Fraud detection rules SHALL be configurable without code changes

### Compatibility
- Payment System SHALL work with all major web browsers (Chrome, Firefox, Safari, Edge)
- Payment System SHALL support M-Pesa API version 1.0 and above
- Payment System SHALL integrate with existing session management system
- Payment System SHALL support both MongoDB and PostgreSQL databases
- Fraud Detection System SHALL support TensorFlow and scikit-learn model formats
- Fraud detection APIs SHALL be compatible with existing payment processing workflows

### Security
- Fraud detection data SHALL be encrypted using AES-256 encryption
- Machine learning models SHALL not expose sensitive user information
- Fraud detection logs SHALL be tamper-evident and immutable
- Access to fraud detection systems SHALL require multi-factor authentication

## Assumptions

1. Clients have active M-Pesa accounts registered with Safaricom
2. Clients have sufficient M-Pesa balance to complete payments
3. Clients have mobile network connectivity during payment
4. M-Pesa Daraja API credentials are available and approved
5. Platform has valid SSL certificates for webhook endpoints
6. Therapists have set their session rates in the system
7. Sessions are approved before payment is initiated
8. Sufficient historical transaction data exists for machine learning model training
9. External fraud databases are accessible and regularly updated
10. Administrative staff are available to review flagged transactions during business hours
11. Users will accept reasonable security measures that may slightly delay payment processing

## Constraints

1. Must use Safaricom M-Pesa Daraja API (no alternative payment gateways for M-Pesa)
2. Must comply with Kenya Data Protection Act 2019
3. Must comply with PCI DSS requirements for payment data
4. Must maintain HIPAA-equivalent privacy for healthcare data
5. Cannot store M-Pesa PINs or sensitive authentication credentials
6. Must use HTTPS for all payment-related communications
7. Must complete payment processing within 2 minutes to avoid timeout
8. Fraud detection must not add more than 2 seconds to payment processing time
9. Machine learning models must be explainable for regulatory compliance
10. Fraud detection data must be anonymized and encrypted at rest
11. Cannot use biometric data for fraud detection due to privacy regulations

## Success Criteria

The M-Pesa payment integration will be considered successful when:

1. Payment completion rate exceeds 95%
2. Average payment processing time is under 60 seconds
3. Payment error rate is below 2%
4. User satisfaction score for payment experience exceeds 4.5/5
5. Support tickets related to payments are less than 1% of total transactions
6. Zero security incidents related to payment data
7. 100% compliance with regulatory requirements
8. Automatic reconciliation matches 99% of transactions without manual intervention
9. Fraud detection accuracy exceeds 95% with false positive rate below 3%
10. Fraud detection response time is under 2 seconds for 99% of transactions
11. Zero successful fraudulent transactions exceeding $100 USD equivalent
12. Fraud investigation resolution time averages under 4 hours
