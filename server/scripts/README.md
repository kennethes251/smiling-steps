# M-Pesa Integration Scripts

This directory contains utility scripts for M-Pesa Daraja API integration setup and testing.

## Available Scripts

### 1. Validate M-Pesa Credentials

**File**: `validate-mpesa-credentials.js`

**Purpose**: Validates that all required M-Pesa environment variables are properly configured.

**Usage**:
```bash
node server/scripts/validate-mpesa-credentials.js
# OR
npm run mpesa:validate
```

**What it checks**:
- All required environment variables are present
- No placeholder values remain
- Environment is set to 'sandbox' or 'production'
- Business short code is numeric
- Callback URL is a valid URL

**Output**:
- ✅ Success: All credentials properly configured
- ❌ Failure: Lists missing or invalid credentials with setup guide

---

### 2. Test M-Pesa Connection

**File**: `test-mpesa-connection.js`

**Purpose**: Tests connectivity to M-Pesa Daraja API by generating an OAuth token.

**Usage**:
```bash
node server/scripts/test-mpesa-connection.js
# OR
npm run mpesa:test
```

**What it does**:
1. Validates environment configuration
2. Attempts to generate OAuth access token
3. Verifies API connectivity
4. Displays configuration summary
5. Provides warnings for common issues

**Output**:
- ✅ Success: Connection established, token generated
- ❌ Failure: Detailed error message with troubleshooting tips

---

## Setup Workflow

Follow these steps to set up M-Pesa integration:

### Step 1: Configure Credentials

1. Copy `.env.example` to `.env` if not already done
2. Obtain M-Pesa credentials from [Daraja Portal](https://developer.safaricom.co.ke/)
3. Update the following in `server/.env`:
   ```env
   MPESA_CONSUMER_KEY=<your-key>
   MPESA_CONSUMER_SECRET=<your-secret>
   MPESA_PASSKEY=<your-passkey>
   ```

### Step 2: Validate Configuration

```bash
npm run mpesa:validate
```

Ensure all checks pass (✅) before proceeding.

### Step 3: Test Connection

```bash
npm run mpesa:test
```

Verify that OAuth token is generated successfully.

### Step 4: Start Development

Once validation and connection tests pass, you're ready to:
- Implement payment routes
- Test STK Push functionality
- Handle payment callbacks

---

## Troubleshooting

### Validation Fails

**Problem**: Script shows ⚠️ or ❌ for credentials

**Solution**:
1. Check `server/.env` file exists
2. Verify no placeholder values (e.g., `your-mpesa-consumer-key`)
3. Ensure no extra spaces or quotes around values
4. Confirm all required variables are set

### Connection Test Fails

**Problem**: "Invalid Credentials" error

**Solution**:
1. Verify Consumer Key and Secret are correct
2. Check you're using the right environment (sandbox/production)
3. Ensure credentials are from the correct Daraja app
4. Try regenerating credentials in Daraja portal

**Problem**: "No response from M-Pesa API"

**Solution**:
1. Check internet connectivity
2. Verify firewall isn't blocking requests
3. Confirm API endpoints are accessible
4. Try again after a few minutes (API may be temporarily down)

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MPESA_ENVIRONMENT` | API environment | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` | OAuth consumer key | From Daraja portal |
| `MPESA_CONSUMER_SECRET` | OAuth consumer secret | From Daraja portal |
| `MPESA_BUSINESS_SHORT_CODE` | Business/Till number | `174379` (sandbox) |
| `MPESA_PASSKEY` | Lipa Na M-Pesa passkey | From Daraja portal |
| `MPESA_CALLBACK_URL` | Webhook callback URL | `https://yourdomain.com/api/mpesa/callback` |

---

## Additional Resources

- **Setup Guide**: `server/docs/MPESA_SETUP_GUIDE.md`
- **Quick Reference**: `server/docs/MPESA_QUICK_REFERENCE.md`
- **Daraja Portal**: https://developer.safaricom.co.ke/
- **API Documentation**: https://developer.safaricom.co.ke/Documentation

---

## Notes

- Always use sandbox for development and testing
- Never commit `.env` file with real credentials
- Rotate credentials regularly for security
- Monitor API usage in Daraja portal
- Keep scripts updated with latest API changes
