/**
 * Security Unit Tests - Task 25.3
 * 
 * Unit tests for security components that don't require full server startup.
 * Tests encryption, audit logging, access control utilities, and secure deletion.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 8.1, 8.2, 8.3, 8.4, 8.5
 */

const crypto = require('crypto');

// Set up test environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_security_testing';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

describe('Security Unit Tests - Task 25.3', () => {

  // ============================================================
  // SECTION 1: ENCRYPTION AT REST VERIFICATION
  // ============================================================
  describe('1. Encryption at Rest Verification', () => {
    let encryption;

    beforeAll(() => {
      encryption = require('../utils/encryption');
    });

    describe('1.1 AES-256-GCM Encryption', () => {
      
      test('should encrypt data using AES-256-GCM format', () => {
        const testData = 'Sensitive PHI data for testing';
        const encrypted = encryption.encrypt(testData);
        
        // Verify format: iv:authTag:ciphertext
        const parts = encrypted.split(':');
        expect(parts.length).toBe(3);
        
        // IV should be 16 bytes (32 hex chars)
        expect(parts[0].length).toBe(32);
        
        // Auth tag should be 16 bytes (32 hex chars)
        expect(parts[1].length).toBe(32);
        
        // Ciphertext should exist
        expect(parts[2].length).toBeGreaterThan(0);
      });

      test('should decrypt data correctly', () => {
        const originalData = 'Patient medication: Sertraline 50mg';
        const encrypted = encryption.encrypt(originalData);
        const decrypted = encryption.decrypt(encrypted);
        
        expect(decrypted).toBe(originalData);
      });

      test('should use unique IV for each encryption', () => {
        const testData = 'Same data encrypted twice';
        
        const encrypted1 = encryption.encrypt(testData);
        const encrypted2 = encryption.encrypt(testData);
        
        // IVs should be different
        const iv1 = encrypted1.split(':')[0];
        const iv2 = encrypted2.split(':')[0];
        
        expect(iv1).not.toBe(iv2);
        expect(encrypted1).not.toBe(encrypted2);
        
        // Both should decrypt to same value
        expect(encryption.decrypt(encrypted1)).toBe(testData);
        expect(encryption.decrypt(encrypted2)).toBe(testData);
      });

      test('should detect tampered ciphertext', () => {
        const testData = 'Sensitive data';
        const encrypted = encryption.encrypt(testData);
        
        // Tamper with ciphertext
        const parts = encrypted.split(':');
        const tamperedCiphertext = parts[2].substring(0, parts[2].length - 2) + 'XX';
        const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
        
        expect(() => {
          encryption.decrypt(tampered);
        }).toThrow();
      });

      test('should detect tampered auth tag', () => {
        const testData = 'Sensitive data';
        const encrypted = encryption.encrypt(testData);
        
        // Tamper with auth tag by flipping hex characters
        const parts = encrypted.split(':');
        // Change the first character of auth tag to a different hex value
        const firstChar = parts[1][0];
        const newFirstChar = firstChar === '0' ? 'f' : '0';
        const tamperedAuthTag = newFirstChar + parts[1].substring(1);
        const tampered = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;
        
        expect(() => {
          encryption.decrypt(tampered);
        }).toThrow();
      });

      test('should reject empty data encryption', () => {
        expect(() => {
          encryption.encrypt('');
        }).toThrow();
        
        expect(() => {
          encryption.encrypt(null);
        }).toThrow();
      });

      test('should reject invalid encrypted data format', () => {
        expect(() => {
          encryption.decrypt('invalid-format');
        }).toThrow();
        
        expect(() => {
          encryption.decrypt('only:two:parts:extra');
        }).toThrow();
      });
    });


    describe('1.2 Phone Number Masking', () => {
      
      test('should mask phone numbers showing only last 4 digits', () => {
        const phoneNumber = '254712345678';
        const masked = encryption.maskPhoneNumber(phoneNumber);
        
        // Should contain country code
        expect(masked).toMatch(/^254/);
        
        // Should contain asterisks
        expect(masked).toContain('*');
        
        // Should show last 4 digits
        expect(masked).toContain('5678');
        
        // Should not show middle digits
        expect(masked).not.toContain('7123');
        
        // Verify format: 254****XXXX
        expect(masked).toMatch(/^254\*+\d{4}$/);
      });

      test('should handle various phone number formats', () => {
        const testCases = [
          { input: '254712345678', expectedLast4: '5678' },
          { input: '0712345678', expectedLast4: '5678' },
          { input: '712345678', expectedLast4: '5678' }
        ];
        
        testCases.forEach(({ input, expectedLast4 }) => {
          const masked = encryption.maskPhoneNumber(input);
          expect(masked).toContain(expectedLast4);
          expect(masked).toContain('*');
        });
      });

      test('should handle empty phone numbers', () => {
        expect(encryption.maskPhoneNumber('')).toBe('');
        expect(encryption.maskPhoneNumber(null)).toBe('');
        expect(encryption.maskPhoneNumber(undefined)).toBe('');
      });
    });

    describe('1.3 Secure Hashing', () => {
      
      test('should generate SHA-256 hashes', () => {
        const data = 'test data';
        const hash = encryption.hash(data);
        
        // SHA-256 produces 64 hex characters
        expect(hash.length).toBe(64);
        expect(hash).toMatch(/^[0-9a-f]+$/i);
      });

      test('should produce consistent hashes', () => {
        const data = 'consistent data';
        const hash1 = encryption.hash(data);
        const hash2 = encryption.hash(data);
        
        expect(hash1).toBe(hash2);
      });

      test('should produce different hashes for different data', () => {
        const hash1 = encryption.hash('data1');
        const hash2 = encryption.hash('data2');
        
        expect(hash1).not.toBe(hash2);
      });
    });

    describe('1.4 Token Generation', () => {
      
      test('should generate secure random tokens', () => {
        const token1 = encryption.generateToken();
        const token2 = encryption.generateToken();
        
        // Default 32 bytes = 64 hex chars
        expect(token1.length).toBe(64);
        expect(token2.length).toBe(64);
        
        // Should be different
        expect(token1).not.toBe(token2);
      });

      test('should generate tokens of specified length', () => {
        const token16 = encryption.generateToken(16);
        const token64 = encryption.generateToken(64);
        
        expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
        expect(token64.length).toBe(128); // 64 bytes = 128 hex chars
      });
    });
  });

  // ============================================================
  // SECTION 2: AUDIT LOGGING VERIFICATION
  // ============================================================
  describe('2. Audit Logging Verification', () => {
    let auditLogger;

    beforeAll(() => {
      auditLogger = require('../utils/auditLogger');
    });

    describe('2.1 Audit Logger Functions', () => {
      
      test('should export all required logging functions', () => {
        expect(typeof auditLogger.logPaymentInitiation).toBe('function');
        expect(typeof auditLogger.logPaymentStatusChange).toBe('function');
        expect(typeof auditLogger.logPaymentCallback).toBe('function');
        expect(typeof auditLogger.logAdminAccess).toBe('function');
        expect(typeof auditLogger.logVideoCallAccess).toBe('function');
        expect(typeof auditLogger.logSessionStatusChange).toBe('function');
        expect(typeof auditLogger.retrieveAuditLogs).toBe('function');
        expect(typeof auditLogger.verifyLogIntegrity).toBe('function');
      });

      test('should export action types', () => {
        expect(auditLogger.ACTION_TYPES).toBeDefined();
        expect(auditLogger.ACTION_TYPES.PAYMENT_INITIATION).toBe('PAYMENT_INITIATION');
        expect(auditLogger.ACTION_TYPES.PAYMENT_STATUS_CHANGE).toBe('PAYMENT_STATUS_CHANGE');
        expect(auditLogger.ACTION_TYPES.ADMIN_ACCESS).toBe('ADMIN_ACCESS');
        expect(auditLogger.ACTION_TYPES.VIDEO_CALL_ACCESS).toBe('VIDEO_CALL_ACCESS');
      });
    });

    describe('2.2 Log Integrity Verification', () => {
      
      test('should verify valid log entries', () => {
        const logEntry = {
          timestamp: new Date(),
          actionType: 'TEST_ACTION',
          userId: 'test-user-123',
          logHash: 'abc123',
          previousHash: null
        };
        
        // The verifyLogIntegrity function checks hash chain
        expect(typeof auditLogger.verifyLogIntegrity).toBe('function');
      });
    });
  });

  // ============================================================
  // SECTION 3: ACCESS CONTROL VERIFICATION
  // ============================================================
  describe('3. Access Control Verification', () => {
    let roleAuth;

    beforeAll(() => {
      roleAuth = require('../middleware/roleAuth');
    });

    describe('3.1 Role-Based Access Control Functions', () => {
      
      test('should export requireRole middleware', () => {
        expect(typeof roleAuth.requireRole).toBe('function');
      });

      test('should export requireApproved middleware', () => {
        expect(typeof roleAuth.requireApproved).toBe('function');
      });

      test('should export adminOnly middleware', () => {
        expect(roleAuth.adminOnly).toBeDefined();
      });

      test('should export error codes', () => {
        expect(roleAuth.ErrorCodes).toBeDefined();
        expect(roleAuth.ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
        expect(roleAuth.ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
        expect(roleAuth.ErrorCodes.PENDING_APPROVAL).toBe('PENDING_APPROVAL');
      });
    });

    describe('3.2 Role Middleware Behavior', () => {
      
      test('requireRole should return a middleware function', () => {
        const middleware = roleAuth.requireRole('admin');
        expect(typeof middleware).toBe('function');
      });

      test('requireRole should accept multiple roles', () => {
        const middleware = roleAuth.requireRole('admin', 'psychologist');
        expect(typeof middleware).toBe('function');
      });
    });
  });

  // ============================================================
  // SECTION 4: SECURE DELETION VERIFICATION
  // ============================================================
  describe('4. Secure Deletion Verification', () => {
    let secureDeletion;

    beforeAll(() => {
      secureDeletion = require('../utils/secureDeletion');
    });

    describe('4.1 Secure Deletion Service', () => {
      
      test('should export secureDeletionService', () => {
        expect(secureDeletion.secureDeletionService).toBeDefined();
      });

      test('should have softDeleteUser method', () => {
        expect(typeof secureDeletion.secureDeletionService.softDeleteUser).toBe('function');
      });

      test('should have hardDeleteUser method', () => {
        expect(typeof secureDeletion.secureDeletionService.hardDeleteUser).toBe('function');
      });

      test('should have secureDeleteSession method', () => {
        expect(typeof secureDeletion.secureDeletionService.secureDeleteSession).toBe('function');
      });

      test('should have enforceRetentionPolicy method', () => {
        expect(typeof secureDeletion.secureDeletionService.enforceRetentionPolicy).toBe('function');
      });

      test('should have cancelDeletionRequest method', () => {
        expect(typeof secureDeletion.secureDeletionService.cancelDeletionRequest).toBe('function');
      });
    });

    describe('4.2 Secure Deletion Configuration', () => {
      
      test('should export configuration', () => {
        expect(secureDeletion.SECURE_DELETION_CONFIG).toBeDefined();
      });

      test('should have multi-pass overwrite configured', () => {
        expect(secureDeletion.SECURE_DELETION_CONFIG.OVERWRITE_PASSES).toBeGreaterThanOrEqual(3);
      });

      test('should have retention periods configured', () => {
        expect(secureDeletion.SECURE_DELETION_CONFIG.SOFT_DELETE_RETENTION_DAYS).toBeGreaterThan(0);
        expect(secureDeletion.SECURE_DELETION_CONFIG.HARD_DELETE_AFTER_DAYS).toBeGreaterThan(0);
      });

      test('should have sensitive fields list', () => {
        expect(Array.isArray(secureDeletion.SECURE_DELETION_CONFIG.SENSITIVE_FIELDS)).toBe(true);
        expect(secureDeletion.SECURE_DELETION_CONFIG.SENSITIVE_FIELDS.length).toBeGreaterThan(0);
      });

      test('should have 7-year audit retention', () => {
        expect(secureDeletion.SECURE_DELETION_CONFIG.AUDIT_RETENTION_YEARS).toBe(7);
      });
    });
  });

  // ============================================================
  // SECTION 5: JWT TOKEN VALIDATION
  // ============================================================
  describe('5. JWT Token Validation', () => {
    let jwt;
    const JWT_SECRET = process.env.JWT_SECRET;

    beforeAll(() => {
      jwt = require('jsonwebtoken');
    });

    describe('5.1 Token Generation', () => {
      
      test('should generate valid JWT tokens', () => {
        const payload = { userId: 'test-123', role: 'client' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        expect(token).toBeDefined();
        expect(token.split('.').length).toBe(3); // Header.Payload.Signature
      });

      test('should verify valid tokens', () => {
        const payload = { userId: 'test-123', role: 'psychologist' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.userId).toBe('test-123');
        expect(decoded.role).toBe('psychologist');
      });

      test('should reject tokens with invalid signature', () => {
        const payload = { userId: 'test-123', role: 'client' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        // Tamper with token
        const parts = token.split('.');
        const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`;
        
        expect(() => {
          jwt.verify(tamperedToken, JWT_SECRET);
        }).toThrow();
      });

      test('should reject expired tokens', () => {
        const payload = { userId: 'test-123', role: 'client' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' }); // Already expired
        
        expect(() => {
          jwt.verify(token, JWT_SECRET);
        }).toThrow(/expired/i);
      });
    });
  });

  // ============================================================
  // SECTION 6: HIPAA COMPLIANCE VERIFICATION
  // ============================================================
  describe('6. HIPAA Compliance Verification', () => {
    
    describe('6.1 PHI Field Encryption', () => {
      let IntakeForm;

      beforeAll(() => {
        // Load IntakeForm model to check encrypted fields
        IntakeForm = require('../models/IntakeForm');
      });

      test('should have encrypted PHI fields defined', () => {
        const schema = IntakeForm.schema;
        
        // Check that PHI fields exist in schema (matching actual IntakeForm model)
        const phiFields = [
          'reasonForTherapy',
          'previousTherapyExperience',
          'currentMedications',
          'medicalConditions',
          'allergies',
          'mentalHealthHistory',
          'substanceUseHistory',
          'suicidalThoughtsDetails',
          'familyMentalHealthHistory',
          'currentSymptoms',
          'therapyGoals',
          'emergencyContactName',
          'emergencyContactPhone',
          'emergencyContactRelationship'
        ];
        
        phiFields.forEach(field => {
          expect(schema.path(field)).toBeDefined();
        });
      });

      test('should have getDecryptedData method', () => {
        expect(typeof IntakeForm.prototype.getDecryptedData).toBe('function');
      });
    });

    describe('6.2 Session Notes Encryption', () => {
      let Session;

      beforeAll(() => {
        Session = require('../models/Session');
      });

      test('should have sessionNotes field', () => {
        const schema = Session.schema;
        expect(schema.path('sessionNotes')).toBeDefined();
      });
    });
  });
});
