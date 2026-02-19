# 🔑 M-Pesa Credentials Setup Guide

## Quick Setup (Recommended)

Run the interactive setup script:

```bash
node setup-mpesa-credentials.js
```

This will guide you through entering your credentials safely.

---

## Manual Setup

If you prefer to update `.env` manually, follow these steps:

### 1. Get Your Credentials from Daraja Portal

**Visit**: https://developer.safaricom.co.ke

#### Sandbox Credentials (For Testing):
After creating your app, you'll get:

```
Consumer Key: xxxxxxxxxxxxxxxxxxx
Consumer Secret: yyyyyyyyyyyyyyyyyyyy
Business Short Code: 174379 (default sandbox)
Passkey: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```

### 2. Open Your `.env` File

The file is in your project root. Look for the M-Pesa section:

```env
# M-Pesa Daraja API Credentials (Sandbox/Test)
MPESA_CONSUMER_KEY="your_consumer_key_here"
MPESA_CONSUMER_SECRET="your_consumer_secret_here"
MPESA_BUSINESS_SHORT_CODE="174379"
MPESA_PASSKEY="your_passkey_here"
MPESA_CALLBACK_URL="https://your-domain.com/api/mpesa/callback"
MPESA_ENVIRONMENT="sandbox"
```

### 3. Replace the Placeholder Values

**Example with real sandbox credentials:**

```env
# M-Pesa Daraja API Credentials (Sandbox)
MPESA_CONSUMER_KEY="K8xGz9vN2mL4pQ7wR5tY3uI6oP1aS8dF"
MPESA_CONSUMER_SECRET="H7jK9mN2bV5cX8zL4qW6eR3tY9uI1oP"
MPESA_BUSINESS_SHORT_CODE="174379"
MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
MPESA_CALLBACK_URL="https://abc123.ngrok.io/api/mpesa/callback"
MPESA_ENVIRONMENT="sandbox"
```

---

## 🌐 Setting Up Callback URL

The callback URL is where Safaricom sends payment confirmations.

### Option 1: Local Testing with ngrok

1. **Install ngrok**:
```bash
npm install -g ngrok
```

2. **Start your server**:
```bash
npm start
```

3. **In a new terminal, run ngrok**:
```bash
ngrok http 5000
```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update `.env`**:
```env
MPESA_CALLBACK_URL="https://abc123.ngrok.io/api/mpesa/callback"
```

### Option 2: Production URL

If your app is deployed:

```env
MPESA_CALLBACK_URL="https://smiling-steps.onrender.com/api/mpesa/callback"
```

---

## 🧪 Testing Your Setup

### Test 1: Check Credentials

```bash
node setup-mpesa-credentials.js
```

### Test 2: Test API Connection

1. Start your server:
```bash
npm start
```

2. Login as admin and get your auth token

3. Test the connection:
```bash
curl -X POST http://localhost:5000/api/mpesa/test-connection \
  -H "x-auth-token: YOUR_AUTH_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "msg": "M-Pesa API connection successful",
  "environment": "sandbox",
  "tokenReceived": true
}
```

---

## 📱 Sandbox Test Numbers

Safaricom provides test phone numbers for sandbox:

**Test Phone**: `254708374149`  
**Test PIN**: `1234` (or as provided in Daraja portal)

**Note**: These numbers don't charge real money!

---

## 🔒 Security Checklist

- [ ] Never commit `.env` to Git (it's in `.gitignore`)
- [ ] Keep credentials secret
- [ ] Use sandbox for testing
- [ ] Only switch to production when ready
- [ ] Register callback URL in Daraja portal
- [ ] Use HTTPS for callback URLs

---

## 🚨 Common Issues

### "Failed to get M-Pesa access token"

**Solution**: 
- Check Consumer Key and Secret are correct
- Verify you're using the right environment (sandbox/production)
- Check for extra spaces in credentials

### "Invalid phone number"

**Solution**:
- Must be Kenyan number (254 or 07 format)
- Must be Safaricom number
- In sandbox, use test number: `254708374149`

### "Callback not received"

**Solution**:
- Ensure callback URL is publicly accessible
- For local testing, use ngrok
- Register callback URL in Daraja portal
- Check server logs for incoming requests

---

## 📚 Where to Find Credentials

### In Daraja Portal:

1. **Login**: https://developer.safaricom.co.ke
2. **Go to**: My Apps
3. **Click**: Your app name
4. **Find**:
   - Consumer Key & Secret: Under "Keys" tab
   - Passkey: Under "Lipa Na M-Pesa Online" section
   - Short Code: Same section

### Sandbox vs Production:

| Item | Sandbox | Production |
|------|---------|------------|
| Short Code | 174379 | Your actual Paybill |
| Passkey | Provided by Safaricom | Different from sandbox |
| Test Number | 254708374149 | Real phone numbers |
| Money | Fake (no charges) | Real money |

---

## ✅ Verification Steps

After updating `.env`:

1. **Restart server**:
```bash
npm start
```

2. **Check logs** - You should see:
```
✅ mpesa routes loaded
```

3. **Test connection** (as admin)

4. **Try a test payment** with sandbox number

---

## 🎯 Quick Reference

**Your `.env` should have these 6 M-Pesa variables:**

```env
MPESA_CONSUMER_KEY="..."
MPESA_CONSUMER_SECRET="..."
MPESA_BUSINESS_SHORT_CODE="174379"
MPESA_PASSKEY="..."
MPESA_CALLBACK_URL="https://..."
MPESA_ENVIRONMENT="sandbox"
```

**All set?** Run: `node setup-mpesa-credentials.js` to verify!

---

## 📞 Need Help?

- **Daraja Support**: apisupport@safaricom.co.ke
- **Documentation**: https://developer.safaricom.co.ke/Documentation
- **Your Implementation Guide**: `MPESA_IMPLEMENTATION_COMPLETE.md`

---

## 🚀 Next Steps

Once credentials are set up:

1. ✅ Test API connection
2. ✅ Try sandbox payment
3. ✅ Integrate into your booking flow
4. ✅ Test with real users (sandbox)
5. ✅ Apply for production access
6. ✅ Switch to production credentials

Good luck! 🎉
