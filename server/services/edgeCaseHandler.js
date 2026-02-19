/**
 * Edge Case Handler Service
 * 
 * Handles non-happy path scenarios:
 * - User behavior edge cases (page refresh during payment, late joins, overtime)
 * - System edge cases (availability conflicts, race conditions)
 * - Data integrity edge cases (deletion during active sessions)
 * 
 * Requirements: Non-Happy Path Scenarios from Flow Integrity Contract
 */

const { SESSION_STATES } = require('../constants/sessionStates');
const { PAYMENT_STATES } = require('../constants/paymentStates');

const EDGE_CASE_CONFIG = {
  LATE_JOIN_THRESHOLD_MINUTES: 30,
  OVERTIME_GRACE_MINUTES: 5,
  PAYMENT_RESUME_WINDOW_MINUTES: 30,
  RACE_CONDITION_LOCK_TIMEOUT_MS: 5000
};

class EdgeCaseHandler {
  constructor() {
    this.Session = null;
    this.User = null;
    this.activeLocks = new Map();
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    if (!this.User) this.User = require('../models/User');
  }

  // USER BEHAVIOR EDGE CASES

  async handlePageRefreshDuringPayment(sessionId, userId) {
    await this.initialize();
    const session = await this.Session.findById(sessionId);
    if (!session) return { status: 'not_found', message: 'Session not found' };
    
    if (session.paymentStatus === PAYMENT_STATES.CONFIRMED) {
      return { status: 'payment_complete', message: 'Payment already confirmed', session };
    }
    
    if (session.paymentStatus === PAYMENT_STATES.PENDING) {
      const paymentAge = Date.now() - new Date(session.paymentInitiatedAt).getTime();
      if (paymentAge < EDGE_CASE_CONFIG.PAYMENT_RESUME_WINDOW_MINUTES * 60 * 1000) {
        return { status: 'payment_pending', message: 'Payment processing. Please wait.', canRetry: false, checkAgainIn: 30 };
      }
      return { status: 'payment_timeout', message: 'Payment timed out. You may retry.', canRetry: true };
    }
    
    return { status: 'ready_for_payment', message: 'Ready to initiate payment', session };
  }


  async handleLateSessionJoin(sessionId, userId, userRole) {
    await this.initialize();
    const session = await this.Session.findById(sessionId);
    if (!session) return { allowed: false, reason: 'Session not found' };
    
    const now = new Date();
    const sessionStart = new Date(session.scheduledDate);
    const minutesLate = Math.floor((now - sessionStart) / (60 * 1000));
    
    if (minutesLate < 0) return { allowed: true, status: 'on_time', minutesEarly: Math.abs(minutesLate) };
    
    if (minutesLate > EDGE_CASE_CONFIG.LATE_JOIN_THRESHOLD_MINUTES) {
      return { allowed: false, status: 'too_late', minutesLate, reason: `Session join window expired (${EDGE_CASE_CONFIG.LATE_JOIN_THRESHOLD_MINUTES} min limit)` };
    }
    
    const adjustedDuration = session.duration - minutesLate;
    session.actualStartTime = now;
    session.adjustedDuration = adjustedDuration;
    session.lateJoinBy = userRole;
    session.lateJoinMinutes = minutesLate;
    await session.save();
    
    return { allowed: true, status: 'late_join', minutesLate, adjustedDuration, billingAdjusted: true, message: `Session started ${minutesLate} minutes late. Duration adjusted to ${adjustedDuration} minutes.` };
  }

  async handleSessionOvertime(sessionId, requestedExtensionMinutes, therapistId) {
    await this.initialize();
    const session = await this.Session.findById(sessionId).populate('client psychologist');
    if (!session) return { allowed: false, reason: 'Session not found' };
    
    const scheduledEnd = new Date(session.scheduledDate.getTime() + session.duration * 60 * 1000);
    const now = new Date();
    const overtimeMinutes = Math.max(0, Math.floor((now - scheduledEnd) / (60 * 1000)));
    
    if (overtimeMinutes <= EDGE_CASE_CONFIG.OVERTIME_GRACE_MINUTES) {
      return { allowed: true, status: 'within_grace', overtimeMinutes, noExtraCharge: true };
    }
    
    const overtimeRate = session.psychologist?.sessionRate ? session.psychologist.sessionRate / 60 : 50;
    const overtimeCharge = Math.ceil(requestedExtensionMinutes * overtimeRate);
    
    session.overtimeRequested = true;
    session.overtimeMinutes = requestedExtensionMinutes;
    session.overtimeCharge = overtimeCharge;
    session.overtimeApprovalPending = true;
    await session.save();
    
    return { allowed: true, status: 'overtime_pending_approval', overtimeMinutes: requestedExtensionMinutes, overtimeCharge, requiresClientApproval: true, message: `Overtime of ${requestedExtensionMinutes} minutes requires client approval. Additional charge: KES ${overtimeCharge}` };
  }

  async handleMidSessionCancellation(sessionId, cancelledBy, reason) {
    await this.initialize();
    const session = await this.Session.findById(sessionId);
    if (!session) return { success: false, reason: 'Session not found' };
    
    if (session.status !== SESSION_STATES.IN_PROGRESS) {
      return { success: false, reason: 'Session is not in progress' };
    }
    
    const sessionStart = session.actualStartTime || session.scheduledDate;
    const elapsedMinutes = Math.floor((new Date() - new Date(sessionStart)) / (60 * 1000));
    const completionPercentage = Math.min(100, Math.round((elapsedMinutes / session.duration) * 100));
    
    let refundPercentage = 0;
    if (completionPercentage < 25) refundPercentage = 75;
    else if (completionPercentage < 50) refundPercentage = 50;
    else if (completionPercentage < 75) refundPercentage = 25;
    
    const refundAmount = Math.round(session.price * (refundPercentage / 100));
    
    session.status = SESSION_STATES.CANCELLED_DURING_SESSION;
    session.cancelledDuringSessionAt = new Date();
    session.cancelledDuringSessionBy = cancelledBy;
    session.cancellationReason = reason;
    session.elapsedMinutes = elapsedMinutes;
    session.partialRefundAmount = refundAmount;
    session.partialRefundPercentage = refundPercentage;
    await session.save();
    
    return { success: true, status: 'cancelled_during_session', elapsedMinutes, completionPercentage, refundPercentage, refundAmount, message: `Session cancelled after ${elapsedMinutes} minutes. ${refundPercentage}% refund (KES ${refundAmount}) will be processed.` };
  }


  // SYSTEM EDGE CASES

  async detectTherapistAvailabilityConflict(therapistId, requestedDate, duration) {
    await this.initialize();
    const requestedStart = new Date(requestedDate);
    const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 1000);
    
    const conflictingSessions = await this.Session.find({
      psychologist: therapistId,
      status: { $nin: [SESSION_STATES.CANCELLED, SESSION_STATES.NO_SHOW_CLIENT, SESSION_STATES.NO_SHOW_THERAPIST] },
      scheduledDate: { $lt: requestedEnd },
      $expr: { $gt: [{ $add: ['$scheduledDate', { $multiply: ['$duration', 60000] }] }, requestedStart] }
    });
    
    if (conflictingSessions.length > 0) {
      return { hasConflict: true, conflictingSessions: conflictingSessions.map(s => ({ id: s._id, date: s.scheduledDate, duration: s.duration })), alternatives: await this.findAlternativeSlots(therapistId, requestedDate, duration) };
    }
    return { hasConflict: false };
  }

  async findAlternativeSlots(therapistId, preferredDate, duration, maxAlternatives = 3) {
    await this.initialize();
    const alternatives = [];
    const searchDate = new Date(preferredDate);
    
    for (let dayOffset = 0; dayOffset < 7 && alternatives.length < maxAlternatives; dayOffset++) {
      const checkDate = new Date(searchDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      for (let hour = 9; hour <= 17 && alternatives.length < maxAlternatives; hour++) {
        const slotStart = new Date(checkDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        if (slotStart <= new Date()) continue;
        
        const conflict = await this.detectTherapistAvailabilityConflict(therapistId, slotStart, duration);
        if (!conflict.hasConflict) {
          alternatives.push({ date: slotStart, duration });
        }
      }
    }
    return alternatives;
  }

  async handlePaymentAfterAutoCancellation(sessionId, paymentDetails) {
    await this.initialize();
    const session = await this.Session.findById(sessionId);
    if (!session) return { action: 'refund', reason: 'Session not found' };
    
    if (session.status === SESSION_STATES.CANCELLED || session.status === SESSION_STATES.AUTO_CANCELLED) {
      session.latePaymentReceived = true;
      session.latePaymentDetails = paymentDetails;
      session.latePaymentAt = new Date();
      session.refundRequired = true;
      session.refundReason = 'Payment received after session cancellation';
      await session.save();
      
      return { action: 'refund', sessionId, reason: 'Session was cancelled before payment confirmation', refundAmount: paymentDetails.amount, offerRebooking: true, message: 'Payment received for cancelled session. Refund will be processed and priority rebooking offered.' };
    }
    return { action: 'process_normally', sessionId };
  }

  async acquireBookingLock(therapistId, timeSlot) {
    const lockKey = `${therapistId}_${new Date(timeSlot).toISOString()}`;
    if (this.activeLocks.has(lockKey)) {
      const existingLock = this.activeLocks.get(lockKey);
      if (Date.now() - existingLock.timestamp < EDGE_CASE_CONFIG.RACE_CONDITION_LOCK_TIMEOUT_MS) {
        return { acquired: false, reason: 'Slot temporarily locked by another booking attempt' };
      }
    }
    this.activeLocks.set(lockKey, { timestamp: Date.now() });
    setTimeout(() => this.activeLocks.delete(lockKey), EDGE_CASE_CONFIG.RACE_CONDITION_LOCK_TIMEOUT_MS);
    return { acquired: true, lockKey };
  }

  releaseBookingLock(lockKey) {
    this.activeLocks.delete(lockKey);
  }


  // DATA INTEGRITY EDGE CASES

  async handleDeletionDuringActiveSession(userId, sessionId) {
    await this.initialize();
    const session = await this.Session.findById(sessionId);
    if (!session) return { canDelete: true, reason: 'Session not found' };
    
    if (session.status === SESSION_STATES.IN_PROGRESS) {
      return { canDelete: false, reason: 'Cannot delete data during active session', sessionStatus: session.status, recommendation: 'Wait for session to complete or cancel the session first' };
    }
    
    if ([SESSION_STATES.READY, SESSION_STATES.PAID].includes(session.status)) {
      return { canDelete: false, reason: 'Cannot delete data with upcoming paid session', sessionStatus: session.status, recommendation: 'Cancel and refund the session first' };
    }
    
    return { canDelete: true, sessionStatus: session.status };
  }

  async handleEmailChangeDuringVerification(userId, newEmail) {
    await this.initialize();
    const user = await this.User.findById(userId);
    if (!user) return { success: false, reason: 'User not found' };
    
    user.pendingEmailVerifications = user.pendingEmailVerifications || [];
    user.pendingEmailVerifications.forEach(v => v.status = 'invalidated');
    
    const newVerificationToken = require('crypto').randomBytes(32).toString('hex');
    user.pendingEmailVerifications.push({ email: newEmail, token: newVerificationToken, createdAt: new Date(), status: 'pending', previousEmail: user.email });
    user.emailVerificationPending = true;
    await user.save();
    
    return { success: true, message: 'Previous verification invalidated. New verification email will be sent.', newEmail, requiresVerification: true };
  }

  async validateDataConsistency(sessionId) {
    await this.initialize();
    const session = await this.Session.findById(sessionId).populate('client psychologist');
    if (!session) return { valid: false, errors: ['Session not found'] };
    
    const errors = [];
    if (!session.client) errors.push('Client reference missing');
    if (!session.psychologist) errors.push('Psychologist reference missing');
    if (session.paymentStatus === PAYMENT_STATES.CONFIRMED && session.status === SESSION_STATES.CANCELLED) errors.push('Inconsistent state: Payment confirmed but session cancelled');
    if (session.status === SESSION_STATES.COMPLETED && !session.actualEndTime) errors.push('Completed session missing end time');
    
    return { valid: errors.length === 0, errors, sessionId };
  }
}

const edgeCaseHandler = new EdgeCaseHandler();
module.exports = { EdgeCaseHandler, edgeCaseHandler, EDGE_CASE_CONFIG };
