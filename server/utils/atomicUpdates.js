/**
 * Atomic Update Utilities
 * 
 * This module provides atomic update functions that ensure payment and session
 * states are always synchronized. All updates are wrapped in database transactions
 * to prevent partial state updates.
 * 
 * CRITICAL: Use these functions for all payment-related state changes.
 */

const { validateStateTransition } = require('./stateValidation');
const { PAYMENT_STATES } = require('../constants/paymentStates');
const { SESSION_STATES } = require('../constants/sessionStates');

/**
 * Atomic Payment Callback Handler
 * 
 * Processes M-Pesa payment callbacks atomically, ensuring payment and session
 * states are updated together or not at all.
 * 
 * @param {Object} session - Session document
 * @param {Object} callbackData - M-Pesa callback data
 * @param {number} callbackData.ResultCode - M-Pesa result code
 * @param {string} callbackData.ResultDesc - M-Pesa result description
 * @param {Object} callbackData.metadata - Payment metadata
 * @param {string} callbackData.CheckoutRequestID - Checkout request ID
 * @returns {Promise<Object>} Updated session
 */
async function handlePaymentCallbackAtomic(session, callbackData) {
  const { ResultCode, ResultDesc, metadata, CheckoutRequestID } = callbackData;
  
  // Determine new states based on result code
  const isSuccess = ResultCode === 0;
  const newPaymentState = isSuccess ? PAYMENT_STATES.CONFIRMED : PAYMENT_STATES.FAILED;
  const newSessionState = isSuccess ? SESSION_STATES.PAID : SESSION_STATES.PAYMENT_PENDING;
  
  // Validate state transitions before processing
  try {
    validateStateTransition({
      entityType: 'payment',
      currentState: session.paymentStatus || PAYMENT_STATES.INITIATED,
      newState: newPaymentState,
      paymentState: newPaymentState,
      sessionState: newSessionState
    });
    
    validateStateTransition({
      entityType: 'session',
      currentState: session.status,
      newState: newSessionState,
      paymentState: newPaymentState,
      sessionState: newSessionState
    });
  } catch (validationError) {
    console.error('❌ Payment callback validation failed:', validationError.message);
    throw new Error(`Invalid state transition in payment callback: ${validationError.message}`);
  }

  // Check for idempotency - prevent duplicate processing
  const existingAttempt = session.paymentAttempts?.find(
    attempt => attempt.checkoutRequestID === CheckoutRequestID && 
               attempt.status === 'success'
  );
  
  if (existingAttempt && session.paymentStatus === PAYMENT_STATES.CONFIRMED) {
    console.log('⚠️ Duplicate callback detected, returning cached result:', CheckoutRequestID);
    return {
      session,
      isDuplicate: true,
      message: 'Callback already processed'
    };
  }

  // Start atomic transaction
  try {
    // For Mongoose, we'll use a session transaction
    const mongoose = require('mongoose');
    const mongoSession = await mongoose.startSession();
    
    let updatedSession;
    
    await mongoSession.withTransaction(async () => {
      // Update payment status
      session.paymentStatus = newPaymentState;
      session.mpesaResultCode = ResultCode;
      session.mpesaResultDesc = ResultDesc;
      
      if (isSuccess) {
        // Payment successful
        session.status = newSessionState;
        session.mpesaTransactionID = metadata.MpesaReceiptNumber;
        session.paymentVerifiedAt = new Date();
        session.paymentMethod = 'M-Pesa';
        
        // Add successful payment attempt
        if (!session.paymentAttempts) {
          session.paymentAttempts = [];
        }
        session.paymentAttempts.push({
          checkoutRequestID: CheckoutRequestID,
          status: 'success',
          transactionID: metadata.MpesaReceiptNumber,
          amount: metadata.Amount,
          phoneNumber: metadata.PhoneNumber,
          processedAt: new Date()
        });
        
        console.log('✅ Payment confirmed atomically:', {
          sessionId: session._id,
          transactionID: metadata.MpesaReceiptNumber,
          amount: metadata.Amount
        });
        
      } else {
        // Payment failed
        session.paymentFailedAt = new Date();
        session.paymentFailureReason = ResultDesc;
        
        // Add failed payment attempt
        if (!session.paymentAttempts) {
          session.paymentAttempts = [];
        }
        session.paymentAttempts.push({
          checkoutRequestID: CheckoutRequestID,
          status: 'failed',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          processedAt: new Date()
        });
        
        console.log('❌ Payment failed atomically:', {
          sessionId: session._id,
          resultCode: ResultCode,
          resultDesc: ResultDesc
        });
      }
      
      // Save session within transaction
      updatedSession = await session.save({ session: mongoSession });
    });
    
    await mongoSession.endSession();
    
    return {
      session: updatedSession,
      isDuplicate: false,
      message: isSuccess ? 'Payment confirmed successfully' : 'Payment failed'
    };
    
  } catch (error) {
    console.error('❌ Atomic payment callback failed:', error);
    throw new Error(`Atomic payment update failed: ${error.message}`);
  }
}

/**
 * Atomic Session Status Update
 * 
 * Updates session status atomically with validation and audit logging.
 * 
 * @param {Object} session - Session document
 * @param {string} newStatus - New session status
 * @param {string} reason - Reason for status change
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object>} Updated session
 */
async function updateSessionStatusAtomic(session, newStatus, reason = null, additionalData = {}) {
  // Validate state transition
  try {
    validateStateTransition({
      entityType: 'session',
      currentState: session.status,
      newState: newStatus,
      sessionState: newStatus,
      paymentState: session.paymentStatus,
      formsComplete: session.formsCompleted || false
    });
  } catch (validationError) {
    console.error('❌ Session status update validation failed:', validationError.message);
    throw new Error(`Invalid session status transition: ${validationError.message}`);
  }

  // Start atomic transaction
  try {
    const mongoose = require('mongoose');
    const mongoSession = await mongoose.startSession();
    
    let updatedSession;
    
    await mongoSession.withTransaction(async () => {
      // Store previous status for audit
      const previousStatus = session.status;
      
      // Update session status
      session.status = newStatus;
      session.statusUpdatedAt = new Date();
      session.statusReason = reason;
      
      // Apply additional data
      Object.assign(session, additionalData);
      
      // Save session within transaction
      updatedSession = await session.save({ session: mongoSession });
      
      // Create audit log entry within same transaction
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create([{
        entityType: 'session',
        entityId: session._id,
        action: 'status_change',
        oldValue: previousStatus,
        newValue: newStatus,
        reason: reason,
        userId: additionalData.userId || null,
        timestamp: new Date()
      }], { session: mongoSession });
      
      console.log('✅ Session status updated atomically:', {
        sessionId: session._id,
        transition: `${previousStatus} → ${newStatus}`,
        reason
      });
    });
    
    await mongoSession.endSession();
    
    return updatedSession;
    
  } catch (error) {
    console.error('❌ Atomic session status update failed:', error);
    throw new Error(`Atomic session update failed: ${error.message}`);
  }
}

/**
 * Atomic Payment Initiation
 * 
 * Initiates payment and updates session status atomically.
 * 
 * @param {Object} session - Session document
 * @param {Object} paymentData - Payment initiation data
 * @param {Function} paymentInitiator - Function that initiates payment
 * @returns {Promise<Object>} Payment initiation result
 */
async function initiatePaymentAtomic(session, paymentData, paymentInitiator) {
  // Validate state transition
  try {
    validateStateTransition({
      entityType: 'payment',
      currentState: session.paymentStatus || PAYMENT_STATES.PENDING,
      newState: PAYMENT_STATES.INITIATED,
      paymentState: PAYMENT_STATES.INITIATED,
      sessionState: SESSION_STATES.PAYMENT_PENDING
    });
    
    validateStateTransition({
      entityType: 'session',
      currentState: session.status,
      newState: SESSION_STATES.PAYMENT_PENDING,
      paymentState: PAYMENT_STATES.INITIATED,
      sessionState: SESSION_STATES.PAYMENT_PENDING
    });
  } catch (validationError) {
    console.error('❌ Payment initiation validation failed:', validationError.message);
    throw new Error(`Invalid state transition for payment initiation: ${validationError.message}`);
  }

  // Start atomic transaction
  try {
    const mongoose = require('mongoose');
    const mongoSession = await mongoose.startSession();
    
    let paymentResult;
    let updatedSession;
    
    await mongoSession.withTransaction(async () => {
      // Initiate payment first
      paymentResult = await paymentInitiator();
      
      // Update session with payment details
      session.paymentStatus = PAYMENT_STATES.INITIATED;
      session.status = SESSION_STATES.PAYMENT_PENDING;
      session.mpesaCheckoutRequestID = paymentResult.CheckoutRequestID;
      session.mpesaMerchantRequestID = paymentResult.MerchantRequestID;
      session.mpesaPhoneNumber = paymentData.phoneNumber;
      session.paymentInitiatedAt = new Date();
      
      // Save session within transaction
      updatedSession = await session.save({ session: mongoSession });
      
      console.log('✅ Payment initiated atomically:', {
        sessionId: session._id,
        checkoutRequestID: paymentResult.CheckoutRequestID,
        amount: session.price
      });
    });
    
    await mongoSession.endSession();
    
    return {
      paymentResult,
      session: updatedSession
    };
    
  } catch (error) {
    console.error('❌ Atomic payment initiation failed:', error);
    throw new Error(`Atomic payment initiation failed: ${error.message}`);
  }
}

/**
 * Database Transaction Wrapper
 * 
 * Generic wrapper for database transactions with automatic rollback.
 * 
 * @param {Function} operation - Operation to perform within transaction
 * @returns {Promise<any>} Operation result
 */
async function withTransaction(operation) {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  try {
    let result;
    
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    
    await session.endSession();
    return result;
    
  } catch (error) {
    await session.endSession();
    throw error;
  }
}

/**
 * Idempotency Key Manager
 * 
 * Manages idempotency keys for safe retry operations.
 */
class IdempotencyManager {
  constructor() {
    this.cache = new Map();
  }
  
  /**
   * Check if operation has already been processed
   * 
   * @param {string} key - Idempotency key
   * @returns {Object|null} Cached result or null
   */
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.result;
    }
    return null;
  }
  
  /**
   * Cache operation result
   * 
   * @param {string} key - Idempotency key
   * @param {any} result - Operation result
   */
  cacheResult(key, result) {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear expired cache entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > 300000) { // 5 minutes
        this.cache.delete(key);
      }
    }
  }
}

// Global idempotency manager instance
const idempotencyManager = new IdempotencyManager();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  idempotencyManager.cleanup();
}, 300000);

module.exports = {
  handlePaymentCallbackAtomic,
  updateSessionStatusAtomic,
  initiatePaymentAtomic,
  withTransaction,
  IdempotencyManager,
  idempotencyManager
};