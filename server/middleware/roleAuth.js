/**
 * Role-Based Access Control Middleware
 * 
 * Provides middleware functions for enforcing role-based access control
 * and psychologist approval status checks.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const User = require('../models/User');

// Error codes for consistent error handling
const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE'
};

/**
 * Middleware to check if user has one of the allowed roles
 * 
 * @param {...string} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * 
 * Requirements: 8.1, 8.2, 8.3
 * 
 * Usage:
 *   router.get('/admin-only', auth, requireRole('admin'), handler);
 *   router.get('/staff', auth, requireRole('admin', 'psychologist'), handler);
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        console.log('❌ requireRole - No authenticated user');
        return res.status(401).json({
          error: 'Authentication required',
          code: ErrorCodes.UNAUTHORIZED,
          message: 'You must be logged in to access this resource'
        });
      }

      // Fetch fresh user data from database to ensure role is current
      const user = await User.findById(req.user.id).select('role status name email');
      
      if (!user) {
        console.log('❌ requireRole - User not found:', req.user.id);
        return res.status(401).json({
          error: 'User not found',
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Your account could not be found'
        });
      }

      // Check if account is active
      if (user.status === 'inactive') {
        console.log('❌ requireRole - Account inactive:', user.email);
        return res.status(403).json({
          error: 'Account inactive',
          code: ErrorCodes.ACCOUNT_INACTIVE,
          message: 'Your account has been deactivated. Please contact support.'
        });
      }

      if (user.status === 'deleted') {
        console.log('❌ requireRole - Account deleted:', req.user.id);
        return res.status(403).json({
          error: 'Account deleted',
          code: ErrorCodes.FORBIDDEN,
          message: 'This account has been deleted'
        });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(user.role)) {
        console.log(`❌ requireRole - Access denied for user: ${user.email}, Role: ${user.role}, Required: ${allowedRoles.join(', ')}`);
        
        // Log the access attempt
        logAccessAttempt(req, user, allowedRoles, false);
        
        return res.status(403).json({
          error: 'Access denied',
          code: ErrorCodes.FORBIDDEN,
          message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
          details: {
            userRole: user.role,
            requiredRoles: allowedRoles
          }
        });
      }

      // Update req.user with fresh data
      req.user.role = user.role;
      req.user.status = user.status;
      
      console.log(`✅ requireRole - Access granted for user: ${user.email}, Role: ${user.role}`);
      next();
    } catch (error) {
      console.error('❌ requireRole - Error:', error.message);
      return res.status(500).json({
        error: 'Server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * Middleware to check if psychologist is approved
 * 
 * This middleware should be used after auth and requireRole('psychologist')
 * to ensure the psychologist has been approved by an admin.
 * 
 * @returns {Function} Express middleware function
 * 
 * Requirements: 8.4
 * 
 * Usage:
 *   router.get('/psychologist-feature', auth, requireRole('psychologist'), requireApproved, handler);
 */
const requireApproved = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.log('❌ requireApproved - No authenticated user');
      return res.status(401).json({
        error: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
        message: 'You must be logged in to access this resource'
      });
    }

    // Fetch user with approval status
    const user = await User.findById(req.user.id)
      .select('role approvalStatus psychologistDetails.approvalStatus name email');
    
    if (!user) {
      console.log('❌ requireApproved - User not found:', req.user.id);
      return res.status(401).json({
        error: 'User not found',
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Your account could not be found'
      });
    }

    // Only check approval status for psychologists
    if (user.role !== 'psychologist') {
      // Non-psychologists don't need approval, pass through
      return next();
    }

    // Check approval status (check both top-level and nested for backward compatibility)
    const approvalStatus = user.approvalStatus || user.psychologistDetails?.approvalStatus || 'pending';

    if (approvalStatus !== 'approved') {
      console.log(`❌ requireApproved - Psychologist not approved: ${user.email}, Status: ${approvalStatus}`);
      
      return res.status(403).json({
        error: 'Pending approval',
        code: ErrorCodes.PENDING_APPROVAL,
        message: 'Your account is pending approval. You will be notified once approved.',
        status: approvalStatus,
        details: {
          approvalStatus: approvalStatus,
          message: approvalStatus === 'rejected' 
            ? 'Your application has been rejected. Please contact support for more information.'
            : 'Your application is being reviewed. This usually takes 1-2 business days.'
        }
      });
    }

    console.log(`✅ requireApproved - Psychologist approved: ${user.email}`);
    req.user.approvalStatus = approvalStatus;
    next();
  } catch (error) {
    console.error('❌ requireApproved - Error:', error.message);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while checking approval status'
    });
  }
};

/**
 * Helper function to log access attempts for security auditing
 * 
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {Array} requiredRoles - Array of required roles
 * @param {boolean} granted - Whether access was granted
 */
const logAccessAttempt = (req, user, requiredRoles, granted) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      requiredRoles: requiredRoles,
      accessGranted: granted,
      path: req.originalUrl,
      method: req.method,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    // Log to console (in production, this could be sent to a logging service)
    if (!granted) {
      console.log('🔒 Access Attempt Denied:', JSON.stringify(logEntry));
    }
  } catch (error) {
    console.error('Error logging access attempt:', error.message);
  }
};

/**
 * Combined middleware for admin-only routes
 * Convenience function that combines auth check and admin role requirement
 * 
 * Requirements: 8.1, 8.2
 */
const adminOnly = requireRole('admin');

/**
 * Combined middleware for psychologist-only routes (approved psychologists)
 * 
 * Requirements: 8.3, 8.4
 */
const approvedPsychologistOnly = [requireRole('psychologist'), requireApproved];

module.exports = {
  requireRole,
  requireApproved,
  adminOnly,
  approvedPsychologistOnly,
  ErrorCodes
};
