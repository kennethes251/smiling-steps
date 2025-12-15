# Payment Reconciliation Email Alerts - Implementation Guide

## Overview

The payment reconciliation system now includes automatic email alerts that notify administrators when discrepancies are detected during reconciliation. This ensures timely awareness and resolution of payment issues.

## Features

### ✅ Automatic Email Alerts

- **Daily Reconciliation Alerts**: Automatically sent at 11 PM EAT after daily reconciliation
- **Manual Reconciliation Alerts**: Sent immediately when admin runs manual reconciliation
- **Smart Detection**: Only sends alerts when discrepancies or unmatched transactions are found
- **Detailed Reports**: Includes comprehensive summary and transaction details

### 📧 Email Content

Each alert email includes:

1. **Summary Statistics**
   - Total transactions reconciled
   - Number of matched transactions
   - Number of discrepancies (critical issues)
   - Number of unmatched transactions
   - Total amount processed
   - Date range covered

2. **Discrepancy Details**
   - Session ID
   - Transaction ID
   - Amount
   - Specific issues detected
   - Up to 10 most recent discrepancies (with count of additional ones)

3. **Unmatched Transaction Details**
   - Session ID
   - Transaction ID
   - Amount
   - Specific issues detected
   - Up to 10 most recent unmatched transactions

4. **Recommended Actions**
   - Step-by-step guidance for resolving issues
   - Link to admin dashboard for detailed review

## Configuration

### Environment Variables

Add the following to your `server/.env` file:

```bash
# Email Configuration (Required)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Smiling Steps <noreply@smilingsteps.com>

# Admin Email (Receives reconciliation alerts)
ADMIN_EMAIL=admin@smilingsteps.com

# Client URL (For dashboard links in emails)
CLIENT_URL=https://smilingsteps.com
```

### Gmail Setup (Recommended)

If using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings → Security
   - Select "2-Step Verification"
   - Scroll to "App passwords"
   - Generate a new app password for "Mail"
3. Use the generated password as `EMAIL_PASS`

### Alternative Email Providers

The system supports any SMTP provider:

- **SendGrid**: `smtp.sendgrid.net` (Port 587)
- **Mailgun**: `smtp.mailgun.org` (Port 587)
- **AWS SES**: `email-smtp.region.amazonaws.com` (Port 587)
- **Outlook**: `smtp-mail.outlook.com` (Port 587)

## How It Works

### Automatic Daily Alerts

```javascript
// Runs automatically at 11 PM EAT via cron job
// Located in: server/scripts/schedule-reconciliation.js

1. Daily reconciliation runs for previous day's transactions
2. System checks for discrepancies and unmatched transactions
3. If issues found, email alert is sent to ADMIN_EMAIL
4. Admin receives detailed report with actionable information
```

### Manual Reconciliation Alerts

```javascript
// Triggered when admin runs manual reconciliation
// Located in: server/routes/reconciliation.js

1. Admin runs reconciliation via dashboard or API
2. System processes transactions for specified date range
3. If issues found, email alert is sent to admin's email
4. Admin receives immediate notification of issues
```

## Alert Triggers

Alerts are sent when any of the following are detected:

### Critical Discrepancies
- **Amount Mismatch**: M-Pesa amount differs from session price
- **Duplicate Transaction**: Same transaction ID used in multiple sessions
- **Result Code Mismatch**: Payment marked as Paid but result code indicates failure

### Unmatched Transactions
- **Status Mismatch**: Transaction ID exists but payment status is not Paid
- **Missing Transaction ID**: Session marked as paid but no M-Pesa transaction ID
- **Timestamp Discrepancy**: Payment timestamp differs significantly from M-Pesa record

## Testing

### Test Email Alerts

Run the test script to verify email configuration:

```bash
node test-reconciliation-email-alert.js
```

This will:
1. Check email configuration
2. Send test alerts with mock discrepancies
3. Verify alert skipping when no issues exist
4. Test truncation of large discrepancy lists

### Expected Output

```
🧪 Testing Reconciliation Email Alert System

📧 Sending test alert to: admin@smilingsteps.com

Test 1: Sending alert with discrepancies and unmatched transactions...
✅ Test 1 PASSED: Alert sent successfully
   Message ID: <message-id@smtp.gmail.com>

Test 2: Testing with no discrepancies (should skip)...
✅ Test 2 PASSED: Correctly skipped when no discrepancies

Test 3: Testing with many discrepancies (should show first 10)...
✅ Test 3 PASSED: Alert sent with truncated list
   Message ID: <message-id@smtp.gmail.com>

✅ All tests completed!
```

## API Integration

### Manual Reconciliation with Alerts

```javascript
// POST /api/reconciliation/run
// Automatically sends email if discrepancies found

const response = await fetch('/api/reconciliation/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-auth-token': adminToken
  },
  body: JSON.stringify({
    startDate: '2024-12-01',
    endDate: '2024-12-14'
  })
});

// If discrepancies found, admin receives email immediately
```

## Email Template Customization

The email template can be customized in:
```
server/utils/notificationService.js
Function: sendReconciliationDiscrepancyAlert()
```

### Customizable Elements

1. **Subject Line**: Modify alert severity or format
2. **Header Color**: Change from red (#d32f2f) to match branding
3. **Summary Table**: Add or remove statistics
4. **Detail Tables**: Adjust columns or formatting
5. **Action Items**: Customize recommended steps
6. **Dashboard Link**: Update URL or button styling

## Troubleshooting

### Email Not Sending

**Check Configuration**:
```bash
# Verify environment variables are set
echo $EMAIL_HOST
echo $EMAIL_USER
echo $ADMIN_EMAIL
```

**Check Logs**:
```bash
# Look for email sending errors
tail -f server/logs/app.log | grep "Email"
```

**Common Issues**:
- ❌ Invalid credentials → Regenerate app password
- ❌ Port blocked → Try port 465 (SSL) instead of 587
- ❌ Rate limiting → Use dedicated SMTP service (SendGrid, Mailgun)

### Alert Not Triggered

**Verify Discrepancies Exist**:
```bash
# Run manual reconciliation to check
curl -X POST http://localhost:5000/api/reconciliation/run \
  -H "x-auth-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-12-13","endDate":"2024-12-14"}'
```

**Check Alert Logic**:
```javascript
// Alerts only sent if:
summary.discrepancies > 0 || summary.unmatched > 0
```

### Email Goes to Spam

**Improve Deliverability**:
1. Use a verified domain email address
2. Set up SPF, DKIM, and DMARC records
3. Use a dedicated SMTP service
4. Avoid spam trigger words in subject/body
5. Include unsubscribe link (for production)

## Best Practices

### 1. Monitor Alert Frequency

- **Daily alerts**: Normal for active platform
- **Multiple alerts per day**: Investigate system issues
- **No alerts for weeks**: Verify cron job is running

### 2. Response Time

- **Critical discrepancies**: Review within 24 hours
- **Unmatched transactions**: Review within 48 hours
- **Pending verification**: Review weekly

### 3. Documentation

- Keep records of all manual corrections
- Document recurring issues and solutions
- Update reconciliation rules as needed

### 4. Escalation

Set up escalation for:
- Unresolved discrepancies after 3 days
- Large amount discrepancies (>KES 10,000)
- Multiple duplicate transactions

## Integration with Other Systems

### Slack Integration (Optional)

Add Slack webhook for instant notifications:

```javascript
// In server/utils/notificationService.js
const sendSlackAlert = async (summary) => {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `⚠️ Payment Reconciliation Alert: ${summary.discrepancies} discrepancies detected`
    })
  });
};
```

### SMS Alerts (Optional)

For critical issues, send SMS to admin:

```javascript
// In server/utils/paymentReconciliation.js
if (results.summary.discrepancies > 5) {
  await sendSMS({
    to: process.env.ADMIN_PHONE,
    message: `URGENT: ${results.summary.discrepancies} payment discrepancies detected. Check email for details.`
  });
}
```

## Security Considerations

### Email Security

- ✅ Use TLS/SSL for SMTP connections
- ✅ Store credentials in environment variables
- ✅ Never commit credentials to version control
- ✅ Use app-specific passwords, not account passwords
- ✅ Rotate credentials regularly

### Data Privacy

- ✅ Mask phone numbers in emails (show last 4 digits only)
- ✅ Don't include full client names in alerts
- ✅ Use session IDs instead of personal information
- ✅ Secure email transmission (TLS 1.2+)

## Monitoring and Metrics

### Key Metrics to Track

1. **Alert Frequency**: Number of alerts per week
2. **Response Time**: Time from alert to resolution
3. **Discrepancy Rate**: Percentage of transactions with issues
4. **Resolution Rate**: Percentage of issues resolved
5. **False Positive Rate**: Alerts that weren't actual issues

### Dashboard Integration

The reconciliation dashboard shows:
- Recent alerts sent
- Alert history
- Resolution status
- Trending issues

## Support

### Getting Help

If you encounter issues:

1. Check this documentation
2. Review server logs
3. Run test script to verify configuration
4. Contact system administrator

### Reporting Issues

When reporting issues, include:
- Error messages from logs
- Email configuration (without passwords)
- Test script output
- Steps to reproduce

## Changelog

### Version 1.0 (December 2024)
- ✅ Initial implementation
- ✅ Automatic daily alerts
- ✅ Manual reconciliation alerts
- ✅ Detailed email templates
- ✅ Smart alert triggering
- ✅ Test suite

### Future Enhancements
- [ ] Slack integration
- [ ] SMS alerts for critical issues
- [ ] Alert preferences per admin
- [ ] Weekly summary reports
- [ ] Alert acknowledgment system

---

**Last Updated**: December 14, 2024  
**Status**: ✅ Production Ready
