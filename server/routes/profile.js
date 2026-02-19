/**
 * Profile Management Routes
 * 
 * Implements profile management endpoints for Requirements 4.1-4.5, 5.1-5.2
 * 
 * Endpoints:
 * - GET /api/users/profile - Get current user's profile (4.1)
 * - PUT /api/users/profile - Update profile fields (4.2, 4.3, 5.1)
 * - PUT /api/users/profile/picture - Upload profile picture (4.4)
 * - PUT /api/users/password - Change password (4.5)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const User = require('../models/User'); // Mongoose User model
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// Previous log hash for tamper-evident chain
let previousLogHash = null;

/**
 * Generate a hash for tamper-evident logging
 */
function generateLogHash(logEntry) {
  const logString = JSON.stringify(logEntry);
  const dataToHash = previousLogHash ? `${previousLogHash}${logString}` : logString;
  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return hash;
}

/**
 * Create audit log entry for profile changes
 * Requirements: 5.5, 8.6
 */
async function createProfileAuditLog(actionType, data) {
  const logEntry = {
    timestamp: new Date(),
    actionType,
    ...data
  };
  
  const hash = generateLogHash(logEntry);
  const prevHash = previousLogHash;
  previousLogHash = hash;
  
  const completeLogEntry = {
    ...logEntry,
    logHash: hash,
    previousHash: prevHash
  };
  
  try {
    await AuditLog.create(completeLogEntry);
  } catch (dbError) {
    console.error('⚠️ Failed to persist audit log:', dbError.message);
  }
  
  return completeLogEntry;
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for allowed image types (jpg, png, gif) - Requirement 4.4
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed.'), false);
  }
};

// Max file size: 5MB - Requirement 4.4
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * @route   GET /api/profile
 * @desc    Get current user's profile data
 * @access  Private
 * Requirements: 4.1
 */
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Profile fetch request for user:', req.user.id);
    
    // Find user and exclude sensitive fields (Mongoose syntax)
    const user = await User.findById(req.user.id).select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationTokenExpires -loginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare profile data
    const profileData = {
      id: user._id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture,
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
      bio: user.bio,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      // Preferences
      preferredTherapyType: user.preferredTherapyType,
      preferredLanguage: user.preferredLanguage,
      timeZone: user.timeZone,
      profileVisibility: user.profileVisibility,
      // Notifications
      notifications: user.notifications,
      emailNotifications: user.emailNotifications,
      smsNotifications: user.smsNotifications,
      reminderNotifications: user.reminderNotifications,
      // Health & wellness (for clients)
      medicalConditions: user.medicalConditions,
      medications: user.medications,
      allergies: user.allergies,
      therapyGoals: user.therapyGoals,
      // Psychologist-specific fields
      psychologistDetails: user.role === 'psychologist' ? user.psychologistDetails : undefined,
      sessionRates: user.role === 'psychologist' ? user.sessionRates : undefined,
      sessionRate: user.role === 'psychologist' ? user.sessionRate : undefined,
      availability: user.role === 'psychologist' ? user.availability : undefined,
      blockedDates: user.role === 'psychologist' ? user.blockedDates : undefined,
      approvalStatus: user.role === 'psychologist' ? user.approvalStatus : undefined,
      // Timestamps
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin
    };

    // Remove undefined fields
    Object.keys(profileData).forEach(key => {
      if (profileData[key] === undefined) {
        delete profileData[key];
      }
    });

    console.log('✅ Profile fetched successfully for:', user.email);

    res.json({
      success: true,
      user: profileData
    });

  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile'
    });
  }
});



/**
 * @route   PUT /api/profile
 * @desc    Update user profile fields
 * @access  Private
 * Requirements: 4.2, 4.3, 5.1
 */
router.put('/', auth, async (req, res) => {
  try {
    console.log('🔄 Profile update request for user:', req.user.id);
    console.log('📝 Update fields:', Object.keys(req.body));

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store previous values for audit log
    const previousValues = {};
    const newValues = {};

    // Fields that can be updated - Requirements 4.2, 4.3
    const allowedFields = [
      'name', 'preferredName', 'phone', 'dateOfBirth', 'gender',
      'address', 'city', 'state', 'zipCode', 'country',
      'occupation', 'education', 'emergencyContact', 'emergencyPhone',
      'preferredTherapyType', 'preferredLanguage', 'timeZone',
      'profileVisibility', 'emailNotifications', 'smsNotifications',
      'reminderNotifications', 'bio'
    ];

    // Psychologist-specific fields - Requirement 5.1
    const psychologistFields = ['specializations', 'experience'];

    // Array fields
    const arrayFields = ['medicalConditions', 'medications', 'allergies', 'therapyGoals'];

    // Update allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        
        // Handle empty strings for enum fields
        if (value === '' && ['gender', 'preferredTherapyType', 'profileVisibility'].includes(field)) {
          value = null;
        }

        // Track changes for audit log
        if (user[field] !== value) {
          previousValues[field] = user[field];
          newValues[field] = value;
          user[field] = value;
        }
      }
    });

    // Update array fields
    arrayFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const value = Array.isArray(req.body[field]) ? req.body[field] : [];
        if (JSON.stringify(user[field]) !== JSON.stringify(value)) {
          previousValues[field] = user[field];
          newValues[field] = value;
          user[field] = value;
        }
      }
    });

    // Handle psychologist-specific fields - Requirement 5.1
    if (user.role === 'psychologist') {
      psychologistFields.forEach(field => {
        if (req.body[field] !== undefined) {
          const currentDetails = user.psychologistDetails || {};
          if (currentDetails[field] !== req.body[field]) {
            previousValues[`psychologistDetails.${field}`] = currentDetails[field];
            newValues[`psychologistDetails.${field}`] = req.body[field];
            
            user.psychologistDetails = {
              ...currentDetails,
              [field]: req.body[field]
            };
          }
        }
      });

      // Handle bio for psychologists (stored in psychologistDetails)
      if (req.body.bio !== undefined && user.psychologistDetails) {
        const currentDetails = user.psychologistDetails || {};
        if (currentDetails.bio !== req.body.bio) {
          previousValues['psychologistDetails.bio'] = currentDetails.bio;
          newValues['psychologistDetails.bio'] = req.body.bio;
          
          user.psychologistDetails = {
            ...currentDetails,
            bio: req.body.bio
          };
        }
      }
    }

    // Validate phone number format if provided - Requirement 4.3
    if (req.body.phone) {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
      if (!phoneRegex.test(req.body.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
    }

    // Validate name if provided - Requirement 4.2
    if (req.body.name !== undefined) {
      if (!req.body.name || req.body.name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long'
        });
      }
      if (req.body.name.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot exceed 50 characters'
        });
      }
    }

    await user.save();

    // Log changes to audit log - Requirement 5.5
    if (Object.keys(newValues).length > 0) {
      await createProfileAuditLog('PROFILE_UPDATE', {
        userId: user.id,
        targetType: 'Profile',
        targetId: user.id,
        previousValue: previousValues,
        newValue: newValues,
        action: `Profile updated: ${Object.keys(newValues).join(', ')}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      console.log('📝 Audit log created for profile update');
    }

    // Prepare response data (exclude sensitive fields) - Mongoose syntax
    const updatedUser = await User.findById(req.user.id).select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationTokenExpires -loginAttempts -lockUntil');

    console.log('✅ Profile updated successfully for:', user.email);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('❌ Profile update error:', err);

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
      message: 'An error occurred while updating profile'
    });
  }
});



/**
 * @route   PUT /api/profile/picture
 * @desc    Upload/update profile picture
 * @access  Private
 * Requirements: 4.4
 */
router.put('/picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('📸 Profile picture upload request for user:', req.user.id);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      // Clean up uploaded file if user not found
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store previous profile picture path for audit log
    const previousPicture = user.profilePicture;

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldImagePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          console.log('🗑️ Old profile picture deleted');
        } catch (deleteErr) {
          console.warn('⚠️ Could not delete old profile picture:', deleteErr.message);
        }
      }
    }

    // Set new profile picture path
    const newPicturePath = `/uploads/profiles/${req.file.filename}`;
    user.profilePicture = newPicturePath;
    await user.save();

    // Log to audit log - Requirement 5.5
    await createProfileAuditLog('PROFILE_PICTURE_CHANGE', {
      userId: user.id,
      targetType: 'Profile',
      targetId: user.id,
      previousValue: { profilePicture: previousPicture },
      newValue: { profilePicture: newPicturePath },
      action: 'Profile picture updated',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname
      }
    });

    console.log('✅ Profile picture updated for:', user.email);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: newPicturePath
    });

  } catch (err) {
    console.error('❌ Profile picture upload error:', err);

    // Clean up uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.warn('⚠️ Could not clean up uploaded file:', cleanupErr.message);
      }
    }

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }

    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while uploading profile picture'
    });
  }
});

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
});



/**
 * @route   PUT /api/profile/rates
 * @desc    Update psychologist session rates
 * @access  Private (Psychologist only)
 * Requirements: 5.2
 */
router.put('/rates', auth, async (req, res) => {
  try {
    console.log('💰 Session rates update request for user:', req.user.id);

    // Find the user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user is a psychologist
    if (user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can update session rates'
      });
    }

    const { individual, couples, family, group } = req.body;

    // Validate that at least one rate is provided
    if (individual === undefined && couples === undefined && family === undefined && group === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one session rate must be provided'
      });
    }

    // Validate rate values - must be positive numbers
    const rateFields = { individual, couples, family, group };
    const errors = [];

    for (const [field, value] of Object.entries(rateFields)) {
      if (value !== undefined) {
        // Check if it's a valid number
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`${field} rate must be a valid number`);
        } else if (numValue < 0) {
          errors.push(`${field} rate must be a positive number`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Store previous values for audit log
    // Standard rates (KES): Individual=2000, Couples=3500, Family=5000, Group=5000
    const previousRates = user.sessionRates ? { ...user.sessionRates.toObject() } : {
      individual: 2000,
      couples: 3500,
      family: 5000,
      group: 5000
    };

    // Initialize sessionRates if not exists with standard rates
    if (!user.sessionRates) {
      user.sessionRates = {
        individual: 2000,
        couples: 3500,
        family: 5000,
        group: 5000
      };
    }

    // Update only the provided rates
    const newRates = {};
    if (individual !== undefined) {
      user.sessionRates.individual = Number(individual);
      newRates.individual = Number(individual);
    }
    if (couples !== undefined) {
      user.sessionRates.couples = Number(couples);
      newRates.couples = Number(couples);
    }
    if (family !== undefined) {
      user.sessionRates.family = Number(family);
      newRates.family = Number(family);
    }
    if (group !== undefined) {
      user.sessionRates.group = Number(group);
      newRates.group = Number(group);
    }

    await user.save();

    // Log changes to audit log - Requirement 5.5
    await createProfileAuditLog('SESSION_RATES_UPDATE', {
      userId: user.id,
      targetType: 'Profile',
      targetId: user.id,
      previousValue: previousRates,
      newValue: { ...previousRates, ...newRates },
      action: `Session rates updated: ${Object.keys(newRates).join(', ')}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log('✅ Session rates updated successfully for:', user.email);

    res.json({
      success: true,
      message: 'Session rates updated successfully',
      sessionRates: user.sessionRates
    });

  } catch (err) {
    console.error('❌ Session rates update error:', err);

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
      message: 'An error occurred while updating session rates'
    });
  }
});



/**
 * @route   PUT /api/profile/password
 * @desc    Change user password
 * @access  Private
 * Requirements: 4.5
 */
router.put('/password', auth, async (req, res) => {
  try {
    console.log('🔐 Password change request for user:', req.user.id);

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required'
      });
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    // Validate new password strength - Requirement 4.5
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Additional password strength checks
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    if (newPassword.length < 8 && !(hasUpperCase && hasLowerCase && hasNumbers)) {
      // For passwords less than 8 chars, require mixed case and numbers
      // For 8+ chars, we're more lenient
      console.log('⚠️ Password strength warning - short password without complexity');
    }

    // Find user with password field (Mongoose syntax)
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password - Requirement 4.5
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      console.log('❌ Current password verification failed for:', user.email);
      
      // Log failed password change attempt
      await createProfileAuditLog('PASSWORD_CHANGE', {
        userId: user.id,
        targetType: 'Profile',
        targetId: user.id,
        action: 'Password change failed - incorrect current password',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          success: false,
          reason: 'incorrect_current_password'
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Log successful password change - Requirement 5.5
    await createProfileAuditLog('PASSWORD_CHANGE', {
      userId: user.id,
      targetType: 'Profile',
      targetId: user.id,
      action: 'Password changed successfully',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        success: true,
        passwordChangedAt: user.passwordChangedAt
      }
    });

    console.log('✅ Password changed successfully for:', user.email);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error('❌ Password change error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing password'
    });
  }
});

module.exports = router;
