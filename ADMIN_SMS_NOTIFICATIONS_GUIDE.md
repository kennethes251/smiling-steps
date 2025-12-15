# Admin SMS Notifications Guide

## Overview

The admin SMS notification system provides real-time alerts to administrators when payment reconciliation discrepancies are detected. This ensures immediate awareness of critical payment issues that require urgent attention.

## Features

### Automatic SMS Alerts
- **Trigger**: Sent automatically when daily reconciliation detects discrepancies or unmatched transactions
- **Timing**: Sent immediately after reconciliation completes (11 PM EAT daily)
- **Content**: Concise summary of issues with total counts and amounts
- **Urgency**: Marked as urgent alerts requiring immediate attention

### SMS Message Format
```
🚨 PAYMENT ALERT: [X] reconciliation issues detected. [Y] discrepancies, [Z] unmatched. Total: KES [Amount]. Check admin dashboard immediately. - Smiling Steps
```

Example:
```
🚨 PAYMENT ALERT: 5 reconciliation issues detected. 3 discrepancies, 2 unmatched. Total: KES 45,000. Check admin dashboard immediately. - Smiling Steps
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# SMS Configuration for Admin Alerts
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key
SMS_SENDER_ID=SmilingSteps
ADMIN_PHONE=+254700000000
```

### Required Setup

1. **Africa's Talking Account**
   - Sign up at [https://africastalking.com](https://africastalking.com)
   - Get your API credentials
   - Add credits for SMS sending

2. **Admin Phone Number**
   - Set `ADMIN_PHONE` to the administrator's mobile number
   - Use international format: `+254700000000`
   - Ensure the number can receive SMS

3. **Sender ID (Optional)**
   - Set `SMS_SENDER_ID` to customize the sender name
   - Default: "SmilingSteps"
   - Must be approved by Africa's Talking for custom IDs

## Usage

### Automatic Operation
SMS alerts are sent automatically when:
- Daily reconciliation runs at 11 PM EAT
- Discrepancies or unmatched transactions are detected
- Both email and SMS alerts are sent simultaneously

### Manual Testing
Test the SMS notification system:

```bash
node test-admin-sms-notifications.js
```

### Integration with Reconciliation
The SMS notification is integrated into the reconciliation process:

```javascript
// In paymentReconciliation.js
if (results.summary.discrepancies > 0 || results.summary.unmatched > 0) {
  // Send SMS alert to admin
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    await notificationService.sendReconciliationDiscrepancySMS(results, adminPhone);
    console.log('✅ Discrepancy SMS alert sent to admin:', adminPhone);
  }
}
```

## Message Content

### Information Included
- **Alert Type**: Payment reconciliation alert
- **Issue Count**: Total number of issues detected
- **Breakdown**: Separate counts for discrepancies and unmatched transactions
- **Total Amount**: Sum of all affected transaction amounts
- **Action Required**: Direction to check admin dashboard
- **Source**: Identifies the sender as Smiling Steps

### Character Limit Considerations
- SMS messages are optimized for standard 160-character limit
- Critical information is prioritized
- Detailed information available in admin dashboard

## Error Handling

### SMS Service Unavailable
```javascript
if (!smsClient) {
  console.warn('⚠️ SMS service not configured. Skipping SMS notification.');
  return { success: false, reason: 'SMS service not configured' };
}
```

### Invalid Phone Number
- System validates phone number format
- Logs warnings for invalid numbers
- Continues with email alerts if SMS fails

### API Failures
- Retry logic for temporary failures
- Detailed error logging
- Fallback to email-only notifications

## Monitoring and Logs

### Success Logs
```
✅ Reconciliation discrepancy SMS sent to admin: +254700000000
```

### Warning Logs
```
⚠️ No admin phone configured. Skipping SMS alert notification.
```

### Error Logs
```
❌ Failed to send reconciliation SMS alert: [Error details]
```

## Security Considerations

### Phone Number Privacy
- Admin phone numbers are not logged in full
- Only last 4 digits shown in logs for verification
- Environment variables should be secured

### Message Content
- No sensitive payment details in SMS
- Transaction IDs and personal information excluded
- General alert information only

### Access Control
- SMS alerts only sent to configured admin numbers
- No user-initiated SMS sending
- System-generated alerts only

## Troubleshooting

### SMS Not Received

1. **Check Configuration**
   ```bash
   # Verify environment variables
   echo $ADMIN_PHONE
   echo $AFRICASTALKING_API_KEY
   ```

2. **Test SMS Service**
   ```bash
   node test-admin-sms-notifications.js
   ```

3. **Check Africa's Talking Account**
   - Verify account has sufficient credits
   - Check API key is active
   - Ensure phone number is valid

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| SMS not sent | Missing ADMIN_PHONE | Set environment variable |
| API error | Invalid credentials | Check Africa's Talking account |
| Message not received | Invalid phone format | Use international format (+254...) |
| Service unavailable | No API key | Configure AFRICASTALKING_API_KEY |

## Best Practices

### Phone Number Management
- Use international format for all phone numbers
- Test with actual admin phone before production
- Keep backup admin contacts configured

### Message Timing
- SMS sent immediately when issues detected
- No rate limiting for critical alerts
- Consider time zones for international admins

### Escalation Process
1. SMS alert sent immediately
2. Admin checks dashboard for details
3. Email alert provides comprehensive information
4. Manual investigation and resolution

## Integration Examples

### Custom Alert Triggers
```javascript
// Send SMS for specific conditions
if (summary.discrepancies > 5) {
  await sendReconciliationDiscrepancySMS(results, adminPhone);
}
```

### Multiple Admin Numbers
```javascript
// Send to multiple admins
const adminPhones = process.env.ADMIN_PHONES?.split(',') || [];
for (const phone of adminPhones) {
  await sendReconciliationDiscrepancySMS(results, phone.trim());
}
```

### Custom Message Format
```javascript
// Customize message for different alert levels
const message = summary.discrepancies > 10 
  ? `🚨 CRITICAL: ${totalIssues} payment issues detected...`
  : `⚠️ ALERT: ${totalIssues} payment issues detected...`;
```

## Related Documentation

- [Payment Reconciliation Guide](PAYMENT_RECONCILIATION_GUIDE.md)
- [Email Alerts Guide](RECONCILIATION_EMAIL_ALERTS_GUIDE.md)
- [Admin Dashboard Guide](ADMIN_DASHBOARD_GUIDE.md)
- [Notification System Guide](NOTIFICATION_SYSTEM_GUIDE.md)

## Support

For issues with SMS notifications:
1. Check the troubleshooting section above
2. Review system logs for error messages
3. Test with the provided test script
4. Contact Africa's Talking support for API issues
5. Verify environment configuration

---

**Last Updated**: December 14, 2024
**Version**: 1.0.0