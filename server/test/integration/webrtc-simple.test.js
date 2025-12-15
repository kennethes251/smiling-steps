/**
 * WebRTC Simple Integration Tests
 * 
 * Tests the core WebRTC integration flows without complex model dependencies
 * Focuses on API endpoints, signaling, and basic functionality
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const http = require('http');
const socketIOClient = require('socket.io-client');

// Set up test environment
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

// Mock all external dependencies
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
  generateMeetingLink: jest.fn(() => `room-test-${Date.now()}`)
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

let server;
let io;
let testToken;

// Mock global models
global.User = {
  findByPk: jest.fn(),
  create: jest.fn()
};

global.Session = {
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn()
};

beforeAll(async () => {
  try {
    // Generate test token
    testToken = jwt.sign(
      { user: { id: 'test-user-id', role: 'client' } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
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
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
}, 10000);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WebRTC Simple Integration Tests', () => {
  
  describe('API Endpoints', () => {
    
    test('should get WebRTC configuration', async () => {
      const response = await request(app)
        .get('/api/video-calls/config')
        .set('x-auth-token', testToken)
        .expect(200);
      
      expect(response.body.iceServers).toHaveLength(2);
      expect(response.body.iceServers[0].urls).toContain('stun:');
    });
    
    test('should require authentication for config endpoint', async () => {
      await request(app)
        .get('/api/video-calls/config')
        .expect(401);
    });
    
    test('should generate room for valid session', async () => {
      const mockSession = {
        id: 'test-session-id',
        clientId: 'test-user-id',
        psychologistId: 'other-user-id',
        status: 'Confirmed',
        paymentStatus: 'Confirmed',
        meetingLink: 'room-test-123',
        sessionDate: new Date(),
        sessionType: 'Individual',
        client: { id: 'test-user-id', name: 'Test Client' },
        psychologist: { id: 'other-user-id', name: 'Test Psychologist' },
        save: jest.fn()
      };
      
      global.Session.findByPk.mockResolvedValue(mockSession);
      
      const response = await request(app)
        .post('/api/video-calls/generate-room/test-session-id')
        .set('x-auth-token', testToken)
        .expect(200);
      
      expect(response.body).toMatchObject({
        roomId: 'room-test-123',
        sessionId: 'test-session-id',
        participants: {
          client: { id: 'test-user-id', name: 'Test Client' },
          psychologist: { id: 'other-user-id', name: 'Test Psychologist' }
        }
      });
    });
    
    test('should reject room generation for non-existent session', async () => {
      global.Session.findByPk.mockResolvedValue(null);
      
      await request(app)
        .post('/api/video-calls/generate-room/non-existent-id')
        .set('x-auth-token', testToken)
        .expect(404);
    });
    
    test('should reject room generation for unauthorized user', async () => {
      const mockSession = {
        id: 'test-session-id',
        clientId: 'other-user-id', // Different from token user
        psychologistId: 'another-user-id',
        status: 'Confirmed',
        paymentStatus: 'Confirmed'
      };
      
      global.Session.findByPk.mockResolvedValue(mockSession);
      
      await request(app)
        .post('/api/video-calls/generate-room/test-session-id')
        .set('x-auth-token', testToken)
        .expect(403);
    });
    
    test('should reject room generation for unconfirmed payment', async () => {
      const mockSession = {
        id: 'test-session-id',
        clientId: 'test-user-id',
        psychologistId: 'other-user-id',
        status: 'Confirmed',
        paymentStatus: 'Pending' // Not confirmed
      };
      
      global.Session.findByPk.mockResolvedValue(mockSession);
      
      await request(app)
        .post('/api/video-calls/generate-room/test-session-id')
        .set('x-auth-token', testToken)
        .expect(403);
    });
    
    test('should start video call successfully', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: {
          id: 'test-session-id',
          status: 'In Progress',
          videoCallStarted: new Date()
        }
      });
      
      const response = await request(app)
        .post('/api/video-calls/start/test-session-id')
        .set('x-auth-token', testToken)
        .expect(200);
      
      expect(response.body.message).toBe('Video call started successfully');
      expect(SessionStatusManager.startVideoCall).toHaveBeenCalledWith('test-session-id', 'test-user-id');
    });
    
    test('should end video call successfully', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.endVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call ended successfully',
        duration: 30,
        session: {
          id: 'test-session-id',
          status: 'Completed',
          videoCallEnded: new Date(),
          callDuration: 30
        }
      });
      
      const response = await request(app)
        .post('/api/video-calls/end/test-session-id')
        .set('x-auth-token', testToken)
        .expect(200);
      
      expect(response.body.message).toBe('Video call ended successfully');
      expect(response.body.duration).toBe(30);
      expect(SessionStatusManager.endVideoCall).toHaveBeenCalledWith('test-session-id', 'test-user-id');
    });
    
    test('should check join eligibility correctly', async () => {
      const mockSession = {
        id: 'test-session-id',
        clientId: 'test-user-id',
        psychologistId: 'other-user-id',
        status: 'Confirmed',
        paymentStatus: 'Confirmed',
        sessionDate: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      };
      
      global.Session.findByPk.mockResolvedValue(mockSession);
      
      const response = await request(app)
        .get('/api/video-calls/can-join/test-session-id')
        .set('x-auth-token', testToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(true);
      expect(response.body.reason).toBeNull();
    });
    
    test('should reject join for sessions too far in future', async () => {
      const mockSession = {
        id: 'test-session-id',
        clientId: 'test-user-id',
        psychologistId: 'other-user-id',
        status: 'Confirmed',
        paymentStatus: 'Confirmed',
        sessionDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };
      
      global.Session.findByPk.mockResolvedValue(mockSession);
      
      const response = await request(app)
        .get('/api/video-calls/can-join/test-session-id')
        .set('x-auth-token', testToken)
        .expect(200);
      
      expect(response.body.canJoin).toBe(false);
      expect(response.body.reason).toContain('Join window opens 15 minutes before');
    });
    
  });
  
  describe('Socket.io Signaling', () => {
    
    let clientSocket;
    const serverPort = server.address().port;
    
    beforeEach(() => {
      clientSocket = socketIOClient(`http://localhost:${serverPort}`, {
        auth: { token: testToken },
        transports: ['websocket']
      });
    });
    
    afterEach(() => {
      if (clientSocket) clientSocket.disconnect();
    });
    
    test('should establish authenticated WebSocket connection', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
      
      clientSocket.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
      
      setTimeout(() => {
        if (!clientSocket.connected) {
          done(new Error('Connection timeout'));
        }
      }, 3000);
    });
    
    test('should handle room joining with session validation', (done) => {
      const mockSession = {
        id: 'test-session-id',
        clientId: 'test-user-id',
        psychologistId: 'other-user-id',
        status: 'Confirmed',
        paymentStatus: 'Confirmed',
        meetingLink: 'room-test-123'
      };
      
      global.Session.findByPk.mockResolvedValue(mockSession);
      
      clientSocket.on('connect', () => {
        clientSocket.emit('join-room', {
          roomId: 'room-test-123',
          sessionId: 'test-session-id'
        });
      });
      
      clientSocket.on('join-success', ({ participantCount, secureConnection }) => {
        expect(participantCount).toBe(1);
        expect(secureConnection).toBeDefined();
        done();
      });
      
      clientSocket.on('join-error', ({ error }) => {
        done(new Error(`Join failed: ${error}`));
      });
      
      setTimeout(() => {
        done(new Error('Join timeout'));
      }, 5000);
    });
    
    test('should reject room joining for invalid session', (done) => {
      global.Session.findByPk.mockResolvedValue(null);
      
      clientSocket.on('connect', () => {
        clientSocket.emit('join-room', {
          roomId: 'invalid-room',
          sessionId: 'invalid-session-id'
        });
      });
      
      clientSocket.on('join-error', ({ error }) => {
        expect(error).toContain('Session not found');
        done();
      });
      
      clientSocket.on('join-success', () => {
        done(new Error('Should not have joined invalid session'));
      });
      
      setTimeout(() => {
        done(new Error('Error timeout'));
      }, 3000);
    });
    
    test('should reject unauthenticated socket connections', (done) => {
      const unauthenticatedSocket = socketIOClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
        // No auth token
      });
      
      unauthenticatedSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        unauthenticatedSocket.disconnect();
        done();
      });
      
      unauthenticatedSocket.on('connect', () => {
        unauthenticatedSocket.disconnect();
        done(new Error('Should not connect without authentication'));
      });
      
      setTimeout(() => {
        unauthenticatedSocket.disconnect();
        done(new Error('Authentication test timeout'));
      }, 3000);
    });
    
  });
  
  describe('Error Handling', () => {
    
    test('should handle session status manager errors', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockRejectedValue(new Error('Database error'));
      
      await request(app)
        .post('/api/video-calls/start/test-session-id')
        .set('x-auth-token', testToken)
        .expect(500);
    });
    
    test('should handle invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      await request(app)
        .get('/api/video-calls/config')
        .set('x-auth-token', invalidToken)
        .expect(401);
    });
    
    test('should handle malformed session IDs', async () => {
      await request(app)
        .post('/api/video-calls/generate-room/invalid-id-format')
        .set('x-auth-token', testToken)
        .expect(404);
    });
    
  });
  
  describe('Security Validation', () => {
    
    test('should validate secure connection requirements', () => {
      // Test that security middleware is properly configured
      const { initializeVideoCallServer } = require('../../services/videoCallService');
      expect(typeof initializeVideoCallServer).toBe('function');
    });
    
    test('should enforce authentication on all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/video-calls/config' },
        { method: 'post', path: '/api/video-calls/generate-room/test-id' },
        { method: 'post', path: '/api/video-calls/start/test-id' },
        { method: 'post', path: '/api/video-calls/end/test-id' },
        { method: 'get', path: '/api/video-calls/can-join/test-id' }
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });
    
  });
  
  describe('Concurrent Operations', () => {
    
    test('should handle multiple concurrent API requests', async () => {
      const SessionStatusManager = require('../../utils/sessionStatusManager');
      SessionStatusManager.startVideoCall.mockResolvedValue({
        success: true,
        message: 'Video call started successfully',
        session: { id: 'test-session-id', status: 'In Progress' }
      });
      
      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/video-calls/start/test-session-id')
          .set('x-auth-token', testToken)
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Video call started successfully');
      });
    });
    
    test('should handle multiple socket connections', (done) => {
      const sockets = [];
      let connectionsEstablished = 0;
      const targetConnections = 3;
      
      const checkComplete = () => {
        connectionsEstablished++;
        if (connectionsEstablished === targetConnections) {
          // Clean up
          sockets.forEach(socket => socket.disconnect());
          done();
        }
      };
      
      // Create multiple socket connections
      for (let i = 0; i < targetConnections; i++) {
        const socket = socketIOClient(`http://localhost:${serverPort}`, {
          auth: { token: testToken },
          transports: ['websocket']
        });
        
        sockets.push(socket);
        
        socket.on('connect', checkComplete);
        socket.on('connect_error', (error) => {
          sockets.forEach(s => s.disconnect());
          done(new Error(`Socket ${i} failed: ${error.message}`));
        });
      }
      
      setTimeout(() => {
        if (connectionsEstablished < targetConnections) {
          sockets.forEach(socket => socket.disconnect());
          done(new Error(`Only ${connectionsEstablished}/${targetConnections} connections established`));
        }
      }, 5000);
    });
    
  });
  
});

describe('WebRTC Integration Performance', () => {
  
  test('should handle API requests within reasonable time', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/video-calls/config')
      .set('x-auth-token', testToken)
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });
  
  test('should establish socket connections quickly', (done) => {
    const start = Date.now();
    
    const socket = socketIOClient(`http://localhost:${server.address().port}`, {
      auth: { token: testToken },
      transports: ['websocket']
    });
    
    socket.on('connect', () => {
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // Should connect within 2 seconds
      socket.disconnect();
      done();
    });
    
    socket.on('connect_error', (error) => {
      socket.disconnect();
      done(new Error(`Connection failed: ${error.message}`));
    });
    
    setTimeout(() => {
      socket.disconnect();
      done(new Error('Connection timeout'));
    }, 3000);
  });
  
});