# 🔑 How to Get Your M-Pesa Passkey

## ✅ Your Credentials (Updated in .env)

I've updated your `.env` file with:
- ✅ Consumer Key: `HgkrKo6yLdRcXsTOnaDXTAqZAGPRpArcd96OsoiUQrAb7jVd`
- ✅ Consumer Secret: `QcgGt7P0i6rvXKanPzAdGmDQvUX2wz4Mb4BynF9yMXrcoXenFSqV31qOilAeFsLE`
- ✅ Business Short Code: `174379` (Sandbox)
- ⚠️ Passkey: Using default sandbox passkey (you should verify this)
- ⚠️ Callback URL: Set to localhost (you'll need to update this)

---

## 📍 Where to Find Your Passkey

### Step 1: Login to Daraja Portal
Visit: https://developer.safaricom.co.ke

### Step 2: Go to Your App
1. Click **"My Apps"** in the top menu
2. Click on your app name (the one you created)

### Step 3: Find the Passkey
1. Look for the **"Lipa Na M-Pesa Online"** section
2. You should see:
   - **Business Short Code**: 174379
   - **Passkey**: A long string of characters (looks like: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`)

### Step 4: Update Your .env
If your passkey is different from the default, open `.env` and update this line:
```env
MPESA_PASSKEY="your_actual_passkey_from_daraja"
```

---

## 🌐 Setting Up Callback URL

Your callback URL is currently set to `localhost`, which won't work for receiving M-Pesa callbacks.

### Option 1: Use ngrok for Local Testing (Recommended)

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

6. **Restart your server**

### Option 2: Use Your Production URL

If your app is deployed on Render:
```env
MPESA_CALLBACK_URL="https://smiling-steps.onrender.com/api/mpesa/callback"
```

---

## 🧪 Test Your Setup

### Step 1: Restart Server
```bash
npm start
```

You should see:
```
✅ mpesa routes loaded
```

### Step 2: Test API Connection

Create a test file `test-mpesa-connection.js`:

```javascript
const axios = require('axios');

async function testConnection() {
  try {
    // First, login as admin to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'your_admin_email@example.com',
      password: 'your_admin_password'
    });

    const token = loginResponse.data.token;

    // Test M-Pesa connection
    const mpesaResponse = await axios.post(
      'http://localhost:5000/api/mpesa/test-connection',
      {},
      {
        headers: { 'x-auth-token': token }
      }
    );

    console.log('✅ M-Pesa Connection Test:', mpesaResponse.data);
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  }
}

testConnection();
```

Run it:
```bash
node test-mpesa-connection.js
```

Expected output:
```json
{
  "success": true,
  "msg": "M-Pesa API connection successful",
  "environment": "sandbox",
  "tokenReceived": true
}
```

---

## 📱 Test Payment (Sandbox)

Use Safaricom's test phone number:
- **Phone**: `254708374149`
- **PIN**: `1234`

This won't charge real money!

---

## ⚠️ Important Notes

1. **Passkey**: The default sandbox passkey I used is common, but verify yours in Daraja portal
2. **Callback URL**: Must be publicly accessible (use ngrok for local testing)
3. **Register Callback**: Add your callback URL in Daraja portal settings
4. **Security**: Never commit `.env` to Git (it's already in `.gitignore`)

---

## 🚀 Next Steps

1. ✅ Verify your Passkey in Daraja portal
2. ✅ Set up ngrok for callback URL
3. ✅ Restart your server
4. ✅ Test the connection
5. ✅ Try a test payment with sandbox number

---

## 📞 Need Help?

- **Daraja Support**: apisupport@safaricom.co.ke
- **Documentation**: https://developer.safaricom.co.ke/Documentation
- **Your Guides**: 
  - `MPESA_IMPLEMENTATION_COMPLETE.md`
  - `MPESA_CREDENTIALS_GUIDE.md`

---

## ✅ Quick Checklist

- [ ] Verified Passkey in Daraja portal
- [ ] Updated Passkey in `.env` (if different)
- [ ] Set up ngrok or production callback URL
- [ ] Updated `MPESA_CALLBACK_URL` in `.env`
- [ ] Restarted server
- [ ] Tested API connection
- [ ] Ready to test payments!

Good luck! 🎉
