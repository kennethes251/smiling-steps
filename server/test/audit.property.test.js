const fc = require('fast-check');
const crypto = require('crypto');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// Mock mongoose models
jest.mock('../models/AuditLog');
jest.mock('../models/Session');
jest.mock('../models/User');

const AuditLog = require('../models/AuditLog');
const auditLogger = require('../utils/auditLogger');
const encryption = require('../utils/encryption');

describe('Audit Trail Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AuditLog.create to succeed
    AuditLog.create = jest.fn().mockResolvedValue({});
  });

  // ============================================================================
  // PROPERTY 66: Payment Action Logs Required Fields
  // ============================================================================

  describe('Property 66: Payment Action Logs Required Fields', () => {
    /**
     * Feature: mpesa-payment-integration, Property 66: Payment Action Logs Required Fields
     * Validates: Requirements 13.1
     * 
     * For any payment action, the log should contain timestamp, user ID, and action type
     */
    test('should log all payment actions with required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'PAYMENT_INITIATION',
            'PAYMENT_STATUS_CHANGE',
            'PAYMENT_CALLBACK',
            'PAYMENT_QUERY',
            'PAYMENT_RETRY',
            'PAYMENT_FAILURE'
          ),
          fc.string({ minLength: 20, maxLength: 30 }), // userId
          async (actionType, userId) => {
            // Create a log entry based on action type
            let logEntry;
            
            switch (actionType) {
              case 'PAYMENT_INITIATION':
                logEntry = await auditLogger.logPaymentInitiation({
                  userId,
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
                  previousStatus: 'Processing',
                  newStatus: 'Paid',
                  reason: 'Payment confirmed',
                  userId
                });
                break;
              
              case 'PAYMENT_CALLBACK':
                logEntry = await auditLogger.logPaymentCallback({
                  sessionId: 'test-session-id',
                  checkoutRequestID: 'test-checkout-id',
                  resultCode: 0,
                  resultDesc: 'Success',
                  transactionID: 'TEST123456',
                  amount: 5000,
                  phoneNumber: '254712345678'
                });
                break;
              
              case 'PAYMENT_QUERY':
                logEntry = await auditLogger.logPaymentQuery({
                  sessionId: 'test-session-id',
                  checkoutRequestID: 'test-checkout-id',
                  reason: 'Status unclear'
                });
                break;
              
              case 'PAYMENT_RETRY':
                logEntry = await auditLogger.logPaymentRetry({
                  sessionId: 'test-session-id',
                  userId,
                  attemptNumber: 2,
                  previousFailureReason: 'Timeout'
                });
                break;
              
              case 'PAYMENT_FAILURE':
                logEntry = await auditLogger.logPaymentFailure({
                  sessionId: 'test-session-id',
                  userId,
                  reason: 'Insufficient funds',
                  resultCode: 1,
                  checkoutRequestID: 'test-checkout-id'
                });
                break;
            }
            
            // Verify required fields are present
            expect(logEntry).toBeDefined();
            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.timestamp).toBeInstanceOf(Date);
            expect(logEntry.actionType).toBe(actionType);
            
            // Verify action field is present
            expect(logEntry.action).toBeDefined();
            expect(typeof logEntry.action).toBe('string');
            expect(logEntry.action.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include timestamp in ISO format for all log entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 30 }),
          async (userId) => {
            const logEntry = await auditLogger.logPaymentInitiation({
              userId,
              sessionId: 'test-session-id',
              amount: 5000,
              phoneNumber: '254712345678',
              checkoutRequestID: 'test-checkout-id',
              merchantRequestID: 'test-merchant-id'
            });
            
            // Verify timestamp is a valid Date object
            expect(logEntry.timestamp).toBeInstanceOf(Date);
            
            // Verify timestamp is recent (within last minute)
            const now = new Date();
            const timeDiff = now - logEntry.timestamp;
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
            expect(timeDiff).toBeGreaterThanOrEqual(0); // Not in future
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // PROPERTY 67: Payment Initiation Records Required Fields
  // ============================================================================

  describe('Property 67: Payment Initiation Records Required Fields', () => {
    /**
     * Feature: mpesa-payment-integration, Property 67: Payment Initiation Records Required Fields
     * Validates: Requirements 13.2
     * 
     * For any payment initiation, the client ID, session ID, amount, and phone number 
     * should be recorded
     */
    test('should record all required fields for payment initiation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 20, maxLength: 30 }),
            sessionId: fc.string({ minLength: 20, maxLength: 30 }),
            amount: fc.integer({ min: 100, max: 100000 }),
            phoneNumber: fc.tuple(
              fc.constantFrom('2547', '2541'),
              fc.integer({ min: 10000000, max: 99999999 })
            ).map(([prefix, num]) => prefix + String(num)),
            checkoutRequestID: fc.string({ minLength: 10, maxLength: 30 }),
            merchantRequestID: fc.string({ minLength: 10, maxLength: 30 })
          }),
          async (paymentData) => {
            const logEntry = await auditLogger.logPaymentInitiation(paymentData);
            
            // Verify all required fields are present
            expect(logEntry.userId).toBe(paymentData.userId);
            expect(logEntry.sessionId).toBe(paymentData.sessionId);
            expect(logEntry.amount).toBe(paymentData.amount);
            expect(logEntry.checkoutRequestID).toBe(paymentData.checkoutRequestID);
            expect(logEntry.merchantRequestID).toBe(paymentData.merchantRequestID);
            
            // Verify phone number is masked
            expect(logEntry.phoneNumber).toBeDefined();
            expect(logEntry.phoneNumber).toContain('*');
            expect(logEntry.phoneNumber).not.toBe(paymentData.phoneNumber);
            
            // Verify phone number shows last 4 digits
            const lastFour = paymentData.phoneNumber.slice(-4);
            expect(logEntry.phoneNumber).toContain(lastFour);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should mask phone numbers in payment initiation logs', async () => {
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
            
            // Verify phone number is masked
            expect(logEntry.phoneNumber).not.toBe(phoneNumber);
            expect(logEntry.phoneNumber).toContain('*');
            
            // Verify format: 254****XXXX
            expect(logEntry.phoneNumber).toMatch(/^254\*+\d{4}$/);
            
            // Verify last 4 digits are preserved
            const lastFour = phoneNumber.slice(-4);
            expect(logEntry.phoneNumber.endsWith(lastFour)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // PROPERTY 68: Status Change Logs Transition Details
  // ============================================================================

  describe('Property 68: Status Change Logs Transition Details', () => {
    /**
     * Feature: mpesa-payment-integration, Property 68: Status Change Logs Transition Details
     * Validates: Requirements 13.3
     * 
     * For any payment status change, the previous status, new status, and reason 
     * should be recorded
     */
    test('should record status transition details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sessionId: fc.string({ minLength: 20, maxLength: 30 }),
            previousStatus: fc.constantFrom('Pending', 'Processing', 'Approved'),
            newStatus: fc.constantFrom('Processing', 'Paid', 'Failed'),
            reason: fc.string({ minLength: 5, maxLength: 100 }),
            userId: fc.string({ minLength: 20, maxLength: 30 }),
            transactionID: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null }),
            resultCode: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null })
          }),
          async (statusChange) => {
            const logEntry = await auditLogger.logPaymentStatusChange(statusChange);
            
            // Verify all transition details are recorded
            expect(logEntry.sessionId).toBe(statusChange.sessionId);
            expect(logEntry.previousStatus).toBe(statusChange.previousStatus);
            expect(logEntry.newStatus).toBe(statusChange.newStatus);
            expect(logEntry.reason).toBe(statusChange.reason);
            
            // Verify optional fields
            if (statusChange.userId) {
              expect(logEntry.userId).toBe(statusChange.userId);
            }
            
            if (statusChange.transactionID) {
              expect(logEntry.transactionID).toBe(statusChange.transactionID);
            }
            
            if (statusChange.resultCode !== null && statusChange.resultCode !== undefined) {
              expect(logEntry.resultCode).toBe(statusChange.resultCode);
            }
            
            // Verify action describes the transition
            expect(logEntry.action).toContain(statusChange.previousStatus);
            expect(logEntry.action).toContain(statusChange.newStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should log all possible status transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            ['Pending', 'Approved'],
            ['Approved', 'Processing'],
            ['Processing', 'Paid'],
            ['Processing', 'Failed'],
            ['Failed', 'Processing'],
            ['Paid', 'Paid']
          ),
          async ([previousStatus, newStatus]) => {
            const logEntry = await auditLogger.logPaymentStatusChange({
              sessionId: 'test-session-id',
              previousStatus,
              newStatus,
              reason: 'Test transition'
            });
            
            // Verify transition is logged correctly
            expect(logEntry.previousStatus).toBe(previousStatus);
            expect(logEntry.newStatus).toBe(newStatus);
            expect(logEntry.actionType).toBe('PAYMENT_STATUS_CHANGE');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // PROPERTY 69: Admin Access Logs Required Fields
  // ============================================================================

  describe('Property 69: Admin Access Logs Required Fields', () => {
    /**
     * Feature: mpesa-payment-integration, Property 69: Admin Access Logs Required Fields
     * Validates: Requirements 13.4
     * 
     * For any admin access to payment data, the admin ID, accessed data, and timestamp 
     * should be logged
     */
    test('should log all required fields for admin access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminId: fc.string({ minLength: 20, maxLength: 30 }),
            action: fc.constantFrom(
              'View payment dashboard',
              'Download transaction report',
              'View transaction details',
              'Run reconciliation',
              'View audit logs'
            ),
            accessedData: fc.string({ minLength: 10, maxLength: 100 }),
            sessionId: fc.option(fc.string({ minLength: 20, maxLength: 30 }), { nil: null }),
            transactionID: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null }),
            ipAddress: fc.option(
              fc.tuple(
                fc.integer({ min: 1, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 1, max: 255 })
              ).map(parts => parts.join('.')),
              { nil: null }
            )
          }),
          async (adminAccess) => {
            const logEntry = await auditLogger.logAdminAccess(adminAccess);
            
            // Verify all required fields are present
            expect(logEntry.adminId).toBe(adminAccess.adminId);
            expect(logEntry.action).toBe(adminAccess.action);
            expect(logEntry.accessedData).toBe(adminAccess.accessedData);
            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.timestamp).toBeInstanceOf(Date);
            
            // Verify user type is set to admin
            expect(logEntry.userType).toBe('admin');
            
            // Verify optional fields
            if (adminAccess.sessionId) {
              expect(logEntry.sessionId).toBe(adminAccess.sessionId);
            }
            
            if (adminAccess.transactionID) {
              expect(logEntry.transactionID).toBe(adminAccess.transactionID);
            }
            
            if (adminAccess.ipAddress) {
              expect(logEntry.ipAddress).toBe(adminAccess.ipAddress);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should log different types of admin actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'View payment dashboard',
            'Download transaction report',
            'View transaction details',
            'Run reconciliation',
            'View audit logs',
            'Test M-Pesa connection',
            'View failed payments'
          ),
          async (action) => {
            const logEntry = await auditLogger.logAdminAccess({
              adminId: 'test-admin-id',
              action,
              accessedData: `Admin performed: ${action}`
            });
            
            // Verify action is logged
            expect(logEntry.action).toBe(action);
            expect(logEntry.actionType).toBe('ADMIN_ACCESS');
            expect(logEntry.userType).toBe('admin');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // PROPERTY 70: Audit Logs Have Tamper-Evident Format
  // ============================================================================

  describe('Property 70: Audit Logs Have Tamper-Evident Format', () => {
    /**
     * Feature: mpesa-payment-integration, Property 70: Audit Logs Have Tamper-Evident Format
     * Validates: Requirements 13.6
     * 
     * For any audit log request, the logs should be provided in a tamper-evident format
     */
    test('should include hash chain for tamper-evident logging', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 20, maxLength: 30 }),
              sessionId: fc.string({ minLength: 20, maxLength: 30 }),
              amount: fc.integer({ min: 100, max: 100000 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (payments) => {
            const logEntries = [];
            
            // Create multiple log entries
            for (const payment of payments) {
              const logEntry = await auditLogger.logPaymentInitiation({
                ...payment,
                phoneNumber: '254712345678',
                checkoutRequestID: 'test-checkout-id',
                merchantRequestID: 'test-merchant-id'
              });
              logEntries.push(logEntry);
            }
            
            // Verify each log entry has a hash
            logEntries.forEach(entry => {
              expect(entry.logHash).toBeDefined();
              expect(typeof entry.logHash).toBe('string');
              expect(entry.logHash.length).toBe(64); // SHA-256 produces 64 hex chars
              expect(entry.logHash).toMatch(/^[0-9a-f]{64}$/i);
            });
            
            // Verify hash chain (each entry references previous hash)
            for (let i = 1; i < logEntries.length; i++) {
              const currentEntry = logEntries[i];
              const previousEntry = logEntries[i - 1];
              
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

    test('should generate unique hashes for different log entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.record({
              userId: fc.string({ minLength: 20, maxLength: 30 }),
              sessionId: fc.string({ minLength: 20, maxLength: 30 }),
              amount: fc.integer({ min: 100, max: 100000 })
            }),
            fc.record({
              userId: fc.string({ minLength: 20, maxLength: 30 }),
              sessionId: fc.string({ minLength: 20, maxLength: 30 }),
              amount: fc.integer({ min: 100, max: 100000 })
            })
          ).filter(([p1, p2]) => 
            p1.userId !== p2.userId || 
            p1.sessionId !== p2.sessionId || 
            p1.amount !== p2.amount
          ),
          async ([payment1, payment2]) => {
            const logEntry1 = await auditLogger.logPaymentInitiation({
              ...payment1,
              phoneNumber: '254712345678',
              checkoutRequestID: 'test-checkout-id-1',
              merchantRequestID: 'test-merchant-id-1'
            });
            
            const logEntry2 = await auditLogger.logPaymentInitiation({
              ...payment2,
              phoneNumber: '254712345678',
              checkoutRequestID: 'test-checkout-id-2',
              merchantRequestID: 'test-merchant-id-2'
            });
            
            // Different log entries should have different hashes
            expect(logEntry1.logHash).not.toBe(logEntry2.logHash);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should verify log integrity using hash chain', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 20, maxLength: 30 }),
            sessionId: fc.string({ minLength: 20, maxLength: 30 }),
            amount: fc.integer({ min: 100, max: 100000 })
          }),
          async (payment) => {
            const logEntry = await auditLogger.logPaymentInitiation({
              ...payment,
              phoneNumber: '254712345678',
              checkoutRequestID: 'test-checkout-id',
              merchantRequestID: 'test-merchant-id'
            });
            
            // Verify log integrity
            const isValid = auditLogger.verifyLogIntegrity(logEntry, logEntry.previousHash);
            
            // Log should be valid
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should detect tampered log entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 20, maxLength: 30 }),
            sessionId: fc.string({ minLength: 20, maxLength: 30 }),
            amount: fc.integer({ min: 100, max: 100000 })
          }),
          fc.integer({ min: 1000, max: 99999 }), // Different amount for tampering
          async (payment, tamperedAmount) => {
            // Skip if tampered amount is same as original
            if (tamperedAmount === payment.amount) {
              return;
            }
            
            const logEntry = await auditLogger.logPaymentInitiation({
              ...payment,
              phoneNumber: '254712345678',
              checkoutRequestID: 'test-checkout-id',
              merchantRequestID: 'test-merchant-id'
            });
            
            // Tamper with the log entry
            const tamperedEntry = {
              ...logEntry,
              amount: tamperedAmount // Change the amount
            };
            
            // Verify tampered log should fail integrity check
            const isValid = auditLogger.verifyLogIntegrity(tamperedEntry, logEntry.previousHash);
            
            // Tampered log should be invalid
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide tamper-evident format in audit log retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            actionType: fc.option(
              fc.constantFrom(
                'PAYMENT_INITIATION',
                'PAYMENT_STATUS_CHANGE',
                'ADMIN_ACCESS'
              ),
              { nil: undefined }
            ),
            startDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }), { nil: undefined }),
            endDate: fc.option(fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }), { nil: undefined }),
            limit: fc.integer({ min: 10, max: 100 })
          }),
          async (filters) => {
            // Mock AuditLog.find to return sample logs
            const mockLogs = [
              {
                timestamp: new Date(),
                actionType: 'PAYMENT_INITIATION',
                logHash: 'a'.repeat(64),
                previousHash: null
              }
            ];
            
            AuditLog.find = jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  skip: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockLogs)
                  })
                })
              })
            });
            
            AuditLog.countDocuments = jest.fn().mockResolvedValue(mockLogs.length);
            
            // Retrieve audit logs
            const result = await auditLogger.retrieveAuditLogs(filters);
            
            // Verify tamper-evident format information is included
            expect(result.format).toBeDefined();
            expect(result.format).toContain('Tamper-evident');
            expect(result.format).toContain('SHA-256');
            
            // Verify integrity check information
            expect(result.integrityCheck).toBeDefined();
            expect(result.integrityCheck.enabled).toBe(true);
            expect(result.integrityCheck.algorithm).toBe('SHA-256');
            expect(result.integrityCheck.chainVerification).toBeDefined();
            
            // Verify retention policy is documented
            expect(result.retention).toBeDefined();
            expect(result.retention).toContain('7 years');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
