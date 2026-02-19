/**
 * Property-Based Tests for Teletherapy Booking Enhancement
 * 
 * Task 25.2: Write property-based tests for:
 * - Encryption/decryption properties
 * - Audit logging completeness
 * - Payment calculation properties (refund calculations)
 * - Availability conflict detection
 * 
 * Validates: Requirements 10.1, 8.1-8.5, 9.3, 9.4, 2.5
 */

const fc = require('fast-check');
const crypto = require('crypto');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// Mock mongoose models
jest.mock('../models/AuditLog');
jest.mock('../models/Session');
jest.mock('../models/User');
jest.mock('../models/AvailabilityWindow');

const AuditLog = require('../models/AuditLog');
const encryption = require('../utils/encryption');
const auditLogger = require('../utils/auditLogger');

// Import cancellation service config for refund calculations
const { CANCELLATION_CONFIG, CancellationService } = require('../services/cancellationService');

// Import availability conflict utilities
const { 
  validateTimeRange, 
  timesOverlap, 
  compareTimes 
} = require('../services/availabilityConflictService');

describe('Teletherapy Booking Enhancement Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create = jest.fn().mockResolvedValue({});
  });

  // ============================================================================
  // SECTION 1: ENCRYPTION/DECRYPTION PROPERTIES
  // Validates: Requirements 10.1 - PHI encryption at rest using AES-256
  // ============================================================================

  describe('Property 1: Encryption Round-Trip Consistency', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 1: Encryption Round-Trip
     * Validates: Requirements 10.1
     * 
     * For any valid plaintext, encrypting then decrypting should return the original value
     */
    test('should preserve data through encrypt-decrypt cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (plaintext) => {
            const encrypted = encryption.encrypt(plaintext);
            const decrypted = encryption.decrypt(encrypted);
            
            expect(decrypted).toBe(plaintext);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle special characters in PHI data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.constantFrom(
            'Patient notes: anxiety, depression',
            'Medications: Prozac 20mg, Xanax 0.5mg',
            'Emergency contact: +254-712-345-678',
            'Address: 123 Main St, Apt #4B',
            'Diagnosis: F41.1 - Generalized Anxiety Disorder'
          ),
          (randomPart, phiSample) => {
            const testData = `${phiSample} - ${randomPart}`;
            const encrypted = encryption.encrypt(testData);
            const decrypted = encryption.decrypt(encrypted);
            
            expect(decrypted).toBe(testData);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Encryption Produces Unique Ciphertext', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 2: Unique Ciphertext
     * Validates: Requirements 10.1
     * 
     * For any plaintext, each encryption should produce different ciphertext (due to random IV)
     */
    test('should generate different ciphertext for same plaintext', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 200 }),
          (plaintext) => {
            const encrypted1 = encryption.encrypt(plaintext);
            const encrypted2 = encryption.encrypt(plaintext);
            
            // Ciphertexts should be different due to random IV
            expect(encrypted1).not.toBe(encrypted2);
            
            // But both should decrypt to same value
            expect(encryption.decrypt(encrypted1)).toBe(plaintext);
            expect(encryption.decrypt(encrypted2)).toBe(plaintext);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Encrypted Data Format Validation', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 3: Encrypted Format
     * Validates: Requirements 10.1
     * 
     * For any encrypted data, it should follow the format: iv:authTag:ciphertext
     */
    test('should produce correctly formatted encrypted output', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (plaintext) => {
            const encrypted = encryption.encrypt(plaintext);
            const parts = encrypted.split(':');
            
            // Should have exactly 3 parts
            expect(parts).toHaveLength(3);
            
            // IV should be 32 hex chars (16 bytes)
            expect(parts[0]).toHaveLength(32);
            expect(parts[0]).toMatch(/^[0-9a-f]+$/i);
            
            // Auth tag should be 32 hex chars (16 bytes)
            expect(parts[1]).toHaveLength(32);
            expect(parts[1]).toMatch(/^[0-9a-f]+$/i);
            
            // Ciphertext should be hex encoded
            expect(parts[2]).toMatch(/^[0-9a-f]+$/i);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Tampered Data Detection', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 4: Tamper Detection
     * Validates: Requirements 10.1
     * 
     * For any tampered ciphertext, decryption should fail (AES-GCM integrity)
     */
    test('should detect tampered ciphertext', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 200 }),
          (plaintext) => {
            const encrypted = encryption.encrypt(plaintext);
            const parts = encrypted.split(':');
            
            // Tamper with ciphertext
            const ciphertext = parts[2];
            const midPoint = Math.floor(ciphertext.length / 2);
            const tamperedChar = ciphertext[midPoint] === 'a' ? 'b' : 'a';
            const tamperedCiphertext = 
              ciphertext.substring(0, midPoint) + 
              tamperedChar + 
              ciphertext.substring(midPoint + 1);
            
            const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
            
            expect(() => encryption.decrypt(tampered)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // ============================================================================
  // SECTION 2: AUDIT LOGGING COMPLETENESS
  // Validates: Requirements 8.1-8.5 - Comprehensive audit logging
  // ============================================================================

  describe('Property 5: Audit Log Entry Completeness', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 5: Audit Log Completeness
     * Validates: Requirements 8.1, 8.2
     * 
     * For any audit log action, the entry should contain timestamp, action type, and hash
     */
    test('should include all required fields in audit log entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'PAYMENT_INITIATION',
            'PAYMENT_STATUS_CHANGE',
            'PAYMENT_CALLBACK',
            'ADMIN_ACCESS',
            'VIDEO_CALL_ACCESS',
            'SESSION_STATUS_CHANGE'
          ),
          async (actionType) => {
            let logEntry;
            
            switch (actionType) {
              case 'PAYMENT_INITIATION':
                logEntry = await auditLogger.logPaymentInitiation({
                  userId: 'test-user-id',
                  sessionId: 'test-session-id',
                  amount: 5000,
                  phoneNumber: '254712345678',
                  checkoutRequestID: 'test-checkout-id',
                  merchantRequestID: 'test-merchant-id'
                });
                break;
              case 'PAYMENT_STATUS_CHANGE':
                logEntry = await auditLogger.logPaymentStatusChange({
                  sessionId: 'test-session-id',
                  previousStatus: 'Pending',
                  newStatus: 'Paid',
                  reason: 'Payment confirmed'
                });
                break;
              case 'PAYMENT_CALLBACK':
                logEntry = await auditLogger.logPaymentCallback({
                  sessionId: 'test-session-id',
                  checkoutRequestID: 'test-checkout-id',
                  resultCode: 0,
                  resultDesc: 'Success',
                  amount: 5000,
                  phoneNumber: '254712345678'
                });
                break;
              case 'ADMIN_ACCESS':
                logEntry = await auditLogger.logAdminAccess({
                  adminId: 'test-admin-id',
                  action: 'View payment dashboard',
                  accessedData: 'Payment records'
                });
                break;
              case 'VIDEO_CALL_ACCESS':
                logEntry = await auditLogger.logVideoCallAccess({
                  userId: 'test-user-id',
                  sessionId: 'test-session-id',
                  action: 'join',
                  userRole: 'client',
                  ipAddress: '192.168.1.1',
                  success: true
                });
                break;
              case 'SESSION_STATUS_CHANGE':
                logEntry = await auditLogger.logSessionStatusChange({
                  sessionId: 'test-session-id',
                  previousStatus: 'Booked',
                  newStatus: 'Cancelled',
                  reason: 'Client requested cancellation',
                  userId: 'test-user-id',
                  userRole: 'client'
                });
                break;
            }
            
            // Verify required fields
            expect(logEntry).toBeDefined();
            expect(logEntry.timestamp).toBeInstanceOf(Date);
            expect(logEntry.actionType).toBeDefined();
            expect(logEntry.logHash).toBeDefined();
            expect(logEntry.logHash).toHaveLength(64);
            expect(logEntry.action).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Audit Log Hash Chain Integrity', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 6: Hash Chain Integrity
     * Validates: Requirements 8.5
     * 
     * For any sequence of audit logs, each entry should reference the previous hash
     */
    test('should maintain hash chain across multiple log entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 10, maxLength: 30 }),
              amount: fc.integer({ min: 100, max: 50000 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (payments) => {
            const logEntries = [];
            
            for (const payment of payments) {
              const logEntry = await auditLogger.logPaymentInitiation({
                userId: payment.userId,
                sessionId: 'test-session-id',
                amount: payment.amount,
                phoneNumber: '254712345678',
                checkoutRequestID: 'test-checkout-id',
                merchantRequestID: 'test-merchant-id'
              });
              logEntries.push(logEntry);
            }
            
            // Verify hash chain
            for (let i = 1; i < logEntries.length; i++) {
              const currentEntry = logEntries[i];
              const previousEntry = logEntries[i - 1];
              
              // Each entry should have a hash
              expect(currentEntry.logHash).toBeDefined();
              expect(currentEntry.logHash).toHaveLength(64);
              
              // Current entry should reference previous hash
              if (currentEntry.previousHash) {
                expect(currentEntry.previousHash).toBe(previousEntry.logHash);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Audit Log Tamper Detection', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 7: Tamper Detection
     * Validates: Requirements 8.5
     * 
     * For any tampered audit log entry, integrity verification should fail
     */
    test('should detect tampered audit log entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 10, maxLength: 30 }),
            amount: fc.integer({ min: 100, max: 50000 })
          }),
          fc.integer({ min: 1000, max: 99999 }),
          async (payment, tamperedAmount) => {
            if (tamperedAmount === payment.amount) return;
            
            const logEntry = await auditLogger.logPaymentInitiation({
              userId: payment.userId,
              sessionId: 'test-session-id',
              amount: payment.amount,
              phoneNumber: '254712345678',
              checkoutRequestID: 'test-checkout-id',
              merchantRequestID: 'test-merchant-id'
            });
            
            // Tamper with the entry
            const tamperedEntry = { ...logEntry, amount: tamperedAmount };
            
            // Verify tampered entry fails integrity check
            const isValid = auditLogger.verifyLogIntegrity(tamperedEntry, logEntry.previousHash);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Phone Number Masking in Audit Logs', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 8: Phone Masking
     * Validates: Requirements 8.3, 10.3
     * 
     * For any phone number in audit logs, it should be masked showing only last 4 digits
     */
    test('should mask phone numbers in payment logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.constantFrom('2547', '2541'),
            fc.integer({ min: 10000000, max: 99999999 })
          ).map(([prefix, num]) => prefix + String(num)),
          async (phoneNumber) => {
            const logEntry = await auditLogger.logPaymentInitiation({
              userId: 'test-user-id',
              sessionId: 'test-session-id',
              amount: 5000,
              phoneNumber,
              checkoutRequestID: 'test-checkout-id',
              merchantRequestID: 'test-merchant-id'
            });
            
            // Phone should be masked
            expect(logEntry.phoneNumber).not.toBe(phoneNumber);
            expect(logEntry.phoneNumber).toContain('*');
            
            // Last 4 digits should be visible
            const lastFour = phoneNumber.slice(-4);
            expect(logEntry.phoneNumber).toContain(lastFour);
            
            // Format should be 254****XXXX
            expect(logEntry.phoneNumber).toMatch(/^254\*+\d{4}$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // ============================================================================
  // SECTION 3: PAYMENT/REFUND CALCULATION PROPERTIES
  // Validates: Requirements 9.3, 9.4 - Cancellation policy and refund calculations
  // ============================================================================

  describe('Property 9: Refund Percentage Tiered Calculation', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 9: Refund Tiers
     * Validates: Requirements 9.3, 9.4
     * 
     * For any hours until session, the refund percentage should follow the tiered policy:
     * - 48+ hours: 100%
     * - 24-48 hours: 75%
     * - 12-24 hours: 50%
     * - 6-12 hours: 25%
     * - <6 hours: 0%
     */
    test('should calculate correct refund percentage based on hours until session', () => {
      const cancellationService = new CancellationService();
      
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (hoursUntilSession) => {
            const percentage = cancellationService.calculateRefundPercentage(hoursUntilSession);
            
            if (hoursUntilSession >= 48) {
              expect(percentage).toBe(100);
            } else if (hoursUntilSession >= 24) {
              expect(percentage).toBe(75);
            } else if (hoursUntilSession >= 12) {
              expect(percentage).toBe(50);
            } else if (hoursUntilSession >= 6) {
              expect(percentage).toBe(25);
            } else {
              expect(percentage).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Refund Amount Calculation Consistency', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 10: Refund Amount
     * Validates: Requirements 9.3, 9.4
     * 
     * For any session price and refund percentage, the refund amount should be correctly calculated
     */
    test('should calculate refund amount as percentage of session price', () => {
      const cancellationService = new CancellationService();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 50000 }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          (sessionPrice, hoursUntilSession) => {
            const mockSession = { price: sessionPrice };
            const refundInfo = cancellationService.calculateRefundAmount(
              mockSession, 
              'client', 
              hoursUntilSession
            );
            
            const expectedPercentage = cancellationService.calculateRefundPercentage(hoursUntilSession);
            const expectedAmount = Math.round(sessionPrice * (expectedPercentage / 100));
            
            expect(refundInfo.percentage).toBe(expectedPercentage);
            expect(refundInfo.amount).toBe(expectedAmount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Therapist Cancellation Full Refund', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 11: Therapist Cancellation
     * Validates: Requirements 9.3, 9.4
     * 
     * For any therapist-initiated cancellation, the client should receive a full refund
     */
    test('should always give full refund for therapist cancellations', () => {
      const cancellationService = new CancellationService();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 50000 }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          (sessionPrice, hoursUntilSession) => {
            const mockSession = { price: sessionPrice };
            const refundInfo = cancellationService.calculateRefundAmount(
              mockSession, 
              'therapist', 
              hoursUntilSession
            );
            
            // Therapist cancellation should always be 100% refund
            expect(refundInfo.percentage).toBe(100);
            expect(refundInfo.amount).toBe(sessionPrice);
            expect(refundInfo.reason).toContain('Therapist-initiated');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Admin Cancellation Full Refund', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 12: Admin Cancellation
     * Validates: Requirements 9.3, 9.4
     * 
     * For any admin-initiated cancellation, the client should receive a full refund
     */
    test('should always give full refund for admin cancellations', () => {
      const cancellationService = new CancellationService();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 50000 }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          (sessionPrice, hoursUntilSession) => {
            const mockSession = { price: sessionPrice };
            const refundInfo = cancellationService.calculateRefundAmount(
              mockSession, 
              'admin', 
              hoursUntilSession
            );
            
            // Admin cancellation should always be 100% refund
            expect(refundInfo.percentage).toBe(100);
            expect(refundInfo.amount).toBe(sessionPrice);
            expect(refundInfo.reason).toContain('Admin-initiated');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Refund Amount Never Exceeds Session Price', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 13: Refund Bounds
     * Validates: Requirements 9.3, 9.4
     * 
     * For any refund calculation, the amount should never exceed the session price
     */
    test('should never calculate refund greater than session price', () => {
      const cancellationService = new CancellationService();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 100000 }),
          fc.float({ min: 0, max: 200, noNaN: true }),
          fc.constantFrom('client', 'therapist', 'admin'),
          (sessionPrice, hoursUntilSession, cancelledBy) => {
            const mockSession = { price: sessionPrice };
            const refundInfo = cancellationService.calculateRefundAmount(
              mockSession, 
              cancelledBy, 
              hoursUntilSession
            );
            
            expect(refundInfo.amount).toBeLessThanOrEqual(sessionPrice);
            expect(refundInfo.amount).toBeGreaterThanOrEqual(0);
            expect(refundInfo.percentage).toBeLessThanOrEqual(100);
            expect(refundInfo.percentage).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Refund Tier Boundaries', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 14: Tier Boundaries
     * Validates: Requirements 9.3, 9.4
     * 
     * For hours at exact tier boundaries, the higher tier should apply
     */
    test('should apply correct tier at exact boundary hours', () => {
      const cancellationService = new CancellationService();
      
      fc.assert(
        fc.property(
          fc.constantFrom(
            { hours: 48, expectedPercentage: 100 },
            { hours: 24, expectedPercentage: 75 },
            { hours: 12, expectedPercentage: 50 },
            { hours: 6, expectedPercentage: 25 },
            { hours: 0, expectedPercentage: 0 }
          ),
          ({ hours, expectedPercentage }) => {
            const percentage = cancellationService.calculateRefundPercentage(hours);
            expect(percentage).toBe(expectedPercentage);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // ============================================================================
  // SECTION 4: AVAILABILITY CONFLICT DETECTION
  // Validates: Requirements 2.5 - Prevent conflicts with existing sessions
  // ============================================================================

  describe('Property 15: Time Range Validation', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 15: Time Range Validation
     * Validates: Requirements 2.5
     * 
     * For any time range, start time must be before end time
     */
    test('should validate that start time is before end time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (startHour, startMin, endHour, endMin) => {
            const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
            const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
            
            const result = validateTimeRange(startTime, endTime);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            if (startMinutes < endMinutes) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
              expect(result.error).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Time Overlap Detection', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 16: Time Overlap
     * Validates: Requirements 2.5
     * 
     * For any two time ranges, overlap should be correctly detected
     */
    test('should correctly detect overlapping time ranges', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 4 }),
          (start1Hour, duration1, start2Hour, duration2) => {
            const start1 = `${start1Hour.toString().padStart(2, '0')}:00`;
            const end1 = `${(start1Hour + duration1).toString().padStart(2, '0')}:00`;
            const start2 = `${start2Hour.toString().padStart(2, '0')}:00`;
            const end2 = `${(start2Hour + duration2).toString().padStart(2, '0')}:00`;
            
            const overlaps = timesOverlap(start1, end1, start2, end2);
            
            // Calculate expected overlap
            const range1Start = start1Hour;
            const range1End = start1Hour + duration1;
            const range2Start = start2Hour;
            const range2End = start2Hour + duration2;
            
            const expectedOverlap = range1Start < range2End && range1End > range2Start;
            
            expect(overlaps).toBe(expectedOverlap);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 17: Time Comparison Transitivity', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 17: Time Comparison
     * Validates: Requirements 2.5
     * 
     * For any three times A, B, C: if A < B and B < C, then A < C
     */
    test('should maintain transitivity in time comparisons', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (h1, m1, h2, m2, h3, m3) => {
            const time1 = `${h1.toString().padStart(2, '0')}:${m1.toString().padStart(2, '0')}`;
            const time2 = `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`;
            const time3 = `${h3.toString().padStart(2, '0')}:${m3.toString().padStart(2, '0')}`;
            
            const cmp12 = compareTimes(time1, time2);
            const cmp23 = compareTimes(time2, time3);
            const cmp13 = compareTimes(time1, time3);
            
            // Transitivity: if time1 < time2 and time2 < time3, then time1 < time3
            if (cmp12 < 0 && cmp23 < 0) {
              expect(cmp13).toBeLessThan(0);
            }
            
            // Transitivity: if time1 > time2 and time2 > time3, then time1 > time3
            if (cmp12 > 0 && cmp23 > 0) {
              expect(cmp13).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Non-Overlapping Ranges Detection', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 18: Non-Overlapping
     * Validates: Requirements 2.5
     * 
     * For any two non-overlapping time ranges, overlap detection should return false
     */
    test('should correctly identify non-overlapping ranges', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 8, max: 11 }),
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 14, max: 17 }),
          fc.integer({ min: 1, max: 2 }),
          (start1Hour, duration1, start2Hour, duration2) => {
            // Ensure ranges don't overlap (morning vs afternoon)
            const start1 = `${start1Hour.toString().padStart(2, '0')}:00`;
            const end1 = `${(start1Hour + duration1).toString().padStart(2, '0')}:00`;
            const start2 = `${start2Hour.toString().padStart(2, '0')}:00`;
            const end2 = `${(start2Hour + duration2).toString().padStart(2, '0')}:00`;
            
            const overlaps = timesOverlap(start1, end1, start2, end2);
            
            // Morning (8-13) and afternoon (14-19) should never overlap
            expect(overlaps).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Availability Window Conflict Detection', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 19: Window Conflicts
     * Validates: Requirements 2.5
     * 
     * For any session within an availability window, reducing the window should detect conflict
     */
    test('should detect conflicts when availability window is reduced', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }),
          fc.integer({ min: 10, max: 15 }),
          (dayOfWeek, sessionHour) => {
            // Session at a specific time
            const sessionTime = `${sessionHour.toString().padStart(2, '0')}:00`;
            
            // Original availability covers the session
            const originalWindow = {
              dayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            };
            
            // New availability that excludes the session time
            const newWindow = {
              dayOfWeek,
              startTime: '08:00',
              endTime: `${(sessionHour - 1).toString().padStart(2, '0')}:00`
            };
            
            // Check if session is within new window
            const sessionWithinNew = compareTimes(sessionTime, newWindow.startTime) >= 0 &&
                                     compareTimes(sessionTime, newWindow.endTime) <= 0;
            
            // Session should NOT be within the reduced window
            expect(sessionWithinNew).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Time Format Validation', () => {
    /**
     * Feature: teletherapy-booking-enhancement, Property 20: Time Format
     * Validates: Requirements 2.5
     * 
     * For any valid HH:MM time, validation should pass
     */
    test('should accept valid HH:MM time formats', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (hour, minute) => {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Create a valid range with this time as start
            const endHour = Math.min(hour + 1, 23);
            const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            if (hour < 23) {
              const result = validateTimeRange(time, endTime);
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
