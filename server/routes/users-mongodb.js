const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User'); // Mongoose User model
const emailVerificationService = require('../services/emailVerificationService');
const { auth } = require('../middleware/auth');

// Validation middleware
const validateRegisterInput = (req, res, next) => {
  const { name, email, password, role, skipVerification } = req.body;
  const errors = [];

  // Name validation
  if (!name || !name.trim()) {
    errors.push('Name is required');
  } else if (name.length < 2 || name.length > 50) {
    errors.push('Name must be between 2 and 50 characters');
  }

  // Email validation
  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
  }

  // Role validation - only allow client registration from frontend
  if (role && !['client', 'therapist'].includes(role.toLowerCase())) {
    errors.push('Invalid role specified');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize inputs
  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();
  req.body.role = role ? role.toLowerCase() : 'client';

  // Convert skipVerification to boolean if it's a string
  if (skipVerification === 'true') {
    req.body.skipVerification = true;
  } else if (skipVerification === 'false') {
    req.body.skipVerification = false;
  }

  next();
};

// @route   POST api/users/register
// @desc    Register a user with email verification
// @access  Public
router.post('/register', validateRegisterInput, async (req, res) => {
  try {
    const { name, email, password, role, skipVerification } = req.body;

    console.log('📝 Registration attempt:', {
      name,
      email,
      role,
      skipVerification: !!skipVerification
    });

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        errors: ['Email is already in use']
      });
    }

    // Determine if this is a streamlined registration
    const isStreamlined = skipVerification === true || skipVerification === 'true';

    // Create user payload
    let userPayload = {
      name,
      email,
      password, // Will be hashed by pre-save middleware
      role,
      isVerified: isStreamlined, // Auto-verify for streamlined registration
      lastLogin: new Date()
    };

    // Handle therapist registration
    if (role === 'therapist') {
      userPayload.psychologistDetails = {
        approvalStatus: 'pending', // Requires admin approval
        specializations: [],
        experience: '',
        education: '',
        bio: ''
      };
      userPayload.isVerified = true; // Skip email verification for therapists
    }

    // Create user
    const user = await User.create(userPayload);

    // Handle email verification for non-streamlined client registration
    if (!isStreamlined && role === 'client') {
      try {
        const verificationToken = await emailVerificationService.createVerificationToken(user._id);
        await emailVerificationService.sendVerificationEmail(user, verificationToken);
        console.log('📧 Verification email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails, but log the error
      }
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id.toString(),
        role: user.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    // Prepare response data (exclude sensitive fields)
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      isVerified: user.isVerified
    };

    // Return appropriate response based on registration type
    if (isStreamlined) {
      console.log('✅ Streamlined registration successful for:', email);
      res.status(201).json({
        success: true,
        message: 'Registration successful! You are now logged in.',
        token,
        user: userData,
        requiresVerification: false
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        user: userData,
        requiresVerification: true
      });
    }

  } catch (err) {
    console.error('Registration error:', err);

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Registration failed',
        errors: ['Email is already in use']
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again later.'
    });
  }
});

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email, hasPassword: !!password });

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Email and password are required']
      });
    }

    // Find user by email (include password for verification)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Check if user exists
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password']
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked',
        errors: [`Too many failed attempts. Try again in ${retryAfter} minutes.`]
      });
    }

    // Verify password
    const isMatch = await user.correctPassword(password);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for:', user.email);
      // Handle failed login
      await User.failedLogin(user._id);

      return res.status(400).json({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password. Please check your credentials and try again.']
      });
    }

    // Check if email is verified (only for clients)
    if (user.role === 'client' && !user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified',
        errors: ['Please verify your email before logging in. Check your inbox for verification link.'],
        requiresVerification: true
      });
    }

    // Check if therapist account is approved
    if (user.role === 'therapist') {
      const approvalStatus = user.psychologistDetails?.approvalStatus || 'pending';

      if (approvalStatus === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Account pending approval',
          errors: ['Your therapist application is under review. You will receive an email once approved.']
        });
      }

      if (approvalStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Application rejected',
          errors: ['Your therapist application was not approved. Please contact support for more information.']
        });
      }
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user._id.toString(),
        role: user.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    // Prepare response data (exclude sensitive fields)
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      isVerified: user.isVerified
    };

    // Return success response
    res.json({
      success: true,
      token,
      user: userData
    });

  } catch (err) {
    console.error('Login error:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again later.',
      errors: ['Internal server error']
    });
  }
});

// @route   GET api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

module.exports = router;