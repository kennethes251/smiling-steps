# M-Pesa Payment Integration - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the M-Pesa payment integration to production. Follow these steps carefully to ensure a smooth, secure deployment.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Environment Setup](#production-environment-setup)
3. [Database Migration](#database-migration)
4. [Monitoring Configuration](#monitoring-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before deploying to production, ensure all of the following are complete:

### Development & Testing
- [ ] All M-Pesa integration tests passing
- [ ] Property-based tests completed (100+ iterations each)
- [ ] Security tests passed
- [ ] Performance tests passed
- [ ] End-to-end payment flow tested in sandbox
- [ ] Error handling tested for all scenarios
- [ ] Reconciliation system tested

### Documentation
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Rollback procedures documented
- [ ] Monitoring alerts documented

### Credentials & Access
- [ ] Production M-Pesa credentials obtained from Safaricom
- [ ] Production database access configured
- [ ] SSL certificates obtained and validated
- [ ] Admin access credentials secured
- [ ] Backup procedures tested

---

## Production Environment Setup

### 1. M-Pesa Production Credentials

#### Obtain Production Credentials from Safaricom

1. **Apply for Production Access**
   - Visit [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
   - Complete production application form
   - Provide business registration documents
   - Wait for approval (typically 3-5 business days)

2. **Retrieve Production Credentials**
   - Consumer Key
   - Consumer Secret
   - Business Short Code
   - Passkey
   - Callback URL (must be HTTPS with valid SSL)

#### Configure Production Environment Variables

Create or update your production `.env` file:

```bash
# M-Pesa Production Configuration
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_production_shortcode
MPESA_PASSKEY=your_production_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_WEBHOOK_SECRET=your_secure_webhook_secret

# Database Configuration
DATABASE_URL=your_production_database_url

# Security
JWT_SECRET=your_production_jwt_secret
ENCRYPTION_KEY=your_production_encryption_key
NODE_ENV=production

# Email Configuration
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your_email_password
EMAIL_FROM=Smiling Steps <noreply@yourdomain.com>

# SMS Configuration (Optional)
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
SMS_SENDER_ID=SmilingSteps
```

### 2. SSL Certificate Setup

#### Requirements
- Valid SSL certificate for your domain
- Certificate must cover webhook callback URL
- TLS 1.2 or higher required

#### Installation Steps

**For Render/Heroku:**
- SSL is automatically provided
- Verify certificate is active in dashboard

**For Custom Server:**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### 3. Database Configuration

#### Production Database Setup

1. **Create Production Database**
   ```sql
   CREATE DATABASE smiling_steps_production;
   ```

2. **Configure Connection**
   - Use connection pooling
   - Enable SSL for database connections
   - Set appropriate timeout values

3. **Backup Configuration**
   ```bash
   # Set up automated daily backups
   # Example for PostgreSQL
   pg_dump -U username -d smiling_steps_production > backup_$(date +%Y%m%d).sql
   ```

### 4. Security Hardening

#### Environment Variables
- Never commit `.env` files to version control
- Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate credentials regularly

#### API Security
- Enable rate limiting
- Configure CORS for production domains only
- Enable request logging
- Set up IP whitelisting for admin endpoints

#### Data Encryption
- Verify encryption keys are properly set
- Test data encryption/decryption
- Ensure phone numbers are masked in logs

---

## Database Migration

### Step 1: Backup Production Database

**CRITICAL: Always backup before migration**

```bash
# PostgreSQL backup
pg_dump -U username -d smiling_steps_production > backup_pre_mpesa_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_pre_mpesa_*.sql
```

### Step 2: Test Migration on Staging

```bash
# Run migration on staging first
cd server
node scripts/migrate-mpesa-fields.js --environment=staging

# Verify migration
node scripts/verify-migration.js
```

### Step 3: Run Production Migration

```bash
# Set production environment
export NODE_ENV=production
export DATABASE_URL=your_production_database_url

# Run migration script
cd server
node scripts/migrate-mpesa-fields.js

# Expected output:
# ✅ Connected to database
# ✅ Added M-Pesa fields to Session model
# ✅ Created indexes for performance
# ✅ Migration completed successfully
```

### Step 4: Verify Migration Success

```bash
# Run verification script
node scripts/verify-migration.js

# Check for:
# - All M-Pesa fields present
# - Indexes created
# - No data loss
# - Existing sessions intact
```

---

## Monitoring Configuration

### 1. Payment Event Logging

Configure comprehensive logging for all payment events:

```javascript
// Already implemented in server/utils/auditLogger.js
// Verify logs are being written to production log system
```

### 2. M-Pesa API Health Checks

Create health check endpoint:

```javascript
// Add to server/routes/mpesa.js
router.get('/health', async (req, res) => {
  try {
    const mpesaAPI = require('../config/mpesa');
    const token = await mpesaAPI.getAccessToken();
    
    res.json({
      status: 'healthy',
      mpesaConnection: 'active',
      environment: process.env.MPESA_ENVIRONMENT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 3. Error Rate Monitoring

Set up monitoring for:
- Payment initiation failures
- Callback processing errors
- API authentication failures
- Database connection issues

### 4. Alerting Thresholds

Configure alerts for:
- Payment error rate > 5%
- M-Pesa API downtime
- Callback processing delays > 10 seconds
- Database connection failures
- Reconciliation discrepancies

**Example Alert Configuration (for monitoring service):**

```yaml
alerts:
  - name: High Payment Error Rate
    condition: payment_error_rate > 0.05
    duration: 5m
    severity: critical
    
  - name: M-Pesa API Down
    condition: mpesa_health_check_failed
    duration: 2m
    severity: critical
    
  - name: Slow Callback Processing
    condition: callback_processing_time > 10s
    duration: 5m
    severity: warning
```

---

## Deployment Steps

### Step 1: Deploy Backend Changes

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd server
npm install --production

# 3. Run database migration
node scripts/migrate-mpesa-fields.js

# 4. Restart server
pm2 restart smiling-steps-api
# OR for Render/Heroku: git push heroku main
```

### Step 2: Deploy Frontend Changes

```bash
# 1. Build production frontend
cd client
npm install
npm run build

# 2. Deploy to hosting service
# For Netlify:
netlify deploy --prod

# For Render:
git push origin main  # Auto-deploys
```

### Step 3: Verify Webhook Endpoint Accessibility

```bash
# Test webhook endpoint is accessible
curl -X POST https://yourdomain.com/api/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}'

# Should return 200 OK (even if signature fails)
```

### Step 4: Test Payment Flow in Production

**IMPORTANT: Use small test amount first (e.g., 10 KES)**

1. Create test session
2. Initiate payment with real phone number
3. Complete payment on phone
4. Verify callback received
5. Check payment status updated
6. Verify notifications sent
7. Check audit logs

### Step 5: Monitor Initial Transactions

- Watch server logs in real-time
- Monitor error rates
- Check callback processing times
- Verify reconciliation working
- Review audit trail

---

## Post-Deployment Verification

### Immediate Checks (First 30 minutes)

- [ ] Server is running without errors
- [ ] M-Pesa API connectivity confirmed
- [ ] Webhook endpoint receiving callbacks
- [ ] Database connections stable
- [ ] Logging system operational
- [ ] Test payment completed successfully

### First Day Checks

- [ ] Monitor payment success rate (target: >95%)
- [ ] Check average processing time (target: <60s)
- [ ] Review error logs for patterns
- [ ] Verify reconciliation running at 11 PM
- [ ] Check notification delivery
- [ ] Review audit trail completeness

### First Week Checks

- [ ] Analyze payment patterns
- [ ] Review customer feedback
- [ ] Check for any edge cases
- [ ] Verify reconciliation accuracy
- [ ] Monitor system performance
- [ ] Review security logs

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Payment success rate < 80%
- Critical security vulnerability discovered
- Data corruption detected
- M-Pesa integration completely broken
- Database migration failed

### Rollback Steps

#### 1. Stop New Payments

```javascript
// Add to server/routes/mpesa.js temporarily
router.use((req, res, next) => {
  return res.status(503).json({
    success: false,
    message: 'Payment system temporarily unavailable. Please try again later.'
  });
});
```

#### 2. Restore Database

```bash
# Restore from backup
psql -U username -d smiling_steps_production < backup_pre_mpesa_YYYYMMDD_HHMMSS.sql
```

#### 3. Revert Code

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <previous-commit-hash>
git push --force origin main
```

#### 4. Notify Users

- Display maintenance message
- Send email to affected users
- Update status page
- Provide ETA for resolution

---

## Support & Troubleshooting

### Common Issues

**Issue: M-Pesa API Authentication Fails**
- Verify production credentials are correct
- Check if IP is whitelisted by Safaricom
- Ensure environment is set to 'production'

**Issue: Callbacks Not Received**
- Verify webhook URL is accessible publicly
- Check SSL certificate is valid
- Ensure firewall allows incoming requests
- Verify callback URL registered with Safaricom

**Issue: Payment Status Not Updating**
- Check callback processing logs
- Verify database connection
- Check for signature verification failures
- Review error logs for exceptions

### Getting Help

- **M-Pesa Support**: apisupport@safaricom.co.ke
- **Technical Issues**: Check server logs first
- **Database Issues**: Review audit logs
- **Security Concerns**: Contact security team immediately

---

## Compliance & Regulations

### Data Protection
- Ensure GDPR/Kenya Data Protection Act compliance
- Implement data retention policies (7 years for audit logs)
- Provide data deletion mechanisms
- Maintain audit trail integrity

### Financial Regulations
- Keep transaction records for required period
- Implement proper reconciliation procedures
- Maintain PCI DSS compliance
- Regular security audits

---

## Success Criteria

Deployment is successful when:

✅ Payment completion rate > 95%
✅ Average processing time < 60 seconds
✅ Payment error rate < 2%
✅ All monitoring alerts configured
✅ Reconciliation running daily
✅ Audit logs being generated
✅ No security vulnerabilities
✅ Backup procedures working
✅ Rollback procedures tested
✅ Documentation complete

---

## Next Steps After Deployment

1. Monitor system for 48 hours continuously
2. Gather user feedback
3. Optimize based on real-world usage
4. Plan for scaling if needed
5. Schedule regular security audits
6. Review and update documentation
7. Train support team on troubleshooting

---

**Document Version:** 1.0  
**Last Updated:** December 11, 2024  
**Maintained By:** Development Team
