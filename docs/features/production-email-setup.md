# Production Email Service Setup Guide

## Overview

The Smiling Steps platform uses a production-ready email service that supports multiple email providers with automatic retry, rate limiting, and health monitoring.

## Supported Email Providers

### 1. Gmail SMTP (Recommended for Small Scale)

Best for: Development, testing, and small-scale production (< 500 emails/day)

**Setup Steps:**

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the 16-character password

**Environment Variables:**
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
FROM_EMAIL=noreply@smilingsteps.com
FROM_NAME=Smiling Steps
```

### 2. SendGrid (Recommended for Production)

Best for: Production environments with high email volume

**Setup Steps:**

1. Create a SendGrid account at https://sendgrid.com
2. Verify your sender identity (domain or single sender)
3. Create an API key with "Mail Send" permissions

**Environment Variables:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-api-key-here
FROM_EMAIL=noreply@smilingsteps.com
FROM_NAME=Smiling Steps
```

### 3. AWS SES (Enterprise Scale)

Best for: High-volume enterprise deployments

**Setup Steps:**

1. Set up AWS SES in your AWS account
2. Verify your sending domain
3. Move out of sandbox mode for production
4. Create IAM credentials with SES permissions

**Environment Variables:**
```env
EMAIL_PROVIDER=aws_ses
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=us-east-1
FROM_EMAIL=noreply@smilingsteps.com
FROM_NAME=Smiling Steps
```

### 4. Custom SMTP Server

Best for: Organizations with existing email infrastructure

**Environment Variables:**
```env
EMAIL_PROVIDER=custom_smtp
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_TLS_REJECT_UNAUTHORIZED=true
FROM_EMAIL=noreply@smilingsteps.com
FROM_NAME=Smiling Steps
```

## Configuration Options

### Retry Configuration

```env
# Number of retry attempts for failed emails
EMAIL_RETRY_ATTEMPTS=3

# Initial delay between retries (ms)
EMAIL_RETRY_DELAY=1000

# Maximum delay between retries (ms)
EMAIL_RETRY_MAX_DELAY=30000

# Backoff multiplier for exponential backoff
EMAIL_RETRY_BACKOFF=2
```

### Rate Limiting

```env
# Maximum emails per minute
EMAIL_RATE_LIMIT=30

# Maximum emails per hour
EMAIL_RATE_LIMIT_HOUR=500
```

## API Endpoints

### Health Check
```
GET /api/email/health
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "service": "email",
  "initialized": true,
  "provider": "gmail",
  "connectionStatus": "connected",
  "stats": {
    "sent": 150,
    "failed": 2,
    "retried": 5,
    "lastSent": "2026-01-08T10:30:00.000Z"
  },
  "rateLimit": {
    "minuteRemaining": 28,
    "hourRemaining": 450
  }
}
```

### Send Test Email
```
POST /api/email/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "message": "This is a test message"
}
```

### Get Statistics
```
GET /api/email/stats
Authorization: Bearer <admin-token>
```

### Reset Statistics
```
POST /api/email/stats/reset
Authorization: Bearer <admin-token>
```

## Email Templates

The service includes professional HTML email templates for:

1. **Email Verification** - Sent after user registration
2. **Password Reset** - Sent when user requests password reset
3. **Therapist Approval** - Sent when therapist application is approved/rejected

All templates feature:
- Responsive design for mobile devices
- Smiling Steps branding
- Clear call-to-action buttons
- Plain text fallback for email clients that don't support HTML

## Monitoring & Troubleshooting

### Common Issues

#### "Invalid login" Error
- Ensure you're using an App Password (not your regular password) for Gmail
- Verify 2FA is enabled on your Gmail account
- Check that the email address is correct

#### "Rate limit exceeded" Error
- Wait for the rate limit window to reset
- Consider upgrading to SendGrid or AWS SES for higher limits
- Adjust `EMAIL_RATE_LIMIT` and `EMAIL_RATE_LIMIT_HOUR` settings

#### "Connection timeout" Error
- Check your firewall allows outbound SMTP connections
- Verify the EMAIL_HOST and EMAIL_PORT are correct
- Try using port 587 instead of 465

### Logging

Email events are logged with the following levels:
- `info` - Successful email sends
- `warn` - Retry attempts, rate limit warnings
- `error` - Failed sends after all retries

Check logs at: `./logs/app.log` or Render dashboard logs

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Use App Passwords** - Don't use your main email password
3. **Verify sender identity** - Set up SPF, DKIM, and DMARC records
4. **Monitor for abuse** - Watch for unusual sending patterns
5. **Rotate credentials** - Periodically update API keys and passwords

## Production Checklist

- [ ] Email provider configured and tested
- [ ] FROM_EMAIL matches verified sender identity
- [ ] Rate limits appropriate for expected volume
- [ ] Health check endpoint accessible
- [ ] Test email sent successfully
- [ ] SPF/DKIM/DMARC records configured (for custom domains)
- [ ] Monitoring alerts set up for email failures
