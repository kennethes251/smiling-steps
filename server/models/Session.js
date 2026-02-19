const mongoose = require('mongoose');
const encryption = require('../utils/encryption');
const { generateMeetingLink } = require('../utils/meetingLinkGenerator');
const { generateBookingReference } = require('../utils/bookingReferenceGenerator');

const SessionSchema = new mongoose.Schema({
  // Booking Reference Number (Requirement 1.5)
  bookingReference: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness when present
    trim: true
    // Note: unique: true already creates an index, no need for index: true
  },
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
  // Recording consent fields (Requirement 12.3)
  recordingConsent: {
    type: Boolean,
    default: false,
  },
  recordingConsentDate: {
    type: Date,
  },
  recordingConsentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    default: 'Send payment to M-Pesa number: 0118832083'
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
  
  // Admin booking fields (Requirement 15)
  createdByAdmin: {
    type: Boolean,
    default: false
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminBookingReason: {
    type: String,
    trim: true
  },
  adminPaymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  
  // Cancellation fields (Requirements 9.3, 9.4)
  cancellationRequestedAt: {
    type: Date
  },
  cancellationApprovedAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancellationNotes: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: String,
    enum: ['client', 'therapist', 'admin', 'system'],
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'processed', 'denied', 'failed', 'pending_manual', 'not_applicable'],
    default: 'not_applicable'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundPercentage: {
    type: Number,
    default: 0
  },
  refundTransactionId: {
    type: String,
    trim: true
  },
  refundProcessedAt: {
    type: Date
  },
  refundProcessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundNotes: {
    type: String,
    trim: true
  },
  
  // Rescheduling fields (Requirements 9.1, 9.2)
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  rescheduleRequestedAt: {
    type: Date
  },
  rescheduleApprovedAt: {
    type: Date
  },
  rescheduleRequestedBy: {
    type: String,
    enum: ['client', 'therapist', 'admin'],
  },
  rescheduleApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rescheduleReason: {
    type: String,
    trim: true
  },
  rescheduleNotes: {
    type: String,
    trim: true
  },
  rescheduleStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected', 'auto_approved'],
    default: 'none'
  },
  rescheduleCount: {
    type: Number,
    default: 0
  },
  originalSessionDate: {
    type: Date
  },
  newRequestedDate: {
    type: Date
  },
  rescheduleRejectedAt: {
    type: Date
  },
  rescheduleRejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rescheduleRejectionReason: {
    type: String,
    trim: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================
// INDEXES for performance optimization
// Requirements: 8.5, 13.4 - Verify 2-second query performance
// ============================================

// Primary session lookup indexes (Task 22.1)
SessionSchema.index({ client: 1, sessionDate: -1 }, { name: 'idx_client_date' });
SessionSchema.index({ psychologist: 1, sessionDate: -1 }, { name: 'idx_psychologist_date' });
SessionSchema.index({ sessionDate: -1 }, { name: 'idx_session_date_desc' });

// Status-based queries (Task 22.1)
SessionSchema.index({ status: 1, sessionDate: -1 }, { name: 'idx_status_date' });
SessionSchema.index({ client: 1, status: 1, sessionDate: -1 }, { name: 'idx_client_status_date' });
SessionSchema.index({ psychologist: 1, status: 1, sessionDate: -1 }, { name: 'idx_psychologist_status_date' });

// Payment status queries (Task 22.1)
SessionSchema.index({ paymentStatus: 1, sessionDate: -1 }, { name: 'idx_payment_status_date' });
SessionSchema.index({ client: 1, paymentStatus: 1 }, { name: 'idx_client_payment_status' });
SessionSchema.index({ psychologist: 1, paymentStatus: 1 }, { name: 'idx_psychologist_payment_status' });

// Session type queries
SessionSchema.index({ sessionType: 1, sessionDate: -1 }, { name: 'idx_session_type_date' });

// Compound index for M-Pesa checkout request ID and payment status lookups
SessionSchema.index({ mpesaCheckoutRequestID: 1, paymentStatus: 1 });

// Compound index for client payment queries (legacy - kept for backward compatibility)
SessionSchema.index({ client: 1, paymentStatus: 1, sessionDate: 1 });

// Compound index for psychologist payment queries (legacy - kept for backward compatibility)
SessionSchema.index({ psychologist: 1, paymentStatus: 1, sessionDate: 1 });

// Sparse unique index for M-Pesa transaction IDs (only for paid transactions)
SessionSchema.index({ mpesaTransactionID: 1 }, { unique: true, sparse: true });

// Video call performance indexes
SessionSchema.index({ meetingLink: 1 });
SessionSchema.index({ videoCallStarted: 1, status: 1 });

// Admin booking index for filtering admin-created sessions
SessionSchema.index({ createdByAdmin: 1, adminId: 1, createdAt: -1 });

// Cancellation indexes for efficient queries (Requirements 9.3, 9.4)
SessionSchema.index({ status: 1, cancellationRequestedAt: -1 });
SessionSchema.index({ refundStatus: 1, cancellationRequestedAt: 1 });
SessionSchema.index({ cancelledBy: 1, cancellationRequestedAt: -1 });

// Rescheduling indexes for efficient queries (Requirements 9.1, 9.2)
SessionSchema.index({ rescheduleStatus: 1, rescheduleRequestedAt: -1 });
SessionSchema.index({ rescheduledFrom: 1 });
SessionSchema.index({ rescheduledTo: 1 });
SessionSchema.index({ rescheduleRequestedBy: 1, rescheduleRequestedAt: -1 });

// Reminder system queries (Task 22.1)
SessionSchema.index({ reminder24HourSent: 1, sessionDate: 1, status: 1 }, { name: 'idx_reminder_24h' });
SessionSchema.index({ reminder1HourSent: 1, sessionDate: 1, status: 1 }, { name: 'idx_reminder_1h' });

// Created date index for sorting
SessionSchema.index({ createdAt: -1 }, { name: 'idx_created_desc' });

// Middleware to encrypt sensitive session data, generate booking reference, and ensure meeting link before saving
SessionSchema.pre('save', async function(next) {
  // Generate unique booking reference if not present (Requirement 1.5)
  if (this.isNew && !this.bookingReference) {
    // Generate reference with collision check
    let reference;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      reference = generateBookingReference();
      // Check if reference already exists
      const existing = await mongoose.model('Session').findOne({ bookingReference: reference });
      if (!existing) {
        break;
      }
      attempts++;
      console.log(`⚠️ Booking reference collision: ${reference}, attempt ${attempts}`);
    }
    
    if (attempts >= maxAttempts) {
      return next(new Error('Unable to generate unique booking reference'));
    }
    
    this.bookingReference = reference;
    console.log(`📋 Auto-generated booking reference for new session: ${this.bookingReference}`);
  }
  
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

// Virtual for scheduledDate (alias for sessionDate for backward compatibility)
SessionSchema.virtual('scheduledDate').get(function() {
  return this.sessionDate;
});

SessionSchema.virtual('scheduledDate').set(function(value) {
  this.sessionDate = value;
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

// Static method to find session by booking reference (Requirement 1.5)
SessionSchema.statics.findByBookingReference = async function(bookingReference) {
  if (!bookingReference) {
    return null;
  }
  return this.findOne({ bookingReference: bookingReference.toUpperCase().trim() });
};

// Static method to search sessions by partial booking reference
SessionSchema.statics.searchByBookingReference = async function(searchTerm, options = {}) {
  if (!searchTerm) {
    return [];
  }
  
  const { limit = 10, populate = true } = options;
  
  // Create case-insensitive regex for partial match
  const regex = new RegExp(searchTerm.replace(/[-]/g, '[-]?'), 'i');
  
  let query = this.find({ bookingReference: regex })
    .sort({ createdAt: -1 })
    .limit(limit);
  
  if (populate) {
    query = query
      .populate('client', 'name email')
      .populate('psychologist', 'name email');
  }
  
  return query.exec();
};

module.exports = mongoose.model('Session', SessionSchema);
