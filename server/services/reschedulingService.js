/**
 * Rescheduling Service
 * 
 * Implements session rescheduling with approval workflow:
 * - 24-hour automatic approval rule
 * - <24-hour therapist approval requirement
 * - Availability checking and conflict prevention
 * - Calendar and notification updates
 * 
 * Requirements: 9.1, 9.2, 9.5 from Cancellation & Rescheduling
 */

const mongoose = require('mongoose');
const { logAuditEvent } = require('../utils/auditLogger');

const RESCHEDULE_CONFIG = {
  AUTO_APPROVE_HOURS: 24,
  MAX_RESCHEDULES_PER_SESSION: 2,
  RESCHEDULE_REASONS: [
    'schedule_conflict',
    'emergency',
    'illness',
    'therapist_request',
    'client_request',
    'technical_issues',
    'work_commitment',
    'family_emergency',
    'travel',
    'other'
  ],
  RESCHEDULABLE_STATUSES: ['Approved', 'Payment Submitted', 'Confirmed', 'Booked']
};

class ReschedulingService {
  constructor() {
    this.Session = null;
    this.User = null;
    this.notificationService = null;
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    if (!this.User) this.User = require('../models/User');
    try { 
      if (!this.notificationService) this.notificationService = require('../utils/notificationService'); 
    } catch (e) {
      console.log('Notification service not available');
    }
  }

  /**
   * Calculate hours until session
   */
  calculateHoursUntilSession(sessionDate) {
    const now = new Date();
    const sessionTime = new Date(sessionDate);
    return (sessionTime - now) / (1000 * 60 * 60);
  }

  /**
   * Check if session can be rescheduled
   * Requirements: 9.1, 9.2
   */
  async checkRescheduleEligibility(sessionId, userId) {
    await this.initialize();
    
    const session = await this.Session.findById(sessionId)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone');
    
    if (!session) {
      return { eligible: false, reason: 'Session not found' };
    }
    
    const isClient = session.client._id.toString() === userId;
    const isTherapist = session.psychologist._id.toString() === userId;
    
    if (!isClient && !isTherapist) {
      return { eligible: false, reason: 'Not authorized to reschedule this session' };
    }
    
    // Check session status
    if (!RESCHEDULE_CONFIG.RESCHEDULABLE_STATUSES.includes(session.status)) {
      return { 
        eligible: false, 
        reason: `Cannot reschedule session in "${session.status}" status. Session must be in one of: ${RESCHEDULE_CONFIG.RESCHEDULABLE_STATUSES.join(', ')}`
      };
    }
    
    // Check if session is already cancelled
    if (session.status === 'Cancelled') {
      return { eligible: false, reason: 'Cannot reschedule a cancelled session' };
    }
    
    // Check if there's already a pending reschedule request
    if (session.rescheduleStatus === 'pending') {
      return { 
        eligible: false, 
        reason: 'There is already a pending reschedule request for this session',
        pendingRequest: {
          requestedAt: session.rescheduleRequestedAt,
          requestedBy: session.rescheduleRequestedBy,
          newRequestedDate: session.newRequestedDate
        }
      };
    }
    
    // Check reschedule limit
    const rescheduleCount = session.rescheduleCount || 0;
    if (rescheduleCount >= RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION) {
      return { 
        eligible: false, 
        reason: `Maximum reschedules (${RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION}) reached for this session`
      };
    }
    
    const hoursUntilSession = this.calculateHoursUntilSession(session.sessionDate);
    
    // Check if session is in the past
    if (hoursUntilSession < 0) {
      return { eligible: false, reason: 'Cannot reschedule a session that has already passed' };
    }
    
    const requiresApproval = hoursUntilSession < RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS;
    
    return {
      eligible: true,
      sessionId,
      session: {
        id: session._id,
        currentDate: session.sessionDate,
        sessionType: session.sessionType,
        status: session.status,
        client: { name: session.client.name, email: session.client.email },
        therapist: { name: session.psychologist.name, email: session.psychologist.email }
      },
      hoursUntilSession: Math.max(0, Math.round(hoursUntilSession * 10) / 10),
      requiresApproval,
      approvalMessage: requiresApproval 
        ? 'Reschedule requires therapist approval (less than 24 hours notice)'
        : 'Reschedule will be automatically approved (24+ hours notice)',
      rescheduleCount,
      remainingReschedules: RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION - rescheduleCount,
      maxReschedules: RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION,
      requestedBy: isClient ? 'client' : 'therapist',
      validReasons: RESCHEDULE_CONFIG.RESCHEDULE_REASONS
    };
  }

  /**
   * Check if new time slot is available for therapist
   * Requirements: 9.1, 9.2
   */
  async checkAvailability(therapistId, newDate, duration = 60, excludeSessionId = null) {
    await this.initialize();
    
    const sessionStart = new Date(newDate);
    const sessionEnd = new Date(sessionStart.getTime() + duration * 60000);
    
    // Check for conflicting sessions
    const query = {
      psychologist: therapistId,
      status: { $nin: ['Cancelled', 'Declined', 'Completed'] },
      sessionDate: {
        $gte: new Date(sessionStart.getTime() - duration * 60000),
        $lte: sessionEnd
      }
    };
    
    if (excludeSessionId) {
      query._id = { $ne: excludeSessionId };
    }
    
    const conflictingSessions = await this.Session.find(query)
      .select('sessionDate sessionType status client')
      .populate('client', 'name');
    
    // Filter to only actual conflicts (overlapping time)
    const actualConflicts = conflictingSessions.filter(s => {
      const existingStart = new Date(s.sessionDate);
      const existingEnd = new Date(existingStart.getTime() + 60 * 60000); // Assume 60 min sessions
      return sessionStart < existingEnd && sessionEnd > existingStart;
    });
    
    return {
      available: actualConflicts.length === 0,
      requestedSlot: {
        start: sessionStart,
        end: sessionEnd,
        duration
      },
      conflicts: actualConflicts.map(s => ({
        sessionId: s._id,
        sessionDate: s.sessionDate,
        sessionType: s.sessionType,
        status: s.status,
        clientName: s.client?.name || 'Unknown'
      }))
    };
  }


  /**
   * Request to reschedule a session
   * Requirements: 9.1, 9.2
   */
  async requestReschedule(sessionId, userId, newDate, reason, notes = '') {
    await this.initialize();
    
    // Validate reason
    if (!reason || !RESCHEDULE_CONFIG.RESCHEDULE_REASONS.includes(reason)) {
      throw new Error(`Invalid reschedule reason. Valid reasons: ${RESCHEDULE_CONFIG.RESCHEDULE_REASONS.join(', ')}`);
    }
    
    // Check eligibility
    const eligibility = await this.checkRescheduleEligibility(sessionId, userId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }
    
    const session = await this.Session.findById(sessionId)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone');
    
    const therapistId = session.psychologist._id;
    
    // Check availability for new date
    const availability = await this.checkAvailability(therapistId, newDate, 60, sessionId);
    if (!availability.available) {
      throw new Error(`The requested time slot is not available. Conflicts with ${availability.conflicts.length} existing session(s).`);
    }
    
    // Validate new date is in the future
    const newDateTime = new Date(newDate);
    if (newDateTime <= new Date()) {
      throw new Error('New session date must be in the future');
    }
    
    const isClient = session.client._id.toString() === userId;
    const requestedBy = isClient ? 'client' : 'therapist';
    const hoursUntilSession = this.calculateHoursUntilSession(session.sessionDate);
    const autoApprove = hoursUntilSession >= RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS;
    
    // Start transaction for atomic update
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();
    
    try {
      // Store original date before any changes
      const originalDate = session.sessionDate;
      
      if (autoApprove || requestedBy === 'therapist') {
        // Auto-approve: update session directly
        session.originalSessionDate = originalDate;
        session.sessionDate = newDateTime;
        session.rescheduleRequestedAt = new Date();
        session.rescheduleApprovedAt = new Date();
        session.rescheduleRequestedBy = requestedBy;
        session.rescheduleReason = reason;
        session.rescheduleNotes = notes;
        session.rescheduleStatus = requestedBy === 'therapist' ? 'approved' : 'auto_approved';
        session.rescheduleCount = (session.rescheduleCount || 0) + 1;
        session.newRequestedDate = newDateTime;
        
        await session.save({ session: mongoSession });
        
        // Log audit event
        await logAuditEvent({
          action: 'SESSION_RESCHEDULED',
          userId,
          sessionId: session._id,
          details: {
            originalDate,
            newDate: newDateTime,
            reason,
            requestedBy,
            autoApproved: autoApprove,
            hoursNotice: Math.round(hoursUntilSession * 10) / 10
          }
        });
        
        await mongoSession.commitTransaction();
        
        // Send notifications
        await this.sendRescheduleNotifications(session, 'approved', requestedBy, originalDate, newDateTime);
        
        return {
          success: true,
          status: 'approved',
          message: autoApprove 
            ? 'Session rescheduled successfully (auto-approved with 24+ hours notice)'
            : 'Session rescheduled successfully (therapist-initiated)',
          session: {
            id: session._id,
            originalDate,
            newDate: newDateTime,
            rescheduleCount: session.rescheduleCount
          }
        };
      } else {
        // Requires therapist approval
        session.originalSessionDate = originalDate;
        session.newRequestedDate = newDateTime;
        session.rescheduleRequestedAt = new Date();
        session.rescheduleRequestedBy = requestedBy;
        session.rescheduleReason = reason;
        session.rescheduleNotes = notes;
        session.rescheduleStatus = 'pending';
        
        await session.save({ session: mongoSession });
        
        // Log audit event
        await logAuditEvent({
          action: 'RESCHEDULE_REQUESTED',
          userId,
          sessionId: session._id,
          details: {
            originalDate,
            requestedNewDate: newDateTime,
            reason,
            requestedBy,
            hoursNotice: Math.round(hoursUntilSession * 10) / 10,
            requiresApproval: true
          }
        });
        
        await mongoSession.commitTransaction();
        
        // Send notification to therapist for approval
        await this.sendRescheduleNotifications(session, 'pending', requestedBy, originalDate, newDateTime);
        
        return {
          success: true,
          status: 'pending',
          message: 'Reschedule request submitted. Awaiting therapist approval (less than 24 hours notice).',
          session: {
            id: session._id,
            originalDate,
            requestedNewDate: newDateTime,
            rescheduleStatus: 'pending'
          }
        };
      }
    } catch (error) {
      await mongoSession.abortTransaction();
      throw error;
    } finally {
      mongoSession.endSession();
    }
  }

  /**
   * Approve a pending reschedule request (therapist only)
   * Requirements: 9.2
   */
  async approveReschedule(sessionId, therapistId, notes = '') {
    await this.initialize();
    
    const session = await this.Session.findById(sessionId)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone');
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Verify therapist
    if (session.psychologist._id.toString() !== therapistId) {
      throw new Error('Only the assigned therapist can approve reschedule requests');
    }
    
    // Check if there's a pending request
    if (session.rescheduleStatus !== 'pending') {
      throw new Error('No pending reschedule request for this session');
    }
    
    // Check availability for the requested new date
    const availability = await this.checkAvailability(
      therapistId, 
      session.newRequestedDate, 
      60, 
      sessionId
    );
    
    if (!availability.available) {
      throw new Error(`Cannot approve: The requested time slot is no longer available. Conflicts with ${availability.conflicts.length} existing session(s).`);
    }
    
    const originalDate = session.sessionDate;
    const newDate = session.newRequestedDate;
    
    // Update session
    session.sessionDate = newDate;
    session.rescheduleApprovedAt = new Date();
    session.rescheduleApprovedBy = therapistId;
    session.rescheduleStatus = 'approved';
    session.rescheduleCount = (session.rescheduleCount || 0) + 1;
    if (notes) {
      session.rescheduleNotes = (session.rescheduleNotes || '') + '\nTherapist notes: ' + notes;
    }
    
    await session.save();
    
    // Log audit event
    await logAuditEvent({
      action: 'RESCHEDULE_APPROVED',
      userId: therapistId,
      sessionId: session._id,
      details: {
        originalDate,
        newDate,
        approvedBy: 'therapist',
        notes
      }
    });
    
    // Send notifications
    await this.sendRescheduleNotifications(session, 'approved', 'therapist', originalDate, newDate);
    
    return {
      success: true,
      message: 'Reschedule request approved successfully',
      session: {
        id: session._id,
        originalDate,
        newDate,
        rescheduleCount: session.rescheduleCount
      }
    };
  }

  /**
   * Reject a pending reschedule request (therapist only)
   * Requirements: 9.2
   */
  async rejectReschedule(sessionId, therapistId, rejectionReason) {
    await this.initialize();
    
    if (!rejectionReason) {
      throw new Error('Rejection reason is required');
    }
    
    const session = await this.Session.findById(sessionId)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone');
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Verify therapist
    if (session.psychologist._id.toString() !== therapistId) {
      throw new Error('Only the assigned therapist can reject reschedule requests');
    }
    
    // Check if there's a pending request
    if (session.rescheduleStatus !== 'pending') {
      throw new Error('No pending reschedule request for this session');
    }
    
    const requestedNewDate = session.newRequestedDate;
    
    // Update session - keep original date, clear pending request
    session.rescheduleStatus = 'rejected';
    session.rescheduleRejectedAt = new Date();
    session.rescheduleRejectedBy = therapistId;
    session.rescheduleRejectionReason = rejectionReason;
    session.newRequestedDate = null;
    
    await session.save();
    
    // Log audit event
    await logAuditEvent({
      action: 'RESCHEDULE_REJECTED',
      userId: therapistId,
      sessionId: session._id,
      details: {
        originalDate: session.sessionDate,
        requestedNewDate,
        rejectionReason,
        rejectedBy: 'therapist'
      }
    });
    
    // Send notification to client
    await this.sendRescheduleNotifications(session, 'rejected', 'therapist', session.sessionDate, requestedNewDate);
    
    return {
      success: true,
      message: 'Reschedule request rejected',
      session: {
        id: session._id,
        sessionDate: session.sessionDate,
        rescheduleStatus: 'rejected',
        rejectionReason
      }
    };
  }


  /**
   * Get pending reschedule requests for a therapist
   */
  async getPendingRescheduleRequests(therapistId) {
    await this.initialize();
    
    const pendingRequests = await this.Session.find({
      psychologist: therapistId,
      rescheduleStatus: 'pending'
    })
    .populate('client', 'name email phone')
    .sort({ rescheduleRequestedAt: -1 });
    
    return pendingRequests.map(session => ({
      sessionId: session._id,
      currentDate: session.sessionDate,
      requestedNewDate: session.newRequestedDate,
      requestedAt: session.rescheduleRequestedAt,
      requestedBy: session.rescheduleRequestedBy,
      reason: session.rescheduleReason,
      notes: session.rescheduleNotes,
      client: {
        name: session.client.name,
        email: session.client.email
      },
      sessionType: session.sessionType,
      hoursUntilCurrentSession: this.calculateHoursUntilSession(session.sessionDate)
    }));
  }

  /**
   * Get reschedule history for a session
   */
  async getRescheduleHistory(sessionId, userId) {
    await this.initialize();
    
    const session = await this.Session.findById(sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .populate('rescheduleApprovedBy', 'name')
      .populate('rescheduleRejectedBy', 'name');
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Verify user has access
    const isClient = session.client._id.toString() === userId;
    const isTherapist = session.psychologist._id.toString() === userId;
    
    if (!isClient && !isTherapist) {
      throw new Error('Not authorized to view this session');
    }
    
    return {
      sessionId: session._id,
      currentDate: session.sessionDate,
      originalDate: session.originalSessionDate,
      rescheduleCount: session.rescheduleCount || 0,
      maxReschedules: RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION,
      remainingReschedules: RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION - (session.rescheduleCount || 0),
      lastReschedule: session.rescheduleRequestedAt ? {
        requestedAt: session.rescheduleRequestedAt,
        requestedBy: session.rescheduleRequestedBy,
        reason: session.rescheduleReason,
        notes: session.rescheduleNotes,
        status: session.rescheduleStatus,
        approvedAt: session.rescheduleApprovedAt,
        approvedBy: session.rescheduleApprovedBy?.name,
        rejectedAt: session.rescheduleRejectedAt,
        rejectedBy: session.rescheduleRejectedBy?.name,
        rejectionReason: session.rescheduleRejectionReason
      } : null
    };
  }

  /**
   * Get user's reschedule history (all sessions)
   */
  async getUserRescheduleHistory(userId, role) {
    await this.initialize();
    
    const query = role === 'psychologist' 
      ? { psychologist: userId, rescheduleCount: { $gt: 0 } }
      : { client: userId, rescheduleCount: { $gt: 0 } };
    
    const sessions = await this.Session.find(query)
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .sort({ rescheduleRequestedAt: -1 })
      .limit(50);
    
    return sessions.map(session => ({
      sessionId: session._id,
      sessionType: session.sessionType,
      currentDate: session.sessionDate,
      originalDate: session.originalSessionDate,
      rescheduleCount: session.rescheduleCount,
      lastRescheduleStatus: session.rescheduleStatus,
      lastRescheduleReason: session.rescheduleReason,
      lastRescheduleRequestedAt: session.rescheduleRequestedAt,
      client: { name: session.client.name },
      therapist: { name: session.psychologist.name }
    }));
  }

  /**
   * Send reschedule notifications using notification templates
   * Requirements: 9.5
   */
  async sendRescheduleNotifications(session, status, initiatedBy, originalDate, newDate) {
    if (!this.notificationService) {
      console.log('Notification service not available, skipping notifications');
      return [];
    }
    
    const notificationTemplates = require('../utils/notificationTemplates');
    const notificationsSent = [];
    
    const clientEmail = session.client.email;
    const clientPhone = session.client.phone;
    const therapistEmail = session.psychologist.email;
    const therapistPhone = session.psychologist.phone;
    const clientName = session.client.name;
    const therapistName = session.psychologist.name;
    const hoursUntilSession = this.calculateHoursUntilSession(originalDate);
    
    try {
      if (status === 'pending') {
        // Send therapist email notification for pending request
        if (therapistEmail) {
          try {
            const therapistEmailTemplate = notificationTemplates.rescheduleRequestTherapistEmail({
              therapistName,
              clientName,
              originalDate,
              requestedNewDate: newDate,
              rescheduleReason: session.rescheduleReason,
              rescheduleNotes: session.rescheduleNotes,
              sessionId: session._id.toString(),
              hoursUntilSession
            });
            await this.notificationService.sendEmail({
              to: therapistEmail,
              subject: therapistEmailTemplate.subject,
              html: therapistEmailTemplate.html
            });
            notificationsSent.push({ type: 'email', recipient: 'therapist', status: 'sent' });
          } catch (e) {
            console.error('Therapist reschedule request email error:', e.message);
            notificationsSent.push({ type: 'email', recipient: 'therapist', status: 'failed', error: e.message });
          }
        }
        
        // Send therapist SMS notification
        if (therapistPhone) {
          try {
            const therapistSMS = notificationTemplates.rescheduleRequestTherapistSMS({
              clientName,
              originalDate,
              requestedNewDate: newDate
            });
            await this.notificationService.sendSMS({
              to: therapistPhone,
              message: therapistSMS
            });
            notificationsSent.push({ type: 'sms', recipient: 'therapist', status: 'sent' });
          } catch (e) {
            console.error('Therapist reschedule request SMS error:', e.message);
            notificationsSent.push({ type: 'sms', recipient: 'therapist', status: 'failed', error: e.message });
          }
        }
        
        // Send client confirmation email
        if (clientEmail) {
          try {
            const clientEmailTemplate = notificationTemplates.rescheduleRequestClientEmail({
              clientName,
              therapistName,
              originalDate,
              requestedNewDate: newDate,
              requiresApproval: true
            });
            await this.notificationService.sendEmail({
              to: clientEmail,
              subject: clientEmailTemplate.subject,
              html: clientEmailTemplate.html
            });
            notificationsSent.push({ type: 'email', recipient: 'client', status: 'sent' });
          } catch (e) {
            console.error('Client reschedule request email error:', e.message);
            notificationsSent.push({ type: 'email', recipient: 'client', status: 'failed', error: e.message });
          }
        }
        
      } else if (status === 'approved' || status === 'auto_approved') {
        // Send client approval email
        if (clientEmail) {
          try {
            const clientEmailTemplate = notificationTemplates.rescheduleApprovalClientEmail({
              clientName,
              therapistName,
              originalDate,
              newDate,
              sessionType: session.sessionType || 'Therapy Session',
              sessionId: session._id.toString()
            });
            await this.notificationService.sendEmail({
              to: clientEmail,
              subject: clientEmailTemplate.subject,
              html: clientEmailTemplate.html
            });
            notificationsSent.push({ type: 'email', recipient: 'client', status: 'sent' });
          } catch (e) {
            console.error('Client reschedule approval email error:', e.message);
            notificationsSent.push({ type: 'email', recipient: 'client', status: 'failed', error: e.message });
          }
        }
        
        // Send client approval SMS
        if (clientPhone) {
          try {
            const clientSMS = notificationTemplates.rescheduleApprovalClientSMS({
              newDate,
              therapistName
            });
            await this.notificationService.sendSMS({
              to: clientPhone,
              message: clientSMS
            });
            notificationsSent.push({ type: 'sms', recipient: 'client', status: 'sent' });
          } catch (e) {
            console.error('Client reschedule approval SMS error:', e.message);
            notificationsSent.push({ type: 'sms', recipient: 'client', status: 'failed', error: e.message });
          }
        }
        
        // Send therapist notification (if not therapist-initiated)
        if (initiatedBy !== 'therapist' && therapistEmail) {
          try {
            const therapistEmailTemplate = notificationTemplates.rescheduleApprovalTherapistEmail({
              therapistName,
              clientName,
              originalDate,
              newDate,
              sessionType: session.sessionType || 'Therapy Session',
              sessionId: session._id.toString()
            });
            await this.notificationService.sendEmail({
              to: therapistEmail,
              subject: therapistEmailTemplate.subject,
              html: therapistEmailTemplate.html
            });
            notificationsSent.push({ type: 'email', recipient: 'therapist', status: 'sent' });
          } catch (e) {
            console.error('Therapist reschedule approval email error:', e.message);
            notificationsSent.push({ type: 'email', recipient: 'therapist', status: 'failed', error: e.message });
          }
        }
        
      } else if (status === 'rejected') {
        // Send client rejection email
        if (clientEmail) {
          try {
            const clientEmailTemplate = notificationTemplates.rescheduleRejectionClientEmail({
              clientName,
              therapistName,
              originalDate,
              requestedNewDate: newDate,
              rejectionReason: session.rescheduleRejectionReason || 'No reason provided',
              sessionId: session._id.toString()
            });
            await this.notificationService.sendEmail({
              to: clientEmail,
              subject: clientEmailTemplate.subject,
              html: clientEmailTemplate.html
            });
            notificationsSent.push({ type: 'email', recipient: 'client', status: 'sent' });
          } catch (e) {
            console.error('Client reschedule rejection email error:', e.message);
            notificationsSent.push({ type: 'email', recipient: 'client', status: 'failed', error: e.message });
          }
        }
        
        // Send client rejection SMS
        if (clientPhone) {
          try {
            const clientSMS = notificationTemplates.rescheduleRejectionClientSMS({
              originalDate
            });
            await this.notificationService.sendSMS({
              to: clientPhone,
              message: clientSMS
            });
            notificationsSent.push({ type: 'sms', recipient: 'client', status: 'sent' });
          } catch (e) {
            console.error('Client reschedule rejection SMS error:', e.message);
            notificationsSent.push({ type: 'sms', recipient: 'client', status: 'failed', error: e.message });
          }
        }
      }
      
      // Log audit event for notifications
      await logAuditEvent({
        action: 'RESCHEDULE_NOTIFICATIONS_SENT',
        userId: session.client._id,
        resourceType: 'session',
        resourceId: session._id,
        metadata: { 
          status,
          initiatedBy,
          notificationCount: notificationsSent.length,
          notificationsSent
        }
      });
      
    } catch (error) {
      console.error('Failed to send reschedule notifications:', error);
      // Don't throw - notifications are not critical
    }
    
    return notificationsSent;
  }

  /**
   * Get reschedule policy
   */
  getReschedulePolicy() {
    return {
      autoApproveHours: RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS,
      maxReschedulesPerSession: RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION,
      validReasons: RESCHEDULE_CONFIG.RESCHEDULE_REASONS,
      reschedulableStatuses: RESCHEDULE_CONFIG.RESCHEDULABLE_STATUSES,
      rules: [
        `Reschedule requests made ${RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS}+ hours before the session are automatically approved`,
        `Reschedule requests made less than ${RESCHEDULE_CONFIG.AUTO_APPROVE_HOURS} hours before the session require therapist approval`,
        `Each session can be rescheduled a maximum of ${RESCHEDULE_CONFIG.MAX_RESCHEDULES_PER_SESSION} times`,
        'Therapists can reschedule sessions at any time',
        'The new time slot must be available (no conflicts with existing sessions)'
      ]
    };
  }

  /**
   * Get reschedule statistics (admin)
   */
  async getRescheduleStats(startDate, endDate) {
    await this.initialize();
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const matchStage = { rescheduleCount: { $gt: 0 } };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.rescheduleRequestedAt = dateFilter;
    }
    
    const stats = await this.Session.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRescheduled: { $sum: 1 },
          totalRescheduleCount: { $sum: '$rescheduleCount' },
          autoApproved: {
            $sum: { $cond: [{ $eq: ['$rescheduleStatus', 'auto_approved'] }, 1, 0] }
          },
          manuallyApproved: {
            $sum: { $cond: [{ $eq: ['$rescheduleStatus', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$rescheduleStatus', 'rejected'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$rescheduleStatus', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const reasonStats = await this.Session.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$rescheduleReason',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    return {
      summary: stats[0] || {
        totalRescheduled: 0,
        totalRescheduleCount: 0,
        autoApproved: 0,
        manuallyApproved: 0,
        rejected: 0,
        pending: 0
      },
      byReason: reasonStats.map(r => ({ reason: r._id, count: r.count })),
      dateRange: { startDate, endDate }
    };
  }
}

// Export singleton instance and config
const reschedulingService = new ReschedulingService();
module.exports = { reschedulingService, RESCHEDULE_CONFIG };
