/**
 * Dashboard Integration Tests
 * 
 * Verifies that ClientDashboard endpoints work correctly:
 * - GET /api/sessions/history returns 200 (not 404)
 * - GET /api/feedback/client returns 200 with array (not 404)
 * - SessionHistory component can receive data
 * - Feedback state is populated (even if empty array)
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Models
const User = require('../models/User');
const Session = require('../models/Session');
const Feedback = require('../models/Feedback');

// Routes
const sessionsRouter = require('../routes/sessions');
const feedbackRouter = require('../routes/feedback');

let mongoServer;
let app;
let clientToken;
let psychologistToken;
let clientUser;
let psychologistUser;

// Setup Express app for testing
const setupApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/sessions', sessionsRouter);
  testApp.use('/api/feedback', feedbackRouter);
  return testApp;
};

// Generate JWT token for testing
const generateToken = (userId) => {
  return jwt.sign(
    { user: { id: userId } },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  app = setupApp();
  
  // Create test users
  clientUser = await User.create({
    name: 'Test Client',
    email: 'testclient@example.com',
    password: 'hashedpassword123',
    role: 'client',
    isVerified: true
  });
  
  psychologistUser = await User.create({
    name: 'Test Psychologist',
    email: 'testpsych@example.com',
    password: 'hashedpassword123',
    role: 'psychologist',
    isVerified: true,
    approvalStatus: 'approved'
  });
  
  clientToken = generateToken(clientUser._id.toString());
  psychologistToken = generateToken(psychologistUser._id.toString());
});

afterEach(async () => {
  // Clean up sessions and feedback between tests
  await Session.deleteMany({});
  await Feedback.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Dashboard Integration - Session History Endpoint', () => {
  
  describe('GET /api/sessions/history', () => {
    
    test('should return 200 with empty sessionHistory array when no sessions exist', async () => {
      const response = await request(app)
        .get('/api/sessions/history')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionHistory).toBeDefined();
      expect(Array.isArray(response.body.sessionHistory)).toBe(true);
      expect(response.body.sessionHistory.length).toBe(0);
      expect(response.body.pagination).toBeDefined();
    });
    
    test('should return 200 with session data when completed sessions exist', async () => {
      // Create a completed session
      const session = await Session.create({
        client: clientUser._id,
        psychologist: psychologistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(),
        status: 'Completed',
        price: 2500
      });
      
      const response = await request(app)
        .get('/api/sessions/history')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionHistory.length).toBe(1);
      expect(response.body.sessionHistory[0].sessionId.toString()).toBe(session._id.toString());
    });
    
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/sessions/history');
      
      expect(response.status).toBe(401);
    });
    
    test('should support pagination parameters', async () => {
      // Create multiple completed sessions
      for (let i = 0; i < 5; i++) {
        await Session.create({
          client: clientUser._id,
          psychologist: psychologistUser._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() - i * 86400000),
          status: 'Completed',
          price: 2500
        });
      }
      
      const response = await request(app)
        .get('/api/sessions/history?limit=2&offset=0')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(200);
      expect(response.body.sessionHistory.length).toBe(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.hasMore).toBe(true);
    });
  });
});

describe('Dashboard Integration - Feedback Client Endpoint', () => {
  
  describe('GET /api/feedback/client', () => {
    
    test('should return 200 with empty feedback array when no feedback exists', async () => {
      const response = await request(app)
        .get('/api/feedback/client')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.feedback).toBeDefined();
      expect(Array.isArray(response.body.feedback)).toBe(true);
      expect(response.body.feedback.length).toBe(0);
      expect(response.body.count).toBe(0);
    });
    
    test('should return 200 with feedback data when feedback exists', async () => {
      // Create a completed session
      const session = await Session.create({
        client: clientUser._id,
        psychologist: psychologistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(),
        status: 'Completed',
        price: 2500
      });
      
      // Create feedback for the session
      const feedback = await Feedback.create({
        session: session._id,
        client: clientUser._id,
        psychologist: psychologistUser._id,
        rating: 5,
        comment: 'Great session!'
      });
      
      const response = await request(app)
        .get('/api/feedback/client')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.feedback.length).toBe(1);
      expect(response.body.feedback[0].rating).toBe(5);
      expect(response.body.count).toBe(1);
    });
    
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/feedback/client');
      
      expect(response.status).toBe(401);
    });
    
    test('should only return feedback for the logged-in client', async () => {
      // Create another client
      const otherClient = await User.create({
        name: 'Other Client',
        email: 'otherclient@example.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true
      });
      
      // Create sessions for both clients
      const session1 = await Session.create({
        client: clientUser._id,
        psychologist: psychologistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(),
        status: 'Completed',
        price: 2500
      });
      
      const session2 = await Session.create({
        client: otherClient._id,
        psychologist: psychologistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(),
        status: 'Completed',
        price: 2500
      });
      
      // Create feedback for both
      await Feedback.create({
        session: session1._id,
        client: clientUser._id,
        psychologist: psychologistUser._id,
        rating: 5,
        comment: 'My feedback'
      });
      
      await Feedback.create({
        session: session2._id,
        client: otherClient._id,
        psychologist: psychologistUser._id,
        rating: 4,
        comment: 'Other client feedback'
      });
      
      const response = await request(app)
        .get('/api/feedback/client')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(200);
      expect(response.body.feedback.length).toBe(1);
      expect(response.body.feedback[0].comment).toBe('My feedback');
    });
  });
});

describe('Dashboard Integration - No 404 Errors', () => {
  
  test('ClientDashboard endpoints should never return 404 for empty data', async () => {
    // Test /api/sessions/history
    const historyResponse = await request(app)
      .get('/api/sessions/history')
      .set('x-auth-token', clientToken);
    
    expect(historyResponse.status).not.toBe(404);
    expect(historyResponse.status).toBe(200);
    
    // Test /api/feedback/client
    const feedbackResponse = await request(app)
      .get('/api/feedback/client')
      .set('x-auth-token', clientToken);
    
    expect(feedbackResponse.status).not.toBe(404);
    expect(feedbackResponse.status).toBe(200);
  });
  
  test('Route ordering should not cause /history to be caught by /:id', async () => {
    // This test verifies that /history is not interpreted as an ID parameter
    const response = await request(app)
      .get('/api/sessions/history')
      .set('x-auth-token', clientToken);
    
    // If route ordering is wrong, this would return 404 with "Session not found"
    // or 500 with "Cast to ObjectId failed"
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).not.toBe('Session not found');
  });
});

describe('Dashboard Integration - SessionHistory Component Data', () => {
  
  test('should return data structure compatible with SessionHistory component', async () => {
    // Create a completed session with call data
    const session = await Session.create({
      client: clientUser._id,
      psychologist: psychologistUser._id,
      sessionType: 'Individual',
      sessionDate: new Date(),
      status: 'Completed',
      price: 2500,
      videoCallStarted: new Date(Date.now() - 3600000),
      videoCallEnded: new Date(),
      callDuration: 3600
    });
    
    const response = await request(app)
      .get('/api/sessions/history')
      .set('x-auth-token', clientToken);
    
    expect(response.status).toBe(200);
    
    const sessionData = response.body.sessionHistory[0];
    
    // Verify structure matches what SessionHistory component expects
    expect(sessionData).toHaveProperty('sessionId');
    expect(sessionData).toHaveProperty('sessionType');
    expect(sessionData).toHaveProperty('sessionDate');
    expect(sessionData).toHaveProperty('status');
    expect(sessionData).toHaveProperty('client');
    expect(sessionData).toHaveProperty('psychologist');
    expect(sessionData).toHaveProperty('callData');
    expect(sessionData.callData).toHaveProperty('duration');
    expect(sessionData.callData).toHaveProperty('durationFormatted');
  });
});

describe('Dashboard Integration - Feedback State Population', () => {
  
  test('should populate feedback state with session IDs for submitted feedback', async () => {
    // Create completed sessions
    const session1 = await Session.create({
      client: clientUser._id,
      psychologist: psychologistUser._id,
      sessionType: 'Individual',
      sessionDate: new Date(),
      status: 'Completed',
      price: 2500
    });
    
    const session2 = await Session.create({
      client: clientUser._id,
      psychologist: psychologistUser._id,
      sessionType: 'Individual',
      sessionDate: new Date(),
      status: 'Completed',
      price: 2500
    });
    
    // Submit feedback for session1 only
    await Feedback.create({
      session: session1._id,
      client: clientUser._id,
      psychologist: psychologistUser._id,
      rating: 5,
      comment: 'Great!'
    });
    
    const response = await request(app)
      .get('/api/feedback/client')
      .set('x-auth-token', clientToken);
    
    expect(response.status).toBe(200);
    
    // ClientDashboard uses: setSubmittedFeedback(feedbackRes.data?.map(f => f.session) || [])
    const submittedSessionIds = response.body.feedback.map(f => f.session);
    
    expect(submittedSessionIds.length).toBe(1);
    // Session1 should be in submitted feedback, session2 should not
    expect(submittedSessionIds.some(id => id.toString() === session1._id.toString())).toBe(true);
  });
});
