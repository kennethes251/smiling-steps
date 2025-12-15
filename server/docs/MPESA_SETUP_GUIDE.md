# M-Pesa Integration Setup Guide

This guide walks you through setting up M-Pesa Daraja API credentials for the Smiling Steps platform.

## Prerequisites

- Node.js 18+ installed
- Access to Safaricom Daraja Developer Portal
- Valid Kenyan phone number for testing

## Step 1: Register on Daraja Portal

1. Visit [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Click "Sign Up" and create an account
3. Verify your email address
4. Log in to the portal

## Step 2: Create a Daraja App

1. Navigate to "My Apps" in the dashboard
2. Click "Create New App"
3. Fill in the app details:
   - **App Name**: Smiling Steps Therapy
   - **Description**: Mental health therapy platform payment integration
4. Select the following APIs:
   - ✅ Lipa Na M-Pesa Online (STK Push)
5. Click "Create App"

## Step 3: Get Sandbox Credentials

After creating your app, you'll receive:

- **Consumer Key**: Used for API authentication
- **Consumer Secret**: Used for API authentication

### Sandbox Test Credentials

For testing, Safaricom provides these sandbox credentials:

```
Business Short Code: 174379
Passkey: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```

## Step 4: Configure Environment Variables

1. Open `server/.env` file
2. Update the M-Pesa configuration section:

```env
# M-Pesa Daraja API Configuration
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-actual-consumer-key-from-daraja
MPESA_CONSUMER_SECRET=your-actual-consumer-secret-from-daraja
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=http://localhost:5000/api/mpesa/callback
```

### Important Notes:

- Replace `your-actual-consumer-key-from-daraja` with your Consumer Key
- Replace `your-actual-consumer-secret-from-daraja` with your Consumer Secret
- For local development, use `http://localhost:5000/api/mpesa/callback`
- For production, use your actual domain: `https://yourdomain.com/api/mpesa/callback`

## Step 5: Validate Configuration

Run the credential validation script:

```bash
node server/scripts/validate-mpesa-credentials.js
```

You should see:
```
✅ All M-Pesa credentials are properly configured!
```

## Step 6: Test Sandbox Connection

Once credentials are configured, test the connection:

```bash
node server/scripts/test-mpesa-connection.js
```

This will:
- Verify OAuth token generation
- Test API connectivity
- Confirm your credentials are working

## Sandbox Testing

### Test Phone Numbers

Safaricom provides test phone numbers for sandbox:

- **Test Number**: 254708374149
- **Test PIN**: Any 4-digit number (e.g., 1234)

### Testing Payment Flow

1. Start your server: `npm start`
2. Create a test session
3. Initiate payment with test phone number
4. You'll receive a simulated STK Push
5. Enter any 4-digit PIN
6. Payment will be processed in sandbox

## Production Setup

### Requirements for Going Live

1. **Business Registration**: Valid business registration in Kenya
2. **Till Number**: Active M-Pesa Till Number
3. **API Approval**: Complete Daraja Go Live process

### Go Live Process

1. Log in to Daraja Portal
2. Navigate to your app
3. Click "Request Production Keys"
4. Fill in business details:
   - Business name
   - Till number
   - Business registration documents
5. Submit for approval
6. Wait for Safaricom approval (typically 3-5 business days)

### Production Configuration

Once approved, update your `.env`:

```env
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your-production-consumer-key
MPESA_CONSUMER_SECRET=your-production-consumer-secret
MPESA_BUSINESS_SHORT_CODE=your-actual-till-number
MPESA_PASSKEY=your-production-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

## Callback URL Configuration

### Local Development

For local testing, you need to expose your localhost to the internet:

**Option 1: ngrok (Recommended)**
```bash
ngrok http 5000
```
Use the ngrok URL as your callback URL:
```
MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/mpesa/callback
```

**Option 2: localtunnel**
```bash
npx localtunnel --port 5000
```

### Production Deployment

Ensure your production server:
- Has a valid SSL certificate (HTTPS required)
- Callback endpoint is publicly accessible
- Firewall allows incoming requests from Safaricom IPs

## Security Best Practices

1. **Never commit credentials**: Keep `.env` in `.gitignore`
2. **Use environment variables**: Never hardcode credentials
3. **Rotate keys regularly**: Update credentials periodically
4. **Monitor access**: Log all API calls for audit
5. **Validate callbacks**: Always verify webhook signatures

## Troubleshooting

### "Invalid Credentials" Error

- Verify Consumer Key and Secret are correct
- Check for extra spaces or quotes in `.env`
- Ensure you're using the right environment (sandbox/production)

### "Invalid Access Token" Error

- Token may have expired (valid for 1 hour)
- Check system time is synchronized
- Verify API endpoint URLs are correct

### Callback Not Received

- Verify callback URL is publicly accessible
- Check firewall settings
- Ensure HTTPS is enabled (production)
- Test with ngrok for local development

### "Invalid Shortcode" Error

- Verify Business Short Code is correct
- Ensure you're using sandbox shortcode (174379) for testing
- For production, use your actual Till Number

## Support Resources

- **Daraja Portal**: https://developer.safaricom.co.ke/
- **API Documentation**: https://developer.safaricom.co.ke/Documentation
- **Support Email**: apisupport@safaricom.co.ke
- **Developer Forum**: https://developer.safaricom.co.ke/community

## Next Steps

After completing setup:

1. ✅ Validate credentials
2. ✅ Test sandbox connection
3. ✅ Implement payment routes (Task 2)
4. ✅ Test payment flow end-to-end
5. ✅ Apply for production access
6. ✅ Deploy to production

---

**Need Help?** Refer to `MPESA_CREDENTIALS_GUIDE.md` or contact the development team.
