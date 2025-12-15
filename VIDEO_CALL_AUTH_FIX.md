# ✅ Video Call Routes - Auth Middleware Fix

## Problem
Server crashed with error:
```
Error: Route.get() requires a callback function but got a [object Object]
at Route.<computed> [as get] (server/routes/videoCalls.js:8:8)
```

## Root Cause
The auth middleware is exported as a named export `{ auth }` from `server/middleware/auth.js`, but we were importing it as a default export.

**Wrong:**
```javascript
const auth = require('../middleware/auth');
```

**Correct:**
```javascript
const { auth } = require('../middleware/auth');
```

## Solution Applied
Updated `server/routes/videoCalls.js` line 3 to use destructuring import:
```javascript
const { auth } = require('../middleware/auth');
```

## Restart Server
```bash
npm start
```

The server should now start successfully with video call routes loaded!

## Expected Output
```
✅ MongoDB connected successfully
✅ Mongoose models loaded
✅ WebSocket server initialized for video calls
Loading routes...
  ✅ auth routes loaded
  ✅ users routes loaded
  ✅ upload routes loaded
  ✅ admin routes loaded
  ✅ blog routes loaded
  ✅ resource routes loaded
  ✅ public routes loaded
  ✅ sessions routes loaded
  ✅ mpesa routes loaded
  ✅ video call routes loaded  ← Should see this now!
✅ All routes loaded with MongoDB
✅ Server running on port 5000 with MongoDB
✅ WebSocket server ready for video calls
```
