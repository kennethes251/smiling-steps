const mongoose = require('mongoose');
const encryption = require('../utils/encryption');
const { generateMeetingLink } = require('../utils/meetingLinkGenerator');

const SessionSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  psychologist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionType: {
    type: String,
    enum: ['Individual', 'Couples', 'Family', 'Group'],
    required: true,
  },
  sessionDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'Booked', 'In Progress', 'Completed', 'Cancelled', 'Declined'],
    default: 'Pending',
  },
  meetingLink: {
    type: String,
    trim: true,
  },
  sessionNotes: {
    type: String,
    trim: true,
  },
  sessionProof: {
    type: String, // URL to the uploaded proof image
  },
  price: {
    type: Number,
    required: true,
  },
  // Video call specific fields
  isVideoCall: {
    type: Boolean,
    default: true,
  },
  videoCallStarted: {
    type: Date,
  },
  videoCallEnded: {
    type: Date,
  },
  callDuration: {
    type: Number, // in minutes
  },
  isInstantSession: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    trim: true,
  },
  // Recording settings (for future implementation)
  recordingEnabled: {
    type: Boolean,
    default: false,
  },
  recordingUrl: {
    type: String,
    trim: true,
  },
  
  // Payment fields
  sessionRate: {
    type: Number
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Submitted', 'Verified', 'Processing', 'Paid', 'Confirmed', 'Failed'],
    default: 'Pending'
  },
  paymentProof: {
    transactionCode: String,
    screenshot: String,
    submittedAt: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  declineReason: {
    type: String
  },
  paymentVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentInstructions: {
    type: String,
    default: 'Send payment to M-Pesa number: 0707439299'
  },
  paymentNotifiedAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'stripe', 'cash', 'manual'],
    default: 'mpesa'
  },
  paymentInitiatedAt: {
    type: Date
  },
  paymentVerifiedAt: {
    type: Date
  },
  
  // M-Pesa payment fields
  mpesaCheckoutRequestID: {
    type: String,
    trim: true
  },
  mpesaMerchantRequestID: {
    type: String,
    trim: true
  },
  mpesaTransactionID: {
    type: String,
    trim: true
  },
  mpesaAmount: {
    type: Number
  },
  mpesaPhoneNumber: {
    type: String,
    trim: true
  },
  mpesaResultCode: {
    type: Number
  },
  mpesaResultDesc: {
    type: String,
    trim: true
  },
  
  // Payment audit trail
  paymentAttempts: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    amount: {
      type: Number
    },
    checkoutRequestID: {
      type: String,
      trim: true
    },
    resultCode: {
      type: Number
    },
    resultDesc: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['initiated', 'success', 'failed', 'timeout', 'cancelled']
    }
  }],
  
  // Session reminder tracking
  reminder24HourSent: {
    type: Boolean,
    default: false
  },
  reminder24HourSentAt: {
    type: Date
  },
  reminder1HourSent: {
    type: Boolean,
    default: false
  },
  reminder1HourSentAt: {
    type: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for performance optimization
// Compound index for M-Pesa checkout request ID and payment status lookups
SessionSchema.index({ mpesaCheckoutRequestID: 1, paymentStatus: 1 });

// Compound index for client payment queries
SessionSchema.index({ client: 1, paymentStatus: 1, sessionDate: 1 });

// Compound index for psychologist payment queries
SessionSchema.index({ psychologist: 1, paymentStatus: 1, sessionDate: 1 });

// Sparse unique index for M-Pesa transaction IDs (only for paid transactions)
SessionSchema.index({ mpesaTransactionID: 1 }, { unique: true, sparse: true });

// Video call performance indexes
SessionSchema.index({ meetingLink: 1 });
SessionSchema.index({ videoCallStarted: 1, status: 1 });

// Middleware to encrypt sensitive session data and ensure meeting link before saving
SessionSchema.pre('save', function(next) {
  // Generate meeting link if not present (for video call sessions)
  if (this.isNew && this.isVideoCall !== false && !this.meetingLink) {
    this.meetingLink = generateMeetingLink();
    console.log(`🎥 Auto-generated meeting link for new session: ${this.meetingLink}`);
  }
  
  // Encrypt sensitive fields
  this.encryptSensitiveFields();
  
  next();
});

// Helper method to check if data is encrypted
SessionSchema.methods.isEncrypted = function(data) {
  if (!data || typeof data !== 'string') return false;
  const parts = data.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
};

// Method to encrypt sensitive fields
SessionSchema.methods.encryptSensitiveFields = function() {
  const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
  
  for (const field of sensitiveFields) {
    if (this.isModified(field) && this[field] && !this.isEncrypted(this[field])) {
      try {
        this[field] = encryption.encrypt(this[field]);
        console.log(`🔒 Encrypted sensitive field: ${field}`);
      } catch (error) {
        console.error(`Failed to encrypt ${field}:`, error);
        throw error;
      }
    }
  }
};

// Method to decrypt a specific field
SessionSchema.methods.decryptField = function(fieldName) {
  const fieldValue = this[fieldName];
  if (!fieldValue) {
    return '';
  }
  
  try {
    if (this.isEncrypted(fieldValue)) {
      return encryption.decrypt(fieldValue);
    }
    // Return as-is if not encrypted (for backward compatibility)
    return fieldValue;
  } catch (error) {
    console.error(`Failed to decrypt ${fieldName}:`, error);
    return '[Encrypted - Unable to decrypt]';
  }
};

// Method to get decrypted session notes (backward compatibility)
SessionSchema.methods.getDecryptedNotes = function() {
  return this.decryptField('sessionNotes');
};

// Method to get decrypted meeting link
SessionSchema.methods.getDecryptedMeetingLink = function() {
  return this.decryptField('meetingLink');
};

// Method to get decrypted title
SessionSchema.methods.getDecryptedTitle = function() {
  return this.decryptField('title');
};

// Method to get decrypted session proof
SessionSchema.methods.getDecryptedSessionProof = function() {
  return this.decryptField('sessionProof');
};

// Method to get decrypted decline reason
SessionSchema.methods.getDecryptedDeclineReason = function() {
  return this.decryptField('declineReason');
};

// Method to get all decrypted sensitive data
SessionSchema.methods.getDecryptedData = function() {
  return {
    sessionNotes: this.getDecryptedNotes(),
    meetingLink: this.getDecryptedMeetingLink(),
    title: this.getDecryptedTitle(),
    sessionProof: this.getDecryptedSessionProof(),
    declineReason: this.getDecryptedDeclineReason()
  };
};

// Virtual properties for easy access to decrypted data
SessionSchema.virtual('decryptedNotes').get(function() {
  return this.getDecryptedNotes();
});

SessionSchema.virtual('decryptedMeetingLink').get(function() {
  return this.getDecryptedMeetingLink();
});

SessionSchema.virtual('decryptedTitle').get(function() {
  return this.getDecryptedTitle();
});

SessionSchema.virtual('decryptedSessionProof').get(function() {
  return this.getDecryptedSessionProof();
});

SessionSchema.virtual('decryptedDeclineReason').get(function() {
  return this.getDecryptedDeclineReason();
});

module.exports = mongoose.model('Session', SessionSchema);
