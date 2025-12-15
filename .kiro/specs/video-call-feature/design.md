# Video Call Feature - Design Document

## Architecture Overview

### High-Level Architecture
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │◄───────►│   Server    │◄───────►│  Database   │
│  (React)    │  HTTP   │  (Node.js)  │  Query  │  (MongoDB)  │
│             │  REST   │             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │
       │    WebSocket          │
       │    (Socket.io)        │
       └───────────────────────┘
       │                       │
       │    WebRTC P2P         │
       │    (Media Stream)     │
       └───────────────────────┘
              Direct
```

### Component Architecture
```
Frontend (React)
├── Pages
│   └── VideoCallPageNew.js (Route wrapper)
├── Components
│   └── VideoCall
│       └── VideoCallRoomNew.js (Main component)
└── Services
    ├── Socket.io Client
    └── WebRTC (simple-peer)

Backend (Node.js)
├── Routes
│   └── videoCalls.js (REST API)
├── Services
│   └── videoCallService.js (Socket.io server)
├── Config
│   └── webrtc.js (ICE servers)
└── Models
    └── Session.js (Extended)

Infrastructure
├── STUN Servers (Google - Free)
└── TURN Server (Self-hosted - Optional)
```

## Data Model

### Session Model Extensions
```javascript
{
  // Existing fields...
  
  // Video call specific fields
  meetingLink: String,           // Unique room ID
  isVideoCall: Boolean,          // Default: true
  videoCallStarted: Date,        // Call start timestamp
  videoCallEnded: Date,          // Call end timestamp
  callDuration: Number,          // Duration in minutes
  recordingEnabled: Boolean,     // Future: recording flag
  recordingUrl: String           // Future: recording location
}
```

### Active Rooms (In-Memory)
```javascript
Map<roomId, {
  participants: [{
    socketId: String,
    userId: String,
    userName: String,
    userRole: String
  }],
  startTime: Date
}>
```

## API Design

### REST Endpoints

#### GET /api/video-calls/config
**Purpose:** Get WebRTC ICE server configuration

**Request:**
```http
GET /api/video-calls/config
Headers: x-auth-token: JWT_TOKEN
```

**Response:**
```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "turn:server.ip:3478", "username": "user", "credential": "pass" }
  ]
}
```

#### POST /api/video-calls/generate-room/:sessionId
**Purpose:** Generate unique room ID for session

**Request:**
```http
POST /api/video-calls/generate-room/507f1f77bcf86cd799439011
Headers: x-auth-token: JWT_TOKEN
```

**Response:**
```json
{
  "roomId": "room-uuid-here",
  "sessionId": "507f1f77bcf86cd799439011",
  "sessionDate": "2025-12-15T14:00:00.000Z",
  "sessionType": "Individual",
  "participants": {
    "client": { "id": "...", "name": "John Doe" },
    "psychologist": { "id": "...", "name": "Dr. Smith" }
  }
}
```

#### GET /api/video-calls/can-join/:sessionId
**Purpose:** Check if user can join call

**Response:**
```json
{
  "canJoin": true,
  "reason": null,
  "minutesUntilSession": 10
}
```

#### POST /api/video-calls/start/:sessionId
**Purpose:** Mark call as started

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

#### POST /api/video-calls/end/:sessionId
**Purpose:** Mark call as ended, calculate duration

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

### WebSocket Events (Socket.io)

#### Client → Server

**join-room**
```javascript
{
  roomId: String,
  userId: String,
  userName: String,
  userRole: String
}
```

**offer**
```javascript
{
  offer: RTCSessionDescription,
  to: String  // Target socket ID
}
```

**answer**
```javascript
{
  answer: RTCSessionDescription,
  to: String  // Target socket ID
}
```

**ice-candidate**
```javascript
{
  candidate: RTCIceCandidate,
  to: String  // Target socket ID
}
```

**leave-room**
```javascript
{
  roomId: String,
  userId: String
}
```

**call-ended**
```javascript
{
  roomId: String,
  duration: Number  // Duration in minutes
}
```

#### Server → Client

**room-joined**
```javascript
{
  roomId: String,
  participants: [{
    socketId: String,
    userId: String,
    userName: String,
    userRole: String
  }]
}
```

**user-joined**
```javascript
{
  socketId: String,
  userId: String,
  userName: String,
  userRole: String
}
```

**user-left**
```javascript
{
  socketId: String,
  userId: String
}
```

**offer**
```javascript
{
  offer: RTCSessionDescription,
  from: String  // Sender socket ID
}
```

**answer**
```javascript
{
  answer: RTCSessionDescription,
  from: String  // Sender socket ID
}
```

**ice-candidate**
```javascript
{
  candidate: RTCIceCandidate,
  from: String  // Sender socket ID
}
```

**error**
```javascript
{
  message: String,
  code: String,
  details: Object
}
```

## Security Architecture

### Authentication Flow
```
1. Client requests video call access
2. Server validates JWT token
3. Server checks session permissions
4. Server validates payment status
5. Server generates secure room ID
6. Client joins WebSocket with authenticated token
7. Server validates WebSocket connection
8. WebRTC peer connection established
```

### Security Measures

#### Transport Security
- **HTTPS/WSS Only**: All connections use TLS encryption
- **JWT Authentication**: All API calls require valid JWT tokens
- **Origin Validation**: WebSocket connections validate request origin
- **Rate Limiting**: API endpoints protected against abuse

#### WebRTC Security
- **DTLS-SRTP**: End-to-end encryption for media streams
- **ICE Candidate Validation**: Only valid STUN/TURN servers accepted
- **Peer Connection Validation**: Connections validated before establishment
- **Session Isolation**: Each session uses unique room IDs

#### Data Protection
- **Session Data Encryption**: Sensitive session data encrypted at rest
- **Audit Logging**: All video call access logged for compliance
- **No Recording**: Media streams not recorded or stored
- **Automatic Cleanup**: Room data cleaned up after sessions end

## Component Specifications

### Frontend Components

#### VideoCallRoomNew.js
**Purpose:** Main video call interface component

**Props:**
```javascript
{
  sessionId: String,     // Session ID from URL params
  userRole: String,      // 'client' | 'psychologist' | 'admin'
  onCallEnd: Function    // Callback when call ends
}
```

**State Management:**
```javascript
{
  localStream: MediaStream,
  remoteStream: MediaStream,
  peer: SimplePeer,
  socket: Socket,
  isConnected: Boolean,
  isVideoEnabled: Boolean,
  isAudioEnabled: Boolean,
  isScreenSharing: Boolean,
  connectionStatus: String,
  callDuration: Number,
  participants: Array,
  errors: Array
}
```

**Key Methods:**
- `initializeMedia()` - Request camera/microphone permissions
- `setupPeerConnection()` - Initialize WebRTC peer connection
- `toggleVideo()` - Enable/disable video stream
- `toggleAudio()` - Mute/unmute audio stream
- `startScreenShare()` - Begin screen sharing
- `endCall()` - Terminate call and cleanup resources

#### VideoCallErrorDisplay.js
**Purpose:** Display user-friendly error messages

**Error Types:**
- Permission denied (camera/microphone)
- Network connection failures
- WebRTC connection errors
- Session validation errors
- Payment validation errors

#### NetworkQualityIndicator.js
**Purpose:** Monitor and display connection quality

**Metrics:**
- Connection latency
- Packet loss rate
- Bandwidth utilization
- Video/audio quality indicators

### Backend Services

#### videoCallService.js
**Purpose:** Socket.io server for WebRTC signaling

**Key Functions:**
```javascript
// Room management
createRoom(sessionId, userId)
joinRoom(roomId, socketId, userInfo)
leaveRoom(roomId, socketId)
cleanupRoom(roomId)

// Signaling
handleOffer(socketId, offer, targetSocketId)
handleAnswer(socketId, answer, targetSocketId)
handleIceCandidate(socketId, candidate, targetSocketId)

// Session management
startCall(sessionId, roomId)
endCall(sessionId, duration)
updateCallStatus(sessionId, status)
```

**Room State Management:**
```javascript
const activeRooms = new Map();
// Structure: roomId -> {
//   sessionId: String,
//   participants: Map<socketId, userInfo>,
//   startTime: Date,
//   status: 'waiting' | 'active' | 'ended'
// }
```

#### videoCalls.js (Routes)
**Purpose:** REST API endpoints for video call management

**Middleware Stack:**
1. Authentication (JWT validation)
2. Session validation
3. Payment validation
4. Rate limiting
5. Request logging

**Error Handling:**
- Standardized error responses
- Detailed logging for debugging
- User-friendly error messages
- Automatic retry mechanisms

## Database Schema

### Session Model Extensions
```javascript
const sessionSchema = {
  // Existing fields...
  
  // Video call fields
  meetingLink: {
    type: String,
    unique: true,
    sparse: true
  },
  isVideoCall: {
    type: Boolean,
    default: true
  },
  videoCallStarted: {
    type: Date,
    default: null
  },
  videoCallEnded: {
    type: Date,
    default: null
  },
  callDuration: {
    type: Number, // Minutes
    default: 0
  },
  
  // Future enhancements
  recordingEnabled: {
    type: Boolean,
    default: false
  },
  recordingUrl: {
    type: String,
    default: null
  },
  
  // Audit fields
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 0
  }
};
```

### Audit Log Schema
```javascript
const auditLogSchema = {
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['join_attempt', 'join_success', 'call_start', 'call_end', 'error'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  },
  ipAddress: String,
  userAgent: String
};
```

## Infrastructure Requirements

### STUN/TURN Server Configuration
```javascript
// Free STUN servers (Google)
const stunServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

// Optional TURN server (self-hosted)
const turnServer = {
  urls: 'turn:your-turn-server.com:3478',
  username: process.env.TURN_USERNAME,
  credential: process.env.TURN_PASSWORD
};
```

### Environment Variables
```bash
# WebRTC Configuration
STUN_SERVER_URL=stun:stun.l.google.com:19302
TURN_SERVER_URL=turn:your-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password

# Security
VIDEO_CALL_JWT_SECRET=your-jwt-secret
VIDEO_CALL_ENCRYPTION_KEY=your-encryption-key

# Rate Limiting
VIDEO_CALL_RATE_LIMIT=10  # requests per minute
SOCKET_CONNECTION_LIMIT=100  # concurrent connections

# Monitoring
VIDEO_CALL_LOG_LEVEL=info
AUDIT_LOG_ENABLED=true
```

### Server Requirements
- **CPU**: 2+ cores for concurrent video processing
- **RAM**: 4GB+ for handling multiple WebRTC connections
- **Bandwidth**: 10Mbps+ for video streaming
- **Storage**: Minimal (only session metadata stored)
- **SSL Certificate**: Required for HTTPS/WSS

## Performance Specifications

### Target Metrics
- **Connection Time**: < 3 seconds average
- **Video Latency**: < 500ms end-to-end
- **Audio Latency**: < 200ms end-to-end
- **Video Quality**: 720p @ 24-30fps (adaptive)
- **Concurrent Sessions**: 100+ simultaneous calls
- **Uptime**: 99.9% availability

### Optimization Strategies
- **Adaptive Bitrate**: Adjust quality based on network conditions
- **Connection Pooling**: Reuse WebSocket connections
- **Resource Cleanup**: Automatic cleanup of ended sessions
- **Caching**: Cache ICE server configurations
- **Load Balancing**: Distribute connections across servers

## Error Handling Strategy

### Error Categories

#### Client-Side Errors
1. **Permission Errors**
   - Camera/microphone access denied
   - Screen sharing permission denied
   - Browser compatibility issues

2. **Network Errors**
   - WebSocket connection failures
   - WebRTC connection timeouts
   - ICE candidate gathering failures

3. **Session Errors**
   - Invalid session ID
   - Session not found
   - Payment not confirmed
   - Access outside allowed time window

#### Server-Side Errors
1. **Authentication Errors**
   - Invalid JWT token
   - Expired token
   - Insufficient permissions

2. **Validation Errors**
   - Session validation failures
   - Payment validation failures
   - User role validation failures

3. **System Errors**
   - Database connection failures
   - STUN/TURN server unavailable
   - Resource exhaustion

### Error Response Format
```javascript
{
  success: false,
  error: {
    code: 'VIDEO_CALL_ERROR_CODE',
    message: 'User-friendly error message',
    details: {
      // Technical details for debugging
    },
    timestamp: '2025-12-15T14:00:00.000Z',
    requestId: 'unique-request-id'
  }
}
```

## Testing Strategy

### Unit Testing
- **Component Testing**: React component behavior
- **Service Testing**: Backend service functions
- **Utility Testing**: Helper functions and utilities
- **Error Handling**: Error scenarios and edge cases

### Integration Testing
- **API Testing**: REST endpoint functionality
- **WebSocket Testing**: Socket.io event handling
- **Database Testing**: Session model operations
- **Authentication Testing**: JWT validation flows

### End-to-End Testing
- **User Journey Testing**: Complete call workflows
- **Cross-Browser Testing**: Chrome, Firefox, Safari, Edge
- **Network Testing**: Various connection qualities
- **Load Testing**: Concurrent session handling

### Property-Based Testing
- **Session Validation**: All valid sessions allow access
- **Payment Validation**: Only paid sessions allow calls
- **Time Window Validation**: Access only within allowed times
- **Permission Validation**: Only authorized users can join
- **Duration Calculation**: Accurate call duration tracking

## Deployment Architecture

### Development Environment
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Server    │    │  Database   │
│ localhost:  │◄──►│ localhost:  │◄──►│  MongoDB    │
│   3000      │    │   5000      │    │  Local      │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Production Environment
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Server    │    │  Database   │
│  (Netlify)  │◄──►│  (Render)   │◄──►│  MongoDB    │
│   HTTPS     │    │   HTTPS     │    │  Atlas      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │
       │    WebSocket      │
       │    (WSS)          │
       └───────────────────┘
```

### Monitoring and Logging
- **Application Logs**: Structured logging with Winston
- **Error Tracking**: Centralized error collection
- **Performance Metrics**: Response times and throughput
- **Usage Analytics**: Call success rates and durations
- **Security Monitoring**: Failed authentication attempts

## Future Enhancements

### Phase 2 Features
- **Group Video Calls**: 3+ participant support
- **Call Recording**: Optional session recording
- **Virtual Backgrounds**: Background replacement
- **In-Call Chat**: Text messaging during calls
- **Waiting Room**: Pre-call waiting area

### Phase 3 Features
- **Mobile App Support**: Native iOS/Android apps
- **Advanced Analytics**: Detailed call quality metrics
- **AI Features**: Noise cancellation, transcription
- **Integration APIs**: Third-party service integration
- **White-Label Solution**: Customizable branding

## Compliance and Security

### HIPAA Compliance
- **Data Encryption**: All data encrypted in transit and at rest
- **Access Controls**: Role-based access to video calls
- **Audit Logging**: Complete audit trail of all access
- **Data Retention**: Configurable data retention policies
- **Business Associate Agreements**: Vendor compliance

### Security Best Practices
- **Regular Security Audits**: Quarterly security reviews
- **Penetration Testing**: Annual penetration testing
- **Vulnerability Scanning**: Automated vulnerability detection
- **Security Training**: Team security awareness training
- **Incident Response**: Defined security incident procedures