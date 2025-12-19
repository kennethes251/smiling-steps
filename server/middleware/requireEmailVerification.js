const User = require('../models/User');

/**
 * Middleware to ensure user has verified their email before accessing protected routes
 */
const requireEmailVerification = async (req, res, next) => {
  try {
    // Get user from database to check current verification status
    const user = await User.findById(req.user.id).select('isVerified accountStatus role email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        requiresVerification: false
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please check your email and verify your account.',
        requiresVerification: true,
        userEmail: user.email,
        redirectTo: '/verify-email'
      });
    }

    // For therapists, also check if they're approved (if they've submitted credentials)
    if (user.role === 'therapist' && user.accountStatus === 'pending_approval') {
      return res.status(403).json({
        success: false,
        message: 'Your therapist application is pending approval. You will be notified once approved.',
        requiresApproval: true,
        accountStatus: user.accountStatus,
        redirectTo: '/pending-approval'
      });
    }

    // Add user info to request for downstream use
    req.verifiedUser = {
      id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      accountStatus: user.accountStatus
    };

    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking verification status'
    });
  }
};

/**
 * Middleware variant that only checks verification for specific roles
 */
const requireEmailVerificationForRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select('isVerified accountStatus role email');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // If user's role is not in the specified roles, skip verification check
      if (roles.length > 0 && !roles.includes(user.role)) {
        req.verifiedUser = {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
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
        message: 'Server error while checking verification status'
      });
    }
  };
};

/**
 * Middleware to check if user can access therapist features
 */
const requireTherapistApproval = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role accountStatus psychologistDetails.approvalStatus');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'therapist') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Therapist role required.'
      });
    }

    // Check if therapist is approved
    const approvalStatus = user.psychologistDetails?.approvalStatus || 'pending';
    
    if (approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
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
      message: 'Server error while checking therapist approval status'
    });
  }
};

module.exports = {
  requireEmailVerification,
  requireEmailVerificationForRole,
  requireTherapistApproval
};