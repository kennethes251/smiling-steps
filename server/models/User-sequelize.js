const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 50],
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [4, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('client', 'psychologist', 'admin'),
      defaultValue: 'client',
      set(value) {
        this.setDataValue('role', value ? value.toLowerCase() : 'client');
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE
    },
    passwordChangedAt: {
      type: DataTypes.DATE
    },
    passwordResetToken: {
      type: DataTypes.STRING
    },
    passwordResetExpires: {
      type: DataTypes.DATE
    },
    verificationToken: {
      type: DataTypes.STRING
    },
    verificationTokenExpires: {
      type: DataTypes.DATE
    },
    
    // Personal Information (stored as JSON for flexibility)
    personalInfo: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // This will contain: preferredName, phone, dateOfBirth, gender, address, etc.
    },
    
    // Health & Wellness Information
    healthInfo: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // This will contain: medicalConditions, medications, allergies, therapyGoals
    },
    
    // Preferences
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // This will contain: preferredTherapyType, language, timeZone, notifications, etc.
    },
    
    // Psychologist-specific details
    psychologistDetails: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // This will contain all psychologist-specific fields
    },
    
    // Profile information
    profileInfo: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // This will contain: bio, profilePicture, visibility settings
    }
  }, {
    timestamps: true,
    tableName: 'users',
    defaultScope: {
      where: {
        active: true
      },
      attributes: {
        exclude: ['password', 'passwordResetToken', 'verificationToken', 'loginAttempts']
      }
    },
    scopes: {
      withPassword: {
        attributes: {
          include: ['password']
        }
      },
      all: {
        where: {}
      }
    },
    hooks: {
      beforeSave: async (user) => {
        // Hash password if it's been modified
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
          
          // Set passwordChangedAt if not new user
          if (!user.isNewRecord) {
            user.passwordChangedAt = new Date(Date.now() - 1000);
          }
        }
      }
    }
  });

  // Instance methods
  User.prototype.correctPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  };

  User.prototype.isAccountLocked = function() {
    return this.lockUntil && this.lockUntil > new Date();
  };

  User.prototype.createApprovalToken = function() {
    const approvalToken = crypto.randomBytes(32).toString('hex');
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(approvalToken)
      .digest('hex');
    
    // Update psychologist details
    const details = this.psychologistDetails || {};
    details.approvalToken = hashedToken;
    details.approvalTokenExpires = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
    
    this.psychologistDetails = details;
    
    return approvalToken;
  };

  // Static methods
  User.failedLogin = async function(userId) {
    const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
    const MAX_ATTEMPTS = 5;

    const user = await this.scope('all').findByPk(userId);
    if (!user) return;

    user.loginAttempts = (user.loginAttempts || 0) + 1;

    if (user.loginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME);
    }

    await user.save();
    return user;
  };

  return User;
};