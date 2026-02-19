/**
 * Stuck State Detector
 * 
 * Implements the universal "stuck" rule: any state lasting >2× expected duration
 * is considered stuck and requires intervention.
 * 
 * CRITICAL REFINEMENT #4: Universal "stuck" rule
 */

const { PAYMENT_STATES } = require('../constants/paymentStates');
const { SESSION_STATES } = require('../constants/sessionStates');
const { VIDEO_STATES } = require('../constants/videoStates');

/**
 * Stuck State Resolution Policies
 * 
 * Defines what action to take when each type of state is stuck.
 * This prevents "we detected it but didn't know what to do".
 */
const STUCK_RESOLUTION_POLICIES = {
  payment: {
    [PAYMENT_STATES.PENDING]: 'alert_admin',
    [PAYMENT_STATES.INITIATED]: 'alert_admin_urgent', // M-Pesa callback missing
    [PAYMENT_STATES.FAILED]: 'auto_cleanup'
  },
  session: {
    [SESSION_STATES.REQUESTED]: 'alert_therapist',
    [SESSION_STATES.APPROVED]: 'alert_client_payment',
    [SESSION_STATES.PAYMENT_PENDING]: 'alert_admin_urgent',
    [SESSION_STATES.PAID]: 'auto_advance_forms',
    [SESSION_STATES.FORMS_REQUIRED]: 'alert_client_forms',
    [SESSION_STATES.READY]: 'alert_both_participants',
    [SESSION_STATES.IN_PROGRESS]: 'auto_end_session' // Likely forgotten
  },
  video: {
    [VIDEO_STATES.WAITING_FOR_PARTICIPANTS]: 'alert_both_participants',
    [VIDEO_STATES.ACTIVE]: 'auto_end_call', // Likely forgotten
    [VIDEO_STATES.FAILED]: 'auto_retry'
  }
};
const EXPECTED_DURATIONS = {
  // Payment State Durations
  payment: {
    [PAYMENT_STATES.PENDING]: 60,        // 1 hour to initiate payment
    [PAYMENT_STATES.INITIATED]: 5,       // 5 minutes for M-Pesa callback
    [PAYMENT_STATES.CONFIRMED]: Infinity, // Terminal state
    [PAYMENT_STATES.FAILED]: 1440,       // 24 hours before cleanup
    [PAYMENT_STATES.REFUNDED]: Infinity, // Terminal state
    [PAYMENT_STATES.CANCELLED]: Infinity // Terminal state
  },
  
  // Session State Durations
  session: {
    [SESSION_STATES.REQUESTED]: 1440,           // 24 hours for therapist response
    [SESSION_STATES.APPROVED]: 60,              // 1 hour to initiate payment
    [SESSION_STATES.PAYMENT_PENDING]: 10,       // 10 minutes for payment completion
    [SESSION_STATES.PAID]: 30,                  // 30 minutes to require forms or mark ready
    [SESSION_STATES.FORMS_REQUIRED]: 1440,      // 24 hours to complete forms
    [SESSION_STATES.READY]: 60,                 // 1 hour before session starts
    [SESSION_STATES.IN_PROGRESS]: 90,           // 90 minutes max session duration
    [SESSION_STATES.COMPLETED]: Infinity,       // Terminal state
    [SESSION_STATES.CANCELLED]: Infinity,       // Terminal state
    [SESSION_STATES.NO_SHOW_CLIENT]: Infinity,  // Terminal state
    [SESSION_STATES.NO_SHOW_THERAPIST]: Infinity // Terminal state
  },
  
  // Video Call State Durations
  video: {
    [VIDEO_STATES.NOT_STARTED]: Infinity,              // Waiting for session to be ready
    [VIDEO_STATES.WAITING_FOR_PARTICIPANTS]: 15,       // 15 minutes for participants to join
    [VIDEO_STATES.ACTIVE]: 90,                         // 90 minutes max call duration
    [VIDEO_STATES.ENDED]: Infinity,                    // Terminal state
    [VIDEO_STATES.FAILED]: 5                           // 5 minutes before retry
  }
};

/**
 * Stuck State Detector Class
 * 
 * Detects states that have exceeded 2× their expected duration
 */
class StuckStateDetector {
  
  /**
   * Check if a state is stuck
   * 
   * @param {string} entityType - Type of entity ('payment', 'session', 'video')
   * @param {string} currentState - Current state
   * @param {Date} stateEnteredAt - When the state was entered
   * @returns {Object} Stuck detection result WITH resolution policy
   */
  isStateStuck(entityType, currentState, stateEnteredAt) {
    const expectedDuration = EXPECTED_DURATIONS[entityType]?.[currentState];
    
    if (!expectedDuration || expectedDuration === Infinity) {
      return {
        isStuck: false,
        reason: 'Terminal state or no duration limit',
        recommendedAction: 'none'
      };
    }
    
    const now = new Date();
    const stateAge = Math.floor((now - stateEnteredAt) / (1000 * 60)); // minutes
    const stuckThreshold = expectedDuration * 2; // 2× expected duration
    
    const isStuck = stateAge > stuckThreshold;
    
    // Get resolution policy
    const recommendedAction = isStuck 
      ? STUCK_RESOLUTION_POLICIES[entityType]?.[currentState] || 'alert_admin'
      : 'none';
    
    return {
      isStuck,
      stateAge,
      expectedDuration,
      stuckThreshold,
      recommendedAction, // CRITICAL: Always include resolution policy
      reason: isStuck 
        ? `State has lasted ${stateAge} minutes, exceeding 2× expected duration of ${expectedDuration} minutes`
        : `State age ${stateAge} minutes is within acceptable range`
    };
  }
  
  /**
   * Check if a session is stuck in any state
   * 
   * @param {Object} session - Session document
   * @returns {Object} Comprehensive stuck analysis
   */
  analyzeSessionStuckStates(session) {
    const results = {
      isAnyStateStuck: false,
      stuckStates: [],
      analysis: {}
    };
    
    // Check payment state
    if (session.paymentStatus && session.paymentUpdatedAt) {
      const paymentResult = this.isStateStuck(
        'payment', 
        session.paymentStatus, 
        session.paymentUpdatedAt
      );
      
      results.analysis.payment = paymentResult;
      
      if (paymentResult.isStuck) {
        results.isAnyStateStuck = true;
        results.stuckStates.push({
          entityType: 'payment',
          state: session.paymentStatus,
          ...paymentResult
        });
      }
    }
    
    // Check session state
    if (session.status && session.statusUpdatedAt) {
      const sessionResult = this.isStateStuck(
        'session',
        session.status,
        session.statusUpdatedAt
      );
      
      results.analysis.session = sessionResult;
      
      if (sessionResult.isStuck) {
        results.isAnyStateStuck = true;
        results.stuckStates.push({
          entityType: 'session',
          state: session.status,
          ...sessionResult
        });
      }
    }
    
    // Check video call state
    if (session.videoCallStatus && session.videoCallUpdatedAt) {
      const videoResult = this.isStateStuck(
        'video',
        session.videoCallStatus,
        session.videoCallUpdatedAt
      );
      
      results.analysis.video = videoResult;
      
      if (videoResult.isStuck) {
        results.isAnyStateStuck = true;
        results.stuckStates.push({
          entityType: 'video',
          state: session.videoCallStatus,
          ...videoResult
        });
      }
    }
    
    return results;
  }
  
  /**
   * Find all stuck sessions in the database
   * 
   * @param {number} limit - Maximum number of sessions to check
   * @returns {Promise<Array>} Array of stuck sessions
   */
  async findStuckSessions(limit = 100) {
    try {
      const Session = require('../models/Session');
      
      // Get active sessions (not in terminal states)
      const activeSessions = await Session.find({
        status: { 
          $nin: [
            SESSION_STATES.COMPLETED,
            SESSION_STATES.CANCELLED,
            SESSION_STATES.NO_SHOW_CLIENT,
            SESSION_STATES.NO_SHOW_THERAPIST
          ]
        }
      })
      .limit(limit)
      .sort({ statusUpdatedAt: 1 }); // Oldest first
      
      const stuckSessions = [];
      
      for (const session of activeSessions) {
        const analysis = this.analyzeSessionStuckStates(session);
        
        if (analysis.isAnyStateStuck) {
          stuckSessions.push({
            sessionId: session._id,
            clientId: session.clientId,
            therapistId: session.therapistId,
            ...analysis
          });
        }
      }
      
      return stuckSessions;
      
    } catch (error) {
      console.error('❌ Error finding stuck sessions:', error);
      throw error;
    }
  }
  
  /**
   * Generate stuck state alerts
   * 
   * @param {Array} stuckSessions - Array of stuck sessions
   * @returns {Array} Array of alert objects
   */
  generateStuckStateAlerts(stuckSessions) {
    const alerts = [];
    
    for (const stuckSession of stuckSessions) {
      for (const stuckState of stuckSession.stuckStates) {
        alerts.push({
          type: 'STUCK_STATE_DETECTED',
          severity: this._getAlertSeverity(stuckState),
          sessionId: stuckSession.sessionId,
          entityType: stuckState.entityType,
          state: stuckState.state,
          stateAge: stuckState.stateAge,
          expectedDuration: stuckState.expectedDuration,
          message: `${stuckState.entityType} state "${stuckState.state}" has been stuck for ${stuckState.stateAge} minutes`,
          recommendedAction: this._getRecommendedAction(stuckState),
          timestamp: new Date()
        });
      }
    }
    
    return alerts;
  }
  
  /**
   * Get alert severity based on how stuck the state is
   */
  _getAlertSeverity(stuckState) {
    const overageRatio = stuckState.stateAge / stuckState.stuckThreshold;
    
    if (overageRatio > 5) return 'CRITICAL';
    if (overageRatio > 3) return 'HIGH';
    if (overageRatio > 2) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Get recommended action for stuck state
   */
  _getRecommendedAction(stuckState) {
    const { entityType, state } = stuckState;
    
    const actionMap = {
      payment: {
        [PAYMENT_STATES.PENDING]: 'Contact client to initiate payment',
        [PAYMENT_STATES.INITIATED]: 'Check M-Pesa callback status, may need manual verification',
        [PAYMENT_STATES.FAILED]: 'Clean up failed payment record'
      },
      session: {
        [SESSION_STATES.REQUESTED]: 'Notify therapist of pending session request',
        [SESSION_STATES.APPROVED]: 'Contact client to complete payment',
        [SESSION_STATES.PAYMENT_PENDING]: 'Check payment status, may need manual intervention',
        [SESSION_STATES.PAID]: 'Determine if forms are required or mark session ready',
        [SESSION_STATES.FORMS_REQUIRED]: 'Contact client to complete intake forms',
        [SESSION_STATES.READY]: 'Contact participants to start session',
        [SESSION_STATES.IN_PROGRESS]: 'Check if session is actually ongoing, may need manual completion'
      },
      video: {
        [VIDEO_STATES.WAITING_FOR_PARTICIPANTS]: 'Contact participants to join call',
        [VIDEO_STATES.ACTIVE]: 'Check if call is actually active, may need manual end',
        [VIDEO_STATES.FAILED]: 'Investigate technical issues and provide retry option'
      }
    };
    
    return actionMap[entityType]?.[state] || 'Manual investigation required';
  }
}

// Export singleton instance
const stuckStateDetector = new StuckStateDetector();

module.exports = {
  StuckStateDetector,
  stuckStateDetector,
  EXPECTED_DURATIONS,
  STUCK_RESOLUTION_POLICIES
};