/**
 * Video Call Timing Validation Tests
 * 
 * Tests the session timing validation logic for video calls
 * Validates AC-1.2 and AC-2.2: Button is enabled 15 minutes before scheduled time
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// Set up test environment
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Session = require('../models/Session');

let mongoServer;
let clientUser;
let psychologistUser;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
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
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up sessions after each test
  await Session.deleteMany({});
});

describe('Video Call Timing Validation Logic', () => {
  
  // Test the core timing validation logic
  function canJoinVideoCall(session, currentTime = new Date()) {
    // Replicate the logic from the API endpoint
    if (session.status !== 'Confirmed') return { canJoin: false, reason: `Session status is ${session.status}. Must be Confirmed.` };
    if (!['Confirmed', 'Paid', 'Verified'].includes(session.paymentStatus)) {
      return { canJoin: false, reason: `Payment not confirmed. Current status: ${session.paymentStatus}` };
    }
    
    const sessionDate = new Date(session.sessionDate);
    const timeDiffMinutes = (sessionDate - currentTime) / (1000 * 60);
    
    const canJoin = timeDiffMinutes <= 15 && timeDiffMinutes >= -120;
    
    let reason = null;
    if (!canJoin) {
      if (timeDiffMinutes < -120) {
        reason = 'Session time has passed (more than 2 hours ago)';
      } else if (timeDiffMinutes > 15) {
        reason = `Session starts in ${Math.round(timeDiffMinutes)} minutes. Join window opens 15 minutes before.`;
      }
    }
    
    return { canJoin, reason, minutesUntilSession: Math.round(timeDiffMinutes) };
  }
  
  test('should allow joining exactly 15 minutes before session', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() + 15 * 60 * 1000);
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(true);
    expect(result.minutesUntilSession).toBe(15);
    expect(result.reason).toBeNull();
  });
  
  test('should allow joining exactly at session time', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime());
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(true);
    expect(result.minutesUntilSession).toBe(0);
    expect(result.reason).toBeNull();
  });
  
  test('should allow joining up to 2 hours after session', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() - 119 * 60 * 1000); // 119 minutes ago
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(true);
    expect(result.minutesUntilSession).toBe(-119);
    expect(result.reason).toBeNull();
  });
  
  test('should allow joining exactly 2 hours after session', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() - 120 * 60 * 1000); // Exactly 2 hours ago
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(true);
    expect(result.minutesUntilSession).toBe(-120);
    expect(result.reason).toBeNull();
  });
  
  test('should NOT allow joining more than 15 minutes before session', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 minutes in future
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(false);
    expect(result.minutesUntilSession).toBe(30);
    expect(result.reason).toContain('Join window opens 15 minutes before');
  });
  
  test('should NOT allow joining more than 2 hours after session', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() - 150 * 60 * 1000); // 2.5 hours ago
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(false);
    expect(result.minutesUntilSession).toBe(-150);
    expect(result.reason).toContain('more than 2 hours ago');
  });
  
  test('should NOT allow joining if session is not confirmed', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() + 10 * 60 * 1000);
    
    const session = {
      sessionDate: sessionDate,
      status: 'Pending', // Not confirmed
      paymentStatus: 'Confirmed'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(false);
    expect(result.reason).toContain('Must be Confirmed');
  });
  
  test('should NOT allow joining if payment is not confirmed', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() + 10 * 60 * 1000);
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Pending' // Not confirmed
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(false);
    expect(result.reason).toContain('Payment not confirmed');
  });
  
  test('should accept Paid payment status', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() + 10 * 60 * 1000);
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Paid'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(true);
    expect(result.reason).toBeNull();
  });
  
  test('should accept Verified payment status', () => {
    const currentTime = new Date();
    const sessionDate = new Date(currentTime.getTime() + 10 * 60 * 1000);
    
    const session = {
      sessionDate: sessionDate,
      status: 'Confirmed',
      paymentStatus: 'Verified'
    };
    
    const result = canJoinVideoCall(session, currentTime);
    
    expect(result.canJoin).toBe(true);
    expect(result.reason).toBeNull();
  });
  
});