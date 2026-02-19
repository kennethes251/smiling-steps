const tokenGenerationService = require('../services/tokenGenerationService');
const User = require('../models/User');
const crypto = require('crypto');

// Mock User model for testing
jest.mock('../models/User');

describe('Token Generation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Stop automatic cleanup during tests
    tokenGenerationService.stopAutomaticCleanup();
  });

  afterEach(() => {
    // Clean up any intervals
    tokenGenerationService.stopAutomaticCleanup();
  });

  describe('generateSecureToken', () => {
    test('should generate cryptographically secure token', () => {
      const token = tokenGenerationService.generateSecureToken();
      
      // Should be 64 hex characters (32 bytes)
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate unique tokens', () => {
      const token1 = tokenGenerationService.generateSecureToken();
      const token2 = tokenGenerationService.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    test('should use crypto.randomBytes for secure generation', () => {
      const cryptoSpy = jest.spyOn(crypto, 'randomBytes');
      
      tokenGenerationService.generateSecureToken();
      
      expect(cryptoSpy).toHaveBeenCalledWith(32);
      cryptoSpy.mockRestore();
    });
  });

  describe('hashToken', () => {
    test('should hash token using SHA-256', () => {
      const token = 'test-token-123';
      const hash = tokenGenerationService.hashToken(token);
      
      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      
      // Should be deterministic
      const hash2 = tokenGenerationService.hashToken(token);
      expect(hash).toBe(hash2);
    });

    test('should throw error for invalid token', () => {
      expect(() => tokenGenerationService.hashToken(null)).toThrow('Invalid token provided for hashing');
      expect(() => tokenGenerationService.hashToken('')).toThrow('Invalid token provided for hashing');
      expect(() => tokenGenerationService.hashToken(123)).toThrow('Invalid token provided for hashing');
    });
  });

  describe('calculateExpirationTime', () => {
    test('should set expiration to 24 hours from now', () => {
      const before = Date.now();
      const expirationTime = tokenGenerationService.calculateExpirationTime();
      const after = Date.now();
      
      const expectedMin = before + (24 * 60 * 60 * 1000);
      const expectedMax = after + (24 * 60 * 60 * 1000);
      
      expect(expirationTime.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expirationTime.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('createVerificationToken', () => {
    test('should create and store verification token for user', async () => {
      const userId = 'test-user-id';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'client'
      };

      User.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await tokenGenerationService.createVerificationToken(userId);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('user');
      expect(result.token).toHaveLength(64);
      expect(result.user).toBe(mockUser);

      // Verify User.findByIdAndUpdate was called correctly
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          verificationToken: expect.any(String),
          verificationTokenExpires: expect.any(Date)
        }),
        { new: true, select: 'email name role' }
      );
    });

    test('should throw error if user not found', async () => {
      User.findByIdAndUpdate.mockResolvedValue(null);

      await expect(tokenGenerationService.createVerificationToken('invalid-id'))
        .rejects.toThrow('Failed to create verification token: User not found');
    });

    test('should throw error if userId not provided', async () => {
      await expect(tokenGenerationService.createVerificationToken())
        .rejects.toThrow('User ID is required to create verification token');
    });
  });

  describe('validateToken', () => {
    test('should validate correct token', async () => {
      const plainToken = 'valid-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        verificationToken: hashedToken,
        verificationTokenExpires: Date.now() + 1000000
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await tokenGenerationService.validateToken(plainToken);

      expect(result.valid).toBe(true);
      expect(result.user).toBe(mockUser);
      expect(User.findOne).toHaveBeenCalledWith({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: expect.any(Number) }
      });
    });

    test('should detect expired token', async () => {
      const plainToken = 'expired-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        verificationToken: hashedToken,
        verificationTokenExpires: Date.now() - 1000000 // Expired
      };

      User.findOne
        .mockResolvedValueOnce(null) // First call (valid token check)
        .mockResolvedValueOnce(mockUser); // Second call (expired token check)

      const result = await tokenGenerationService.validateToken(plainToken);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('TOKEN_EXPIRED');
      expect(result.user).toBe(mockUser);
    });

    test('should detect invalid token', async () => {
      User.findOne.mockResolvedValue(null);

      const result = await tokenGenerationService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_TOKEN');
    });

    test('should handle invalid token format', async () => {
      const result1 = await tokenGenerationService.validateToken(null);
      const result2 = await tokenGenerationService.validateToken('');
      const result3 = await tokenGenerationService.validateToken(123);

      expect(result1.valid).toBe(false);
      expect(result1.reason).toBe('Invalid token format');
      expect(result2.valid).toBe(false);
      expect(result2.reason).toBe('Invalid token format');
      expect(result3.valid).toBe(false);
      expect(result3.reason).toBe('Invalid token format');
    });
  });

  describe('clearVerificationToken', () => {
    test('should clear verification token from user', async () => {
      const userId = 'test-user-id';
      User.findByIdAndUpdate.mockResolvedValue({ _id: userId });

      const result = await tokenGenerationService.clearVerificationToken(userId);

      expect(result).toBe(true);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        {
          $unset: {
            verificationToken: 1,
            verificationTokenExpires: 1
          }
        }
      );
    });

    test('should return false if user not found', async () => {
      User.findByIdAndUpdate.mockResolvedValue(null);

      const result = await tokenGenerationService.clearVerificationToken('invalid-id');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    test('should clean up expired tokens', async () => {
      const mockResult = { modifiedCount: 5 };
      User.updateMany.mockResolvedValue(mockResult);

      const result = await tokenGenerationService.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(User.updateMany).toHaveBeenCalledWith(
        { verificationTokenExpires: { $lt: expect.any(Number) } },
        {
          $unset: {
            verificationToken: 1,
            verificationTokenExpires: 1
          }
        }
      );
    });

    test('should handle cleanup errors gracefully', async () => {
      User.updateMany.mockRejectedValue(new Error('Database error'));

      const result = await tokenGenerationService.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('getTokenStatistics', () => {
    test('should return token statistics', async () => {
      User.countDocuments
        .mockResolvedValueOnce(10) // Total tokens
        .mockResolvedValueOnce(3); // Expired tokens

      const stats = await tokenGenerationService.getTokenStatistics();

      expect(stats).toEqual({
        totalTokens: 10,
        activeTokens: 7,
        expiredTokens: 3,
        cleanupNeeded: true
      });
    });

    test('should handle statistics errors gracefully', async () => {
      User.countDocuments.mockRejectedValue(new Error('Database error'));

      const stats = await tokenGenerationService.getTokenStatistics();

      expect(stats).toEqual({
        totalTokens: 0,
        activeTokens: 0,
        expiredTokens: 0,
        cleanupNeeded: false,
        error: 'Database error'
      });
    });
  });

  describe('Security Requirements Compliance', () => {
    test('should meet 32-byte token requirement', () => {
      const token = tokenGenerationService.generateSecureToken();
      
      // 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
    });

    test('should meet 24-hour expiration requirement', () => {
      const expirationTime = tokenGenerationService.calculateExpirationTime();
      const now = Date.now();
      const expectedExpiration = now + (24 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(expirationTime.getTime() - expectedExpiration)).toBeLessThan(1000);
    });

    test('should use cryptographically secure random generation', () => {
      const cryptoSpy = jest.spyOn(crypto, 'randomBytes');
      
      tokenGenerationService.generateSecureToken();
      
      expect(cryptoSpy).toHaveBeenCalledWith(32);
      cryptoSpy.mockRestore();
    });

    test('should hash tokens before storage', () => {
      const token = 'test-token';
      const hash = tokenGenerationService.hashToken(token);
      
      // Hash should be different from original token
      expect(hash).not.toBe(token);
      // Hash should be SHA-256 (64 hex characters)
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});