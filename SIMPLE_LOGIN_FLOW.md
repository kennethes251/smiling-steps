# Simple Login Flow - How It Works

## The Flow is SIMPLE

### 1. User Logs In (ANY role)
```
User enters email + password → POST /api/users/login
```

### 2. Backend Checks & Returns
```javascript
// Backend checks credentials
// Returns: { token, user: { id, name, email, role, ... } }
```

### 3. Frontend Routes Based on Role
```javascript
// Dashboard.js automatically shows correct dashboard:
if (user.role === 'client') → ClientDashboard
if (user.role === 'psychologist') → PsychologistDashboard  
if (user.role === 'admin') → AdminDashboard
```

## That's It!

No special endpoints. No complicated logic. Just:
1. Login
2. Get user data with role
3. Show correct dashboard

## What I Fixed

1. ✅ Removed hardcoded production URL from AuthContext
2. ✅ Added `/profile` route to prevent UUID errors
3. ✅ Optimized server startup (removed slow sync)

## Test It

```bash
# Start server (faster now!)
cd server
npm start

# In another terminal, test login
node test-simple-login.js
```

## Server Startup Speed

**Before:** 10-15 seconds (syncing tables every time)
**Now:** 2-3 seconds (just checks connection)

If you need to sync tables: `FORCE_SYNC=true npm start`
