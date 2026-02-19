const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User'); // Mongoose User model
const emailVerificationService = require('../services/emailVerificationService');
const { auth } = require('../middleware/auth');

// Import error monitoring service
let registrationErrorMonitoring;
try {
  const { registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY } = require('../services/registrationErrorMonitoringService');
  registrationErrorMonitoring = { service: registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY };
} catch (error) {
  console.warn('⚠️ Registration error monitoring service not available');
  registrationErrorMonitoring = null;
}

// Import performance monitoring service
let registrationPerformance;
try {
  const { registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES } = require('../services/registrationPerformanceService');
  registrationPerformance = { service: registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES };
} catch (error) {
  console.warn('⚠️ Registration performance service not available');
  registrationPerformance = null;
}

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

  // Role validation - allow client and psychologist registration from frontend
  if (role && !['client', 'psychologist'].includes(role.toLowerCase())) {
    errors.push('Only client and psychologist registration is allowed through this endpoint');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize inputs - allow both client and psychologist roles
  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();
  req.body.role = ['client', 'psychologist'].includes(role?.toLowerCase()) ? role.toLowerCase() : 'client';

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

    console.log('🔍 Registration debug:', {
      skipVerification,
      isStreamlined,
      skipVerificationType: typeof skipVerification
    });

    // Create user payload
    let userPayload = {
      name,
      email,
      password, // Will be hashed by pre-save middleware
      role,
      isVerified: isStreamlined, // Auto-verify for streamlined registration (correct field name)
      lastLogin: new Date()
    };

    console.log('🔍 User payload debug:', {
      isVerified: userPayload.isVerified,
      isStreamlined,
      passwordLength: password.length,
      passwordPreview: password.substring(0, 3) + '***'
    });

    // Handle psychologist registration with approval workflow
    if (role === 'psychologist') {
      const { psychologistDetails } = req.body;
      userPayload.psychologistDetails = {
        specializations: psychologistDetails?.specializations || [],
        experience: psychologistDetails?.experience || '',
        education: psychologistDetails?.education || '',
        bio: psychologistDetails?.bio || '',
        approvalStatus: 'pending', // Requires admin approval
        isActive: false // Not active until approved
      };
      // Psychologists also need email verification (unless streamlined)
      userPayload.isVerified = isStreamlined;
    }

    // Create user
    const user = await User.create(userPayload);

    // Track performance metric for account creation
    const registrationStartTime = Date.now(); // Approximate start time
    if (registrationPerformance) {
      const userType = role === 'psychologist' 
        ? registrationPerformance.USER_TYPES.THERAPIST 
        : registrationPerformance.USER_TYPES.CLIENT;
      registrationPerformance.service.trackAccountCreated(
        user._id.toString(), 
        userType, 
        registrationStartTime - 30000 // Estimate 30 seconds for form fill
      );
    }

    // Handle email verification for both clients AND psychologists (unless streamlined)
    if (!isStreamlined && (role === 'client' || role === 'psychologist')) {
      try {
        const verificationToken = await emailVerificationService.createVerificationToken(user._id);
        await emailVerificationService.sendVerificationEmail(user, verificationToken);
        console.log('📧 Verification email sent to:', email, 'Role:', role);
        
        // Track successful registration with verification
        if (registrationErrorMonitoring) {
          registrationErrorMonitoring.service.trackAttempt('registration', true, {
            email,
            role,
            requiresVerification: true
          });
        }
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        
        // Track email sending failure (error already tracked in emailVerificationService)
        if (registrationErrorMonitoring) {
          registrationErrorMonitoring.service.trackAttempt('registration', true, {
            email,
            role,
            requiresVerification: true,
            emailSendFailed: true
          });
        }
        // Don't fail registration if email fails, but log the error
      }
    } else if (isStreamlined) {
      // Track streamlined registration
      if (registrationErrorMonitoring) {
        registrationErrorMonitoring.service.trackAttempt('registration', true, {
          email,
          role,
          requiresVerification: false,
          streamlined: true
        });
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

    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      let errorCategory = registrationErrorMonitoring.ERROR_CATEGORIES.REGISTRATION;
      let errorCode = 'REGISTRATION_FAILED';
      let severity = registrationErrorMonitoring.ERROR_SEVERITY.MEDIUM;

      if (err.code === 11000) {
        errorCode = 'DUPLICATE_EMAIL';
        severity = registrationErrorMonitoring.ERROR_SEVERITY.LOW;
      } else if (err.name === 'ValidationError') {
        errorCategory = registrationErrorMonitoring.ERROR_CATEGORIES.VALIDATION;
        errorCode = 'VALIDATION_ERROR';
        severity = registrationErrorMonitoring.ERROR_SEVERITY.LOW;
      } else {
        severity = registrationErrorMonitoring.ERROR_SEVERITY.HIGH;
      }

      registrationErrorMonitoring.service.trackError({
        category: errorCategory,
        code: errorCode,
        message: err.message,
        severity,
        context: { email: req.body.email, role: req.body.role },
        originalError: err
      });
    }

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
  const securityMonitoringService = require('../services/securityMonitoringService');
  const breachAlertingService = require('../services/breachAlertingService');
  
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', {
      email,
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Email and password are required']
      });
    }

    // Find user by email (case-insensitive) with password
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +loginAttempts +lockUntil');

    // Check if user exists
    if (!user) {
      console.log('❌ User not found:', email);
      
      // Monitor failed authentication attempt
      const monitoringResult = await securityMonitoringService.runSecurityMonitoring({
        actionType: 'failed_login',
        email: email.toLowerCase().trim(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        action: 'user_not_found'
      });
      
      // Trigger breach alerting if detected
      if (monitoringResult.breachDetected) {
        await breachAlertingService.processSecurityBreach({
          alerts: monitoringResult.alerts,
          recommendations: monitoringResult.recommendations,
          context: {
            actionType: 'failed_login',
            email: email.toLowerCase().trim(),
            ipAddress: req.ip,
            reason: 'user_not_found'
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password']
      });
    }

    // Debug: Log password info
    console.log('🔍 User found:', {
      id: user._id,
      email: user.email,
      hasPasswordField: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordStartsWith: user.password ? user.password.substring(0, 7) : 'N/A',
      isVerified: user.isVerified,
      role: user.role
    });

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      console.log('🔒 Account locked:', { email, remainingMinutes: remainingTime });
      
      // Monitor locked account access attempt
      const monitoringResult = await securityMonitoringService.runSecurityMonitoring({
        actionType: 'failed_login',
        userId: user._id.toString(),
        email: email.toLowerCase().trim(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        action: 'account_locked'
      });
      
      // Trigger breach alerting if detected
      if (monitoringResult.breachDetected) {
        await breachAlertingService.processSecurityBreach({
          alerts: monitoringResult.alerts,
          recommendations: monitoringResult.recommendations,
          context: {
            actionType: 'failed_login',
            userId: user._id.toString(),
            email: email.toLowerCase().trim(),
            ipAddress: req.ip,
            reason: 'account_locked'
          }
        });
      }
      
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked',
        errors: [`Too many failed attempts. Try again in ${remainingTime} minutes.`]
      });
    }

    // Verify password using bcrypt directly for debugging
    const bcrypt = require('bcryptjs');
    const directCompare = await bcrypt.compare(password, user.password);
    const methodCompare = await user.correctPassword(password);
    
    console.log('🔐 Password verification:', {
      directBcryptCompare: directCompare,
      modelMethodCompare: methodCompare,
      inputPassword: password.substring(0, 3) + '***',
      storedHashPrefix: user.password ? user.password.substring(0, 10) : 'N/A'
    });

    const isMatch = directCompare; // Use direct compare for reliability
    
    if (!isMatch) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + (15 * 60 * 1000); // Lock for 15 minutes
      }
      await user.save({ validateBeforeSave: false });
      
      console.log('❌ Password mismatch for:', email);
      
      // Monitor failed authentication attempt
      const monitoringResult = await securityMonitoringService.runSecurityMonitoring({
        actionType: 'failed_login',
        userId: user._id.toString(),
        email: email.toLowerCase().trim(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        action: 'invalid_password'
      });
      
      // Trigger breach alerting if detected
      if (monitoringResult.breachDetected) {
        await breachAlertingService.processSecurityBreach({
          alerts: monitoringResult.alerts,
          recommendations: monitoringResult.recommendations,
          context: {
            actionType: 'failed_login',
            userId: user._id.toString(),
            email: email.toLowerCase().trim(),
            ipAddress: req.ip,
            reason: 'invalid_password',
            attemptCount: user.loginAttempts
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password']
      });
    }
    
    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    // Monitor successful login for suspicious IP patterns
    const successMonitoringResult = await securityMonitoringService.runSecurityMonitoring({
      actionType: 'login_success',
      userId: user._id.toString(),
      userRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      action: 'successful_login'
    });
    
    // Trigger breach alerting if suspicious patterns detected
    if (successMonitoringResult.breachDetected) {
      await breachAlertingService.processSecurityBreach({
        alerts: successMonitoringResult.alerts,
        recommendations: successMonitoringResult.recommendations,
        context: {
          actionType: 'login_success',
          userId: user._id.toString(),
          userRole: user.role,
          ipAddress: req.ip,
          reason: 'suspicious_login_pattern'
        }
      });
    }

    // Check if email is verified (for clients and psychologists - admin bypasses)
    if ((user.role === 'client' || user.role === 'psychologist') && !user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified',
        errors: ['Please verify your email before logging in. Check your inbox for verification link.'],
        requiresVerification: true
      });
    }

    // Check if psychologist account is approved and active
    if (user.role === 'psychologist') {
      const approvalStatus = user.psychologistDetails?.approvalStatus || 'pending';
      const isActive = user.psychologistDetails?.isActive;

      if (approvalStatus === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Account pending approval',
          errors: ['Your psychologist application is under review. You will receive an email once approved.']
        });
      }

      if (approvalStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Application rejected',
          errors: ['Your psychologist application was not approved. Please contact support for more information.']
        });
      }

      if (isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Account disabled',
          errors: ['Your account has been disabled by an administrator. Please contact support for assistance.']
        });
      }
    }

    // Update last login
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
    // Include approvalStatus for psychologists so frontend RoleGuard can check it
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      isVerified: user.isVerified,
      approvalStatus: user.role === 'psychologist' 
        ? (user.approvalStatus || user.psychologistDetails?.approvalStatus || 'pending')
        : 'not_applicable'
    };

    console.log('✅ Login successful:', {
      email: user.email,
      role: user.role,
      approvalStatus: userData.approvalStatus
    });

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

// @route   GET api/users/psychologists
// @desc    Get all approved psychologists for booking
// @access  Public
router.get('/psychologists', async (req, res) => {
  try {
    console.log('🔍 Fetching psychologists for booking...');
    
    const psychologists = await User.find({ 
      role: 'psychologist',
      'psychologistDetails.approvalStatus': 'approved'
    }).select('name email psychologistDetails createdAt');

    console.log(`📊 Found ${psychologists.length} psychologist(s)`);

    // Enhance psychologists with default data if missing
    const enhancedPsychologists = psychologists.map(psych => {
      const psychDetails = psych.psychologistDetails || {};
      
      return {
        id: psych._id.toString(),
        _id: psych._id,
        name: psych.name,
        email: psych.email,
        bio: psychDetails.bio || `Dr. ${psych.name} is a dedicated mental health professional.`,
        specializations: psychDetails.specializations && psychDetails.specializations.length > 0 
          ? psychDetails.specializations 
          : ['General Therapy', 'Anxiety', 'Depression'],
        experience: psychDetails.experience || '5 years',
        psychologistDetails: {
          specializations: psychDetails.specializations || ['General Therapy', 'Anxiety', 'Depression'],
          experience: psychDetails.experience || '5 years',
          rates: psychDetails.rates || {
            Individual: { amount: 2000, duration: 60 },
            Couples: { amount: 3500, duration: 75 },
            Family: { amount: 4500, duration: 90 },
            Group: { amount: 1500, duration: 90 }
          }
        },
        rates: psychDetails.rates || {
          Individual: { amount: 2000, duration: 60 },
          Couples: { amount: 3500, duration: 75 },
          Family: { amount: 4500, duration: 90 },
          Group: { amount: 1500, duration: 90 }
        }
      };
    });

    console.log('✅ Sending psychologists data');
    res.json({
      success: true,
      data: enhancedPsychologists
    });

  } catch (err) {
    console.error('❌ Error fetching psychologists:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch psychologists',
      error: err.message
    });
  }
});

module.exports = router;