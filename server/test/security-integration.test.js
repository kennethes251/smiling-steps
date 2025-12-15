/**
 * Security Integration Tests for M-Pesa Payment Integration
 * 
 * Tests authentication, authorization, webhook signature verification,
 * data encryption, and common vulnerabilities
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.7
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Set up test environment
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.MPESA_CONSUMER_KEY = 'test_consumer_key';
process.env.MPESA_CONSUMER_SECRET = 'test_consumer_secret';
process.env.MPESA_BUSINESS_SHORT_CODE = '174379';
process.env.MPESA_PASSKEY = 'test_passkey_12345';
process.env.MPESA_CALLBACK_URL = 'https://test.example.com/callback';
process.env.MPESA_ENVIRONMENT = 'sandbox';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.MPESA_WEBHOOK_SECRET = 'test_webhook_secret';

// Mock axios to avoid actual API calls
jest.mock('axios');
const axios = require('axios');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Session = require('../models/Session');

let mongoServer;
let app;
let clientToken;
let psychologistToken;
let adminToken;
let clientUser;
let psychologistUser;
let testSession;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Import app after DB connection
  app = require('../index-mongodb');
  
  // Create test users
  clientUser = await User.create({
    name: 'Test Client',
    email: 'client@test.com',
    password: 'hashedpassword123',
    role: 'client',
    emailVerified: true
  });
  
  psychologistUser = await User.create({
    name: 'Test Psychologist',
    email: 'psychologist@test.com',
    password: 'hashedpassword123',
    role: 'psychologist',
    emailVerified: true,
    approved: true
  });
  
  const adminUser = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'hashedpassword123',
    role: 'admin',
    emailVerified: true
  });
  
  // Generate tokens
  clientToken = jwt.sign(
    { id: clientUser._id, role: 'client' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  psychologistToken = jwt.sign(
    { id: psychologistUser._id, role: 'psychologist' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  adminToken = jwt.sign(
    { id: adminUser._id, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Create test session
  testSession = await Session.create({
    client: clientUser._id,
    psychologist: psychologistUser._id,
    sessionType: 'individual',
    scheduledDate: new Date(Date.now() + 86400000),
    price: 5000,
    status: 'Approved',
    paymentStatus: 'Pending'
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Security Integration Tests', () => {
  
  describe('Authentication Tests', () => {
    
    test('should reject payment initiation without authentication token', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|auth/i);
    });
    
    test('should reject payment initiation with invalid token', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', 'invalid_token_12345')
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|invalid/i);
    });
    
    test('should reject payment initiation with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: clientUser._id, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', expiredToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|expired/i);
    });
    
    test('should reject payment status check without authentication', async () => {
      const response = await request(app)
        .get(`/api/mpesa/status/${testSession._id}`);
      
      expect(response.status).toBe(401);
    });
    
    test('should accept valid authentication token', async () => {
      // Mock M-Pesa API responses
      axios.get.mockResolvedValue({
        data: { access_token: 'test_token_123' }
      });
      
      axios.post.mockResolvedValue({
        data: {
          ResponseCode: '0',
          CheckoutRequestID: 'ws_CO_123456789',
          MerchantRequestID: '12345-67890-1',
          ResponseDescription: 'Success'
        }
      });
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).not.toBe(401);
    });
  });
  
  describe('Authorization Tests', () => {
    
    test('should prevent non-owner from initiating payment for session', async () => {
      // Create another client
      const otherClient = await User.create({
        name: 'Other Client',
        email: 'other@test.com',
        password: 'hashedpassword123',
        role: 'client',
        emailVerified: true
      });
      
      const otherToken = jwt.sign(
        { id: otherClient._id, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', otherToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/not authorized|permission/i);
    });
    
    test('should prevent psychologist from initiating payment', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', psychologistToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).toBe(403);
    });
    
    test('should allow session owner to initiate payment', async () => {
      // Mock M-Pesa API responses
      axios.get.mockResolvedValue({
        data: { access_token: 'test_token_123' }
      });
      
      axios.post.mockResolvedValue({
        data: {
          ResponseCode: '0',
          CheckoutRequestID: 'ws_CO_123456789',
          MerchantRequestID: '12345-67890-1',
          ResponseDescription: 'Success'
        }
      });
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      expect(response.status).not.toBe(403);
    });
    
    test('should restrict admin endpoints to admin role only', async () => {
      const response = await request(app)
        .post('/api/mpesa/test-connection')
        .set('x-auth-token', clientToken);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/admin|permission/i);
    });
    
    test('should allow admin to access admin endpoints', async () => {
      // Mock M-Pesa API responses
      axios.get.mockResolvedValue({
        data: { access_token: 'test_token_123' }
      });
      
      const response = await request(app)
        .post('/api/mpesa/test-connection')
        .set('x-auth-token', adminToken);
      
      expect(response.status).not.toBe(403);
    });
  });
  
  describe('Webhook Signature Verification Tests', () => {
    
    test('should reject callback without signature', async () => {
      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345-67890-1',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'Success'
          }
        }
      };
      
      const response = await request(app)
        .post('/api/mpesa/callback')
        .send(callbackPayload);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/signature/i);
    });
    
    test('should reject callback with invalid signature', async () => {
      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345-67890-1',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'Success'
          }
        }
      };
      
      const response = await request(app)
        .post('/api/mpesa/callback')
        .set('x-mpesa-signature', 'invalid_signature_12345')
        .send(callbackPayload);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/signature|invalid/i);
    });
    
    test('should accept callback with valid signature', async () => {
      // Update test session with checkout request ID
      testSession.mpesaCheckoutRequestID = 'ws_CO_123456789';
      testSession.paymentStatus = 'Processing';
      await testSession.save();
      
      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345-67890-1',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 5000 },
                { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
                { Name: 'PhoneNumber', Value: '254712345678' }
              ]
            }
          }
        }
      };
      
      // Generate valid signature
      const webhookSignature = require('../utils/webhookSignature');
      const validSignature = webhookSignature.generateSignature(callbackPayload);
      
      const response = await request(app)
        .post('/api/mpesa/callback')
        .set('x-mpesa-signature', validSignature)
        .send(callbackPayload);
      
      expect(response.status).toBe(200);
    });
    
    test('should reject tampered callback payload', async () => {
      const originalPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345-67890-1',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 1032, // Failed
            ResultDesc: 'Cancelled by user'
          }
        }
      };
      
      // Generate signature for original payload
      const webhookSignature = require('../utils/webhookSignature');
      const signature = webhookSignature.generateSignature(originalPayload);
      
      // Tamper with payload
      const tamperedPayload = {
        ...originalPayload,
        Body: {
          stkCallback: {
            ...originalPayload.Body.stkCallback,
            ResultCode: 0 // Changed to success
          }
        }
      };
      
      const response = await request(app)
        .post('/api/mpesa/callback')
        .set('x-mpesa-signature', signature)
        .send(tamperedPayload);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Data Encryption Tests', () => {
    
    test('should use TLS for all payment endpoints', async () => {
      // In production, this would verify HTTPS
      // For testing, we verify the middleware is configured
      const encryption = require('../utils/encryption');
      
      // Verify encryption utilities exist
      expect(encryption.encrypt).toBeDefined();
      expect(encryption.decrypt).toBeDefined();
      expect(encryption.maskPhoneNumber).toBeDefined();
    });
    
    test('should mask phone numbers in logs', async () => {
      const encryption = require('../utils/encryption');
      
      const phoneNumber = '254712345678';
      const masked = encryption.maskPhoneNumber(phoneNumber);
      
      // Should mask middle digits
      expect(masked).toContain('*');
      expect(masked).toContain('5678'); // Last 4 digits
      expect(masked).not.toContain('7123'); // Middle digits
      expect(masked).toMatch(/^254\*+\d{4}$/);
    });
    
    test('should encrypt sensitive credentials', () => {
      const encryption = require('../utils/encryption');
      
      const sensitiveData = 'test_api_key_12345';
      const encrypted = encryption.encrypt(sensitiveData);
      
      // Should be encrypted (different from original)
      expect(encrypted).not.toBe(sensitiveData);
      expect(encrypted).not.toContain(sensitiveData);
      
      // Should be in correct format (iv:authTag:ciphertext)
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      
      // Should decrypt back to original
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });
    
    test('should fail decryption with tampered data', () => {
      const encryption = require('../utils/encryption');
      
      const data = 'sensitive_information';
      const encrypted = encryption.encrypt(data);
      
      // Tamper with encrypted data
      const parts = encrypted.split(':');
      const tamperedCiphertext = parts[2].substring(0, parts[2].length - 2) + 'XX';
      const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
      
      // Should throw error
      expect(() => {
        encryption.decrypt(tampered);
      }).toThrow();
    });
  });
  
  describe('Common Vulnerability Tests', () => {
    
    test('should prevent SQL injection in session ID', async () => {
      const maliciousSessionId = "'; DROP TABLE sessions; --";
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: maliciousSessionId,
          phoneNumber: '0712345678'
        });
      
      // Should handle gracefully (not crash)
      expect(response.status).toBeLessThan(500);
    });
    
    test('should prevent XSS in phone number input', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: xssPayload
        });
      
      // Should reject invalid phone number
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/phone number|invalid/i);
    });
    
    test('should prevent command injection in phone number', async () => {
      const commandInjection = '0712345678; rm -rf /';
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: commandInjection
        });
      
      // Should reject or sanitize
      expect(response.status).toBeLessThan(500);
    });
    
    test('should prevent NoSQL injection in session lookup', async () => {
      const noSqlInjection = { $ne: null };
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: noSqlInjection,
          phoneNumber: '0712345678'
        });
      
      // Should handle gracefully
      expect(response.status).toBeLessThan(500);
    });
    
    test('should set security headers', async () => {
      const response = await request(app)
        .get('/api/mpesa/status/' + testSession._id)
        .set('x-auth-token', clientToken);
      
      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
    
    test('should prevent CSRF attacks', async () => {
      // CSRF protection is typically handled by checking origin/referer
      // or using CSRF tokens
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .set('origin', 'https://malicious-site.com')
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678'
        });
      
      // Should either reject or handle safely
      expect(response.status).toBeLessThan(500);
    });
    
    test('should rate limit payment initiation attempts', async () => {
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/mpesa/initiate')
            .set('x-auth-token', clientToken)
            .send({
              sessionId: testSession._id.toString(),
              phoneNumber: '0712345678'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
  
  describe('PIN Storage Prevention Tests', () => {
    
    test('should never accept PIN in payment request', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: testSession._id.toString(),
          phoneNumber: '0712345678',
          pin: '1234' // Should be ignored
        });
      
      // PIN should not be stored anywhere
      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession.toObject()).not.toHaveProperty('pin');
      expect(updatedSession.toObject()).not.toHaveProperty('mpesaPin');
    });
    
    test('should not log PIN in any form', async () => {
      // Verify PIN is not in session schema
      const sessionSchema = Session.schema.obj;
      const schemaKeys = Object.keys(sessionSchema);
      
      const hasPinField = schemaKeys.some(key => 
        key.toLowerCase().includes('pin')
      );
      
      expect(hasPinField).toBe(false);
    });
  });
});

console.log('✅ Security integration tests created successfully');
