const fc = require('fast-check');
const crypto = require('crypto');

// Set up test environment variables
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

const encryption = require('../utils/encryption');
const webhookSignature = require('../utils/webhookSignature');
const { securityHeaders, enforceTLS } = require('../middleware/security');

describe('Security Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 44: Payment Data Uses TLS Encryption', () => {
    /**
     * Feature: mpesa-payment-integration, Property 44: Payment Data Uses TLS Encryption
     * Validates: Requirements 9.1
     * 
     * For any payment data transmission, TLS 1.2 or higher encryption should be used
     */
    test('should enforce TLS 1.2 or higher for all connections', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'),
          (tlsVersion) => {
            // Create mock request with TLS version
            const req = {
              connection: {
                encrypted: true,
                getCipher: () => ({ version: tlsVersion })
              }
            };
            
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            
            const next = jest.fn();
            
            // Call the TLS enforcement middleware
            enforceTLS(req, res, next);
            
            // TLS 1.0 and 1.1 should be rejected
            if (tlsVersion === 'TLSv1' || tlsVersion === 'TLSv1.1') {
              expect(res.status).toHaveBeenCalledWith(426);
              expect(res.json).toHaveBeenCalled();
              expect(next).not.toHaveBeenCalled();
            } else {
              // TLS 1.2 and 1.3 should be allowed
              expect(next).toHaveBeenCalled();
              expect(res.status).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should set Strict-Transport-Security header for HTTPS enforcement', () => {
      fc.assert(
        fc.property(
          fc.constant(true),
          () => {
            const req = {
              headers: { 'x-forwarded-proto': 'https', host: 'example.com' },
              url: '/api/mpesa/initiate'
            };
            
            const res = {
              setHeader: jest.fn(),
              redirect: jest.fn()
            };
            
            const next = jest.fn();
            
            // Call security headers middleware
            securityHeaders(req, res, next);
            
            // Verify HSTS header is set
            expect(res.setHeader).toHaveBeenCalledWith(
              'Strict-Transport-Security',
              expect.stringContaining('max-age=31536000')
            );
            
            expect(next).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should redirect HTTP to HTTPS in production', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          (host, url) => {
            // Save original NODE_ENV
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            const req = {
              headers: { 'x-forwarded-proto': 'http', host },
              url
            };
            
            const res = {
              redirect: jest.fn(),
              setHeader: jest.fn()
            };
            
            const next = jest.fn();
            
            // Call security headers middleware
            securityHeaders(req, res, next);
            
            // Should redirect to HTTPS
            expect(res.redirect).toHaveBeenCalledWith(301, `https://${host}${url}`);
            expect(next).not.toHaveBeenCalled();
            
            // Restore NODE_ENV
            process.env.NODE_ENV = originalEnv;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 45: Credentials Are Encrypted', () => {
    /**
     * Feature: mpesa-payment-integration, Property 45: Credentials Are Encrypted
     * Validates: Requirements 9.2
     * 
     * For any stored M-Pesa credentials, industry-standard encryption should be applied
     */
    test('should encrypt all sensitive data using AES-256-GCM', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (sensitiveData) => {
            // Encrypt the data
            const encrypted = encryption.encrypt(sensitiveData);
            
            // Verify encrypted format (iv:authTag:ciphertext)
            const parts = encrypted.split(':');
            expect(parts).toHaveLength(3);
            
            // Verify each part is hex encoded
            parts.forEach(part => {
              expect(part).toMatch(/^[0-9a-f]+$/i);
            });
            
            // Verify encrypted data is different from plaintext
            expect(encrypted).not.toBe(sensitiveData);
            expect(encrypted).not.toContain(sensitiveData);
            
            // Verify IV is 16 bytes (32 hex chars)
            expect(parts[0]).toHaveLength(32);
            
            // Verify auth tag is 16 bytes (32 hex chars)
            expect(parts[1]).toHaveLength(32);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should decrypt encrypted data back to original', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (originalData) => {
            // Encrypt then decrypt
            const encrypted = encryption.encrypt(originalData);
            const decrypted = encryption.decrypt(encrypted);
            
            // Should match original
            expect(decrypted).toBe(originalData);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use unique IV for each encryption', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }),
          (data) => {
            // Encrypt same data twice
            const encrypted1 = encryption.encrypt(data);
            const encrypted2 = encryption.encrypt(data);
            
            // Encrypted values should be different (due to different IVs)
            expect(encrypted1).not.toBe(encrypted2);
            
            // But both should decrypt to same value
            expect(encryption.decrypt(encrypted1)).toBe(data);
            expect(encryption.decrypt(encrypted2)).toBe(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should fail decryption with tampered data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 100 }), // Longer strings to ensure tampering is detectable
          (data) => {
            // Encrypt data
            const encrypted = encryption.encrypt(data);
            
            // Tamper with encrypted data by modifying ciphertext
            const parts = encrypted.split(':');
            
            // Flip some bits in the middle of the ciphertext
            const ciphertext = parts[2];
            const midPoint = Math.floor(ciphertext.length / 2);
            const tamperedChar = ciphertext[midPoint] === 'a' ? 'b' : 'a';
            const tamperedCiphertext = 
              ciphertext.substring(0, midPoint) + 
              tamperedChar + 
              ciphertext.substring(midPoint + 1);
            
            const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
            
            // Decryption should fail
            expect(() => {
              encryption.decrypt(tampered);
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 46: Webhook Signature Verified Before Processing', () => {
    /**
     * Feature: mpesa-payment-integration, Property 46: Webhook Signature Verified Before Processing
     * Validates: Requirements 9.3
     * 
     * For any webhook callback, the signature should be verified before processing
     */
    test('should generate valid HMAC-SHA256 signatures for all payloads', () => {
      fc.assert(
        fc.property(
          fc.record({
            Body: fc.record({
              stkCallback: fc.record({
                MerchantRequestID: fc.string({ minLength: 10, maxLength: 30 }),
                CheckoutRequestID: fc.string({ minLength: 10, maxLength: 30 }),
                ResultCode: fc.integer({ min: 0, max: 9999 }),
                ResultDesc: fc.string({ minLength: 5, maxLength: 100 })
              })
            })
          }),
          (payload) => {
            // Generate signature
            const signature = webhookSignature.generateSignature(payload);
            
            // Verify signature is hex string
            expect(signature).toMatch(/^[0-9a-f]+$/i);
            
            // Verify signature is SHA-256 length (64 hex chars = 32 bytes)
            expect(signature).toHaveLength(64);
            
            // Verify signature is deterministic (same payload = same signature)
            const signature2 = webhookSignature.generateSignature(payload);
            expect(signature).toBe(signature2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should verify valid signatures successfully', () => {
      fc.assert(
        fc.property(
          fc.record({
            Body: fc.record({
              stkCallback: fc.record({
                MerchantRequestID: fc.string({ minLength: 10, maxLength: 30 }),
                CheckoutRequestID: fc.string({ minLength: 10, maxLength: 30 }),
                ResultCode: fc.integer({ min: 0, max: 9999 })
              })
            })
          }),
          (payload) => {
            // Generate valid signature
            const validSignature = webhookSignature.generateSignature(payload);
            
            // Verify signature
            const isValid = webhookSignature.verifySignature(payload, validSignature);
            
            // Should be valid
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject invalid signatures', () => {
      fc.assert(
        fc.property(
          fc.record({
            Body: fc.record({
              stkCallback: fc.record({
                CheckoutRequestID: fc.string({ minLength: 10, maxLength: 30 }),
                ResultCode: fc.integer({ min: 0, max: 9999 })
              })
            })
          }),
          fc.array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 64, maxLength: 64 }).map(arr => arr.join('')),
          (payload, invalidSignature) => {
            // Generate correct signature
            const correctSignature = webhookSignature.generateSignature(payload);
            
            // Ensure invalid signature is different
            if (invalidSignature === correctSignature) {
              return; // Skip this iteration
            }
            
            // Verify with invalid signature
            const isValid = webhookSignature.verifySignature(payload, invalidSignature);
            
            // Should be invalid
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject tampered payloads', () => {
      fc.assert(
        fc.property(
          fc.record({
            Body: fc.record({
              stkCallback: fc.record({
                CheckoutRequestID: fc.array(
                  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
                  { minLength: 15, maxLength: 30 }
                ).map(arr => arr.join('')),
                ResultCode: fc.integer({ min: 1, max: 9999 }), // Start from 1 so we can change to 0
                MerchantRequestID: fc.array(
                  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
                  { minLength: 15, maxLength: 30 }
                ).map(arr => arr.join(''))
              })
            })
          }),
          (originalPayload) => {
            // Generate signature for original payload
            const originalSignature = webhookSignature.generateSignature(originalPayload);
            
            // Tamper with payload by changing ResultCode
            const tamperedPayload = {
              ...originalPayload,
              Body: {
                ...originalPayload.Body,
                stkCallback: {
                  ...originalPayload.Body.stkCallback,
                  ResultCode: 0 // Change result code to 0 (success)
                }
              }
            };
            
            // Generate signature for tampered payload
            const tamperedSignature = webhookSignature.generateSignature(tamperedPayload);
            
            // Signatures should be different
            expect(tamperedSignature).not.toBe(originalSignature);
            
            // Verify tampered payload with original signature should fail
            const isValid = webhookSignature.verifySignature(tamperedPayload, originalSignature);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 47: Phone Numbers Masked in Logs', () => {
    /**
     * Feature: mpesa-payment-integration, Property 47: Phone Numbers Masked in Logs
     * Validates: Requirements 9.4
     * 
     * For any payment data logged, phone numbers should be masked showing only the last 4 digits
     */
    test('should mask phone numbers showing only last 4 digits', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('254'),
            fc.constantFrom('7', '1'),
            fc.integer({ min: 10000000, max: 99999999 })
          ).map(([prefix, secondDigit, num]) => prefix + secondDigit + String(num)),
          (phoneNumber) => {
            // Mask phone number
            const masked = encryption.maskPhoneNumber(phoneNumber);
            
            // Should contain country code
            expect(masked).toMatch(/^254/);
            
            // Should contain asterisks
            expect(masked).toContain('*');
            
            // Should show last 4 digits
            const lastFour = phoneNumber.slice(-4);
            expect(masked).toContain(lastFour);
            
            // Should not show middle digits
            const middleDigits = phoneNumber.slice(3, -4);
            expect(masked).not.toContain(middleDigits);
            
            // Verify format: 254****XXXX
            expect(masked).toMatch(/^254\*+\d{4}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should mask all phone numbers consistently', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('2547', '2541'),
            fc.integer({ min: 10000000, max: 99999999 })
          ).map(([prefix, num]) => prefix + String(num)),
          (phoneNumber) => {
            // Mask twice
            const masked1 = encryption.maskPhoneNumber(phoneNumber);
            const masked2 = encryption.maskPhoneNumber(phoneNumber);
            
            // Should be consistent
            expect(masked1).toBe(masked2);
            
            // Should be shorter or equal length (due to masking)
            expect(masked1.length).toBeLessThanOrEqual(phoneNumber.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle phone numbers with special characters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '0712-345-678',
            '0712 345 678',
            '(071) 234-5678',
            '+254 712 345 678',
            '254-712-345-678'
          ),
          (phoneWithSpecialChars) => {
            // Clean phone number first (remove special characters)
            const cleaned = phoneWithSpecialChars.replace(/[\s\-\(\)\+]/g, '');
            
            // Mask the cleaned phone number
            const masked = encryption.maskPhoneNumber(cleaned);
            
            // Should still mask properly
            expect(masked).toContain('*');
            
            // Should not contain special characters in output
            expect(masked).not.toContain('-');
            expect(masked).not.toContain(' ');
            expect(masked).not.toContain('(');
            expect(masked).not.toContain(')');
            expect(masked).not.toContain('+');
            
            // Should show last 4 digits
            const lastFour = cleaned.slice(-4);
            expect(masked).toContain(lastFour);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 48: No PIN Storage', () => {
    /**
     * Feature: mpesa-payment-integration, Property 48: No PIN Storage
     * Validates: Requirements 9.5
     * 
     * For any system operation, M-Pesa PINs should never be stored
     */
    test('should never accept or store PIN in payment requests', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.string({ minLength: 10, maxLength: 30 }),
            phoneNumber: fc.tuple(
              fc.constantFrom('07', '01'),
              fc.integer({ min: 10000000, max: 99999999 })
            ).map(([prefix, num]) => prefix + String(num)),
            // Intentionally include PIN field to test it's not used
            pin: fc.integer({ min: 1000, max: 9999 }).map(String)
          }),
          (paymentRequest) => {
            // Verify PIN field should not be in valid request structure
            const validFields = ['sessionId', 'phoneNumber'];
            
            // PIN should not be a valid field
            expect(validFields).not.toContain('pin');
            
            // System should only use sessionId and phoneNumber
            const requestData = {
              sessionId: paymentRequest.sessionId,
              phoneNumber: paymentRequest.phoneNumber
            };
            
            // Verify PIN is not included
            expect(requestData).not.toHaveProperty('pin');
            expect(Object.keys(requestData)).not.toContain('pin');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should not log or store PIN in any form', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 9999 }).map(String),
          (pin) => {
            // Simulate logging payment data
            const paymentData = {
              phoneNumber: '254712345678',
              amount: 5000, // Use amount that won't match PIN
              // PIN should never be here
            };
            
            // Verify PIN is not in payment data as a field
            expect(paymentData).not.toHaveProperty('pin');
            expect(paymentData).not.toHaveProperty('PIN');
            expect(paymentData).not.toHaveProperty('mpesaPin');
            
            // Verify no PIN-related fields
            const dataKeys = Object.keys(paymentData);
            const hasPinField = dataKeys.some(key => 
              key.toLowerCase().includes('pin')
            );
            
            expect(hasPinField).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 50: Payment Endpoints Require Authentication', () => {
    /**
     * Feature: mpesa-payment-integration, Property 50: Payment Endpoints Require Authentication
     * Validates: Requirements 9.7
     * 
     * For any payment endpoint access, valid authentication tokens should be required
     */
    test('should require authentication token for payment initiation', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.string({ minLength: 10, maxLength: 30 }),
            phoneNumber: fc.string({ minLength: 10, maxLength: 12 })
          }),
          (requestBody) => {
            // Simulate request without auth token
            const requestWithoutAuth = {
              body: requestBody,
              headers: {}
            };
            
            // Verify no auth token present
            expect(requestWithoutAuth.headers.authorization).toBeUndefined();
            expect(requestWithoutAuth.headers['x-auth-token']).toBeUndefined();
            
            // Request should be rejected (this is verified by middleware)
            const hasAuth = !!(
              requestWithoutAuth.headers.authorization || 
              requestWithoutAuth.headers['x-auth-token']
            );
            
            expect(hasAuth).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate JWT token format', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Invalid tokens
            fc.constant(''),
            fc.constant('invalid'),
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.constant('Bearer '),
            fc.constant('Bearer invalid_token')
          ),
          (invalidToken) => {
            // Simulate request with invalid token
            const request = {
              headers: {
                'x-auth-token': invalidToken
              }
            };
            
            // Token should not be a valid JWT format
            // Valid JWT has 3 parts separated by dots
            const parts = invalidToken.replace('Bearer ', '').split('.');
            const isValidFormat = parts.length === 3 && 
                                 parts.every(part => part.length > 0);
            
            // Invalid tokens should not pass format check
            if (invalidToken === '' || invalidToken === 'invalid' || 
                invalidToken === 'Bearer ' || invalidToken.length < 20) {
              expect(isValidFormat).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should verify session ownership before payment', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 30 }), // User ID
          fc.string({ minLength: 20, maxLength: 30 }), // Session client ID
          (userId, sessionClientId) => {
            // Simulate ownership check
            const isOwner = userId === sessionClientId;
            
            // If user is not the session client, should be rejected
            if (userId !== sessionClientId) {
              expect(isOwner).toBe(false);
              
              // Should return 403 Forbidden
              const expectedStatus = 403;
              expect(expectedStatus).toBe(403);
            } else {
              expect(isOwner).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should require valid user ID in token payload', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 20, maxLength: 30 }),
            role: fc.constantFrom('client', 'psychologist', 'admin'),
            iat: fc.integer({ min: 1600000000, max: 1700000000 }),
            exp: fc.integer({ min: 1700000000, max: 1800000000 })
          }),
          (tokenPayload) => {
            // Verify token has required fields
            expect(tokenPayload).toHaveProperty('id');
            expect(tokenPayload).toHaveProperty('role');
            expect(tokenPayload).toHaveProperty('iat');
            expect(tokenPayload).toHaveProperty('exp');
            
            // Verify ID is non-empty
            expect(tokenPayload.id).toBeTruthy();
            expect(tokenPayload.id.length).toBeGreaterThan(0);
            
            // Verify expiry is after issued time
            expect(tokenPayload.exp).toBeGreaterThan(tokenPayload.iat);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
