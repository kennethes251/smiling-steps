const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const emailVerificationService = require('../services/emailVerificationService');
const tokenGenerationService = require('../services/tokenGenerationService');

// Mock services to avoid external dependencies
jest.mock('../services/emailVerificationService');
jest.mock('../services/tokenGenerationService');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware for protected routes
  const mockAuth = (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  };
  
  // Apply mock auth to protected routes
  app.use('/api/email-verification/status', mockAuth);
  app.use('/api/email-verification/cleanup', mockAuth);
  
  app.use('/api/email-verification', require('../routes/emailVerification'));
  return app;
};

describe('Email Verification API', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/email-verification/verify', () => {
    test('should verify valid token successfully', async () => {
      const mockResult = {
        success: true,
        code: 'VERIFIED',
        message: 'Email verified successfully',
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'client',
          isVerified: true,
          accountStatus: 'email_verified'
        }
      };

      emailVerificationService.verifyEmailToken.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 'valid-token-123' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(emailVerificationService.verifyEmailToken).toHaveBeenCalledWith('valid-token-123');
    });

    test('should handle already verified email', async () => {
      const mockResult = {
        success: true,
        code: 'ALREADY_VERIFIED',
        message: 'Email is already verified',
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'client',
          isVerified: true,
          accountStatus: 'email_verified'
        }
      };

      emailVerificationService.verifyEmailToken.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 'already-used-token' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    test('should handle expired token', async () => {
      const mockResult = {
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Verification link has expired. Please request a new one.'
      };

      emailVerificationService.verifyEmailToken.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 'expired-token-123' })
        .expect(400);

      expect(response.body).toEqual(mockResult);
    });

    test('should handle invalid token', async () => {
      const mockResult = {
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired verification token'
      };

      emailVerificationService.verifyEmailToken.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toEqual(mockResult);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Verification token is required'
      });

      expect(emailVerificationService.verifyEmailToken).not.toHaveBeenCalled();
    });

    test('should reject request with invalid token format', async () => {
      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 'short' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Invalid verification token format'
      });

      expect(emailVerificationService.verifyEmailToken).not.toHaveBeenCalled();
    });

    test('should handle non-string token', async () => {
      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 123 })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Verification token is required'
      });
    });

    test('should trim whitespace from token', async () => {
      const mockResult = {
        success: true,
        code: 'VERIFIED',
        message: 'Email verified successfully',
        user: { id: 'user123' }
      };

      emailVerificationService.verifyEmailToken.mockResolvedValue(mockResult);

      await request(app)
        .post('/api/email-verification/verify')
        .send({ token: '  valid-token-123  ' })
        .expect(200);

      expect(emailVerificationService.verifyEmailToken).toHaveBeenCalledWith('valid-token-123');
    });

    test('should handle service errors', async () => {
      emailVerificationService.verifyEmailToken.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/email-verification/verify')
        .send({ token: 'valid-token-123' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server error during email verification'
      });
    });
  });

  describe('POST /api/email-verification/resend', () => {
    test('should resend verification email successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Verification email sent successfully'
      };

      emailVerificationService.resendVerificationEmail.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/email-verification/resend')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(emailVerificationService.resendVerificationEmail).toHaveBeenCalledWith('test@example.com');
    });

    test('should handle user not found', async () => {
      emailVerificationService.resendVerificationEmail.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .post('/api/email-verification/resend')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'No account found with this email address'
      });
    });

    test('should handle already verified email', async () => {
      emailVerificationService.resendVerificationEmail.mockRejectedValue(new Error('Email is already verified'));

      const response = await request(app)
        .post('/api/email-verification/resend')
        .send({ email: 'verified@example.com' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'This email address is already verified'
      });
    });

    test('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/email-verification/resend')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Email address is required'
      });

      expect(emailVerificationService.resendVerificationEmail).not.toHaveBeenCalled();
    });

    test('should handle service errors', async () => {
      emailVerificationService.resendVerificationEmail.mockRejectedValue(new Error('SMTP error'));

      const response = await request(app)
        .post('/api/email-verification/resend')
        .send({ email: 'test@example.com' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Server error while resending verification email'
      });
    });
  });

  describe('GET /api/email-verification/status', () => {
    test('should return verification status for authenticated user', async () => {
      const mockUser = {
        _id: 'user123',
        isVerified: true,
        role: 'client',
        status: 'active'
      };

      // Mock User.findById with select chain
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn().mockReturnValue({ select: mockSelect });

      const response = await request(app)
        .get('/api/email-verification/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        verification: {
          isVerified: true,
          role: 'client',
          status: 'active',
          canAccessDashboard: true
        }
      });

      expect(User.findById).toHaveBeenCalledWith('test-user-id');
      expect(mockSelect).toHaveBeenCalledWith('isVerified role status');
    });

    test('should handle user not found', async () => {
      const mockSelect = jest.fn().mockResolvedValue(null);
      User.findById = jest.fn().mockReturnValue({ select: mockSelect });

      const response = await request(app)
        .get('/api/email-verification/status')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('POST /api/email-verification/cleanup', () => {
    test('should cleanup expired tokens for admin user', async () => {
      const mockAdmin = {
        _id: 'admin123',
        role: 'admin'
      };

      User.findById = jest.fn().mockResolvedValue(mockAdmin);
      emailVerificationService.cleanupExpiredTokens = jest.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/email-verification/cleanup')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Expired verification tokens cleaned up successfully'
      });

      expect(emailVerificationService.cleanupExpiredTokens).toHaveBeenCalled();
    });

    test('should deny access to non-admin users', async () => {
      const mockUser = {
        _id: 'user123',
        role: 'client'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/email-verification/cleanup')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });

      expect(emailVerificationService.cleanupExpiredTokens).not.toHaveBeenCalled();
    });
  });
});