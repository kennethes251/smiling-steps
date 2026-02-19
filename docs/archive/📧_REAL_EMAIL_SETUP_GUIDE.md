# 📧 Real Email Setup Guide

## 🎯 **How to Send Actual Emails**

Currently, the system uses mock emails (logged to console). Here's how to configure real email sending:

## **Option 1: Gmail SMTP (Recommended for Testing)**

### **Step 1: Enable Gmail App Passwords**
1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled
3. Go to Security → App passwords
4. Generate an app password for "Mail"
5. Copy the 16-character app password

### **Step 2: Update Environment Variables**
Update your `.env` file:
```env
# Email Configuration (Gmail)
EMAIL_USER="your-gmail@gmail.com"
EMAIL_PASSWORD="your-16-char-app-password"
FROM_EMAIL="noreply@smilingsteps.com"
CLIENT_URL="http://localhost:3000"
```

### **Step 3: Restart Server**
The system will automatically detect valid credentials and switch from mock to real emails.

---

## **Option 2: SendGrid (Recommended for Production)**

### **Step 1: Create SendGrid Account**
1. Sign up at https://sendgrid.com
2. Verify your account
3. Get your API key from Settings → API Keys

### **Step 2: Update Environment Variables**
```env
# Email Configuration (SendGrid)
SENDGRID_USERNAME="apikey"
SENDGRID_PASSWORD="your-sendgrid-api-key"
FROM_EMAIL="noreply@smilingsteps.com"
CLIENT_URL="http://localhost:3000"
NODE_ENV="production"
```

---

## **Option 3: Mailtrap (For Testing)**

### **Step 1: Create Mailtrap Account**
1. Sign up at https://mailtrap.io
2. Create an inbox
3. Get SMTP credentials

### **Step 2: Update Environment Variables**
```env
# Email Configuration (Mailtrap)
MAILTRAP_HOST="sandbox.smtp.mailtrap.io"
MAILTRAP_PORT=2525
MAILTRAP_USER="your-mailtrap-user"
MAILTRAP_PASS="your-mailtrap-password"
FROM_EMAIL="noreply@smilingsteps.com"
CLIENT_URL="http://localhost:3000"
```

---

## **Quick Setup: Gmail Method**

1. **Get Gmail App Password:**
   - Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password

2. **Update .env file:**
   ```env
   EMAIL_USER="youremail@gmail.com"
   EMAIL_PASSWORD="abcd efgh ijkl mnop"
   ```

3. **Restart server:**
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart:
   node server/index-mongodb.js
   ```

4. **Test registration:**
   - Register with a real email address
   - Check your email inbox for verification email
   - Click the verification link

## **How the System Detects Real vs Mock Emails**

The system automatically switches based on environment variables:

```javascript
// In emailVerificationService.js
if (!process.env.EMAIL_USER || 
    process.env.EMAIL_USER === 'your-email@gmail.com') {
  // Use mock emails (current behavior)
} else {
  // Use real email service
}
```

## **Testing Real Emails**

1. **Update .env with real credentials**
2. **Restart server**
3. **Register with your real email**
4. **Check your email inbox**
5. **Click verification link**

## **Production Considerations**

- **SendGrid:** Best for production (reliable, scalable)
- **Gmail:** Good for testing (free, easy setup)
- **Mailtrap:** Perfect for development testing
- **AWS SES:** Cost-effective for high volume

## **Security Notes**

- Never commit real email credentials to git
- Use environment variables for all sensitive data
- Consider using app passwords instead of main passwords
- Enable 2FA on email accounts used for SMTP