/**
 * Payment Service - Centralized Write Paths
 * 
 * This service centralizes all payment state mutations to enforce
 * Flow Integrity rules. All payment state changes MUST go through
 * these functions.
 * 
 * CRITICAL REFINEMENT #2: Lock down write paths early
 */

const { handlePaymentCallbackAtomic, initiatePaymentAtomic } = require('../utils/atomicUpdates');
const { enforceStateAuthority } = require('../constants/stateAuthority');
const { PAYMENT_STATES } = require('../constants/paymentStates');
const { SESSION_STATES } = require('../constants/sessionStates');

/**
 * Payment Service Class
 * 
 * Centralizes all payment state mutations with authority enforcement
 */
class PaymentService {
  
  /**
   * Update Payment State (Centralized Write Path)
   * 
   * This is the ONLY function that should change payment states.
   * All other code must use this function.
   * 
   * CRITICAL: Authority enforcement is AUTOMATIC and NON-OPTIONAL
   * 
   * @param {Object} session - Session document
   * @param {string} newPaymentState - New payment state
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Updated session
   */
  async updateState(session, newPaymentState, context = {}) {
    // AUTOMATIC AUTHORITY ENFORCEMENT - Cannot be bypassed
    enforceStateAuthority('payment', 'payment', context);
    
    const { reason, metadata = {}, userId = null, actor = 'payment' } = context;
    
    // AUTOMATIC ACTOR VALIDATION - Ensure only payment service can call this
    if (actor !== 'payment') {
      throw new Error(`AUTHORITY VIOLATION: Only payment service can update payment states. Actor: ${actor}`);
    }
    
    console.log(`💳 PaymentService.updateState: ${session.paymentStatus} → ${newPaymentState}`, {
      sessionId: session._id,
      reason,
      userId
    });
    
    // Use atomic update to ensure consistency
    return await this._updatePaymentStateAtomic(session, newPaymentState, {
      reason,
      metadata,
      userId
    });
  }
  
  /**
   * Process M-Pesa Callback (Centralized Write Path)
   * 
   * Processes payment callbacks and updates both payment and session states
   * atomically. This is the authoritative source for payment confirmations.
   * 
   * @param {Object} session - Session document
   * @param {Object} callbackData - M-Pesa callback data
   * @returns {Promise<Object>} Processing result
   */
  async processCallback(session, callbackData) {
    console.log('💳 PaymentService.processCallback:', {
      sessionId: session._id,
      checkoutRequestID: callbackData.CheckoutRequestID,
      resultCode: callbackData.ResultCode
    });
    
    // Use atomic callback handler
    const result = await handlePaymentCallbackAtomic(session, callbackData);
    
    // Log the authoritative state change
    console.log('✅ Payment callback processed by authoritative service:', {
      sessionId: session._id,
      paymentState: result.session.paymentStatus,
      sessionState: result.session.status,
      isDuplicate: result.isDuplicate
    });
    
    return result;
  }
  
  /**
   * Initiate Payment (Centralized Write Path)
   * 
   * Initiates payment and updates session status atomically.
   * 
   * @param {Object} session - Session document
   * @param {Object} paymentData - Payment data
   * @param {Function} paymentInitiator - Payment initiation function
   * @returns {Promise<Object>} Initiation result
   */
  async initiatePayment(session, paymentData, paymentInitiator) {
    console.log('💳 PaymentService.initiatePayment:', {
      sessionId: session._id,
      amount: paymentData.amount,
      phoneNumber: paymentData.phoneNumber
    });
    
    // Use atomic payment initiation
    const result = await initiatePaymentAtomic(session, paymentData, paymentInitiator);
    
    console.log('✅ Payment initiated by authoritative service:', {
      sessionId: session._id,
      checkoutRequestID: result.paymentResult.CheckoutRequestID
    });
    
    return result;
  }
  
  /**
   * Cancel Payment (Centralized Write Path)
   * 
   * Cancels payment and updates session accordingly.
   * 
   * @param {Object} session - Session document
   * @param {string} reason - Cancellation reason
   * @param {string} userId - User who cancelled
   * @returns {Promise<Object>} Updated session
   */
  async cancelPayment(session, reason, userId = null) {
    console.log('💳 PaymentService.cancelPayment:', {
      sessionId: session._id,
      reason,
      userId
    });
    
    return await this.updateState(session, PAYMENT_STATES.CANCELLED, {
      reason,
      userId,
      metadata: { cancelledAt: new Date() }
    });
  }
  
  /**
   * Refund Payment (Centralized Write Path)
   * 
   * Processes payment refund and updates session status.
   * 
   * @param {Object} session - Session document
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Updated session
   */
  async refundPayment(session, refundData) {
    const { reason, refundAmount, refundReference, userId } = refundData;
    
    console.log('💳 PaymentService.refundPayment:', {
      sessionId: session._id,
      refundAmount,
      reason
    });
    
    return await this.updateState(session, PAYMENT_STATES.REFUNDED, {
      reason,
      userId,
      metadata: {
        refundAmount,
        refundReference,
        refundedAt: new Date()
      }
    });
  }
  
  /**
   * Private: Atomic Payment State Update
   * 
   * Internal function for atomic payment state updates with
   * cross-state synchronization.
   */
  async _updatePaymentStateAtomic(session, newPaymentState, context) {
    const { reason, metadata, userId } = context;
    
    // Determine corresponding session state
    const sessionStateMap = {
      [PAYMENT_STATES.PENDING]: SESSION_STATES.APPROVED,
      [PAYMENT_STATES.INITIATED]: SESSION_STATES.PAYMENT_PENDING,
      [PAYMENT_STATES.CONFIRMED]: SESSION_STATES.PAID,
      [PAYMENT_STATES.FAILED]: SESSION_STATES.PAYMENT_PENDING, // stays pending for retry
      [PAYMENT_STATES.REFUNDED]: SESSION_STATES.CANCELLED,
      [PAYMENT_STATES.CANCELLED]: SESSION_STATES.CANCELLED
    };
    
    const newSessionState = sessionStateMap[newPaymentState];
    
    // Use atomic update utility
    const { withTransaction } = require('../utils/atomicUpdates');
    
    return await withTransaction(async (mongoSession) => {
      // Update payment state
      session.paymentStatus = newPaymentState;
      session.paymentStatusReason = reason;
      session.paymentUpdatedAt = new Date();
      
      // Apply metadata
      Object.assign(session, metadata);
      
      // Update session state if mapping exists
      if (newSessionState && session.status !== newSessionState) {
        session.status = newSessionState;
        session.statusUpdatedAt = new Date();
        session.statusReason = `Payment ${newPaymentState}`;
      }
      
      // Save within transaction
      const updatedSession = await session.save({ session: mongoSession });
      
      // Create audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create([{
        entityType: 'payment',
        entityId: session._id,
        action: 'state_change',
        oldValue: session.paymentStatus,
        newValue: newPaymentState,
        reason: reason,
        userId: userId,
        timestamp: new Date(),
        metadata: metadata
      }], { session: mongoSession });
      
      return updatedSession;
    });
  }
}

// Export singleton instance
const paymentService = new PaymentService();

module.exports = {
  PaymentService,
  paymentService
};