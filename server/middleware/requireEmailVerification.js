const User = require('../models/User');

/**
 * Middleware to ensure user has verified their email before accessing protected routes
 * 
 * Requirements covered:
 * - 4.1: WHEN an unverified user attempts to login, THE Registration_System SHALL reject the login attempt
 * - 4.2: WHEN login is rejected, THE Registration_System SHALL display verification reminder message
 * - 4.3: WHEN an unverified user tries to access protected routes, THE Registration_System SHALL redirect to verification page
 * - 4.4: WHEN a user requests verification resend, THE Email_Verification_System SHALL generate new token and send email
 * - 4.5: WHERE a user is already verified, THE Registration_System SHALL allow normal platform access
 */
const requireEmailVerification = async (req, res, next) => {
  try {
    // Ensure auth middleware has run first
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        requiresVerification: false
      });
    }

    // Get user from database to check current verification status
    // Check both isVerified and isEmailVerified for compatibility
    const user = await User.findById(req.user.id).select('isVerified isEmailVerified accountStatus role email name');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        requiresVerification: false
      });
    }

    // Admin users bypass verification check (Requirement 4.5 - admin exception)
    if (user.role === 'admin') {
      req.verifiedUser = {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: true,
        accountStatus: user.accountStatus || 'active'
      };
      return next();
    }

    // Check if email is verified (support both field names for compatibility)
    const isEmailVerified = user.isVerified || user.isEmailVerified;
    
    if (!isEmailVerified) {
      // Requirement 4.2 & 4.3: Display verification reminder and redirect
      console.log(`🔒 Access denied for unverified user: ${user.email}`);
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required. Please check your email and verify your account.',
        requiresVerification: true,
        userEmail: user.email,
        userName: user.name,
        redirectTo: '/verify-email',
        resendUrl: '/api/email-verification/resend',
        instructions: 'Click the verification link in your email or request a new verification email.'
      });
    }

    // For therapists/psychologists, also check if they're approved
    if ((user.role === 'therapist' || user.role === 'psychologist') && 
        user.accountStatus === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: 'Your therapist application is pending approval. You will be notified once approved.',
        requiresApproval: true,
        accountStatus: user.accountStatus,
        redirectTo: '/pending-approval'
      });
    }

    // Requirement 4.5: Allow normal platform access for verified users
    req.verifiedUser = {
      id: user._id,
      email: user.email,
      role: user.role,
      isVerified: isEmailVerified,
      accountStatus: user.accountStatus
    };

    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Server error while checking verification status'
    });
  }
};

/**
 * Middleware variant that only checks verification for specific roles
 * Useful for routes that should only enforce verification for certain user types
 */
const requireEmailVerificationForRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Ensure auth middleware has run first
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          message: 'Authentication required'
        });
      }

      const user = await User.findById(req.user.id).select('isVerified isEmailVerified accountStatus role email name');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      // If user's role is not in the specified roles, skip verification check
      if (roles.length > 0 && !roles.includes(user.role)) {
        req.verifiedUser = {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified || user.isEmailVerified,
          accountStatus: user.accountStatus
        };
        return next();
      }

      // Apply verification check for specified roles
      return requireEmailVerification(req, res, next);
    } catch (error) {
      console.error('Role-based verification middleware error:', error);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server error while checking verification status'
      });
    }
  };
};

/**
 * Middleware to check if user can access therapist features
 * Requires both email verification and admin approval
 */
const requireTherapistApproval = async (req, res, next) => {
  try {
    // Ensure auth middleware has run first
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id).select('role accountStatus isVerified isEmailVerified psychologistDetails.approvalStatus email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (user.role !== 'therapist' && user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        code: 'ROLE_REQUIRED',
        message: 'Access denied. Therapist role required.'
      });
    }

    // First check email verification
    const isEmailVerified = user.isVerified || user.isEmailVerified;
    if (!isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required before accessing therapist features.',
        requiresVerification: true,
        userEmail: user.email,
        redirectTo: '/verify-email'
      });
    }

    // Check if therapist is approved
    const approvalStatus = user.psychologistDetails?.approvalStatus || 'pending';
    
    if (approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        code: 'APPROVAL_REQUIRED',
        message: 'Therapist approval required. Please submit your credentials and wait for approval.',
        requiresApproval: true,
        approvalStatus,
        redirectTo: '/therapist/submit-credentials'
      });
    }

    next();
  } catch (error) {
    console.error('Therapist approval middleware error:', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Server error while checking therapist approval status'
    });
  }
};

/**
 * Helper function to check verification status without blocking
 * Returns verification info that can be used by routes
 */
const checkVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId).select('isVerified isEmailVerified accountStatus role email name');
    
    if (!user) {
      return {
        exists: false,
        isVerified: false,
        requiresVerification: false,
        message: 'User not found'
      };
    }

    const isEmailVerified = user.isVerified || user.isEmailVerified;
    
    return {
      exists: true,
      isVerified: isEmailVerified,
      requiresVerification: !isEmailVerified && user.role !== 'admin',
      role: user.role,
      email: user.email,
      name: user.name,
      accountStatus: user.accountStatus
    };
  } catch (error) {
    console.error('Check verification status error:', error);
    return {
      exists: false,
      isVerified: false,
      requiresVerification: false,
      error: error.message
    };
  }
};

/**
 * Middleware to add verification status to request without blocking
 * Useful for routes that need to know verification status but don't require it
 */
const attachVerificationStatus = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      req.verificationStatus = await checkVerificationStatus(req.user.id);
    } else {
      req.verificationStatus = {
        exists: false,
        isVerified: false,
        requiresVerification: false
      };
    }
    next();
  } catch (error) {
    console.error('Attach verification status error:', error);
    // Don't block the request, just set empty status
    req.verificationStatus = {
      exists: false,
      isVerified: false,
      requiresVerification: false,
      error: error.message
    };
    next();
  }
};

module.exports = {
  requireEmailVerification,
  requireEmailVerificationForRole,
  requireTherapistApproval,
  checkVerificationStatus,
  attachVerificationStatus
};