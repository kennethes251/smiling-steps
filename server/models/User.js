const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  // Account status - Requirements 2.4, 2.5, 2.6
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active'
    // Note: Compound index { role: 1, status: 1 } covers status queries
  },
  
  // Approval status for psychologists - Requirements 3.1, 3.4, 3.5
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_applicable'],
    default: function() {
      return this.role === 'psychologist' ? 'pending' : 'not_applicable';
    }
    // Note: Compound index { role: 1, approvalStatus: 1 } covers approvalStatus queries
  },
  approvalReason: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Availability schedule for psychologists - Requirements 6.2, 6.3
  availability: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
    }
  }],
  blockedDates: [{
    type: Date
  }],
  
  // Session rates for different session types - Requirements 5.2
  // Standard rates (KES): Individual=2000, Couples=3500, Family=5000, Group=5000
  sessionRates: {
    individual: {
      type: Number,
      default: 2000,
      min: 0
    },
    couples: {
      type: Number,
      default: 3500,
      min: 0
    },
    family: {
      type: Number,
      default: 5000,
      min: 0
    },
    group: {
      type: Number,
      default: 5000,
      min: 0
    }
  },
  
  // Notification preferences - Requirements 13.2, 13.3
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    quietHoursStart: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Quiet hours start must be in HH:MM format']
    },
    quietHoursEnd: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Quiet hours end must be in HH:MM format']
    },
    sessionReminders: {
      type: Boolean,
      default: true
    },
    paymentAlerts: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  
  // Soft delete and anonymization fields - Requirements 2.6
  deletedAt: {
    type: Date
  },
  anonymizedAt: {
    type: Date
  },
  preferredName: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String // URL to uploaded image
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: String // Format: YYYY-MM-DD
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer-not-to-say']
  },
  
  // Location fields
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'United States'
  },
  
  // Personal details
  occupation: {
    type: String,
    trim: true
  },
  education: {
    type: String,
    trim: true
  },
  emergencyContact: {
    type: String,
    trim: true
  },
  emergencyPhone: {
    type: String,
    trim: true
  },
  
  // Health & wellness
  medicalConditions: [{
    type: String,
    trim: true
  }],
  medications: [{
    type: String,
    trim: true
  }],
  allergies: [{
    type: String,
    trim: true
  }],
  therapyGoals: [{
    type: String,
    trim: true
  }],
  
  // Preferences
  preferredTherapyType: {
    type: String,
    enum: ['CBT', 'DBT', 'Psychodynamic', 'Humanistic', 'EMDR', 'Family', 'Group', 'No Preference']
  },
  preferredLanguage: {
    type: String,
    default: 'English'
  },
  timeZone: {
    type: String,
    default: 'America/New_York'
  },
  
  // Privacy & notifications
  profileVisibility: {
    type: String,
    enum: ['private', 'limited', 'public'],
    default: 'private'
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: false
  },
  reminderNotifications: {
    type: Boolean,
    default: true
  },
  
  // Bio
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true, // unique: true already creates an index
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: 'Please provide a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [4, 'Password must be at least 4 characters long'],
    select: false // Never return password in queries
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  role: {
    type: String,
    enum: ['client', 'psychologist', 'admin'],
    default: 'client',
    lowercase: true,
    set: function(value) {
      return value ? value.toLowerCase() : 'client';
    }
  },
  psychologistDetails: {
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: function() { return this.role === 'psychologist'; }
    },
    licenseUrl: String,
    profilePictureUrl: String,
    age: {
      type: Number,
      min: [18, 'Age must be at least 18'],
      max: [100, 'Age must be less than 100']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    specializations: [String],
    therapyTypes: [{
      type: String,
      enum: ['Individual', 'Couples', 'Family', 'Group'],
      required: function() { return this.role === 'psychologist'; }
    }],
    experience: {
      type: String,
      trim: true
    },
    education: {
      type: String,
      trim: true
    },
    languages: [String],
    portfolioUrls: [String],
    // Credentials storage - Requirements 5.3
    credentials: [{
      type: {
        type: String,
        enum: ['license', 'certification', 'degree', 'other']
      },
      documentUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      verified: {
        type: Boolean,
        default: false
      }
    }],
    // Clarification requests from admin - Requirement 6.5
    clarificationRequests: [{
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      message: String,
      requestedAt: {
        type: Date,
        default: Date.now
      },
      respondedAt: Date,
      response: String,
      status: {
        type: String,
        enum: ['pending', 'responded', 'resolved'],
        default: 'pending'
      }
    }],
    // Pricing for different session types
    // Standard rates (KES): Individual=2000, Couples=3500, Family=5000, Group=5000
    rates: {
      individual: {
        type: Number,
        default: 2000, // Default rate in KES
        min: 500 // Minimum KES 500
      },
      couples: {
        type: Number,
        default: 3500, // Default rate in KES
        min: 1000 // Minimum KES 1000
      },
      family: {
        type: Number,
        default: 5000, // Default rate in KES
        min: 1500 // Minimum KES 1500
      },
      group: {
        type: Number,
        default: 5000, // Default rate in KES
        min: 500 // Minimum KES 500
      }
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    approvalToken: String,
    approvalTokenExpires: Date
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },

  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Number,
    select: false
  },
  
  // Email verification fields
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenExpires: {
    type: Date,
    select: false
  },
  
  // Session rates for psychologists
  sessionRate: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES for performance optimization (Task 22.1)
// ============================================

// Role-based queries
UserSchema.index({ role: 1, status: 1 }, { name: 'idx_role_status' });
UserSchema.index({ role: 1, approvalStatus: 1 }, { name: 'idx_role_approval' });

// Psychologist queries
UserSchema.index({ role: 1, 'psychologistDetails.approvalStatus': 1 }, { name: 'idx_psychologist_approval' });

// Last login queries
UserSchema.index({ lastLogin: -1 }, { name: 'idx_last_login' });

// Created date queries
UserSchema.index({ createdAt: -1 }, { name: 'idx_created_desc' });

// Verification status queries
UserSchema.index({ isVerified: 1, role: 1 }, { name: 'idx_verified_role' });


// Password hashing middleware
UserSchema.pre('save', async function(next) {
  // Sync approvalStatus for psychologists
  if (this.role === 'psychologist') {
    // If top-level approvalStatus is not set, default to pending
    if (!this.approvalStatus || this.approvalStatus === 'not_applicable') {
      this.approvalStatus = 'pending';
    }
    // Sync with psychologistDetails.approvalStatus
    if (this.psychologistDetails) {
      this.psychologistDetails.approvalStatus = this.approvalStatus;
    }
  } else if (!this.approvalStatus) {
    this.approvalStatus = 'not_applicable';
  }
  
  // Set default status if not set
  if (!this.status) {
    this.status = 'active';
  }
  
  if (!this.isModified('password')) {
    console.log('🔐 Pre-save: Password not modified, skipping hash');
    return next();
  }
  
  try {
    // Check if password is already hashed (starts with $2a$ or $2b$)
    if (this.password && this.password.startsWith('$2')) {
      console.log('⚠️ Pre-save: Password appears to already be hashed, skipping');
      return next();
    }
    
    console.log('🔐 Pre-save: Hashing password', {
      passwordLength: this.password ? this.password.length : 0,
      isNew: this.isNew
    });
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    console.log('✅ Pre-save: Password hashed successfully', {
      hashLength: this.password.length,
      hashPrefix: this.password.substring(0, 7)
    });
    
    // Set passwordChangedAt if not new user
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // 1 second in past to ensure token is created after
    }
    
    next();
  } catch (error) {
    console.error('❌ Pre-save: Password hashing failed', error);
    next(error);
  }
});

// Instance method to check password
UserSchema.methods.correctPassword = async function(candidatePassword) {
  console.log('🔐 correctPassword method called:', {
    candidateLength: candidatePassword ? candidatePassword.length : 0,
    storedHashLength: this.password ? this.password.length : 0,
    storedHashPrefix: this.password ? this.password.substring(0, 7) : 'N/A'
  });
  
  // 'this.password' refers to the password of the user instance
  const result = await bcrypt.compare(candidatePassword, this.password);
  
  console.log('🔐 correctPassword result:', result);
  return result;
};

// Instance method to check if password was changed after token was issued
UserSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to check if account is locked
UserSchema.methods.isAccountLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Static method to handle login attempts
UserSchema.statics.failedLogin = async function(userId) {
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;

  const user = await this.findById(userId);
  if (!user) return;

  user.loginAttempts = (user.loginAttempts || 0) + 1;

  if (user.loginAttempts >= MAX_ATTEMPTS) {
    user.lockUntil = Date.now() + LOCK_TIME;
  }

  await user.save();
  return user;
};

// Query middleware to filter out inactive and deleted users by default
UserSchema.pre(/^find/, function(next) {
  // Filter out inactive users (existing behavior)
  this.find({ active: { $ne: false } });
  // Filter out deleted users (new behavior)
  this.find({ status: { $ne: 'deleted' } });
  next();
});

// Virtual for user's full name
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for account status
UserSchema.virtual('isLocked').get(function() {
  return this.lockUntil && this.lockUntil > Date.now();
});

UserSchema.methods.createApprovalToken = function() {
  const approvalToken = crypto.randomBytes(32).toString('hex');

  this.psychologistDetails.approvalToken = crypto
    .createHash('sha256')
    .update(approvalToken)
    .digest('hex');

  // Token expires in 10 days
  this.psychologistDetails.approvalTokenExpires = Date.now() + 10 * 24 * 60 * 60 * 1000;

  return approvalToken;
};

// Method to soft delete and anonymize user data - Requirements 2.6
UserSchema.methods.softDeleteAndAnonymize = async function() {
  const now = new Date();
  
  this.status = 'deleted';
  this.deletedAt = now;
  this.anonymizedAt = now;
  
  // Anonymize personal data
  this.name = 'Deleted User';
  this.email = `deleted_${this._id}@anonymized.local`;
  this.phone = null;
  this.preferredName = null;
  this.profilePicture = null;
  this.dateOfBirth = null;
  this.address = null;
  this.city = null;
  this.state = null;
  this.zipCode = null;
  this.emergencyContact = null;
  this.emergencyPhone = null;
  this.bio = null;
  
  // Clear sensitive arrays
  this.medicalConditions = [];
  this.medications = [];
  this.allergies = [];
  this.therapyGoals = [];
  
  // Clear psychologist details if applicable
  if (this.psychologistDetails) {
    this.psychologistDetails.bio = null;
    this.psychologistDetails.licenseUrl = null;
    this.psychologistDetails.profilePictureUrl = null;
    this.psychologistDetails.credentials = [];
    this.psychologistDetails.portfolioUrls = [];
  }
  
  return this.save();
};

// Method to check if user can login based on status
UserSchema.methods.canLogin = function() {
  return this.status === 'active' && !this.isAccountLocked();
};

module.exports = mongoose.model('User', UserSchema);
