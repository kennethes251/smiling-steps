# 📧 Namecheap Email Configuration Guide

## 🎯 **Your Domain Email Setup**

**Domain**: smilingsteps.com  
**Email**: hr@smilingsteps.com  
**Purpose**: Professional email verification system

## 🔧 **Step 1: Get Your Namecheap Email Password**

### **Method 1: Namecheap Dashboard**
1. **Login to Namecheap**:
   - Go to: https://ap.www.namecheap.com/
   - Login with your Namecheap account credentials

2. **Navigate to Email Management**:
   - Click "Domain List" in the left sidebar
   - Find "smilingsteps.com" and click "Manage"
   - Look for "Email" or "Private Email" tab

3. **Access Email Account**:
   - Find hr@smilingsteps.com in the email list
   - Click "Manage" or "Settings" next to it
   - Look for "Change Password" or "View Password"

### **Method 2: Reset Password (Recommended)**
1. **Reset Email Password**:
   - In email management, click "Reset Password" for hr@smilingsteps.com
   - Set a strong, memorable password
   - Save this password securely

## 📝 **Step 2: Update Your .env File**

Replace the current email configuration in your `.env` file:

```env
# Namecheap Email Configuration
EMAIL_HOST="mail.smilingsteps.com"
EMAIL_PORT=587
EMAIL_USER="hr@smilingsteps.com"
EMAIL_PASSWORD="your-actual-namecheap-password-here"
FROM_EMAIL="hr@smilingsteps.com"
FROM_NAME="Smiling Steps"
CLIENT_URL="http://localhost:3000"

# Remove or comment out Gmail settings
# EMAIL_USER="your-gmail@gmail.com"
# EMAIL_PASSWORD="your-gmail-app-password"
```

## 🔍 **Step 3: Common Namecheap SMTP Settings**

### **Primary Settings (Try First)**:
- **Host**: mail.smilingsteps.com
- **Port**: 587
- **Security**: STARTTLS
- **Authentication**: Required

### **Alternative Settings (If Primary Fails)**:
- **Host**: mail.smilingsteps.com
- **Port**: 465
- **Security**: SSL/TLS
- **Authentication**: Required

## 🧪 **Step 4: Test Your Email Configuration**

1. **Update .env with real password**
2. **Run email test**:
   ```bash
   node test-real-email.js
   ```
3. **Check for success message**:
   ```
   📧 Using custom SMTP server: mail.smilingsteps.com
   ✅ Email sent successfully!
   ```

## 🚀 **Step 5: Restart Your Server**

```bash
# Stop current server (Ctrl+C)
# Start with MongoDB:
node server/index-mongodb.js
```

## ✅ **Step 6: Test Registration Flow**

1. **Open your app**: http://localhost:3000
2. **Register a new user** with a real email address
3. **Check console** for email sending confirmation
4. **Check your email inbox** for verification email from hr@smilingsteps.com

## 🎯 **Expected Results**

### **Console Output**:
```
📧 Using custom email hosting: mail.smilingsteps.com
Verification email sent successfully: <message-id>
```

### **Email Received**:
```
From: Smiling Steps <hr@smilingsteps.com>
To: user@example.com
Subject: Verify Your Email - Smiling Steps

Welcome to Smiling Steps!
[Verification content...]
```

## 🚨 **Troubleshooting**

### **If Email Fails to Send**:

1. **Check Password**:
   - Ensure you're using the correct Namecheap email password
   - Try resetting the password in Namecheap dashboard

2. **Try Alternative Port**:
   ```env
   EMAIL_PORT=465
   ```
   And update the service to use `secure: true`

3. **Check Host Name**:
   - Verify `mail.smilingsteps.com` is correct
   - Some providers use `smtp.smilingsteps.com`

4. **Check Namecheap Email Service**:
   - Ensure your email hosting is active
   - Check if there are any service restrictions

### **Common Error Messages**:

**"Authentication failed"**:
- Wrong password or username
- Email service not activated

**"Connection timeout"**:
- Wrong host or port
- Firewall blocking connection

**"Certificate error"**:
- Try setting `rejectUnauthorized: false` (already configured)

## 🔧 **Advanced Configuration**

### **If You Need SSL (Port 465)**:
Update the email service configuration:

```javascript
// In server/services/emailVerificationService.js
return nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === '465', // SSL for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});
```

## 📧 **Email Template Preview**

Your users will receive professional emails like this:

```
From: Smiling Steps <hr@smilingsteps.com>
Subject: Verify Your Email - Smiling Steps

🌟 Smiling Steps

Welcome to Smiling Steps, [User Name]!

Thank you for registering with us. We're excited to have you 
join our community focused on mental health and wellness.

[Verify Email Address Button]

Best regards,
The Smiling Steps Team
```

## 🎉 **Benefits of Using hr@smilingsteps.com**

✅ **Professional Branding**: Emails come from your domain  
✅ **Better Deliverability**: Less likely to be marked as spam  
✅ **User Trust**: Users trust emails from smilingsteps.com  
✅ **Brand Consistency**: Matches your website domain  
✅ **Full Control**: You own and manage the email system  

## 📞 **Need Help?**

If you encounter issues:

1. **Check Namecheap Support**: Live chat or support ticket
2. **Verify Email Service**: Ensure Private Email is active
3. **Test with Email Client**: Try setting up in Outlook/Mail app first
4. **Contact Support**: Ask for SMTP settings verification

**Once configured, your email verification system will send professional, branded emails that build trust with your users!**