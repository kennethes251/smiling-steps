# Video Call API Reference

## Overview

This document provides comprehensive API specifications for the Video Call feature, including REST endpoints, WebSocket events, error codes, and usage examples.

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-api-domain.com/api`

## Authentication

All API endpoints require authentication via JWT token in the request header:

```http
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## REST API Endpoints

### Video Call Configuration

#### GET /video-calls/config

Returns WebRTC ICE server configuration for establishing peer connections.

**Headers:**
```http
x-auth-token: <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "iceServers": [
      {
        "urls": "stun:stun.l.google.com:19302"
      },
      {
        "urls": "stun:stun1.l.google.com:19302"
      },
      {
        "urls": "turn:your-turn-server.com:3478",
        "username": "turnuser",
        "credential": "turnpass"
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing JWT token
- `500 Internal Server Error`: Server configuration error

### Room Management

#### POST /video-calls/generate-room/:sessionId

Generates or retrieves a unique room ID for the specified session.

**Parameters:**
- `sessionId` (path): MongoDB ObjectId of the session

**Headers:**
```http
x-auth-token: <JWT_TOKEN>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roomId": "room-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionId": "507f1f77bcf86cd799439011",
    "sessionDate": "2025-12-15T14:00:00.000Z",
    "sessionType": "Individual",
    "participants": {
      "client": {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "psychologist": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Dr. Jane Smith",
        "email": "dr.smith@example.com"
      }
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid session ID format
- `401 Unauthorized`: User not authorized for this session
- `404 Not Found`: Session not found
- `422 Unprocessable Entity`: Session not confirmed or payment pending

### Access Validation

#### GET /video-calls/can-join/:sessionId

Validates whether the authenticated user can join the video call for the specified session.

**Parameters:**
- `sessionId` (path): MongoDB ObjectId of the session

**Headers:**
```http
x-auth-token: <JWT_TOKEN>
```

**Response (200 OK) - Can Join:**
```json
{
  "success": true,
  "data": {
    "canJoin": true,
    "reason": null,
    "minutesUntilSession": 10,
    "sessionStatus": "confirmed",
    "paymentStatus": "completed",
    "timeWindow": {
      "allowedFrom": "2025-12-15T13:45:00.000Z",
      "allowedUntil": "2025-12-15T16:00:00.000Z"
    }
  }
}
```

**Response (200 OK) - Cannot Join:**
```json
{
  "success": true,
  "data": {
    "canJoin": false,
    "reason": "PAYMENT_PENDING",
    "minutesUntilSession": 10,
    "sessionStatus": "confirmed",
    "paymentStatus": "pending",
    "timeWindow": {
      "allowedFrom": "2025-12-15T13:45:00.000Z",
      "allowedUntil": "2025-12-15T16:00:00.000Z"
    }
  }
}
```

**Validation Rules:**
- Session must exist and be confirmed
- Payment must be completed
- Current time must be within allowed window (15 min before to 2 hours after)
- User must be a session participant

**Error Responses:**
- `400 Bad Request`: Invalid session ID format
- `401 Unauthorized`: User not authorized for this session
- `404 Not Found`: Session not found

### Call Management

#### POST /video-calls/start/:sessionId

Marks the video call as started and updates the session status to "In Progress".

**Parameters:**
- `sessionId` (path): MongoDB ObjectId of the session

**Headers:**
```http
x-auth-token: <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "startTime": "2025-12-15T14:00:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Video call started successfully",
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "In Progress",
      "videoCallStarted": "2025-12-15T14:00:00.000Z",
      "participants": {
        "client": "John Doe",
        "psychologist": "Dr. Jane Smith"
      }
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data or session already started
- `401 Unauthorized`: User not authorized for this session
- `404 Not Found`: Session not found
- `422 Unprocessable Entity`: Cannot start call (payment pending, etc.)

#### POST /video-calls/end/:sessionId

Marks the video call as ended, calculates duration, and updates session status to "Completed".

**Parameters:**
- `sessionId` (path): MongoDB ObjectId of the session

**Headers:**
```http
x-auth-token: <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "endTime": "2025-12-15T14:45:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Video call ended successfully",
    "duration": 45,
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "Completed",
      "videoCallStarted": "2025-12-15T14:00:00.000Z",
      "videoCallEnded": "2025-12-15T14:45:00.000Z",
      "callDuration": 45
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data or call not started
- `401 Unauthorized`: User not authorized for this session
- `404 Not Found`: Session not found
- `422 Unprocessable Entity`: Cannot end call (not started, etc.)

## WebSocket Events

### Connection

Connect to the WebSocket server with JWT authentication:

```javascript
import io from 'socket.io-client';

const socket = io('wss://your-server.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

#### join-room

Join a video call room.

**Event:** `join-room`

**Payload:**
```javascript
{
  roomId: "room-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  userId: "507f1f77bcf86cd799439012",
  userName: "John Doe",
  userRole: "client" // "client" | "psychologist" | "admin"
}
```

**Response Events:**
- `room-joined`: Successfully joined room
- `error`: Failed to join room

#### offer

Send WebRTC offer to establish peer connection.

**Event:** `offer`

**Payload:**
```javascript
{
  offer: {
    type: "offer",
    sdp: "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n..."
  },
  to: "target-socket-id"
}
```

#### answer

Send WebRTC answer in response to an offer.

**Event:** `answer`

**Payload:**
```javascript
{
  answer: {
    type: "answer",
    sdp: "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n..."
  },
  to: "target-socket-id"
}
```

#### ice-candidate

Send ICE candidate for NAT traversal.

**Event:** `ice-candidate`

**Payload:**
```javascript
{
  candidate: {
    candidate: "candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host",
    sdpMLineIndex: 0,
    sdpMid: "0"
  },
  to: "target-socket-id"
}
```

#### leave-room

Leave the video call room.

**Event:** `leave-room`

**Payload:**
```javascript
{
  roomId: "room-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  userId: "507f1f77bcf86cd799439012"
}
```

### Server → Client Events

#### room-joined

Confirmation that user successfully joined the room.

**Event:** `room-joined`

**Payload:**
```javascript
{
  roomId: "room-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  participants: [
    {
      socketId: "socket-123",
      userId: "507f1f77bcf86cd799439012",
      userName: "John Doe",
      userRole: "client"
    },
    {
      socketId: "socket-456",
      userId: "507f1f77bcf86cd799439013",
      userName: "Dr. Jane Smith",
      userRole: "psychologist"
    }
  ]
}
```

#### user-joined

Notification that another user joined the room.

**Event:** `user-joined`

**Payload:**
```javascript
{
  socketId: "socket-456",
  userId: "507f1f77bcf86cd799439013",
  userName: "Dr. Jane Smith",
  userRole: "psychologist"
}
```

#### user-left

Notification that a user left the room.

**Event:** `user-left`

**Payload:**
```javascript
{
  socketId: "socket-456",
  userId: "507f1f77bcf86cd799439013"
}
```

#### offer

Received WebRTC offer from another participant.

**Event:** `offer`

**Payload:**
```javascript
{
  offer: {
    type: "offer",
    sdp: "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n..."
  },
  from: "sender-socket-id"
}
```

#### answer

Received WebRTC answer from another participant.

**Event:** `answer`

**Payload:**
```javascript
{
  answer: {
    type: "answer",
    sdp: "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n..."
  },
  from: "sender-socket-id"
}
```

#### ice-candidate

Received ICE candidate from another participant.

**Event:** `ice-candidate`

**Payload:**
```javascript
{
  candidate: {
    candidate: "candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host",
    sdpMLineIndex: 0,
    sdpMid: "0"
  },
  from: "sender-socket-id"
}
```

#### error

Error notification from server.

**Event:** `error`

**Payload:**
```javascript
{
  message: "Room not found",
  code: "ROOM_NOT_FOUND",
  details: {
    roomId: "invalid-room-id"
  }
}
```

## Error Codes

### HTTP Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Invalid request format, missing parameters |
| 401 | Unauthorized | Invalid JWT token, expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Session not found, room not found |
| 422 | Unprocessable Entity | Business logic validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, database connection failed |

### WebSocket Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| ROOM_NOT_FOUND | Room ID does not exist | Generate new room ID |
| ROOM_FULL | Room has maximum participants | Wait for participant to leave |
| INVALID_SESSION | Session validation failed | Check session status and payment |
| AUTHENTICATION_FAILED | JWT token invalid | Refresh authentication token |
| PERMISSION_DENIED | User not authorized | Check user role and session access |
| CONNECTION_TIMEOUT | WebSocket connection timeout | Retry connection |

## Usage Examples

### Complete Call Flow

```javascript
// 1. Check if user can join call
const canJoinResponse = await fetch(`/api/video-calls/can-join/${sessionId}`, {
  headers: { 'x-auth-token': jwtToken }
});
const { canJoin } = await canJoinResponse.json();

if (!canJoin) {
  console.log('Cannot join call');
  return;
}

// 2. Get WebRTC configuration
const configResponse = await fetch('/api/video-calls/config', {
  headers: { 'x-auth-token': jwtToken }
});
const { iceServers } = await configResponse.json();

// 3. Generate room ID
const roomResponse = await fetch(`/api/video-calls/generate-room/${sessionId}`, {
  method: 'POST',
  headers: { 'x-auth-token': jwtToken }
});
const { roomId } = await roomResponse.json();

// 4. Connect to WebSocket
const socket = io(SERVER_URL, {
  auth: { token: jwtToken }
});

// 5. Join room
socket.emit('join-room', {
  roomId,
  userId: currentUser.id,
  userName: currentUser.name,
  userRole: currentUser.role
});

// 6. Handle room events
socket.on('room-joined', (data) => {
  console.log('Joined room:', data);
  // Initialize WebRTC peer connection
});

socket.on('user-joined', (data) => {
  console.log('User joined:', data);
  // Create offer for new user
});

// 7. Start call tracking
await fetch(`/api/video-calls/start/${sessionId}`, {
  method: 'POST',
  headers: {
    'x-auth-token': jwtToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    startTime: new Date().toISOString()
  })
});

// 8. End call tracking
await fetch(`/api/video-calls/end/${sessionId}`, {
  method: 'POST',
  headers: {
    'x-auth-token': jwtToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endTime: new Date().toISOString()
  })
});
```

### WebRTC Peer Connection Setup

```javascript
import SimplePeer from 'simple-peer';

// Initialize peer connection
const peer = new SimplePeer({
  initiator: isInitiator,
  trickle: false,
  config: { iceServers }
});

// Handle peer events
peer.on('signal', (data) => {
  if (data.type === 'offer') {
    socket.emit('offer', { offer: data, to: targetSocketId });
  } else if (data.type === 'answer') {
    socket.emit('answer', { answer: data, to: targetSocketId });
  }
});

peer.on('stream', (stream) => {
  // Display remote video stream
  remoteVideo.srcObject = stream;
});

peer.on('connect', () => {
  console.log('Peer connection established');
});

peer.on('error', (err) => {
  console.error('Peer connection error:', err);
});

// Handle incoming signals
socket.on('offer', ({ offer, from }) => {
  peer.signal(offer);
});

socket.on('answer', ({ answer, from }) => {
  peer.signal(answer);
});

// Get user media and add to peer
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then((stream) => {
  localVideo.srcObject = stream;
  peer.addStream(stream);
});
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Video call endpoints**: 10 requests per minute per user
- **WebSocket connections**: 3 connections per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
```

## Versioning

The API uses URL versioning. Current version is v1:
- Base URL: `/api/v1/video-calls/`
- Future versions will be available at `/api/v2/video-calls/`

## Support

For API support and questions:
- Documentation: [Video Call User Guides](VIDEO_CALL_USER_GUIDES_INDEX.md)
- Troubleshooting: [Video Call Troubleshooting Guide](VIDEO_CALL_TROUBLESHOOTING_GUIDE.md)
- Technical Support: Contact development team