/**
 * Audit Log Model
 * 
 * Stores audit trail for all payment-related actions
 * Implements tamper-evident logging with hash chain
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Core audit fields
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  actionType: {
    type: String,
    required: true,
    enum: [
      'PAYMENT_INITIATION',
      'PAYMENT_STATUS_CHANGE',
      'PAYMENT_CALLBACK',
      'PAYMENT_QUERY',
      'ADMIN_ACCESS',
      'PAYMENT_RETRY',
      'PAYMENT_FAILURE',
      'RECONCILIATION',
      'VIDEO_CALL_ACCESS',
      'VIDEO_CALL_START',
      'VIDEO_CALL_END',
      'VIDEO_CALL_JOIN_ATTEMPT',
      'VIDEO_CALL_SECURITY_VALIDATION'
    ],
    index: true
  },
  
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Session and transaction references
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    index: true
  },
  
  transactionID: {
    type: String,
    trim: true,
    index: true
  },
  
  checkoutRequestID: {
    type: String,
    trim: true,
    index: true
  },
  
  // Action details
  action: {
    type: String,
    required: true
  },
  
  // Payment-specific fields
  amount: {
    type: Number
  },
  
  phoneNumber: {
    type: String, // Already masked before storage
    trim: true
  },
  
  // Status change tracking
  previousStatus: {
    type: String
  },
  
  newStatus: {
    type: String
  },
  
  reason: {
    type: String
  },
  
  resultCode: {
    type: Number
  },
  
  // Admin access tracking
  accessedData: {
    type: String
  },
  
  ipAddress: {
    type: String,
    trim: true
  },
  
  userType: {
    type: String,
    enum: ['client', 'psychologist', 'admin']
  },
  
  // Reconciliation tracking
  startDate: {
    type: Date
  },
  
  endDate: {
    type: Date
  },
  
  results: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Retry tracking
  attemptNumber: {
    type: Number
  },
  
  previousFailureReason: {
    type: String
  },
  
  // Tamper-evident fields
  logHash: {
    type: String,
    required: true,
    unique: true
  },
  
  previousHash: {
    type: String
  },
  
  // Video call specific fields
  roomId: {
    type: String,
    trim: true,
    index: true
  },
  
  callDuration: {
    type: Number // Duration in minutes
  },
  
  validationType: {
    type: String,
    enum: ['encryption', 'connection', 'authentication', 'authorization']
  },
  
  validationPassed: {
    type: Boolean
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: false // We use our own timestamp field
});

// Indexes for efficient querying
AuditLogSchema.index({ timestamp: -1 }); // Most recent first
AuditLogSchema.index({ actionType: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ adminId: 1, timestamp: -1 });
AuditLogSchema.index({ sessionId: 1, timestamp: -1 });
AuditLogSchema.index({ transactionID: 1 });

// Prevent modification of audit logs
AuditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

AuditLogSchema.pre('updateOne', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

AuditLogSchema.pre('updateMany', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
