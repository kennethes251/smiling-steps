# Video Call API - Quick Reference

## Base URL
```
http://localhost:5000/api/video-calls
```

## Authentication
All endpoints require JWT token in header:
```
x-auth-token: YOUR_JWT_TOKEN
```

---

## Endpoints

### 1. Get WebRTC Configuration
```http
GET /api/video-calls/config
```

**Response:**
```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" }
  ]
}
```

**Use Case:** Frontend calls this to get ICE servers for WebRTC connection

---

### 2. Generate Video Room
```http
POST /api/video-calls/generate-room/:sessionId
```

**Requirements:**
- User must be client, psychologist, or admin
- Payment must be confirmed
- Session must not be cancelled/declined

**Response:**
```json
{
  "roomId": "room-uuid-here",
  "sessionId": "507f...",
  "participants": {
    "client": { "id": "...", "name": "John" },
    "psychologist": { "id": "...", "name": "Dr. Smith" }
  }
}
```

---

### 3. Check If Can Join
```http
GET /api/video-calls/can-join/:sessionId
```

**Response:**
```json
{
  "canJoin": true,
  "minutesUntilSession": 10,
  "reason": null
}
```

**Join Window:** 15 minutes before to 2 hours after session time

---

### 4. Start Video Call
```http
POST /api/video-calls/start/:sessionId
```

**Response:**
```json
{
  "message": "Video call started",
  "session": {
    "id": "...",
    "status": "In Progress",
    "videoCallStarted": "2025-12-15T14:00:00Z"
  }
}
```

---

### 5. End Video Call
```http
POST /api/video-calls/end/:sessionId
```

**Response:**
```json
{
  "message": "Video call ended",
  "duration": 45,
  "session": {
    "status": "Completed",
    "callDuration": 45
  }
}
```

---

### 6. Get Session Info
```http
GET /api/video-calls/session/:sessionId
```

**Response:**
```json
{
  "session": {
    "id": "...",
    "sessionType": "Individual",
    "status": "Confirmed",
    "paymentStatus": "Confirmed",
    "meetingLink": "room-uuid",
    "client": { ... },
    "psychologist": { ... }
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{ "error": "No token, authorization denied" }
```

### 403 Forbidden
```json
{ "error": "Unauthorized access to this session" }
```

### 404 Not Found
```json
{ "error": "Session not found" }
```

### 400 Bad Request
```json
{ 
  "error": "Payment must be confirmed before joining video call",
  "paymentStatus": "Pending"
}
```

---

## Frontend Integration Example

```javascript
// 1. Get WebRTC config
const configRes = await axios.get('/api/video-calls/config', {
  headers: { 'x-auth-token': token }
});
const iceServers = configRes.data.iceServers;

// 2. Check if can join
const canJoinRes = await axios.get(`/api/video-calls/can-join/${sessionId}`, {
  headers: { 'x-auth-token': token }
});

if (canJoinRes.data.canJoin) {
  // 3. Generate room
  const roomRes = await axios.post(
    `/api/video-calls/generate-room/${sessionId}`,
    {},
    { headers: { 'x-auth-token': token } }
  );
  
  const roomId = roomRes.data.roomId;
  
  // 4. Start call
  await axios.post(
    `/api/video-calls/start/${sessionId}`,
    {},
    { headers: { 'x-auth-token': token } }
  );
  
  // 5. Initialize WebRTC with roomId and iceServers
  // ... (Step 4 - Frontend component)
  
  // 6. When call ends
  await axios.post(
    `/api/video-calls/end/${sessionId}`,
    {},
    { headers: { 'x-auth-token': token } }
  );
}
```

---

## Testing

```bash
# Run test script
node test-video-call-api.js

# Or use curl
curl -X GET http://localhost:5000/api/video-calls/config \
  -H "x-auth-token: YOUR_TOKEN"
```
