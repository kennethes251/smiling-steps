/**
 * End-to-End Video Call User Journey Tests
 * 
 * Tests complete user journeys for video calling functionality:
 * - Client booking session and joining video call
 * - Psychologist accepting session and joining video call
 * - Complete video call flow from start to finish
 * - Error scenarios and recovery flows
 * - Multi-user concurrent scenarios
 * 
 * Validates requirements:
 * - US-1: Client Joins Video Call
 * - US-2: Psychologist Joins Video Call
 * - US-3: Video Call Controls
 * - US-4: Screen Sharing
 * - US-5: Connection Status
 * - US-6: Call Duration Tracking
 * - FR-1: Authentication & Authorization
 * - FR-4: Session Management
 * - NFR-2: Security
 * - NFR-3: Reliability
 */

const request = require('supertest');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const http = require('http');
const socketIOClient = require('socket.io-client');
const puppeteer = require('puppeteer');

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
  generateMeetingLink: jest.fn(() => `room-e2e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
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
let clientUser;
let psychologistUser;
let adminUser;
let clientToken;
let psychologistToken;
let adminToken;
let testSession;
let browser;
let clientPage;
let psychologistPage;

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
    clientUser = await User.create({
      name: 'Test Client',
      email: 'client@e2etest.com',
      password: 'hashedpassword123',
      role: 'client',
      isVerified: true,
      phoneNumber: '+254700000001'
    });
    
    psychologistUser = await User.create({
      name: 'Test Psychologist',
      email: 'psychologist@e2etest.com',
      password: 'hashedpassword123',
      role: 'psychologist',
      isVerified: true,
      phoneNumber: '+254700000002',
      psychologistDetails: {
        specializations: ['Anxiety', 'Depression'],
        hourlyRate: 50,
        isApproved: true
      }
    });
    
    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@e2etest.com',
      password: 'hashedpassword123',
      role: 'admin',
      isVerified: true
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
    
    adminToken = jwt.sign(
      { user: { id: adminUser.id, role: adminUser.role } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Launch browser for UI testing
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
  } catch (error) {
    console.error('E2E test setup failed:', error);
    throw error;
  }
}, 60000);

afterAll(async () => {
  try {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (sequelize) {
      await sequelize.close();
    }
  } catch (error) {
    console.error('E2E test cleanup failed:', error);
  }
}, 30000);

beforeEach(async () => {
  // Clear sessions and reset mocks
  await Session.destroy({ where: {} });
  jest.clearAllMocks();
  
  // Create test session
  testSession = await Session.create({
    clientId: clientUser.id,
    psychologistId: psychologistUser.id,
    sessionType: 'Individual',
    sessionDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    status: 'Confirmed',
    paymentStatus: 'Confirmed',
    price: 50,
    sessionRate: 50,
    isVideoCall: true,
    meetingLink: `room-e2e-test-${Date.now()}`
  });
  
  // Create fresh browser pages
  if (browser) {
    clientPage = await browser.newPage();
    psychologistPage = await browser.newPage();
    
    // Set up page error handling
    clientPage.on('console', msg => console.log('CLIENT PAGE LOG:', msg.text()));
    psychologistPage.on('console', msg => console.log('PSYCHOLOGIST PAGE LOG:', msg.text()));
    
    clientPage.on('pageerror', error => console.log('CLIENT PAGE ERROR:', error.message));
    psychologistPage.on('pageerror', error => console.log('PSYCHOLOGIST PAGE ERROR:', error.message));
  }
});

afterEach(async () => {
  if (clientPage) {
    await clientPage.close();
  }
  if (psychologistPage) {
    await psychologistPage.close();
  }
});

describe('End-to-End Video Call User Journeys', () => {
  
  describe('Complete Client Journey', () => {
    
    test('should complete full client video call journey', async () => {
      // Step 1: Client checks if they can join the call
      const canJoinResponse = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(canJoinResponse.body.canJoin).toBe(true);
      expect(canJoinResponse.body.reason).toBeNull();
      
      // Step 2: Client generates room
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
      
      // Step 3: Client gets WebRTC configuration
      const configResponse = await request(app)
        .get('/api/video-calls/config')
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(configResponse.body.iceServers).toHaveLength(2);
      
      // Step 4: Client establishes WebSocket connection
      const clientSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: clientToken },
        transports: ['websocket']
      });
      
      await new Promise((resolve, reject) => {
        clientSocket.on('connect', resolve);
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
      });
      
      // Step 5: Client joins room
      const joinPromise = new Promise((resolve, reject) => {
        clientSocket.on('join-success', ({ participantCount, secureConnection }) => {
          expect(participantCount).toBe(1);
          expect(secureConnection).toBeDefined();
          resolve();
        });
        clientSocket.on('join-error', ({ error }) => reject(new Error(error)));
        setTimeout(() => reject(new Error('Join timeout')), 5000);
      });
      
      clientSocket.emit('join-room', {
        roomId,
        sessionId: testSession.id
      });
      
      await joinPromise;
      
      // Step 6: Client starts video call
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
      
      // Step 7: Simulate call duration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 8: Client ends video call
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 1,
        session: {
          id: testSession.id,
          status: 'Completed',
          videoCallEnded: new Date(),
          callDuration: 1
        }
      });
      
      const endResponse = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(endResponse.body.message).toBe('Video call ended successfully');
      expect(endResponse.body.duration).toBe(1);
      
      // Step 9: Verify session information
      const sessionResponse = await request(app)
        .get(`/api/video-calls/session/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(sessionResponse.body.session).toMatchObject({
        id: testSession.id,
        status: 'Completed',
        client: { id: clientUser.id, name: clientUser.name },
        psychologist: { id: psychologistUser.id, name: psychologistUser.name }
      });
      
      // Cleanup
      clientSocket.disconnect();
    }, 30000);
    
    test('should handle client authentication and authorization flow', async () => {
      // Test without token
      await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .expect(401);
      
      // Test with invalid token
      await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', 'invalid-token')
        .expect(401);
      
      // Test with valid token but wrong user
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true
      });
      
      const otherToken = jwt.sign(
        { user: { id: otherUser.id, role: otherUser.role } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', otherToken)
        .expect(403);
      
      // Test with correct client token
      await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
    });
    
    test('should enforce payment status requirements for client', async () => {
      // Update session to have pending payment
      await Session.update(
        { paymentStatus: 'Pending' },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(false);
      expect(response.body.reason).toContain('Payment must be confirmed');
      
      // Try to generate room with pending payment
      await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(403);
    });
    
    test('should enforce time-based access control for client', async () => {
      // Set session date to far future (more than 15 minutes)
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
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
      expect(response.body.minutesUntilSession).toBeGreaterThan(15);
    });
    
  });
  
  describe('Complete Psychologist Journey', () => {
    
    test('should complete full psychologist video call journey', async () => {
      // Step 1: Psychologist checks session eligibility
      const canJoinResponse = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(canJoinResponse.body.canJoin).toBe(true);
      
      // Step 2: Psychologist generates room (should get same room as client)
      const roomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(roomResponse.body.sessionId).toBe(testSession.id);
      expect(roomResponse.body.participants.psychologist.id).toBe(psychologistUser.id);
      
      // Step 3: Psychologist establishes WebSocket connection
      const psychSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: psychologistToken },
        transports: ['websocket']
      });
      
      await new Promise((resolve, reject) => {
        psychSocket.on('connect', resolve);
        psychSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
      });
      
      // Step 4: Psychologist joins room
      const joinPromise = new Promise((resolve, reject) => {
        psychSocket.on('join-success', ({ participantCount }) => {
          expect(participantCount).toBe(1);
          resolve();
        });
        psychSocket.on('join-error', ({ error }) => reject(new Error(error)));
        setTimeout(() => reject(new Error('Join timeout')), 5000);
      });
      
      psychSocket.emit('join-room', {
        roomId: roomResponse.body.roomId,
        sessionId: testSession.id
      });
      
      await joinPromise;
      
      // Step 5: Psychologist starts call
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });
      
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      // Step 6: Psychologist ends call
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 2,
        session: { id: testSession.id, status: 'Completed', callDuration: 2 }
      });
      
      const endResponse = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(endResponse.body.duration).toBe(2);
      
      // Cleanup
      psychSocket.disconnect();
    }, 30000);
    
    test('should allow psychologist to access session regardless of payment status', async () => {
      // Update session to have pending payment
      await Session.update(
        { paymentStatus: 'Pending' },
        { where: { id: testSession.id } }
      );
      
      // Psychologist should still be able to join (different from client)
      const response = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(true);
      
      // Psychologist should be able to generate room
      await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
    });
    
  });
  
  describe('Two-User Video Call Journey', () => {
    
    test('should handle complete two-user video call session', async () => {
      // Both users generate room (should get same room ID)
      const clientRoomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      const psychRoomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(clientRoomResponse.body.roomId).toBe(psychRoomResponse.body.roomId);
      const roomId = clientRoomResponse.body.roomId;
      
      // Establish WebSocket connections
      const clientSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: clientToken },
        transports: ['websocket']
      });
      
      const psychSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: psychologistToken },
        transports: ['websocket']
      });
      
      // Wait for connections
      await Promise.all([
        new Promise((resolve, reject) => {
          clientSocket.on('connect', resolve);
          clientSocket.on('connect_error', reject);
          setTimeout(() => reject(new Error('Client socket timeout')), 5000);
        }),
        new Promise((resolve, reject) => {
          psychSocket.on('connect', resolve);
          psychSocket.on('connect_error', reject);
          setTimeout(() => reject(new Error('Psychologist socket timeout')), 5000);
        })
      ]);
      
      // Client joins first
      const clientJoinPromise = new Promise((resolve, reject) => {
        clientSocket.on('join-success', ({ participantCount }) => {
          expect(participantCount).toBe(1);
          resolve();
        });
        clientSocket.on('join-error', ({ error }) => reject(new Error(error)));
        setTimeout(() => reject(new Error('Client join timeout')), 5000);
      });
      
      clientSocket.emit('join-room', { roomId, sessionId: testSession.id });
      await clientJoinPromise;
      
      // Psychologist joins second
      const psychJoinPromise = new Promise((resolve, reject) => {
        let eventsReceived = 0;
        
        psychSocket.on('join-success', ({ participantCount }) => {
          expect(participantCount).toBe(2);
          eventsReceived++;
          if (eventsReceived === 2) resolve();
        });
        
        psychSocket.on('existing-participants', (participants) => {
          expect(participants).toHaveLength(1);
          expect(participants[0].userName).toBe(clientUser.name);
          eventsReceived++;
          if (eventsReceived === 2) resolve();
        });
        
        psychSocket.on('join-error', ({ error }) => reject(new Error(error)));
        setTimeout(() => reject(new Error('Psychologist join timeout')), 5000);
      });
      
      // Client should receive notification of psychologist joining
      const clientNotificationPromise = new Promise((resolve, reject) => {
        clientSocket.on('user-joined', ({ userName, userRole }) => {
          expect(userName).toBe(psychologistUser.name);
          expect(userRole).toBe('psychologist');
          resolve();
        });
        setTimeout(() => reject(new Error('Client notification timeout')), 5000);
      });
      
      psychSocket.emit('join-room', { roomId, sessionId: testSession.id });
      await Promise.all([psychJoinPromise, clientNotificationPromise]);
      
      // Test WebRTC signaling
      const signalingPromise = new Promise((resolve, reject) => {
        psychSocket.on('offer', ({ offer, from, roomId: offerRoomId }) => {
          expect(offer.type).toBe('offer');
          expect(from).toBe(clientSocket.id);
          expect(offerRoomId).toBe(roomId);
          resolve();
        });
        setTimeout(() => reject(new Error('Signaling timeout')), 5000);
      });
      
      clientSocket.emit('offer', {
        offer: { type: 'offer', sdp: 'mock-sdp-offer' },
        to: psychSocket.id,
        roomId
      });
      
      await signalingPromise;
      
      // Both users start call
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: testSession.id, status: 'In Progress', videoCallStarted: new Date() }
      });
      
      await Promise.all([
        request(app)
          .post(`/api/video-calls/start/${testSession.id}`)
          .set('x-auth-token', clientToken)
          .expect(200),
        request(app)
          .post(`/api/video-calls/start/${testSession.id}`)
          .set('x-auth-token', psychologistToken)
          .expect(200)
      ]);
      
      // Simulate call duration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Both users end call
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 2,
        session: { id: testSession.id, status: 'Completed', callDuration: 2 }
      });
      
      await Promise.all([
        request(app)
          .post(`/api/video-calls/end/${testSession.id}`)
          .set('x-auth-token', clientToken)
          .expect(200),
        request(app)
          .post(`/api/video-calls/end/${testSession.id}`)
          .set('x-auth-token', psychologistToken)
          .expect(200)
      ]);
      
      // Cleanup
      clientSocket.disconnect();
      psychSocket.disconnect();
    }, 45000);
    
    test('should handle user disconnection and reconnection', async () => {
      const roomResponse = await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      const roomId = roomResponse.body.roomId;
      
      // Client connects and joins
      let clientSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: clientToken },
        transports: ['websocket']
      });
      
      await new Promise((resolve, reject) => {
        clientSocket.on('connect', resolve);
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      await new Promise((resolve, reject) => {
        clientSocket.on('join-success', resolve);
        clientSocket.on('join-error', ({ error }) => reject(new Error(error)));
        clientSocket.emit('join-room', { roomId, sessionId: testSession.id });
        setTimeout(() => reject(new Error('Join timeout')), 5000);
      });
      
      // Psychologist connects
      const psychSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: psychologistToken },
        transports: ['websocket']
      });
      
      await new Promise((resolve, reject) => {
        psychSocket.on('connect', resolve);
        psychSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Psych connection timeout')), 5000);
      });
      
      // Psychologist should see client disconnect when client disconnects
      const disconnectPromise = new Promise((resolve, reject) => {
        psychSocket.on('user-left', ({ userName, userRole }) => {
          expect(userName).toBe(clientUser.name);
          expect(userRole).toBe('client');
          resolve();
        });
        setTimeout(() => reject(new Error('Disconnect notification timeout')), 5000);
      });
      
      await new Promise((resolve, reject) => {
        psychSocket.on('join-success', resolve);
        psychSocket.on('join-error', ({ error }) => reject(new Error(error)));
        psychSocket.emit('join-room', { roomId, sessionId: testSession.id });
        setTimeout(() => reject(new Error('Psych join timeout')), 5000);
      });
      
      // Client disconnects
      clientSocket.disconnect();
      await disconnectPromise;
      
      // Client reconnects
      clientSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: clientToken },
        transports: ['websocket']
      });
      
      await new Promise((resolve, reject) => {
        clientSocket.on('connect', resolve);
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
      });
      
      // Psychologist should see client rejoin
      const rejoinPromise = new Promise((resolve, reject) => {
        psychSocket.on('user-joined', ({ userName, userRole }) => {
          expect(userName).toBe(clientUser.name);
          expect(userRole).toBe('client');
          resolve();
        });
        setTimeout(() => reject(new Error('Rejoin notification timeout')), 5000);
      });
      
      await new Promise((resolve, reject) => {
        clientSocket.on('join-success', resolve);
        clientSocket.on('join-error', ({ error }) => reject(new Error(error)));
        clientSocket.emit('join-room', { roomId, sessionId: testSession.id });
        setTimeout(() => reject(new Error('Rejoin timeout')), 5000);
      });
      
      await rejoinPromise;
      
      // Cleanup
      clientSocket.disconnect();
      psychSocket.disconnect();
    }, 30000);
    
  });
  
  describe('Error Scenarios and Recovery', () => {
    
    test('should handle session not found gracefully', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      await request(app)
        .get(`/api/video-calls/can-join/${nonExistentId}`)
        .set('x-auth-token', clientToken)
        .expect(404);
      
      await request(app)
        .post(`/api/video-calls/generate-room/${nonExistentId}`)
        .set('x-auth-token', clientToken)
        .expect(404);
    });
    
    test('should handle cancelled session appropriately', async () => {
      await Session.update(
        { status: 'Cancelled' },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(false);
      expect(response.body.reason).toContain('cancelled or declined');
      
      await request(app)
        .post(`/api/video-calls/generate-room/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(400);
    });
    
    test('should handle expired session appropriately', async () => {
      // Set session date to past (more than 2 hours ago)
      const pastDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
      await Session.update(
        { sessionDate: pastDate },
        { where: { id: testSession.id } }
      );
      
      const response = await request(app)
        .get(`/api/video-calls/can-join/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(false);
      expect(response.body.reason).toContain('expired');
    });
    
    test('should handle WebSocket authentication failures', async () => {
      const unauthenticatedSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        transports: ['websocket']
        // No auth token
      });
      
      await new Promise((resolve, reject) => {
        unauthenticatedSocket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication');
          resolve();
        });
        unauthenticatedSocket.on('connect', () => {
          reject(new Error('Should not connect without authentication'));
        });
        setTimeout(() => reject(new Error('Auth test timeout')), 5000);
      });
      
      unauthenticatedSocket.disconnect();
    });
    
    test('should handle invalid room join attempts', async () => {
      const clientSocket = socketIOClient(`http://localhost:${server.address().port}`, {
        auth: { token: clientToken },
        transports: ['websocket']
      });
      
      await new Promise((resolve, reject) => {
        clientSocket.on('connect', resolve);
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Try to join non-existent room
      await new Promise((resolve, reject) => {
        clientSocket.on('join-error', ({ error }) => {
          expect(error).toContain('Session not found');
          resolve();
        });
        clientSocket.on('join-success', () => {
          reject(new Error('Should not join invalid room'));
        });
        clientSocket.emit('join-room', {
          roomId: 'invalid-room-id',
          sessionId: 'invalid-session-id'
        });
        setTimeout(() => reject(new Error('Invalid join test timeout')), 5000);
      });
      
      clientSocket.disconnect();
    });
    
  });
  
  describe('Admin Monitoring Journey', () => {
    
    test('should allow admin to monitor active video calls', async () => {
      // Start a video call session
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
      
      // Admin should be able to view session details
      const sessionResponse = await request(app)
        .get(`/api/video-calls/session/${testSession.id}`)
        .set('x-auth-token', adminToken)
        .expect(200);
      
      expect(sessionResponse.body.session).toMatchObject({
        id: testSession.id,
        status: 'In Progress',
        client: { id: clientUser.id },
        psychologist: { id: psychologistUser.id }
      });
      
      // Admin should be able to view call history
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 5,
        session: { id: testSession.id, status: 'Completed', callDuration: 5 }
      });
      
      await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      const historyResponse = await request(app)
        .get('/api/video-calls/history?limit=10&offset=0')
        .set('x-auth-token', adminToken)
        .expect(200);
      
      expect(historyResponse.body.callHistory).toHaveLength(1);
      expect(historyResponse.body.callHistory[0]).toMatchObject({
        sessionId: testSession.id,
        callData: { duration: 5 }
      });
    });
    
  });
  
  describe('Concurrent User Scenarios', () => {
    
    test('should handle multiple concurrent sessions', async () => {
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
      });
      
      // Room IDs should be unique
      const roomIds = responses.map(r => r.body.roomId);
      expect(new Set(roomIds).size).toBe(roomIds.length);
    });
    
    test('should handle multiple users joining different rooms simultaneously', async () => {
      // Create additional users and sessions
      const client2 = await User.create({
        name: 'Test Client 2',
        email: 'client2@e2etest.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true
      });
      
      const psych2 = await User.create({
        name: 'Test Psychologist 2',
        email: 'psych2@e2etest.com',
        password: 'hashedpassword123',
        role: 'psychologist',
        isVerified: true,
        psychologistDetails: { specializations: ['Anxiety'], hourlyRate: 60, isApproved: true }
      });
      
      const session2 = await Session.create({
        clientId: client2.id,
        psychologistId: psych2.id,
        sessionType: 'Individual',
        sessionDate: new Date(),
        status: 'Confirmed',
        paymentStatus: 'Confirmed',
        meetingLink: 'room-concurrent-session-2'
      });
      
      const client2Token = jwt.sign(
        { user: { id: client2.id, role: client2.role } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Generate rooms for both sessions
      const [room1Response, room2Response] = await Promise.all([
        request(app)
          .post(`/api/video-calls/generate-room/${testSession.id}`)
          .set('x-auth-token', clientToken),
        request(app)
          .post(`/api/video-calls/generate-room/${session2.id}`)
          .set('x-auth-token', client2Token)
      ]);
      
      expect(room1Response.status).toBe(200);
      expect(room2Response.status).toBe(200);
      expect(room1Response.body.roomId).not.toBe(room2Response.body.roomId);
      
      // Create socket connections for all users
      const sockets = [
        socketIOClient(`http://localhost:${server.address().port}`, {
          auth: { token: clientToken },
          transports: ['websocket']
        }),
        socketIOClient(`http://localhost:${server.address().port}`, {
          auth: { token: psychologistToken },
          transports: ['websocket']
        }),
        socketIOClient(`http://localhost:${server.address().port}`, {
          auth: { token: client2Token },
          transports: ['websocket']
        })
      ];
      
      // Wait for all connections
      await Promise.all(sockets.map(socket => 
        new Promise((resolve, reject) => {
          socket.on('connect', resolve);
          socket.on('connect_error', reject);
          setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
        })
      ));
      
      // Join rooms simultaneously
      const joinPromises = [
        new Promise((resolve, reject) => {
          sockets[0].on('join-success', resolve);
          sockets[0].on('join-error', ({ error }) => reject(new Error(error)));
          sockets[0].emit('join-room', { roomId: room1Response.body.roomId, sessionId: testSession.id });
          setTimeout(() => reject(new Error('Join timeout')), 5000);
        }),
        new Promise((resolve, reject) => {
          sockets[1].on('join-success', resolve);
          sockets[1].on('join-error', ({ error }) => reject(new Error(error)));
          sockets[1].emit('join-room', { roomId: room1Response.body.roomId, sessionId: testSession.id });
          setTimeout(() => reject(new Error('Join timeout')), 5000);
        }),
        new Promise((resolve, reject) => {
          sockets[2].on('join-success', resolve);
          sockets[2].on('join-error', ({ error }) => reject(new Error(error)));
          sockets[2].emit('join-room', { roomId: room2Response.body.roomId, sessionId: session2.id });
          setTimeout(() => reject(new Error('Join timeout')), 5000);
        })
      ];
      
      await Promise.all(joinPromises);
      
      // Cleanup
      sockets.forEach(socket => socket.disconnect());
    }, 30000);
    
  });
  
});

describe('Video Call Performance and Load Testing', () => {
  
  test('should handle rapid API requests without degradation', async () => {
    const startTime = Date.now();
    
    // Make 20 concurrent API requests
    const requests = Array(20).fill().map(() =>
      request(app)
        .get('/api/video-calls/config')
        .set('x-auth-token', clientToken)
    );
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.iceServers).toHaveLength(2);
    });
    
    // Should complete within reasonable time (5 seconds for 20 requests)
    expect(endTime - startTime).toBeLessThan(5000);
  });
  
  test('should handle multiple socket connections efficiently', async () => {
    const connectionCount = 10;
    const sockets = [];
    const startTime = Date.now();
    
    try {
      // Create multiple socket connections
      for (let i = 0; i < connectionCount; i++) {
        const socket = socketIOClient(`http://localhost:${server.address().port}`, {
          auth: { token: clientToken },
          transports: ['websocket']
        });
        sockets.push(socket);
      }
      
      // Wait for all connections
      await Promise.all(sockets.map(socket =>
        new Promise((resolve, reject) => {
          socket.on('connect', resolve);
          socket.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        })
      ));
      
      const endTime = Date.now();
      
      // All should be connected
      sockets.forEach(socket => {
        expect(socket.connected).toBe(true);
      });
      
      // Should connect within reasonable time
      expect(endTime - startTime).toBeLessThan(10000);
      
    } finally {
      // Cleanup
      sockets.forEach(socket => socket.disconnect());
    }
  }, 15000);
  
});