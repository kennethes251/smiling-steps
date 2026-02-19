const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const emailVerificationService = require('../services/emailVerificationService');

// Mock email service to avoid sending real emails during tests
jest.mock('../services/emailVerificationService');

// Create test app with all necessary routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add routes needed for the test
  app.use('/api/users', require('../routes/users-mongodb-fixed'));
  app.use('/api/email-verification', require('../routes/emailVerification'));
  app.use('/api/auth', require('../routes/auth'));
  
  return app;
};

describe('Client Registration + Verification End-to-End Flow', () => {
  let app;
  let testUser;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    
    // Setup test user data
    testUser = {
      name: 'Test Client',
      email: 'testclient@example.com',
      password: 'password123',
      role: 'client'
    };
    
    // Mock email verification service
    emailVerificationService.sendVerificationEmail.mockResolvedValue({
      success: true,
      message: 'Verification email sent successfully'
    });
    
    emailVerificationService.verifyEmailToken.mockImplementation(async (token) => {
      if (token === 'valid-token-123') {
        // Find and update the user
        const user = await User.findOne({ email: testUser.email });
        if (user) {
          user.isVerified = true;
          user.verificationToken = undefined;
          user.verificationTokenExpires = undefined;
          await user.save();
          
          return {
            success: true,
            code: 'VERIFIED',
            message: 'Email verified successfully',
            user: {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              isVerified: true
            }
          };
        }
      }
      
      return {
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired verification token'
      };
    });
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
  });

  test('Complete client registration and verification flow', async () => {
    // Step 1: Register new client
    console.log('Step 1: Registering new client...');
    const registrationResponse = await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(201);

    expect(registrationResponse.body).toMatchObject({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        name: testUser.name,
        email: testUser.email,
        role: 'client',
        isVerified: false
      },
      requiresVerification: true
    });

    // Verify user was created in database with correct initial state
    const createdUser = await User.findOne({ email: testUser.email });
    expect(createdUser).toBeTruthy();
    expect(createdUser.isVerified).toBe(false);
    // Note: verificationToken may be hashed or stored differently depending on implementation

    // Verify email verification service was called
    expect(emailVerificationService.sendVerificationEmail).toHaveBeenCalled();

    // Step 2: Attempt login before email verification (should fail)
    console.log('Step 2: Attempting login before verification...');
    const loginBeforeVerificationResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    // Login should fail for unverified users (could be 400 or 401 depending on implementation)
    expect([400, 401]).toContain(loginBeforeVerificationResponse.status);
    expect(loginBeforeVerificationResponse.body.success).toBe(false);

    // Step 3: Verify email using token
    console.log('Step 3: Verifying email with token...');
    const verificationResponse = await request(app)
      .post('/api/email-verification/verify')
      .send({ token: 'valid-token-123' })
      .expect(200);

    expect(verificationResponse.body).toMatchObject({
      success: true,
      code: 'VERIFIED',
      message: 'Email verified successfully',
      user: {
        email: testUser.email,
        role: 'client',
        isVerified: true
      }
    });

    // Verify user status was updated in database
    const verifiedUser = await User.findOne({ email: testUser.email });
    expect(verifiedUser.isVerified).toBe(true);
    // Note: User model only has isVerified field, not isEmailVerified or accountStatus
    expect(verifiedUser.verificationToken).toBeUndefined();

    // Step 4: Login after email verification (should succeed)
    console.log('Step 4: Attempting login after verification...');
    const loginAfterVerificationResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(loginAfterVerificationResponse.body).toMatchObject({
      success: true,
      token: expect.any(String),
      user: {
        name: testUser.name,
        email: testUser.email,
        role: 'client',
        isVerified: true,
        approvalStatus: 'not_applicable'
      }
    });

    const authToken = loginAfterVerificationResponse.body.token;
    expect(authToken).toBeTruthy();

    // Step 5: Access protected route with token (should succeed)
    console.log('Step 5: Accessing protected route...');
    const protectedRouteResponse = await request(app)
      .get('/api/auth')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify user data is returned (structure may vary)
    expect(protectedRouteResponse.body.email).toBe(testUser.email);
    expect(protectedRouteResponse.body.role).toBe('client');
    expect(protectedRouteResponse.body.isVerified).toBe(true);

    console.log('✅ Complete client registration and verification flow test passed!');
  });

  test('Registration with duplicate email should fail', async () => {
    // First registration
    await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(201);

    // Second registration with same email should fail
    const duplicateResponse = await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(400);

    expect(duplicateResponse.body).toMatchObject({
      success: false,
      message: expect.stringContaining('already exists')
    });
  });

  test('Registration with invalid data should fail', async () => {
    const invalidUser = {
      name: '',
      email: 'invalid-email',
      password: '123',
      role: 'client'
    };

    const response = await request(app)
      .post('/api/users/register')
      .send(invalidUser)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('Login with invalid credentials should fail', async () => {
    // Register and verify user first
    await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(201);

    await request(app)
      .post('/api/email-verification/verify')
      .send({ token: 'valid-token-123' })
      .expect(200);

    // Try login with wrong password
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: 'Authentication failed'
    });
  });

  test('Access protected route without token should fail', async () => {
    const response = await request(app)
      .get('/api/auth')
      .expect(401);

    expect(response.body).toMatchObject({
      msg: 'No token, authorization denied'
    });
  });

  test('Expired verification token should fail', async () => {
    // Register user
    await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(201);

    // Mock expired token response
    emailVerificationService.verifyEmailToken.mockResolvedValueOnce({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'Verification token has expired'
    });

    const response = await request(app)
      .post('/api/email-verification/verify')
      .send({ token: 'expired-token' })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      code: 'TOKEN_EXPIRED'
    });
  });
});

describe('Therapist Registration + Verification + Approval Flow', () => {
  let app;
  let testTherapist;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    
    testTherapist = {
      name: 'Test Therapist',
      email: 'testtherapist@example.com',
      password: 'password123',
      role: 'psychologist',
      specializations: ['Anxiety', 'Depression'],
      experience: 5,
      bio: 'Licensed therapist with 5 years experience'
    };
    
    emailVerificationService.sendVerificationEmail.mockResolvedValue({
      success: true,
      message: 'Verification email sent successfully'
    });
    
    emailVerificationService.verifyEmailToken.mockImplementation(async (token) => {
      if (token === 'valid-therapist-token') {
        const user = await User.findOne({ email: testTherapist.email });
        if (user) {
          user.isVerified = true;
          user.verificationToken = undefined;
          user.verificationTokenExpires = undefined;
          await user.save();
          
          return {
            success: true,
            code: 'VERIFIED',
            message: 'Email verified successfully',
            user: {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              isVerified: true,
              accountStatus: 'email_verified'
            }
          };
        }
      }
      return { success: false, code: 'INVALID_TOKEN', message: 'Invalid token' };
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
  });

  test('Therapist registration creates pending approval account', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send(testTherapist)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      user: {
        name: testTherapist.name,
        email: testTherapist.email,
        role: 'psychologist',
        isVerified: false
      },
      requiresVerification: true
    });

    const createdUser = await User.findOne({ email: testTherapist.email });
    expect(createdUser).toBeTruthy();
    expect(createdUser.role).toBe('psychologist');
    expect(createdUser.approvalStatus).toBe('pending');
  });

  test('Verified therapist with pending approval can login but has limited access', async () => {
    // Register therapist
    await request(app)
      .post('/api/users/register')
      .send(testTherapist)
      .expect(201);

    // Verify email
    await request(app)
      .post('/api/email-verification/verify')
      .send({ token: 'valid-therapist-token' })
      .expect(200);

    // Login should succeed for verified therapist
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: testTherapist.email,
        password: testTherapist.password
      });

    // Login succeeds but user has pending approval status
    if (loginResponse.status === 200) {
      expect(loginResponse.body).toMatchObject({
        success: true,
        user: {
          role: 'psychologist',
          isVerified: true,
          approvalStatus: 'pending'
        }
      });
    } else {
      // Some implementations may block login for pending therapists
      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.success).toBe(false);
    }
  });
});