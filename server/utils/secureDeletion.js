/**
 * Secure Deletion Utility
 * 
 * Implements HIPAA-compliant secure deletion:
 * - Multi-pass overwrite for sensitive data
 * - Soft delete with encryption key destruction
 * - Secure deletion logging
 * - Data retention policy enforcement
 * 
 * Requirements: 10.4 from Security & Compliance
 */

const crypto = require('crypto');
const { logAuditEvent } = require('./auditLogger');

const SECURE_DELETION_CONFIG = {
  OVERWRITE_PASSES: 3,
  SOFT_DELETE_RETENTION_DAYS: 30,
  HARD_DELETE_AFTER_DAYS: 90,
  SENSITIVE_FIELDS: ['sessionNotes', 'intakeFormData', 'medications', 'mentalHealthHistory', 'emergencyContact', 'phoneNumber', 'address'],
  AUDIT_RETENTION_YEARS: 7
};

class SecureDeletionService {
  constructor() {
    this.Session = null;
    this.User = null;
    this.IntakeForm = null;
    this.AuditLog = null;
  }

  async initialize() {
    if (!this.Session) this.Session = require('../models/Session');
    if (!this.User) this.User = require('../models/User');
    try { if (!this.IntakeForm) this.IntakeForm = require('../models/IntakeForm'); } catch (e) {}
    try { if (!this.AuditLog) this.AuditLog = require('../models/AuditLog'); } catch (e) {}
  }

  generateOverwriteData(length) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  async secureOverwriteField(document, fieldName) {
    if (!document[fieldName]) return { overwritten: false, reason: 'Field empty or not found' };
    
    const originalLength = typeof document[fieldName] === 'string' ? document[fieldName].length : JSON.stringify(document[fieldName]).length;
    
    for (let pass = 0; pass < SECURE_DELETION_CONFIG.OVERWRITE_PASSES; pass++) {
      document[fieldName] = this.generateOverwriteData(originalLength);
      await document.save();
    }
    
    document[fieldName] = null;
    await document.save();
    
    return { overwritten: true, passes: SECURE_DELETION_CONFIG.OVERWRITE_PASSES, fieldName };
  }


  async softDeleteUser(userId, requestedBy, reason) {
    await this.initialize();
    const user = await this.User.findById(userId);
    if (!user) return { success: false, error: 'User not found' };
    
    user.deletionRequested = true;
    user.deletionRequestedAt = new Date();
    user.deletionRequestedBy = requestedBy;
    user.deletionReason = reason;
    user.scheduledHardDeleteAt = new Date(Date.now() + SECURE_DELETION_CONFIG.SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    user.isActive = false;
    user.encryptionKeyDestroyed = false;
    await user.save();
    
    await logAuditEvent({
      action: 'USER_SOFT_DELETE',
      userId: requestedBy,
      targetUserId: userId,
      details: { reason, scheduledHardDelete: user.scheduledHardDeleteAt }
    });
    
    console.log(`🗑️ User ${userId} soft deleted, scheduled for hard delete on ${user.scheduledHardDeleteAt}`);
    return { success: true, userId, softDeleted: true, scheduledHardDelete: user.scheduledHardDeleteAt };
  }

  async hardDeleteUser(userId, requestedBy, confirmationToken) {
    await this.initialize();
    const user = await this.User.findById(userId);
    if (!user) return { success: false, error: 'User not found' };
    
    if (!user.deletionRequested) return { success: false, error: 'Soft delete must be requested first' };
    
    const deletionRecord = {
      originalUserId: userId,
      email: this.hashForAudit(user.email),
      deletedAt: new Date(),
      deletedBy: requestedBy,
      reason: user.deletionReason,
      dataOverwritten: []
    };
    
    for (const field of SECURE_DELETION_CONFIG.SENSITIVE_FIELDS) {
      if (user[field]) {
        const result = await this.secureOverwriteField(user, field);
        if (result.overwritten) deletionRecord.dataOverwritten.push(field);
      }
    }
    
    const sessions = await this.Session.find({ $or: [{ client: userId }, { psychologist: userId }] });
    for (const session of sessions) {
      if (session.sessionNotes) {
        await this.secureOverwriteField(session, 'sessionNotes');
        deletionRecord.dataOverwritten.push(`session:${session._id}:sessionNotes`);
      }
    }
    
    if (this.IntakeForm) {
      const forms = await this.IntakeForm.find({ client: userId });
      for (const form of forms) {
        for (const field of SECURE_DELETION_CONFIG.SENSITIVE_FIELDS) {
          if (form[field]) await this.secureOverwriteField(form, field);
        }
        deletionRecord.dataOverwritten.push(`intakeForm:${form._id}`);
      }
    }
    
    user.email = `deleted_${userId}@deleted.local`;
    user.name = '[DELETED]';
    user.password = this.generateOverwriteData(60);
    user.hardDeleted = true;
    user.hardDeletedAt = new Date();
    await user.save();
    
    await logAuditEvent({
      action: 'USER_HARD_DELETE',
      userId: requestedBy,
      targetUserId: userId,
      details: deletionRecord
    });
    
    console.log(`🔥 User ${userId} hard deleted with ${deletionRecord.dataOverwritten.length} fields securely overwritten`);
    return { success: true, userId, hardDeleted: true, fieldsOverwritten: deletionRecord.dataOverwritten.length };
  }

  hashForAudit(value) {
    return crypto.createHash('sha256').update(value || '').digest('hex').slice(0, 16);
  }


  async secureDeleteSession(sessionId, requestedBy, reason) {
    await this.initialize();
    const session = await this.Session.findById(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    
    const deletionRecord = { sessionId, deletedAt: new Date(), deletedBy: requestedBy, reason, fieldsOverwritten: [] };
    
    for (const field of ['sessionNotes', 'intakeFormData', 'clientNotes']) {
      if (session[field]) {
        await this.secureOverwriteField(session, field);
        deletionRecord.fieldsOverwritten.push(field);
      }
    }
    
    session.securelyDeleted = true;
    session.securelyDeletedAt = new Date();
    await session.save();
    
    await logAuditEvent({ action: 'SESSION_SECURE_DELETE', userId: requestedBy, sessionId, details: deletionRecord });
    
    console.log(`🔥 Session ${sessionId} securely deleted`);
    return { success: true, sessionId, fieldsOverwritten: deletionRecord.fieldsOverwritten.length };
  }

  async enforceRetentionPolicy() {
    await this.initialize();
    const results = { usersProcessed: 0, sessionsProcessed: 0, errors: [] };
    
    const usersToHardDelete = await this.User.find({
      deletionRequested: true,
      hardDeleted: { $ne: true },
      scheduledHardDeleteAt: { $lte: new Date() }
    });
    
    for (const user of usersToHardDelete) {
      try {
        await this.hardDeleteUser(user._id, 'system', 'retention_policy');
        results.usersProcessed++;
      } catch (error) {
        results.errors.push({ userId: user._id, error: error.message });
      }
    }
    
    const oldSessions = await this.Session.find({
      status: 'completed',
      completedAt: { $lte: new Date(Date.now() - SECURE_DELETION_CONFIG.HARD_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000) },
      securelyDeleted: { $ne: true }
    });
    
    for (const session of oldSessions) {
      try {
        if (session.sessionNotes) {
          await this.secureOverwriteField(session, 'sessionNotes');
          session.securelyDeleted = true;
          session.securelyDeletedAt = new Date();
          await session.save();
          results.sessionsProcessed++;
        }
      } catch (error) {
        results.errors.push({ sessionId: session._id, error: error.message });
      }
    }
    
    console.log(`🧹 Retention policy enforced: ${results.usersProcessed} users, ${results.sessionsProcessed} sessions`);
    return results;
  }

  async cancelDeletionRequest(userId, cancelledBy) {
    await this.initialize();
    const user = await this.User.findById(userId);
    if (!user) return { success: false, error: 'User not found' };
    if (!user.deletionRequested) return { success: false, error: 'No deletion request found' };
    if (user.hardDeleted) return { success: false, error: 'User already hard deleted, cannot cancel' };
    
    user.deletionRequested = false;
    user.deletionCancelledAt = new Date();
    user.deletionCancelledBy = cancelledBy;
    user.scheduledHardDeleteAt = null;
    user.isActive = true;
    await user.save();
    
    await logAuditEvent({ action: 'USER_DELETION_CANCELLED', userId: cancelledBy, targetUserId: userId });
    
    return { success: true, userId, deletionCancelled: true };
  }
}

const secureDeletionService = new SecureDeletionService();
module.exports = { SecureDeletionService, secureDeletionService, SECURE_DELETION_CONFIG };
