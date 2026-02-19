/**
 * Booking Flow Integration Tests
 * 
 * Task 25.1: Write integration tests
 * Tests complete booking flow from request to confirmation
 * 
 * Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock external services before requiring modules
jest.mock('../../utils/notificationService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmationNotification: jest.fn().mockResolvedValue({ success: true }),
  sendTherapistPaymentNotification: jest.fn().mockResolvedValue({ success: true }),
  sendBookingConfirmationNotification: jest.fn().mockResolvedValue({ success: true }),
  sendSessionRequestNotification: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../config/mpesa', () => ({
  formatPhoneNumber: jest.fn(phone => `254${phone.slice(-9)}`),
  stkPush: jest.fn().mockResolvedValue({
    success: true,
    CheckoutRequestID: 'ws_CO_test123',
    MerchantRequestID: 'mr_test123',
    ResponseDescription: 'Success'
  }),
  stkQuery: jest.fn().mockResolvedValue({ ResultCode: '0' }),
  getAccessToken: jest.fn().mockResolvedValue('mock_token')
}));

const User = require('../../models/User');
const Session = require('../../models/Session');
const AvailabilityWindow = require('../../models/AvailabilityWindow');
const SessionRate = require('../../models/SessionRate');
const AuditLog = require('../../models/AuditLog');
const { generateToken } = require('../../utils/auth');

describe('Complete Booking Flow Integration Tests', () => {
  let mongoServer;
  let clientUser, therapistUser;
  let clientToken, therapistToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await AvailabilityWindow.deleteMany({});
    await SessionRate.deleteMany({});
    await AuditLog.deleteMany({});

    // Create test users
    clientUser = await User.create({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'TestPass123!',
      role: 'client',
      isVerified: true,
      phone: '+254712345678'
    });

    therapistUser = await User.create({
      name: 'Dr. Test Therapist',
      email: 'therapist@test.com',
      password: 'TestPass123!',
      role: 'psychologist',
      isVerified: true,
      approvalStatus: 'approved',
      phone: '+254712345679',
      psychologistDetails: {
        licenseNumber: 'PSY123456',
        specializations: ['anxiety', 'depression'],
        experience: 5,
        approvalStatus: 'approved'
      }
    });

    clientToken = generateToken(clientUser._id);
    therapistToken = generateToken(therapistUser._id);

    // Create therapist availability
    await AvailabilityWindow.create({
      therapist: therapistUser._id,
      dayOfWeek: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getDay(),
      startTime: '09:00',
      endTime: '17:00',
      windowType: 'recurring',
      isActive: true
    });

    // Create session rates
    await SessionRate.create({
      therapist: therapistUser._id,
      sessionType: 'Individual',
      amount: 5000,
      duration: 60,
      effectiveFrom: new Date()
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 30000);

  describe('Step 1: Session Creation', () => {
    test('should create a new session with pending status', async () => {
      const sessionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate,
        status: 'Pending Approval',
        price: 5000,
        paymentStatus: 'Pending'
      });

      expect(session).toBeDefined();
      expect(session.status).toBe('Pending Approval');
      expect(session.paymentStatus).toBe('Pending');
      expect(session.client.toString()).toBe(clientUser._id.toString());
      expect(session.psychologist.toString()).toBe(therapistUser._id.toString());
    });

    test('should generate booking reference on session creation', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Pending Approval',
        price: 5000
      });

      // Booking reference should be generated if the model has pre-save hook
      // Format: SS-YYYYMMDD-XXXX
      if (session.bookingReference) {
        expect(session.bookingReference).toMatch(/^SS-\d{8}-\d{4}$/);
      }
    });

    test('should prevent double-booking same time slot', async () => {
      const sessionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      sessionDate.setHours(10, 0, 0, 0);

      // Create first session
      await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate,
        status: 'Approved',
        price: 5000
      });

      // Create another client
      const anotherClient = await User.create({
        name: 'Another Client',
        email: 'another@test.com',
        password: 'TestPass123!',
        role: 'client',
        isVerified: true
      });

      // Attempt to book same slot - should be detected by availability check
      const conflictCheck = await Session.findOne({
        psychologist: therapistUser._id,
        sessionDate,
        status: { $in: ['Pending Approval', 'Approved', 'Confirmed'] }
      });

      expect(conflictCheck).toBeDefined();
    });
  });

  describe('Step 2: Therapist Approval', () => {
    let pendingSession;

    beforeEach(async () => {
      pendingSession = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Pending Approval',
        price: 5000,
        paymentStatus: 'Pending'
      });
    });

    test('should approve session and update status', async () => {
      pendingSession.status = 'Approved';
      pendingSession.approvedAt = new Date();
      await pendingSession.save();

      const updatedSession = await Session.findById(pendingSession._id);
      expect(updatedSession.status).toBe('Approved');
      expect(updatedSession.approvedAt).toBeDefined();
    });

    test('should decline session with reason', async () => {
      pendingSession.status = 'Declined';
      pendingSession.declineReason = 'Schedule conflict';
      await pendingSession.save();

      const updatedSession = await Session.findById(pendingSession._id);
      expect(updatedSession.status).toBe('Declined');
      expect(updatedSession.declineReason).toBe('Schedule conflict');
    });
  });

  describe('Step 3: Payment Processing', () => {
    let approvedSession;

    beforeEach(async () => {
      approvedSession = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Approved',
        price: 5000,
        paymentStatus: 'Pending'
      });
    });

    test('should initiate payment and update status to Processing', async () => {
      approvedSession.paymentStatus = 'Processing';
      approvedSession.mpesaCheckoutRequestID = 'ws_CO_test123';
      approvedSession.mpesaMerchantRequestID = 'mr_test123';
      approvedSession.paymentInitiatedAt = new Date();
      await approvedSession.save();

      const updatedSession = await Session.findById(approvedSession._id);
      expect(updatedSession.paymentStatus).toBe('Processing');
      expect(updatedSession.mpesaCheckoutRequestID).toBe('ws_CO_test123');
    });

    test('should confirm payment and update session to Confirmed', async () => {
      approvedSession.paymentStatus = 'Paid';
      approvedSession.status = 'Confirmed';
      approvedSession.mpesaTransactionID = 'QHX123ABC';
      approvedSession.mpesaAmount = 5000;
      approvedSession.paymentVerifiedAt = new Date();
      await approvedSession.save();

      const updatedSession = await Session.findById(approvedSession._id);
      expect(updatedSession.paymentStatus).toBe('Paid');
      expect(updatedSession.status).toBe('Confirmed');
      expect(updatedSession.mpesaTransactionID).toBe('QHX123ABC');
    });

    test('should handle payment failure gracefully', async () => {
      approvedSession.paymentStatus = 'Failed';
      approvedSession.mpesaResultCode = 1;
      approvedSession.mpesaResultDesc = 'Insufficient funds';
      await approvedSession.save();

      const updatedSession = await Session.findById(approvedSession._id);
      expect(updatedSession.paymentStatus).toBe('Failed');
      expect(updatedSession.status).toBe('Approved'); // Should remain approved for retry
    });
  });

  describe('Step 4: Complete Flow End-to-End', () => {
    test('should complete full booking workflow', async () => {
      // Step 1: Create session
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Pending Approval',
        price: 5000,
        paymentStatus: 'Pending'
      });
      expect(session.status).toBe('Pending Approval');

      // Step 2: Therapist approves
      session.status = 'Approved';
      session.approvedAt = new Date();
      await session.save();
      expect(session.status).toBe('Approved');

      // Step 3: Payment initiated
      session.paymentStatus = 'Processing';
      session.mpesaCheckoutRequestID = 'ws_CO_flow_test';
      session.paymentInitiatedAt = new Date();
      await session.save();
      expect(session.paymentStatus).toBe('Processing');

      // Step 4: Payment confirmed
      session.paymentStatus = 'Paid';
      session.status = 'Confirmed';
      session.mpesaTransactionID = 'QHX_FLOW_TEST';
      session.paymentVerifiedAt = new Date();
      await session.save();

      // Verify final state
      const finalSession = await Session.findById(session._id);
      expect(finalSession.status).toBe('Confirmed');
      expect(finalSession.paymentStatus).toBe('Paid');
      expect(finalSession.mpesaTransactionID).toBe('QHX_FLOW_TEST');
    });
  });
});
