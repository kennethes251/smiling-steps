const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');
// Use simple rate limiter to avoid 429 errors
const loginRateLimiter = require('../middleware/rateLimiter.simple').loginRateLimiter;
const { auth } = require('../middleware/auth');
// Use global Sequelize User model (initialized in server/index.js)
// Try email utility, fallback to simple one
let sendEmail;
try {
  sendEmail = require('../utils/sendEmail');
} catch (error) {
  console.log('⚠️ Using simple email fallback');
  sendEmail = require('../utils/sendEmail.simple');
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
    if (password.length < 6) { // Increased to 6 characters for better security
      errors.push('Password must be at least 6 characters long');
    }
  }

  // Role validation - only allow client registration from frontend
  if (role && !['client'].includes(role.toLowerCase())) {
    errors.push('Only client registration is allowed through this endpoint');
  }

  // Skip verification validation (optional boolean)
  if (skipVerification !== undefined && typeof skipVerification !== 'boolean' && skipVerification !== 'true' && skipVerification !== 'false') {
    errors.push('skipVerification must be a boolean value');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Sanitize inputs - force role to be client for frontend registration
  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();
  req.body.role = 'client'; // Always set to client for frontend registration

  // Convert skipVerification to boolean if it's a string
  if (skipVerification === 'true') {
    req.body.skipVerification = true;
  } else if (skipVerification === 'false') {
    req.body.skipVerification = false;
  }

  next();
};

// @route   POST api/users/register
// @desc    Register a user (supports both streamlined and email verification flows)
// @access  Public
router.post('/register', validateRegisterInput, async (req, res) => {
  try {
    const { name, email, password, role, skipVerification } = req.body;

    console.log('📝 Registration attempt:', {
      name,
      email,
      role,
      skipVerification: !!skipVerification,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });

    // Check if user already exists (Sequelize syntax)
    const existingUser = await global.User.findOne({ 
      where: { email: email.toLowerCase().trim() } 
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        errors: ['Email is already in use']
      });
    }

    // Determine if this is a streamlined registration
    const isStreamlined = skipVerification === true || skipVerification === 'true';

    let userPayload = {
      name,
      email,
      password,
      role,
      isVerified: isStreamlined, // Auto-verify for streamlined registration
      lastLogin: new Date()
    };

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
      userPayload.isVerified = true; // Skip email verification for psychologists
    }

    // Only add verification tokens for non-streamlined client registration
    if (!isStreamlined && role === 'client') {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      userPayload.verificationToken = verificationToken;
      userPayload.verificationTokenExpires = verificationTokenExpires;

      // Send verification email (for now just log the token)
      console.log('📧 Email verification token for', email, ':', verificationToken);
      console.log('🔗 Verification URL: https://smiling-steps-frontend.onrender.com/verify-email?token=' + verificationToken);
    }

    const user = await global.User.create(userPayload);

    // Create JWT payload (Sequelize uses id)
    const payload = {
      user: {
        id: user.id.toString(),
        role: user.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    // Prepare response data (exclude sensitive fields) - Sequelize uses id
    const userData = {
      id: user.id.toString(),
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
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });

    // Handle duplicate key error (unique email)
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

// @route   PUT api/users/session-rate
// @desc    Update psychologist session rate
// @access  Private (Psychologist only)
router.put('/session-rate', auth, async (req, res) => {
  try {
    const { sessionRate } = req.body;

    // Validate input
    if (sessionRate < 0 || isNaN(sessionRate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session rate'
      });
    }

    // Find and update user
    const user = await global.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is psychologist
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can set session rates'
      });
    }

    user.sessionRate = sessionRate;
    await user.save();

    res.json({
      success: true,
      message: 'Session rate updated successfully',
      sessionRate: user.sessionRate
    });

  } catch (err) {
    console.error('Session rate update error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/users/verify-email/:token
// @desc    Verify user email
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    console.log('📧 Email verification attempt with token:', token);

    // Find user with this verification token
    const { Op } = require('sequelize');
    const user = await global.User.findOne({
      where: {
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Verify the user
    await user.update({
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null
    });

    console.log('✅ Email verified for user:', user.email);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });

  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during email verification'
    });
  }
});

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', {
      email,
      hasPassword: !!password,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });

    // Basic validation
    if (!email || !password) {
      console.log('❌ Login validation failed: missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Email and password are required']
      });
    }

    // Find user by email (case-insensitive) - Sequelize syntax with password
    const user = await global.User.scope('withPassword').findOne({ 
      where: { email: email.toLowerCase().trim() }
    });

    // Check if user exists
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password']
      });
    }

    // Check if account is locked (Sequelize)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked',
        errors: [`Too many failed attempts. Try again in ${retryAfter} minutes.`]
      });
    }

    // Verify password (Sequelize)
    console.log('🔑 Verifying password for user:', user.email, 'Role:', user.role);
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for:', user.email);
      // Increment failed login attempts (Sequelize)
      const loginAttempts = (user.loginAttempts || 0) + 1;
      const updateData = { loginAttempts };
      if (loginAttempts >= 5) {
        updateData.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await user.update(updateData);

      return res.status(400).json({
        success: false,
        message: 'Authentication failed',
        errors: ['Invalid email or password. Please check your credentials and try again.']
      });
    }
    
    console.log('✅ Password verified successfully for:', user.email);

    // Check if email is verified (only for clients)
    if (user.role === 'client' && !user.isVerified) {
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

    // Reset login attempts on successful login (Sequelize)
    await user.update({
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date()
    });

    // Create JWT payload (Sequelize uses id)
    const payload = {
      user: {
        id: user.id.toString(),
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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin
    };

    // Return success response
    res.json({
      success: true,
      token,
      user: userData
    });

  } catch (err) {
    console.error('Login error:', err);

    // Handle specific errors
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




// @route   GET api/users/approve/:token
// @desc    Approve or reject a psychologist's application
// @access  Public (link-based)
router.get('/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { action, id } = req.query;

    if (!action || !['approve', 'reject'].includes(action) || !id) {
      return res.status(400).send('<h1>Invalid Request</h1><p>The link is incomplete. Please check the URL and try again.</p>');
    }

    const hashedToken = createHash('sha256').update(token).digest('hex');
    const { Op } = require('sequelize');

    // For JSONB fields in Sequelize, we need to query differently
    const user = await global.User.findOne({
      where: {
        id: id,
        psychologistDetails: {
          approvalToken: hashedToken,
          approvalTokenExpires: { [Op.gt]: Date.now() }
        }
      }
    });

    if (!user) {
      return res.status(400).send('<h1>Invalid or Expired Link</h1><p>This approval link is either invalid or has expired. Please contact the applicant to have them re-register.</p>');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updatedDetails = {
      ...user.psychologistDetails,
      approvalStatus: newStatus,
      approvalToken: null,
      approvalTokenExpires: null
    };
    
    await user.update({ psychologistDetails: updatedDetails });

    res.send(`<h1>Application ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</h1><p>The psychologist's application for ${user.email} has been successfully ${newStatus}.</p>`);

  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).send('<h1>Server Error</h1><p>An unexpected error occurred. Please try again later.</p>');
  }
});

// File upload configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile (supports both JSON and multipart data)
// @access  Private
router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('🔄 Profile update request received');
    console.log('👤 User ID:', req.user.id);
    console.log('📝 Request body:', req.body);

    const user = await global.User.findByPk(req.user.id);

    if (!user) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user.name, user.email);

    // Update basic profile fields
    const fieldsToUpdate = [
      'name', 'preferredName', 'phone', 'dateOfBirth', 'gender',
      'address', 'city', 'state', 'zipCode', 'country',
      'occupation', 'education', 'emergencyContact', 'emergencyPhone',
      'preferredTherapyType', 'preferredLanguage', 'timeZone',
      'profileVisibility', 'emailNotifications', 'smsNotifications',
      'reminderNotifications', 'bio'
    ];

    let updatedFields = [];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        // Handle empty strings for enum fields - convert to undefined
        let value = req.body[field];
        if (value === '' && ['gender', 'preferredTherapyType', 'profileVisibility'].includes(field)) {
          value = undefined;
        }

        // Only update if value is not undefined after processing
        if (value !== undefined) {
          user[field] = value;
          updatedFields.push(field);
        }
      }
    });

    // Handle array fields
    const arrayFields = ['medicalConditions', 'medications', 'allergies', 'therapyGoals'];
    arrayFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = Array.isArray(req.body[field]) ? req.body[field] : [];
        updatedFields.push(field);
      }
    });

    console.log('📝 Fields being updated:', updatedFields);

    // Handle profile picture upload if file is provided
    if (req.file) {
      console.log('📸 Profile picture uploaded:', req.file.filename);

      // Delete old profile picture if it exists
      if (user.profilePicture) {
        const oldImagePath = path.join(__dirname, '../uploads/profiles', path.basename(user.profilePicture));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('🗑️ Old profile picture deleted');
        }
      }

      // Set new profile picture path
      user.profilePicture = `/uploads/profiles/${req.file.filename}`;
      updatedFields.push('profilePicture');
    }

    await user.save();
    console.log('✅ User profile saved successfully');

    // Prepare response data (exclude sensitive fields)
    const userData = {
      id: user.id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      occupation: user.occupation,
      education: user.education,
      emergencyContact: user.emergencyContact,
      emergencyPhone: user.emergencyPhone,
      medicalConditions: user.medicalConditions,
      medications: user.medications,
      allergies: user.allergies,
      therapyGoals: user.therapyGoals,
      preferredTherapyType: user.preferredTherapyType,
      preferredLanguage: user.preferredLanguage,
      timeZone: user.timeZone,
      profileVisibility: user.profileVisibility,
      emailNotifications: user.emailNotifications,
      smsNotifications: user.smsNotifications,
      reminderNotifications: user.reminderNotifications,
      bio: user.bio,
      profilePicture: user.profilePicture,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (err) {
    console.error('❌ Profile update error:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      console.error('Validation errors:', err.errors);
      const errors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        details: errors
      });
    }

    // Handle cast errors (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
      console.error('Cast error:', err);
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the profile.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// @route   PUT api/users/profile/upload
// @desc    Update user profile with file upload
// @access  Private
router.put('/profile/upload', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await global.User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if it exists
      if (user.profilePicture) {
        const oldImagePath = path.join(__dirname, '../uploads/profiles', path.basename(user.profilePicture));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      user.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    // Update all profile fields (from FormData)
    const fieldsToUpdate = [
      'name', 'preferredName', 'phone', 'dateOfBirth', 'gender',
      'address', 'city', 'state', 'zipCode', 'country',
      'occupation', 'education', 'emergencyContact', 'emergencyPhone',
      'preferredTherapyType', 'preferredLanguage', 'timeZone',
      'profileVisibility', 'emailNotifications', 'smsNotifications',
      'reminderNotifications', 'bio'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Handle array fields (they come as JSON strings from FormData)
    const arrayFields = ['medicalConditions', 'medications', 'allergies', 'therapyGoals'];
    arrayFields.forEach(field => {
      if (req.body[field] !== undefined) {
        try {
          user[field] = JSON.parse(req.body[field]);
        } catch (e) {
          // If parsing fails, treat as comma-separated string
          user[field] = req.body[field].split(',').map(item => item.trim()).filter(item => item);
        }
      }
    });

    await user.save();

    // Prepare response data (exclude sensitive fields)
    const userData = {
      id: user.id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      occupation: user.occupation,
      education: user.education,
      emergencyContact: user.emergencyContact,
      emergencyPhone: user.emergencyPhone,
      medicalConditions: user.medicalConditions,
      medications: user.medications,
      allergies: user.allergies,
      therapyGoals: user.therapyGoals,
      preferredTherapyType: user.preferredTherapyType,
      preferredLanguage: user.preferredLanguage,
      timeZone: user.timeZone,
      profileVisibility: user.profileVisibility,
      emailNotifications: user.emailNotifications,
      smsNotifications: user.smsNotifications,
      reminderNotifications: user.reminderNotifications,
      bio: user.bio,
      profilePicture: user.profilePicture,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (err) {
    console.error('Profile update error:', err);

    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
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

    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the profile.'
    });
  }
});


// Temporary route to check users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await global.User.findAll({
      attributes: ['name', 'email', 'role', 'createdAt']
    });
    res.json({ users, count: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary route to reset database (remove in production)
router.get('/debug/reset', async (req, res) => {
  try {
    const deleteResult = await global.User.destroy({ where: {} });
    res.json({
      success: true,
      message: `Deleted ${deleteResult} users`,
      deletedCount: deleteResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary route to initialize database (remove in production)
router.get('/debug/init-db', async (req, res) => {
  try {
    const { Sequelize, DataTypes } = require('sequelize');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found');
    }
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    // Initialize models
    const User = require('../models/User-sequelize')(sequelize, DataTypes);
    const Session = require('../models/Session-sequelize')(sequelize, DataTypes);
    const Blog = require('../models/Blog-sequelize')(sequelize, DataTypes);
    
    // Define associations
    User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
    User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
    
    // Blog associations
    User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
    Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

    await sequelize.sync({ force: false, alter: true });
    
    // Create test user if not exists
    const [testUser, created] = await User.findOrCreate({
      where: { email: 'nancy@gmail.com' },
      defaults: {
        name: 'Nancy Client',
        password: 'password123',
        role: 'client',
        isVerified: true
      }
    });
    
    await sequelize.close();
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      testUserCreated: created,
      testUser: {
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      }
    });
    
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message,
      details: err.stack
    });
  }
});

// Temporary route to check psychologists without auth (remove in production)
router.get('/debug/psychologists', async (req, res) => {
  try {
    const psychologists = await global.User.findAll({
      where: { 
        role: 'psychologist',
        'psychologistDetails.approvalStatus': 'approved'
      },
      attributes: ['name', 'email', 'role', 'psychologistDetails']
    });

    res.json({
      success: true,
      count: psychologists.length,
      data: psychologists
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary route to create test users (remove in production)
router.get('/debug/create-test-users', async (req, res) => {
  try {
    const testUsers = [
      {
        name: 'Nancy Client',
        email: 'nancy@gmail.com',
        password: 'password123',
        role: 'client'
      },
      {
        name: 'Test Client',
        email: 'client@test.com',
        password: 'password123',
        role: 'client'
      },
      // Psychologists (pre-approved for testing)
      {
        name: 'Dr. John Smith',
        email: 'john@gmail.com',
        password: 'password123',
        role: 'psychologist',
        psychologistDetails: { approvalStatus: 'approved' }
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah@gmail.com',
        password: 'password123',
        role: 'psychologist',
        psychologistDetails: { approvalStatus: 'approved' }
      },
      {
        name: 'Dr. Michael Brown',
        email: 'michael@gmail.com',
        password: 'password123',
        role: 'psychologist',
        psychologistDetails: { approvalStatus: 'approved' }
      },
      {
        name: 'Dr. Emily Davis',
        email: 'emily@gmail.com',
        password: 'password123',
        role: 'psychologist',
        psychologistDetails: { approvalStatus: 'approved' }
      },
      {
        name: 'Dr. David Wilson',
        email: 'david@gmail.com',
        password: 'password123',
        role: 'psychologist',
        psychologistDetails: { approvalStatus: 'approved' }
      }
    ];

    const createdUsers = [];
    const errors = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await global.User.findOne({ where: { email: userData.email } });
        if (existingUser) {
          errors.push(`User ${userData.email} already exists`);
          continue;
        }

        // Create new user
        const user = await global.User.create(userData);

        createdUsers.push({
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

      } catch (error) {
        errors.push(`Error creating ${userData.email}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Test user creation completed',
      created: createdUsers,
      errors: errors,
      loginCredentials: testUsers.map(u => ({
        email: u.email,
        password: u.password,
        role: u.role
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary route to get clients (remove in production)
router.get('/clients', auth, async (req, res) => {
  try {
    // Use Sequelize syntax instead of Mongoose
    const clients = await global.User.findAll({
      where: { role: 'client' },
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(clients);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: err.message });
  }
});

// Debug route to test session creation (remove in production)
router.get('/debug/test-session', async (req, res) => {
  try {
    const Session = require('../models/Session');

    // Get first client and psychologist for testing
    const client = await global.User.findOne({ where: { role: 'client' } });
    const psychologist = await global.User.findOne({ where: { role: 'psychologist' } });

    if (!client) {
      return res.status(400).json({ error: 'No client found' });
    }
    if (!psychologist) {
      return res.status(400).json({ error: 'No psychologist found' });
    }

    const testSession = new Session({
      client: client._id,
      psychologist: psychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: 2000,
      status: 'Pending'
    });

    const savedSession = await testSession.save();
    res.json({
      success: true,
      message: 'Test session created successfully',
      session: savedSession,
      client: { name: client.name, email: client.email },
      psychologist: { name: psychologist.name, email: psychologist.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err });
  }
});

// @route   GET api/users/psychologists
// @desc    Get all approved psychologists for booking
// @access  Public
router.get('/psychologists', async (req, res) => {
  try {
    console.log('🔍 Fetching psychologists for booking...');
    
    // Sequelize syntax for PostgreSQL
    const psychologists = await global.User.findAll({ 
      where: { role: 'psychologist' },
      attributes: ['id', 'name', 'email', 'profileInfo', 'psychologistDetails', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Found ${psychologists.length} psychologist(s)`);

    // Enhance psychologists with default data if missing
    const enhancedPsychologists = psychologists.map((psych, index) => {
      const psychObj = psych.dataValues || psych;
      
      const profileInfo = psychObj.profileInfo || {};
      const psychDetails = psychObj.psychologistDetails || {};
      
      return {
        id: psychObj.id.toString(),
        _id: psychObj.id, // For backward compatibility
        name: psychObj.name,
        email: psychObj.email,
        profilePicture: profileInfo.profilePicture,
        bio: profileInfo.bio || `Dr. ${psychObj.name} is a dedicated mental health professional.`,
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
        // Also add rates at top level for easy access
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

// @route   GET api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await global.User.findByPk(req.user.id, { 
      attributes: { exclude: ['password'] }
    });

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

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await global.User.findByPk(req.params.id, { 
      attributes: { exclude: ['password'] }
    });

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
    console.error('Error fetching user:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   POST api/users/create-psychologist
// @desc    Create a psychologist account (Backend/Admin only)
// @access  Private (Admin only) or direct server call
router.post('/create-psychologist', async (req, res) => {
  try {
    const { name, email, password, specializations, experience, education, bio } = req.body;

    console.log('🔐 Creating psychologist account:', { name, email });

    // Validation
    const errors = [];
    if (!name || !name.trim()) errors.push('Name is required');
    if (!email || !email.includes('@')) errors.push('Valid email is required');
    if (!password || password.length < 4) errors.push('Password must be at least 4 characters');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Check if user already exists
    const existingUser = await global.User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create psychologist user (or admin if specified)
    const { role } = req.body;
    const psychologistData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'admin' ? 'admin' : 'psychologist',
      psychologistDetails: {
        approvalStatus: 'approved', // Auto-approve backend created accounts
        specializations: specializations || [],
        experience: experience || '',
        education: education || '',
        bio: bio || ''
      }
    };

    const user = await global.User.create(psychologistData);

    console.log('✅ Psychologist account created successfully:', user.id);

    // Return success response (exclude password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      psychologistDetails: user.psychologistDetails,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Psychologist account created successfully',
      user: userData
    });

  } catch (err) {
    console.error('Psychologist creation error:', err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the psychologist account'
    });
  }
});

// @route   PUT api/users/profile/psychologist
// @desc    Update psychologist profile details
// @access  Private (Psychologist only)
router.put('/profile/psychologist', auth, async (req, res) => {
  try {
    const user = await global.User.findByPk(req.user.id);

    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only psychologists can update this profile.'
      });
    }

    const {
      profilePictureUrl,
      age,
      bio,
      specializations,
      therapyTypes,
      experience,
      education,
      languages
    } = req.body;

    // Update JSONB field
    const updatedDetails = { ...user.psychologistDetails };
    if (profilePictureUrl !== undefined) updatedDetails.profilePictureUrl = profilePictureUrl;
    if (age !== undefined) updatedDetails.age = age;
    if (bio !== undefined) updatedDetails.bio = bio;
    if (specializations !== undefined) updatedDetails.specializations = specializations;
    if (therapyTypes !== undefined) updatedDetails.therapyTypes = therapyTypes;
    if (experience !== undefined) updatedDetails.experience = experience;
    if (education !== undefined) updatedDetails.education = education;
    if (languages !== undefined) updatedDetails.languages = languages;

    await user.update({ psychologistDetails: updatedDetails });
    
    // Fetch updated user without password
    const updatedUser = await global.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Profile update error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});


// @route   PUT api/users/session-rate
// @desc    Update psychologist session rate
// @access  Private (Psychologist only)
router.put('/session-rate', auth, async (req, res) => {
  try {
    const { sessionRate } = req.body;

    // Validation
    if (sessionRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'Session rate cannot be negative'
      });
    }

    // Find and update user
    const user = await global.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is psychologist
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can set session rates'
      });
    }

    // Update session rate
    await user.update({ sessionRate });

    console.log('✅ Session rate updated for', user.email, ':', sessionRate);

    res.json({
      success: true,
      message: 'Session rate updated successfully',
      sessionRate: user.sessionRate
    });

  } catch (err) {
    console.error('Session rate update error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating session rate'
    });
  }
});

module.exports = router;
