# 🚀 Quick Deployment Guide

## ⚡ Deploy in 3 Steps

### Step 1: Configure Gmail (10 minutes)

1. **Log into Gmail**: smilingstep254@gmail.com
2. **Enable 2FA**: Google Account → Security → 2-Step Verification
3. **Generate App Password**:
   - Security → App passwords
   - App: Mail, Device: Other (Smiling Steps)
   - Copy the 16-character password
4. **Update `.env`**:
   ```env
   EMAIL_PASSWORD=[paste-your-16-char-password-here]
   ```

---

### Step 2: Set Up WhatsApp Business (15 minutes)

1. **Download**: WhatsApp Business app
2. **Register**: Phone number 0118832083
3. **Set Profile**:
   - Name: Smiling Steps
   - Category: Mental Health Service
   - Email: smilingstep254@gmail.com
4. **Configure**:
   - Greeting message
   - Business hours (Mon-Fri 8AM-6PM)
   - Quick replies

---

### Step 3: Deploy (5 minutes)

```bash
# Commit and push
git add .
git commit -m "Update contact info and add WhatsApp integration"
git push origin main

# Render will auto-deploy
# Or manually restart your server
```

---

## ✅ Post-Deployment Testing (10 minutes)

Visit your production site and test:

1. **Founder Page** (`/founder`)
   - [ ] Click WhatsApp card → Opens WhatsApp
   - [ ] Verify email: smilingstep254@gmail.com
   - [ ] Verify phone: 0118832083

2. **FAQ Section**
   - [ ] Click "WhatsApp Us" button

3. **Payment Flow**
   - [ ] Create test booking
   - [ ] Verify M-Pesa number: 0118832083

4. **Email Test**
   - [ ] Register test user
   - [ ] Check verification email arrives

---

## 📱 Contact Information

| Type | Value |
|------|-------|
| **Phone** | 0118832083 |
| **Email** | smilingstep254@gmail.com |
| **WhatsApp** | https://wa.me/254118832083 |

---

## 🆘 Quick Troubleshooting

**Email not sending?**
- Check Gmail app password in `.env`
- Verify 2FA is enabled
- Check server logs

**WhatsApp not working?**
- Verify link: `https://wa.me/254118832083`
- Test on mobile device
- Clear browser cache

**Old info still showing?**
- Hard refresh (Ctrl+Shift+R)
- Clear cache
- Verify deployment completed

---

## 📚 Full Documentation

For detailed guides, see:
- `DEPLOYMENT_READY.md` - Complete deployment guide
- `WHATSAPP_INTEGRATION_GUIDE.md` - WhatsApp setup
- `CONTACT_INFO_UPDATE_SUMMARY.md` - All changes

---

**Total Time: ~30 minutes**

**Status: ✅ READY TO DEPLOY**
