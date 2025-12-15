/**
 * Audit Logger for M-Pesa Payment System
 * 
 * Provides comprehensive audit trail logging for all payment-related actions
 * in compliance with Requirements 13.1, 13.2, 13.3, 13.4, 13.6
 * 
 * Features:
 * - Structured logging with required fields
 * - Tamper-evident log format with integrity checks
 * - Automatic timestamp and metadata capture
 * - Support for different action types
 * - Secure data handling (phone number masking)
 * - Database persistence with 7-year retention
 */

const crypto = require('crypto');
const encryption = require('./encryption');
const AuditLog = require('../models/AuditLog');

// Action types for audit logging
const ACTION_TYPES = {
  PAYMENT_INITIATION: 'PAYMENT_INITIATION',
  PAYMENT_STATUS_CHANGE: 'PAYMENT_STATUS_CHANGE',
  PAYMENT_CALLBACK: 'PAYMENT_CALLBACK',
  PAYMENT_QUERY: 'PAYMENT_QUERY',
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  PAYMENT_RETRY: 'PAYMENT_RETRY',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
  RECONCILIATION: 'RECONCILIATION',
  VIDEO_CALL_ACCESS: 'VIDEO_CALL_ACCESS',
  VIDEO_CALL_START: 'VIDEO_CALL_START',
  VIDEO_CALL_END: 'VIDEO_CALL_END',
  VIDEO_CALL_JOIN_ATTEMPT: 'VIDEO_CALL_JOIN_ATTEMPT',
  VIDEO_CALL_SECURITY_VALIDATION: 'VIDEO_CALL_SECURITY_VALIDATION'
};

// Previous log hash for tamper-evident chain
let previousLogHash = null;

/**
 * Generate a hash for tamper-evident logging
 * Creates a SHA-256 hash of the log entry combined with the previous hash
 * 
 * @param {Object} logEntry - The log entry to hash
 * @returns {string} - Hex string of the hash
 */
function generateLogHash(logEntry) {
  const logString = JSON.stringify(logEntry);
  const dataToHash = previousLogHash ? `${previousLogHash}${logString}` : logString;
  
  const hash = crypto.createHash('sha256')
    .update(dataToHash)
    .digest('hex');
  
  return hash;
}

/**
 * Create a structured audit log entry and persist to database
 * 
 * @param {string} actionType - Type of action being logged
 * @param {Object} data - Action-specific data
 * @returns {Promise<Object>} - Structured log entry with integrity hash
 */
async function createAuditLogEntry(actionType, data) {
  const logEntry = {
    timestamp: new Date(),
    actionType,
    ...data
  };
  
  // Generate hash for tamper-evident logging
  const hash = generateLogHash(logEntry);
  const prevHash = previousLogHash;
  previousLogHash = hash;
  
  const completeLogEntry = {
    ...logEntry,
    logHash: hash,
    previousHash: prevHash
  };
  
  // Persist to database for 7-year retention
  try {
    await AuditLog.create(completeLogEntry);
  } catch (dbError) {
    console.error('⚠️ Failed to persist audit log to database:', dbError.message);
    // Continue even if database write fails - logs are still in console
  }
  
  return completeLogEntry;
}

/**
 * Log payment initiation
 * Records when a client initiates a payment
 * 
 * Requirements: 13.2
 * 
 * @param {Object} params - Payment initiation parameters
 * @param {string} params.userId - Client user ID
 * @param {string} params.sessionId - Session ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.phoneNumber - Phone number (will be masked)
 * @param {string} params.checkoutRequestID - M-Pesa checkout request ID
 * @param {string} params.merchantRequestID - M-Pesa merchant request ID
 */
async function logPaymentInitiation({
  userId,
  sessionId,
  amount,
  phoneNumber,
  checkoutRequestID,
  merchantRequestID
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.PAYMENT_INITIATION, {
    userId,
    sessionId,
    amount,
    phoneNumber: encryption.maskPhoneNumber(phoneNumber), // Mask for privacy
    checkoutRequestID,
    merchantRequestID,
    action: 'Payment initiated via STK Push'
  });
  
  console.log('📝 AUDIT LOG [PAYMENT_INITIATION]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log payment status change
 * Records transitions in payment status
 * 
 * Requirements: 13.3
 * 
 * @param {Object} params - Status change parameters
 * @param {string} params.sessionId - Session ID
 * @param {string} params.previousStatus - Previous payment status
 * @param {string} params.newStatus - New payment status
 * @param {string} params.reason - Reason for status change
 * @param {string} params.userId - User ID (optional, for manual changes)
 * @param {string} params.transactionID - M-Pesa transaction ID (if available)
 * @param {number} params.resultCode - M-Pesa result code (if from callback)
 */
async function logPaymentStatusChange({
  sessionId,
  previousStatus,
  newStatus,
  reason,
  userId = null,
  transactionID = null,
  resultCode = null
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.PAYMENT_STATUS_CHANGE, {
    sessionId,
    previousStatus,
    newStatus,
    reason,
    userId,
    transactionID,
    resultCode,
    action: `Payment status changed from ${previousStatus} to ${newStatus}`
  });
  
  console.log('📝 AUDIT LOG [PAYMENT_STATUS_CHANGE]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log payment callback received
 * Records when M-Pesa sends a callback notification
 * 
 * Requirements: 13.1, 13.2
 * 
 * @param {Object} params - Callback parameters
 * @param {string} params.sessionId - Session ID
 * @param {string} params.checkoutRequestID - M-Pesa checkout request ID
 * @param {number} params.resultCode - M-Pesa result code
 * @param {string} params.resultDesc - M-Pesa result description
 * @param {string} params.transactionID - M-Pesa transaction ID (if successful)
 * @param {number} params.amount - Payment amount
 * @param {string} params.phoneNumber - Phone number (will be masked)
 */
async function logPaymentCallback({
  sessionId,
  checkoutRequestID,
  resultCode,
  resultDesc,
  transactionID = null,
  amount,
  phoneNumber
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.PAYMENT_CALLBACK, {
    sessionId,
    checkoutRequestID,
    resultCode,
    resultDesc,
    transactionID,
    amount,
    phoneNumber: encryption.maskPhoneNumber(phoneNumber),
    action: 'M-Pesa callback received'
  });
  
  console.log('📝 AUDIT LOG [PAYMENT_CALLBACK]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log payment status query
 * Records when the system queries M-Pesa for payment status
 * 
 * Requirements: 13.1
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.sessionId - Session ID
 * @param {string} params.checkoutRequestID - M-Pesa checkout request ID
 * @param {string} params.reason - Reason for query
 * @param {Object} params.result - Query result (optional)
 */
async function logPaymentQuery({
  sessionId,
  checkoutRequestID,
  reason,
  result = null
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.PAYMENT_QUERY, {
    sessionId,
    checkoutRequestID,
    reason,
    result,
    action: 'Payment status queried from M-Pesa API'
  });
  
  console.log('📝 AUDIT LOG [PAYMENT_QUERY]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log admin access to payment data
 * Records when an admin views or modifies payment information
 * 
 * Requirements: 13.4
 * 
 * @param {Object} params - Admin access parameters
 * @param {string} params.adminId - Admin user ID
 * @param {string} params.action - Action performed
 * @param {string} params.accessedData - Description of data accessed
 * @param {string} params.sessionId - Session ID (if applicable)
 * @param {string} params.transactionID - Transaction ID (if applicable)
 * @param {string} params.ipAddress - Admin's IP address (optional)
 */
async function logAdminAccess({
  adminId,
  action,
  accessedData,
  sessionId = null,
  transactionID = null,
  ipAddress = null
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.ADMIN_ACCESS, {
    adminId,
    action,
    accessedData,
    sessionId,
    transactionID,
    ipAddress,
    userType: 'admin'
  });
  
  console.log('📝 AUDIT LOG [ADMIN_ACCESS]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log payment retry attempt
 * Records when a payment is retried after failure
 * 
 * Requirements: 13.1, 13.2
 * 
 * @param {Object} params - Retry parameters
 * @param {string} params.sessionId - Session ID
 * @param {string} params.userId - User ID
 * @param {number} params.attemptNumber - Retry attempt number
 * @param {string} params.previousFailureReason - Reason for previous failure
 */
async function logPaymentRetry({
  sessionId,
  userId,
  attemptNumber,
  previousFailureReason
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.PAYMENT_RETRY, {
    sessionId,
    userId,
    attemptNumber,
    previousFailureReason,
    action: `Payment retry attempt #${attemptNumber}`
  });
  
  console.log('📝 AUDIT LOG [PAYMENT_RETRY]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log payment failure
 * Records when a payment fails
 * 
 * Requirements: 13.1, 13.2, 13.3
 * 
 * @param {Object} params - Failure parameters
 * @param {string} params.sessionId - Session ID
 * @param {string} params.userId - User ID
 * @param {string} params.reason - Failure reason
 * @param {number} params.resultCode - M-Pesa result code
 * @param {string} params.checkoutRequestID - M-Pesa checkout request ID
 */
async function logPaymentFailure({
  sessionId,
  userId,
  reason,
  resultCode,
  checkoutRequestID
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.PAYMENT_FAILURE, {
    sessionId,
    userId,
    reason,
    resultCode,
    checkoutRequestID,
    action: 'Payment failed'
  });
  
  console.log('📝 AUDIT LOG [PAYMENT_FAILURE]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log reconciliation action
 * Records payment reconciliation activities
 * 
 * Requirements: 13.1
 * 
 * @param {Object} params - Reconciliation parameters
 * @param {string} params.adminId - Admin user ID
 * @param {string} params.action - Reconciliation action
 * @param {Date} params.startDate - Start date of reconciliation period
 * @param {Date} params.endDate - End date of reconciliation period
 * @param {Object} params.results - Reconciliation results
 */
async function logReconciliation({
  adminId,
  action,
  startDate,
  endDate,
  results
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.RECONCILIATION, {
    adminId,
    action,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    results,
    userType: 'admin'
  });
  
  console.log('📝 AUDIT LOG [RECONCILIATION]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log video call access attempt
 * Records when a user attempts to access a video call
 * 
 * Requirements: Video Call Security & Compliance
 * 
 * @param {Object} params - Video call access parameters
 * @param {string} params.userId - User ID attempting access
 * @param {string} params.sessionId - Session ID
 * @param {string} params.action - Action attempted (join, generate-room, etc.)
 * @param {string} params.userRole - User role (client, psychologist, admin)
 * @param {string} params.ipAddress - User's IP address
 * @param {boolean} params.success - Whether access was granted
 * @param {string} params.reason - Reason for denial (if unsuccessful)
 * @param {Object} params.sessionDetails - Session details for context
 */
async function logVideoCallAccess({
  userId,
  sessionId,
  action,
  userRole,
  ipAddress,
  success,
  reason = null,
  sessionDetails = {}
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.VIDEO_CALL_ACCESS, {
    userId,
    sessionId,
    action: `Video call access: ${action}`,
    userType: userRole,
    ipAddress,
    metadata: {
      success,
      reason,
      sessionDetails: {
        sessionDate: sessionDetails.sessionDate,
        sessionType: sessionDetails.sessionType,
        paymentStatus: sessionDetails.paymentStatus,
        status: sessionDetails.status
      }
    }
  });
  
  console.log('📝 AUDIT LOG [VIDEO_CALL_ACCESS]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log video call start
 * Records when a video call session begins
 * 
 * Requirements: Video Call Security & Compliance
 * 
 * @param {Object} params - Video call start parameters
 * @param {string} params.userId - User ID who started the call
 * @param {string} params.sessionId - Session ID
 * @param {string} params.roomId - Video call room ID
 * @param {string} params.userRole - User role (client, psychologist)
 * @param {Object} params.participants - Participant information
 * @param {string} params.ipAddress - User's IP address
 */
async function logVideoCallStart({
  userId,
  sessionId,
  roomId,
  userRole,
  participants,
  ipAddress
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.VIDEO_CALL_START, {
    userId,
    sessionId,
    action: 'Video call started',
    userType: userRole,
    ipAddress,
    metadata: {
      roomId,
      participants,
      startTime: new Date().toISOString()
    }
  });
  
  console.log('📝 AUDIT LOG [VIDEO_CALL_START]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log video call end
 * Records when a video call session ends
 * 
 * Requirements: Video Call Security & Compliance
 * 
 * @param {Object} params - Video call end parameters
 * @param {string} params.userId - User ID who ended the call
 * @param {string} params.sessionId - Session ID
 * @param {string} params.roomId - Video call room ID
 * @param {string} params.userRole - User role (client, psychologist)
 * @param {number} params.duration - Call duration in minutes
 * @param {string} params.ipAddress - User's IP address
 * @param {string} params.endReason - Reason for call ending (normal, disconnect, error)
 */
async function logVideoCallEnd({
  userId,
  sessionId,
  roomId,
  userRole,
  duration,
  ipAddress,
  endReason = 'normal'
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.VIDEO_CALL_END, {
    userId,
    sessionId,
    action: 'Video call ended',
    userType: userRole,
    ipAddress,
    metadata: {
      roomId,
      duration,
      endReason,
      endTime: new Date().toISOString()
    }
  });
  
  console.log('📝 AUDIT LOG [VIDEO_CALL_END]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log video call join attempt
 * Records when a user attempts to join a video call room
 * 
 * Requirements: Video Call Security & Compliance
 * 
 * @param {Object} params - Video call join parameters
 * @param {string} params.userId - User ID attempting to join
 * @param {string} params.sessionId - Session ID
 * @param {string} params.roomId - Video call room ID
 * @param {string} params.userRole - User role (client, psychologist)
 * @param {string} params.ipAddress - User's IP address
 * @param {boolean} params.success - Whether join was successful
 * @param {string} params.reason - Reason for failure (if unsuccessful)
 * @param {Object} params.timeValidation - Time-based access validation results
 */
async function logVideoCallJoinAttempt({
  userId,
  sessionId,
  roomId,
  userRole,
  ipAddress,
  success,
  reason = null,
  timeValidation = {}
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.VIDEO_CALL_JOIN_ATTEMPT, {
    userId,
    sessionId,
    action: 'Video call join attempt',
    userType: userRole,
    ipAddress,
    metadata: {
      roomId,
      success,
      reason,
      timeValidation: {
        canJoin: timeValidation.canJoin,
        minutesUntilSession: timeValidation.minutesUntilSession,
        sessionDate: timeValidation.sessionDate
      }
    }
  });
  
  console.log('📝 AUDIT LOG [VIDEO_CALL_JOIN_ATTEMPT]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Log video call security validation
 * Records security validation events for video calls
 * 
 * Requirements: Video Call Security & Compliance
 * 
 * @param {Object} params - Security validation parameters
 * @param {string} params.userId - User ID
 * @param {string} params.sessionId - Session ID
 * @param {string} params.validationType - Type of validation (encryption, connection, etc.)
 * @param {boolean} params.passed - Whether validation passed
 * @param {Object} params.validationResults - Detailed validation results
 * @param {string} params.ipAddress - User's IP address
 */
async function logVideoCallSecurityValidation({
  userId,
  sessionId,
  validationType,
  passed,
  validationResults,
  ipAddress
}) {
  const logEntry = await createAuditLogEntry(ACTION_TYPES.VIDEO_CALL_SECURITY_VALIDATION, {
    userId,
    sessionId,
    action: `Video call security validation: ${validationType}`,
    ipAddress,
    metadata: {
      validationType,
      passed,
      validationResults,
      timestamp: new Date().toISOString()
    }
  });
  
  console.log('📝 AUDIT LOG [VIDEO_CALL_SECURITY_VALIDATION]:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
}

/**
 * Retrieve audit logs with tamper-evident format
 * Returns logs in a format that can be verified for integrity
 * 
 * Requirements: 13.6
 * 
 * @param {Object} filters - Filter criteria
 * @param {string} filters.actionType - Filter by action type
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.adminId - Filter by admin ID
 * @param {string} filters.sessionId - Filter by session ID
 * @param {string} filters.transactionID - Filter by transaction ID
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Limit number of results (default 100)
 * @param {number} filters.skip - Skip number of results (for pagination)
 * @returns {Promise<Object>} - Audit logs with integrity information
 */
async function retrieveAuditLogs(filters = {}) {
  try {
    const {
      actionType,
      userId,
      adminId,
      sessionId,
      transactionID,
      startDate,
      endDate,
      limit = 100,
      skip = 0
    } = filters;
    
    // Build query
    const query = {};
    
    if (actionType) query.actionType = actionType;
    if (userId) query.userId = userId;
    if (adminId) query.adminId = adminId;
    if (sessionId) query.sessionId = sessionId;
    if (transactionID) query.transactionID = transactionID;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Retrieve logs from database
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    const totalCount = await AuditLog.countDocuments(query);
    
    return {
      success: true,
      logs,
      totalCount,
      returnedCount: logs.length,
      filters,
      format: 'Tamper-evident with SHA-256 hash chain',
      integrityCheck: {
        enabled: true,
        algorithm: 'SHA-256',
        chainVerification: 'Each log entry contains hash of previous entry'
      },
      retention: '7 years as per compliance requirements'
    };
  } catch (error) {
    console.error('❌ Failed to retrieve audit logs:', error);
    throw error;
  }
}

/**
 * Verify log integrity
 * Checks if a log entry's hash is valid
 * 
 * @param {Object} logEntry - Log entry to verify
 * @param {string} previousHash - Hash of previous log entry
 * @returns {boolean} - True if log is valid
 */
function verifyLogIntegrity(logEntry, previousHash) {
  const { logHash, previousHash: entryPreviousHash, ...data } = logEntry;
  
  // Verify previous hash matches
  if (previousHash && entryPreviousHash !== previousHash) {
    return false;
  }
  
  // Recalculate hash
  const logString = JSON.stringify(data);
  const dataToHash = previousHash ? `${previousHash}${logString}` : logString;
  
  const calculatedHash = crypto.createHash('sha256')
    .update(dataToHash)
    .digest('hex');
  
  return calculatedHash === logHash;
}

module.exports = {
  ACTION_TYPES,
  logPaymentInitiation,
  logPaymentStatusChange,
  logPaymentCallback,
  logPaymentQuery,
  logAdminAccess,
  logPaymentRetry,
  logPaymentFailure,
  logReconciliation,
  logVideoCallAccess,
  logVideoCallStart,
  logVideoCallEnd,
  logVideoCallJoinAttempt,
  logVideoCallSecurityValidation,
  retrieveAuditLogs,
  verifyLogIntegrity
};
