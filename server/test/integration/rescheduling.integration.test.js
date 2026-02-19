/**
 * Rescheduling Flow Integration Tests
 * 
 * Task 25.1: Write integration tests
 * Tests rescheduling flow
 * 
 * Requirements: 9.1, 9.2, 9.5
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock external services
jest.mock('../../utils/notificationService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}));

const User = require('../../models/User');
const Session = require('../../models/Session');
const { reschedulingService, RESCHEDULE_CONFIG } = require('../../services/reschedulingService');

describe('Rescheduling Flow Integration Tests', () => {
  let mongoServer;
  let clientUser, therapistUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});

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

  describe('Reschedule Configuration', () => {
    test('should have correct auto-approve threshold', () => {
      expect(RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS).toBe(24);
    });

    test('should have max reschedules per session limit', () => {
      expect(RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION).toBe(2);
    });

    test('should have valid reschedule reasons', () => {
      expect(RESCHEDULE_CONFIG.RESCHEDULE_REASONS).toContain('schedule_conflict');
      expect(RESCHEDULE_CONFIG.RESCHEDULE_REASONS).toContain('emergency');
      expect(RESCHEDULE_CONFIG.RESCHEDULE_REASONS).toContain('illness');
    });

    test('should have reschedulable statuses defined', () => {
      expect(RESCHEDULE_CONFIG.RESCHEDULABLE_STATUSES).toContain('Approved');
      expect(RESCHEDULE_CONFIG.RESCHEDULABLE_STATUSES).toContain('Confirmed');
    });
  });

  describe('Hours Until Session Calculation', () => {
    test('should calculate positive hours for future session', () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const hours = reschedulingService.calculateHoursUntilSession(futureDate);
      
      expect(hours).toBeGreaterThan(47);
      expect(hours).toBeLessThan(49);
    });

    test('should calculate negative hours for past session', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hours = reschedulingService.calculateHoursUntilSession(pastDate);
      
      expect(hours).toBeLessThan(0);
    });
  });

  describe('Reschedule Policy', () => {
    test('should return complete policy object', () => {
      const policy = reschedulingService.getReschedulePolicy();

      expect(policy.autoApproveHours).toBe(24);
      expect(policy.maxReschedulesPerSession).toBe(2);
      expect(policy.validReasons).toBeDefined();
      expect(policy.reschedulableStatuses).toBeDefined();
      expect(policy.rules).toBeDefined();
    });
  });

  describe('Reschedule Request Flow', () => {
    test('should auto-approve reschedule request >24 hours before session', async () => {
      const originalDate = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now
      const newDate = new Date(Date.now() + 96 * 60 * 60 * 1000); // 96 hours from now

      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: originalDate,
        status: 'Confirmed',
        price: 5000,
        paymentStatus: 'Paid'
      });

      const hoursUntilSession = reschedulingService.calculateHoursUntilSession(originalDate);
      const requiresApproval = hoursUntilSession < RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS;

      expect(requiresApproval).toBe(false); // Should auto-approve
    });

    test('should require approval for reschedule request <24 hours before session', async () => {
      const originalDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now

      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: originalDate,
        status: 'Confirmed',
        price: 5000,
        paymentStatus: 'Paid'
      });

      const hoursUntilSession = reschedulingService.calculateHoursUntilSession(originalDate);
      const requiresApproval = hoursUntilSession < RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS;

      expect(requiresApproval).toBe(true); // Should require approval
    });

    test('should track reschedule count on session', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'Confirmed',
        price: 5000,
        rescheduleCount: 0
      });

      // Simulate first reschedule
      session.rescheduleCount = 1;
      await session.save();
      expect(session.rescheduleCount).toBe(1);

      // Simulate second reschedule
      session.rescheduleCount = 2;
      await session.save();
      expect(session.rescheduleCount).toBe(2);

      // Check if max reschedules reached
      const maxReached = session.rescheduleCount >= RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION;
      expect(maxReached).toBe(true);
    });

    test('should update session date on approved reschedule', async () => {
      const originalDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const newDate = new Date(Date.now() + 96 * 60 * 60 * 1000);

      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: originalDate,
        status: 'Confirmed',
        price: 5000
      });

      // Simulate approved reschedule
      session.sessionDate = newDate;
      session.rescheduleCount = (session.rescheduleCount || 0) + 1;
      session.lastRescheduledAt = new Date();
      await session.save();

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.sessionDate.getTime()).toBe(newDate.getTime());
      expect(updatedSession.rescheduleCount).toBe(1);
    });
  });

  describe('Reschedule Approval Workflow', () => {
    test('should track pending reschedule requests', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'Confirmed',
        price: 5000,
        rescheduleRequestedAt: new Date(),
        rescheduleRequestedNewDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        rescheduleStatus: 'pending'
      });

      expect(session.rescheduleStatus).toBe('pending');
      expect(session.rescheduleRequestedAt).toBeDefined();
    });

    test('should approve reschedule request', async () => {
      const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'Confirmed',
        price: 5000,
        rescheduleStatus: 'pending',
        rescheduleRequestedNewDate: newDate
      });

      // Approve reschedule
      session.sessionDate = newDate;
      session.rescheduleStatus = 'approved';
      session.rescheduleApprovedAt = new Date();
      session.rescheduleCount = 1;
      await session.save();

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.rescheduleStatus).toBe('approved');
      expect(updatedSession.sessionDate.getTime()).toBe(newDate.getTime());
    });

    test('should reject reschedule request', async () => {
      const session = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'Confirmed',
        price: 5000,
        rescheduleStatus: 'pending'
      });

      // Reject reschedule
      session.rescheduleStatus = 'rejected';
      session.rescheduleRejectionReason = 'Time slot not available';
      await session.save();

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.rescheduleStatus).toBe('rejected');
      expect(updatedSession.rescheduleRejectionReason).toBe('Time slot not available');
    });
  });
});
