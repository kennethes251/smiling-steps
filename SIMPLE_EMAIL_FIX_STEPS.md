# ✅ Simple Steps to Fix Email Problem

## What's Wrong?
Your Gmail password for sending emails is not working anymore.

## How to Fix (3 Easy Steps)

### Step 1: Get New Gmail Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with: `smilingstep254@gmail.com`
3. Click "Select app" → Choose "Mail"
4. Click "Select device" → Choose "Other"
5. Type: "Smiling Steps"
6. Click "Generate"
7. **Copy the password** (it looks like: `abcd efgh ijkl mnop`)
8. Remove the spaces: `abcdefghijklmnop`

---

### Step 2: Update Render

1. Go to: https://dashboard.render.com
2. Click on your app (smiling-steps)
3. Click "Environment" on the left
4. Find `EMAIL_PASSWORD`
5. Click "Edit"
6. Paste the new password (without spaces)
7. Click "Save Changes"

Render will restart automatically (takes 2-3 minutes).

---

### Step 3: Test It

1. Go to: https://smiling-steps.onrender.com/psychologist-register
2. Register a new psychologist
3. Check email inbox (and spam folder)
4. You should receive the verification email!

---

## That's It!

The code fix is already deployed. You just need to update the Gmail password in Render.

**If you still don't receive emails after this, let me know and we'll try a different email service (SendGrid).**
