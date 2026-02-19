/**
 * Audit Log Model
 * 
 * Stores audit trail for all system actions including:
 * - Payment-related actions
 * - User management actions
 * - Profile changes
 * - Session status changes
 * 
 * Implements tamper-evident logging with hash chain
 * 
 * Requirements: 5.5, 8.6, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Core audit fields
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
    // Note: Compound indexes below cover timestamp queries
  },
  
  actionType: {
    type: String,
    required: true,
    enum: [
      // Payment actions
      'PAYMENT_INITIATION',
      'PAYMENT_STATUS_CHANGE',
      'PAYMENT_CALLBACK',
      'PAYMENT_QUERY',
      'PAYMENT_RETRY',
      'PAYMENT_FAILURE',
      'RECONCILIATION',
      // Video call actions
      'VIDEO_CALL_ACCESS',
      'VIDEO_CALL_START',
      'VIDEO_CALL_END',
      'VIDEO_CALL_JOIN_ATTEMPT',
      'VIDEO_CALL_SECURITY_VALIDATION',
      // User management actions - Requirements 5.5, 8.6
      'USER_CREATE',
      'USER_UPDATE',
      'USER_STATUS_CHANGE',
      'USER_DELETE',
      'USER_ANONYMIZE',
      'USER_REACTIVATE',
      'USER_LOGIN',
      // Psychologist approval actions
      'PSYCHOLOGIST_APPROVE',
      'PSYCHOLOGIST_REJECT',
      'PSYCHOLOGIST_REGISTER',
      // Profile actions
      'PROFILE_UPDATE',
      'PROFILE_PICTURE_CHANGE',
      'PASSWORD_CHANGE',
      'AVAILABILITY_UPDATE',
      'SESSION_RATES_UPDATE',
      'NOTIFICATION_SETTINGS_UPDATE',
      // Session actions
      'SESSION_STATUS_CHANGE',
      'SESSION_CREATE',
      'SESSION_CANCEL',
      'SESSION_NOTES_ACCESS',
      'SESSION_EXPORT',
      'INTAKE_FORM_ACCESS',
      // Admin actions
      'ADMIN_ACCESS',
      'ADMIN_USER_VIEW',
      'ADMIN_PAYMENT_VIEW',
      'ADMIN_EXPORT',
      // Security monitoring actions - Requirement 10.5
      'SECURITY_MONITORING',
      'SECURITY_FAILED_LOGIN',
      'SECURITY_ACCESS_MONITOR',
      'SECURITY_EXPORT_MONITOR',
      'SECURITY_INCIDENT_CREATED',
      'SECURITY_INCIDENT_ARCHIVED',
      'SECURITY_BREACH_PROCESSED',
      'SECURITY_BREACH_ERROR',
      // Client export actions
      'CLIENT_EXPORT'
    ]
    // Note: Compound indexes below cover actionType queries
  },
  
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Note: Compound indexes below cover userId queries
  },
  
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Note: Compound indexes below cover adminId queries
  },
  
  // Target entity tracking - Requirements 5.5, 8.6
  targetType: {
    type: String,
    enum: ['User', 'Session', 'Payment', 'Profile', 'Availability', 'Settings']
    // Note: Compound indexes below cover targetType queries
  },
  
  targetId: {
    type: mongoose.Schema.Types.ObjectId
    // Note: Compound indexes below cover targetId queries
  },
  
  // Change tracking - Requirements 5.5
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Session and transaction references
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
    // Note: Compound indexes below cover sessionId queries
  },
  
  transactionID: {
    type: String,
    trim: true
    // Note: Sparse index defined below for transactionID
  },
  
  checkoutRequestID: {
    type: String,
    trim: true
    // Note: Sparse index defined below for checkoutRequestID
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
  
  userAgent: {
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
    trim: true
    // Note: Sparse compound index defined below for roomId
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

// ============================================
// INDEXES for efficient querying - Requirements 5.5, 8.5, 8.6
// Task 22.1: Index audit log queries by date and user
// Verify 2-second query performance for date ranges up to 90 days
// ============================================

// Primary timestamp index for date range queries (Requirement 8.5)
AuditLogSchema.index({ timestamp: -1 }, { name: 'idx_timestamp_desc' }); // Most recent first
AuditLogSchema.index({ timestamp: 1 }, { name: 'idx_timestamp_asc' }); // For range scans

// User-based queries
AuditLogSchema.index({ userId: 1, timestamp: -1 }, { name: 'idx_user_timestamp' });
AuditLogSchema.index({ adminId: 1, timestamp: -1 }, { name: 'idx_admin_timestamp' });

// Action type queries
AuditLogSchema.index({ actionType: 1, timestamp: -1 }, { name: 'idx_action_type_timestamp' });
AuditLogSchema.index({ actionType: 1, userId: 1, timestamp: -1 }, { name: 'idx_action_user_timestamp' });

// Session-related audit queries
AuditLogSchema.index({ sessionId: 1, timestamp: -1 }, { name: 'idx_session_audit_timestamp' });

// Target entity queries (Requirements 5.5)
AuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 }, { name: 'idx_target_timestamp' });
AuditLogSchema.index({ targetId: 1, timestamp: -1 }, { name: 'idx_target_id_timestamp' });

// Transaction queries
AuditLogSchema.index({ transactionID: 1 }, { name: 'idx_transaction_id', sparse: true });
AuditLogSchema.index({ checkoutRequestID: 1 }, { name: 'idx_checkout_request_id', sparse: true });

// Compound index for efficient date range + action type queries
AuditLogSchema.index({ timestamp: 1, actionType: 1 }, { name: 'idx_timestamp_action_compound' });

// Video call audit queries
AuditLogSchema.index({ roomId: 1, timestamp: -1 }, { name: 'idx_room_timestamp', sparse: true });

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
