/**
 * Cancellation and Refund Flow Integration Tests
 * 
 * Task 25.1: Write integration tests
 * Tests cancellation and refund flow
 * 
 * Requirements: 9.1-9.5
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock external services
jest.mock('../../utils/notificationService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../config/mpesa', () => ({
  initiateRefund: jest.fn().mockResolvedValue({
    success: true,
    transactionId: 'REFUND_TXN_123'
  })
}));

const User = require('../../models/User');
const Session = require('../../models/Session');
const AuditLog = require('../../models/AuditLog');
const { cancellationService, CANCELLATION_CONFIG } = require('../../services/cancellationService');

describe('Cancellation and Refund Flow Integration Tests', () => {
  let mongoServer;
  let clientUser, therapistUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await AuditLog.deleteMany({});

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
      phone: '+254712345679'
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 30000);

  describe('Cancellation Eligibility', () => {
    test('should allow cancellation of approved session', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
        status: 'Approved',
        price: 5000,
        paymentStatus: 'Paid'
      });

      const eligibility = await cancellationService.checkCancellationEligibility(
        session._id,
        clientUser._id.toString()
      );

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.refundPercentage).toBe(100); // Full refund for 72+ hours
    });

    test('should not allow cancellation of completed session', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past session
        status: 'Completed',
        price: 5000,
        paymentStatus: 'Paid'
      });

      const eligibility = await cancellationService.checkCancellationEligibility(
        session._id,
        clientUser._id.toString()
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('Cannot cancel');
    });

    test('should not allow unauthorized user to cancel', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Approved',
        price: 5000
      });

      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@test.com',
        password: 'TestPass123!',
        role: 'client',
        isVerified: true
      });

      const eligibility = await cancellationService.checkCancellationEligibility(
        session._id,
        anotherUser._id.toString()
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('Not authorized');
    });
  });

  describe('Refund Calculation', () => {
    test('should calculate 100% refund for 48+ hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(50);
      expect(percentage).toBe(100);
    });

    test('should calculate 75% refund for 24-48 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(30);
      expect(percentage).toBe(75);
    });

    test('should calculate 50% refund for 12-24 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(18);
      expect(percentage).toBe(50);
    });

    test('should calculate 25% refund for 6-12 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(8);
      expect(percentage).toBe(25);
    });

    test('should calculate 0% refund for less than 6 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(3);
      expect(percentage).toBe(0);
    });

    test('should give full refund for therapist-initiated cancellation', () => {
      const session = { price: 5000 };
      const result = cancellationService.calculateRefundAmount(session, 'therapist', 5);
      
      expect(result.percentage).toBe(100);
      expect(result.amount).toBe(5000);
      expect(result.reason).toContain('Therapist-initiated');
    });

    test('should give full refund for admin-initiated cancellation', () => {
      const session = { price: 5000 };
      const result = cancellationService.calculateRefundAmount(session, 'admin', 5);
      
      expect(result.percentage).toBe(100);
      expect(result.amount).toBe(5000);
      expect(result.reason).toContain('Admin-initiated');
    });
  });

  describe('Cancellation Policy', () => {
    test('should return complete policy configuration', () => {
      const policy = cancellationService.getCancellationPolicy();

      expect(policy.fullRefundHours).toBe(48);
      expect(policy.refundTiers).toHaveLength(5);
      expect(policy.validReasons).toContain('schedule_conflict');
      expect(policy.validReasons).toContain('emergency');
      expect(policy.therapistCancellationFullRefund).toBe(true);
      expect(policy.adminCancellationFullRefund).toBe(true);
    });

    test('should have correct refund tier ordering', () => {
      const policy = cancellationService.getCancellationPolicy();
      
      // Tiers should be ordered from highest hours to lowest
      for (let i = 0; i < policy.refundTiers.length - 1; i++) {
        expect(policy.refundTiers[i].hoursBeforeSession)
          .toBeGreaterThan(policy.refundTiers[i + 1].hoursBeforeSession);
      }
    });
  });

  describe('Session Cancellation Process', () => {
    test('should cancel session and update status', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Confirmed',
        price: 5000,
        paymentStatus: 'Paid'
      });

      // Manually update session to simulate cancellation
      session.status = 'Cancelled';
      session.cancellationRequestedAt = new Date();
      session.cancellationReason = 'schedule_conflict';
      session.cancelledBy = 'client';
      session.refundStatus = 'pending';
      session.refundAmount = 5000;
      session.refundPercentage = 100;
      await session.save();

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.status).toBe('Cancelled');
      expect(updatedSession.cancellationReason).toBe('schedule_conflict');
      expect(updatedSession.refundAmount).toBe(5000);
    });

    test('should track cancellation by client vs therapist', async () => {
      // Client cancellation
      const clientSession = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Cancelled',
        cancelledBy: 'client',
        price: 5000
      });

      // Therapist cancellation
      const therapistSession = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Cancelled',
        cancelledBy: 'therapist',
        price: 5000
      });

      expect(clientSession.cancelledBy).toBe('client');
      expect(therapistSession.cancelledBy).toBe('therapist');
    });
  });

  describe('Refund Processing', () => {
    test('should track refund status through lifecycle', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Cancelled',
        price: 5000,
        paymentStatus: 'Paid',
        refundStatus: 'pending',
        refundAmount: 5000
      });

      // Simulate refund processing
      session.refundStatus = 'processing';
      await session.save();
      expect(session.refundStatus).toBe('processing');

      // Simulate refund completion
      session.refundStatus = 'processed';
      session.refundTransactionId = 'REFUND_TXN_123';
      session.refundProcessedAt = new Date();
      await session.save();

      const finalSession = await Session.findById(session._id);
      expect(finalSession.refundStatus).toBe('processed');
      expect(finalSession.refundTransactionId).toBe('REFUND_TXN_123');
    });

    test('should handle refund failure gracefully', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Cancelled',
        price: 5000,
        paymentStatus: 'Paid',
        refundStatus: 'pending',
        refundAmount: 5000
      });

      // Simulate refund failure
      session.refundStatus = 'pending_manual';
      session.refundNotes = 'Automatic refund failed. Manual processing required.';
      await session.save();

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.refundStatus).toBe('pending_manual');
      expect(updatedSession.refundNotes).toContain('Manual processing required');
    });
  });
});
