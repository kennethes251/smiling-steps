/**
 * Session Failure Recovery Service
 * 
 * Implements recovery mechanisms for session-related failures:
 * - No-show detection (15 min after start time)
 * - Automatic refund processing for therapist no-shows
 * - Client no-show policy enforcement
 * - Video call failure recovery
 * 
 * Requirements: Session Flow Failures from Flow Integrity Contract
 */

const { SESSION_STATES } = require('../constants/sessionStates');
const { PAYMENT_STATES } = require('../constants/paymentStates');
const { logSessionStatusChange } = require('../utils/auditLogger');

/**
 * No-Show Detection Configuration
 */
const NO_SHOW_CONFIG = {
  // Minutes after session start to detect no-show
  DETECTION_THRESHOLD_MINUTES: 15,
  
  // Client no-show policy
  CLIENT_NO_SHOW_REFUND_PERCENTAGE: 0, // No refund for client no-show
  
  // Therapist no-show policy
  THERAPIST_NO_SHOW_REFUND_PERCENTAGE: 100, // Full refund for therapist no-show
  
  // Grace period before marking as no-show (minutes)
  GRACE_PERIOD_MINUTES: 5
};

/**
 * Session Failure Recovery Service
 */
class SessionFailureRecoveryService {
  
  constructor() {
    this.Session = null;
    this.User = null;
    this.notificationService = null;
  }
  
  /**
   * Initialize service with dependencies
   * Lazy loading to avoid circular dependencies
   */
  async initialize() {
    if (!this.Session) {
      this.Session = require('../models/Session');
    }
    if (!this.User) {
      this.User = require('../models/User');
    }
    if (!this.notificationService) {
      try {
        this.notificationService = require('../utils/notificationService');
      } catch (e) {
        console.warn('Notification service not available');
      }
    }
  }
  
  /**
   * Detect no-show sessions
   * Finds sessions that started 15+ minutes ago but haven't progressed
   * 
   * @returns {Promise<Array>} Array of no-show sessions with type
   */
  async detectNoShowSessions() {
    await this.initialize();
    
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - (NO_SHOW_CONFIG.DETECTION_THRESHOLD_MINUTES * 60 * 1000));
    
    // Find sessions that should have started but are still in READY state
    const potentialNoShows = await this.Session.find({
      status: SESSION_STATES.READY,
      scheduledDate: { $lte: thresholdTime },
      paymentStatus: PAYMENT_STATES.CONFIRMED
    }).populate('client psychologist', 'name email phone');
    
    const noShowSessions = [];
    
    for (const session of potentialNoShows) {
      const noShowType = await this.determineNoShowType(session);
      
      if (noShowType) {
        noShowSessions.push({
          session,
          noShowType,
          minutesPastStart: Math.floor((now - session.scheduledDate) / (60 * 1000)),
          recommendedAction: this.getNoShowRecommendedAction(noShowType)
        });
      }
    }
    
    console.log(`🔍 Detected ${noShowSessions.length} no-show sessions`);
    return noShowSessions;
  }
  
  /**
   * Determine the type of no-show
   * 
   * @param {Object} session - Session document
   * @returns {string|null} 'client', 'therapist', or null
   */
  async determineNoShowType(session) {
    // Check video call activity to determine who didn't show
    const videoCallStatus = session.videoCallStatus;
    const lastClientActivity = session.lastClientActivity;
    const lastTherapistActivity = session.lastTherapistActivity;
    
    const now = new Date();
    const sessionStart = new Date(session.scheduledDate);
    const graceEnd = new Date(sessionStart.getTime() + (NO_SHOW_CONFIG.GRACE_PERIOD_MINUTES * 60 * 1000));
    
    // If session hasn't started and we're past grace period
    if (now > graceEnd) {
      // Check if therapist joined but client didn't
      if (lastTherapistActivity && !lastClientActivity) {
        return 'client';
      }
      
      // Check if client joined but therapist didn't
      if (lastClientActivity && !lastTherapistActivity) {
        return 'therapist';
      }
      
      // Neither joined - default to client no-show (they should initiate)
      // But flag for manual review
      return 'both_absent';
    }
    
    return null;
  }
  
  /**
   * Get recommended action for no-show type
   * 
   * @param {string} noShowType - Type of no-show
   * @returns {Object} Recommended action details
   */
  getNoShowRecommendedAction(noShowType) {
    const actions = {
      client: {
        action: 'MARK_CLIENT_NO_SHOW',
        refundPercentage: NO_SHOW_CONFIG.CLIENT_NO_SHOW_REFUND_PERCENTAGE,
        notifyClient: true,
        notifyTherapist: true,
        message: 'Client did not attend the session. No refund per policy.'
      },
      therapist: {
        action: 'MARK_THERAPIST_NO_SHOW',
        refundPercentage: NO_SHOW_CONFIG.THERAPIST_NO_SHOW_REFUND_PERCENTAGE,
        notifyClient: true,
        notifyTherapist: true,
        flagTherapist: true,
        message: 'Therapist did not attend. Full refund will be processed.'
      },
      both_absent: {
        action: 'MANUAL_REVIEW_REQUIRED',
        refundPercentage: null,
        notifyAdmin: true,
        message: 'Neither party joined. Manual review required.'
      }
    };
    
    return actions[noShowType] || actions.both_absent;
  }
  
  /**
   * Process client no-show
   * 
   * @param {Object} session - Session document
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processClientNoShow(session, options = {}) {
    await this.initialize();
    
    const previousStatus = session.status;
    
    try {
      // Update session status
      session.status = SESSION_STATES.NO_SHOW_CLIENT;
      session.noShowDetectedAt = new Date();
      session.noShowType = 'client';
      session.statusUpdatedAt = new Date();
      
      await session.save();
      
      // Log the status change
      await logSessionStatusChange({
        sessionId: session._id,
        previousStatus,
        newStatus: SESSION_STATES.NO_SHOW_CLIENT,
        reason: 'Client did not attend session within 15 minutes of start time',
        userId: options.processedBy || 'system',
        userRole: 'system'
      });
      
      // Send notifications
      await this.sendNoShowNotifications(session, 'client');
      
      console.log(`✅ Processed client no-show for session ${session._id}`);
      
      return {
        success: true,
        sessionId: session._id,
        newStatus: SESSION_STATES.NO_SHOW_CLIENT,
        refundAmount: 0,
        message: 'Client no-show processed. No refund per policy.'
      };
      
    } catch (error) {
      console.error(`❌ Failed to process client no-show:`, error);
      throw error;
    }
  }
  
  /**
   * Process therapist no-show with automatic refund
   * 
   * @param {Object} session - Session document
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTherapistNoShow(session, options = {}) {
    await this.initialize();
    
    const previousStatus = session.status;
    
    try {
      // Update session status
      session.status = SESSION_STATES.NO_SHOW_THERAPIST;
      session.noShowDetectedAt = new Date();
      session.noShowType = 'therapist';
      session.statusUpdatedAt = new Date();
      
      // Initiate refund process
      const refundAmount = session.price * (NO_SHOW_CONFIG.THERAPIST_NO_SHOW_REFUND_PERCENTAGE / 100);
      session.refundStatus = 'pending';
      session.refundAmount = refundAmount;
      session.refundReason = 'Therapist no-show';
      session.refundInitiatedAt = new Date();
      
      await session.save();
      
      // Log the status change
      await logSessionStatusChange({
        sessionId: session._id,
        previousStatus,
        newStatus: SESSION_STATES.NO_SHOW_THERAPIST,
        reason: 'Therapist did not attend session within 15 minutes of start time',
        userId: options.processedBy || 'system',
        userRole: 'system'
      });
      
      // Flag therapist account for review
      await this.flagTherapistForReview(session.psychologist, session._id);
      
      // Send notifications
      await this.sendNoShowNotifications(session, 'therapist');
      
      // Initiate automatic refund (if M-Pesa refund is available)
      const refundResult = await this.initiateAutomaticRefund(session);
      
      console.log(`✅ Processed therapist no-show for session ${session._id}`);
      
      return {
        success: true,
        sessionId: session._id,
        newStatus: SESSION_STATES.NO_SHOW_THERAPIST,
        refundAmount,
        refundStatus: refundResult.status,
        message: 'Therapist no-show processed. Full refund initiated.'
      };
      
    } catch (error) {
      console.error(`❌ Failed to process therapist no-show:`, error);
      throw error;
    }
  }

  
  /**
   * Flag therapist account for review after no-show
   * 
   * @param {string|Object} therapist - Therapist ID or document
   * @param {string} sessionId - Session ID that triggered the flag
   */
  async flagTherapistForReview(therapist, sessionId) {
    await this.initialize();
    
    try {
      const therapistId = therapist._id || therapist;
      
      await this.User.findByIdAndUpdate(therapistId, {
        $push: {
          noShowIncidents: {
            sessionId,
            detectedAt: new Date(),
            reviewed: false
          }
        },
        $inc: { noShowCount: 1 }
      });
      
      console.log(`⚠️ Flagged therapist ${therapistId} for no-show review`);
      
    } catch (error) {
      console.error('Failed to flag therapist for review:', error);
      // Don't throw - this is a secondary action
    }
  }
  
  /**
   * Send no-show notifications to relevant parties
   * 
   * @param {Object} session - Session document
   * @param {string} noShowType - Type of no-show
   */
  async sendNoShowNotifications(session, noShowType) {
    if (!this.notificationService) {
      console.warn('Notification service not available for no-show notifications');
      return;
    }
    
    try {
      const client = session.client;
      const therapist = session.psychologist;
      
      if (noShowType === 'client') {
        // Notify client about their no-show
        await this.notificationService.sendEmail({
          to: client.email,
          subject: 'Missed Session - Smiling Steps',
          template: 'client-no-show',
          data: {
            clientName: client.name,
            sessionDate: session.scheduledDate,
            therapistName: therapist.name,
            policy: 'As per our cancellation policy, no refund is available for missed sessions.'
          }
        });
        
        // Notify therapist
        await this.notificationService.sendEmail({
          to: therapist.email,
          subject: 'Client No-Show Notification',
          template: 'therapist-client-no-show',
          data: {
            therapistName: therapist.name,
            clientName: client.name,
            sessionDate: session.scheduledDate
          }
        });
        
      } else if (noShowType === 'therapist') {
        // Notify client about therapist no-show and refund
        await this.notificationService.sendEmail({
          to: client.email,
          subject: 'Session Cancelled - Refund Processing',
          template: 'therapist-no-show-client',
          data: {
            clientName: client.name,
            sessionDate: session.scheduledDate,
            therapistName: therapist.name,
            refundAmount: session.refundAmount,
            message: 'We apologize for the inconvenience. A full refund has been initiated.'
          }
        });
        
        // Notify therapist about their no-show
        await this.notificationService.sendEmail({
          to: therapist.email,
          subject: 'Missed Session Alert - Action Required',
          template: 'therapist-no-show-warning',
          data: {
            therapistName: therapist.name,
            clientName: client.name,
            sessionDate: session.scheduledDate,
            warning: 'Your account has been flagged for review due to this missed session.'
          }
        });
      }
      
      console.log(`📧 No-show notifications sent for session ${session._id}`);
      
    } catch (error) {
      console.error('Failed to send no-show notifications:', error);
      // Don't throw - notifications are secondary
    }
  }
  
  /**
   * Initiate automatic refund for therapist no-show
   * 
   * @param {Object} session - Session document
   * @returns {Promise<Object>} Refund result
   */
  async initiateAutomaticRefund(session) {
    try {
      // Check if M-Pesa refund is available
      const mpesaTransactionId = session.mpesaTransactionID;
      
      if (!mpesaTransactionId) {
        return {
          status: 'manual_required',
          message: 'No M-Pesa transaction ID found. Manual refund required.'
        };
      }
      
      // For now, mark as pending manual processing
      // M-Pesa B2C (Business to Customer) API would be used here
      // This requires additional Safaricom API setup
      
      console.log(`💰 Refund initiated for session ${session._id}, amount: ${session.refundAmount}`);
      
      return {
        status: 'pending',
        message: 'Refund marked for processing. Admin will complete manually.',
        transactionId: mpesaTransactionId,
        refundAmount: session.refundAmount
      };
      
    } catch (error) {
      console.error('Failed to initiate automatic refund:', error);
      return {
        status: 'failed',
        message: error.message
      };
    }
  }
  
  /**
   * Handle video call technical failure
   * Provides recovery options when video call fails
   * 
   * @param {Object} session - Session document
   * @param {Object} failureDetails - Details about the failure
   * @returns {Promise<Object>} Recovery options
   */
  async handleVideoCallFailure(session, failureDetails) {
    await this.initialize();
    
    const { errorType, errorMessage, attemptCount = 1 } = failureDetails;
    
    // Log the failure
    console.error(`🔴 Video call failure for session ${session._id}:`, {
      errorType,
      errorMessage,
      attemptCount
    });
    
    // Update session with failure info
    session.videoCallFailures = session.videoCallFailures || [];
    session.videoCallFailures.push({
      timestamp: new Date(),
      errorType,
      errorMessage,
      attemptCount
    });
    
    await session.save();
    
    // Determine recovery action based on failure count
    const recoveryOptions = {
      canRetry: attemptCount < 3,
      phoneBackupAvailable: true,
      rescheduleAvailable: true
    };
    
    // Get phone backup numbers
    const client = await this.User.findById(session.client).select('phone');
    const therapist = await this.User.findById(session.psychologist).select('phone');
    
    if (attemptCount >= 3) {
      // Too many failures - offer alternatives
      return {
        status: 'recovery_required',
        message: 'Video call experiencing technical difficulties',
        options: {
          phoneBackup: {
            available: true,
            therapistPhone: therapist?.phone ? this.maskPhone(therapist.phone) : null,
            instructions: 'Contact your therapist directly via phone'
          },
          reschedule: {
            available: true,
            instructions: 'Reschedule your session for a later time'
          },
          support: {
            available: true,
            email: 'support@smilingsteps.co.ke',
            instructions: 'Contact support for technical assistance'
          }
        },
        failureCount: attemptCount
      };
    }
    
    // Can still retry
    return {
      status: 'retry_available',
      message: 'Video call connection failed. Please try again.',
      options: {
        retry: {
          available: true,
          attemptsRemaining: 3 - attemptCount,
          instructions: 'Click "Retry Connection" to try again'
        },
        troubleshooting: {
          steps: [
            'Check your internet connection',
            'Ensure camera and microphone permissions are granted',
            'Try refreshing the page',
            'Use Chrome or Firefox for best compatibility'
          ]
        }
      },
      failureCount: attemptCount
    };
  }
  
  /**
   * Mask phone number for privacy
   */
  maskPhone(phone) {
    if (!phone || phone.length < 6) return '***';
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  }
  
  /**
   * Run no-show detection job
   * Should be called periodically (e.g., every 5 minutes)
   * 
   * @returns {Promise<Object>} Job results
   */
  async runNoShowDetectionJob() {
    console.log('🔄 Running no-show detection job...');
    
    const results = {
      detected: 0,
      processed: 0,
      errors: []
    };
    
    try {
      const noShowSessions = await this.detectNoShowSessions();
      results.detected = noShowSessions.length;
      
      for (const { session, noShowType, recommendedAction } of noShowSessions) {
        try {
          if (noShowType === 'client') {
            await this.processClientNoShow(session);
            results.processed++;
          } else if (noShowType === 'therapist') {
            await this.processTherapistNoShow(session);
            results.processed++;
          } else {
            // Manual review required - just log
            console.log(`⚠️ Session ${session._id} requires manual review (both absent)`);
          }
        } catch (error) {
          results.errors.push({
            sessionId: session._id,
            error: error.message
          });
        }
      }
      
      console.log(`✅ No-show detection job complete:`, results);
      return results;
      
    } catch (error) {
      console.error('❌ No-show detection job failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const sessionFailureRecoveryService = new SessionFailureRecoveryService();

module.exports = {
  SessionFailureRecoveryService,
  sessionFailureRecoveryService,
  NO_SHOW_CONFIG
};
