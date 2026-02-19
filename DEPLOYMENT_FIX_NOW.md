# 🚨 URGENT: Fix Deployment Error

## Problem
Your deployment failed with this error:
```
Error: Missing required environment variables: ALLOWED_ORIGINS
```

## Solution: Add Missing Environment Variables

You need to add **3 environment variables** to your Render backend service:

### Step 1: Go to Render Environment Variables

1. You're already on the Render dashboard
2. Make sure you're on the **backend service** (smiling-steps-backend or similar)
3. Go to the **Environment** tab

### Step 2: Add These 3 Variables

Add or update these environment variables:

| Variable Name | Value |
|--------------|-------|
| `EMAIL_USER` | `smilingstep254@gmail.com` |
| `EMAIL_PASSWORD` | `piumifpbbjklfqtp` |
| `ALLOWED_ORIGINS` | `https://smiling-steps-frontend.onrender.com` |

### Step 3: Save and Redeploy

1. Click **"Save Changes"** at the bottom
2. Render will automatically redeploy
3. Wait 2-3 minutes for deployment to complete

---

## What Each Variable Does

- **EMAIL_USER**: Your new Gmail address for sending emails
- **EMAIL_PASSWORD**: The Gmail app password you just generated
- **ALLOWED_ORIGINS**: Your frontend URL (for CORS security)

---

## After Deployment Succeeds

Once you see "Deploy succeeded" message:

1. Visit your production site
2. Test contact information on Founder page
3. Test WhatsApp button
4. Register a test user to verify email works

---

## If You Don't Know Your Frontend URL

Your frontend URL is likely one of these:
- `https://smiling-steps-frontend.onrender.com`
- `https://smiling-steps.onrender.com`
- Check your Render dashboard for the exact URL

Use that URL as the value for `ALLOWED_ORIGINS`.

---

## Quick Checklist

- [ ] Add `EMAIL_USER` = `smilingstep254@gmail.com`
- [ ] Add `EMAIL_PASSWORD` = `piumifpbbjklfqtp`
- [ ] Add `ALLOWED_ORIGINS` = `https://smiling-steps-frontend.onrender.com`
- [ ] Click "Save Changes"
- [ ] Wait for "Deploy succeeded"
- [ ] Test your site

---

**You're almost there! Just add these 3 variables and you're done.** 🚀
