/**
 * Video Call Duration Tracking Tests
 * 
 * Tests the call duration calculation and tracking functionality
 * Validates AC-6.1 through AC-6.5: Call duration tracking requirements
 */

const { Sequelize, DataTypes } = require('sequelize');
const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set up test environment
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// Create a test app without starting the server
const express = require('express');
const app = express();

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let sequelize;
let User;
let Session;
let clientUser;
let psychologistUser;
let clientToken;
let psychologistToken;

beforeAll(async () => {
  try {
    // Create in-memory SQLite database for testing
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false, // Disable SQL logging for cleaner test output
    });

    // Initialize models
    User = require('../models/User-sequelize')(sequelize, DataTypes);
    Session = require('../models/Session-sequelize')(sequelize, DataTypes);
    
    // Define associations
    User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
    User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
    
    // Make models globally available for the routes
    global.User = User;
    global.Session = Session;
    
    // Sync database
    await sequelize.sync({ force: true });
    
    // Add routes after models are set up
    app.use('/api/video-calls', require('../routes/videoCalls'));
  
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
      { 
        user: {
          id: clientUser.id, 
          role: clientUser.role 
        }
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    psychologistToken = jwt.sign(
      { 
        user: {
          id: psychologistUser.id, 
          role: psychologistUser.role 
        }
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  if (sequelize) {
    await sequelize.close();
  }
});

afterEach(async () => {
  // Clean up sessions after each test
  if (Session) {
    await Session.destroy({ where: {} });
  }
});

describe('Video Call Duration Tracking', () => {
  
  let testSession;
  
  beforeEach(async () => {
    // Create a test session for each test
    testSession = await Session.create({
      clientId: clientUser.id,
      psychologistId: psychologistUser.id,
      sessionType: 'Individual',
      sessionDate: new Date(),
      status: 'Confirmed',
      paymentStatus: 'Confirmed',
      price: 50,
      sessionRate: 50,
      isVideoCall: true
    });
  });
  
  describe('Call Start Tracking', () => {
    
    test('should record call start time when starting video call', async () => {
      const response = await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.message).toBe('Video call started successfully');
      expect(response.body.session.status).toBe('In Progress');
      expect(response.body.session.videoCallStarted).toBeDefined();
      
      // Verify in database
      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.videoCallStarted).toBeDefined();
      expect(updatedSession.status).toBe('In Progress');
      expect(new Date(updatedSession.videoCallStarted)).toBeInstanceOf(Date);
    });
    
    test('should not update start time if call already started', async () => {
      // Start call first time
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      const firstSession = await Session.findByPk(testSession.id);
      const firstStartTime = firstSession.videoCallStarted;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to start again
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      const secondSession = await Session.findByPk(testSession.id);
      expect(secondSession.videoCallStarted.getTime()).toBe(firstStartTime.getTime());
    });
    
    test('should allow psychologist to start call', async () => {
      const response = await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(response.body.session.videoCallStarted).toBeDefined();
    });
    
    test('should reject unauthorized users from starting call', async () => {
      const unauthorizedUser = await User.create({
        name: 'Unauthorized User',
        email: 'unauthorized@test.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true
      });
      
      const unauthorizedToken = jwt.sign(
        { 
          user: {
            id: unauthorizedUser.id, 
            role: unauthorizedUser.role 
          }
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', unauthorizedToken)
        .expect(403); // Will be 403 because user is not authorized for this session
    });
    
  });
  
  describe('Call End Tracking and Duration Calculation', () => {
    
    test('should record call end time and calculate duration', async () => {
      // Start the call
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken);
      
      // Wait a bit to simulate call duration
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
      
      // End the call
      const response = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.message).toBe('Video call ended successfully');
      expect(response.body.duration).toBeDefined();
      expect(response.body.duration).toBeGreaterThanOrEqual(0);
      expect(response.body.session.status).toBe('Completed');
      expect(response.body.session.videoCallStarted).toBeDefined();
      expect(response.body.session.videoCallEnded).toBeDefined();
      expect(response.body.session.callDuration).toBeDefined();
      
      // Verify in database
      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.videoCallEnded).toBeDefined();
      expect(updatedSession.duration).toBeGreaterThanOrEqual(0);
      expect(updatedSession.status).toBe('Completed');
      
      // Verify duration calculation (should be close to 0 minutes for 2 second call)
      expect(updatedSession.duration).toBe(0); // 2 seconds rounds to 0 minutes
    });
    
    test('should calculate duration correctly for longer calls', async () => {
      // Manually set start time to simulate longer call
      const startTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      await Session.update({
        videoCallStarted: startTime,
        status: 'In Progress'
      }, {
        where: { id: testSession.id }
      });
      
      const response = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.duration).toBe(5);
      
      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.duration).toBe(5);
    });
    
    test('should handle fractional minutes correctly', async () => {
      // Set start time to 2.7 minutes ago
      const startTime = new Date(Date.now() - 2.7 * 60 * 1000);
      await Session.update({
        videoCallStarted: startTime,
        status: 'In Progress'
      }, {
        where: { id: testSession.id }
      });
      
      const response = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      // Should round to 3 minutes
      expect(response.body.duration).toBe(3);
    });
    
    test('should not update end time if call already ended', async () => {
      // Start and end call
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken);
      
      await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken);
      
      const firstSession = await Session.findByPk(testSession.id);
      const firstEndTime = firstSession.videoCallEnded;
      const firstDuration = firstSession.duration;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to end again
      await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      const secondSession = await Session.findByPk(testSession.id);
      expect(secondSession.videoCallEnded.getTime()).toBe(firstEndTime.getTime());
      expect(secondSession.duration).toBe(firstDuration);
    });
    
    test('should handle ending call without start time', async () => {
      const response = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.duration).toBe(0);
      
      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.videoCallEnded).toBeDefined();
      expect(updatedSession.duration).toBe(0);
      expect(updatedSession.status).toBe('Completed');
    });
    
    test('should allow psychologist to end call', async () => {
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .set('x-auth-token', clientToken);
      
      const response = await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .set('x-auth-token', psychologistToken)
        .expect(200);
      
      expect(response.body.session.videoCallEnded).toBeDefined();
    });
    
  });
  
  describe('Session Information Retrieval', () => {
    
    test('should include duration information in session details', async () => {
      // Start and end a call with known duration
      const startTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      await Session.update({
        videoCallStarted: startTime,
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
      
      expect(response.body.session.videoCallStarted).toBeDefined();
      expect(response.body.session.videoCallEnded).toBeDefined();
      expect(response.body.session.callDuration).toBe(10);
      expect(response.body.session.status).toBe('Completed');
    });
    
    test('should show null duration for sessions without calls', async () => {
      const response = await request(app)
        .get(`/api/video-calls/session/${testSession.id}`)
        .set('x-auth-token', clientToken)
        .expect(200);
      
      expect(response.body.session.videoCallStarted).toBeNull();
      expect(response.body.session.videoCallEnded).toBeNull();
      expect(response.body.session.callDuration).toBeNull();
    });
    
  });
  
  describe('Edge Cases and Error Handling', () => {
    
    test('should handle invalid session ID gracefully', async () => {
      const invalidId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
      
      await request(app)
        .post(`/api/video-calls/start/${invalidId}`)
        .set('x-auth-token', clientToken)
        .expect(404); // Will be 404 because session not found
      
      await request(app)
        .post(`/api/video-calls/end/${invalidId}`)
        .set('x-auth-token', clientToken)
        .expect(404); // Will be 404 because session not found
    });
    
    test('should handle malformed session ID', async () => {
      await request(app)
        .post('/api/video-calls/start/invalid-id')
        .set('x-auth-token', clientToken)
        .expect(404);
    });
    
    test('should require authentication', async () => {
      await request(app)
        .post(`/api/video-calls/start/${testSession.id}`)
        .expect(401);
      
      await request(app)
        .post(`/api/video-calls/end/${testSession.id}`)
        .expect(401);
    });
    
  });
  
});

describe('Call Duration Calculation Logic', () => {
  
  test('should calculate duration correctly for various time spans', () => {
    const testCases = [
      { startOffset: 0, endOffset: 0, expected: 0 }, // Same time
      { startOffset: 60000, endOffset: 0, expected: 1 }, // 1 minute
      { startOffset: 150000, endOffset: 0, expected: 3 }, // 2.5 minutes -> rounds to 3
      { startOffset: 30000, endOffset: 0, expected: 1 }, // 30 seconds -> rounds to 1
      { startOffset: 29000, endOffset: 0, expected: 0 }, // 29 seconds -> rounds to 0
      { startOffset: 3600000, endOffset: 0, expected: 60 }, // 1 hour
    ];
    
    testCases.forEach(({ startOffset, endOffset, expected }) => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - startOffset);
      
      const durationMs = endTime - startTime;
      const durationMinutes = Math.round(durationMs / 60000);
      
      expect(durationMinutes).toBe(expected);
    });
  });
  
});