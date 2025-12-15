# 🧪 Video Call Testing Guide

## Quick Start - Test in 5 Minutes

### Step 1: Start Your Servers

**Terminal 1 - Backend:**
```bash
npm start
```
Wait for: `✅ Server running on port 5000 with MongoDB`

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```
Wait for: Browser opens at `http://localhost:3001`

---

### Step 2: Create a Test Session

You need a session that's happening "now" (within 30 minutes). You have 2 options:

#### Option A: Use MongoDB Compass (Easiest)
1. Open MongoDB Compass
2. Connect to your database
3. Find the `sessions` collection
4. Find any session or create one
5. Edit the session:
   - Set `sessionDate` to **NOW + 10 minutes**: `new Date(Date.now() + 10 * 60 * 1000)`
   - Set `status` to `"Confirmed"`
   - Set `paymentStatus` to `"Confirmed"`
   - Save

#### Option B: Use a Script
Create a file `create-test-video-session.js`:
```javascript
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'your-mongodb-uri');

const Session = require('./server/models/Session');

async function createTestSession() {
  // Find a client and psychologist from your database
  const User = require('./server/models/User');
  
  const client = await User.findOne({ role: 'client' });
  const psychologist = await User.findOne({ role: 'psychologist' });
  
  if (!client || !psychologist) {
    console.log('❌ Need at least one client and one psychologist');
    return;
  }
  
  // Create session 10 minutes from now
  const session = await Session.create({
    client: client._id,
    psychologist: psychologist._id,
    sessionType: 'Individual',
    sessionDate: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    status: 'Confirmed',
    paymentStatus: 'Confirmed',
    price: 2000,
    isVideoCall: true
  });
  
  console.log('✅ Test session created!');
  console.log('Session ID:', session._id);
  console.log('Client:', client.email);
  console.log('Psychologist:', psychologist.email);
  console.log('Time:', session.sessionDate);
  
  process.exit(0);
}

createTestSession();
```

Run it:
```bash
node create-test-video-session.js
```

---

### Step 3: Test the Video Call

#### Window 1 - Client Side:
1. Open browser: `http://localhost:3001`
2. Login as **client** (the email from your test session)
3. Go to Dashboard
4. Look for "Upcoming Sessions" section
5. You should see a **"Join Call"** button (green)
6. Click **"Join Call"**
7. Allow camera and microphone when prompted
8. You should see your own video in a small box (top right)
9. Wait for the other person to join...

#### Window 2 - Psychologist Side:
1. Open **ANOTHER browser** (or incognito window): `http://localhost:3001`
2. Login as **psychologist** (the email from your test session)
3. Go to Dashboard
4. Look for "Today's Sessions" section
5. You should see a **"Join Video Call"** button (green)
6. Click **"Join Video Call"**
7. Allow camera and microphone when prompted
8. You should see your own video

#### What Should Happen:
- ✅ Both videos should appear
- ✅ You should see each other
- ✅ Call duration timer should be counting
- ✅ Controls should work (video on/off, mute, screen share)

---

## Troubleshooting

### Problem: "Join Call" button doesn't appear

**Check:**
1. Is the session within 30 minutes? (Frontend check)
2. Is `status` = "Confirmed"?
3. Is `paymentStatus` = "Confirmed" or "Paid"?
4. Refresh the dashboard page

**Fix:**
Update the session in MongoDB:
```javascript
{
  sessionDate: new Date(Date.now() + 10 * 60 * 1000),
  status: "Confirmed",
  paymentStatus: "Confirmed"
}
```

---

### Problem: "Cannot join call at this time"

**This means backend validation failed. Check:**
1. Session must be within **15 minutes** of start time (backend is stricter)
2. Payment must be confirmed
3. Session not cancelled

**Fix:**
Set session time closer to now:
```javascript
sessionDate: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
```

---

### Problem: Camera/Microphone not working

**Check:**
1. Browser permissions - Click the camera icon in address bar
2. Allow camera and microphone
3. Refresh the page
4. Try a different browser (Chrome works best)

---

### Problem: Can't see the other person

**Check:**
1. Both users clicked "Join Call"?
2. Check browser console for errors (F12)
3. Both browsers allowed camera/mic?
4. Wait 10-15 seconds for connection

**Common causes:**
- One person didn't allow camera/mic
- Firewall blocking WebRTC
- Both users behind strict NAT (rare with STUN servers)

---

## Testing Checklist

### Basic Functionality:
- [ ] Join Call button appears on dashboard
- [ ] Clicking button opens video call page
- [ ] Camera permission requested
- [ ] Local video appears (small box, top right)
- [ ] Remote video appears (full screen)
- [ ] Call duration timer works
- [ ] Can toggle video on/off
- [ ] Can mute/unmute audio
- [ ] Can share screen
- [ ] Can end call
- [ ] Redirects to dashboard after ending

### Edge Cases:
- [ ] Button hidden if session is >30 min away
- [ ] Button hidden if payment not confirmed
- [ ] Error shown if camera denied
- [ ] Reconnects if network drops briefly
- [ ] Shows "waiting" if other person hasn't joined
- [ ] Shows "disconnected" if other person leaves

---

## Quick Test Commands

### Check if servers are running:
```bash
# Backend
curl http://localhost:5000

# Frontend
curl http://localhost:3001
```

### Check WebRTC config:
```bash
# Get ICE servers (needs auth token)
curl http://localhost:5000/api/video-calls/config \
  -H "x-auth-token: YOUR_TOKEN"
```

### Check session:
```bash
# Check if can join (needs auth token)
curl http://localhost:5000/api/video-calls/can-join/SESSION_ID \
  -H "x-auth-token: YOUR_TOKEN"
```

---

## Browser Recommendations

**Best:** Chrome or Edge (Chromium)  
**Good:** Firefox  
**OK:** Safari (macOS/iOS)  
**Avoid:** Internet Explorer

---

## Common Test Scenarios

### Scenario 1: Happy Path
1. Client books session
2. Payment confirmed
3. Session time arrives
4. Both click "Join Call"
5. Video call works
6. Both can see/hear each other
7. Call ends successfully

### Scenario 2: Early Join Attempt
1. Client tries to join 1 hour early
2. Button doesn't appear (correct)
3. Wait until 30 min before
4. Button appears
5. Click button
6. Backend validates (15 min window)
7. May show "Cannot join yet" if too early

### Scenario 3: One Person Leaves
1. Both in call
2. Client ends call
3. Psychologist sees "Participant disconnected"
4. Psychologist can wait or end call

---

## Debug Mode

### Enable Console Logging:
Open browser console (F12) and run:
```javascript
localStorage.setItem('debug', 'simple-peer');
```

Refresh page. You'll see detailed WebRTC logs.

### Check Connection Status:
In the video call, open console and check:
```javascript
// Should show connection details
console.log('Connection status:', connectionStatus);
```

---

## Need Help?

### Check These Files:
- `VIDEO_CALL_PHASE2_STEP4_COMPLETE.md` - Component details
- `VIDEO_CALL_PHASE1_STEP3_COMPLETE.md` - API details
- `VIDEO_CALL_API_QUICK_REFERENCE.md` - API endpoints

### Common Issues:
1. **CORS errors** - Server CORS already configured for port 3001
2. **Auth errors** - Make sure you're logged in
3. **Session not found** - Check session ID is correct
4. **Payment not confirmed** - Update session in database

---

## Success Criteria

You'll know it's working when:
- ✅ You see yourself in the small video box
- ✅ You see the other person in the large video
- ✅ Audio works (test by speaking)
- ✅ Video quality is clear
- ✅ Controls respond immediately
- ✅ Call duration counts up
- ✅ No errors in console

**That's it! You now have a working video call system!** 🎉
