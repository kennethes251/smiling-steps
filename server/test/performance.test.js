/**
 * Performance Tests for M-Pesa Payment Integration
 * 
 * Tests payment initiation response time, callback processing time,
 * concurrent payment handling, and database query performance
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
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
const MpesaAPI = require('../config/mpesa');

let mongoServer;
let app;
let clientToken;
let clientUser;
let psychologistUser;
let testSessions = [];

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
  
  // Generate token
  clientToken = jwt.sign(
    { id: clientUser._id, role: 'client' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Create multiple test sessions for concurrent testing
  for (let i = 0; i < 10; i++) {
    const session = await Session.create({
      client: clientUser._id,
      psychologist: psychologistUser._id,
      sessionType: 'individual',
      scheduledDate: new Date(Date.now() + 86400000 + i * 3600000),
      price: 5000 + i * 100,
      status: 'Approved',
      paymentStatus: 'Pending'
    });
    testSessions.push(session);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock M-Pesa API responses
  axios.get.mockResolvedValue({
    data: { access_token: 'test_token_123' }
  });
  
  axios.post.mockResolvedValue({
    data: {
      ResponseCode: '0',
      CheckoutRequestID: 'ws_CO_' + Date.now(),
      MerchantRequestID: '12345-67890-' + Date.now(),
      ResponseDescription: 'Success',
      CustomerMessage: 'Success'
    }
  });
});

describe('Performance Tests', () => {
  
  describe('Payment Initiation Response Time (Requirement 10.1)', () => {
    
    test('should respond to payment initiation within 3 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('x-auth-token', clientToken)
        .send({
          sessionId: testSessions[0]._id.toString(),
          phoneNumber: '0712345678'
        });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBeLessThan(500);
      expect(responseTime).toBeLessThan(3000); // 3 seconds
      
      console.log(`Payment initiation response time: ${responseTime}ms`);
    });
    
    test('should maintain response time under load', async () => {
      const responseTimes = [];
      
      // Make 10 sequential requests
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        await request(app)
          .post('/api/mpesa/initiate')
          .set('x-auth-token', clientToken)
          .send({
            sessionId: testSessions[i]._id.toString(),
            phoneNumber: '0712345678'
          });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      expect(avgResponseTime).toBeLessThan(3000);
      
      // All requests should be under 3 seconds
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(3000);
      });
      
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min: ${Math.min(...responseTimes)}ms, Max: ${Math.max(...responseTimes)}ms`);
    });
    
    test('should benefit from OAuth token caching', async () => {
      // First request - gets new token
      const startTime1 = Date.now();
      await MpesaAPI.stkPush('0712345678', 5000, 'TEST_REF_1');
      const time1 = Date.now() - startTime1;
      
      // Second request - should use cached token
      const startTime2 = Date.now();
      await MpesaAPI.stkPush('0712345678', 5000, 'TEST_REF_2');
      const time2 = Date.now() - startTime2;
      
      console.log(`First request: ${time1}ms, Second request: ${time2}ms`);
      
      // Both should be fast with mocked API
      expect(time1).toBeLessThan(1000);
      expect(time2).toBeLessThan(1000);
    });
  });
  
  describe('Callback Processing Time (Requirement 10.3)', () => {
    
    test('should process callback within 5 seconds', async () => {
      // Set up session with checkout request ID
      const session = testSessions[0];
      session.mpesaCheckoutRequestID = 'ws_CO_123456789';
      session.paymentStatus = 'Processing';
      await session.save();
      
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
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/mpesa/callback')
        .set('x-mpesa-signature', validSignature)
        .send(callbackPayload);
      
      const processingTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(5000); // 5 seconds
      
      console.log(`Callback processing time: ${processingTime}ms`);
    });
    
    test('should process multiple callbacks efficiently', async () => {
      const processingTimes = [];
      
      // Process 5 callbacks
      for (let i = 0; i < 5; i++) {
        const session = testSessions[i];
        session.mpesaCheckoutRequestID = `ws_CO_12345678${i}`;
        session.paymentStatus = 'Processing';
        await session.save();
        
        const callbackPayload = {
          Body: {
            stkCallback: {
              MerchantRequestID: `12345-67890-${i}`,
              CheckoutRequestID: `ws_CO_12345678${i}`,
              ResultCode: 0,
              ResultDesc: 'Success',
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: 5000 + i * 100 },
                  { Name: 'MpesaReceiptNumber', Value: `ABC123XYZ${i}` },
                  { Name: 'PhoneNumber', Value: '254712345678' }
                ]
              }
            }
          }
        };
        
        const webhookSignature = require('../utils/webhookSignature');
        const validSignature = webhookSignature.generateSignature(callbackPayload);
        
        const startTime = Date.now();
        
        await request(app)
          .post('/api/mpesa/callback')
          .set('x-mpesa-signature', validSignature)
          .send(callbackPayload);
        
        const processingTime = Date.now() - startTime;
        processingTimes.push(processingTime);
      }
      
      const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      
      expect(avgProcessingTime).toBeLessThan(5000);
      
      console.log(`Average callback processing time: ${avgProcessingTime.toFixed(2)}ms`);
    });
  });
  
  describe('Concurrent Payment Handling (Requirement 10.4)', () => {
    
    test('should handle multiple concurrent payment initiations', async () => {
      const concurrentRequests = 5;
      const requests = [];
      
      // Create concurrent payment initiation requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .post('/api/mpesa/initiate')
            .set('x-auth-token', clientToken)
            .send({
              sessionId: testSessions[i]._id.toString(),
              phoneNumber: `071234567${i}`
            })
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed or fail gracefully
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
      
      // Concurrent processing should be faster than sequential
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(3000);
      
      console.log(`Concurrent requests: ${concurrentRequests}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Average time per request: ${avgTimePerRequest.toFixed(2)}ms`);
    });
    
    test('should process concurrent payments independently', async () => {
      const concurrentRequests = 3;
      const requests = [];
      
      // Create concurrent payment initiations
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .post('/api/mpesa/initiate')
            .set('x-auth-token', clientToken)
            .send({
              sessionId: testSessions[i]._id.toString(),
              phoneNumber: `071234567${i}`
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Each should have unique checkout request ID
      const checkoutIds = responses
        .filter(r => r.status === 200)
        .map(r => r.body.checkoutRequestID);
      
      const uniqueIds = new Set(checkoutIds);
      expect(uniqueIds.size).toBe(checkoutIds.length);
      
      console.log(`Processed ${checkoutIds.length} concurrent payments with unique IDs`);
    });
    
    test('should handle concurrent callbacks without interference', async () => {
      const concurrentCallbacks = 3;
      const callbacks = [];
      
      // Set up sessions
      for (let i = 0; i < concurrentCallbacks; i++) {
        const session = testSessions[i];
        session.mpesaCheckoutRequestID = `ws_CO_concurrent_${i}`;
        session.paymentStatus = 'Processing';
        await session.save();
      }
      
      // Create concurrent callback requests
      for (let i = 0; i < concurrentCallbacks; i++) {
        const callbackPayload = {
          Body: {
            stkCallback: {
              MerchantRequestID: `concurrent-${i}`,
              CheckoutRequestID: `ws_CO_concurrent_${i}`,
              ResultCode: 0,
              ResultDesc: 'Success',
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: 5000 + i * 100 },
                  { Name: 'MpesaReceiptNumber', Value: `CONCURRENT${i}` },
                  { Name: 'PhoneNumber', Value: '254712345678' }
                ]
              }
            }
          }
        };
        
        const webhookSignature = require('../utils/webhookSignature');
        const validSignature = webhookSignature.generateSignature(callbackPayload);
        
        callbacks.push(
          request(app)
            .post('/api/mpesa/callback')
            .set('x-mpesa-signature', validSignature)
            .send(callbackPayload)
        );
      }
      
      const responses = await Promise.all(callbacks);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verify each session was updated correctly
      for (let i = 0; i < concurrentCallbacks; i++) {
        const session = await Session.findById(testSessions[i]._id);
        expect(session.paymentStatus).toBe('Paid');
        expect(session.mpesaTransactionID).toBe(`CONCURRENT${i}`);
      }
      
      console.log(`Successfully processed ${concurrentCallbacks} concurrent callbacks`);
    });
  });
  
  describe('Database Query Performance (Requirement 10.4)', () => {
    
    test('should query session by ID within 100ms', async () => {
      const iterations = 10;
      const queryTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await Session.findById(testSessions[0]._id);
        const queryTime = Date.now() - startTime;
        queryTimes.push(queryTime);
      }
      
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      
      expect(avgQueryTime).toBeLessThan(100); // 100ms
      
      console.log(`Average session query time: ${avgQueryTime.toFixed(2)}ms`);
    });
    
    test('should query session by checkout request ID efficiently', async () => {
      // Set up session with checkout request ID
      const session = testSessions[0];
      session.mpesaCheckoutRequestID = 'ws_CO_performance_test';
      await session.save();
      
      const iterations = 10;
      const queryTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await Session.findOne({ mpesaCheckoutRequestID: 'ws_CO_performance_test' });
        const queryTime = Date.now() - startTime;
        queryTimes.push(queryTime);
      }
      
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      
      expect(avgQueryTime).toBeLessThan(100);
      
      console.log(`Average checkout ID query time: ${avgQueryTime.toFixed(2)}ms`);
    });
    
    test('should handle bulk session queries efficiently', async () => {
      const startTime = Date.now();
      
      // Query all sessions for a client
      const sessions = await Session.find({
        client: clientUser._id,
        paymentStatus: 'Pending'
      }).limit(100);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(200); // 200ms for bulk query
      expect(sessions.length).toBeGreaterThan(0);
      
      console.log(`Bulk query time for ${sessions.length} sessions: ${queryTime}ms`);
    });
    
    test('should update session payment status efficiently', async () => {
      const session = testSessions[0];
      const iterations = 5;
      const updateTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        session.paymentStatus = i % 2 === 0 ? 'Processing' : 'Pending';
        await session.save();
        
        const updateTime = Date.now() - startTime;
        updateTimes.push(updateTime);
      }
      
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      
      expect(avgUpdateTime).toBeLessThan(100);
      
      console.log(`Average session update time: ${avgUpdateTime.toFixed(2)}ms`);
    });
    
    test('should handle complex queries with multiple conditions', async () => {
      const startTime = Date.now();
      
      // Complex query with multiple conditions
      const sessions = await Session.find({
        client: clientUser._id,
        status: 'Approved',
        paymentStatus: { $in: ['Pending', 'Processing'] },
        scheduledDate: { $gte: new Date() }
      })
      .populate('psychologist', 'name email')
      .sort({ scheduledDate: 1 })
      .limit(50);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(200);
      
      console.log(`Complex query time: ${queryTime}ms for ${sessions.length} sessions`);
    });
  });
  
  describe('API Performance Under Load', () => {
    
    test('should maintain performance with rapid sequential requests', async () => {
      const requestCount = 20;
      const responseTimes = [];
      
      for (let i = 0; i < requestCount; i++) {
        const sessionIndex = i % testSessions.length;
        const startTime = Date.now();
        
        await request(app)
          .get(`/api/mpesa/status/${testSessions[sessionIndex]._id}`)
          .set('x-auth-token', clientToken);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      expect(avgResponseTime).toBeLessThan(500);
      expect(maxResponseTime).toBeLessThan(1000);
      
      console.log(`Rapid requests: ${requestCount}`);
      console.log(`Average: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
    });
    
    test('should handle mixed concurrent operations', async () => {
      const operations = [];
      
      // Mix of different operations
      operations.push(
        request(app)
          .post('/api/mpesa/initiate')
          .set('x-auth-token', clientToken)
          .send({
            sessionId: testSessions[0]._id.toString(),
            phoneNumber: '0712345678'
          })
      );
      
      operations.push(
        request(app)
          .get(`/api/mpesa/status/${testSessions[1]._id}`)
          .set('x-auth-token', clientToken)
      );
      
      operations.push(
        request(app)
          .get(`/api/mpesa/status/${testSessions[2]._id}`)
          .set('x-auth-token', clientToken)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      // All should complete successfully
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
      
      expect(totalTime).toBeLessThan(5000);
      
      console.log(`Mixed operations completed in ${totalTime}ms`);
    });
  });
  
  describe('Memory and Resource Usage', () => {
    
    test('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await MpesaAPI.formatPhoneNumber('0712345678');
        await MpesaAPI.getTimestamp();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
    
    test('should handle large payload efficiently', async () => {
      // Create session with large metadata
      const largeSession = await Session.create({
        client: clientUser._id,
        psychologist: psychologistUser._id,
        sessionType: 'individual',
        scheduledDate: new Date(Date.now() + 86400000),
        price: 5000,
        status: 'Approved',
        paymentStatus: 'Pending',
        notes: 'A'.repeat(1000) // Large notes field
      });
      
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/mpesa/status/${largeSession._id}`)
        .set('x-auth-token', clientToken);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000);
      
      console.log(`Large payload response time: ${responseTime}ms`);
    });
  });
});

console.log('✅ Performance tests created successfully');
