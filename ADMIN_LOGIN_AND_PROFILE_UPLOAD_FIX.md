# Admin Login & Profile Upload Fix

## Issue 1: Admin Login Authentication (400 Bad Request)

### Problem
- Admin account cannot authenticate (400 Bad Request)
- Other users (clients, psychologists) can log in successfully
- Possible causes:
  - Admin account doesn't exist in production database
  - Wrong password
  - Account is locked due to failed login attempts
  - Account is not verified

### Solution: Run Diagnostic Script

Run this command to check and fix your admin account:

```bash
node check-admin-production.js
```

This script will:
1. Connect to your production MongoDB database
2. Check if admin accounts exist
3. Display status of all admin accounts (verified, locked, etc.)
4. Automatically fix all issues:
   - Reset password to `Admin@2024`
   - Unlock account if locked
   - Set verified status to true
   - Reset login attempts to 0

### After Running the Script

Try logging in with:
- **Email**: The email shown in the script output (likely `admin@smilingsteps.com`)
- **Password**: `Admin@2024`

⚠️ **IMPORTANT**: Change this password immediately after first login!

---

## Issue 2: Profile Photo Upload Failure

### Problem
Profile photo uploads are failing because of an endpoint mismatch:
- **Frontend calls**: `/api/users/profile/picture`
- **Backend expects**: `/api/profile/picture`

### Root Cause
In `client/src/pages/ProfilePage.js` line 241:
```javascript
const response = await axios.put(
  `${API_BASE_URL}/api/users/profile/picture`,  // ❌ Wrong endpoint
  formDataWithFile,
  ...
);
```

But in `server/index.js` line 132, the profile routes are mounted at:
```javascript
app.use('/api/profile', require('./routes/profile'));  // ✅ Correct mount point
```

So the actual endpoint is `/api/profile/picture`, not `/api/users/profile/picture`.

### Solution
Fix the frontend to call the correct endpoint.

---

## Next Steps

1. **First**: Run the admin diagnostic script
   ```bash
   node check-admin-production.js
   ```

2. **Then**: Try logging in as admin with the credentials shown

3. **If admin login works**: I'll fix the profile upload endpoint mismatch

4. **If admin login still fails**: Check the Render backend logs for detailed error messages

---

## Checking Render Backend Logs

If the admin login still fails after running the script:

1. Go to your Render dashboard
2. Click on your backend service (`smiling-steps`)
3. Click on "Logs" tab
4. Try logging in as admin
5. Look for error messages in the logs
6. Share the error messages with me

The logs will show exactly why the login is failing (e.g., "User not found", "Invalid password", "Account locked", etc.)
