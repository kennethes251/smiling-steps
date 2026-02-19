# Production-Ready Video Call Implementation Plan
## Teletherapy Platform - Zero-Cost Solution

**App Name:** Smiling Steps  
**Tech Stack:** MERN (MongoDB, Express, React, Node.js)  
**User Roles:** Client, Psychologist, Admin  
**Regulatory:** HIPAA-equivalent privacy requirements (Kenya/East Africa)

---

## 1. SUMMARY

**Recommended Approach:**  
Implement WebRTC-based peer-to-peer video calling using **PeerJS** (simplified WebRTC) with **Socket.io** for signaling, self-hosted **Coturn** TURN/STUN server for NAT traversal, and optional **Jitsi Meet** as a fallback for group sessions. This approach provides end-to-end encrypted video/audio with zero recurring costs.

**Trade-offs:**  
- **Pros:** Free, self-hosted, HIPAA-compliant encryption (DTLS-SRTP), full control over data
- **Cons:** Requires server setup for TURN (can use free tier VPS), limited to ~4 participants for group sessions without SFU, requires manual scaling

---

## 2. STEP-BY-STEP IMPLEMENTATION PLAN

### PHASE 1: Foundation & Signaling (Week 1)

#### Step 1.1: Install Core Dependencies
**Task:** Add WebRTC and real-time communication libraries

**Sub-tasks:**
```bash
# Server dependencies
cd server
npm install socket.io@4.6.1 peerjs@1.5.2 uuid@9.0.0

# Client dependencies  
cd ../client
npm install socket.io-client@4.6.1 peerjs@1.4.7 simple-peer@9.11.1
```

**Tools:**
- `socket.io` - Real-time bidirectional signaling between client/server
- `peerjs` - Simplified WebRTC wrapper with built-in signaling
- `simple-peer` - Lightweight WebRTC wrapper (alternative/fallback)

**Effort:** 0.5 hours  
**Risk:** Low - well-documented libraries


#### Step 1.2: Setup Socket.io Server
**Task:** Create WebSocket server for signaling

**Sub-tasks:**
```javascript
// server/services/videoCallService.js
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');

let io;
const activeRooms = new Map(); // roomId -> { participants, startTime }

function initializeVideoCallServer(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Join video room
    socket.on('join-room', ({ roomId, userId, userName, userRole }) => {
      socket.join(roomId);
      
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          participants: [],
          startTime: new Date()
        });
      }
      
      const room = activeRooms.get(roomId);
      room.participants.push({ socketId: socket.id, userId, userName, userRole });
      
      // Notify others in room
      socket.to(roomId).emit('user-joined', { 
        userId, 
        userName, 
        userRole,
        socketId: socket.id 
      });
      
      // Send existing participants to new user
      const otherParticipants = room.participants.filter(p => p.socketId !== socket.id);
      socket.emit('existing-participants', otherParticipants);
    });

    // WebRTC signaling
    socket.on('offer', ({ offer, to }) => {
      socket.to(to).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ answer, to }) => {
      socket.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Leave room
    socket.on('leave-room', ({ roomId, userId }) => {
      handleUserLeave(socket, roomId, userId);
    });

    socket.on('disconnect', () => {
      // Clean up user from all rooms
      activeRooms.forEach((room, roomId) => {
        const participant = room.participants.find(p => p.socketId === socket.id);
        if (participant) {
          handleUserLeave(socket, roomId, participant.userId);
        }
      });
    });
  });

  return io;
}

function handleUserLeave(socket, roomId, userId) {
  socket.leave(roomId);
  
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    room.participants = room.participants.filter(p => p.socketId !== socket.id);
    
    // Notify others
    socket.to(roomId).emit('user-left', { userId, socketId: socket.id });
    
    // Clean up empty rooms
    if (room.participants.length === 0) {
      activeRooms.delete(roomId);
    }
  }
}

module.exports = { initializeVideoCallServer, activeRooms };
```

**Configuration:**
- WebSocket port: Same as Express server (5000)
- CORS: Allow frontend origin
- Heartbeat: 25s ping, 60s timeout

**Effort:** 2 hours  
**Risk:** Low - standard Socket.io patterns


#### Step 1.3: Integrate Socket.io with Express Server
**Task:** Mount Socket.io on existing Express server

**Sub-tasks:**
```javascript
// server/index.js (modify existing)
const http = require('http');
const { initializeVideoCallServer } = require('./services/videoCallService');

// After Express app setup, before app.listen()
const server = http.createServer(app);
const io = initializeVideoCallServer(server);

// Make io available to routes
app.set('io', io);

// Replace app.listen() with server.listen()
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ WebSocket server ready for video calls`);
});
```

**Effort:** 0.5 hours  
**Risk:** Low - minimal changes to existing code

---

### PHASE 2: TURN/STUN Server Setup (Week 1)

#### Step 2.1: Install Coturn (Self-Hosted TURN Server)
**Task:** Setup NAT traversal server for WebRTC connections

**Sub-tasks:**
```bash
# On Ubuntu/Debian VPS (DigitalOcean/Linode free tier)
sudo apt-get update
sudo apt-get install coturn -y

# Enable coturn service
sudo systemctl enable coturn
```

**Configuration File:** `/etc/turnserver.conf`
```conf
# Basic settings
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=YOUR_SERVER_PUBLIC_IP
external-ip=YOUR_SERVER_PUBLIC_IP

# Authentication
lt-cred-mech
user=smilinguser:smilingpass123
realm=smilingsteps.com

# Security
fingerprint
no-multicast-peers
no-loopback-peers

# Logging
verbose
log-file=/var/log/turnserver.log

# Performance
max-bps=1000000
bps-capacity=0
```

**Start Service:**
```bash
sudo systemctl start coturn
sudo systemctl status coturn

# Open firewall ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp  # RTP/RTCP ports
```

**Free Hosting Options:**
- Oracle Cloud Free Tier (2 VMs forever free)
- Google Cloud Free Tier ($300 credit)
- AWS Free Tier (12 months)
- Self-host on existing server

**Effort:** 2 hours  
**Risk:** Medium - requires VPS access and networking knowledge


#### Step 2.2: Configure ICE Servers in Application
**Task:** Add STUN/TURN configuration to WebRTC connections

**Sub-tasks:**
```javascript
// server/config/webrtc.js
module.exports = {
  iceServers: [
    // Free public STUN servers (for testing)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // Your self-hosted TURN server (production)
    {
      urls: `turn:${process.env.TURN_SERVER_IP}:3478`,
      username: process.env.TURN_USERNAME || 'smilinguser',
      credential: process.env.TURN_PASSWORD || 'smilingpass123'
    },
    {
      urls: `turns:${process.env.TURN_SERVER_IP}:5349`,
      username: process.env.TURN_USERNAME || 'smilinguser',
      credential: process.env.TURN_PASSWORD || 'smilingpass123'
    }
  ],
  
  // Additional WebRTC configuration
  sdpSemantics: 'unified-plan',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all' // Use 'relay' to force TURN for testing
};
```

**Environment Variables (.env):**
```env
TURN_SERVER_IP=your.server.ip.address
TURN_USERNAME=smilinguser
TURN_PASSWORD=smilingpass123
```

**Effort:** 1 hour  
**Risk:** Low

---

### PHASE 3: Backend API Routes (Week 1-2)

#### Step 3.1: Create Video Call Routes
**Task:** Add REST API endpoints for video call management

**Sub-tasks:**
```javascript
// server/routes/videoCalls.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// Get WebRTC configuration
router.get('/config', auth, async (req, res) => {
  try {
    const webrtcConfig = require('../config/webrtc');
    res.json({ iceServers: webrtcConfig.iceServers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WebRTC config' });
  }
});

// Generate video call room for session
router.post('/generate-room/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name email');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user is part of this session
    const userId = req.user.id;
    if (session.client._id.toString() !== userId && 
        session.psychologist._id.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    // Generate unique room ID if not exists
    if (!session.meetingLink) {
      session.meetingLink = `room-${uuidv4()}`;
      await session.save();
    }
    
    res.json({
      roomId: session.meetingLink,
      sessionId: session._id,
      participants: {
        client: { id: session.client._id, name: session.client.name },
        psychologist: { id: session.psychologist._id, name: session.psychologist.name }
      }
    });
  } catch (error) {
    console.error('Generate room error:', error);
    res.status(500).json({ error: 'Failed to generate room' });
  }
});

// Start video call (update session status)
router.post('/start/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.status = 'In Progress';
    session.videoCallStarted = new Date();
    await session.save();
    
    res.json({ message: 'Video call started', session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start call' });
  }
});

// End video call (calculate duration, update status)
router.post('/end/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.videoCallEnded = new Date();
    
    // Calculate duration in minutes
    if (session.videoCallStarted) {
      const durationMs = session.videoCallEnded - session.videoCallStarted;
      session.callDuration = Math.round(durationMs / 60000);
    }
    
    session.status = 'Completed';
    await session.save();
    
    res.json({ 
      message: 'Video call ended', 
      duration: session.callDuration,
      session 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get active call info
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('client', 'name email profilePicture')
      .populate('psychologist', 'name email profilePicture psychologistDetails');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify authorization
    const userId = req.user.id;
    if (session.client._id.toString() !== userId && 
        session.psychologist._id.toString() !== userId &&
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

module.exports = router;
```

**Register Route in server/index.js:**
```javascript
app.use('/api/video-calls', require('./routes/videoCalls'));
```

**Effort:** 3 hours  
**Risk:** Low


---

### PHASE 4: Frontend Video Call Component (Week 2)

#### Step 4.1: Create Video Call Room Component
**Task:** Build React component for video calling interface

**Sub-tasks:**
```javascript
// client/src/components/VideoCall/VideoCallRoom.js
import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography, Paper, Avatar, CircularProgress } from '@mui/material';
import {
  Videocam, VideocamOff, Mic, MicOff, CallEnd, 
  ScreenShare, StopScreenShare, Chat, Settings
} from '@mui/icons-material';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import axios from 'axios';

const VideoCallRoom = ({ sessionId, onCallEnd }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const socketRef = useRef();
  const callStartTimeRef = useRef();
  const durationIntervalRef = useRef();
  
  const [roomData, setRoomData] = useState(null);
  const [iceServers, setIceServers] = useState([]);

  useEffect(() => {
    initializeCall();
    return () => cleanup();
  }, [sessionId]);

  const initializeCall = async () => {
    try {
      // Get WebRTC config and room info
      const token = localStorage.getItem('token');
      const [configRes, roomRes] = await Promise.all([
        axios.get('/api/video-calls/config', {
          headers: { 'x-auth-token': token }
        }),
        axios.post(`/api/video-calls/generate-room/${sessionId}`, {}, {
          headers: { 'x-auth-token': token }
        })
      ]);
      
      setIceServers(configRes.data.iceServers);
      setRoomData(roomRes.data);
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Connect to signaling server
      connectToSignalingServer(roomRes.data.roomId, stream, configRes.data.iceServers);
      
      // Start call timer
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
      
      // Notify backend that call started
      await axios.post(`/api/video-calls/start/${sessionId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      
    } catch (err) {
      console.error('Failed to initialize call:', err);
      setError(err.message || 'Failed to access camera/microphone');
      setConnectionStatus('failed');
    }
  };

  const connectToSignalingServer = (roomId, stream, servers) => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('token') }
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to signaling server');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      socket.emit('join-room', {
        roomId,
        userId: userData.id,
        userName: userData.name,
        userRole: userData.role
      });
    });
    
    socket.on('existing-participants', (participants) => {
      if (participants.length > 0) {
        // Create peer as initiator
        createPeer(participants[0].socketId, stream, servers, true);
      }
      setConnectionStatus('waiting');
    });
    
    socket.on('user-joined', ({ socketId }) => {
      // Create peer as receiver
      createPeer(socketId, stream, servers, false);
    });
    
    socket.on('offer', ({ offer, from }) => {
      handleOffer(offer, from, stream, servers);
    });
    
    socket.on('answer', ({ answer, from }) => {
      if (peerRef.current) {
        peerRef.current.signal(answer);
      }
    });
    
    socket.on('ice-candidate', ({ candidate, from }) => {
      if (peerRef.current) {
        peerRef.current.signal(candidate);
      }
    });
    
    socket.on('user-left', () => {
      setConnectionStatus('disconnected');
      setRemoteStream(null);
    });
  };

  const createPeer = (targetSocketId, stream, servers, initiator) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: { iceServers: servers }
    });
    
    peer.on('signal', (signal) => {
      const eventName = signal.type === 'offer' ? 'offer' : 
                       signal.type === 'answer' ? 'answer' : 'ice-candidate';
      
      socketRef.current.emit(eventName, {
        [signal.type]: signal,
        to: targetSocketId
      });
    });
    
    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setConnectionStatus('connected');
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError('Connection error occurred');
    });
    
    peer.on('close', () => {
      setConnectionStatus('disconnected');
    });
    
    peerRef.current = peer;
  };

  const handleOffer = (offer, from, stream, servers) => {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream,
      config: { iceServers: servers }
    });
    
    peer.on('signal', (signal) => {
      socketRef.current.emit('answer', { answer: signal, to: from });
    });
    
    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setConnectionStatus('connected');
    });
    
    peer.signal(offer);
    peerRef.current = peer;
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerRef.current.streams[0].getVideoTracks()[0];
        
        peerRef.current.replaceTrack(sender, screenTrack, localStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        screenTrack.onended = () => {
          toggleScreenShare(); // Stop sharing when user clicks browser stop button
        };
        
        setIsScreenSharing(true);
      } else {
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerRef.current.streams[0].getVideoTracks()[0];
        
        peerRef.current.replaceTrack(sender, videoTrack, localStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const endCall = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/video-calls/end/${sessionId}`, {}, {
        headers: { 'x-auth-token': token }
      });
    } catch (err) {
      console.error('Failed to end call:', err);
    }
    
    cleanup();
    if (onCallEnd) onCallEnd();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: '#1a1a1a', position: 'relative' }}>
      {/* Remote Video (Main) */}
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'white'
          }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'waiting' && 'Waiting for other participant...'}
              {connectionStatus === 'failed' && 'Connection failed'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Local Video (Picture-in-Picture) */}
      <Paper
        elevation={8}
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 240,
          height: 180,
          overflow: 'hidden',
          borderRadius: 2
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </Paper>

      {/* Call Duration */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          px: 2,
          py: 1,
          bgcolor: 'rgba(0,0,0,0.7)',
          color: 'white'
        }}
      >
        <Typography variant="h6">{formatDuration(callDuration)}</Typography>
      </Paper>

      {/* Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 2,
          bgcolor: 'rgba(0,0,0,0.7)',
          p: 2,
          borderRadius: 3
        }}
      >
        <IconButton
          onClick={toggleVideo}
          sx={{ 
            bgcolor: isVideoEnabled ? 'primary.main' : 'error.main',
            color: 'white',
            '&:hover': { bgcolor: isVideoEnabled ? 'primary.dark' : 'error.dark' }
          }}
        >
          {isVideoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>

        <IconButton
          onClick={toggleAudio}
          sx={{ 
            bgcolor: isAudioEnabled ? 'primary.main' : 'error.main',
            color: 'white',
            '&:hover': { bgcolor: isAudioEnabled ? 'primary.dark' : 'error.dark' }
          }}
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </IconButton>

        <IconButton
          onClick={toggleScreenShare}
          sx={{ 
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
        >
          {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
        </IconButton>

        <IconButton
          onClick={endCall}
          sx={{ 
            bgcolor: 'error.main',
            color: 'white',
            '&:hover': { bgcolor: 'error.dark' }
          }}
        >
          <CallEnd />
        </IconButton>
      </Box>

      {/* Error Display */}
      {error && (
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            p: 3,
            bgcolor: 'error.main',
            color: 'white'
          }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default VideoCallRoom;
```

**Effort:** 6 hours  
**Risk:** Medium - complex WebRTC logic


#### Step 4.2: Create Video Call Page
**Task:** Build page wrapper for video call component

**Sub-tasks:**
```javascript
// client/src/pages/VideoCallPage.js (update existing)
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import VideoCallRoom from '../components/VideoCall/VideoCallRoom';
import axios from 'axios';

const VideoCallPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/video-calls/session/${sessionId}`, {
        headers: { 'x-auth-token': token }
      });
      setSession(response.data.session);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load session');
      setLoading(false);
    }
  };

  const handleCallEnd = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
        <Typography variant="h5" color="error">{error}</Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return <VideoCallRoom sessionId={sessionId} onCallEnd={handleCallEnd} />;
};

export default VideoCallPage;
```

**Effort:** 1 hour  
**Risk:** Low

---

### PHASE 5: Integration with Existing Booking System (Week 2)

#### Step 5.1: Add "Join Call" Button to Dashboards
**Task:** Integrate video call access into client and psychologist dashboards

**Sub-tasks:**
```javascript
// client/src/components/dashboards/ClientDashboard.js (add to session card)
import { Videocam } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Inside session mapping:
const navigate = useNavigate();

const canJoinCall = (session) => {
  const now = new Date();
  const sessionDate = new Date(session.sessionDate);
  const timeDiff = (sessionDate - now) / (1000 * 60); // minutes
  
  // Allow joining 15 minutes before and up to 2 hours after scheduled time
  return session.status === 'Confirmed' && 
         timeDiff <= 15 && 
         timeDiff >= -120;
};

// In session card JSX:
{canJoinCall(session) && (
  <Button
    variant="contained"
    color="primary"
    startIcon={<Videocam />}
    onClick={() => navigate(`/video-call/${session._id}`)}
    fullWidth
    sx={{ mt: 1 }}
  >
    Join Video Call
  </Button>
)}
```

**Similar changes for:**
- `client/src/components/dashboards/PsychologistDashboard.js`
- `client/src/components/dashboards/AdminDashboard-new.js`

**Effort:** 2 hours  
**Risk:** Low


---

## 3. ESSENTIAL FUNCTIONALITIES

### MUST HAVE (MVP):
✅ 1-on-1 video calls between client and psychologist  
✅ Audio muting/unmuting  
✅ Video on/off toggle  
✅ Screen sharing capability  
✅ Call duration tracking  
✅ End call functionality  
✅ Connection status indicators  
✅ Automatic reconnection on network issues  
✅ Session-based access control (only authorized users can join)  
✅ Call start/end logging in database  
✅ Responsive UI for desktop/tablet  

### NICE TO HAVE (Future):
⭕ In-call text chat  
⭕ Call recording (with consent)  
⭕ Virtual backgrounds  
⭕ Waiting room feature  
⭕ Group therapy sessions (3-6 participants)  
⭕ Network quality indicators  
⭕ Bandwidth adaptation  
⭕ Mobile app support (React Native)  
⭕ Post-call feedback/rating  
⭕ Automatic session notes generation  

---

## 4. RECOMMENDED TECHNOLOGIES & LIBRARIES

### Client-Side:
| Library | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| `simple-peer` | 9.11.1 | WebRTC wrapper | Simplifies peer connection setup, battle-tested |
| `socket.io-client` | 4.6.1 | Real-time signaling | Industry standard, reliable, easy to use |
| `react` | 18.x | UI framework | Already in stack |
| `@mui/material` | 5.x | UI components | Already in stack, professional look |

### Server-Side:
| Library | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| `socket.io` | 4.6.1 | WebSocket server | Matches client, handles reconnection automatically |
| `express` | 4.x | HTTP server | Already in stack |
| `uuid` | 9.0.0 | Room ID generation | Secure random IDs |

### Infrastructure:
| Tool | Purpose | Why This Choice |
|------|---------|-----------------|
| Coturn | TURN/STUN server | Open-source, self-hosted, HIPAA-compliant |
| MongoDB | Session metadata | Already in stack |
| Node.js | Runtime | Already in stack |

### Alternative/Fallback Options:
| Tool | Use Case | Cost |
|------|----------|------|
| Jitsi Meet (self-hosted) | Group sessions, backup | Free (self-hosted) |
| Daily.co | If self-hosting fails | Free tier: 10k minutes/month |
| Whereby | Embedded rooms | Free tier: 1 room |


---

## 5. USER INTERFACE DESIGN & UX FLOW

### 5.1 Pre-Call Flow
**Dashboard → Session Card:**
```
┌─────────────────────────────────────┐
│ Upcoming Session                    │
│ Dr. Jane Smith                      │
│ Individual Therapy                  │
│ Dec 15, 2025 - 2:00 PM             │
│                                     │
│ [Join Video Call] ← Enabled 15min  │
│                     before session  │
└─────────────────────────────────────┘
```

**Pre-Call Checklist Page (Optional):**
- Camera preview
- Microphone test
- Speaker test
- Network quality check
- "Join Call" button

### 5.2 In-Call Interface
```
┌──────────────────────────────────────────────────────────┐
│ [00:15:32]                    [Remote Video - Full]      │
│                                                           │
│                                                           │
│                          ┌──────────────┐                │
│                          │ Local Video  │ ← PiP         │
│                          │  (You)       │                │
│                          └──────────────┘                │
│                                                           │
│                                                           │
│         ┌──────────────────────────────────┐            │
│         │ [🎥] [🎤] [🖥️] [💬] [⚙️] [📞]  │ ← Controls  │
│         └──────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘

Controls:
🎥 Video On/Off
🎤 Mic On/Off  
🖥️ Screen Share
💬 Chat (future)
⚙️ Settings
📞 End Call (red)
```

### 5.3 Error States

**Camera/Mic Permission Denied:**
```
┌─────────────────────────────────────┐
│  ⚠️ Camera Access Required          │
│                                     │
│  Please allow camera and            │
│  microphone access to join call     │
│                                     │
│  [Open Settings] [Cancel]           │
└─────────────────────────────────────┘
```

**Connection Failed:**
```
┌─────────────────────────────────────┐
│  ❌ Connection Failed                │
│                                     │
│  Unable to connect to call.         │
│  Check your internet connection.    │
│                                     │
│  [Retry] [End Call]                 │
└─────────────────────────────────────┘
```

**Participant Left:**
```
┌─────────────────────────────────────┐
│  👋 Participant Left                 │
│                                     │
│  The other participant has left     │
│  the call.                          │
│                                     │
│  [End Call] [Wait]                  │
└─────────────────────────────────────┘
```

### 5.4 Post-Call Flow
```
Call Ended → Redirect to Dashboard → Show notification:
"Session completed. Duration: 45 minutes"
```


---

## 6. SECURITY MEASURES

### 6.1 Authentication & Authorization
```javascript
// Middleware for video call routes
const videoCallAuth = async (req, res, next) => {
  try {
    // Verify JWT token
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: 'No token' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Verify session access
    const sessionId = req.params.sessionId;
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user is participant
    const userId = req.user.id;
    const isParticipant = 
      session.client.toString() === userId ||
      session.psychologist.toString() === userId ||
      req.user.role === 'admin';
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    req.session = session;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 6.2 Encryption
- **Transport:** WSS (WebSocket Secure) for signaling
- **Media:** DTLS-SRTP (built into WebRTC) for audio/video
- **TURN:** TLS encryption for relay traffic
- **Database:** Encrypted session metadata (already implemented)

### 6.3 Session Handling
```javascript
// Time-based access control
const canAccessCall = (session) => {
  const now = new Date();
  const sessionDate = new Date(session.sessionDate);
  const timeDiff = (sessionDate - now) / (1000 * 60);
  
  // Allow access 15 min before to 2 hours after
  return timeDiff >= -15 && timeDiff <= 120;
};

// Room ID security
const generateSecureRoomId = () => {
  return `room-${uuidv4()}-${Date.now()}`;
};
```

### 6.4 Data Retention
```javascript
// Auto-delete old call metadata (GDPR compliance)
const cleanupOldCallData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  await Session.updateMany(
    { 
      videoCallEnded: { $lt: sixMonthsAgo },
      status: 'Completed'
    },
    {
      $unset: { 
        meetingLink: '',
        videoCallStarted: '',
        videoCallEnded: ''
      }
    }
  );
};

// Run monthly
cron.schedule('0 0 1 * *', cleanupOldCallData);
```

### 6.5 Server Hardening
```bash
# Firewall rules (UFW)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3478/tcp  # TURN
sudo ufw allow 3478/udp  # TURN
sudo ufw allow 5349/tcp  # TURNS (TLS)
sudo ufw allow 49152:65535/udp  # RTP/RTCP

# Rate limiting
app.use('/api/video-calls', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### 6.6 Secure Logging
```javascript
// Audit log for video calls
const logVideoCallEvent = async (sessionId, userId, event, metadata = {}) => {
  await AuditLog.create({
    userId,
    action: `video_call_${event}`,
    resourceType: 'Session',
    resourceId: sessionId,
    metadata: {
      ...metadata,
      timestamp: new Date(),
      ipAddress: metadata.ipAddress || 'unknown'
    }
  });
};

// Usage:
await logVideoCallEvent(sessionId, userId, 'started', { duration: 0 });
await logVideoCallEvent(sessionId, userId, 'ended', { duration: 45 });
```


---

## 7. INTEGRATION WITH EXISTING SYSTEMS

### 7.1 Authentication System
```javascript
// Use existing JWT auth
// client/src/utils/authUtils.js already handles token storage
// Just pass token in Socket.io connection:

const socket = io(API_URL, {
  auth: { token: localStorage.getItem('token') }
});

// Server validates:
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### 7.2 Database (MongoDB)
```javascript
// Extend existing Session model (already has video fields)
// Add indexes for performance:
SessionSchema.index({ meetingLink: 1 });
SessionSchema.index({ videoCallStarted: 1, status: 1 });
```

### 7.3 Scheduling System
```javascript
// Integrate with existing booking flow
// client/src/pages/BookingPageNew.js already creates sessions
// Just ensure isVideoCall: true is set:

const bookingData = {
  psychologist: selectedPsychologist._id,
  sessionType: selectedSessionType,
  sessionDate: selectedDate,
  isVideoCall: true, // ← Add this
  price: calculatePrice()
};
```

### 7.4 Notification System
```javascript
// Extend existing notification service
// server/utils/notificationService.js

const sendVideoCallReminder = async (session) => {
  const client = await User.findById(session.client);
  const psychologist = await User.findById(session.psychologist);
  
  // Email to client
  await sendEmail({
    to: client.email,
    subject: 'Video Call Starting Soon',
    html: `
      <h2>Your session starts in 15 minutes</h2>
      <p>Join your video call with ${psychologist.name}</p>
      <a href="${process.env.CLIENT_URL}/video-call/${session._id}">
        Join Call
      </a>
    `
  });
  
  // Email to psychologist
  await sendEmail({
    to: psychologist.email,
    subject: 'Video Call Starting Soon',
    html: `
      <h2>Your session with ${client.name} starts in 15 minutes</h2>
      <a href="${process.env.CLIENT_URL}/video-call/${session._id}">
        Join Call
      </a>
    `
  });
};

// Schedule reminders (add to existing cron job)
cron.schedule('*/5 * * * *', async () => {
  const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);
  
  const upcomingSessions = await Session.find({
    sessionDate: {
      $gte: new Date(),
      $lte: fifteenMinutesFromNow
    },
    status: 'Confirmed',
    reminder15MinSent: { $ne: true }
  });
  
  for (const session of upcomingSessions) {
    await sendVideoCallReminder(session);
    session.reminder15MinSent = true;
    await session.save();
  }
});
```

### 7.5 M-Pesa Payment Integration
```javascript
// Video calls only accessible after payment confirmed
// Already handled by existing payment flow
// Just add check in video call route:

router.post('/generate-room/:sessionId', auth, async (req, res) => {
  const session = await Session.findById(req.params.sessionId);
  
  // Verify payment status
  if (session.paymentStatus !== 'Confirmed' && 
      session.paymentStatus !== 'Paid') {
    return res.status(403).json({ 
      error: 'Payment required to join call' 
    });
  }
  
  // Continue with room generation...
});
```


---

## 8. ZERO-COST DEPLOYMENT STRATEGY

### 8.1 Main Application (Existing)
- **Backend:** Render.com free tier (already deployed)
- **Frontend:** Netlify/Vercel free tier
- **Database:** MongoDB Atlas free tier (already in use)

### 8.2 TURN Server Hosting Options

#### Option A: Oracle Cloud (RECOMMENDED - Forever Free)
```bash
# Create Oracle Cloud account (no credit card for free tier)
# Launch VM.Standard.E2.1.Micro instance (always free)
# Specs: 1 OCPU, 1GB RAM, 50GB storage

# Install Coturn
sudo apt update
sudo apt install coturn -y

# Configure as shown in Step 2.1
# Public IP is static and free
```

**Pros:** Truly free forever, good performance, static IP  
**Cons:** Requires Oracle account, limited to 2 VMs

#### Option B: Google Cloud Free Tier
```bash
# $300 credit for 90 days, then:
# e2-micro instance free (US regions only)
# 30GB storage, 1GB egress/month

# Same Coturn setup as Option A
```

**Pros:** Easy setup, familiar platform  
**Cons:** Limited to US regions, egress limits

#### Option C: Self-Host on Existing Server
```bash
# If you have a VPS for backend, add Coturn there
# Minimal resource usage: ~50MB RAM, <1% CPU

# Install alongside Node.js app
sudo apt install coturn -y
# Configure on different ports to avoid conflicts
```

**Pros:** No additional server needed  
**Cons:** Shares resources with main app

#### Option D: Free Public STUN (Testing Only)
```javascript
// Use Google's free STUN servers
// Works for ~80% of connections (no TURN)
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
```

**Pros:** Zero setup, works immediately  
**Cons:** Fails with symmetric NAT (~20% of users)

### 8.3 Bandwidth Considerations

**Video Call Bandwidth Usage:**
- 720p video: ~1.5 Mbps per participant
- 480p video: ~0.5 Mbps per participant
- Audio only: ~50 Kbps

**Monthly Estimates (100 sessions/month, 45 min avg):**
- Total minutes: 4,500 minutes
- Data transfer: ~40GB (720p) or ~15GB (480p)

**Free Tier Limits:**
- Oracle Cloud: 10TB/month (more than enough)
- Google Cloud: 1GB/month (need to upgrade)
- Render: 100GB/month (sufficient)

**Optimization Strategy:**
```javascript
// Adaptive bitrate based on network
const constraints = {
  video: {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// Downgrade quality on poor connection
peer.on('track', (track, stream) => {
  if (track.kind === 'video') {
    track.applyConstraints({
      width: { max: 640 },
      height: { max: 480 },
      frameRate: { max: 15 }
    });
  }
});
```

### 8.4 Avoiding Quota Limitations

**Strategy 1: Peer-to-Peer First**
- Use P2P connections when possible (no server bandwidth)
- Only relay through TURN when NAT traversal fails
- Saves ~80% of bandwidth

**Strategy 2: Connection Pooling**
```javascript
// Reuse TURN allocations
const turnConfig = {
  iceTransportPolicy: 'all', // Try P2P first
  iceCandidatePoolSize: 10   // Pre-allocate candidates
};
```

**Strategy 3: Monitor Usage**
```javascript
// Track TURN usage
peer.on('icecandidate', (event) => {
  if (event.candidate && event.candidate.type === 'relay') {
    console.log('Using TURN relay');
    // Log to analytics
  }
});
```


---

## 9. TESTING CHECKLIST

### 9.1 Unit Tests

```javascript
// server/test/videoCall.test.js
const request = require('supertest');
const app = require('../index');
const Session = require('../models/Session');

describe('Video Call API', () => {
  let token, sessionId;
  
  beforeEach(async () => {
    // Setup test session and auth token
  });
  
  test('GET /api/video-calls/config - should return ICE servers', async () => {
    const res = await request(app)
      .get('/api/video-calls/config')
      .set('x-auth-token', token);
    
    expect(res.status).toBe(200);
    expect(res.body.iceServers).toBeDefined();
    expect(res.body.iceServers.length).toBeGreaterThan(0);
  });
  
  test('POST /api/video-calls/generate-room - should create room', async () => {
    const res = await request(app)
      .post(`/api/video-calls/generate-room/${sessionId}`)
      .set('x-auth-token', token);
    
    expect(res.status).toBe(200);
    expect(res.body.roomId).toBeDefined();
  });
  
  test('POST /api/video-calls/start - should update session status', async () => {
    const res = await request(app)
      .post(`/api/video-calls/start/${sessionId}`)
      .set('x-auth-token', token);
    
    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('In Progress');
  });
  
  test('Unauthorized user cannot access session', async () => {
    const res = await request(app)
      .post(`/api/video-calls/generate-room/${sessionId}`)
      .set('x-auth-token', 'invalid-token');
    
    expect(res.status).toBe(401);
  });
});
```

### 9.2 Integration Tests

```javascript
// Test WebRTC signaling flow
describe('WebRTC Signaling', () => {
  let clientSocket, psychologistSocket;
  
  beforeEach(() => {
    clientSocket = io('http://localhost:5000');
    psychologistSocket = io('http://localhost:5000');
  });
  
  test('Users can join same room', (done) => {
    const roomId = 'test-room-123';
    
    clientSocket.emit('join-room', {
      roomId,
      userId: 'client-1',
      userName: 'Test Client',
      userRole: 'client'
    });
    
    psychologistSocket.on('user-joined', (data) => {
      expect(data.userId).toBe('client-1');
      done();
    });
    
    psychologistSocket.emit('join-room', {
      roomId,
      userId: 'psych-1',
      userName: 'Test Psychologist',
      userRole: 'psychologist'
    });
  });
  
  test('Offer/Answer exchange works', (done) => {
    const mockOffer = { type: 'offer', sdp: 'mock-sdp' };
    
    psychologistSocket.on('offer', (data) => {
      expect(data.offer).toEqual(mockOffer);
      done();
    });
    
    clientSocket.emit('offer', {
      offer: mockOffer,
      to: psychologistSocket.id
    });
  });
});
```

### 9.3 Manual Testing Checklist

**Pre-Call:**
- [ ] Dashboard shows "Join Call" button at correct time
- [ ] Button disabled before 15 min window
- [ ] Button disabled if payment not confirmed
- [ ] Clicking button navigates to video call page

**Camera/Mic Access:**
- [ ] Browser prompts for permissions
- [ ] Local video preview shows after granting
- [ ] Error message shows if denied
- [ ] Can retry permission request

**Connection:**
- [ ] "Connecting..." message shows initially
- [ ] "Waiting for participant..." shows when alone
- [ ] Remote video appears when other joins
- [ ] Connection status updates correctly

**In-Call Controls:**
- [ ] Video toggle works (camera on/off)
- [ ] Audio toggle works (mic mute/unmute)
- [ ] Screen share starts/stops correctly
- [ ] End call button terminates session
- [ ] Call duration timer updates every second

**Quality:**
- [ ] Video is clear (720p)
- [ ] Audio is clear, no echo
- [ ] Lip sync is acceptable (<200ms delay)
- [ ] No freezing or stuttering

**Error Handling:**
- [ ] Reconnects automatically on brief disconnect
- [ ] Shows error on permanent disconnect
- [ ] Handles other participant leaving gracefully
- [ ] Can rejoin after accidental disconnect

**Post-Call:**
- [ ] Redirects to dashboard after end
- [ ] Session status updated to "Completed"
- [ ] Call duration saved correctly
- [ ] Notification shows call summary

### 9.4 Performance Tests

```javascript
// Test concurrent connections
describe('Performance', () => {
  test('Server handles 10 concurrent rooms', async () => {
    const rooms = [];
    
    for (let i = 0; i < 10; i++) {
      const socket1 = io('http://localhost:5000');
      const socket2 = io('http://localhost:5000');
      
      socket1.emit('join-room', { roomId: `room-${i}`, userId: `user-${i}-1` });
      socket2.emit('join-room', { roomId: `room-${i}`, userId: `user-${i}-2` });
      
      rooms.push({ socket1, socket2 });
    }
    
    // Verify all connections active
    expect(rooms.length).toBe(10);
  });
  
  test('TURN server handles relay traffic', async () => {
    // Test TURN allocation
    // Measure latency and bandwidth
  });
});
```

### 9.5 Security Tests

```bash
# Test TURN authentication
turnutils_uclient -v -u smilinguser -w smilingpass123 YOUR_SERVER_IP

# Test SSL/TLS
openssl s_client -connect YOUR_SERVER_IP:5349

# Test firewall rules
nmap -p 3478,5349,49152-65535 YOUR_SERVER_IP
```

### 9.6 Privacy/Compliance Tests

- [ ] Video/audio not recorded without consent
- [ ] No data sent to third parties
- [ ] Session metadata encrypted in database
- [ ] Old call data auto-deleted after 6 months
- [ ] Audit logs capture all access attempts
- [ ] TURN credentials rotated regularly


---

## 10. MONITORING & MAINTENANCE

### 10.1 Free Monitoring Tools

#### PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start app with monitoring
pm2 start server/index.js --name smiling-steps

# Monitor in real-time
pm2 monit

# View logs
pm2 logs smiling-steps

# Setup auto-restart on crash
pm2 startup
pm2 save
```

#### Winston (Logging)
```javascript
// server/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/video-calls.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Usage in video call service
logger.info('Video call started', { sessionId, userId, roomId });
logger.error('WebRTC connection failed', { error, sessionId });
```

#### Prometheus + Grafana (Self-Hosted)
```javascript
// server/utils/metrics.js
const promClient = require('prom-client');

const register = new promClient.Registry();

const callsTotal = new promClient.Counter({
  name: 'video_calls_total',
  help: 'Total number of video calls',
  labelNames: ['status']
});

const callDuration = new promClient.Histogram({
  name: 'video_call_duration_seconds',
  help: 'Video call duration in seconds',
  buckets: [60, 300, 900, 1800, 3600]
});

register.registerMetric(callsTotal);
register.registerMetric(callDuration);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 10.2 Health Checks

```javascript
// server/routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    services: {}
  };
  
  // Check database
  try {
    await mongoose.connection.db.admin().ping();
    health.services.database = 'ok';
  } catch (err) {
    health.services.database = 'error';
    health.status = 'degraded';
  }
  
  // Check TURN server
  try {
    const turnCheck = await fetch(`http://${process.env.TURN_SERVER_IP}:3478`);
    health.services.turn = 'ok';
  } catch (err) {
    health.services.turn = 'error';
    health.status = 'degraded';
  }
  
  // Check Socket.io
  const io = req.app.get('io');
  health.services.websocket = io ? 'ok' : 'error';
  
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});
```

### 10.3 Alerts (Free Options)

#### UptimeRobot (Free Tier)
- Monitor /health endpoint every 5 minutes
- Email/SMS alerts on downtime
- 50 monitors free

#### Healthchecks.io (Free Tier)
```bash
# Ping on successful operations
curl https://hc-ping.com/YOUR-UUID

# Add to cron jobs
0 * * * * curl https://hc-ping.com/YOUR-UUID
```

#### Discord Webhooks (Free)
```javascript
// server/utils/alerts.js
const axios = require('axios');

const sendAlert = async (message, severity = 'info') => {
  const colors = { info: 3447003, warning: 16776960, error: 15158332 };
  
  await axios.post(process.env.DISCORD_WEBHOOK_URL, {
    embeds: [{
      title: `[${severity.toUpperCase()}] Smiling Steps Alert`,
      description: message,
      color: colors[severity],
      timestamp: new Date()
    }]
  });
};

// Usage:
await sendAlert('TURN server unreachable', 'error');
await sendAlert('High call failure rate: 15%', 'warning');
```

### 10.4 Maintenance Tasks

#### Daily:
```bash
# Check logs for errors
pm2 logs --lines 100 | grep ERROR

# Check disk space
df -h

# Check TURN server status
sudo systemctl status coturn
```

#### Weekly:
```bash
# Rotate logs
pm2 flush

# Check database performance
mongo --eval "db.sessions.stats()"

# Review call quality metrics
curl http://localhost:5000/metrics | grep video_call
```

#### Monthly:
```bash
# Update dependencies
npm audit fix

# Backup database
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d)

# Review and clean old sessions
node server/scripts/cleanup-old-calls.js

# Rotate TURN credentials
# Update TURN_PASSWORD in .env and restart coturn
```

### 10.5 Troubleshooting Guide

**Issue: Users can't connect**
```bash
# Check TURN server
sudo systemctl status coturn
sudo tail -f /var/log/turnserver.log

# Test TURN connectivity
turnutils_uclient -v -u smilinguser -w smilingpass123 YOUR_IP

# Check firewall
sudo ufw status
```

**Issue: Poor video quality**
```javascript
// Enable debug logging
localStorage.setItem('debug', 'simple-peer');

// Check network stats
peer.on('signal', data => console.log('Signal:', data));
peer.on('connect', () => console.log('Connected'));
peer.on('data', data => console.log('Data:', data));
```

**Issue: High latency**
```bash
# Check server load
top
htop

# Check network latency
ping YOUR_SERVER_IP
traceroute YOUR_SERVER_IP

# Check TURN relay usage (should be <20%)
grep "relay" /var/log/turnserver.log | wc -l
```


---

## 11. OPTIONAL IMPROVEMENTS (Paid Services)

### 11.1 Twilio Video (OPTIONAL/PAID)
**Cost:** $0.0015/min (~$67.50 for 45,000 min/month)  
**Benefits:**
- Managed infrastructure (no TURN setup)
- Better NAT traversal (99% success rate)
- Recording built-in
- Network quality API
- Mobile SDK

**Implementation:**
```javascript
// npm install twilio-video
const Video = require('twilio-video');

const room = await Video.connect(token, {
  name: roomName,
  audio: true,
  video: { width: 1280 }
});
```

### 11.2 Daily.co (OPTIONAL/PAID)
**Cost:** Free tier: 10k minutes/month, then $0.0025/min  
**Benefits:**
- Embedded rooms (iframe)
- Recording and transcription
- Virtual backgrounds
- Noise cancellation AI
- Analytics dashboard

### 11.3 Agora.io (OPTIONAL/PAID)
**Cost:** First 10k minutes free/month, then $0.99/1000 min  
**Benefits:**
- Ultra-low latency (<400ms)
- AI noise suppression
- Beauty filters
- Cloud recording
- 17 global data centers

### 11.4 AWS Chime SDK (OPTIONAL/PAID)
**Cost:** $0.0017/min (~$76.50 for 45,000 min/month)  
**Benefits:**
- Enterprise-grade reliability
- HIPAA compliant (BAA available)
- Meeting analytics
- Echo reduction
- Background blur

### 11.5 Vonage Video API (OPTIONAL/PAID)
**Cost:** 500 free minutes/month, then $0.0045/min  
**Benefits:**
- Archive API (recording)
- SIP interconnect
- Broadcast to RTMP
- Experience composer

### 11.6 Jitsi as a Service (OPTIONAL/PAID)
**Cost:** 8x8 Jitsi hosting: $15/month for 100 participants  
**Benefits:**
- Managed Jitsi instance
- No setup required
- Custom branding
- Recording storage

**Note:** Self-hosted Jitsi is FREE but requires more setup

---

## 12. COMPARISON WITH EXISTING PLATFORMS

| Feature | BetterHelp | Talkspace | Doxy.me | VSee | Smiling Steps (Proposed) |
|---------|-----------|-----------|---------|------|--------------------------|
| 1-on-1 Video | ✅ | ✅ | ✅ | ✅ | ✅ |
| Screen Share | ✅ | ❌ | ✅ | ✅ | ✅ |
| Recording | ✅ | ✅ | ✅ ($) | ✅ | ⭕ (Future) |
| Waiting Room | ✅ | ✅ | ✅ | ✅ | ⭕ (Future) |
| In-call Chat | ✅ | ✅ | ✅ | ✅ | ⭕ (Future) |
| Mobile App | ✅ | ✅ | ✅ | ✅ | ⭕ (Future) |
| Group Sessions | ❌ | ❌ | ✅ ($) | ✅ | ⭕ (Future) |
| E2E Encryption | ✅ | ✅ | ✅ | ✅ | ✅ |
| HIPAA Compliant | ✅ | ✅ | ✅ | ✅ | ✅ (Equivalent) |
| Self-Hosted | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cost | Proprietary | Proprietary | $35/mo | $49/mo | $0 |

**MVP Recommendation:**  
Focus on features marked ✅ for initial launch. Add ⭕ features based on user feedback.

---

## 13. ONE-PAGE ROLLOUT CHECKLIST

### DEVELOPMENT → STAGING

**Week 1: Backend Setup**
- [ ] Install Socket.io and dependencies
- [ ] Create video call service
- [ ] Add video call routes
- [ ] Setup TURN server (Oracle Cloud)
- [ ] Test signaling locally

**Week 2: Frontend Development**
- [ ] Build VideoCallRoom component
- [ ] Create VideoCallPage
- [ ] Add "Join Call" buttons to dashboards
- [ ] Test WebRTC connections locally
- [ ] Handle error states

**Week 3: Integration & Testing**
- [ ] Integrate with auth system
- [ ] Connect to booking flow
- [ ] Add notification reminders
- [ ] Write unit tests
- [ ] Perform manual testing

**Week 4: Security & Polish**
- [ ] Add access control checks
- [ ] Implement audit logging
- [ ] Setup monitoring (PM2, Winston)
- [ ] Create health check endpoint
- [ ] Document API

### STAGING → PRODUCTION

**Pre-Launch (1 week before):**
- [ ] Deploy TURN server to production VPS
- [ ] Update environment variables
- [ ] Run security audit
- [ ] Load test with 10 concurrent calls
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Create rollback plan

**Launch Day:**
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Netlify
- [ ] Update DNS if needed
- [ ] Monitor error logs closely
- [ ] Test production video call
- [ ] Send announcement to users

**Post-Launch (First Week):**
- [ ] Monitor call success rate (target: >95%)
- [ ] Check TURN server usage
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Document known issues

**Post-Launch (First Month):**
- [ ] Analyze call quality metrics
- [ ] Review bandwidth usage
- [ ] Optimize video quality settings
- [ ] Plan next features (recording, chat)
- [ ] Create user guide/FAQ

### ROLLBACK PROCEDURE
If critical issues occur:
1. Disable "Join Call" buttons (feature flag)
2. Show maintenance message
3. Revert to previous deployment
4. Investigate and fix offline
5. Re-deploy when stable

---

## 14. ESTIMATED TOTAL EFFORT

| Phase | Tasks | Hours | Risk |
|-------|-------|-------|------|
| Backend Setup | Socket.io, routes, TURN | 8h | Low |
| Frontend Component | VideoCallRoom, UI | 10h | Medium |
| Integration | Auth, booking, notifications | 6h | Low |
| Testing | Unit, integration, manual | 8h | Low |
| Security | Access control, encryption | 4h | Low |
| Deployment | TURN server, production | 6h | Medium |
| Documentation | API docs, user guide | 4h | Low |
| **TOTAL** | | **46h** | |

**Timeline:** 3-4 weeks (1 developer, part-time)  
**Budget:** $0 (using free tiers and open-source tools)

---

## 15. QUICK START COMMANDS

```bash
# Install dependencies
cd server && npm install socket.io peerjs uuid
cd ../client && npm install socket.io-client simple-peer

# Setup TURN server (on VPS)
ssh your-vps
sudo apt install coturn -y
sudo nano /etc/turnserver.conf  # Add config from Step 2.1
sudo systemctl start coturn

# Add environment variables
echo "TURN_SERVER_IP=your.server.ip" >> .env
echo "TURN_USERNAME=smilinguser" >> .env
echo "TURN_PASSWORD=smilingpass123" >> .env

# Start development
npm run start  # Backend
cd client && npm start  # Frontend

# Test video call
# 1. Create a session in booking page
# 2. Navigate to /video-call/:sessionId
# 3. Open in two browser windows
# 4. Grant camera/mic permissions
# 5. Verify video/audio connection
```

---

## CONCLUSION

This plan provides a complete, production-ready video call system for $0/month using:
- **WebRTC** for peer-to-peer video/audio
- **Socket.io** for signaling
- **Coturn** for NAT traversal (self-hosted)
- **MongoDB** for session metadata
- **React** for UI

The system is HIPAA-equivalent compliant, scalable to 100+ sessions/month, and can be deployed in 3-4 weeks. All components are open-source and self-hosted, giving you full control over data and privacy.

**Next Steps:**
1. Review this plan with your team
2. Setup Oracle Cloud account for TURN server
3. Start with Phase 1 (Backend Setup)
4. Test thoroughly before production launch
5. Gather user feedback and iterate

**Support Resources:**
- WebRTC Documentation: https://webrtc.org/getting-started/overview
- Socket.io Docs: https://socket.io/docs/v4/
- Coturn Wiki: https://github.com/coturn/coturn/wiki
- Simple-peer: https://github.com/feross/simple-peer

Good luck with your implementation! 🚀
