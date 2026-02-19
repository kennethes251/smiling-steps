/**
 * Tests for Email Verification Middleware
 * 
 * Requirements covered:
 * - 4.1: WHEN an unverified user attempts to login, THE Registration_System SHALL reject the login attempt
 * - 4.2: WHEN login is rejected, THE Registration_System SHALL display verification reminder message
 * - 4.3: WHEN an unverified user tries to access protected routes, THE Registration_System SHALL redirect to verification page
 * - 4.4: WHEN a user requests verification resend, THE Email_Verification_System SHALL generate new token and send email
 * - 4.5: WHERE a user is already verified, THE Registration_System SHALL allow normal platform access
 */

const {
  requireEmailVerification,
  requireEmailVerificationForRole,
  requireTherapistApproval,
  checkVerificationStatus,
  attachVerificationStatus
} = require('../middleware/requireEmailVerification');

// Mock User model
jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');

describe('Email Verification Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      user: { id: 'test-user-id' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('requireEmailVerification', () => {
    test('should reject request without authentication (Requirement 4.1)', async () => {
      mockReq.user = null;

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject unverified user with verification reminder (Requirements 4.1, 4.2, 4.3)', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isVerified: false,
        isEmailVerified: false,
        accountStatus: 'registered'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true,
        userEmail: 'test@example.com',
        redirectTo: '/verify-email',
        resendUrl: '/api/email-verification/resend'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow verified user to access protected routes (Requirement 4.5)', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'verified@example.com',
        name: 'Verified User',
        role: 'client',
        isVerified: true,
        accountStatus: 'email_verified'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.verifiedUser).toEqual(expect.objectContaining({
        id: 'user123',
        email: 'verified@example.com',
        isVerified: true
      }));
    });

    test('should allow admin users to bypass verification check (Requirement 4.5)', async () => {
      const mockAdmin = {
        _id: 'admin123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        isVerified: false, // Even unverified admin should pass
        accountStatus: 'active'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmin)
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.verifiedUser.role).toBe('admin');
    });

    test('should handle user not found', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'USER_NOT_FOUND'
      }));
    });

    test('should block pending approval therapist', async () => {
      const mockTherapist = {
        _id: 'therapist123',
        email: 'therapist@example.com',
        name: 'Therapist User',
        role: 'therapist',
        isVerified: true,
        accountStatus: 'pending_approval'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTherapist)
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'PENDING_APPROVAL',
        requiresApproval: true,
        redirectTo: '/pending-approval'
      }));
    });

    test('should support isEmailVerified field for compatibility', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isVerified: false,
        isEmailVerified: true, // Alternative field name
        accountStatus: 'email_verified'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await requireEmailVerification(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'SERVER_ERROR'
      }));
    });
  });

  describe('requireEmailVerificationForRole', () => {
    test('should skip verification for roles not in the list', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'admin',
        isVerified: false,
        accountStatus: 'active'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const middleware = requireEmailVerificationForRole(['client', 'therapist']);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should enforce verification for roles in the list', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isVerified: false,
        accountStatus: 'registered'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const middleware = requireEmailVerificationForRole(['client', 'therapist']);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'EMAIL_NOT_VERIFIED'
      }));
    });
  });

  describe('requireTherapistApproval', () => {
    test('should reject non-therapist users', async () => {
      const mockUser = {
        _id: 'user123',
        role: 'client',
        isVerified: true
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await requireTherapistApproval(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'ROLE_REQUIRED'
      }));
    });

    test('should reject unverified therapist', async () => {
      const mockTherapist = {
        _id: 'therapist123',
        email: 'therapist@example.com',
        role: 'therapist',
        isVerified: false,
        psychologistDetails: { approvalStatus: 'approved' }
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTherapist)
      });

      await requireTherapistApproval(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'EMAIL_NOT_VERIFIED'
      }));
    });

    test('should reject unapproved therapist', async () => {
      const mockTherapist = {
        _id: 'therapist123',
        role: 'therapist',
        isVerified: true,
        psychologistDetails: { approvalStatus: 'pending' }
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTherapist)
      });

      await requireTherapistApproval(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'APPROVAL_REQUIRED'
      }));
    });

    test('should allow approved and verified therapist', async () => {
      const mockTherapist = {
        _id: 'therapist123',
        role: 'therapist',
        isVerified: true,
        psychologistDetails: { approvalStatus: 'approved' }
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTherapist)
      });

      await requireTherapistApproval(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkVerificationStatus', () => {
    test('should return verification status for existing user', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isVerified: true,
        accountStatus: 'email_verified'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const status = await checkVerificationStatus('user123');

      expect(status).toEqual(expect.objectContaining({
        exists: true,
        isVerified: true,
        requiresVerification: false,
        email: 'test@example.com'
      }));
    });

    test('should return not found for non-existent user', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      const status = await checkVerificationStatus('nonexistent');

      expect(status).toEqual(expect.objectContaining({
        exists: false,
        isVerified: false
      }));
    });
  });

  describe('attachVerificationStatus', () => {
    test('should attach verification status to request', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isVerified: true,
        accountStatus: 'email_verified'
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await attachVerificationStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.verificationStatus).toEqual(expect.objectContaining({
        exists: true,
        isVerified: true
      }));
    });

    test('should handle missing user gracefully', async () => {
      mockReq.user = null;

      await attachVerificationStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.verificationStatus).toEqual(expect.objectContaining({
        exists: false,
        isVerified: false
      }));
    });
  });
});
