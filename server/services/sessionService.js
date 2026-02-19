/**
 * Session Service - Centralized Write Paths
 * 
 * This service centralizes all session state mutations to enforce
 * Flow Integrity rules. All session state changes MUST go through
 * these functions.
 * 
 * CRITICAL REFINEMENT #2: Lock down write paths early
 */

const { updateSessionStatusAtomic } = require('../utils/atomicUpdates');
const { enforceStateAuthority } = require('../constants/stateAuthority');
const { SESSION_STATES } = require('../constants/sessionStates');
const { VIDEO_STATES } = require('../constants/videoStates');

/**
 * Session Service Class
 * 
 * Centralizes all session state mutations with authority enforcement
 */
class SessionService {
  
  /**
   * Update Session State (Centralized Write Path)
   * 
   * This is the ONLY function that should change session states.
   * All other code must use this function.
   * 
   * CRITICAL: Authority enforcement is AUTOMATIC and NON-OPTIONAL
   * 
   * @param {Object} session - Session document
   * @param {string} newSessionState - New session state
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Updated session
   */
  async updateState(session, newSessionState, context = {}) {
    // AUTOMATIC AUTHORITY ENFORCEMENT - Cannot be bypassed
    enforceStateAuthority('session', 'session', context);
    
    const { reason, metadata = {}, userId = null, actor = 'session' } = context;
    
    // AUTOMATIC ACTOR VALIDATION - Ensure only session service can call this
    if (actor !== 'session') {
      throw new Error(`AUTHORITY VIOLATION: Only session service can update session states. Actor: ${actor}`);
    }
    
    console.log(`📅 SessionService.updateState: ${session.status} → ${newSessionState}`, {
      sessionId: session._id,
      reason,
      userId
    });
    
    // Use atomic update to ensure consistency
    return await updateSessionStatusAtomic(session, newSessionState, reason, {
      ...metadata,
      userId
    });
  }
  
  /**
   * Approve Session (Centralized Write Path)
   * 
   * Approves a session request and moves to payment pending.
   * 
   * @param {Object} session - Session document
   * @param {string} therapistId - Approving therapist ID
   * @param {Object} approvalData - Approval data
   * @returns {Promise<Object>} Updated session
   */
  async approveSession(session, therapistId, approvalData = {}) {
    console.log('📅 SessionService.approveSession:', {
      sessionId: session._id,
      therapistId
    });
    
    return await this.updateState(session, SESSION_STATES.APPROVED, {
      reason: 'Session approved by therapist',
      userId: therapistId,
      metadata: {
        approvedBy: therapistId,
        approvedAt: new Date(),
        ...approvalData
      }
    });
  }
  
  /**
   * Mark Session Ready (Centralized Write Path)
   * 
   * Marks session as ready for video call after payment and forms.
   * 
   * @param {Object} session - Session document
   * @param {Object} readyData - Ready state data
   * @returns {Promise<Object>} Updated session
   */
  async markSessionReady(session, readyData = {}) {
    console.log('📅 SessionService.markSessionReady:', {
      sessionId: session._id
    });
    
    return await this.updateState(session, SESSION_STATES.READY, {
      reason: 'Session ready for video call',
      metadata: {
        readyAt: new Date(),
        ...readyData
      }
    });
  }
  
  /**
   * Start Session (Centralized Write Path)
   * 
   * Starts a session and enables video call access.
   * This is the authoritative source for video call permissions.
   * 
   * @param {Object} session - Session document
   * @param {string} userId - User starting the session
   * @returns {Promise<Object>} Updated session with video access
   */
  async startSession(session, userId) {
    console.log('📅 SessionService.startSession:', {
      sessionId: session._id,
      userId
    });
    
    // Update session state atomically
    const updatedSession = await this.updateState(session, SESSION_STATES.IN_PROGRESS, {
      reason: 'Session started',
      userId,
      metadata: {
        startedAt: new Date(),
        startedBy: userId
      }
    });
    
    // As session authority, also update video state to allow joining
    updatedSession.videoCallStatus = VIDEO_STATES.WAITING_FOR_PARTICIPANTS;
    updatedSession.videoCallUpdatedAt = new Date();
    await updatedSession.save();
    
    console.log('✅ Session started with video access granted by authoritative service');
    
    return updatedSession;
  }
  
  /**
   * Complete Session (Centralized Write Path)
   * 
   * Completes a session and ends video call access.
   * 
   * @param {Object} session - Session document
   * @param {Object} completionData - Completion data
   * @returns {Promise<Object>} Updated session
   */
  async completeSession(session, completionData = {}) {
    const { duration, notes, userId } = completionData;
    
    console.log('📅 SessionService.completeSession:', {
      sessionId: session._id,
      duration,
      userId
    });
    
    // Update session state atomically
    const updatedSession = await this.updateState(session, SESSION_STATES.COMPLETED, {
      reason: 'Session completed',
      userId,
      metadata: {
        completedAt: new Date(),
        duration,
        notes,
        completedBy: userId
      }
    });
    
    // As session authority, also end video call
    updatedSession.videoCallStatus = VIDEO_STATES.ENDED;
    updatedSession.videoCallEndedAt = new Date();
    await updatedSession.save();
    
    console.log('✅ Session completed with video call ended by authoritative service');
    
    return updatedSession;
  }
  
  /**
   * Cancel Session (Centralized Write Path)
   * 
   * Cancels a session at any stage.
   * 
   * @param {Object} session - Session document
   * @param {string} reason - Cancellation reason
   * @param {string} userId - User who cancelled
   * @returns {Promise<Object>} Updated session
   */
  async cancelSession(session, reason, userId = null) {
    console.log('📅 SessionService.cancelSession:', {
      sessionId: session._id,
      reason,
      userId
    });
    
    const updatedSession = await this.updateState(session, SESSION_STATES.CANCELLED, {
      reason,
      userId,
      metadata: {
        cancelledAt: new Date(),
        cancelledBy: userId
      }
    });
    
    // As session authority, also end any video call
    if (updatedSession.videoCallStatus && updatedSession.videoCallStatus !== VIDEO_STATES.ENDED) {
      updatedSession.videoCallStatus = VIDEO_STATES.ENDED;
      updatedSession.videoCallEndedAt = new Date();
      await updatedSession.save();
    }
    
    return updatedSession;
  }
  
  /**
   * Mark No Show (Centralized Write Path)
   * 
   * Marks session as no-show for client or therapist.
   * 
   * @param {Object} session - Session document
   * @param {string} noShowType - 'client' or 'therapist'
   * @param {string} detectedBy - Who detected the no-show
   * @returns {Promise<Object>} Updated session
   */
  async markNoShow(session, noShowType, detectedBy = 'system') {
    const newState = noShowType === 'client' 
      ? SESSION_STATES.NO_SHOW_CLIENT 
      : SESSION_STATES.NO_SHOW_THERAPIST;
    
    console.log('📅 SessionService.markNoShow:', {
      sessionId: session._id,
      noShowType,
      detectedBy
    });
    
    const updatedSession = await this.updateState(session, newState, {
      reason: `No show detected: ${noShowType}`,
      metadata: {
        noShowDetectedAt: new Date(),
        noShowDetectedBy: detectedBy,
        noShowType
      }
    });
    
    // End video call if active
    if (updatedSession.videoCallStatus && updatedSession.videoCallStatus !== VIDEO_STATES.ENDED) {
      updatedSession.videoCallStatus = VIDEO_STATES.ENDED;
      updatedSession.videoCallEndedAt = new Date();
      await updatedSession.save();
    }
    
    return updatedSession;
  }
  
  /**
   * Update Forms Status (Centralized Write Path)
   * 
   * Updates form completion status and advances session if ready.
   * 
   * @param {Object} session - Session document
   * @param {boolean} formsComplete - Whether forms are complete
   * @param {string} userId - User who completed forms
   * @returns {Promise<Object>} Updated session
   */
  async updateFormsStatus(session, formsComplete, userId) {
    console.log('📅 SessionService.updateFormsStatus:', {
      sessionId: session._id,
      formsComplete,
      userId
    });
    
    // Update forms status
    session.formsCompleted = formsComplete;
    session.formsCompletedAt = formsComplete ? new Date() : null;
    session.formsCompletedBy = formsComplete ? userId : null;
    
    // If forms are complete and session is in forms_required state, advance to ready
    if (formsComplete && session.status === SESSION_STATES.FORMS_REQUIRED) {
      return await this.markSessionReady(session, {
        formsCompletedBy: userId
      });
    }
    
    await session.save();
    return session;
  }
}

// Export singleton instance
const sessionService = new SessionService();

module.exports = {
  SessionService,
  sessionService
};