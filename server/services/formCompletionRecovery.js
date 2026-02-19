/**
 * Form Completion Recovery Service
 * 
 * Implements recovery mechanisms for form completion failures:
 * - Urgent reminder system (1 hour before session)
 * - Verbal consent fallback for incomplete forms
 * - Form data corruption detection via checksums
 * - Form re-submission workflow for critical fields
 * 
 * Requirements: Form Completion Failures from Flow Integrity Contract
 */

const crypto = require('crypto');
const { SESSION_STATES } = require('../constants/sessionStates');

const FORM_RECOVERY_CONFIG = {
  URGENT_REMINDER_THRESHOLD_MINUTES: 60,
  VERBAL_CONSENT_THRESHOLD_MINUTES: 30,
  CRITICAL_FIELDS: ['emergencyContact', 'currentMedications', 'mentalHealthHistory', 'suicidalIdeation', 'substanceUse'],
  MAX_RETRY_ATTEMPTS: 3
};

class FormCompletionRecoveryService {
  constructor() {
    this.Session = null;
    this.IntakeForm = null;
    this.notificationService = null;
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    if (!this.IntakeForm) {
      try { this.IntakeForm = require('../models/IntakeForm'); } catch (e) { console.warn('IntakeForm model not available'); }
    }
    if (!this.notificationService) {
      try { this.notificationService = require('../utils/notificationService'); } catch (e) { console.warn('Notification service not available'); }
    }
  }

  async detectIncompleteFormSessions() {
    await this.initialize();
    const now = new Date();
    const urgentThreshold = new Date(now.getTime() + (FORM_RECOVERY_CONFIG.URGENT_REMINDER_THRESHOLD_MINUTES * 60 * 1000));
    
    const sessions = await this.Session.find({
      status: { $in: [SESSION_STATES.PAID, SESSION_STATES.FORMS_REQUIRED] },
      scheduledDate: { $lte: urgentThreshold, $gt: now },
      $or: [{ intakeFormCompleted: { $ne: true } }, { agreementCompleted: { $ne: true } }]
    }).populate('client psychologist', 'name email phone');

    return sessions.map(session => {
      const minutesUntilSession = Math.floor((session.scheduledDate - now) / (60 * 1000));
      return {
        session,
        minutesUntilSession,
        missingForms: this.getMissingForms(session),
        urgencyLevel: this.getUrgencyLevel(minutesUntilSession),
        recommendedAction: this.getFormRecoveryAction(minutesUntilSession, session)
      };
    });
  }


  getMissingForms(session) {
    const missing = [];
    if (!session.agreementCompleted) missing.push({ type: 'confidentiality_agreement', name: 'Confidentiality Agreement', required: true });
    if (!session.intakeFormCompleted) missing.push({ type: 'intake_form', name: 'Intake Form', required: true });
    return missing;
  }

  getUrgencyLevel(minutesUntilSession) {
    if (minutesUntilSession <= 30) return 'critical';
    if (minutesUntilSession <= 60) return 'urgent';
    if (minutesUntilSession <= 120) return 'high';
    return 'normal';
  }

  getFormRecoveryAction(minutesUntilSession, session) {
    if (minutesUntilSession <= FORM_RECOVERY_CONFIG.VERBAL_CONSENT_THRESHOLD_MINUTES) {
      return { action: 'VERBAL_CONSENT_FALLBACK', message: 'Session starting soon. Therapist will obtain verbal consent.', notifyTherapist: true };
    }
    if (minutesUntilSession <= FORM_RECOVERY_CONFIG.URGENT_REMINDER_THRESHOLD_MINUTES) {
      return { action: 'SEND_URGENT_REMINDER', message: 'Urgent: Please complete forms before your session.', sendSMS: true, sendEmail: true };
    }
    return { action: 'SEND_REMINDER', message: 'Please complete your forms before your upcoming session.', sendEmail: true };
  }

  async sendUrgentFormReminder(session, missingForms) {
    await this.initialize();
    const client = session.client;
    const formLinks = missingForms.map(f => ({ name: f.name, url: `${process.env.CLIENT_URL}/forms/${f.type}/${session._id}` }));
    
    try {
      if (this.notificationService) {
        await this.notificationService.sendEmail({
          to: client.email,
          subject: '⚠️ URGENT: Complete Your Forms Before Your Session',
          template: 'urgent-form-reminder',
          data: { clientName: client.name, sessionDate: session.scheduledDate, therapistName: session.psychologist?.name, formLinks, minutesRemaining: Math.floor((session.scheduledDate - new Date()) / (60 * 1000)) }
        });
        if (client.phone) {
          await this.notificationService.sendSMS({ to: client.phone, message: `URGENT: Your therapy session starts soon. Please complete your required forms: ${formLinks.map(f => f.url).join(' ')}` });
        }
      }
      session.urgentReminderSentAt = new Date();
      await session.save();
      console.log(`📧 Urgent form reminder sent for session ${session._id}`);
      return { success: true, sessionId: session._id, reminderType: 'urgent' };
    } catch (error) {
      console.error('Failed to send urgent form reminder:', error);
      return { success: false, error: error.message };
    }
  }


  async enableVerbalConsentFallback(session, therapistId) {
    await this.initialize();
    session.verbalConsentEnabled = true;
    session.verbalConsentEnabledAt = new Date();
    session.verbalConsentEnabledBy = therapistId;
    session.status = SESSION_STATES.READY;
    await session.save();
    
    if (this.notificationService) {
      await this.notificationService.sendEmail({
        to: session.psychologist.email,
        subject: 'Verbal Consent Required for Upcoming Session',
        template: 'verbal-consent-required',
        data: { therapistName: session.psychologist.name, clientName: session.client.name, sessionDate: session.scheduledDate, missingForms: this.getMissingForms(session) }
      });
    }
    console.log(`✅ Verbal consent fallback enabled for session ${session._id}`);
    return { success: true, sessionId: session._id, verbalConsentEnabled: true };
  }

  generateChecksum(data) {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async validateFormIntegrity(formId) {
    await this.initialize();
    if (!this.IntakeForm) return { valid: true, message: 'IntakeForm model not available, skipping validation' };
    
    const form = await this.IntakeForm.findById(formId);
    if (!form) return { valid: false, error: 'Form not found', corrupted: false };
    
    const currentChecksum = this.generateChecksum(form.toObject());
    if (form.dataChecksum && form.dataChecksum !== currentChecksum) {
      console.error(`🔴 Form data corruption detected for form ${formId}`);
      return { valid: false, error: 'Data integrity check failed', corrupted: true, formId, corruptedFields: await this.detectCorruptedFields(form) };
    }
    return { valid: true, formId, checksum: currentChecksum };
  }

  async detectCorruptedFields(form) {
    const corrupted = [];
    for (const field of FORM_RECOVERY_CONFIG.CRITICAL_FIELDS) {
      if (form[field] !== undefined) {
        try {
          const decrypted = form.getDecryptedData ? form.getDecryptedData() : form;
          if (!decrypted[field] && form[field]) corrupted.push({ field, reason: 'Decryption failed or data mismatch' });
        } catch (e) {
          corrupted.push({ field, reason: 'Field access error', error: e.message });
        }
      }
    }
    return corrupted;
  }


  async initiateFormResubmission(formId, corruptedFields) {
    await this.initialize();
    if (!this.IntakeForm) return { success: false, error: 'IntakeForm model not available' };
    
    const form = await this.IntakeForm.findById(formId).populate('client', 'name email');
    if (!form) return { success: false, error: 'Form not found' };
    
    form.resubmissionRequired = true;
    form.resubmissionFields = corruptedFields.map(f => f.field);
    form.resubmissionRequestedAt = new Date();
    await form.save();
    
    if (this.notificationService && form.client) {
      await this.notificationService.sendEmail({
        to: form.client.email,
        subject: 'Please Verify Your Information - Smiling Steps',
        template: 'form-resubmission-request',
        data: { clientName: form.client.name, fieldsToVerify: corruptedFields.map(f => f.field), resubmissionUrl: `${process.env.CLIENT_URL}/forms/verify/${formId}` }
      });
    }
    console.log(`📝 Form resubmission initiated for form ${formId}`);
    return { success: true, formId, fieldsRequiringResubmission: corruptedFields.map(f => f.field) };
  }

  async runFormCompletionRecoveryJob() {
    console.log('🔄 Running form completion recovery job...');
    const results = { detected: 0, reminders: 0, verbalConsent: 0, errors: [] };
    
    try {
      const incompleteSessions = await this.detectIncompleteFormSessions();
      results.detected = incompleteSessions.length;
      
      for (const { session, minutesUntilSession, missingForms, recommendedAction } of incompleteSessions) {
        try {
          if (recommendedAction.action === 'VERBAL_CONSENT_FALLBACK') {
            await this.enableVerbalConsentFallback(session, 'system');
            results.verbalConsent++;
          } else if (recommendedAction.action === 'SEND_URGENT_REMINDER' && !session.urgentReminderSentAt) {
            await this.sendUrgentFormReminder(session, missingForms);
            results.reminders++;
          }
        } catch (error) {
          results.errors.push({ sessionId: session._id, error: error.message });
        }
      }
      console.log(`✅ Form completion recovery job complete:`, results);
      return results;
    } catch (error) {
      console.error('❌ Form completion recovery job failed:', error);
      throw error;
    }
  }
}

const formCompletionRecoveryService = new FormCompletionRecoveryService();
module.exports = { FormCompletionRecoveryService, formCompletionRecoveryService, FORM_RECOVERY_CONFIG };
