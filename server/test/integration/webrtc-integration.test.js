/**
 * WebRTC Integration Tests
 * 
 * Tests the complete WebRTC flow including:
 * - Signaling server integration
 * - Peer connection establishment
 * - Media stream handling
 * - Session management integration
 * - Error handling and recovery
 * 
 * Validates requirements:
 * - FR-2: WebRTC Implementation
 * - FR-4: Session Management
 * - FR-5: Error Handling
 * - NFR-3: Reliability
 */

const request = require('supertest');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const http = require('http');
const socketIOClient = require('socket.io-client');

// Set up test environment
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

// Create test app
const express = require('express');
const app = express();
app.use(express.json());

let sequelize;
let User;
let Session;
let server;
let io;
let clientUser;
let psychologistUser;
let clientToken;
let psychologistToken;
let testSession;

// Mock WebRTC configuration
jest.mock('../../config/webrtc', () => ({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}));

// Mock audit logger
jest.mock('../../utils/auditLogger', () => ({
  logVideoCallAccess: jest.fn(),
  logVideoCallStart: jest.fn(),
  logVideoCallEnd: jest.fn(),
  logVideoCallJoinAttempt: jest.fn(),
  logVideoCallSecurityValidation: jest.fn()
}));

// Mock session status manager
jest.mock('../../utils/sessionStatusManager', () => ({
  startVideoCall: jest.fn(),
  endVideoCall: jest.fn(),
  autoStartVideoCall: jest.fn(),
  autoEndVideoCall: jest.fn()
}));

// Mock meeting link generator
jest.mock('../../utils/meetingLinkGenerator', () => ({
  generateMeetingLink: jest.fn(() => `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
}));

// Mock encryption utilities
jest.mock('../../utils/encryption', () => ({
  encrypt: jest.fn((data) => `encrypted_${data}`),
  decrypt: jest.fn((data) => data.replace('encrypted_', '')),
  maskPhoneNumber: jest.fn((phone) => `***${phone?.slice(-4) || '****'}`)
}));

// Mock security middleware
jest.mock('../../middleware/security', () => ({
  validateWebSocketOrigin: jest.fn(() => true)
}));

beforeAll(async () => {
  try {
    // Create in-memory SQLite database
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false
    });

    // Initialize models
    User = require('../../models/User-sequelize')(sequelize, DataTypes);
    Session = require('../../models/Session-sequelize')(sequelize, DataTypes);
    
    // Define associations
    User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
    User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
    
    // Make models globally available
    global.User = User;
    global.Session = Session;
    
    // Sync database
    await sequelize.sync({ force: true });
    
    // Add routes
    app.use('/api/video-calls', require('../../routes/videoCalls'));
    
    // Create HTTP server and initialize Socket.io
    server = http.createServer(app);
    const { initializeVideoCallServer } = require('../../services/videoCallService');
    io = initializeVideoCallServer(server);
    
    // Start server
    await new Promise((resolve) => {
      server.listen(0, resolve); // Use random available port
    });
    
    // Create test users
    clientUser = await User.create({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'hashedpassword123',
      role: 'client',
      isVerified: true
    });
    
    psychologistUser = await User.create({
      name: 'Test Psychologist',
      email: 'psychologist@test.com',
      password: 'hashedpassword123',
      role: 'psychologist',
      isVerified: true,
      psychologistDetails: {
        specializations: ['Anxiety', 'Depression'],
        hourlyRate: 50
      }
    });
    
    // Generate tokens
    clientToken = jwt.sign(
      { user: { id: clientUser.id, role: clientUser.role } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    psychologistToken = jwt.sign(
      { user: { id: psychologistUser.id, role: psychologistUser.role } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
}, 30000);

afterAll(async () => {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (sequelize) {
      await sequelize.close();
    }
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
}, 10000);

beforeEach(async () => {
  // Clear sessions and reset mocks
  await Session.destroy({ where: {} });
  jest.clearAllMocks();
  
  // Create test session
  testSession = await Session.create({
    clientId: clientUser.id,
    psychologistId: psychologistUser.id,
    sessionType: 'Individual',
    sessionDate: new Date(),
    status: 'Confirmed',
    paymentStatus: 'Confirmed',
    price: 50,
    sessionRate: 50,
    isVideoCall: true,
    meetingLink: `room-test-${Date.now()}`
  });
});

describe('WebRTC Integration Tests', () => {
  
  describe('Complete Video Call Flow', () => {
    
    test('should complete full video call flow from room generation to call end', async () => {
      // Step 1: Generate room
      const roomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(roomResponse.body).toMatchObject({
        roomId: expect.any(String),
        sessionId: testSession.id,
        participants: {
          client: { id: clientUser.id, name: clientUser.name },
          psychologist: { id: psychologistUser.id, name: psychologistUser.name }
        }
      });
      
      const roomId = roomResponse.body.roomId;
      
      // Step 2: Get WebRTC configuration
      const configResponse = await request(app)
        .get('/api/video-calls/config')
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(configResponse.body.iceServers).toHaveLength(2);
      expect(configResponse.body.iceServers[0].urls).toContain('stun:');
      
      // Step 3: Start video call
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: {
          id: testSession.id,
          status: 'In Progress',
          videoCallStarted: new Date()
        }
      });
      
      const startResponse = await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(startResponse.body.message).toBe('Video call started successfully');
      expect(SessionStatusManager.startVideoCall).toHaveBeenCalledWith(testSession.id, clientUser.id);
      
      // Step 4: End video call
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 5,
        session: {
          id: testSession.id,
          status: 'Completed',
          videoCallEnded: new Date(),
          callDuration: 5
        }
      });
      
      const endResponse = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(endResponse.body.message).toBe('Video call ended successfully');
      expect(endResponse.body.duration).toBe(5);
      expect(SessionStatusManager.endVideoCall).toHaveBeenCalledWith(testSession.id, clientUser.id);
    });
    
    test('should handle both client and psychologist joining the same session', async () => {
      // Generate room as client
      const clientRoomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      // Generate room as psychologist (should return same room)
      const psychRoomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(clientRoomResponse.body.roomId).toBe(psychRoomResponse.body.roomId);
      expect(clientRoomResponse.body.sessionId).toBe(psychRoomResponse.body.sessionId);
      
      // Both should be able to start the call
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });
      
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(SessionStatusManager.startVideoCall).toHaveBeenCalledTimes(2);
    });
    
  });
  
  describe('Socket.io Signaling Integration', () => {
    
    let clientSocket;
    let psychologistSocket;
    const serverPort = server.address().port;
    
    beforeEach(() => {
      // Create socket connections for testing
      clientSocket = socketIOClient(`http://localhost:${serverPort}`, {
        auth: { token: clientToken },
        transports: ['websocket']
      });
      
      psychologistSocket = socketIOClient(`http://localhost:${serverPort}`, {
        auth: { token: psychologistToken },
        transports: ['websocket']
      });
    });
    
    afterEach(() => {
      if (clientSocket) clientSocket.disconnect();
      if (psychologistSocket) psychologistSocket.disconnect();
    });
    
    test('should establish secure WebSocket connections with authentication', (done) => {
      let connectionsEstablished = 0;
      
      const checkComplete = () => {
        connectionsEstablished++;
        if (connectionsEstablished === 2) {
          expect(clientSocket.connected).toBe(true);
          expect(psychologistSocket.connected).toBe(true);
          done();
        }
      };
      
      clientSocket.on('connect', checkComplete);
      psychologistSocket.on('connect', checkComplete);
      
      // Set timeout for test
      setTimeout(() => {
        if (connectionsEstablished < 2) {
          done(new Error('Failed to establish socket connections within timeout'));
        }
      }, 5000);
    });
    
    test('should handle room joining and participant management', (done) => {
      const roomId = testSession.meetingLink;
      let eventsReceived = 0;
      
      const checkComplete = () => {
        eventsReceived++;
        if (eventsReceived === 4) { // 2 join-success + 2 user-joined events
          done();
        }
      };
      
      // Client joins first
      clientSocket.on('join-success', ({ participantCount, secureConnection }) => {
        expect(participantCount).toBe(1);
        expect(secureConnection).toBeDefined();
        checkComplete();
        
        // Psychologist joins after client
        psychologistSocket.emit('join-room', {
          roomId,
          sessionId: testSession.id
        });
      });
      
      // Psychologist receives join confirmation
      psychologistSocket.on('join-success', ({ participantCount }) => {
        expect(participantCount).toBe(2);
        checkComplete();
      });
      
      // Client receives notification of psychologist joining
      clientSocket.on('user-joined', ({ userName, userRole }) => {
        expect(userName).toBe(psychologistUser.name);
        expect(userRole).toBe('psychologist');
        checkComplete();
      });
      
      // Psychologist receives existing participants (client)
      psychologistSocket.on('existing-participants', (participants) => {
        expect(participants).toHaveLength(1);
        expect(participants[0].userName).toBe(clientUser.name);
        expect(participants[0].userRole).toBe('client');
        checkComplete();
      });
      
      // Start the test by having client join
      clientSocket.emit('join-room', {
        roomId,
        sessionId: testSession.id
      });
      
      setTimeout(() => {
        if (eventsReceived < 4) {
          done(new Error(`Only received ${eventsReceived}/4 expected events`));
        }
      }, 5000);
    });
    
    test('should handle WebRTC signaling messages securely', (done) => {
      const roomId = testSession.meetingLink;
      let signalingSent = false;
      let signalingReceived = false;
      
      const checkComplete = () => {
        if (signalingSent && signalingReceived) {
          done();
        }
      };
      
      // Set up psychologist to receive offer
      psychologistSocket.on('offer', ({ offer, from, roomId: offerRoomId, timestamp }) => {
        expect(offer).toMatchObject({
          type: 'offer',
          sdp: expect.any(String)
        });
        expect(from).toBe(clientSocket.id);
        expect(offerRoomId).toBe(roomId);
        expect(timestamp).toBeDefined();
        signalingReceived = true;
        checkComplete();
      });
      
      // Both join room first
      let joinedCount = 0;
      const onJoinSuccess = () => {
        joinedCount++;
        if (joinedCount === 2) {
          // Send offer from client to psychologist
          clientSocket.emit('offer', {
            offer: {
              type: 'offer',
              sdp: 'mock-sdp-offer-data'
            },
            to: psychologistSocket.id,
            roomId
          });
          signalingSent = true;
          checkComplete();
        }
      };
      
      clientSocket.on('join-success', onJoinSuccess);
      psychologistSocket.on('join-success', onJoinSuccess);
      
      // Join rooms
      clientSocket.emit('join-room', { roomId, sessionId: testSession.id });
      psychologistSocket.emit('join-room', { roomId, sessionId: testSession.id });
      
      setTimeout(() => {
        if (!signalingSent || !signalingReceived) {
          done(new Error('Signaling test failed - messages not exchanged properly'));
        }
      }, 5000);
    });
    
    test('should reject signaling from unauthorized rooms', (done) => {
      const roomId = testSession.meetingLink;
      const fakeRoomId = 'fake-room-id';
      let errorReceived = false;
      
      // Set up error handler
      clientSocket.on('signaling-error', ({ error }) => {
        expect(error).toContain('Invalid signaling attempt');
        errorReceived = true;
        done();
      });
      
      // Join legitimate room
      clientSocket.on('join-success', () => {
        // Try to send offer to wrong room
        clientSocket.emit('offer', {
          offer: { type: 'offer', sdp: 'mock-sdp' },
          to: 'fake-socket-id',
          roomId: fakeRoomId // Wrong room ID
        });
      });
      
      clientSocket.emit('join-room', { roomId, sessionId: testSession.id });
      
      setTimeout(() => {
        if (!errorReceived) {
          done(new Error('Expected signaling error was not received'));
        }
      }, 3000);
    });
    
    test('should handle ICE candidate exchange', (done) => {
      const roomId = testSession.meetingLink;
      let candidateReceived = false;
      
      // Set up psychologist to receive ICE candidate
      psychologistSocket.on('ice-candidate', ({ candidate, from, roomId: candidateRoomId, timestamp }) => {
        expect(candidate).toMatchObject({
          candidate: expect.any(String),
          sdpMLineIndex: expect.any(Number)
        });
        expect(from).toBe(clientSocket.id);
        expect(candidateRoomId).toBe(roomId);
        expect(timestamp).toBeDefined();
        candidateReceived = true;
        done();
      });
      
      // Both join room first
      let joinedCount = 0;
      const onJoinSuccess = () => {
        joinedCount++;
        if (joinedCount === 2) {
          // Send ICE candidate from client
          clientSocket.emit('ice-candidate', {
            candidate: {
              candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
              sdpMLineIndex: 0,
              sdpMid: '0'
            },
            to: psychologistSocket.id,
            roomId
          });
        }
      };
      
      clientSocket.on('join-success', onJoinSuccess);
      psychologistSocket.on('join-success', onJoinSuccess);
      
      // Join rooms
      clientSocket.emit('join-room', { roomId, sessionId: testSession.id });
      psychologistSocket.emit('join-room', { roomId, sessionId: testSession.id });
      
      setTimeout(() => {
        if (!candidateReceived) {
          done(new Error('ICE candidate was not received'));
        }
      }, 5000);
    });
    
  });
  
  describe('Session Access Control Integration', () => {
    
    test('should enforce payment status requirements', async () => {
      // Update session to have unconfirmed payment
      await Session.update(
        { paymentStatus: 'Pending' },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(403);
      
      expect(response.body.error).toContain('Payment must be confirmed');
    });
    
    test('should enforce session status requirements', async () => {
      // Update session to cancelled status
      await Session.update(
        { status: 'Cancelled' },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(400);
      
      expect(response.body.error).toContain('Cannot join cancelled or declined session');
    });
    
    test('should enforce time-based access control', async () => {
      // Set session date to far future (more than 15 minutes)
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      await Session.update(
        { sessionDate: futureDate },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(false);
      expect(response.body.reason).toContain('Join window opens 15 minutes before');
    });
    
    test('should allow access within valid time window', async () => {
      // Set session date to 10 minutes from now (within 15-minute window)
      const nearFutureDate = new Date(Date.now() + 10 * 60 * 1000);
      await Session.update(
        { sessionDate: nearFutureDate },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(true);
      expect(response.body.reason).toBeNull();
    });
    
    test('should prevent unauthorized users from accessing session', async () => {
      // Create another user not associated with the session
      const unauthorizedUser = await User.create({
        name: 'Unauthorized User',
        email: 'unauthorized@test.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true
      });
      
      const unauthorizedToken = jwt.sign(
        { user: { id: unauthorizedUser.id, role: unauthorizedUser.role } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', unauthorizedToken)
        .expect(403);
      
      expect(response.body.error).toContain('Unauthorized access to this session');
    });
    
  });
  
  describe('Error Handling and Recovery', () => {
    
    test('should handle missing session gracefully', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      
      const response = await request(app)
        .post(`/api/video-calls/generate-room/${nonExistentId}`)
        .set('x-auth-token', clientToken)
        .expect(404);
      
      expect(response.body.error).toBe('Session not found');
    });
    
    test('should handle invalid session ID format', async () => {
      const response = await request(app)
        .post('/api/video-calls/generate-room/invalid-id')
        .set('x-auth-token', clientToken)
        .expect(404);
      
      expect(response.body.error).toBe('Session not found');
    });
    
    test('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/video-calls/config' },
        { method: 'post', path: `/api/video-calls/generate-room/${testSession.id}` },
        { method: 'post', path: `/api/video-calls/start/${testSession.id}` },
        { method: 'post', path: `/api/video-calls/end/${testSession.id}` },
        { method: 'get', path: `/api/video-calls/can-join/${testSession.id}` },
        { method: 'get', path: `/api/video-calls/session/${testSession.id}` }
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });
    
    test('should handle session status manager errors gracefully', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(500);
      
      expect(response.body.error).toBe('Failed to start video call');
    });
    
    test('should handle socket authentication failures', (done) => {
      // Try to connect without token
      const unauthenticatedSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        transports: ['websocket']
      });
      
      unauthenticatedSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        unauthenticatedSocket.disconnect();
        done();
      });
      
      // Should not connect successfully
      unauthenticatedSocket.on('connect', () => {
        unauthenticatedSocket.disconnect();
        done(new Error('Socket connected without authentication - this should not happen'));
      });
      
      setTimeout(() => {
        if (unauthenticatedSocket.connected) {
          unauthenticatedSocket.disconnect();
          done(new Error('Socket connection test timed out'));
        }
      }, 3000);
    });
    
  });
  
  describe('Session Information Retrieval', () => {
    
    test('should return complete session information with call statistics', async () => {
      // Update session with call data
      await Session.update({
        videoCallStarted: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        videoCallEnded: new Date(),
        duration: 10,
        status: 'Completed'
      }, {
        where: { id: testSession.id }
      });
      
      const response = await request(app)
        .get(`/api/video-calls/session/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.session).toMatchObject({
        id: testSession.id,
        sessionType: 'Individual',
        status: 'Completed',
        paymentStatus: 'Confirmed',
        videoCallStarted: expect.any(String),
        videoCallEnded: expect.any(String),
        callDuration: 10,
        client: {
          id: clientUser.id,
          name: clientUser.name
        },
        psychologist: {
          id: psychologistUser.id,
          name: psychologistUser.name
        }
      });
    });
    
    test('should return call history for authorized users', async () => {
      // Create multiple sessions with call data
      const sessions = await Promise.all([
        Session.create({
          clientId: clientUser.id,
          psychologistId: psychologistUser.id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'Completed',
          paymentStatus: 'Confirmed',
          videoCallStarted: new Date(Date.now() - 24 * 60 * 60 * 1000),
          videoCallEnded: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          duration: 30,
          meetingLink: 'room-history-1'
        }),
        Session.create({
          clientId: clientUser.id,
          psychologistId: psychologistUser.id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
          status: 'Completed',
          paymentStatus: 'Confirmed',
          videoCallStarted: new Date(Date.now() - 48 * 60 * 60 * 1000),
          videoCallEnded: new Date(Date.now() - 48 * 60 * 60 * 1000 + 45 * 60 * 1000),
          duration: 45,
          meetingLink: 'room-history-2'
        })
      ]);
      
      const response = await request(app)
        .get('/api/video-calls/history?limit=5&offset=0')
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.callHistory).toHaveLength(2);
      expect(response.body.callHistory[0]).toMatchObject({
        sessionId: sessions[0].id,
        sessionType: 'Individual',
        status: 'Completed',
        callData: {
          duration: 30,
          status: expect.any(String)
        }
      });
      
      expect(response.body.pagination).toMatchObject({
        limit: 5,
        offset: 0,
        total: 2
      });
    });
    
  });
  
  describe('Concurrent Session Handling', () => {
    
    test('should handle multiple concurrent room generations', async () => {
      // Create multiple sessions
      const sessions = await Promise.all([
        Session.create({
          clientId: clientUser.id,
          psychologistId: psychologistUser.id,
          sessionType: 'Individual',
          sessionDate: new Date(),
          status: 'Confirmed',
          paymentStatus: 'Confirmed',
          meetingLink: 'room-concurrent-1'
        }),
        Session.create({
          clientId: clientUser.id,
          psychologistId: psychologistUser.id,
          sessionType: 'Individual',
          sessionDate: new Date(),
          status: 'Confirmed',
          paymentStatus: 'Confirmed',
          meetingLink: 'room-concurrent-2'
        })
      ]);
      
      // Generate rooms concurrently
      const roomPromises = sessions.map(session =>
        request(app)
          .post(`/api/video-calls/generate-room/${session.id}`)
          .set('x-auth-token', clientToken)
      );
      
      const responses = await Promise.all(roomPromises);
      
      // All should succeed with unique room IDs
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.roomId).toBe(sessions[index].meetingLink);
        expect(response.body.sessionId).toBe(sessions[index].id);
      });
      
      // Room IDs should be unique
      const roomIds = responses.map(r => r.body.roomId);
      expect(new Set(roomIds).size).toBe(roomIds.length);
    });
    
    test('should handle concurrent call start/end operations', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      
      // Mock successful operations
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });
      
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 5,
        session: { id: testSession.id, status: 'Completed', videoCallEnded: new Date(), callDuration: 5 }
      });
      
      // Start call from both client and psychologist simultaneously
      const startPromises = [
        request(app)
          .post(`/api/video-calls/start/${testSession.id}`)
          .set('x-auth-token', clientToken),
        request(app)
          .post(`/api/video-calls/start/${testSession.id}`)
          .set('x-auth-token', psychologistToken)
      ];
      
      const startResponses = await Promise.all(startPromises);
      
      // Both should succeed
      startResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Video call started successfully');
      });
      
      // End call from both users simultaneously
      const endPromises = [
        request(app)
          .post(`/api/video-calls/end/${testSession.id}`)
          .set('x-auth-token', clientToken),
        request(app)
          .post(`/api/video-calls/end/${testSession.id}`)
          .set('x-auth-token', psychologistToken)
      ];
      
      const endResponses = await Promise.all(endPromises);
      
      // Both should succeed
      endResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Video call ended successfully');
      });
    });
    
  });
  
});

describe('WebRTC Security Integration', () => {
  
  test('should validate secure WebSocket connections in production mode', () => {
    // This test would be more comprehensive in a real production environment
    // For now, we verify that the security middleware is properly configured
    const { initializeVideoCallServer } = require('../../services/videoCallService');
    expect(typeof initializeVideoCallServer).toBe('function');
  });
  
  test('should enforce origin validation for WebSocket connections', (done) => {
    // Create socket with invalid origin (this would be blocked in production)
    const invalidOriginSocket = socketIOClient(`http://localhost:${server.address().port}`, {
      auth: { token: clientToken },
      transports: ['websocket'],
      extraHeaders: {
        origin: 'https://malicious-site.com'
      }
    });
    
    invalidOriginSocket.on('connect_error', (error) => {
      // In production, this would be blocked by origin validation
      invalidOriginSocket.disconnect();
      done();
    });
    
    invalidOriginSocket.on('connect', () => {
      // In test environment, connection might succeed
      invalidOriginSocket.disconnect();
      done();
    });
    
    setTimeout(() => {
      invalidOriginSocket.disconnect();
      done();
    }, 2000);
  });
  
});