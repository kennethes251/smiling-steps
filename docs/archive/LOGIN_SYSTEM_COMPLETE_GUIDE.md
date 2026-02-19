# 🔐 Complete Login System Guide & Troubleshooting

## Overview

Your teletherapy app has a robust authentication system with the following features:

- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** React + Material-UI + Axios
- **Security:** JWT tokens, bcrypt password hashing (12 rounds), account locking
- **Roles:** Client, Psychologist, Admin

---

## 📋 Login Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. USER ENTERS CREDENTIALS
   ↓
   [Login.js Component]
   - Email & Password form
   - Material-UI styled
   
2. SUBMIT TO AUTHCONTEXT
   ↓
   [AuthContext.js]
   - login(email, password)
   - POST /api/users/login
   
3. BACKEND VALIDATION
   ↓
   [server/routes/users.js]
   - Find user by email (case-insensitive)
   - Check if user exists
   - Verify password with bcrypt
   - Check account status:
     • Email verified? (clients only)
     • Account locked?
     • Psychologist approved?
   
4. GENERATE JWT TOKEN
   ↓
   [JWT Sign]
   - Payload: { user: { id, role } }
   - Expiration: 24 hours
   - Secret: JWT_SECRET from .env
   
5. RETURN TO FRONTEND
   ↓
   [AuthContext receives response]
   - Store token in localStorage
   - Set axios default header
   - Update auth state
   - Navigate to dashboard
   
6. SUBSEQUENT REQUESTS
   ↓
   [All API calls]
   - Include x-auth-token header
   - Middleware validates token
   - Extracts user info
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Invalid email or password"

**Symptoms:**
- Login fails even with correct credentials
- Error message: "Invalid email or password"

**Possible Causes:**

#### A. User doesn't exist
```bash
# Check if user exists
node debug-login-issue.js user@example.com
```

**Fix:** User needs to register first

#### B. Wrong password
```bash
# Test password
node debug-login-issue.js user@example.com
# Enter password when prompted
```

**Fix:** User needs to reset password or use correct password

#### C. Email case mismatch (Already handled in code)
```javascript
// Code already handles this:
const user = await User.findOne({ 
  email: email.toLowerCase().trim() 
});
```

---

### Issue 2: Account Locked

**Symptoms:**
- Error: "Account temporarily locked"
- Message: "Too many failed attempts. Try again in X minutes."

**Cause:** 5 or more failed login attempts

**Check Status:**
```bash
node debug-login-issue.js user@example.com
```

**Fix - Unlock Account:**
```bash
# Use existing unlock script
node unlock-account.js user@example.com

# Or unlock all accounts
node unlock-all-accounts.js
```

**Manual Fix (MongoDB):**
```javascript
const user = await User.findOne({ email: 'user@example.com' });
user.loginAttempts = 0;
user.lockUntil = null;
await user.save();
console.log('Account unlocked');
```

---

### Issue 3: Email Not Verified (Clients Only)

**Symptoms:**
- Error: "Email not verified"
- Message: "Please verify your email before logging in"

**Cause:** Client hasn't clicked verification link in email

**Check Status:**
```bash
node debug-login-issue.js client@example.com
```

**Fix - Manual Verification:**
```javascript
// Create verify-email.js
const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

async function verifyEmail(email) {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.log('User not found');
    return;
  }
  
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();
  
  console.log('✅ Email verified for:', user.email);
  mongoose.connection.close();
}

const email = process.argv[2];
verifyEmail(email);
```

**Run:**
```bash
node verify-email.js client@example.com
```

---

### Issue 4: Psychologist Not Approved

**Symptoms:**
- Error: "Account pending approval"
- Error: "Application rejected"
- Error: "Account disabled"

**Cause:** Psychologist account needs admin approval

**Check Status:**
```bash
node debug-login-issue.js psychologist@example.com
```

**Fix - Approve Psychologist:**
```javascript
// Create approve-psychologist.js
const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

async function approvePsychologist(email) {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.role !== 'psychologist') {
    console.log('Psychologist not found');
    return;
  }
  
  user.psychologistDetails.approvalStatus = 'approved';
  user.psychologistDetails.isActive = true;
  await user.save();
  
  console.log('✅ Psychologist approved:', user.email);
  mongoose.connection.close();
}

const email = process.argv[2];
approvePsychologist(email);
```

**Run:**
```bash
node approve-psychologist.js psychologist@example.com
```

**Or use existing script:**
```bash
node auto-approve-existing-psychologists.js
```

---

### Issue 5: Token Not Being Sent

**Symptoms:**
- Login succeeds but subsequent requests fail
- Error: "No token, authorization denied"

**Cause:** Token not being included in request headers

**Check:**
```javascript
// In browser console after login
console.log(localStorage.getItem('token'));
// Should show JWT token

// Check axios headers
console.log(axios.defaults.headers.common['x-auth-token']);
// Should show same token
```

**Fix:**
The code already handles this correctly in `setAuthToken.js`:
```javascript
import axios from 'axios';

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    delete axios.defaults.headers.common['x-auth-token'];
  }
};
```

If token is not being set, check:
1. Login response includes token
2. AuthContext is calling `setAuthToken(token)`
3. No axios instance conflicts

---

### Issue 6: CORS Errors

**Symptoms:**
- Login fails with CORS error
- "Access-Control-Allow-Origin" error in console

**Fix - Backend (server/index.js):**
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://smiling-steps-frontend.onrender.com'
  ],
  credentials: true
}));
```

---

### Issue 7: JWT Token Expired

**Symptoms:**
- Error: "Token has expired"
- User was logged in but now can't access protected routes

**Cause:** Token expired after 24 hours

**Fix:** User needs to log in again

**Improve UX:**
```javascript
// In AuthContext.js, add token refresh logic
useEffect(() => {
  const checkTokenExpiry = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          // Token expired
          logout();
          // Redirect to login
        }
      } catch (err) {
        logout();
      }
    }
  };
  
  checkTokenExpiry();
  const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, []);
```

---

## 🧪 Testing Your Login System

### 1. Run Comprehensive Tests
```bash
node test-login-comprehensive.js
```

This will test:
- ✅ Client login
- ✅ Psychologist login
- ✅ Invalid credentials rejection
- ✅ Missing fields validation
- ✅ Authenticated requests

### 2. Debug Specific User
```bash
node debug-login-issue.js user@example.com
```

This will show:
- User exists?
- Email verified?
- Account locked?
- Approval status (psychologists)
- Password hash valid?
- Test password match

### 3. Manual Testing Checklist

#### Test Case 1: Successful Client Login
```
Email: nancy@gmail.com
Password: password123
Expected: Login successful, redirect to dashboard
```

#### Test Case 2: Successful Psychologist Login
```
Email: john@gmail.com
Password: password123
Expected: Login successful, redirect to dashboard
```

#### Test Case 3: Invalid Credentials
```
Email: test@example.com
Password: wrongpassword
Expected: Error "Invalid email or password"
```

#### Test Case 4: Missing Fields
```
Email: test@example.com
Password: (empty)
Expected: Error "Email and password are required"
```

#### Test Case 5: Unverified Email (Client)
```
Email: unverified@example.com
Password: password123
Expected: Error "Please verify your email"
```

#### Test Case 6: Locked Account
```
Email: locked@example.com
Password: (any - 5 wrong attempts)
Expected: Error "Account temporarily locked"
```

---

## 🔒 Security Best Practices (Already Implemented)

### ✅ Your Code Already Has:

1. **Password Hashing**
   ```javascript
   // 12 salt rounds (very secure)
   const salt = await bcrypt.genSalt(12);
   this.password = await bcrypt.hash(this.password, salt);
   ```

2. **Account Locking**
   ```javascript
   // Lock after 5 failed attempts for 15 minutes
   if (user.loginAttempts >= 5) {
     user.lockUntil = Date.now() + 15 * 60 * 1000;
   }
   ```

3. **JWT Expiration**
   ```javascript
   // Tokens expire after 24 hours
   jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
   ```

4. **Password Never Returned**
   ```javascript
   // Password excluded from queries by default
   password: {
     type: String,
     select: false
   }
   ```

5. **Rate Limiting**
   ```javascript
   // Login rate limiter prevents brute force
   router.post('/login', loginRateLimiter, async (req, res) => {
   ```

6. **Email Verification**
   ```javascript
   // Clients must verify email before login
   if (user.role === 'client' && !user.isVerified) {
     return res.status(400).json({ ... });
   }
   ```

---

## 🚀 Quick Fixes for Common Scenarios

### Scenario 1: "I can't log in with my test account"
```bash
# Step 1: Check if account exists
node debug-login-issue.js your@email.com

# Step 2: If locked, unlock it
node unlock-account.js your@email.com

# Step 3: If not verified, verify it
node verify-email.js your@email.com

# Step 4: Try logging in again
```

### Scenario 2: "Psychologist can't log in"
```bash
# Approve the psychologist
node auto-approve-existing-psychologists.js

# Or approve specific one
node approve-psychologist.js psychologist@email.com
```

### Scenario 3: "Login works but dashboard shows 'Not authenticated'"
```bash
# Check token in browser console
localStorage.getItem('token')

# Check axios headers
axios.defaults.headers.common['x-auth-token']

# If missing, clear and re-login
localStorage.clear()
# Then log in again
```

### Scenario 4: "Need to reset all accounts for testing"
```bash
# Unlock all accounts
node unlock-all-accounts.js

# Verify all client emails
# (Create script if needed)

# Approve all psychologists
node auto-approve-existing-psychologists.js
```

---

## 📝 Code Examples

### Example 1: Create Test User with Verified Email
```javascript
// create-verified-user.js
const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

async function createVerifiedUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'client',
    isVerified: true // Skip email verification
  });
  
  console.log('✅ User created:', user.email);
  mongoose.connection.close();
}

createVerifiedUser();
```

### Example 2: Test Login Programmatically
```javascript
// test-login-simple.js
const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:5000/api/users/login', {
      email: 'nancy@gmail.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful');
    console.log('Token:', response.data.token);
    console.log('User:', response.data.user);
  } catch (error) {
    console.log('❌ Login failed');
    console.log('Error:', error.response?.data);
  }
}

testLogin();
```

### Example 3: Check User Status
```javascript
// check-user-status.js
const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

async function checkStatus(email) {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({ email })
    .select('+loginAttempts +lockUntil +isVerified');
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('User Status:');
  console.log('- Email:', user.email);
  console.log('- Role:', user.role);
  console.log('- Verified:', user.isVerified);
  console.log('- Locked:', user.lockUntil > Date.now());
  console.log('- Failed Attempts:', user.loginAttempts);
  
  if (user.role === 'psychologist') {
    console.log('- Approval:', user.psychologistDetails?.approvalStatus);
  }
  
  mongoose.connection.close();
}

checkStatus(process.argv[2]);
```

---

## 🎯 Summary

Your login system is **well-implemented** with strong security practices. Most issues are related to:

1. **Account status** (locked, unverified, unapproved)
2. **User doesn't exist** (needs to register)
3. **Wrong password** (user error)

Use the provided debugging tools to quickly identify and fix issues:

```bash
# Primary debugging tool
node debug-login-issue.js <email>

# Comprehensive testing
node test-login-comprehensive.js

# Quick fixes
node unlock-account.js <email>
node verify-email.js <email>
node approve-psychologist.js <email>
```

---

## 📞 Need More Help?

If you're still experiencing issues:

1. Run `node debug-login-issue.js <email>` and share the output
2. Check browser console for errors
3. Check server logs for error messages
4. Verify environment variables (JWT_SECRET, MONGODB_URI)
5. Ensure MongoDB is running and accessible

Your authentication system is solid - most issues are configuration or data-related, not code-related! 🎉
