# Smiling Steps - Deployment Guide

## Overview

This guide covers deploying the Smiling Steps teletherapy platform to production, including environment configuration, database setup, encryption key management, and monitoring.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Encryption Key Setup](#encryption-key-setup)
5. [Deployment to Render](#deployment-to-render)
6. [Monitoring Setup](#monitoring-setup)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Node.js** 18.x or higher
- **MongoDB Atlas** account (or MongoDB 6.x+)
- **Render** account (or alternative hosting)
- **Gmail** account with App Password (for email)
- **M-Pesa** Daraja API credentials (for payments)

### Local Development Requirements

```bash
# Install Node.js dependencies
npm install

# Install client dependencies
cd client && npm install
```

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the root directory:

```env
# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV=production
PORT=5000

# ===========================================
# DATABASE
# ===========================================
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# ===========================================
# AUTHENTICATION
# ===========================================
JWT_SECRET=<your-secure-jwt-secret-min-32-chars>
JWT_EXPIRES_IN=7d

# ===========================================
# ENCRYPTION (HIPAA Compliance)
# ===========================================
ENCRYPTION_KEY=<your-32-byte-hex-encryption-key>

# ===========================================
# EMAIL CONFIGURATION (Gmail SMTP)
# ===========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<your-gmail-app-password>
EMAIL_FROM="Smiling Steps <your-email@gmail.com>"

# ===========================================
# M-PESA CONFIGURATION
# ===========================================
MPESA_CONSUMER_KEY=<your-consumer-key>
MPESA_CONSUMER_SECRET=<your-consumer-secret>
MPESA_PASSKEY=<your-passkey>
MPESA_SHORTCODE=<your-shortcode>
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox  # or 'production'

# ===========================================
# CORS & CLIENT
# ===========================================
CLIENT_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# ===========================================
# ADMIN CONFIGURATION
# ===========================================
ADMIN_EMAIL=admin@your-domain.com
ADMIN_ALERT_EMAIL=alerts@your-domain.com
```

### Frontend Environment Variables

Create `.env` in the `client` directory:

```env
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_SOCKET_URL=https://your-backend-domain.com
```

### Environment Variable Descriptions

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode (development/production) | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens (min 32 chars) | Yes |
| `ENCRYPTION_KEY` | 32-byte hex key for PHI encryption | Yes |
| `EMAIL_USER` | Gmail address for sending emails | Yes |
| `EMAIL_PASSWORD` | Gmail App Password | Yes |
| `MPESA_*` | M-Pesa API credentials | Yes (for payments) |
| `CLIENT_URL` | Frontend URL for CORS | Yes |

---

## Database Setup

### MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a new cluster (M0 free tier for testing)
   - Choose a region close to your users

2. **Create Database User**
   - Go to Database Access
   - Add new database user
   - Use a strong password
   - Grant "Read and write to any database" role

3. **Configure Network Access**
   - Go to Network Access
   - Add IP Address
   - For Render: Add `0.0.0.0/0` (allow from anywhere)
   - For production: Whitelist specific IPs

4. **Get Connection String**
   - Go to Clusters → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### Database Indexes

The application automatically creates required indexes on startup. Key indexes include:

```javascript
// Sessions
{ clientId: 1, status: 1 }
{ psychologistId: 1, sessionDate: 1 }
{ bookingReference: 1 }

// Users
{ email: 1 }
{ role: 1, approvalStatus: 1 }

// Audit Logs
{ timestamp: -1 }
{ userId: 1, action: 1 }
```

### Database Migrations

No manual migrations required. Models auto-sync on startup.

For data migrations between environments:

```bash
# Export from source
mongodump --uri="<source-uri>" --out=./backup

# Import to destination
mongorestore --uri="<destination-uri>" ./backup
```

---

## Encryption Key Setup

### Generating Encryption Key

The encryption key must be exactly 32 bytes (64 hex characters) for AES-256-GCM.

```bash
# Generate using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### Key Management Best Practices

1. **Never commit keys to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Key Rotation**
   - Plan for periodic key rotation
   - Re-encrypt existing data when rotating
   - Keep old keys for decrypting historical data

3. **Backup Keys Securely**
   - Store in a secure password manager
   - Use cloud secret management (AWS Secrets Manager, etc.)
   - Document key recovery procedures

### Verifying Encryption

Test encryption is working:

```bash
# Run encryption tests
npm test -- --testPathPattern="encryption"
```

---

## Deployment to Render

### Backend Deployment

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```yaml
   Name: smiling-steps-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Add Environment Variables**
   - Go to Environment tab
   - Add all variables from `.env`
   - Mark sensitive values as "Secret"

4. **Configure Health Check**
   ```
   Health Check Path: /api/health
   ```

### Frontend Deployment

1. **Create Static Site**
   - Click "New" → "Static Site"
   - Connect your repository

2. **Configure Build**
   ```yaml
   Name: smiling-steps-client
   Build Command: cd client && npm install && npm run build
   Publish Directory: client/build
   ```

3. **Add Environment Variables**
   - Add `REACT_APP_API_URL` pointing to your backend

4. **Configure Redirects**
   - Add rewrite rule for SPA routing:
   ```
   /* → /index.html (200)
   ```

### Using render.yaml

The repository includes `render.yaml` for infrastructure-as-code:

```yaml
services:
  - type: web
    name: smiling-steps-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      # Add other env vars...

  - type: web
    name: smiling-steps-client
    env: static
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

---

## Monitoring Setup

### Application Logging

Logs are written to:
- Console (stdout/stderr)
- File: `./logs/app.log` (if configured)

Log levels: `error`, `warn`, `info`, `debug`

### Health Check Endpoint

```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-06T10:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Performance Monitoring

Access via Admin Dashboard or API:

```
GET /api/performance-metrics/summary
```

Key metrics tracked:
- Response times (booking page, API, M-Pesa)
- Booking conversion rates
- Payment success rates
- Error rates

### Security Monitoring

Access via Admin Dashboard or API:

```
GET /api/security-monitoring/statistics
```

Monitors:
- Failed authentication attempts
- Unusual access patterns
- Data export anomalies
- PHI access logging

### Alert Configuration

Configure alert thresholds in Admin Dashboard:

| Metric | Warning | Critical |
|--------|---------|----------|
| Response Time | > 2s | > 5s |
| Error Rate | > 1% | > 5% |
| Payment Failures | > 5% | > 10% |

### External Monitoring (Recommended)

Consider integrating:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, LogRocket
- **APM**: New Relic, Datadog

---

## Post-Deployment Checklist

### Immediate Verification

- [ ] Backend health check returns 200
- [ ] Frontend loads without errors
- [ ] Database connection successful
- [ ] Email sending works (test registration)
- [ ] M-Pesa callback URL accessible

### Security Verification

- [ ] HTTPS enabled on all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] JWT authentication working
- [ ] Encryption key set and working

### Functional Testing

- [ ] User registration flow
- [ ] Login/logout
- [ ] Therapist approval workflow
- [ ] Session booking flow
- [ ] Payment processing
- [ ] Form submission (agreement, intake)
- [ ] Video call connection

### Admin Setup

- [ ] Create admin account
- [ ] Verify admin dashboard access
- [ ] Configure alert thresholds
- [ ] Set up monitoring notifications

### Documentation

- [ ] Update API documentation with production URLs
- [ ] Document admin credentials securely
- [ ] Create runbook for common issues

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: MongoNetworkError: failed to connect to server
```

**Solutions:**
1. Check MongoDB URI is correct
2. Verify network access allows your IP
3. Check database user credentials
4. Ensure cluster is running

#### Email Sending Failed

```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solutions:**
1. Enable 2FA on Gmail account
2. Generate App Password (not regular password)
3. Check EMAIL_USER and EMAIL_PASSWORD

#### M-Pesa Callback Not Received

**Solutions:**
1. Verify callback URL is publicly accessible
2. Check URL is HTTPS
3. Verify M-Pesa credentials
4. Check Daraja portal for callback logs

#### Encryption Errors

```
Error: Invalid key length
```

**Solutions:**
1. Ensure ENCRYPTION_KEY is exactly 64 hex characters
2. Regenerate key if corrupted
3. Check for whitespace in environment variable

### Logs Location

- **Render**: Dashboard → Logs tab
- **Local**: `./logs/app.log`
- **Console**: stdout/stderr

### Support Contacts

- Technical issues: Create GitHub issue
- Security concerns: security@smilingsteps.com
- Urgent production issues: Check runbook for escalation

---

## Rollback Procedures

### Backend Rollback

1. Go to Render Dashboard
2. Select the web service
3. Go to "Deploys" tab
4. Click "Rollback" on previous successful deploy

### Database Rollback

1. Restore from MongoDB Atlas backup:
   - Go to Clusters → ... → Restore
   - Select backup point
   - Restore to new cluster or in-place

### Emergency Procedures

1. **Service Down**
   - Check Render status page
   - Review recent deploys
   - Check logs for errors
   - Rollback if needed

2. **Data Breach Suspected**
   - Rotate encryption keys
   - Rotate JWT secret
   - Review audit logs
   - Notify affected users (if required)

3. **Payment Issues**
   - Check M-Pesa Daraja portal
   - Review callback logs
   - Contact M-Pesa support if needed
