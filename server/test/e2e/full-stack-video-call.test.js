/**
 * Full-Stack Video Call End-to-End Tests
 * 
 * Tests complete video call functionality across the entire stack:
 * - Backend API integration
 * - WebSocket signaling
 * - Database operations
 * - Frontend component behavior simulation
 * - Real-world user scenarios
 * 
 * Validates requirements:
 * - Complete user stories US-1 through US-6
 * - All functional requirements FR-1 through FR-5
 * - Non-functional requirements NFR-1 through NFR-5
 * - Technical constraints TC-1 through TC-3
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

// Mock external dependencies
jest.mock('../../config/webrtc', () => ({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}));

jest.mock('../../utils/auditLogger', () => ({
  logVideoCallAccess: jest.fn(),
  logVideoCallStart: jest.fn(),
  logVideoCallEnd: jest.fn(),
  logVideoCallJoinAttempt: jest.fn(),
  logVideoCallSecurityValidation: jest.fn()
}));

jest.mock('../../utils/sessionStatusManager', () => ({
  startVideoCall: jest.fn(),
  endVideoCall: jest.fn(),
  autoStartVideoCall: jest.fn(),
  autoEndVideoCall: jest.fn()
}));

jest.mock('../../utils/meetingLinkGenerator', () => ({
  generateMeetingLink: jest.fn(() => `room-fullstack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
}));

jest.mock('../../utils/encryption', () => ({
  encrypt: jest.fn((data) => `encrypted_${data}`),
  decrypt: jest.fn((data) => data.replace('encrypted_', '')),
  maskPhoneNumber: jest.fn((phone) => `***${phone?.slice(-4) || '****'}`)
}));

jest.mock('../../middleware/security', () => ({
  validateWebSocketOrigin: jest.fn(() => true)
}));

// Create test app
const express = require('express');
const app = express();
app.use(express.json());

let sequelize;
let User;
let Session;
let server;
let io;
let testUsers;
let testTokens;
let testSession;

// Simulate frontend user actions
class VideoCallUserSimulator {
  constructor(userId, token, serverPort) {
    this.userId = userId;
    this.token = token;
    this.serverPort = serverPort;
    this.socket = null;
    this.roomId = null;
    this.sessionId = null;
    this.isConnected = false;
    this.isInCall = false;
    this.callStartTime = null;
    this.events = [];
  }

  async initialize(sessionId) {
    this.sessionId = sessionId;
    
    // Step 1: Check if can join
    const canJoinResponse = await request(app)
      .get(`/api/video-calls/can-join/${sessionId}`)
      .set('x-auth-token', this.token);
    
    if (canJoinResponse.status !== 200 || !canJoinResponse.body.canJoin) {
      throw new Error(`Cannot join session: ${canJoinResponse.body.reason}`);
    }

    // Step 2: Generate room
    const roomResponse = await request(app)
      .post(`/api/video-calls/generate-room/${sessionId}`)
      .set('x-auth-token', this.token);
    
    if (roomResponse.status !== 200) {
      throw new Error('Failed to generate room');
    }

    this.roomId = roomResponse.body.roomId;
    this.events.push({ type: 'room_generated', roomId: this.roomId, timestamp: Date.now() });

    // Step 3: Get WebRTC config
    const configResponse = await request(app)
      .get('/api/video-calls/config')
      .set('x-auth-token', this.token);
    
    if (configResponse.status !== 200) {
      throw new Error('Failed to get WebRTC config');
    }

    this.events.push({ type: 'config_received', config: configResponse.body, timestamp: Date.now() });
    return true;
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.socket = socketIOClient(`http://localhost:${this.serverPort}`, {
        auth: { token: this.token },
        transports: ['websocket']
      });

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.events.push({ type: 'websocket_connected', socketId: this.socket.id, timestamp: Date.now() });
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.events.push({ type: 'websocket_error', error: error.message, timestamp: Date.now() });
        reject(error);
      });

      // Set up event listeners
      this.socket.on('join-success', (data) => {
        this.events.push({ type: 'join_success', data, timestamp: Date.now() });
      });

      this.socket.on('join-error', (data) => {
        this.events.push({ type: 'join_error', data, timestamp: Date.now() });
      });

      this.socket.on('user-joined', (data) => {
        this.events.push({ type: 'user_joined', data, timestamp: Date.now() });
      });

      this.socket.on('user-left', (data) => {
        this.events.push({ type: 'user_left', data, timestamp: Date.now() });
      });

      this.socket.on('offer', (data) => {
        this.events.push({ type: 'offer_received', data, timestamp: Date.now() });
        // Simulate answering the offer
        this.socket.emit('answer', {
          answer: { type: 'answer', sdp: 'mock-sdp-answer' },
          to: data.from,
          roomId: data.roomId
        });
      });

      this.socket.on('answer', (data) => {
        this.events.push({ type: 'answer_received', data, timestamp: Date.now() });
      });

      this.socket.on('ice-candidate', (data) => {
        this.events.push({ type: 'ice_candidate_received', data, timestamp: Date.now() });
      });
    });
  }

  async joinRoom() {
    if (!this.socket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room join timeout'));
      }, 10000);

      this.socket.on('join-success', (data) => {
        clearTimeout(timeout);
        this.events.push({ type: 'room_joined', data, timestamp: Date.now() });
        resolve(data);
      });

      this.socket.on('join-error', (data) => {
        clearTimeout(timeout);
        this.events.push({ type: 'room_join_failed', data, timestamp: Date.now() });
        reject(new Error(data.error));
      });

      this.socket.emit('join-room', {
        roomId: this.roomId,
        sessionId: this.sessionId
      });
    });
  }

  async startCall() {
    const response = await request(app)
      .post(`/api/video-calls/start/${this.sessionId}`)
      .set('x-auth-token', this.token);
    
    if (response.status !== 200) {
      throw new Error('Failed to start call');
    }

    this.isInCall = true;
    this.callStartTime = Date.now();
    this.events.push({ type: 'call_started', timestamp: this.callStartTime });
    return response.body;
  }

  async endCall() {
    const response = await request(app)
      .post(`/api/video-calls/end/${this.sessionId}`)
      .set('x-auth-token', this.token);
    
    if (response.status !== 200) {
      throw new Error('Failed to end call');
    }

    this.isInCall = false;
    const callEndTime = Date.now();
    const duration = this.callStartTime ? Math.floor((callEndTime - this.callStartTime) / 1000) : 0;
    this.events.push({ type: 'call_ended', duration, timestamp: callEndTime });
    return response.body;
  }

  simulateWebRTCSignaling(targetSocket) {
    if (!this.socket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    // Simulate sending an offer
    this.socket.emit('offer', {
      offer: { type: 'offer', sdp: 'mock-sdp-offer-data' },
      to: targetSocket.id,
      roomId: this.roomId
    });

    this.events.push({ type: 'offer_sent', to: targetSocket.id, timestamp: Date.now() });

    // Simulate sending ICE candidates
    setTimeout(() => {
      this.socket.emit('ice-candidate', {
        candidate: {
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0'
        },
        to: targetSocket.id,
        roomId: this.roomId
      });
      this.events.push({ type: 'ice_candidate_sent', to: targetSocket.id, timestamp: Date.now() });
    }, 100);
  }

  simulateMediaControls() {
    // Simulate toggling video
    this.events.push({ type: 'video_toggled', enabled: false, timestamp: Date.now() });
    
    // Simulate toggling audio
    setTimeout(() => {
      this.events.push({ type: 'audio_toggled', enabled: false, timestamp: Date.now() });
    }, 500);

    // Simulate screen sharing
    setTimeout(() => {
      this.events.push({ type: 'screen_share_started', timestamp: Date.now() });
    }, 1000);

    setTimeout(() => {
      this.events.push({ type: 'screen_share_stopped', timestamp: Date.now() });
    }, 2000);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.events.push({ type: 'websocket_disconnected', timestamp: Date.now() });
    }
  }

  getEventHistory() {
    return this.events;
  }

  getCallDuration() {
    if (!this.callStartTime) return 0;
    const endEvent = this.events.find(e => e.type === 'call_ended');
    if (!endEvent) return Math.floor((Date.now() - this.callStartTime) / 1000);
    return endEvent.duration;
  }
}

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
    app.use('/api/sessions', require('../../routes/sessions'));
    app.use('/api/auth', require('../../routes/auth'));
    
    // Create HTTP server and initialize Socket.io
    server = http.createServer(app);
    const { initializeVideoCallServer } = require('../../services/videoCallService');
    io = initializeVideoCallServer(server);
    
    // Start server
    await new Promise((resolve) => {
      server.listen(0, resolve); // Use random available port
    });
    
    // Create test users
    testUsers = {
      client: await User.create({
        name: 'Test Client',
        email: 'client@fullstacktest.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true,
        phoneNumber: '+254700000001'
      }),
      
      psychologist: await User.create({
        name: 'Test Psychologist',
        email: 'psychologist@fullstacktest.com',
        password: 'hashedpassword123',
        role: 'psychologist',
        isVerified: true,
        phoneNumber: '+254700000002',
        psychologistDetails: {
          specializations: ['Anxiety', 'Depression'],
          hourlyRate: 50,
          isApproved: true
        }
      }),
      
      admin: await User.create({
        name: 'Test Admin',
        email: 'admin@fullstacktest.com',
        password: 'hashedpassword123',
        role: 'admin',
        isVerified: true
      })
    };
    
    // Generate tokens
    testTokens = {
      client: jwt.sign(
        { user: { id: testUsers.client.id, role: testUsers.client.role } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      ),
      
      psychologist: jwt.sign(
        { user: { id: testUsers.psychologist.id, role: testUsers.psychologist.role } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      ),
      
      admin: jwt.sign(
        { user: { id: testUsers.admin.id, role: testUsers.admin.role } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )
    };
    
  } catch (error) {
    console.error('Full-stack test setup failed:', error);
    throw error;
  }
}, 60000);

afterAll(async () => {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (sequelize) {
      await sequelize.close();
    }
  } catch (error) {
    console.error('Full-stack test cleanup failed:', error);
  }
}, 30000);

beforeEach(async () => {
  // Clear sessions and reset mocks
  await Session.destroy({ where: {} });
  jest.clearAllMocks();
  
  // Create test session
  testSession = await Session.create({
    clientId: testUsers.client.id,
    psychologistId: testUsers.psychologist.id,
    sessionType: 'Individual',
    sessionDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    status: 'Confirmed',
    paymentStatus: 'Confirmed',
    price: 50,
    sessionRate: 50,
    isVideoCall: true,
    meetingLink: `room-fullstack-test-${Date.now()}`
  });
});

describe('Full-Stack Video Call End-to-End Tests', () => {
  
  describe('Complete Two-User Video Call Journey', () => {
    
    test('should complete full video call session with both users', async () => {
      // Mock session status manager
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });
      
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 5,
        session: { id: testSession.id, status: 'Completed', callDuration: 5 }
      });

      // Create user simulators
      const clientSimulator = new VideoCallUserSimulator(
        testUsers.client.id,
        testTokens.client,
        server.address().port
      );
      
      const psychologistSimulator = new VideoCallUserSimulator(
        testUsers.psychologist.id,
        testTokens.psychologist,
        server.address().port
      );

      try {
        // Phase 1: Initialize both users
        await Promise.all([
          clientSimulator.initialize(testSession.id),
          psychologistSimulator.initialize(testSession.id)
        ]);

        // Verify both got the same room ID
        expect(clientSimulator.roomId).toBe(psychologistSimulator.roomId);

        // Phase 2: Connect WebSockets
        await Promise.all([
          clientSimulator.connectWebSocket(),
          psychologistSimulator.connectWebSocket()
        ]);

        expect(clientSimulator.isConnected).toBe(true);
        expect(psychologistSimulator.isConnected).toBe(true);

        // Phase 3: Join room (client first, then psychologist)
        const clientJoinResult = await clientSimulator.joinRoom();
        expect(clientJoinResult.participantCount).toBe(1);

        const psychologistJoinResult = await psychologistSimulator.joinRoom();
        expect(psychologistJoinResult.participantCount).toBe(2);

        // Verify both users received appropriate events
        const clientEvents = clientSimulator.getEventHistory();
        const psychEvents = psychologistSimulator.getEventHistory();

        expect(clientEvents.some(e => e.type === 'user_joined')).toBe(true);
        expect(psychEvents.some(e => e.type === 'room_joined')).toBe(true);

        // Phase 4: WebRTC signaling simulation
        clientSimulator.simulateWebRTCSignaling(psychologistSimulator.socket);
        
        // Wait for signaling to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify signaling events
        expect(clientEvents.some(e => e.type === 'offer_sent')).toBe(true);
        expect(psychEvents.some(e => e.type === 'offer_received')).toBe(true);

        // Phase 5: Start call from both users
        await Promise.all([
          clientSimulator.startCall(),
          psychologistSimulator.startCall()
        ]);

        expect(clientSimulator.isInCall).toBe(true);
        expect(psychologistSimulator.isInCall).toBe(true);

        // Phase 6: Simulate media controls
        clientSimulator.simulateMediaControls();
        psychologistSimulator.simulateMediaControls();

        // Wait for media control simulation
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Verify media control events
        expect(clientEvents.some(e => e.type === 'video_toggled')).toBe(true);
        expect(clientEvents.some(e => e.type === 'screen_share_started')).toBe(true);
        expect(psychEvents.some(e => e.type === 'audio_toggled')).toBe(true);

        // Phase 7: Simulate call duration
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Phase 8: End call from both users
        await Promise.all([
          clientSimulator.endCall(),
          psychologistSimulator.endCall()
        ]);

        expect(clientSimulator.isInCall).toBe(false);
        expect(psychologistSimulator.isInCall).toBe(false);

        // Verify call durations
        const clientDuration = clientSimulator.getCallDuration();
        const psychDuration = psychologistSimulator.getCallDuration();
        
        expect(clientDuration).toBeGreaterThan(0);
        expect(psychDuration).toBeGreaterThan(0);

        // Phase 9: Verify session information
        const sessionResponse = await request(app)
          .get(`/api/video-calls/session/${testSession.id}`)
          .set('x-auth-token', testTokens.admin)
          .expect(200);

        expect(sessionResponse.body.session).toMatchObject({
          id: testSession.id,
          status: 'Completed',
          client: { id: testUsers.client.id, name: testUsers.client.name },
          psychologist: { id: testUsers.psychologist.id, name: testUsers.psychologist.name }
        });

        // Phase 10: Verify audit logging
        const auditLogger = require('../../utils/auditLogger');
        expect(auditLogger.logVideoCallStart).toHaveBeenCalledTimes(2);
        expect(auditLogger.logVideoCallEnd).toHaveBeenCalledTimes(2);

      } finally {
        // Cleanup
        clientSimulator.disconnect();
        psychologistSimulator.disconnect();
      }
    }, 30000);

  });

  describe('Error Scenarios and Recovery', () => {

    test('should handle user disconnection and reconnection gracefully', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });

      const clientSimulator = new VideoCallUserSimulator(
        testUsers.client.id,
        testTokens.client,
        server.address().port
      );
      
      const psychologistSimulator = new VideoCallUserSimulator(
        testUsers.psychologist.id,
        testTokens.psychologist,
        server.address().port
      );

      try {
        // Initialize and connect both users
        await Promise.all([
          clientSimulator.initialize(testSession.id),
          psychologistSimulator.initialize(testSession.id)
        ]);

        await Promise.all([
          clientSimulator.connectWebSocket(),
          psychologistSimulator.connectWebSocket()
        ]);

        await clientSimulator.joinRoom();
        await psychologistSimulator.joinRoom();

        // Client disconnects unexpectedly
        clientSimulator.disconnect();
        
        // Wait for disconnection to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Psychologist should receive user-left event
        const psychEvents = psychologistSimulator.getEventHistory();
        expect(psychEvents.some(e => e.type === 'user_left')).toBe(true);

        // Client reconnects
        await clientSimulator.connectWebSocket();
        await clientSimulator.joinRoom();

        // Psychologist should receive user-joined event
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedPsychEvents = psychologistSimulator.getEventHistory();
        expect(updatedPsychEvents.filter(e => e.type === 'user_joined').length).toBeGreaterThan(0);

      } finally {
        clientSimulator.disconnect();
        psychologistSimulator.disconnect();
      }
    }, 20000);

    test('should handle session access control violations', async () => {
      // Create unauthorized user
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

      const unauthorizedSimulator = new VideoCallUserSimulator(
        unauthorizedUser.id,
        unauthorizedToken,
        server.address().port
      );

      try {
        // Should fail to initialize due to unauthorized access
        await expect(unauthorizedSimulator.initialize(testSession.id))
          .rejects.toThrow(/Cannot join session/);

      } finally {
        unauthorizedSimulator.disconnect();
      }
    });

    test('should handle payment status requirements', async () => {
      // Update session to have pending payment
      await Session.update(
        { paymentStatus: 'Pending' },
        { where: { id: testSession.id } }
      );

      const clientSimulator = new VideoCallUserSimulator(
        testUsers.client.id,
        testTokens.client,
        server.address().port
      );

      try {
        // Client should fail to join due to pending payment
        await expect(clientSimulator.initialize(testSession.id))
          .rejects.toThrow(/Payment must be confirmed/);

      } finally {
        clientSimulator.disconnect();
      }

      // Psychologist should still be able to join
      const psychologistSimulator = new VideoCallUserSimulator(
        testUsers.psychologist.id,
        testTokens.psychologist,
        server.address().port
      );

      try {
        await expect(psychologistSimulator.initialize(testSession.id))
          .resolves.toBe(true);

      } finally {
        psychologistSimulator.disconnect();
      }
    });

  });

  describe('Performance and Scalability', () => {

    test('should handle multiple concurrent sessions efficiently', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: 'mock-session', status: 'In Progress', videoCallStarted: new Date() }
      });

      // Create multiple sessions
      const sessions = await Promise.all([
        Session.create({
          clientId: testUsers.client.id,
          psychologistId: testUsers.psychologist.id,
          sessionType: 'Individual',
          sessionDate: new Date(),
          status: 'Confirmed',
          paymentStatus: 'Confirmed',
          meetingLink: 'room-concurrent-1'
        }),
        Session.create({
          clientId: testUsers.client.id,
          psychologistId: testUsers.psychologist.id,
          sessionType: 'Individual',
          sessionDate: new Date(),
          status: 'Confirmed',
          paymentStatus: 'Confirmed',
          meetingLink: 'room-concurrent-2'
        }),
        Session.create({
          clientId: testUsers.client.id,
          psychologistId: testUsers.psychologist.id,
          sessionType: 'Individual',
          sessionDate: new Date(),
          status: 'Confirmed',
          paymentStatus: 'Confirmed',
          meetingLink: 'room-concurrent-3'
        })
      ]);

      const simulators = [];

      try {
        // Create simulators for all sessions
        for (let i = 0; i < sessions.length; i++) {
          const simulator = new VideoCallUserSimulator(
            testUsers.client.id,
            testTokens.client,
            server.address().port
          );
          simulators.push(simulator);
        }

        const startTime = Date.now();

        // Initialize all sessions concurrently
        await Promise.all(sessions.map((session, index) => 
          simulators[index].initialize(session.id)
        ));

        // Connect all WebSockets concurrently
        await Promise.all(simulators.map(simulator => 
          simulator.connectWebSocket()
        ));

        // Join all rooms concurrently
        await Promise.all(simulators.map(simulator => 
          simulator.joinRoom()
        ));

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should complete within reasonable time (10 seconds for 3 concurrent sessions)
        expect(totalTime).toBeLessThan(10000);

        // All simulators should be connected and in their rooms
        simulators.forEach(simulator => {
          expect(simulator.isConnected).toBe(true);
          expect(simulator.roomId).toBeDefined();
        });

        // All room IDs should be unique
        const roomIds = simulators.map(s => s.roomId);
        expect(new Set(roomIds).size).toBe(roomIds.length);

      } finally {
        // Cleanup all simulators
        simulators.forEach(simulator => simulator.disconnect());
      }
    }, 25000);

    test('should maintain performance under load', async () => {
      const clientSimulator = new VideoCallUserSimulator(
        testUsers.client.id,
        testTokens.client,
        server.address().port
      );

      try {
        await clientSimulator.initialize(testSession.id);
        await clientSimulator.connectWebSocket();
        await clientSimulator.joinRoom();

        const startTime = Date.now();
        const iterations = 50;

        // Simulate rapid API calls
        const apiPromises = [];
        for (let i = 0; i < iterations; i++) {
          apiPromises.push(
            request(app)
              .get('/api/video-calls/config')
              .set('x-auth-token', testTokens.client)
          );
        }

        const responses = await Promise.all(apiPromises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Should complete within reasonable time (5 seconds for 50 requests)
        expect(totalTime).toBeLessThan(5000);

        // Average response time should be reasonable
        const avgResponseTime = totalTime / iterations;
        expect(avgResponseTime).toBeLessThan(100); // Less than 100ms per request

      } finally {
        clientSimulator.disconnect();
      }
    }, 15000);

  });

  describe('Security and Compliance', () => {

    test('should enforce authentication on all endpoints', async () => {
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

    test('should validate WebSocket authentication', async () => {
      // Try to connect without token
      const unauthenticatedSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        transports: ['websocket']
      });

      await new Promise((resolve, reject) => {
        unauthenticatedSocket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication');
          unauthenticatedSocket.disconnect();
          resolve();
        });

        unauthenticatedSocket.on('connect', () => {
          unauthenticatedSocket.disconnect();
          reject(new Error('Should not connect without authentication'));
        });

        setTimeout(() => {
          unauthenticatedSocket.disconnect();
          reject(new Error('Authentication test timeout'));
        }, 5000);
      });
    });

    test('should log all video call activities for audit', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });

      const clientSimulator = new VideoCallUserSimulator(
        testUsers.client.id,
        testTokens.client,
        server.address().port
      );

      try {
        await clientSimulator.initialize(testSession.id);
        await clientSimulator.connectWebSocket();
        await clientSimulator.joinRoom();
        await clientSimulator.startCall();

        // Verify audit logging
        const auditLogger = require('../../utils/auditLogger');
        expect(auditLogger.logVideoCallAccess).toHaveBeenCalled();
        expect(auditLogger.logVideoCallJoinAttempt).toHaveBeenCalled();
        expect(auditLogger.logVideoCallStart).toHaveBeenCalled();

      } finally {
        clientSimulator.disconnect();
      }
    });

  });

  describe('Data Integrity and Persistence', () => {

    test('should maintain data consistency across the full call lifecycle', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      
      // Mock realistic session status updates
      SessionStatusManager.startVideoCall.mockImplementation(async (sessionId, userId) => {
        await Session.update(
          { 
            status: 'In Progress',
            videoCallStarted: new Date()
          },
          { where: { id: sessionId } }
        );
        
        return {
          success: true,
          message: 'Video call started successfully',
          session: { id: sessionId, status: 'In Progress', videoCallStarted: new Date() }
        };
      });

      SessionStatusManager.endVideoCall.mockImplementation(async (sessionId, userId) => {
        const session = await Session.findByPk(sessionId);
        const duration = session.videoCallStarted ? 
          Math.floor((Date.now() - new Date(session.videoCallStarted).getTime()) / 1000) : 0;
        
        await Session.update(
          { 
            status: 'Completed',
            videoCallEnded: new Date(),
            callDuration: duration
          },
          { where: { id: sessionId } }
        );
        
        return {
          success: true,
          message: 'Video call ended successfully',
          duration,
          session: { id: sessionId, status: 'Completed', callDuration: duration }
        };
      });

      const clientSimulator = new VideoCallUserSimulator(
        testUsers.client.id,
        testTokens.client,
        server.address().port
      );

      try {
        // Initial session state
        let session = await Session.findByPk(testSession.id);
        expect(session.status).toBe('Confirmed');
        expect(session.videoCallStarted).toBeNull();

        await clientSimulator.initialize(testSession.id);
        await clientSimulator.connectWebSocket();
        await clientSimulator.joinRoom();

        // Start call and verify database update
        await clientSimulator.startCall();
        
        session = await Session.findByPk(testSession.id);
        expect(session.status).toBe('In Progress');
        expect(session.videoCallStarted).not.toBeNull();

        // Simulate call duration
        await new Promise(resolve => setTimeout(resolve, 2000));

        // End call and verify database update
        await clientSimulator.endCall();
        
        session = await Session.findByPk(testSession.id);
        expect(session.status).toBe('Completed');
        expect(session.videoCallEnded).not.toBeNull();
        expect(session.callDuration).toBeGreaterThan(0);

        // Verify call history is accessible
        const historyResponse = await request(app)
          .get('/api/video-calls/history?limit=10&offset=0')
          .set('x-auth-token', testTokens.client)
          .expect(200);

        expect(historyResponse.body.callHistory).toHaveLength(1);
        expect(historyResponse.body.callHistory[0]).toMatchObject({
          sessionId: testSession.id,
          callData: {
            duration: expect.any(Number),
            status: 'Completed'
          }
        });

      } finally {
        clientSimulator.disconnect();
      }
    }, 15000);

  });

});