/**
 * Cancellation Service
 * 
 * Implements cancellation policy and refund processing:
 * - 48-hour full refund rule
 * - Partial refund calculation for <48 hours
 * - Cancellation eligibility checks
 * - Refund status tracking
 * - M-Pesa refund initiation
 * 
 * Requirements: 9.3, 9.4, 9.5 from Cancellation & Rescheduling
 */

const { SESSION_STATES } = require('../constants/sessionStates');
const { PAYMENT_STATES } = require('../constants/paymentStates');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Cancellation Policy Configuration
 * 
 * Defines the refund tiers based on hours before session:
 * - 48+ hours: 100% refund (full refund)
 * - 24-48 hours: 75% refund
 * - 12-24 hours: 50% refund
 * - 6-12 hours: 25% refund
 * - <6 hours: 0% refund (no refund)
 * 
 * Requirements: 9.3, 9.4
 */
const CANCELLATION_CONFIG = {
  // Full refund threshold in hours
  FULL_REFUND_HOURS: 48,
  
  // Refund tiers - ordered from highest to lowest hours
  PARTIAL_REFUND_TIERS: [
    { hoursBeforeSession: 48, refundPercentage: 100, description: 'Full refund (48+ hours notice)' },
    { hoursBeforeSession: 24, refundPercentage: 75, description: '75% refund (24-48 hours notice)' },
    { hoursBeforeSession: 12, refundPercentage: 50, description: '50% refund (12-24 hours notice)' },
    { hoursBeforeSession: 6, refundPercentage: 25, description: '25% refund (6-12 hours notice)' },
    { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund (less than 6 hours notice)' }
  ],
  
  // Valid cancellation reasons
  CANCELLATION_REASONS: [
    'schedule_conflict',
    'emergency',
    'illness',
    'therapist_unavailable',
    'technical_issues',
    'financial_reasons',
    'personal_reasons',
    'other'
  ],
  
  // Therapist-initiated cancellation always gets full refund
  THERAPIST_CANCELLATION_FULL_REFUND: true,
  
  // Admin-initiated cancellation always gets full refund
  ADMIN_CANCELLATION_FULL_REFUND: true,
  
  // Minimum refund amount (in currency units)
  MINIMUM_REFUND_AMOUNT: 0,
  
  // Maximum days to process refund
  REFUND_PROCESSING_DAYS: 7,
  
  // Auto-approve refunds below this amount
  AUTO_APPROVE_REFUND_THRESHOLD: 5000
};

class CancellationService {
  constructor() {
    this.Session = null;
    this.notificationService = null;
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    try { if (!this.notificationService) this.notificationService = require('../utils/notificationService'); } catch (e) {}
  }

  /**
   * Check if session is eligible for cancellation
   */
  async checkCancellationEligibility(sessionId, userId) {
    await this.initialize();
    
    const session = await this.Session.findById(sessionId).populate('client psychologist', 'name email');
    if (!session) return { eligible: false, reason: 'Session not found' };
    
    // Check if user is authorized
    const isClient = session.client._id.toString() === userId;
    const isTherapist = session.psychologist._id.toString() === userId;
    
    if (!isClient && !isTherapist) {
      return { eligible: false, reason: 'Not authorized to cancel this session' };
    }
    
    // Check session status - use both old and new status values for compatibility
    const cancellableStatuses = [
      SESSION_STATES.BOOKED, SESSION_STATES.APPROVED, SESSION_STATES.PAID, 
      SESSION_STATES.FORMS_REQUIRED, SESSION_STATES.READY,
      'Pending', 'Pending Approval', 'Approved', 'Payment Submitted', 'Confirmed', 'Booked'
    ];
    if (!cancellableStatuses.includes(session.status)) {
      return { eligible: false, reason: `Cannot cancel session in ${session.status} status` };
    }
    
    // Calculate refund using the enhanced method
    const cancelledBy = isClient ? 'client' : 'therapist';
    const hoursUntilSession = this.calculateHoursUntilSession(session.sessionDate);
    const refundInfo = this.calculateRefundAmount(session, cancelledBy, hoursUntilSession);
    
    return {
      eligible: true,
      sessionId,
      hoursUntilSession: Math.max(0, hoursUntilSession),
      refundPercentage: refundInfo.percentage,
      refundAmount: refundInfo.amount,
      sessionPrice: session.price,
      cancelledBy,
      policy: refundInfo.reason
    };
  }

  calculateHoursUntilSession(sessionDate) {
    const now = new Date();
    const sessionTime = new Date(sessionDate);
    return (sessionTime - now) / (1000 * 60 * 60);
  }

  /**
   * Calculate refund percentage based on hours until session
   * Implements the tiered refund policy from Requirements 9.3, 9.4
   */
  calculateRefundPercentage(hoursUntilSession) {
    for (const tier of CANCELLATION_CONFIG.PARTIAL_REFUND_TIERS) {
      if (hoursUntilSession >= tier.hoursBeforeSession) {
        return tier.refundPercentage;
      }
    }
    return 0;
  }

  /**
   * Calculate refund amount with special cases
   * - Therapist cancellation: always full refund
   * - Admin cancellation: always full refund
   * - Client cancellation: tiered based on timing
   */
  calculateRefundAmount(session, cancelledBy, hoursUntilSession) {
    // Therapist or admin cancellation always gets full refund
    if (cancelledBy === 'therapist' && CANCELLATION_CONFIG.THERAPIST_CANCELLATION_FULL_REFUND) {
      return { amount: session.price, percentage: 100, reason: 'Therapist-initiated cancellation' };
    }
    
    if (cancelledBy === 'admin' && CANCELLATION_CONFIG.ADMIN_CANCELLATION_FULL_REFUND) {
      return { amount: session.price, percentage: 100, reason: 'Admin-initiated cancellation' };
    }
    
    // Client cancellation uses tiered policy
    const percentage = this.calculateRefundPercentage(hoursUntilSession);
    const amount = Math.round(session.price * (percentage / 100));
    
    // Apply minimum refund threshold
    const finalAmount = amount < CANCELLATION_CONFIG.MINIMUM_REFUND_AMOUNT ? 0 : amount;
    
    return {
      amount: finalAmount,
      percentage,
      reason: this.getRefundPolicyMessage(hoursUntilSession, percentage)
    };
  }

  getRefundPolicyMessage(hours, percentage) {
    const tier = CANCELLATION_CONFIG.PARTIAL_REFUND_TIERS.find(t => hours >= t.hoursBeforeSession);
    return tier ? tier.description : 'No refund available';
  }

  /**
   * Get full cancellation policy details
   */
  getCancellationPolicy() {
    return {
      fullRefundHours: CANCELLATION_CONFIG.FULL_REFUND_HOURS,
      refundTiers: CANCELLATION_CONFIG.PARTIAL_REFUND_TIERS,
      validReasons: CANCELLATION_CONFIG.CANCELLATION_REASONS,
      therapistCancellationFullRefund: CANCELLATION_CONFIG.THERAPIST_CANCELLATION_FULL_REFUND,
      adminCancellationFullRefund: CANCELLATION_CONFIG.ADMIN_CANCELLATION_FULL_REFUND,
      refundProcessingDays: CANCELLATION_CONFIG.REFUND_PROCESSING_DAYS,
      policyDescription: CANCELLATION_CONFIG.PARTIAL_REFUND_TIERS.map(t => t.description)
    };
  }

  /**
   * Cancel a session and process refund
   */
  async cancelSession(sessionId, userId, reason, additionalNotes = '') {
    await this.initialize();

    // Check eligibility first
    const eligibility = await this.checkCancellationEligibility(sessionId, userId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    // Validate reason
    if (!CANCELLATION_CONFIG.CANCELLATION_REASONS.includes(reason)) {
      throw new Error(`Invalid cancellation reason. Must be one of: ${CANCELLATION_CONFIG.CANCELLATION_REASONS.join(', ')}`);
    }

    const session = await this.Session.findById(sessionId).populate('client psychologist', 'name email phone');
    
    // Update session with cancellation details
    const previousStatus = session.status;
    session.status = SESSION_STATES.CANCELLED;
    session.cancellationRequestedAt = new Date();
    session.cancellationReason = reason;
    session.cancellationNotes = additionalNotes;
    session.cancelledBy = eligibility.cancelledBy;
    session.refundStatus = eligibility.refundAmount > 0 ? 'pending' : 'not_applicable';
    session.refundAmount = eligibility.refundAmount;
    session.refundPercentage = eligibility.refundPercentage;

    await session.save();

    // Log audit event
    await logAuditEvent({
      action: 'SESSION_CANCELLED',
      userId,
      resourceType: 'session',
      resourceId: sessionId,
      previousValue: { status: previousStatus },
      newValue: { 
        status: SESSION_STATES.CANCELLED, 
        reason, 
        refundAmount: eligibility.refundAmount 
      },
      metadata: {
        cancelledBy: eligibility.cancelledBy,
        hoursUntilSession: eligibility.hoursUntilSession,
        refundPercentage: eligibility.refundPercentage
      }
    });

    // Process refund if applicable
    let refundResult = null;
    if (eligibility.refundAmount > 0 && session.paymentStatus === PAYMENT_STATES.CONFIRMED) {
      refundResult = await this.processRefund(session, eligibility.refundAmount);
    }

    // Send notifications
    await this.sendCancellationNotifications(session, eligibility, refundResult);

    return {
      success: true,
      sessionId,
      status: SESSION_STATES.CANCELLED,
      refundAmount: eligibility.refundAmount,
      refundPercentage: eligibility.refundPercentage,
      refundStatus: session.refundStatus,
      message: `Session cancelled successfully. ${eligibility.policy}`
    };
  }

  /**
   * Process M-Pesa refund
   */
  async processRefund(session, refundAmount) {
    try {
      session.refundStatus = 'processing';
      await session.save();

      await logAuditEvent({
        action: 'REFUND_INITIATED',
        userId: session.client._id,
        resourceType: 'payment',
        resourceId: session.mpesaTransactionId || session._id,
        metadata: { sessionId: session._id, originalAmount: session.price, refundAmount, paymentMethod: 'mpesa' }
      });

      // Attempt M-Pesa refund
      let mpesaRefundResult = null;
      try {
        const mpesaService = require('../config/mpesa');
        if (mpesaService && mpesaService.initiateRefund && session.mpesaTransactionId) {
          mpesaRefundResult = await mpesaService.initiateRefund({
            transactionId: session.mpesaTransactionId,
            amount: refundAmount,
            phoneNumber: session.client.phone,
            reason: `Refund for cancelled session ${session._id}`
          });
        }
      } catch (mpesaError) {
        console.error('M-Pesa refund error:', mpesaError.message);
      }

      if (mpesaRefundResult && mpesaRefundResult.success) {
        session.refundStatus = 'processed';
        session.refundTransactionId = mpesaRefundResult.transactionId;
        session.refundProcessedAt = new Date();
        
        // Send refund processed notification
        await this.sendRefundProcessedNotification(session, refundAmount, mpesaRefundResult.transactionId);
      } else {
        session.refundStatus = 'pending_manual';
        session.refundNotes = 'Automatic refund failed. Manual processing required.';
      }

      await session.save();

      await logAuditEvent({
        action: session.refundStatus === 'processed' ? 'REFUND_COMPLETED' : 'REFUND_PENDING_MANUAL',
        userId: session.client._id,
        resourceType: 'payment',
        resourceId: session._id,
        metadata: { refundAmount, refundStatus: session.refundStatus, transactionId: session.refundTransactionId }
      });

      return { success: session.refundStatus === 'processed', status: session.refundStatus, amount: refundAmount, transactionId: session.refundTransactionId };
    } catch (error) {
      console.error('Refund processing error:', error);
      session.refundStatus = 'failed';
      session.refundNotes = error.message;
      await session.save();
      return { success: false, status: 'failed', error: error.message };
    }
  }

  /**
   * Send cancellation notifications using notification templates
   * Requirements: 9.5
   */
  async sendCancellationNotifications(session, eligibility, refundResult) {
    const notificationTemplates = require('../utils/notificationTemplates');
    const notificationsSent = [];

    // Prepare template data
    const clientEmailData = {
      clientName: session.client.name,
      therapistName: session.psychologist.name,
      sessionDate: session.sessionDate,
      sessionType: session.sessionType || 'Therapy Session',
      cancellationReason: session.cancellationReason,
      refundAmount: eligibility.refundAmount,
      refundPercentage: eligibility.refundPercentage,
      refundStatus: session.refundStatus,
      policy: eligibility.policy,
      sessionId: session._id.toString()
    };

    const therapistEmailData = {
      therapistName: session.psychologist.name,
      clientName: session.client.name,
      sessionDate: session.sessionDate,
      sessionType: session.sessionType || 'Therapy Session',
      cancellationReason: session.cancellationReason,
      cancelledBy: eligibility.cancelledBy,
      sessionId: session._id.toString()
    };

    // Send client cancellation confirmation email
    if (this.notificationService && session.client.email) {
      try {
        const clientEmail = notificationTemplates.cancellationConfirmationClientEmail(clientEmailData);
        await this.notificationService.sendEmail({
          to: session.client.email,
          subject: clientEmail.subject,
          html: clientEmail.html
        });
        notificationsSent.push({ type: 'email', recipient: 'client', status: 'sent' });
      } catch (e) {
        console.error('Client cancellation email error:', e.message);
        notificationsSent.push({ type: 'email', recipient: 'client', status: 'failed', error: e.message });
      }
    }

    // Send therapist cancellation notification email
    if (this.notificationService && session.psychologist.email) {
      try {
        const therapistEmail = notificationTemplates.cancellationNotificationTherapistEmail(therapistEmailData);
        await this.notificationService.sendEmail({
          to: session.psychologist.email,
          subject: therapistEmail.subject,
          html: therapistEmail.html
        });
        notificationsSent.push({ type: 'email', recipient: 'therapist', status: 'sent' });
      } catch (e) {
        console.error('Therapist cancellation email error:', e.message);
        notificationsSent.push({ type: 'email', recipient: 'therapist', status: 'failed', error: e.message });
      }
    }

    // Send client SMS notification
    if (this.notificationService && session.client.phone) {
      try {
        const clientSMS = notificationTemplates.cancellationConfirmationClientSMS({
          sessionDate: session.sessionDate,
          refundAmount: eligibility.refundAmount,
          refundStatus: session.refundStatus
        });
        await this.notificationService.sendSMS({
          to: session.client.phone,
          message: clientSMS
        });
        notificationsSent.push({ type: 'sms', recipient: 'client', status: 'sent' });
      } catch (e) {
        console.error('Client cancellation SMS error:', e.message);
        notificationsSent.push({ type: 'sms', recipient: 'client', status: 'failed', error: e.message });
      }
    }

    // Send therapist SMS notification
    if (this.notificationService && session.psychologist.phone) {
      try {
        const therapistSMS = notificationTemplates.cancellationNotificationTherapistSMS({
          clientName: session.client.name,
          sessionDate: session.sessionDate
        });
        await this.notificationService.sendSMS({
          to: session.psychologist.phone,
          message: therapistSMS
        });
        notificationsSent.push({ type: 'sms', recipient: 'therapist', status: 'sent' });
      } catch (e) {
        console.error('Therapist cancellation SMS error:', e.message);
        notificationsSent.push({ type: 'sms', recipient: 'therapist', status: 'failed', error: e.message });
      }
    }

    // Log audit event
    await logAuditEvent({
      action: 'CANCELLATION_NOTIFICATIONS_SENT',
      userId: session.client._id,
      resourceType: 'session',
      resourceId: session._id,
      metadata: { 
        notificationCount: notificationsSent.length, 
        recipients: [session.client.email, session.psychologist.email],
        notificationsSent
      }
    });

    return notificationsSent;
  }

  /**
   * Send refund processed notification
   * Requirements: 9.5
   */
  async sendRefundProcessedNotification(session, refundAmount, transactionId) {
    const notificationTemplates = require('../utils/notificationTemplates');
    const notificationsSent = [];

    if (!this.notificationService) {
      console.log('Notification service not available, skipping refund notifications');
      return notificationsSent;
    }

    // Populate session if needed
    let populatedSession = session;
    if (!session.client?.email) {
      populatedSession = await this.Session.findById(session._id)
        .populate('client', 'name email phone')
        .populate('psychologist', 'name email');
    }

    const emailData = {
      clientName: populatedSession.client.name,
      therapistName: populatedSession.psychologist.name,
      sessionDate: populatedSession.sessionDate,
      refundAmount: refundAmount,
      refundPercentage: populatedSession.refundPercentage || 100,
      transactionId: transactionId,
      originalPaymentAmount: populatedSession.price,
      cancellationReason: populatedSession.cancellationReason || 'Not specified',
      sessionId: populatedSession._id.toString()
    };

    // Send refund processed email
    if (populatedSession.client.email) {
      try {
        const refundEmail = notificationTemplates.refundProcessedEmail(emailData);
        await this.notificationService.sendEmail({
          to: populatedSession.client.email,
          subject: refundEmail.subject,
          html: refundEmail.html
        });
        notificationsSent.push({ type: 'email', recipient: 'client', status: 'sent' });
      } catch (e) {
        console.error('Refund email error:', e.message);
        notificationsSent.push({ type: 'email', recipient: 'client', status: 'failed', error: e.message });
      }
    }

    // Send refund processed SMS
    if (populatedSession.client.phone) {
      try {
        const refundSMS = notificationTemplates.refundProcessedSMS({
          refundAmount: refundAmount,
          transactionId: transactionId
        });
        await this.notificationService.sendSMS({
          to: populatedSession.client.phone,
          message: refundSMS
        });
        notificationsSent.push({ type: 'sms', recipient: 'client', status: 'sent' });
      } catch (e) {
        console.error('Refund SMS error:', e.message);
        notificationsSent.push({ type: 'sms', recipient: 'client', status: 'failed', error: e.message });
      }
    }

    // Log audit event
    await logAuditEvent({
      action: 'REFUND_NOTIFICATION_SENT',
      userId: populatedSession.client._id,
      resourceType: 'payment',
      resourceId: populatedSession._id,
      metadata: { 
        refundAmount,
        transactionId,
        notificationsSent
      }
    });

    return notificationsSent;
  }

  /**
   * Get cancellation history for a user
   */
  async getCancellationHistory(userId, role = 'client') {
    await this.initialize();
    const query = role === 'client' 
      ? { client: userId, status: SESSION_STATES.CANCELLED }
      : { psychologist: userId, status: SESSION_STATES.CANCELLED };

    return this.Session.find(query)
      .populate('client psychologist', 'name email')
      .sort({ cancellationRequestedAt: -1 })
      .select('sessionDate cancellationRequestedAt cancellationReason refundAmount refundStatus cancelledBy');
  }

  /**
   * Get pending refunds for admin
   */
  async getPendingRefunds() {
    await this.initialize();
    return this.Session.find({
      status: SESSION_STATES.CANCELLED,
      refundStatus: { $in: ['pending', 'pending_manual', 'processing'] }
    }).populate('client psychologist', 'name email phone').sort({ cancellationRequestedAt: 1 });
  }

  /**
   * Manually process refund (admin)
   */
  async manuallyProcessRefund(sessionId, adminId, transactionId) {
    await this.initialize();
    const session = await this.Session.findById(sessionId)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email');
    if (!session) throw new Error('Session not found');
    if (session.refundStatus === 'processed') throw new Error('Refund already processed');

    session.refundStatus = 'processed';
    session.refundTransactionId = transactionId;
    session.refundProcessedAt = new Date();
    session.refundProcessedBy = adminId;
    await session.save();

    await logAuditEvent({
      action: 'REFUND_MANUALLY_PROCESSED',
      userId: adminId,
      resourceType: 'payment',
      resourceId: sessionId,
      metadata: { refundAmount: session.refundAmount, transactionId }
    });

    // Send refund processed notification
    await this.sendRefundProcessedNotification(session, session.refundAmount, transactionId);

    return { success: true, session };
  }

  /**
   * Admin cancellation of a session (always full refund)
   * Requirements: 9.3, 9.4
   */
  async adminCancelSession(sessionId, adminId, reason, notes = '') {
    await this.initialize();

    const session = await this.Session.findById(sessionId).populate('client psychologist', 'name email phone');
    if (!session) throw new Error('Session not found');

    // Check if session can be cancelled
    const terminalStatuses = [SESSION_STATES.COMPLETED, SESSION_STATES.CANCELLED, SESSION_STATES.NO_SHOW_CLIENT, SESSION_STATES.NO_SHOW_THERAPIST];
    if (terminalStatuses.includes(session.status)) {
      throw new Error(`Cannot cancel session in ${session.status} status`);
    }

    const previousStatus = session.status;
    const hoursUntilSession = this.calculateHoursUntilSession(session.sessionDate);
    const refundInfo = this.calculateRefundAmount(session, 'admin', hoursUntilSession);

    // Update session
    session.status = SESSION_STATES.CANCELLED;
    session.cancellationRequestedAt = new Date();
    session.cancellationApprovedAt = new Date();
    session.cancellationReason = reason;
    session.cancellationNotes = notes;
    session.cancelledBy = 'admin';
    session.refundStatus = refundInfo.amount > 0 ? 'approved' : 'not_applicable';
    session.refundAmount = refundInfo.amount;
    session.refundPercentage = refundInfo.percentage;

    await session.save();

    await logAuditEvent({
      action: 'SESSION_CANCELLED_BY_ADMIN',
      userId: adminId,
      resourceType: 'session',
      resourceId: sessionId,
      previousValue: { status: previousStatus },
      newValue: { status: SESSION_STATES.CANCELLED, reason, refundAmount: refundInfo.amount },
      metadata: { adminId, hoursUntilSession, refundPercentage: refundInfo.percentage }
    });

    // Process refund if applicable
    let refundResult = null;
    if (refundInfo.amount > 0 && ['Paid', 'Confirmed', PAYMENT_STATES.CONFIRMED].includes(session.paymentStatus)) {
      refundResult = await this.processRefund(session, refundInfo.amount);
    }

    // Send notifications
    const eligibility = {
      refundAmount: refundInfo.amount,
      refundPercentage: refundInfo.percentage,
      cancelledBy: 'admin',
      policy: refundInfo.reason
    };
    await this.sendCancellationNotifications(session, eligibility, refundResult);

    return {
      success: true,
      sessionId,
      status: SESSION_STATES.CANCELLED,
      refundAmount: refundInfo.amount,
      refundPercentage: refundInfo.percentage,
      refundStatus: session.refundStatus,
      message: `Session cancelled by admin. ${refundInfo.reason}`
    };
  }

  /**
   * Deny a refund request (admin only)
   */
  async denyRefund(sessionId, adminId, reason) {
    await this.initialize();

    const session = await this.Session.findById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.refundStatus === 'processed') throw new Error('Refund already processed');
    if (session.refundStatus === 'denied') throw new Error('Refund already denied');

    session.refundStatus = 'denied';
    session.refundNotes = reason;
    session.refundProcessedAt = new Date();
    session.refundProcessedBy = adminId;
    await session.save();

    await logAuditEvent({
      action: 'REFUND_DENIED',
      userId: adminId,
      resourceType: 'payment',
      resourceId: sessionId,
      metadata: { refundAmount: session.refundAmount, reason }
    });

    // Notify client about denial
    if (this.notificationService) {
      try {
        const populatedSession = await this.Session.findById(sessionId).populate('client', 'name email');
        await this.notificationService.sendEmail({
          to: populatedSession.client.email,
          subject: 'Refund Request Update',
          template: 'refund_denied',
          data: {
            clientName: populatedSession.client.name,
            sessionDate: populatedSession.sessionDate,
            refundAmount: session.refundAmount,
            reason
          }
        });
      } catch (e) {
        console.error('Refund denial notification error:', e.message);
      }
    }

    return { success: true, session };
  }

  /**
   * Get cancellation statistics (admin)
   */
  async getCancellationStats() {
    await this.initialize();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all cancelled sessions
    const cancelledSessions = await this.Session.find({
      status: SESSION_STATES.CANCELLED,
      cancellationRequestedAt: { $gte: thirtyDaysAgo }
    });

    // Calculate statistics
    const totalCancellations = cancelledSessions.length;
    const last7Days = cancelledSessions.filter(s => s.cancellationRequestedAt >= sevenDaysAgo).length;
    
    const byReason = {};
    const byCancelledBy = { client: 0, therapist: 0, admin: 0, system: 0 };
    let totalRefundAmount = 0;
    let processedRefunds = 0;
    let pendingRefunds = 0;

    for (const session of cancelledSessions) {
      // Count by reason
      const reason = session.cancellationReason || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;

      // Count by who cancelled
      const cancelledBy = session.cancelledBy || 'unknown';
      if (byCancelledBy[cancelledBy] !== undefined) {
        byCancelledBy[cancelledBy]++;
      }

      // Sum refunds
      if (session.refundAmount > 0) {
        totalRefundAmount += session.refundAmount;
        if (session.refundStatus === 'processed') {
          processedRefunds++;
        } else if (['pending', 'pending_manual', 'processing', 'approved'].includes(session.refundStatus)) {
          pendingRefunds++;
        }
      }
    }

    return {
      period: '30 days',
      totalCancellations,
      last7Days,
      byReason,
      byCancelledBy,
      refunds: {
        totalAmount: totalRefundAmount,
        processed: processedRefunds,
        pending: pendingRefunds
      },
      averagePerDay: Math.round(totalCancellations / 30 * 10) / 10
    };
  }
}

const cancellationService = new CancellationService();

module.exports = { cancellationService, CancellationService, CANCELLATION_CONFIG };
