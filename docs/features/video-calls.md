# Video Call System

*Comprehensive guide for the WebRTC-based video call system in Smiling Steps*

## ✅ Current Status: PRODUCTION READY

**Last Updated**: January 2026  
**Status**: ✅ Fully implemented and tested  
**Priority**: Core feature - Critical for teletherapy

---

## 📋 Overview

The video call system enables secure, high-quality video therapy sessions between clients and psychologists. Built on WebRTC technology with comprehensive security, monitoring, and user experience features.

### Key Features
- **WebRTC Video Calls**: Peer-to-peer video communication
- **Screen Sharing**: Share screens during sessions
- **Network Quality Monitoring**: Real-time connection quality indicators
- **Security & Encryption**: End-to-end encrypted communications
- **Audit Logging**: Complete session audit trails
- **Performance Monitoring**: Real-time metrics and analytics
- **Cross-browser Compatibility**: Works on all modern browsers
- **Graceful Degradation**: Handles poor network conditions

---

## 🏗️ Architecture

### Core Components
1. **Video Call Room** (`client/src/components/VideoCall/VideoCallRoomNew.js`)
2. **WebRTC Service** (`server/services/videoCallService.js`)
3. **Signaling Server** (`server/routes/videoCalls.js`)
4. **Security Middleware** (`server/middleware/videoCallSecurity.js`)
5. **Metrics Collection** (`server/services/videoCallMetricsService.js`)

### Technology Stack
- **Frontend**: React + simple-peer (WebRTC wrapper)
- **Backend**: Node.js + Socket.io (signaling)
- **Security**: Custom encryption + audit logging
- **Monitoring**: Real-time metrics collection

### Connection Flow
```
Client A ←→ Signaling Server ←→ Client B
    ↓                              ↓
WebRTC Peer Connection (Direct)
```

---

## 🔧 Configuration

### Environment Variables
```env
# WebRTC Configuration
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
WEBRTC_TURN_SERVERS=turn:your-turn-server.com:3478
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-password

# Security
VIDEO_CALL_ENCRYPTION_KEY=your-encryption-key
SESSION_TIMEOUT_MINUTES=60
MAX_CONCURRENT_CALLS=100

# Monitoring
ENABLE_CALL_METRICS=true
METRICS_COLLECTION_INTERVAL=5000
```

### WebRTC Configuration (`server/config/webrtc.js`)
```javascript
module.exports = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    }
  ],
  iceCandidatePoolSize: 10
};
```

---

## 💻 Implementation Details

### Frontend Integration

#### Starting a Video Call
```jsx
import VideoCallRoomNew from '../components/VideoCall/VideoCallRoomNew';

function SessionPage({ sessionId }) {
  return (
    <VideoCallRoomNew
      sessionId={sessionId}
      userRole="client" // or "psychologist"
      onCallEnd={(duration) => {
        console.log('Call ended, duration:', duration);
      }}
      onError={(error) => {
        console.error('Video call error:', error);
      }}
    />
  );
}
```

#### Component Props
- `sessionId` (string): Unique session identifier
- `userRole` (string): "client" or "psychologist"
- `onCallEnd` (function): Callback when call ends
- `onError` (function): Error handling callback
- `enableScreenShare` (boolean): Enable screen sharing
- `enableRecording` (boolean): Enable session recording

### Backend API Endpoints

#### Join Video Call
```http
POST /api/video-calls/join
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "sessionId": "session-123",
  "userRole": "client"
}
```

#### End Video Call
```http
POST /api/video-calls/end
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "sessionId": "session-123",
  "duration": 3600
}
```

#### Get Call Metrics
```http
GET /api/video-calls/metrics/:sessionId
Authorization: Bearer <jwt-token>
```

---

## 🔒 Security Features

### Encryption
- **WebRTC Native Encryption**: DTLS-SRTP for media streams
- **Signaling Encryption**: TLS 1.3 for signaling data
- **Session Data Encryption**: AES-256 for stored session data

### Authentication & Authorization
```javascript
// Middleware for video call access
const requireVideoCallAccess = async (req, res, next) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  
  // Verify user has access to this session
  const session = await Session.findById(sessionId);
  if (!session || (session.clientId !== userId && session.psychologistId !== userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};
```

### Audit Logging
```javascript
// Comprehensive audit trail
const auditLog = {
  sessionId,
  userId,
  action: 'video_call_started',
  timestamp: new Date(),
  metadata: {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
    duration: null
  }
};
```

---

## 📊 Performance Monitoring

### Real-time Metrics
- **Connection Quality**: Bandwidth, latency, packet loss
- **Video Quality**: Resolution, frame rate, bitrate
- **Audio Quality**: Sample rate, codec performance
- **Network Stats**: RTT, jitter, connection state

### Metrics Dashboard
```jsx
import VideoCallMetricsDashboard from '../components/VideoCall/VideoCallMetricsDashboard';

function AdminDashboard() {
  return (
    <VideoCallMetricsDashboard
      timeRange="24h"
      showRealTime={true}
      enableAlerts={true}
    />
  );
}
```

### Performance Alerts
- Connection quality below threshold
- High packet loss rates
- Excessive call drops
- Server resource utilization

---

## 🌐 Cross-browser Compatibility

### Supported Browsers
| Browser | Version | Video | Audio | Screen Share |
|---------|---------|-------|-------|--------------|
| Chrome  | 80+     | ✅    | ✅    | ✅           |
| Firefox | 75+     | ✅    | ✅    | ✅           |
| Safari  | 13+     | ✅    | ✅    | ⚠️*          |
| Edge    | 80+     | ✅    | ✅    | ✅           |

*Safari screen sharing requires user gesture

### Compatibility Testing
```bash
# Run cross-browser tests
npm run test:cross-browser

# Generate compatibility matrix
node scripts/video-call-compatibility-matrix.js
```

---

## 🔧 Troubleshooting

### Common Issues

#### Connection Problems
```javascript
// Network quality indicator
const NetworkQualityIndicator = ({ quality }) => {
  const getQualityColor = (quality) => {
    if (quality > 80) return 'green';
    if (quality > 50) return 'yellow';
    return 'red';
  };

  return (
    <div className={`quality-indicator ${getQualityColor(quality)}`}>
      Connection: {quality}%
    </div>
  );
};
```

#### Permission Issues
```javascript
// Permission request flow
const requestPermissions = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      // Show permission help dialog
      showPermissionHelp();
    }
    throw error;
  }
};
```

#### Firewall/NAT Issues
- Configure TURN servers for NAT traversal
- Whitelist STUN/TURN server IPs
- Use TURN over TCP for restrictive networks

### Debug Tools
```bash
# Test video call functionality
node test-video-call-api.js

# Run comprehensive test suite
node test-video-call-comprehensive-suite.js

# Performance benchmarking
node video-call-performance-benchmark.js
```

---

## 🧪 Testing

### Test Categories

#### Unit Tests
- WebRTC connection establishment
- Signaling message handling
- Security middleware validation
- Metrics collection accuracy

#### Integration Tests
- End-to-end call flow
- Multi-user scenarios
- Network condition simulation
- Browser compatibility

#### Load Testing
```bash
# Simulate concurrent calls
node test-video-call-load.js --concurrent=50

# Stress test signaling server
node test-signaling-server-load.js --connections=1000
```

#### Property-based Tests
```javascript
// Test call duration calculations
fc.assert(fc.property(
  fc.integer(1, 7200), // duration in seconds
  (duration) => {
    const result = calculateCallDuration(duration);
    return result.minutes >= 0 && result.seconds >= 0;
  }
));
```

---

## 📱 User Experience Features

### Connection Degradation Handling
```javascript
// Graceful degradation for poor connections
const ConnectionDegradationManager = {
  handlePoorConnection: (quality) => {
    if (quality < 30) {
      // Switch to audio-only mode
      disableVideo();
      showNotification('Switched to audio-only due to poor connection');
    } else if (quality < 50) {
      // Reduce video quality
      reduceVideoQuality();
    }
  }
};
```

### User-friendly Error Messages
```javascript
const errorMessages = {
  'NotAllowedError': 'Please allow camera and microphone access',
  'NotFoundError': 'No camera or microphone found',
  'NetworkError': 'Connection failed. Please check your internet',
  'InternalError': 'Something went wrong. Please try again'
};
```

### Quick Help Panel
```jsx
const QuickHelpPanel = () => (
  <div className="help-panel">
    <h3>Having trouble?</h3>
    <ul>
      <li>Check camera/microphone permissions</li>
      <li>Ensure stable internet connection</li>
      <li>Try refreshing the page</li>
      <li>Contact support if issues persist</li>
    </ul>
  </div>
);
```

---

## 📈 Analytics & Reporting

### Call Quality Metrics
- Average call duration
- Connection success rate
- Audio/video quality scores
- User satisfaction ratings

### Usage Analytics
- Peak usage hours
- Geographic distribution
- Device/browser statistics
- Feature usage patterns

### Reports
```javascript
// Generate call quality report
const generateCallQualityReport = async (dateRange) => {
  const metrics = await VideoCallMetrics.aggregate([
    { $match: { timestamp: { $gte: dateRange.start, $lte: dateRange.end } } },
    { $group: {
      _id: null,
      avgDuration: { $avg: '$duration' },
      successRate: { $avg: '$connectionSuccess' },
      avgQuality: { $avg: '$qualityScore' }
    }}
  ]);
  
  return metrics[0];
};
```

---

## 🚀 Deployment Considerations

### Infrastructure Requirements
- **Bandwidth**: 2 Mbps per concurrent call
- **CPU**: 1 core per 50 concurrent calls
- **Memory**: 100MB per concurrent call
- **TURN Server**: For NAT traversal (optional but recommended)

### Scaling Strategies
1. **Horizontal Scaling**: Multiple signaling servers
2. **Load Balancing**: Distribute connections across servers
3. **CDN Integration**: Serve static assets from CDN
4. **TURN Server Clustering**: Multiple TURN servers for reliability

### Monitoring in Production
```javascript
// Health check endpoint
app.get('/api/video-calls/health', (req, res) => {
  const stats = {
    activeCalls: getActiveCallCount(),
    serverLoad: getServerLoad(),
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  res.json(stats);
});
```

---

## 🔄 Maintenance & Updates

### Regular Maintenance Tasks
- **Daily**: Monitor call quality metrics
- **Weekly**: Review error logs and user feedback
- **Monthly**: Update WebRTC libraries and security patches
- **Quarterly**: Performance optimization and capacity planning

### Update Procedures
1. Test updates in staging environment
2. Gradual rollout to production
3. Monitor metrics during deployment
4. Rollback plan for critical issues

---

## 📞 Support & Documentation

### User Guides
- [Client Video Call Guide](../VIDEO_CALL_CLIENT_USER_GUIDE.md)
- [Psychologist Video Call Guide](../VIDEO_CALL_PSYCHOLOGIST_USER_GUIDE.md)
- [Troubleshooting Guide](../VIDEO_CALL_TROUBLESHOOTING_GUIDE.md)

### Technical Documentation
- [API Reference](../VIDEO_CALL_API_REFERENCE.md)
- [Database Schema](../VIDEO_CALL_DATABASE_SCHEMA.md)
- [Technical Architecture](../VIDEO_CALL_TECHNICAL_ARCHITECTURE.md)

### Support Resources
- FAQ: Common video call issues and solutions
- Help Center: Step-by-step troubleshooting guides
- Support Contact: For technical assistance

---

*The video call system is production-ready and has undergone comprehensive testing including load testing, security audits, and cross-browser compatibility verification.*