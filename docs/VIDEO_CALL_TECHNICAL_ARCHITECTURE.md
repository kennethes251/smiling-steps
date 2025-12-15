# Video Call Feature - Technical Architecture

## System Overview

The video call feature implements a WebRTC-based peer-to-peer video communication system for the Smiling Steps teletherapy platform. The architecture follows a three-tier design with React frontend, Node.js backend, and MongoDB database.

## Core Technologies

### Frontend Stack
- **React 18**: Component-based UI framework
- **Material-UI**: Component library for consistent design
- **simple-peer**: WebRTC abstraction library
- **socket.io-client**: Real-time communication client

### Backend Stack
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **Socket.io**: Real-time bidirectional communication
- **MongoDB**: Document database for session storage
- **JWT**: JSON Web Tokens for authentication

### Infrastructure
- **STUN Servers**: Google's free STUN servers for NAT traversal
- **TURN Server**: Optional self-hosted relay server
- **HTTPS/WSS**: Secure transport layer
- **MongoDB Atlas**: Cloud database hosting

## Architecture Patterns

### Microservices Architecture
The video call feature is implemented as a modular service that integrates with existing platform components:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Auth Service  │  │  Video Service  │  │ Session Service │
│                 │  │                 │  │                 │
│ - JWT Validation│  │ - WebRTC Setup  │  │ - Booking Mgmt  │
│ - User Roles    │  │ - Signaling     │  │ - Payment Check │
│ - Permissions   │  │ - Room Mgmt     │  │ - Status Update │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Event-Driven Architecture
Real-time communication uses event-driven patterns with Socket.io:

```
Client Events → Socket.io Server → Event Handlers → Database Updates
     ↓                ↓                  ↓              ↓
WebRTC Setup → Signaling Exchange → Peer Connection → Call Tracking
```

## Data Flow Diagrams

### Call Initiation Flow
```
1. Client clicks "Join Call" button
2. Frontend validates session timing and payment
3. API call to generate/retrieve room ID
4. WebSocket connection established
5. WebRTC peer connection setup
6. Media stream exchange
7. Call status updated to "In Progress"
```

### Signaling Flow
```
Caller                    Signaling Server                 Callee
  │                            │                            │
  ├─── join-room ─────────────►│                            │
  │                            ├─── room-joined ──────────►│
  │                            │◄─── join-room ─────────────┤
  ├─── offer ─────────────────►│                            │
  │                            ├─── offer ─────────────────►│
  │                            │◄─── answer ────────────────┤
  │◄─── answer ────────────────┤                            │
  ├─── ice-candidate ─────────►│                            │
  │                            ├─── ice-candidate ─────────►│
```

## API Specifications

### REST API Endpoints

#### Authentication Required
All endpoints require `x-auth-token` header with valid JWT.

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "timestamp": "2025-12-15T14:00:00.000Z"
  }
}
```#### GET /ap
i/video-calls/config
Returns WebRTC ICE server configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "turn:server.com:3478", "username": "user", "credential": "pass" }
    ]
  }
}
```

#### POST /api/video-calls/generate-room/:sessionId
Generates unique room ID for session.

**Parameters:**
- `sessionId`: MongoDB ObjectId of the session

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid-here",
    "sessionId": "507f1f77bcf86cd799439011",
    "sessionDate": "2025-12-15T14:00:00.000Z",
    "participants": {
      "client": { "id": "...", "name": "John Doe" },
      "psychologist": { "id": "...", "name": "Dr. Smith" }
    }
  }
}
```

#### GET /api/video-calls/can-join/:sessionId
Validates if user can join the video call.

**Validation Rules:**
- Session must exist and be confirmed
- Payment must be completed
- Current time must be within 15 minutes before to 2 hours after session time
- User must be session participant (client, psychologist, or admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "canJoin": true,
    "reason": null,
    "minutesUntilSession": 10,
    "sessionStatus": "confirmed",
    "paymentStatus": "completed"
  }
}
```

#### POST /api/video-calls/start/:sessionId
Marks call as started and updates session status.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Video call started",
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "In Progress",
      "videoCallStarted": "2025-12-15T14:00:00.000Z"
    }
  }
}
```

#### POST /api/video-calls/end/:sessionId
Marks call as ended and calculates duration.

**Request Body:**
```json
{
  "endTime": "2025-12-15T14:45:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Video call ended",
    "duration": 45,
    "session": {
      "status": "Completed",
      "callDuration": 45,
      "videoCallEnded": "2025-12-15T14:45:00.000Z"
    }
  }
}
```

### WebSocket Events

#### Connection Authentication
WebSocket connections must include JWT token in auth object:
```javascript
const socket = io(SERVER_URL, {
  auth: {
    token: jwtToken
  }
});
```

#### Client → Server Events

**join-room**
```javascript
socket.emit('join-room', {
  roomId: 'room-uuid',
  userId: 'user-id',
  userName: 'User Name',
  userRole: 'client' | 'psychologist' | 'admin'
});
```

**offer**
```javascript
socket.emit('offer', {
  offer: RTCSessionDescription,
  to: 'target-socket-id'
});
```

**answer**
```javascript
socket.emit('answer', {
  answer: RTCSessionDescription,
  to: 'target-socket-id'
});
```

**ice-candidate**
```javascript
socket.emit('ice-candidate', {
  candidate: RTCIceCandidate,
  to: 'target-socket-id'
});
```

**leave-room**
```javascript
socket.emit('leave-room', {
  roomId: 'room-uuid',
  userId: 'user-id'
});
```

#### Server → Client Events

**room-joined**
```javascript
socket.on('room-joined', (data) => {
  // data: { roomId, participants: [...] }
});
```

**user-joined**
```javascript
socket.on('user-joined', (data) => {
  // data: { socketId, userId, userName, userRole }
});
```

**user-left**
```javascript
socket.on('user-left', (data) => {
  // data: { socketId, userId }
});
```

**offer**
```javascript
socket.on('offer', (data) => {
  // data: { offer, from: 'sender-socket-id' }
});
```

**answer**
```javascript
socket.on('answer', (data) => {
  // data: { answer, from: 'sender-socket-id' }
});
```

**ice-candidate**
```javascript
socket.on('ice-candidate', (data) => {
  // data: { candidate, from: 'sender-socket-id' }
});
```

**error**
```javascript
socket.on('error', (data) => {
  // data: { message, code, details }
});
```

## Component Architecture

### Frontend Component Hierarchy
```
VideoCallPageNew
└── VideoCallRoomNew
    ├── VideoDisplay
    │   ├── LocalVideo
    │   └── RemoteVideo
    ├── CallControls
    │   ├── VideoToggle
    │   ├── AudioToggle
    │   ├── ScreenShareToggle
    │   └── EndCallButton
    ├── ConnectionStatus
    ├── CallTimer
    ├── ParticipantList
    └── ErrorDisplay
```

### Backend Service Architecture
```
Express App
├── Routes
│   └── videoCalls.js
├── Middleware
│   ├── auth.js
│   ├── sessionValidation.js
│   └── rateLimiter.js
├── Services
│   ├── videoCallService.js (Socket.io)
│   ├── roomManager.js
│   └── sessionManager.js
└── Utils
    ├── meetingLinkGenerator.js
    └── callDurationCalculator.js
```

## Security Implementation

### Transport Layer Security
- **HTTPS Only**: All HTTP traffic redirected to HTTPS
- **WSS Only**: WebSocket connections use secure WebSocket protocol
- **TLS 1.2+**: Minimum TLS version enforced
- **HSTS Headers**: HTTP Strict Transport Security enabled

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with expiration
- **Role-Based Access**: User roles validated for each request
- **Session Validation**: Session ownership verified
- **Payment Validation**: Payment status checked before access

### WebRTC Security
- **DTLS-SRTP**: Automatic encryption for media streams
- **ICE Candidate Validation**: Only trusted STUN/TURN servers
- **Peer Connection Limits**: Maximum connections per user
- **Room Isolation**: Unique room IDs prevent unauthorized access

### Data Protection
- **Encryption at Rest**: Session data encrypted in database
- **Audit Logging**: All access attempts logged
- **Data Minimization**: Only necessary data stored
- **Automatic Cleanup**: Temporary data cleaned up after sessions

## Performance Optimization

### Frontend Optimizations
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Connection Pooling**: Reuse WebSocket connections
- **Resource Cleanup**: Proper cleanup of media streams

### Backend Optimizations
- **Connection Limits**: Maximum concurrent connections
- **Memory Management**: Automatic cleanup of ended rooms
- **Database Indexing**: Optimized queries for session lookup
- **Caching**: ICE server configuration cached

### Network Optimizations
- **Adaptive Bitrate**: Quality adjusted based on network
- **Connection Fallback**: TURN server fallback for NAT issues
- **Bandwidth Monitoring**: Real-time bandwidth detection
- **Quality Indicators**: Visual feedback for connection quality

## Monitoring and Observability

### Application Metrics
- **Connection Success Rate**: Percentage of successful connections
- **Call Duration**: Average and median call durations
- **Error Rates**: Categorized error frequency
- **Concurrent Sessions**: Real-time active session count

### Performance Metrics
- **Response Times**: API endpoint response times
- **WebSocket Latency**: Real-time communication delays
- **Database Query Times**: Session lookup performance
- **Memory Usage**: Server memory consumption

### Business Metrics
- **Session Completion Rate**: Percentage of completed sessions
- **User Satisfaction**: Call quality ratings
- **Platform Adoption**: Video call usage vs. other methods
- **Revenue Impact**: Revenue from video call sessions

## Deployment Strategy

### Environment Configuration
```bash
# Production Environment Variables
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=secure-secret-key
STUN_SERVER_URL=stun:stun.l.google.com:19302
TURN_SERVER_URL=turn:your-server.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password
CORS_ORIGIN=https://your-frontend-domain.com
```

### Deployment Pipeline
1. **Code Review**: Pull request review and approval
2. **Automated Testing**: Unit, integration, and E2E tests
3. **Security Scanning**: Vulnerability and dependency checks
4. **Staging Deployment**: Deploy to staging environment
5. **Manual Testing**: QA testing on staging
6. **Production Deployment**: Blue-green deployment strategy
7. **Monitoring**: Post-deployment monitoring and alerts

### Rollback Strategy
- **Database Migrations**: Reversible migration scripts
- **Feature Flags**: Ability to disable features remotely
- **Version Rollback**: Quick rollback to previous version
- **Data Backup**: Automated database backups before deployment

## Troubleshooting Guide

### Common Issues

#### Connection Failures
- **Symptoms**: Unable to establish WebRTC connection
- **Causes**: NAT/firewall issues, STUN server unavailable
- **Solutions**: Enable TURN server, check firewall settings

#### Audio/Video Issues
- **Symptoms**: No audio or video in call
- **Causes**: Permission denied, device not available
- **Solutions**: Check browser permissions, test device access

#### Performance Issues
- **Symptoms**: Poor video quality, high latency
- **Causes**: Network congestion, server overload
- **Solutions**: Reduce video quality, scale server resources

### Debugging Tools
- **Browser DevTools**: WebRTC internals and network analysis
- **Server Logs**: Structured logging with correlation IDs
- **Database Queries**: Slow query analysis and optimization
- **Network Analysis**: Bandwidth and latency monitoring

## Testing Strategy

### Unit Testing
- **Component Tests**: React component behavior
- **Service Tests**: Backend service functions
- **Utility Tests**: Helper function validation
- **Mock Testing**: External dependency mocking

### Integration Testing
- **API Tests**: REST endpoint functionality
- **WebSocket Tests**: Real-time communication
- **Database Tests**: Data persistence and retrieval
- **Authentication Tests**: Security validation

### End-to-End Testing
- **User Journey Tests**: Complete call workflows
- **Cross-Browser Tests**: Multiple browser compatibility
- **Network Tests**: Various connection conditions
- **Load Tests**: Concurrent user simulation

### Property-Based Testing
- **Session Access**: Valid sessions allow access
- **Payment Validation**: Only paid sessions work
- **Time Windows**: Access within allowed timeframes
- **User Permissions**: Role-based access control
- **Duration Tracking**: Accurate time calculation

This technical architecture document provides comprehensive implementation guidance for the video call feature, ensuring secure, scalable, and maintainable code.