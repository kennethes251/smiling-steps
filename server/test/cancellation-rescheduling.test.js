/**
 * Cancellation and Rescheduling System Tests
 * 
 * Checkpoint tests for Phase 3: Cancellation & Rescheduling
 * Tests refund calculations, notification templates, and policy logic.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

const { cancellationService, CANCELLATION_CONFIG } = require('../services/cancellationService');
const { reschedulingService, RESCHEDULE_CONFIG } = require('../services/reschedulingService');
const { refundService, REFUND_CONFIG } = require('../services/refundService');
const notificationTemplates = require('../utils/notificationTemplates');

describe('Cancellation Policy Tests', () => {
  describe('Refund Calculation Logic', () => {
    // Test refund percentage calculation based on hours until session
    test('should return 100% refund for 48+ hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(48);
      expect(percentage).toBe(100);
    });

    test('should return 100% refund for 72 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(72);
      expect(percentage).toBe(100);
    });

    test('should return 75% refund for 24-48 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(24);
      expect(percentage).toBe(75);
    });

    test('should return 75% refund for 36 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(36);
      expect(percentage).toBe(75);
    });

    test('should return 50% refund for 12-24 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(12);
      expect(percentage).toBe(50);
    });

    test('should return 50% refund for 18 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(18);
      expect(percentage).toBe(50);
    });

    test('should return 25% refund for 6-12 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(6);
      expect(percentage).toBe(25);
    });

    test('should return 25% refund for 9 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(9);
      expect(percentage).toBe(25);
    });

    test('should return 0% refund for less than 6 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(5);
      expect(percentage).toBe(0);
    });

    test('should return 0% refund for 0 hours notice', () => {
      const percentage = cancellationService.calculateRefundPercentage(0);
      expect(percentage).toBe(0);
    });

    test('should return 0% refund for negative hours (past session)', () => {
      const percentage = cancellationService.calculateRefundPercentage(-5);
      expect(percentage).toBe(0);
    });
  });

  describe('Refund Amount Calculation', () => {
    const mockSession = { price: 5000 };

    test('should calculate full refund for therapist cancellation', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'therapist', 10);
      expect(result.amount).toBe(5000);
      expect(result.percentage).toBe(100);
      expect(result.reason).toBe('Therapist-initiated cancellation');
    });

    test('should calculate full refund for admin cancellation', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'admin', 10);
      expect(result.amount).toBe(5000);
      expect(result.percentage).toBe(100);
      expect(result.reason).toBe('Admin-initiated cancellation');
    });

    test('should calculate tiered refund for client cancellation at 48+ hours', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'client', 50);
      expect(result.amount).toBe(5000);
      expect(result.percentage).toBe(100);
    });

    test('should calculate 75% refund for client cancellation at 30 hours', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'client', 30);
      expect(result.amount).toBe(3750);
      expect(result.percentage).toBe(75);
    });

    test('should calculate 50% refund for client cancellation at 15 hours', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'client', 15);
      expect(result.amount).toBe(2500);
      expect(result.percentage).toBe(50);
    });

    test('should calculate 25% refund for client cancellation at 8 hours', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'client', 8);
      expect(result.amount).toBe(1250);
      expect(result.percentage).toBe(25);
    });

    test('should calculate 0% refund for client cancellation at 3 hours', () => {
      const result = cancellationService.calculateRefundAmount(mockSession, 'client', 3);
      expect(result.amount).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe('Cancellation Policy Configuration', () => {
    test('should have correct full refund hours threshold', () => {
      expect(CANCELLATION_CONFIG.FULL_REFUND_HOURS).toBe(48);
    });

    test('should have 5 refund tiers', () => {
      expect(CANCELLATION_CONFIG.PARTIAL_REFUND_TIERS).toHaveLength(5);
    });

    test('should have valid cancellation reasons', () => {
      const expectedReasons = [
        'schedule_conflict', 'emergency', 'illness', 'therapist_unavailable',
        'technical_issues', 'financial_reasons', 'personal_reasons', 'other'
      ];
      expectedReasons.forEach(reason => {
        expect(CANCELLATION_CONFIG.CANCELLATION_REASONS).toContain(reason);
      });
    });

    test('should have therapist cancellation full refund enabled', () => {
      expect(CANCELLATION_CONFIG.THERAPIST_CANCELLATION_FULL_REFUND).toBe(true);
    });

    test('should have admin cancellation full refund enabled', () => {
      expect(CANCELLATION_CONFIG.ADMIN_CANCELLATION_FULL_REFUND).toBe(true);
    });
  });

  describe('Get Cancellation Policy', () => {
    test('should return complete policy object', () => {
      const policy = cancellationService.getCancellationPolicy();
      
      expect(policy).toHaveProperty('fullRefundHours', 48);
      expect(policy).toHaveProperty('refundTiers');
      expect(policy).toHaveProperty('validReasons');
      expect(policy).toHaveProperty('therapistCancellationFullRefund', true);
      expect(policy).toHaveProperty('adminCancellationFullRefund', true);
      expect(policy).toHaveProperty('refundProcessingDays');
      expect(policy).toHaveProperty('policyDescription');
    });

    test('should have correct refund tiers in policy', () => {
      const policy = cancellationService.getCancellationPolicy();
      
      expect(policy.refundTiers[0].hoursBeforeSession).toBe(48);
      expect(policy.refundTiers[0].refundPercentage).toBe(100);
      
      expect(policy.refundTiers[1].hoursBeforeSession).toBe(24);
      expect(policy.refundTiers[1].refundPercentage).toBe(75);
      
      expect(policy.refundTiers[2].hoursBeforeSession).toBe(12);
      expect(policy.refundTiers[2].refundPercentage).toBe(50);
      
      expect(policy.refundTiers[3].hoursBeforeSession).toBe(6);
      expect(policy.refundTiers[3].refundPercentage).toBe(25);
      
      expect(policy.refundTiers[4].hoursBeforeSession).toBe(0);
      expect(policy.refundTiers[4].refundPercentage).toBe(0);
    });
  });
});

describe('Rescheduling Policy Tests', () => {
  describe('Reschedule Configuration', () => {
    test('should have 24-hour auto-approve threshold', () => {
      expect(RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS).toBe(24);
    });

    test('should have max 2 reschedules per session', () => {
      expect(RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION).toBe(2);
    });

    test('should have valid reschedule reasons', () => {
      const expectedReasons = [
        'schedule_conflict', 'emergency', 'illness', 'therapist_request',
        'client_request', 'technical_issues', 'work_commitment', 
        'family_emergency', 'travel', 'other'
      ];
      expectedReasons.forEach(reason => {
        expect(RESCHEDULE_CONFIG.RESCHEDULE_REASONS).toContain(reason);
      });
    });

    test('should have correct reschedulable statuses', () => {
      const expectedStatuses = ['Approved', 'Payment Submitted', 'Confirmed', 'Booked'];
      expectedStatuses.forEach(status => {
        expect(RESCHEDULE_CONFIG.RESCHEDULABLE_STATUSES).toContain(status);
      });
    });
  });

  describe('Hours Until Session Calculation', () => {
    test('should calculate positive hours for future session', () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
      const hours = reschedulingService.calculateHoursUntilSession(futureDate);
      expect(hours).toBeGreaterThan(47);
      expect(hours).toBeLessThan(49);
    });

    test('should calculate negative hours for past session', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const hours = reschedulingService.calculateHoursUntilSession(pastDate);
      expect(hours).toBeLessThan(0);
    });
  });

  describe('Get Reschedule Policy', () => {
    test('should return complete policy object', () => {
      const policy = reschedulingService.getReschedulePolicy();
      
      expect(policy).toHaveProperty('autoApproveHours', 24);
      expect(policy).toHaveProperty('maxReschedulesPerSession', 2);
      expect(policy).toHaveProperty('validReasons');
      expect(policy).toHaveProperty('reschedulableStatuses');
      expect(policy).toHaveProperty('rules');
    });

    test('should have policy rules', () => {
      const policy = reschedulingService.getReschedulePolicy();
      expect(policy.rules.length).toBeGreaterThan(0);
    });
  });
});

describe('Refund Service Tests', () => {
  describe('Refund Configuration', () => {
    test('should have max retry attempts configured', () => {
      expect(REFUND_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
    });

    test('should have retry delay configured', () => {
      expect(REFUND_CONFIG.RETRY_DELAY_MS).toBe(5000);
    });

    test('should have processing timeout configured', () => {
      expect(REFUND_CONFIG.PROCESSING_TIMEOUT_MS).toBe(30000);
    });

    test('should have auto refund limits configured', () => {
      expect(REFUND_CONFIG.AUTO_REFUND_MIN_AMOUNT).toBe(100);
      expect(REFUND_CONFIG.AUTO_REFUND_MAX_AMOUNT).toBe(50000);
    });

    test('should have refund reasons defined', () => {
      expect(REFUND_CONFIG.REFUND_REASONS).toHaveProperty('SESSION_CANCELLED');
      expect(REFUND_CONFIG.REFUND_REASONS).toHaveProperty('THERAPIST_NO_SHOW');
      expect(REFUND_CONFIG.REFUND_REASONS).toHaveProperty('TECHNICAL_ISSUES');
      expect(REFUND_CONFIG.REFUND_REASONS).toHaveProperty('ADMIN_INITIATED');
    });
  });
});

describe('Notification Templates Tests', () => {
  describe('Helper Functions', () => {
    test('formatDate should format date correctly', () => {
      const date = new Date('2025-01-15T10:30:00');
      const formatted = notificationTemplates.formatDate(date);
      expect(formatted).toContain('2025');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });

    test('formatCurrency should format KES correctly', () => {
      const formatted = notificationTemplates.formatCurrency(5000);
      expect(formatted).toBe('KES 5,000');
    });

    test('formatCurrency should handle large amounts', () => {
      const formatted = notificationTemplates.formatCurrency(100000);
      expect(formatted).toBe('KES 100,000');
    });
  });

  describe('Cancellation Email Templates', () => {
    const mockCancellationData = {
      clientName: 'John Doe',
      therapistName: 'Jane Smith',
      sessionDate: new Date('2025-01-20T14:00:00'),
      sessionType: 'Individual Therapy',
      cancellationReason: 'schedule_conflict',
      refundAmount: 3750,
      refundPercentage: 75,
      refundStatus: 'pending',
      policy: '75% refund (24-48 hours notice)',
      sessionId: 'session123'
    };

    test('should generate client cancellation confirmation email', () => {
      const email = notificationTemplates.cancellationConfirmationClientEmail(mockCancellationData);
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Cancellation');
      expect(email.html).toContain('John Doe');
      expect(email.html).toContain('Jane Smith');
      expect(email.html).toContain('KES 3,750');
      expect(email.html).toContain('75%');
    });

    test('should generate therapist cancellation notification email', () => {
      const email = notificationTemplates.cancellationNotificationTherapistEmail({
        therapistName: 'Jane Smith',
        clientName: 'John Doe',
        sessionDate: new Date('2025-01-20T14:00:00'),
        sessionType: 'Individual Therapy',
        cancellationReason: 'schedule_conflict',
        cancelledBy: 'client',
        sessionId: 'session123'
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Cancelled');
      expect(email.html).toContain('John Doe');
    });
  });

  describe('Cancellation SMS Templates', () => {
    test('should generate client cancellation SMS with refund', () => {
      const sms = notificationTemplates.cancellationConfirmationClientSMS({
        sessionDate: new Date('2025-01-20T14:00:00'),
        refundAmount: 3750,
        refundStatus: 'pending'
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('cancelled');
      expect(sms).toContain('KES 3,750');
    });

    test('should generate client cancellation SMS without refund', () => {
      const sms = notificationTemplates.cancellationConfirmationClientSMS({
        sessionDate: new Date('2025-01-20T14:00:00'),
        refundAmount: 0,
        refundStatus: 'not_applicable'
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('cancelled');
      expect(sms).toContain('no refund');
    });

    test('should generate therapist cancellation SMS', () => {
      const sms = notificationTemplates.cancellationNotificationTherapistSMS({
        clientName: 'John Doe',
        sessionDate: new Date('2025-01-20T14:00:00')
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('John Doe');
      expect(sms).toContain('cancelled');
    });
  });

  describe('Reschedule Email Templates', () => {
    test('should generate therapist reschedule request email', () => {
      const email = notificationTemplates.rescheduleRequestTherapistEmail({
        therapistName: 'Jane Smith',
        clientName: 'John Doe',
        originalDate: new Date('2025-01-20T14:00:00'),
        requestedNewDate: new Date('2025-01-22T14:00:00'),
        rescheduleReason: 'schedule_conflict',
        rescheduleNotes: 'Work meeting conflict',
        sessionId: 'session123',
        hoursUntilSession: 12
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Reschedule Request');
      expect(email.html).toContain('John Doe');
      expect(email.html).toContain('Approval Required');
    });

    test('should generate client reschedule request email', () => {
      const email = notificationTemplates.rescheduleRequestClientEmail({
        clientName: 'John Doe',
        therapistName: 'Jane Smith',
        originalDate: new Date('2025-01-20T14:00:00'),
        requestedNewDate: new Date('2025-01-22T14:00:00'),
        requiresApproval: true
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.html).toContain('John Doe');
      expect(email.html).toContain('Awaiting Approval');
    });

    test('should generate client reschedule approval email', () => {
      const email = notificationTemplates.rescheduleApprovalClientEmail({
        clientName: 'John Doe',
        therapistName: 'Jane Smith',
        originalDate: new Date('2025-01-20T14:00:00'),
        newDate: new Date('2025-01-22T14:00:00'),
        sessionType: 'Individual Therapy',
        sessionId: 'session123'
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Confirmed');
      expect(email.html).toContain('approved');
    });

    test('should generate therapist reschedule approval email', () => {
      const email = notificationTemplates.rescheduleApprovalTherapistEmail({
        therapistName: 'Jane Smith',
        clientName: 'John Doe',
        originalDate: new Date('2025-01-20T14:00:00'),
        newDate: new Date('2025-01-22T14:00:00'),
        sessionType: 'Individual Therapy',
        sessionId: 'session123'
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Rescheduled');
    });

    test('should generate client reschedule rejection email', () => {
      const email = notificationTemplates.rescheduleRejectionClientEmail({
        clientName: 'John Doe',
        therapistName: 'Jane Smith',
        originalDate: new Date('2025-01-20T14:00:00'),
        requestedNewDate: new Date('2025-01-22T14:00:00'),
        rejectionReason: 'Time slot not available',
        sessionId: 'session123'
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Declined');
      expect(email.html).toContain('declined');
    });
  });

  describe('Reschedule SMS Templates', () => {
    test('should generate therapist reschedule request SMS', () => {
      const sms = notificationTemplates.rescheduleRequestTherapistSMS({
        clientName: 'John Doe',
        originalDate: new Date('2025-01-20T14:00:00'),
        requestedNewDate: new Date('2025-01-22T14:00:00')
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('John Doe');
      expect(sms).toContain('reschedule');
    });

    test('should generate client reschedule approval SMS', () => {
      const sms = notificationTemplates.rescheduleApprovalClientSMS({
        newDate: new Date('2025-01-22T14:00:00'),
        therapistName: 'Jane Smith'
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('approved');
      expect(sms).toContain('Jane Smith');
    });

    test('should generate client reschedule rejection SMS', () => {
      const sms = notificationTemplates.rescheduleRejectionClientSMS({
        originalDate: new Date('2025-01-20T14:00:00')
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('declined');
    });
  });

  describe('Refund Templates', () => {
    test('should generate refund processed email', () => {
      const email = notificationTemplates.refundProcessedEmail({
        clientName: 'John Doe',
        therapistName: 'Jane Smith',
        sessionDate: new Date('2025-01-20T14:00:00'),
        refundAmount: 3750,
        refundPercentage: 75,
        transactionId: 'TXN123456',
        originalPaymentAmount: 5000,
        cancellationReason: 'schedule_conflict',
        sessionId: 'session123'
      });
      
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('html');
      expect(email.subject).toContain('Refund');
      expect(email.html).toContain('KES 3,750');
      expect(email.html).toContain('TXN123456');
    });

    test('should generate refund processed SMS', () => {
      const sms = notificationTemplates.refundProcessedSMS({
        refundAmount: 3750,
        transactionId: 'TXN123456'
      });
      
      expect(sms).toContain('Smiling Steps');
      expect(sms).toContain('KES 3,750');
      expect(sms).toContain('TXN123456');
    });
  });
});

describe('Integration Tests - Policy Consistency', () => {
  test('cancellation policy and refund tiers should be consistent', () => {
    const policy = cancellationService.getCancellationPolicy();
    
    // Verify the first tier matches full refund hours
    expect(policy.refundTiers[0].hoursBeforeSession).toBe(policy.fullRefundHours);
    expect(policy.refundTiers[0].refundPercentage).toBe(100);
  });

  test('reschedule policy auto-approve hours should be less than cancellation full refund hours', () => {
    const cancelPolicy = cancellationService.getCancellationPolicy();
    const reschedulePolicy = reschedulingService.getReschedulePolicy();
    
    // Auto-approve for reschedule (24h) should be less than full refund (48h)
    expect(reschedulePolicy.autoApproveHours).toBeLessThan(cancelPolicy.fullRefundHours);
  });

  test('all notification templates should be exported', () => {
    const expectedExports = [
      'formatDate',
      'formatCurrency',
      'cancellationConfirmationClientEmail',
      'cancellationNotificationTherapistEmail',
      'cancellationConfirmationClientSMS',
      'cancellationNotificationTherapistSMS',
      'rescheduleRequestTherapistEmail',
      'rescheduleRequestClientEmail',
      'rescheduleApprovalClientEmail',
      'rescheduleApprovalTherapistEmail',
      'rescheduleRejectionClientEmail',
      'rescheduleRequestTherapistSMS',
      'rescheduleApprovalClientSMS',
      'rescheduleRejectionClientSMS',
      'refundProcessedEmail',
      'refundProcessedSMS'
    ];
    
    expectedExports.forEach(exportName => {
      expect(notificationTemplates).toHaveProperty(exportName);
      expect(typeof notificationTemplates[exportName]).toBe('function');
    });
  });
});
