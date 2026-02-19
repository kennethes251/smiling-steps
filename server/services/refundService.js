/**
 * Refund Service
 * 
 * Handles refund processing for cancelled sessions:
 * - M-Pesa B2C refund initiation
 * - Refund status tracking
 * - Refund confirmation notifications
 * - Audit logging for all refund transactions
 * 
 * Requirements: 9.3, 9.4 from Cancellation & Rescheduling
 */

const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Refund Configuration
 */
const REFUND_CONFIG = {
  // Maximum retry attempts for refund processing
  MAX_RETRY_ATTEMPTS: 3,
  
  // Delay between retries (in milliseconds)
  RETRY_DELAY_MS: 5000,
  
  // Refund processing timeout (in milliseconds)
  PROCESSING_TIMEOUT_MS: 30000,
  
  // Minimum amount for automatic refund (below this requires manual processing)
  AUTO_REFUND_MIN_AMOUNT: 100,
  
  // Maximum amount for automatic refund (above this requires admin approval)
  AUTO_REFUND_MAX_AMOUNT: 50000,
  
  // Refund reasons for M-Pesa
  REFUND_REASONS: {
    SESSION_CANCELLED: 'Session Cancellation Refund',
    THERAPIST_NO_SHOW: 'Therapist No-Show Refund',
    TECHNICAL_ISSUES: 'Technical Issues Refund',
    ADMIN_INITIATED: 'Admin Initiated Refund'
  }
};

class RefundService {
  constructor() {
    this.Session = null;
    this.mpesaAPI = null;
    this.notificationService = null;
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    try { 
      if (!this.mpesaAPI) this.mpesaAPI = require('../config/mpesa'); 
    } catch (e) {
      console.warn('M-Pesa API not available for refunds');
    }
    try { 
      if (!this.notificationService) this.notificationService = require('../utils/notificationService'); 
    } catch (e) {}
  }

  /**
   * Initiate a refund for a cancelled session
   * Requirements: 9.4
   */
  async initiateRefund(sessionId, refundAmount, reason = 'SESSION_CANCELLED') {
    await this.initialize();

    const session = await this.Session.findById(sessionId).populate('client', 'name email phone');
    if (!session) throw new Error('Session not found');

    // Validate refund amount
    if (refundAmount <= 0) {
      throw new Error('Invalid refund amount');
    }

    if (refundAmount > session.price) {
      throw new Error('Refund amount cannot exceed session price');
    }

    // Check if refund already processed
    if (session.refundStatus === 'processed') {
      throw new Error('Refund already processed for this session');
    }

    // Log refund initiation
    await logAuditEvent({
      action: 'REFUND_INITIATED',
      userId: session.client._id,
      resourceType: 'payment',
      resourceId: sessionId,
      metadata: {
        originalAmount: session.price,
        refundAmount,
        reason: REFUND_CONFIG.REFUND_REASONS[reason] || reason,
        phoneNumber: session.client.phone?.slice(-4),
        mpesaTransactionId: session.mpesaTransactionId
      }
    });

    // Update session refund status
    session.refundStatus = 'processing';
    await session.save();

    // Attempt M-Pesa B2C refund
    let refundResult;
    try {
      refundResult = await this.processMpesaRefund(session, refundAmount, reason);
    } catch (error) {
      console.error('M-Pesa refund failed:', error.message);
      
      // Mark for manual processing
      session.refundStatus = 'pending_manual';
      session.refundNotes = `Automatic refund failed: ${error.message}. Manual processing required.`;
      await session.save();

      await logAuditEvent({
        action: 'REFUND_AUTO_FAILED',
        userId: session.client._id,
        resourceType: 'payment',
        resourceId: sessionId,
        metadata: { error: error.message, refundAmount }
      });

      return {
        success: false,
        status: 'pending_manual',
        message: 'Automatic refund failed. Manual processing required.',
        error: error.message
      };
    }

    // Update session with refund result
    if (refundResult.success) {
      session.refundStatus = 'processed';
      session.refundTransactionId = refundResult.transactionId;
      session.refundProcessedAt = new Date();
      await session.save();

      // Send confirmation notification
      await this.sendRefundConfirmation(session, refundAmount, refundResult);

      await logAuditEvent({
        action: 'REFUND_COMPLETED',
        userId: session.client._id,
        resourceType: 'payment',
        resourceId: sessionId,
        metadata: {
          refundAmount,
          transactionId: refundResult.transactionId,
          processingTime: refundResult.processingTime
        }
      });
    }

    return refundResult;
  }

  /**
   * Process M-Pesa B2C refund
   */
  async processMpesaRefund(session, refundAmount, reason) {
    // Check if M-Pesa API is available
    if (!this.mpesaAPI) {
      throw new Error('M-Pesa API not configured');
    }

    // Check if original transaction exists
    if (!session.mpesaTransactionId) {
      throw new Error('No M-Pesa transaction ID found for this session');
    }

    // Get client phone number
    const phoneNumber = session.client.phone || session.mpesaPhoneNumber;
    if (!phoneNumber) {
      throw new Error('No phone number available for refund');
    }

    const startTime = Date.now();

    try {
      // Attempt B2C refund (if available in M-Pesa API)
      if (this.mpesaAPI.b2cPayment) {
        const result = await this.mpesaAPI.b2cPayment({
          phoneNumber,
          amount: refundAmount,
          remarks: REFUND_CONFIG.REFUND_REASONS[reason] || 'Session Refund',
          occasion: `Refund for session ${session._id}`
        });

        return {
          success: true,
          transactionId: result.TransactionID || result.ConversationID,
          processingTime: Date.now() - startTime,
          method: 'b2c'
        };
      }

      // Fallback: Mark for manual processing if B2C not available
      throw new Error('M-Pesa B2C refund not available. Manual processing required.');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send refund confirmation notification
   */
  async sendRefundConfirmation(session, refundAmount, refundResult) {
    if (!this.notificationService) return;

    try {
      await this.notificationService.sendEmail({
        to: session.client.email,
        subject: 'Refund Processed - Smiling Steps',
        template: 'refund_confirmation',
        data: {
          clientName: session.client.name,
          refundAmount,
          transactionId: refundResult.transactionId,
          sessionDate: session.sessionDate,
          processingDate: new Date().toISOString()
        }
      });

      // Send SMS if phone available
      if (session.client.phone) {
        await this.notificationService.sendSMS({
          to: session.client.phone,
          message: `Your refund of KSh ${refundAmount} has been processed. Transaction ID: ${refundResult.transactionId}. Thank you for using Smiling Steps.`
        });
      }
    } catch (error) {
      console.error('Failed to send refund confirmation:', error.message);
    }
  }

  /**
   * Get refund status for a session
   */
  async getRefundStatus(sessionId) {
    await this.initialize();

    const session = await this.Session.findById(sessionId)
      .select('refundStatus refundAmount refundTransactionId refundProcessedAt refundNotes');

    if (!session) throw new Error('Session not found');

    return {
      sessionId,
      status: session.refundStatus,
      amount: session.refundAmount,
      transactionId: session.refundTransactionId,
      processedAt: session.refundProcessedAt,
      notes: session.refundNotes
    };
  }

  /**
   * Retry failed refund
   */
  async retryRefund(sessionId, adminId) {
    await this.initialize();

    const session = await this.Session.findById(sessionId).populate('client', 'name email phone');
    if (!session) throw new Error('Session not found');

    if (!['failed', 'pending_manual'].includes(session.refundStatus)) {
      throw new Error(`Cannot retry refund in ${session.refundStatus} status`);
    }

    await logAuditEvent({
      action: 'REFUND_RETRY_INITIATED',
      userId: adminId,
      resourceType: 'payment',
      resourceId: sessionId,
      metadata: { previousStatus: session.refundStatus, refundAmount: session.refundAmount }
    });

    return this.initiateRefund(sessionId, session.refundAmount, 'ADMIN_INITIATED');
  }

  /**
   * Get all pending refunds
   */
  async getPendingRefunds() {
    await this.initialize();

    return this.Session.find({
      refundStatus: { $in: ['pending', 'pending_manual', 'processing', 'approved'] },
      refundAmount: { $gt: 0 }
    })
    .populate('client psychologist', 'name email phone')
    .sort({ cancellationRequestedAt: 1 })
    .select('sessionDate cancellationRequestedAt refundStatus refundAmount client psychologist mpesaTransactionId');
  }

  /**
   * Get refund statistics
   */
  async getRefundStats(startDate, endDate) {
    await this.initialize();

    const query = {
      refundAmount: { $gt: 0 }
    };

    if (startDate || endDate) {
      query.cancellationRequestedAt = {};
      if (startDate) query.cancellationRequestedAt.$gte = new Date(startDate);
      if (endDate) query.cancellationRequestedAt.$lte = new Date(endDate);
    }

    const sessions = await this.Session.find(query);

    const stats = {
      total: sessions.length,
      processed: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0,
      processedAmount: 0,
      pendingAmount: 0
    };

    for (const session of sessions) {
      stats.totalAmount += session.refundAmount;

      if (session.refundStatus === 'processed') {
        stats.processed++;
        stats.processedAmount += session.refundAmount;
      } else if (['pending', 'pending_manual', 'processing', 'approved'].includes(session.refundStatus)) {
        stats.pending++;
        stats.pendingAmount += session.refundAmount;
      } else if (['failed', 'denied'].includes(session.refundStatus)) {
        stats.failed++;
      }
    }

    return stats;
  }
}

const refundService = new RefundService();

module.exports = { refundService, RefundService, REFUND_CONFIG };
