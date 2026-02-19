# Payment Reconciliation System - Complete Guide

## Overview

The Payment Reconciliation System automatically verifies and reconciles M-Pesa payment transactions against internal records, ensuring data integrity and identifying discrepancies that require manual review.

## Features

### 1. Automatic Daily Reconciliation
- Runs automatically at 11 PM EAT every day
- Reconciles all payments from the previous day
- Flags discrepancies for admin review
- Generates audit logs

### 2. Manual Reconciliation
- Run reconciliation for any date range
- Filter by client or psychologist
- View detailed results
- Download CSV reports

### 3. Transaction Verification
- Verify individual transactions against M-Pesa API
- Check for duplicate transaction IDs
- Validate payment amounts
- Confirm payment status consistency

### 4. Orphaned Payment Detection
- Identify payments with transaction IDs but incorrect status
- Find sessions marked as paid but not confirmed
- Detect data inconsistencies

### 5. Admin Dashboard
- Real-time payment statistics
- Visual reconciliation results
- Detailed issue tracking
- Export capabilities

## Installation

### 1. Install Dependencies

```bash
npm install node-cron
```

### 2. Server Configuration

The reconciliation system is automatically initialized when the server starts. The scheduler is configured in `server/index.js`:

```javascript
const { scheduleReconciliation } = require('./scripts/schedule-reconciliation');
scheduleReconciliation();
```

### 3. Environment Variables

No additional environment variables are required. The system uses existing M-Pesa configuration.

## API Endpoints

### Run Reconciliation

**POST** `/api/reconciliation/run`

Run payment reconciliation for a specific date range.

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "clientId": "optional-client-id",
  "psychologistId": "optional-psychologist-id"
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalTransactions": 150,
    "matched": 145,
    "unmatched": 3,
    "discrepancies": 2,
    "pendingVerification": 0,
    "totalAmount": 450000,
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  },
  "results": {
    "matched": [...],
    "unmatched": [...],
    "discrepancies": [...],
    "pendingVerification": [...]
  }
}
```

### Download Report

**GET** `/api/reconciliation/report?startDate=2024-01-01&endDate=2024-01-31&format=csv`

Download reconciliation report as CSV file.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `format` (optional): Report format (csv or json), defaults to csv

### Get Session Details

**GET** `/api/reconciliation/session/:sessionId`

Get detailed reconciliation information for a specific session.

**Response:**
```json
{
  "success": true,
  "sessionId": "session-id",
  "status": "matched",
  "transactionId": "QAB123XYZ",
  "amount": 3000,
  "phoneNumber": "****5678",
  "timestamp": "2024-01-15T10:30:00Z",
  "issues": [],
  "session": {
    "id": "session-id",
    "client": "John Doe",
    "psychologist": "Dr. Smith",
    "sessionType": "Individual",
    "price": 3000,
    "paymentStatus": "Paid",
    "status": "Confirmed"
  }
}
```

### Verify Transaction

**POST** `/api/reconciliation/verify/:sessionId`

Verify a transaction directly against M-Pesa API.

**Response:**
```json
{
  "success": true,
  "sessionId": "session-id",
  "storedStatus": "Paid",
  "storedResultCode": 0,
  "mpesaResultCode": "0",
  "mpesaResultDesc": "The service request is processed successfully.",
  "match": true,
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Find Orphaned Payments

**GET** `/api/reconciliation/orphaned`

Find payments with transaction IDs but incorrect session status.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "orphanedPayments": [
    {
      "sessionId": "session-id",
      "transactionId": "QAB123XYZ",
      "paymentStatus": "Paid",
      "sessionStatus": "Approved",
      "amount": 3000,
      "client": "John Doe",
      "psychologist": "Dr. Smith",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Summary

**GET** `/api/reconciliation/summary`

Get payment statistics summary for dashboard.

**Response:**
```json
{
  "success": true,
  "summary": {
    "today": {
      "count": 5,
      "totalAmount": 15000
    },
    "thisWeek": {
      "count": 32,
      "totalAmount": 96000
    },
    "thisMonth": {
      "count": 145,
      "totalAmount": 435000
    },
    "orphanedCount": 2
  },
  "timestamp": "2024-01-15T10:40:00Z"
}
```

## Reconciliation Status Types

### Matched
- All data is consistent
- Payment status is correct
- Transaction ID is valid
- Amount matches session price
- No issues detected

### Unmatched
- Minor inconsistencies detected
- May require verification
- Not critical issues

### Discrepancy
- Serious data inconsistencies
- Duplicate transaction IDs
- Amount mismatches
- Requires immediate attention

### Pending Verification
- No M-Pesa transaction ID yet
- Payment may still be processing
- Normal for recent payments

## Using the Admin Dashboard

### Access the Dashboard

1. Log in as an admin user
2. Navigate to Admin Dashboard
3. Click on "Payment Reconciliation" tab

### Run Manual Reconciliation

1. Select date range using the date pickers
2. Click "Run Reconciliation" button
3. Wait for results to load
4. Review summary statistics

### Download Reports

1. After running reconciliation, click "Download Report"
2. CSV file will be downloaded automatically
3. Open in Excel or Google Sheets for analysis

### View Transaction Details

1. In the results table, click "View Details" for any transaction
2. Review session information
3. Check for issues
4. Take appropriate action if needed

### Handle Orphaned Payments

1. Review the "Orphaned Payments" section
2. Click "View Details" for each orphaned payment
3. Manually verify the payment status
4. Update session status if needed

## Scheduled Reconciliation

### Automatic Daily Run

The system automatically runs reconciliation at 11 PM EAT (8 PM UTC) every day.

**What it does:**
- Reconciles all payments from the previous day
- Generates summary report
- Logs results
- Alerts admin if discrepancies found

### Manual Trigger

You can manually trigger the daily reconciliation:

```bash
node server/scripts/schedule-reconciliation.js
```

This will run reconciliation for yesterday's transactions immediately.

## Troubleshooting

### Issue: Reconciliation shows many discrepancies

**Possible causes:**
- Database migration issues
- Manual data updates
- M-Pesa callback failures

**Solution:**
1. Review each discrepancy individually
2. Verify against M-Pesa transaction history
3. Manually update session status if needed
4. Contact M-Pesa support if transaction data is missing

### Issue: Orphaned payments detected

**Possible causes:**
- Callback processing failure
- Server downtime during payment
- Database transaction rollback

**Solution:**
1. Verify transaction with M-Pesa API using "Verify Transaction"
2. If payment is confirmed, manually update session status
3. If payment failed, notify client to retry

### Issue: Reconciliation fails to run

**Possible causes:**
- Database connection issues
- M-Pesa API unavailable
- Server memory issues

**Solution:**
1. Check server logs for error messages
2. Verify database connectivity
3. Test M-Pesa API connection
4. Restart server if needed

## Best Practices

### 1. Regular Monitoring
- Check reconciliation dashboard daily
- Review orphaned payments weekly
- Download monthly reports for records

### 2. Prompt Action
- Address discrepancies within 24 hours
- Verify suspicious transactions immediately
- Document all manual interventions

### 3. Data Integrity
- Never manually edit transaction IDs
- Always use API endpoints for status updates
- Keep audit trail of all changes

### 4. Reporting
- Generate monthly reconciliation reports
- Share with finance team
- Archive reports for compliance

## Security Considerations

### Access Control
- Only admin users can access reconciliation endpoints
- All actions are logged with user ID
- Sensitive data (phone numbers) is masked in logs

### Data Protection
- Transaction data is encrypted in transit
- Phone numbers are partially masked in reports
- Audit logs are tamper-evident

### Compliance
- 7-year retention of audit logs
- GDPR-compliant data handling
- Kenya Data Protection Act compliance

## Integration with Existing Systems

### M-Pesa Integration
The reconciliation system uses the existing M-Pesa API configuration:
- OAuth token management
- STK Query for verification
- Callback validation

### Session Management
Integrates seamlessly with session booking system:
- Reads session payment data
- Updates session status when needed
- Maintains data consistency

### Admin Dashboard
Adds new tab to existing admin dashboard:
- Consistent UI/UX
- Same authentication
- Integrated navigation

## Future Enhancements

### Implemented Features
1. ✅ Email alerts for discrepancies
2. ✅ SMS notifications to admin
3. Automatic resolution of common issues (planned)

## Admin Notifications

### Email Alerts
When discrepancies are detected, detailed email alerts are sent to the configured admin email address containing:
- Summary of discrepancies found
- Detailed breakdown of issues
- Recommended actions
- Direct link to reconciliation dashboard

### SMS Alerts
Immediate SMS notifications are sent to admin phone numbers for urgent attention:
- Concise summary of issue counts and amounts
- Direction to check admin dashboard
- Sent simultaneously with email alerts

### Configuration
```bash
# Email alerts
ADMIN_EMAIL=admin@smilingsteps.com

# SMS alerts (requires Africa's Talking account)
ADMIN_PHONE=+254700000000
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key
```

For detailed SMS setup instructions, see [Admin SMS Notifications Guide](ADMIN_SMS_NOTIFICATIONS_GUIDE.md).
4. Machine learning for fraud detection
5. Integration with accounting software
6. Real-time reconciliation (not just daily)

### API Improvements
1. Webhook for reconciliation completion
2. Batch transaction verification
3. Historical trend analysis
4. Predictive analytics

## Support

For issues or questions:
1. Check server logs: `tail -f logs/reconciliation.log`
2. Review this documentation
3. Contact system administrator
4. Escalate to development team if needed

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Daily automatic reconciliation
- Manual reconciliation with date range
- CSV report generation
- Orphaned payment detection
- Admin dashboard integration
- Transaction verification
- Comprehensive logging

---

**Last Updated:** December 10, 2024
**Version:** 1.0.0
**Status:** Production Ready
