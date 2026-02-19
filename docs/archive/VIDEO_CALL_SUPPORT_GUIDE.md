# 🛠️ Video Call Support Guide

## For Support Staff and Administrators

### Quick Diagnosis Checklist

When a user reports video call issues, ask these questions:

1. **What browser are you using?** (Chrome is best)
2. **What error message do you see?** (exact text)
3. **Can you see the "Join Call" button?** (timing/payment issues)
4. **Did you allow camera/microphone permissions?** (most common issue)
5. **Are you on WiFi or ethernet?** (connection quality)
6. **What other apps are open?** (Zoom, Teams conflicts)

---

## Common Issue Categories

### 1. Button/Access Issues (40% of problems)

**Symptoms:**
- "Join Call" button missing
- Button present but disabled
- "Cannot join call at this time" error

**Diagnosis:**
```bash
# Check session timing and payment status
curl -H "x-auth-token: USER_TOKEN" \
  http://localhost:5000/api/video-calls/can-join/SESSION_ID
```

**Common Causes:**
- Session more than 15 minutes away
- Payment not confirmed (`paymentStatus !== 'Confirmed'`)
- Session cancelled or declined
- User not participant in session

**Resolution:**
1. Verify session details in database
2. Check payment status
3. Update session timing if needed
4. Confirm user is client or psychologist for session

### 2. Permission Issues (30% of problems)

**Symptoms:**
- Black screen instead of video
- "Permission denied" errors
- Can see self but not other person

**Browser-Specific Solutions:**

**Chrome:**
1. Click lock/camera icon in address bar
2. Set Camera and Microphone to "Allow"
3. Refresh page

**Firefox:**
1. Click shield icon in address bar
2. Disable Enhanced Tracking Protection for site
3. Allow permissions when prompted

**Safari:**
1. Safari > Preferences > Websites > Camera
2. Set to "Allow" for smilingsteps domain
3. Refresh page

**System-Level Permissions:**
- **Windows:** Settings > Privacy > Camera/Microphone
- **macOS:** System Preferences > Security & Privacy > Camera/Microphone

### 3. Connection Issues (20% of problems)

**Symptoms:**
- "Connecting..." never resolves
- Video freezes or is choppy
- One person can't see the other

**Network Diagnostics:**
```bash
# Test WebRTC connectivity
# Have user visit: https://test.webrtc.org/
```

**Common Causes:**
- Slow internet (< 1 Mbps)
- Corporate firewall blocking WebRTC
- Multiple video apps running
- Router/NAT issues

**Resolution Steps:**
1. Speed test (speedtest.net)
2. Close competing applications
3. Try different network (mobile hotspot)
4. Use wired connection if possible

### 4. Hardware Issues (10% of problems)

**Symptoms:**
- Camera works in other apps but not video calls
- Audio echo or feedback
- External camera not detected

**Troubleshooting:**
1. Test camera in system settings
2. Try different USB port (external cameras)
3. Update camera drivers
4. Recommend headphones for audio issues

---

## Technical Diagnostics

### Backend Health Checks

```bash
# Check if video call service is running
curl http://localhost:5000/api/video-calls/config

# Expected response:
{
  "iceServers": [
    {"urls": "stun:stun.l.google.com:19302"}
  ]
}
```

### Database Queries

```javascript
// Check session details
db.sessions.findOne({_id: ObjectId("SESSION_ID")})

// Look for:
// - sessionDate (within valid range)
// - status: "Confirmed"
// - paymentStatus: "Confirmed" or "Paid"
// - client and psychologist IDs
```

### Socket.io Connection Test

```javascript
// In browser console during video call:
console.log('Socket connected:', socket.connected);
console.log('Room joined:', currentRoom);
```

### WebRTC Connection Status

```javascript
// In browser console during video call:
console.log('Peer connection state:', peer.connectionState);
console.log('ICE connection state:', peer.iceConnectionState);
```

---

## Escalation Procedures

### Level 1: User Self-Service (5 minutes)
- Direct to VIDEO_CALL_QUICK_FIXES.md
- Basic browser troubleshooting
- Permission checks

### Level 2: Support Assistance (15 minutes)
- Screen sharing to diagnose issue
- Browser-specific guidance
- Network troubleshooting

### Level 3: Technical Investigation (30+ minutes)
- Database session verification
- Server log analysis
- WebRTC connection debugging
- Escalate to development team

---

## Resolution Scripts

### Fix Session Timing
```javascript
// Update session to be joinable now
db.sessions.updateOne(
  {_id: ObjectId("SESSION_ID")},
  {
    $set: {
      sessionDate: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
      status: "Confirmed",
      paymentStatus: "Confirmed"
    }
  }
)
```

### Generate New Meeting Link
```bash
# Regenerate room ID for session
curl -X POST -H "x-auth-token: ADMIN_TOKEN" \
  http://localhost:5000/api/video-calls/generate-room/SESSION_ID
```

### Clear User Session Data
```javascript
// If user has cached connection issues
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```

---

## Monitoring and Metrics

### Key Metrics to Track
- Connection success rate (target: >95%)
- Average connection time (target: <5 seconds)
- Permission denial rate
- Browser compatibility issues
- Support ticket volume by issue type

### Log Analysis
```bash
# Check for video call errors in server logs
tail -f server/logs/app.log | grep "video-call"

# Common error patterns:
# - "Session not found"
# - "Payment not confirmed"
# - "User not authorized"
# - "WebRTC connection failed"
```

---

## User Communication Templates

### Permission Issue Response
```
Hi [Name],

It looks like your browser needs permission to access your camera and microphone. Here's how to fix this:

1. Look for a camera icon in your browser's address bar
2. Click it and select "Allow" for both camera and microphone
3. Refresh the page and try joining the call again

If you don't see the camera icon, try using Chrome browser which works best with our video calls.

Let me know if you need any help!
```

### Connection Issue Response
```
Hi [Name],

I see you're having trouble connecting to your video call. Let's try these quick fixes:

1. Close any other video apps (Zoom, Teams, Skype)
2. Move closer to your WiFi router or use an ethernet cable
3. Refresh your browser page and try again

If that doesn't work, try opening an incognito/private browser window and logging in again.

Your session is still scheduled - we'll get this working!
```

### Browser Compatibility Response
```
Hi [Name],

For the best video call experience, I recommend using Google Chrome browser. Here's why:

- Chrome has the best support for video calls
- Screen sharing works perfectly
- Fewer connection issues

You can download Chrome free at: chrome.google.com

Once installed, log into your account and try the video call again. Let me know how it goes!
```

---

## Prevention Strategies

### User Education
- Send pre-session email with browser requirements
- Include link to VIDEO_CALL_QUICK_FIXES.md
- Recommend testing video calls before first session

### System Improvements
- Add browser detection and warnings
- Implement connection quality indicators
- Create automated permission request flow
- Add fallback options (audio-only mode)

### Proactive Monitoring
- Alert on high error rates
- Monitor browser compatibility trends
- Track support ticket patterns
- Regular testing on different devices/browsers

---

## Advanced Troubleshooting

### Corporate Network Issues
```
Many corporate networks block WebRTC traffic. Solutions:
1. Contact IT department about firewall settings
2. Try mobile hotspot as alternative
3. Use VPN if company allows
4. Schedule session outside office hours
```

### Multiple Camera/Microphone Issues
```javascript
// List available devices
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    devices.forEach(device => {
      console.log(device.kind + ": " + device.label);
    });
  });
```

### WebRTC Debugging
```javascript
// Enable detailed WebRTC logs
localStorage.setItem('debug', 'simple-peer');
// Refresh page and check console for connection details
```

---

## Contact Information

**For Technical Escalation:**
- Development Team: dev@smilingsteps.com
- System Administrator: admin@smilingsteps.com
- Emergency Contact: [Phone number]

**Documentation Updates:**
- Report issues with this guide to: support@smilingsteps.com
- Suggest improvements based on common user issues

---

*Last Updated: December 15, 2025*  
*Version: 1.0*