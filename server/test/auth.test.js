const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Test123!',
  role: 'client'
};

const testPsychologist = {
  name: 'Dr. Test Psychologist',
  email: 'psychologist@example.com',
  password: 'Psych123!',
  role: 'psychologist'
};

// Helper function to register a user
const registerUser = async (userData) => {
  return await request(app)
    .post('/api/users/register')
    .send(userData);
};

// Helper function to login a user
const loginUser = async (credentials) => {
  return await request(app)
    .post('/api/users/login')
    .send({
      email: credentials.email,
      password: credentials.password
    });
};

beforeAll(async () => {
  // Use in-memory MongoDB server for testing
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/testdb';
  await mongoose.connect(mongoUri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });
  
  // Clear rate limiting data
  await mongoose.connection.collection('ratelimits').deleteMany({});
});

afterEach(async () => {
  // Clean up test data
  await User.deleteMany({});
  // Clear rate limiting data
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection('ratelimits').deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Auth Routes', () => {

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const res = await registerUser(testUser);

      // Test response status and structure
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        token: expect.any(String),
        user: {
          id: expect.any(String),
          name: testUser.name,
          email: testUser.email.toLowerCase(),
          role: 'client', // Default role
          lastLogin: expect.any(String)
        }
      });
      
      // Verify JWT token
      const decoded = jwt.verify(
        res.body.token, 
        process.env.JWT_SECRET || 'your_jwt_secret'
      );
      expect(decoded.user).toHaveProperty('id', res.body.user.id);
      
      // Verify user in database
      const user = await User.findById(res.body.user.id).select('+password');
      expect(user).toBeTruthy();
      expect(user.name).toBe(testUser.name);
      expect(user.email).toBe(testUser.email.toLowerCase());
      expect(user.role).toBe('client');
      
      // Verify password is hashed
      const isMatch = await user.correctPassword(testUser.password, user.password);
      expect(isMatch).toBe(true);
    });
    
    it('should register a psychologist with role', async () => {
      const res = await registerUser(testPsychologist);
      
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('psychologist');
    });
    
    it('should fail with invalid email format', async () => {
      const res = await registerUser({
        ...testUser,
        email: 'invalid-email'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining(['Please provide a valid email address'])
      });
    });
    
    it('should fail with weak password', async () => {
      const res = await registerUser({
        ...testUser,
        password: 'weak'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number'
        ])
      });
    });
    
    it('should fail with missing required fields', async () => {
      const testCases = [
        { email: testUser.email, password: testUser.password }, // missing name
        { name: testUser.name, password: testUser.password },  // missing email
        { name: testUser.name, email: testUser.email }         // missing password
      ];
      
      for (const testCase of testCases) {
        const res = await registerUser(testCase);
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
      }
    });

    it('should not register with duplicate email (case insensitive)', async () => {
      // First registration
      await registerUser(testUser);
      
      // Second registration with same email (different case)
      const res = await registerUser({
        ...testUser,
        email: testUser.email.toUpperCase()
      });

      // Test response
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: 'User with this email already exists',
        errors: ['Email is already in use']
      });
      
      // Verify only one user was created
      const users = await User.find({ email: testUser.email.toLowerCase() });
      expect(users).toHaveLength(1);
    });

    it('should fail with invalid role', async () => {
      const res = await registerUser({
        ...testUser,
        role: 'invalid-role'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: ['Invalid role specified']
      });
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Register test users before each test
      await registerUser(testUser);
      await registerUser(testPsychologist);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await loginUser(testUser);
      
      // Test response status and structure
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        token: expect.any(String),
        user: {
          id: expect.any(String),
          name: testUser.name,
          email: testUser.email.toLowerCase(),
          role: 'client',
          lastLogin: expect.any(String)
        }
      });
      
      // Verify JWT token
      const decoded = jwt.verify(
        res.body.token, 
        process.env.JWT_SECRET || 'your_jwt_secret'
      );
      expect(decoded.user).toMatchObject({
        id: res.body.user.id,
        role: 'client'
      });
      
      // Verify lastLogin was updated
      const user = await User.findById(res.body.user.id);
      expect(new Date(user.lastLogin).getTime()).toBeGreaterThan(
        Date.now() - 1000 // Within last second
      );
    });
    
    it('should login psychologist with correct role', async () => {
      const res = await loginUser(testPsychologist);
      
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('psychologist');
      
      const decoded = jwt.verify(
        res.body.token,
        process.env.JWT_SECRET || 'your_jwt_secret'
      );
      expect(decoded.user.role).toBe('psychologist');
    });
    
    it('should fail with incorrect password', async () => {
      const res = await loginUser({
        email: testUser.email,
        password: 'wrongpassword'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password']
      });
    });
    
    it('should fail with non-existent email', async () => {
      const res = await loginUser({
        email: 'nonexistent@example.com',
        password: 'password123'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password']
      });
    });
    
    it('should fail with missing credentials', async () => {
      const testCases = [
        { email: testUser.email }, // missing password
        { password: testUser.password }, // missing email
        {} // missing both
      ];
      
      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/users/login')
          .send(testCase);
          
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          errors: expect.any(Array)
        });
      }
    });
    
    it('should lock account after multiple failed attempts', async () => {
      const MAX_ATTEMPTS = 5;
      const credentials = {
        email: testUser.email,
        password: 'wrongpassword'
      };
      
      // Make MAX_ATTEMPTS failed login attempts
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await loginUser(credentials);
      }
      
      // Next attempt should be locked
      const res = await loginUser({
        email: testUser.email,
        password: testUser.password // Correct password, but account should be locked
      });
      
      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Account temporarily locked',
        errors: [expect.stringMatching(/try again in \d+ minutes/i)]
      });
      
      // Verify account is locked in database
      const user = await User.findOne({ email: testUser.email })
        .select('+loginAttempts +lockUntil');
      expect(user.loginAttempts).toBeGreaterThanOrEqual(MAX_ATTEMPTS);
      expect(user.isAccountLocked()).toBe(true);
    });
    
    it('should reset login attempts on successful login', async () => {
      // First fail once
      await loginUser({
        email: testUser.email,
        password: 'wrongpassword'
      });
      
      // Then login successfully
      const res = await loginUser(testUser);
      expect(res.status).toBe(200);
      
      // Verify login attempts were reset
      const user = await User.findOne({ email: testUser.email })
        .select('+loginAttempts +lockUntil');
      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
    });
  });
});
          name: userData.name,
          email: userData.email
        }
      });
      
      // Test JWT token
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET || 'your_jwt_secret');
      expect(decoded.user).toHaveProperty('id', res.body.data.id);
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: userData.email, password: 'WrongPassword' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: expect.stringMatching(/invalid|incorrect|wrong/i)
      });
      
      // Verify token is not returned
      expect(res.body.token).toBeUndefined();
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'nouser@example.com', password: 'Password123' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: expect.stringMatching(/not found|invalid/i)
      });
      
      // Verify token is not returned
      expect(res.body.token).toBeUndefined();
    });
    
    it('should not login with empty credentials', async () => {
      const testCases = [
        { email: '', password: 'password' },
        { email: 'test@example.com', password: '' },
        { email: '', password: '' },
        {},
        null
      ];
      
      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/users/login')
          .send(testCase);
          
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
          success: false,
          message: expect.any(String)
        });
      }
    });
  });
});
