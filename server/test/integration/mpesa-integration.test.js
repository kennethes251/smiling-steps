const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Session = require('../../models/Session');

// Mock all external dependencies
jest.mock('../../config/mpesa', () => ({
  formatPhoneNumber: jest.fn(),
  stkPush: jest.fn(),
  stkQuery: jest.fn(),
  getAccessToken: jest.fn()
}));

jest.mock('../../utils/mpesaErrorMapper', () => ({
  formatErrorResponse: jest.fn((error) => ({ msg: error.userMessage || 'Error' })),
  logPaymentError: jest.fn(),
  mapResultCode: jest.fn(() => ({ type: 'user_error', userMessage: 'Payment failed' })),
  getCallbackMessage: jest.fn((code) => code === 0 ? 'Success' : 'Failed')
}));

jest.mock('../../utils/mpesaRetryHandler', () => ({
  scheduleCallbackRetry: jest.fn(),
  clearCallbackRetry: jest.fn()
}));

jest.mock('../../utils/mpesaTransactionHandler', () => ({
  initiatePaymentWithTransaction: jest.fn(async (session, data, callback) => {
    const result = await callback();
    session.paymentStatus = 'Processing';
    session.mpesaCheckoutRequestID = result.CheckoutRequestID;
    session.mpesaMerchantRequestID = result.MerchantRequestID;
    session.paymentInitiatedAt = new Date();
    await session.save();
    return result;
  }),
  processCallbackWithTransaction: jest.fn(async (session, data) => {
    if (data.ResultCode === 0) {
      session.paymentStatus = 'Paid';
      session.status = 'Confirmed';
      session.mpesaTransactionID = data.metadata?.MpesaReceiptNumber;
      session.mpesaAmount = data.metadata?.Amount;
      session.mpesaPhoneNumber = data.metadata?.PhoneNumber;
      session.paymentVerifiedAt = new Date();
    } else {
      session.paymentStatus = 'Failed';
    }
    session.mpesaResultCode = data.ResultCode;
    session.mpesaResultDesc = data.ResultDesc;
    await session.save();
  }),
  updateStatusWithTransaction: jest.fn(async (session, updates) => {
    Object.assign(session, updates);
    await session.save();
  })
}));

jest.mock('../../utils/webhookSignature', () => ({
  verifyRequest: jest.fn(() => true)
}));

jest.mock('../../utils/encryption', () => ({
  maskPhoneNumber: jest.fn((phone) => `***${phone?.slice(-4) || '****'}`)
}));

jest.mock('../../utils/auditLogger', () => ({
  logPaymentInitiation: jest.fn(),
  logPaymentCallback: jest.fn(),
  logPaymentStatusChange: jest.fn(),
  logPaymentQuery: jest.fn(),
  logPaymentFailure: jest.fn(),
  logAdminAccess: jest.fn()
}));

jest.mock('../../services/realTimeReconciliation', () => ({
  onPaymentInitiation: jest.fn(),
  onPaymentCallback: jest.fn(),
  onStatusQuery: jest.fn()
}));

jest.mock('../../services/fraudDetectionService', () => ({
  analyzeTransaction: jest.fn(async () => ({
    decision: 'ALLOW',
    riskScore: 25,
    reasons: [],
    processingTime: 150
  }))
}));

jest.mock('../../utils/automaticIssueResolver', () => ({
  resolveIssue: jest.fn(),
  ResolvableIssueTypes: {
    FAILED_CALLBACK_RETRY: 'failed_callback_retry',
    STATUS_VERIFICATION: 'status_verification'
  }
}));

jest.mock('../../utils/notificationService', () => ({
  sendPaymentConfirmationNotification: jest.fn(),
  sendTherapistPaymentNotification: jest.fn(),
  sendPaymentFailureNotification: jest.fn()
}));

// Set test timeout
jest.setTimeout(15000);

// Create minimal app instance for testing
const express = require('express');
const mpesaRoutes = require('../../routes/mpesa');

const app = express();
app.use(express.json());
app.use('/api/mpesa', mpesaRoutes);

describe('M-Pesa Payment Integration Tests', () => {
  let mongoServer;
  let clientUser, psychologistUser, adminUser;
  let clientToken, psychologistToken, adminToken;
  let testSession;

  beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }, 30000);

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Session.deleteMany({});
    
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create test users
    clientUser = await User.create({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'TestPass123!',
      role: 'client'
    });

    psychologistUser = await User.create({
      name: 'Dr. Test Psychologist',
      email: 'psychologist@test.com',
      password: 'TestPass123!',
      role: 'psychologist'
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'TestPass123!',
      role: 'admin'
    });

    // Generate JWT tokens
    clientToken = jwt.sign(
      { user: { id: clientUser._id, role: 'client' } },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    psychologistToken = jwt.sign(
      { user: { id: psychologistUser._id, role: 'psychologist' } },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { user: { id: adminUser._id, role: 'admin' } },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // Create test session
    testSession = await Session.create({
      client: clientUser._id,
      psychologist: psychologistUser._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'Approved',
      price: 2500,
      paymentStatus: 'Pending'
    });

  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Session.deleteMany({});
  });

  afterAll(async () => {
    try {
      // Clean up database and close connections
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Clear all timers and intervals
    jest.clearAllTimers();
    jest.useRealTimers();
  }, 30000);

  describe('Complete Payment Flow End-to-End', () => {
    it('should complete successful payment flow from initiation to confirmation', async () => {
      const mpesaAPI = require('../../config/mpesa');
      
      // Mock successful M-Pesa responses
      mpesaAPI.formatPhoneNumber.mockReturnValue('254712345678');
      mpesaAPI.stkPush.mockResolvedValue({
        success: true,
        CheckoutRequestID: 'ws_CO_123456789',
        MerchantRequestID: 'mr_123456789',
        ResponseDescription: 'Success. Request accepted for processing',
        CustomerMessage: 'Success. Request accepted for processing'
      });

      // Step 1: Initiate payment
      const initiateResponse = await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(initiateResponse.status).toBe(200);
      expect(initiateResponse.body).toMatchObject({
        success: true,
        msg: expect.stringContaining('Payment prompt sent'),
        checkoutRequestID: 'ws_CO_123456789',
        merchantRequestID: 'mr_123456789',
        amount: 2500
      });

      // Verify session was updated
      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession.paymentStatus).toBe('Processing');
      expect(updatedSession.mpesaCheckoutRequestID).toBe('ws_CO_123456789');
      expect(updatedSession.mpesaMerchantRequestID).toBe('mr_123456789');
      expect(updatedSession.paymentInitiatedAt).toBeDefined();

      // Step 2: Simulate M-Pesa callback (successful payment)
      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 2500 },
                { Name: 'MpesaReceiptNumber', Value: 'QHX123ABC' },
                { Name: 'TransactionDate', Value: 20241214120000 },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };

      const callbackResponse = await request(app)
        .post('/api/mpesa/callback')
        .send(callbackPayload);

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body).toMatchObject({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });

      // Step 3: Verify final session state
      const finalSession = await Session.findById(testSession._id);
      expect(finalSession.paymentStatus).toBe('Paid');
      expect(finalSession.status).toBe('Confirmed');
      expect(finalSession.mpesaTransactionID).toBe('QHX123ABC');
      expect(finalSession.mpesaResultCode).toBe(0);
      expect(finalSession.paymentVerifiedAt).toBeDefined();

      // Step 4: Check payment status endpoint
      const statusResponse = await request(app)
        .get(`/api/mpesa/status/${testSession._id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toMatchObject({
        paymentStatus: 'Paid',
        paymentMethod: 'mpesa',
        amount: 2500,
        mpesaTransactionID: 'QHX123ABC',
        sessionStatus: 'Confirmed'
      });
    });

    it('should handle payment cancellation flow correctly', async () => {
      // Mock M-Pesa responses
      mpesaAPI.formatPhoneNumber.mockReturnValue('254712345678');
      mpesaAPI.stkPush.mockResolvedValue({
        success: true,
        CheckoutRequestID: 'ws_CO_cancelled',
        MerchantRequestID: 'mr_cancelled'
      });

      // Initiate payment
      await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      // Simulate cancelled payment callback
      const cancelledCallback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_cancelled',
            CheckoutRequestID: 'ws_CO_cancelled',
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user'
          }
        }
      };

      await request(app)
        .post('/api/mpesa/callback')
        .send(cancelledCallback);

      // Verify session state after cancellation
      const session = await Session.findById(testSession._id);
      expect(session.paymentStatus).toBe('Failed');
      expect(session.status).toBe('Approved'); // Should remain approved for retry
      expect(session.mpesaResultCode).toBe(1032);
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle M-Pesa API errors gracefully', async () => {
      // Mock API error
      mpesaAPI.formatPhoneNumber.mockReturnValue('254712345678');
      mpesaAPI.stkPush.mockRejectedValue(new Error('M-Pesa API unavailable'));

      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        msg: expect.stringContaining('Failed to initiate payment')
      });

      // Verify session wasn't corrupted
      const session = await Session.findById(testSession._id);
      expect(session.paymentStatus).toBe('Pending');
      expect(session.mpesaCheckoutRequestID).toBeUndefined();
    });

    it('should prevent duplicate payment initiation', async () => {
      // Set session to processing state
      await Session.findByIdAndUpdate(testSession._id, {
        paymentStatus: 'Processing',
        mpesaCheckoutRequestID: 'existing_checkout_id'
      });

      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('Payment already in progress');
    });

    it('should prevent payment for already paid sessions', async () => {
      // Set session to paid state
      await Session.findByIdAndUpdate(testSession._id, {
        paymentStatus: 'Paid',
        mpesaTransactionID: 'existing_transaction'
      });

      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('Session already paid');
    });

    it('should handle invalid phone number formats', async () => {
      const invalidPhoneNumbers = [
        '123456789',      // Too short
        '07123456789',    // Too long
        '0812345678',     // Wrong prefix
        'invalid',        // Non-numeric
        ''                // Empty
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        const response = await request(app)
          .post('/api/mpesa/initiate')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            sessionId: testSession._id,
            phoneNumber
          });

        expect(response.status).toBe(400);
        expect(response.body.msg).toContain('Invalid phone number');
      }
    });

    it('should handle status query for unclear payments', async () => {
      // Set up processing session with old timestamp
      const oldTimestamp = new Date(Date.now() - 60000); // 1 minute ago
      await Session.findByIdAndUpdate(testSession._id, {
        paymentStatus: 'Processing',
        mpesaCheckoutRequestID: 'ws_CO_unclear',
        paymentInitiatedAt: oldTimestamp
      });

      // Mock status query response
      mpesaAPI.stkQuery.mockResolvedValue({
        ResultCode: '0',
        ResultDesc: 'The service request is processed successfully.'
      });

      const response = await request(app)
        .get(`/api/mpesa/status/${testSession._id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statusUpdated).toBe(true);

      // Verify M-Pesa query was called
      expect(mpesaAPI.stkQuery).toHaveBeenCalledWith('ws_CO_unclear');
    });
  });

  describe('Concurrent Payment Processing', () => {
    it('should handle multiple concurrent payment initiations safely', async () => {
      // Mock successful responses
      mpesaAPI.formatPhoneNumber.mockReturnValue('254712345678');
      mpesaAPI.stkPush.mockResolvedValue({
        success: true,
        CheckoutRequestID: 'ws_CO_concurrent',
        MerchantRequestID: 'mr_concurrent'
      });

      // Create multiple sessions for concurrent testing
      const sessions = await Promise.all([
        Session.create({
          client: clientUser._id,
          psychologist: psychologistUser._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'Approved',
          price: 2500,
          paymentStatus: 'Pending'
        }),
        Session.create({
          client: clientUser._id,
          psychologist: psychologistUser._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
          status: 'Approved',
          price: 3000,
          paymentStatus: 'Pending'
        }),
        Session.create({
          client: clientUser._id,
          psychologist: psychologistUser._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + 26 * 60 * 60 * 1000),
          status: 'Approved',
          price: 3500,
          paymentStatus: 'Pending'
        })
      ]);

      // Initiate concurrent payments
      const paymentPromises = sessions.map(session =>
        request(app)
          .post('/api/mpesa/initiate')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            sessionId: session._id,
            phoneNumber: '0712345678'
          })
      );

      const responses = await Promise.all(paymentPromises);

      // All should succeed independently
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all sessions were updated correctly
      const updatedSessions = await Session.find({ _id: { $in: sessions.map(s => s._id) } });
      updatedSessions.forEach(session => {
        expect(session.paymentStatus).toBe('Processing');
        expect(session.mpesaCheckoutRequestID).toBeDefined();
      });
    });

    it('should handle concurrent callbacks for different sessions', async () => {
      // Create multiple processing sessions
      const sessions = await Promise.all([
        Session.create({
          client: clientUser._id,
          psychologist: psychologistUser._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'Approved',
          price: 2500,
          paymentStatus: 'Processing',
          mpesaCheckoutRequestID: 'ws_CO_callback1'
        }),
        Session.create({
          client: clientUser._id,
          psychologist: psychologistUser._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
          status: 'Approved',
          price: 3000,
          paymentStatus: 'Processing',
          mpesaCheckoutRequestID: 'ws_CO_callback2'
        })
      ]);

      // Create concurrent callback payloads
      const callbackPromises = sessions.map((session, index) =>
        request(app)
          .post('/api/mpesa/callback')
          .send({
            Body: {
              stkCallback: {
                MerchantRequestID: `mr_callback${index + 1}`,
                CheckoutRequestID: session.mpesaCheckoutRequestID,
                ResultCode: 0,
                ResultDesc: 'The service request is processed successfully.',
                CallbackMetadata: {
                  Item: [
                    { Name: 'Amount', Value: session.price },
                    { Name: 'MpesaReceiptNumber', Value: `QHX${index + 1}23ABC` },
                    { Name: 'TransactionDate', Value: 20241214120000 },
                    { Name: 'PhoneNumber', Value: 254712345678 }
                  ]
                }
              }
            }
          })
      );

      const callbackResponses = await Promise.all(callbackPromises);

      // All callbacks should be processed successfully
      callbackResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ResultCode).toBe(0);
      });

      // Verify all sessions were updated correctly
      const finalSessions = await Session.find({ _id: { $in: sessions.map(s => s._id) } });
      finalSessions.forEach((session, index) => {
        expect(session.paymentStatus).toBe('Paid');
        expect(session.status).toBe('Confirmed');
        expect(session.mpesaTransactionID).toBe(`QHX${index + 1}23ABC`);
      });
    });
  });

  describe('Webhook Callback Handling', () => {
    beforeEach(async () => {
      // Set up session in processing state
      await Session.findByIdAndUpdate(testSession._id, {
        paymentStatus: 'Processing',
        mpesaCheckoutRequestID: 'ws_CO_callback_test',
        mpesaMerchantRequestID: 'mr_callback_test'
      });
    });

    it('should process successful payment callback correctly', async () => {
      const successCallback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_callback_test',
            CheckoutRequestID: 'ws_CO_callback_test',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 2500 },
                { Name: 'MpesaReceiptNumber', Value: 'QHX789XYZ' },
                { Name: 'TransactionDate', Value: 20241214120000 },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/mpesa/callback')
        .send(successCallback);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });

      // Verify session was updated
      const session = await Session.findById(testSession._id);
      expect(session.paymentStatus).toBe('Paid');
      expect(session.status).toBe('Confirmed');
      expect(session.mpesaTransactionID).toBe('QHX789XYZ');
      expect(session.mpesaAmount).toBe(2500);
      expect(session.mpesaPhoneNumber).toBe('254712345678');
      expect(session.paymentVerifiedAt).toBeDefined();
    });

    it('should handle failed payment callback correctly', async () => {
      const failedCallback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_callback_test',
            CheckoutRequestID: 'ws_CO_callback_test',
            ResultCode: 1,
            ResultDesc: 'Insufficient funds in account'
          }
        }
      };

      const response = await request(app)
        .post('/api/mpesa/callback')
        .send(failedCallback);

      expect(response.status).toBe(200);

      // Verify session was updated for failure
      const session = await Session.findById(testSession._id);
      expect(session.paymentStatus).toBe('Failed');
      expect(session.status).toBe('Approved'); // Should remain approved for retry
      expect(session.mpesaResultCode).toBe(1);
      expect(session.mpesaResultDesc).toContain('Insufficient funds');
    });

    it('should handle malformed callback payloads gracefully', async () => {
      const malformedCallbacks = [
        {}, // Empty payload
        { Body: {} }, // Missing stkCallback
        { Body: { stkCallback: {} } }, // Missing required fields
        { Body: { stkCallback: { CheckoutRequestID: null } } }, // Null CheckoutRequestID
        null // Null payload
      ];

      for (const payload of malformedCallbacks) {
        const response = await request(app)
          .post('/api/mpesa/callback')
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.ResultCode).toBe(1);
      }
    });

    it('should ignore duplicate callbacks', async () => {
      // First callback - should process
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_callback_test',
            CheckoutRequestID: 'ws_CO_callback_test',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 2500 },
                { Name: 'MpesaReceiptNumber', Value: 'QHX999DUP' },
                { Name: 'TransactionDate', Value: 20241214120000 },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };

      // Process first callback
      const firstResponse = await request(app)
        .post('/api/mpesa/callback')
        .send(callback);

      expect(firstResponse.status).toBe(200);

      // Verify session is paid
      let session = await Session.findById(testSession._id);
      expect(session.paymentStatus).toBe('Paid');

      // Process duplicate callback
      const duplicateResponse = await request(app)
        .post('/api/mpesa/callback')
        .send(callback);

      expect(duplicateResponse.status).toBe(200);

      // Verify session state unchanged
      session = await Session.findById(testSession._id);
      expect(session.paymentStatus).toBe('Paid');
      expect(session.mpesaTransactionID).toBe('QHX999DUP');
    });

    it('should handle callback for non-existent session gracefully', async () => {
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_nonexistent',
            CheckoutRequestID: 'ws_CO_nonexistent',
            ResultCode: 0,
            ResultDesc: 'Success'
          }
        }
      };

      const response = await request(app)
        .post('/api/mpesa/callback')
        .send(callback);

      // Should still acknowledge to prevent M-Pesa retries
      expect(response.status).toBe(200);
      expect(response.body.ResultCode).toBe(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for payment initiation', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(response.status).toBe(401);
    });

    it('should prevent unauthorized users from initiating payment', async () => {
      // Try to pay for session with psychologist token (not the client)
      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${psychologistToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(response.status).toBe(403);
      expect(response.body.msg).toContain('Not authorized');
    });

    it('should allow both client and psychologist to check payment status', async () => {
      // Client should be able to check
      const clientResponse = await request(app)
        .get(`/api/mpesa/status/${testSession._id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(clientResponse.status).toBe(200);

      // Psychologist should also be able to check
      const psychologistResponse = await request(app)
        .get(`/api/mpesa/status/${testSession._id}`)
        .set('Authorization', `Bearer ${psychologistToken}`);

      expect(psychologistResponse.status).toBe(200);
    });

    it('should require admin role for connection testing', async () => {
      // Mock successful connection test
      mpesaAPI.getAccessToken.mockResolvedValue('mock_token_12345');

      // Admin should succeed
      const adminResponse = await request(app)
        .post('/api/mpesa/test-connection')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.success).toBe(true);

      // Client should be denied
      const clientResponse = await request(app)
        .post('/api/mpesa/test-connection')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(clientResponse.status).toBe(403);
      expect(clientResponse.body.msg).toContain('Admin access required');
    });
  });

  describe('Session Status Validation', () => {
    it('should prevent payment for non-approved sessions', async () => {
      const statuses = ['Pending', 'Pending Approval', 'Declined', 'Cancelled'];

      for (const status of statuses) {
        await Session.findByIdAndUpdate(testSession._id, { status });

        const response = await request(app)
          .post('/api/mpesa/initiate')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            sessionId: testSession._id,
            phoneNumber: '0712345678'
          });

        expect(response.status).toBe(400);
        expect(response.body.msg).toContain('must be approved');
      }
    });

    it('should allow payment only for approved sessions', async () => {
      // Mock successful M-Pesa response
      mpesaAPI.formatPhoneNumber.mockReturnValue('254712345678');
      mpesaAPI.stkPush.mockResolvedValue({
        success: true,
        CheckoutRequestID: 'ws_CO_approved',
        MerchantRequestID: 'mr_approved'
      });

      await Session.findByIdAndUpdate(testSession._id, { status: 'Approved' });

      const response = await request(app)
        .post('/api/mpesa/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          sessionId: testSession._id,
          phoneNumber: '0712345678'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});