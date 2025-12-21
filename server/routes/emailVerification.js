const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Add Mongoose User model
const emailVerificationService = require('../services/emailVerificationService');
const { auth } = require('../middleware/auth');

// @route   POST /api/email-verification/verify
// @desc    Verify email with token
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const result = await emailVerificationService.verifyEmailToken(token);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

// @route   POST /api/email-verification/resend
// @desc    Resend verification email
// @access  Public
router.post('/resend', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const result = await emailVerificationService.resendVerificationEmail(email);
    res.status(200).json(result);
  } catch (error) {
    console.error('Resend verification error:', error);
    
    let message = 'Server error while resending verification email';
    let statusCode = 500;

    if (error.message === 'User not found') {
      message = 'No account found with this email address';
      statusCode = 404;
    } else if (error.message === 'Email is already verified') {
      message = 'This email address is already verified';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// @route   GET /api/email-verification/status
// @desc    Get verification status for current user
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    // Use Mongoose User model
    const user = await User.findById(req.user.id, 'isEmailVerified role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      verification: {
        isVerified: user.isEmailVerified,
        role: user.role,
        canAccessDashboard: user.isEmailVerified || user.role === 'admin' || user.role === 'psychologist'
      }
    });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking verification status'
    });
  }
});

// @route   POST /api/email-verification/cleanup
// @desc    Clean up expired verification tokens (admin only)
// @access  Private (Admin)
router.post('/cleanup', auth, async (req, res) => {
  try {
    // Check if user is admin using Mongoose User model
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    await emailVerificationService.cleanupExpiredTokens();
    
    res.json({
      success: true,
      message: 'Expired verification tokens cleaned up successfully'
    });
  } catch (error) {
    console.error('Token cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token cleanup'
    });
  }
});

module.exports = router;