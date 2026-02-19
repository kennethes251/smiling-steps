const fc = require('fast-check');
const tokenGenerationService = require('../services/tokenGenerationService');
const crypto = require('crypto');

/**
 * Property-Based Tests for Token Generation Service
 * 
 * These tests validate that the token generation service maintains
 * security properties across all possible inputs and scenarios.
 */

describe('Token Generation Service - Property-Based Tests', () => {
  beforeEach(() => {
    // Stop automatic cleanup during tests
    tokenGenerationService.stopAutomaticCleanup();
  });

  afterEach(() => {
    tokenGenerationService.stopAutomaticCleanup();
  });

  describe('Property 1: Token Generation Security', () => {
    test('should always generate cryptographically secure tokens', () => {
      /**
       * **Feature: user-registration-verification, Property 1: Token Generation Security**
       * 
       * For any number of token generation requests, all generated tokens should:
       * - Be exactly 64 hex characters (32 bytes)
       * - Be unique from each other
       * - Use only valid hexadecimal characters
       * - Be cryptographically secure (use crypto.randomBytes)
       * 
       * **Validates: Requirements 8.3**
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // Number of tokens to generate
          (tokenCount) => {
            const tokens = new Set();
            const cryptoSpy = jest.spyOn(crypto, 'randomBytes');
            
            try {
              // Generate multiple tokens
              for (let i = 0; i < tokenCount; i++) {
                const token = tokenGenerationService.generateSecureToken();
                
                // Token should be exactly 64 hex characters (32 bytes)
                expect(token).toHaveLength(64);
                expect(token).toMatch(/^[a-f0-9]{64}$/);
                
                // Token should be unique
                expect(tokens.has(token)).toBe(false);
                tokens.add(token);
              }
              
              // Should use crypto.randomBytes for each token
              expect(cryptoSpy).toHaveBeenCalledTimes(tokenCount);
              expect(cryptoSpy).toHaveBeenCalledWith(32);
              
              return true;
            } finally {
              cryptoSpy.mockRestore();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2: Token Hashing Consistency', () => {
    test('should consistently hash identical tokens to same value', () => {
      /**
       * **Feature: user-registration-verification, Property 2: Token Hashing Consistency**
       * 
       * For any valid token string, hashing it multiple times should always
       * produce the same hash value (deterministic hashing).
       * 
       * **Validates: Requirements 8.3**
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // Various token strings
          (token) => {
            const hash1 = tokenGenerationService.hashToken(token);
            const hash2 = tokenGenerationService.hashToken(token);
            const hash3 = tokenGenerationService.hashToken(token);
            
            // All hashes should be identical
            expect(hash1).toBe(hash2);
            expect(hash2).toBe(hash3);
            
            // Hash should be SHA-256 format (64 hex characters)
            expect(hash1).toHaveLength(64);
            expect(hash1).toMatch(/^[a-f0-9]{64}$/);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Token Hashing Uniqueness', () => {
    test('should produce different hashes for different tokens', () => {
      /**
       * **Feature: user-registration-verification, Property 3: Token Hashing Uniqueness**
       * 
       * For any two different token strings, their hashes should be different
       * (collision resistance).
       * 
       * **Validates: Requirements 8.3**
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (token1, token2) => {
            // Skip if tokens are identical
            fc.pre(token1 !== token2);
            
            const hash1 = tokenGenerationService.hashToken(token1);
            const hash2 = tokenGenerationService.hashToken(token2);
            
            // Different tokens should produce different hashes
            expect(hash1).not.toBe(hash2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Expiration Time Consistency', () => {
    test('should always set expiration to 24 hours from generation time', () => {
      /**
       * **Feature: user-registration-verification, Property 4: Expiration Time Consistency**
       * 
       * For any token generation request, the expiration time should always
       * be exactly 24 hours (86400000 milliseconds) from the generation time.
       * 
       * **Validates: Requirements 3.2**
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of expiration calculations
          (iterations) => {
            const expectedDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            for (let i = 0; i < iterations; i++) {
              const beforeTime = Date.now();
              const expirationTime = tokenGenerationService.calculateExpirationTime();
              const afterTime = Date.now();
              
              const actualDuration = expirationTime.getTime() - beforeTime;
              const maxDuration = expirationTime.getTime() - afterTime;
              
              // Duration should be very close to 24 hours (within test execution time)
              expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration);
              expect(maxDuration).toBeLessThanOrEqual(expectedDuration);
              
              // Allow small tolerance for test execution time (max 1 second)
              expect(actualDuration - expectedDuration).toBeLessThan(1000);
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 5: Token Validation Security', () => {
    test('should securely validate tokens without exposing internal state', () => {
      /**
       * **Feature: user-registration-verification, Property 5: Token Validation Security**
       * 
       * For any token validation attempt, the validation should:
       * - Never expose the stored hash
       * - Always return consistent validation results for the same token
       * - Handle invalid inputs gracefully
       * 
       * **Validates: Requirements 3.1, 3.3**
       */
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 64, maxLength: 64 }), // Valid length tokens
            fc.string({ minLength: 1, maxLength: 63 }),   // Invalid length tokens
            fc.string({ minLength: 65, maxLength: 100 }), // Invalid length tokens
            fc.constant(null),                            // Null tokens
            fc.constant(''),                              // Empty tokens
            fc.integer()                                  // Non-string tokens
          ),
          async (token) => {
            const result1 = await tokenGenerationService.validateToken(token);
            const result2 = await tokenGenerationService.validateToken(token);
            
            // Results should be consistent
            expect(result1.valid).toBe(result2.valid);
            expect(result1.reason).toBe(result2.reason);
            
            // Should always return an object with 'valid' property
            expect(result1).toHaveProperty('valid');
            expect(typeof result1.valid).toBe('boolean');
            
            // Should handle invalid inputs gracefully
            if (token === null || token === '' || typeof token !== 'string') {
              expect(result1.valid).toBe(false);
              expect(result1.reason).toBe('Invalid token format');
            }
            
            // Should never expose internal hash values
            expect(result1).not.toHaveProperty('hash');
            expect(result1).not.toHaveProperty('storedToken');
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6: Token Cleanup Safety', () => {
    test('should safely handle cleanup operations without data corruption', () => {
      /**
       * **Feature: user-registration-verification, Property 6: Token Cleanup Safety**
       * 
       * For any cleanup operation, the service should:
       * - Never throw unhandled exceptions
       * - Always return a non-negative number
       * - Handle database errors gracefully
       * 
       * **Validates: Requirements 8.4**
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of cleanup attempts
          async (cleanupAttempts) => {
            for (let i = 0; i < cleanupAttempts; i++) {
              const result = await tokenGenerationService.cleanupExpiredTokens();
              
              // Should always return a non-negative number
              expect(typeof result).toBe('number');
              expect(result).toBeGreaterThanOrEqual(0);
              
              // Should not throw exceptions
              expect(result).toBeDefined();
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 7: Hash Input Validation', () => {
    test('should properly validate hash inputs and reject invalid ones', () => {
      /**
       * **Feature: user-registration-verification, Property 7: Hash Input Validation**
       * 
       * For any input to the hash function, it should:
       * - Accept valid string inputs
       * - Reject null, undefined, empty, or non-string inputs
       * - Provide clear error messages for invalid inputs
       * 
       * **Validates: Requirements 8.3**
       */
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1 }),  // Valid strings
            fc.constant(null),            // Null
            fc.constant(undefined),       // Undefined
            fc.constant(''),              // Empty string
            fc.integer(),                 // Numbers
            fc.boolean(),                 // Booleans
            fc.array(fc.string()),        // Arrays
            fc.object()                   // Objects
          ),
          (input) => {
            if (typeof input === 'string' && input.length > 0) {
              // Valid input should work
              const hash = tokenGenerationService.hashToken(input);
              expect(hash).toHaveLength(64);
              expect(hash).toMatch(/^[a-f0-9]{64}$/);
            } else {
              // Invalid input should throw error
              expect(() => tokenGenerationService.hashToken(input))
                .toThrow('Invalid token provided for hashing');
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});