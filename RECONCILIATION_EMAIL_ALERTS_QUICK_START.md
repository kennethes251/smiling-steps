# Reconciliation Email Alerts - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Configure Email (2 minutes)

Add to `server/.env`:

```bash
# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Smiling Steps <noreply@smilingsteps.com>

# Admin Email (receives alerts)
ADMIN_EMAIL=admin@smilingsteps.com

# Dashboard URL (for email links)
CLIENT_URL=https://smilingsteps.com
```

### Step 2: Get Gmail App Password (2 minutes)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to "App passwords"
4. Generate password for "Mail"
5. Copy password to `EMAIL_PASS` in `.env`

### Step 3: Test (1 minute)

```bash
node test-reconciliation-email-alert.js
```

Expected output:
```
✅ Test 1 PASSED: Alert sent successfully
✅ Test 2 PASSED: Correctly skipped when no discrepancies
✅ Test 3 PASSED: Alert sent with truncated list
```

### Step 4: Check Email

Look for test email in admin inbox with subject:
```
⚠️ Payment Reconciliation Alert - X Issues Detected
```

## ✅ You're Done!

The system will now automatically:
- Send alerts during daily reconciliation (11 PM EAT)
- Send alerts when you run manual reconciliation
- Skip alerts when no issues are found

## 📧 What to Expect

### When Alerts Are Sent

**Daily (Automatic)**
- Runs at 11 PM EAT
- Checks previous day's transactions
- Sends email if issues found

**Manual (On-Demand)**
- When you click "Run Reconciliation" in dashboard
- Sends email immediately if issues found

### Alert Content

Each email includes:
- Summary statistics
- List of discrepancies (up to 10)
- List of unmatched transactions (up to 10)
- Recommended actions
- Link to dashboard

### Alert Triggers

You'll receive alerts for:
- ❌ Amount mismatches
- ❌ Duplicate transaction IDs
- ❌ Status inconsistencies
- ⚠️ Missing transaction IDs
- ⚠️ Timestamp discrepancies

## 🔧 Troubleshooting

### Email Not Received?

**Check spam folder** - First few emails may go to spam

**Verify configuration**:
```bash
# In server directory
cat .env | grep EMAIL
cat .env | grep ADMIN_EMAIL
```

**Check logs**:
```bash
tail -f logs/app.log | grep "Email"
```

### Common Issues

**"Authentication failed"**
- Regenerate Gmail app password
- Ensure 2FA is enabled
- Check EMAIL_USER and EMAIL_PASS

**"Connection timeout"**
- Try port 465 instead of 587
- Check firewall settings
- Verify EMAIL_HOST is correct

**"No alerts received"**
- Run manual reconciliation to test
- Check if discrepancies exist
- Verify ADMIN_EMAIL is set

## 📱 Alternative Email Providers

### SendGrid
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

### Mailgun
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your-mailgun-password
```

### AWS SES
```bash
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASS=your-smtp-password
```

## 🎯 Best Practices

### Response Time
- Review critical discrepancies within 24 hours
- Review unmatched transactions within 48 hours
- Document all manual corrections

### Alert Management
- Don't ignore alerts
- Investigate patterns
- Update reconciliation rules as needed
- Keep admin email current

### Security
- Use app-specific passwords
- Rotate credentials regularly
- Don't share email credentials
- Monitor alert frequency

## 📊 Understanding Alerts

### Critical Discrepancies (Red)
**Require immediate attention**
- Amount mismatches
- Duplicate transactions
- Result code mismatches

### Unmatched Transactions (Orange)
**Require review**
- Status inconsistencies
- Missing transaction IDs
- Timestamp discrepancies

### Matched Transactions (Green)
**No action needed**
- All data consistent
- No issues detected

## 🔗 Quick Links

- [Full Documentation](RECONCILIATION_EMAIL_ALERTS_GUIDE.md)
- [Implementation Details](EMAIL_ALERTS_IMPLEMENTATION_COMPLETE.md)
- [Reconciliation Guide](PAYMENT_RECONCILIATION_GUIDE.md)

## 💡 Tips

1. **Whitelist sender**: Add noreply@smilingsteps.com to contacts
2. **Set up filters**: Create email rule for reconciliation alerts
3. **Mobile access**: Ensure dashboard is mobile-friendly
4. **Backup admin**: Add secondary admin email if needed
5. **Test regularly**: Run manual reconciliation weekly

## 🆘 Need Help?

1. Check [Troubleshooting Guide](RECONCILIATION_EMAIL_ALERTS_GUIDE.md#troubleshooting)
2. Review server logs
3. Run test script
4. Contact system administrator

---

**Status**: ✅ Production Ready  
**Last Updated**: December 14, 2024
