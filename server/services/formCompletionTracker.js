/**
 * Form Completion Tracker Service
 * 
 * Tracks and manages form completion status for sessions:
 * - Agreement and intake form completion tracking
 * - 24-hour reminder system
 * - Session status updates based on form completion
 * - Meeting link delivery after forms complete
 * 
 * Requirements: 5.4, 5.5 from Forms & Agreements System
 */

const { SESSION_STATES } = require('../constants/sessionStates');

const FORM_TRACKING_CONFIG = {
  REMINDER_HOURS_BEFORE: 24,
  URGENT_REMINDER_HOURS_BEFORE: 2,
  CHECK_INTERVAL_MS: 15 * 60 * 1000 // 15 minutes
};

class FormCompletionTrackerService {
  constructor() {
    this.Session = null;
    this.ConfidentialityAgreement = null;
    this.IntakeForm = null;
    this.notificationService = null;
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    try { if (!this.ConfidentialityAgreement) this.ConfidentialityAgreement = require('../models/ConfidentialityAgreement'); } catch (e) {}
    try { if (!this.IntakeForm) this.IntakeForm = require('../models/IntakeForm'); } catch (e) {}
    try { if (!this.notificationService) this.notificationService = require('../utils/notificationService'); } catch (e) {}
  }

  /**
   * Check form completion status for a session
   */
  async checkFormCompletion(sessionId) {
    await this.initialize();
    
    const session = await this.Session.findById(sessionId).populate('client', 'name email');
    if (!session) return { error: 'Session not found' };
    
    const agreementComplete = await this.checkAgreementComplete(session.client._id);
    const intakeFormComplete = await this.checkIntakeFormComplete(sessionId);
    
    const allFormsComplete = agreementComplete && intakeFormComplete;
    
    return {
      sessionId,
      clientId: session.client._id,
      agreementComplete,
      intakeFormComplete,
      allFormsComplete,
      sessionStatus: session.status,
      canProceedToSession: allFormsComplete && session.paymentStatus === 'confirmed'
    };
  }

  async checkAgreementComplete(clientId) {
    if (!this.ConfidentialityAgreement) return true; // Skip if model not available
    return await this.ConfidentialityAgreement.hasValidAgreement(clientId);
  }

  async checkIntakeFormComplete(sessionId) {
    if (!this.IntakeForm) return true; // Skip if model not available
    const form = await this.IntakeForm.findOne({ session: sessionId, isComplete: true });
    return !!form;
  }

  /**
   * Update session status based on form completion
   */
  async updateSessionFormsStatus(sessionId) {
    await this.initialize();
    
    const completion = await this.checkFormCompletion(sessionId);
    if (completion.error) return completion;
    
    const session = await this.Session.findById(sessionId);
    if (!session) return { error: 'Session not found' };
    
    session.agreementCompleted = completion.agreementComplete;
    session.intakeFormCompleted = completion.intakeFormComplete;
    
    if (completion.allFormsComplete && !session.formsCompletedAt) {
      session.formsCompletedAt = new Date();
      
      // Update session status to READY if payment is confirmed
      if (session.paymentStatus === 'confirmed' && session.status === SESSION_STATES.FORMS_REQUIRED) {
        session.status = SESSION_STATES.READY;
        
        // Send meeting link
        await this.sendMeetingLink(session);
      }
    }
    
    await session.save();
    
    return {
      sessionId,
      updated: true,
      agreementCompleted: session.agreementCompleted,
      intakeFormCompleted: session.intakeFormCompleted,
      formsCompletedAt: session.formsCompletedAt,
      newStatus: session.status
    };
  }


  /**
   * Send meeting link after forms are complete
   */
  async sendMeetingLink(session) {
    if (!this.notificationService) return;
    
    try {
      const populatedSession = await this.Session.findById(session._id)
        .populate('client psychologist', 'name email');
      
      const meetingLink = session.meetingLink || `${process.env.CLIENT_URL}/video-call/${session._id}`;
      
      await this.notificationService.sendEmail({
        to: populatedSession.client.email,
        subject: 'Your Session is Ready - Meeting Link',
        template: 'session-ready',
        data: {
          clientName: populatedSession.client.name,
          therapistName: populatedSession.psychologist.name,
          sessionDate: session.scheduledDate,
          meetingLink,
          message: 'All forms are complete. Your session is ready!'
        }
      });
      
      console.log(`📧 Meeting link sent for session ${session._id}`);
    } catch (error) {
      console.error('Failed to send meeting link:', error);
    }
  }

  /**
   * Find sessions needing form completion reminders
   */
  async findSessionsNeedingReminders() {
    await this.initialize();
    
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + (FORM_TRACKING_CONFIG.REMINDER_HOURS_BEFORE * 60 * 60 * 1000));
    
    const sessions = await this.Session.find({
      scheduledDate: { $lte: reminderThreshold, $gt: now },
      status: { $in: [SESSION_STATES.PAID, SESSION_STATES.FORMS_REQUIRED] },
      $or: [
        { agreementCompleted: { $ne: true } },
        { intakeFormCompleted: { $ne: true } }
      ],
      formReminderSent: { $ne: true }
    }).populate('client psychologist', 'name email');
    
    return sessions;
  }

  /**
   * Send form completion reminder
   */
  async sendFormReminder(session) {
    if (!this.notificationService) return { sent: false, reason: 'Notification service unavailable' };
    
    const completion = await this.checkFormCompletion(session._id);
    const missingForms = [];
    
    if (!completion.agreementComplete) missingForms.push('Confidentiality Agreement');
    if (!completion.intakeFormComplete) missingForms.push('Intake Form');
    
    if (missingForms.length === 0) return { sent: false, reason: 'All forms complete' };
    
    try {
      await this.notificationService.sendEmail({
        to: session.client.email,
        subject: 'Action Required: Complete Your Forms Before Your Session',
        template: 'form-reminder',
        data: {
          clientName: session.client.name,
          therapistName: session.psychologist.name,
          sessionDate: session.scheduledDate,
          missingForms,
          formLinks: {
            agreement: `${process.env.CLIENT_URL}/forms/agreement`,
            intake: `${process.env.CLIENT_URL}/forms/intake/${session._id}`
          }
        }
      });
      
      session.formReminderSent = true;
      session.formReminderSentAt = new Date();
      await session.save();
      
      console.log(`📧 Form reminder sent for session ${session._id}`);
      return { sent: true, sessionId: session._id, missingForms };
    } catch (error) {
      console.error('Failed to send form reminder:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Run reminder job for all pending sessions
   */
  async runReminderJob() {
    console.log('🔄 Running form completion reminder job...');
    
    const sessions = await this.findSessionsNeedingReminders();
    const results = { total: sessions.length, sent: 0, skipped: 0, errors: [] };
    
    for (const session of sessions) {
      const result = await this.sendFormReminder(session);
      if (result.sent) results.sent++;
      else results.skipped++;
      if (result.error) results.errors.push({ sessionId: session._id, error: result.error });
    }
    
    console.log(`✅ Form reminder job complete:`, results);
    return results;
  }

  /**
   * Get form completion dashboard data
   */
  async getDashboardData() {
    await this.initialize();
    
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcomingSessions = await this.Session.find({
      scheduledDate: { $gte: now, $lte: next24Hours },
      status: { $in: [SESSION_STATES.PAID, SESSION_STATES.FORMS_REQUIRED, SESSION_STATES.READY] }
    }).populate('client', 'name email');
    
    const stats = {
      total: upcomingSessions.length,
      formsComplete: 0,
      formsIncomplete: 0,
      sessions: []
    };
    
    for (const session of upcomingSessions) {
      const completion = await this.checkFormCompletion(session._id);
      if (completion.allFormsComplete) stats.formsComplete++;
      else stats.formsIncomplete++;
      
      stats.sessions.push({
        sessionId: session._id,
        clientName: session.client.name,
        scheduledDate: session.scheduledDate,
        ...completion
      });
    }
    
    return stats;
  }
}

const formCompletionTrackerService = new FormCompletionTrackerService();
module.exports = { FormCompletionTrackerService, formCompletionTrackerService, FORM_TRACKING_CONFIG };
