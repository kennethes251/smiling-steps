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
    // Pricing for different session types
    rates: {
      individual: {
        type: Number,
        default: 2000, // Default rate in cents ($20.00)
        min: 1000 // Minimum $10.00
      },
      couples: {
        type: Number,
        default: 3500, // Default rate in cents ($35.00)
        min: 2000 // Minimum $20.00
      },
      family: {
        type: Number,
        default: 4000, // Default rate in cents ($40.00)
        min: 2500 // Minimum $25.00
      },
      group: {
        type: Number,
        default: 1500, // Default rate in cents ($15.00)
        min: 800 // Minimum $8.00
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


// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Set passwordChangedAt if not new user
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // 1 second in past to ensure token is created after
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
UserSchema.methods.correctPassword = async function(candidatePassword) {
  // 'this.password' refers to the password of the user instance
  return await bcrypt.compare(candidatePassword, this.password);
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

// Query middleware to filter out inactive users by default
UserSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
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

module.exports = mongoose.model('User', UserSchema);
