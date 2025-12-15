const { calculateCallDuration, validateCallDuration } = require('./callDurationUtils');

/**
 * Centralized session status management for video calls
 * Ensures consistent status updates across all video call operations
 * Updated for PostgreSQL/Sequelize compatibility
 */
class SessionStatusManager {
  
  /**
   * Get Session model - handles both global and test environments
   */
  static getSessionModel() {
    // In test environment, use the passed model or require directly
    if (global.Session) {
      return global.Session;
    }
    
    // Fallback for test environments - try to get from models
    try {
      const { Session } = require('../models');
      return Session;
    } catch (error) {
      throw new Error('Session model not available. Ensure database is initialized.');
    }
  }
  
  /**
   * Get User model - handles both global and test environments
   */
  static getUserModel() {
    if (global.User) {
      return global.User;
    }
    
    try {
      const { User } = require('../models');
      return User;
    } catch (error) {
      throw new Error('User model not available. Ensure database is initialized.');
    }
  }
  
  /**
   * Start a video call session
   * Updates status to 'In Progress' and records start time
   */
  static async startVideoCall(sessionId, userId) {
    try {
      const Session = this.getSessionModel();
      const User = this.getUserModel();
      
      const session = await Session.findByPk(sessionId, {
        include: [
          { model: User, as: 'client' },
          { model: User, as: 'psychologist' }
        ]
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Verify authorization
      const isAuthorized = 
        session.clientId === userId ||
        session.psychologistId === userId;
      
      if (!isAuthorized) {
        throw new Error('Unauthorized to start this session');
      }
      
      // Verify session can be started
      if (session.status === 'Cancelled' || session.status === 'Declined') {
        throw new Error(`Cannot start ${session.status.toLowerCase()} session`);
      }
      
      if (session.paymentStatus !== 'Confirmed' && 
          session.paymentStatus !== 'Paid' && 
          session.paymentStatus !== 'Verified') {
        throw new Error('Payment must be confirmed before starting video call');
      }
      
      // Only update if not already started
      if (!session.videoCallStarted) {
        session.videoCallStarted = new Date();
        session.status = 'In Progress';
        await session.save();
        
        console.log(`🎥 Video call started for session ${session.id} by user ${userId}`);
        
        return {
          success: true,
          message: 'Video call started successfully',
          session: {
            id: session.id,
            status: session.status,
            videoCallStarted: session.videoCallStarted
          }
        };
      } else {
        console.log(`🎥 Video call already started for session ${session.id}`);
        
        return {
          success: true,
          message: 'Video call already in progress',
          session: {
            id: session.id,
            status: session.status,
            videoCallStarted: session.videoCallStarted
          }
        };
      }
      
    } catch (error) {
      console.error('Error starting video call:', error);
      throw error;
    }
  }
  
  /**
   * End a video call session
   * Updates status to 'Completed', records end time, and calculates duration
   */
  static async endVideoCall(sessionId, userId) {
    try {
      const Session = this.getSessionModel();
      const User = this.getUserModel();
      
      const session = await Session.findByPk(sessionId, {
        include: [
          { model: User, as: 'client' },
          { model: User, as: 'psychologist' }
        ]
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Verify authorization
      const isAuthorized = 
        session.clientId === userId ||
        session.psychologistId === userId;
      
      if (!isAuthorized) {
        throw new Error('Unauthorized to end this session');
      }
      
      // Only update if not already ended
      if (!session.videoCallEnded) {
        session.videoCallEnded = new Date();
        
        // Calculate duration if call was started
        if (session.videoCallStarted) {
          // Note: Using 'duration' field name as per Sequelize model
          session.duration = calculateCallDuration(
            session.videoCallStarted, 
            session.videoCallEnded
          );
          
          // Validate duration for potential issues
          const validation = validateCallDuration(session.duration);
          if (!validation.isValid) {
            console.warn(`⚠️ Invalid call duration for session ${session.id}:`, validation.errors);
          }
          if (validation.warnings.length > 0) {
            console.warn(`⚠️ Call duration warnings for session ${session.id}:`, validation.warnings);
          }
        } else {
          console.warn(`⚠️ Session ${session.id} ended without being started`);
          session.duration = 0;
        }
        
        session.status = 'Completed';
        await session.save();
        
        console.log(`🎥 Video call ended for session ${session.id} by user ${userId}. Duration: ${session.duration} minutes`);
        
        return {
          success: true,
          message: 'Video call ended successfully',
          duration: session.duration,
          session: {
            id: session.id,
            status: session.status,
            videoCallStarted: session.videoCallStarted,
            videoCallEnded: session.videoCallEnded,
            callDuration: session.duration
          }
        };
      } else {
        console.log(`🎥 Video call already ended for session ${session.id}`);
        
        return {
          success: true,
          message: 'Video call already completed',
          duration: session.duration,
          session: {
            id: session.id,
            status: session.status,
            videoCallStarted: session.videoCallStarted,
            videoCallEnded: session.videoCallEnded,
            callDuration: session.duration
          }
        };
      }
      
    } catch (error) {
      console.error('Error ending video call:', error);
      throw error;
    }
  }
  
  /**
   * Auto-start video call when participants join
   * Used by Socket.io service when second participant joins
   */
  static async autoStartVideoCall(sessionId) {
    try {
      const Session = this.getSessionModel();
      const session = await Session.findByPk(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Only auto-start if conditions are met
      if (!session.videoCallStarted && 
          session.status === 'Confirmed' &&
          (session.paymentStatus === 'Confirmed' || 
           session.paymentStatus === 'Paid' || 
           session.paymentStatus === 'Verified')) {
        
        session.videoCallStarted = new Date();
        session.status = 'In Progress';
        await session.save();
        
        console.log(`🎥 Auto-started video call for session ${session.id}`);
        
        return {
          success: true,
          session: {
            id: session.id,
            status: session.status,
            videoCallStarted: session.videoCallStarted
          }
        };
      }
      
      return {
        success: false,
        reason: 'Session not eligible for auto-start'
      };
      
    } catch (error) {
      console.error('Error auto-starting video call:', error);
      throw error;
    }
  }
  
  /**
   * Auto-end video call when all participants leave
   * Used by Socket.io service when room becomes empty
   */
  static async autoEndVideoCall(sessionId) {
    try {
      const Session = this.getSessionModel();
      const session = await Session.findByPk(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Only auto-end if call was started but not ended
      if (session.videoCallStarted && !session.videoCallEnded) {
        session.videoCallEnded = new Date();
        
        // Calculate duration (using 'duration' field as per Sequelize model)
        session.duration = calculateCallDuration(
          session.videoCallStarted, 
          session.videoCallEnded
        );
        
        session.status = 'Completed';
        await session.save();
        
        console.log(`🎥 Auto-ended video call for session ${session.id} (all participants left). Duration: ${session.duration} minutes`);
        
        return {
          success: true,
          session: {
            id: session.id,
            status: session.status,
            videoCallEnded: session.videoCallEnded,
            callDuration: session.duration
          }
        };
      }
      
      return {
        success: false,
        reason: 'Session not eligible for auto-end'
      };
      
    } catch (error) {
      console.error('Error auto-ending video call:', error);
      throw error;
    }
  }
  
  /**
   * Get current session status with video call information
   */
  static async getSessionStatus(sessionId, userId) {
    try {
      const Session = this.getSessionModel();
      const User = this.getUserModel();
      
      const session = await Session.findByPk(sessionId, {
        include: [
          { 
            model: User, 
            as: 'client',
            attributes: ['id', 'name', 'email', 'profilePicture']
          },
          { 
            model: User, 
            as: 'psychologist',
            attributes: ['id', 'name', 'email', 'profilePicture', 'psychologistDetails']
          }
        ]
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Verify authorization
      const isAuthorized = 
        session.clientId === userId ||
        session.psychologistId === userId;
      
      if (!isAuthorized) {
        throw new Error('Unauthorized to view this session');
      }
      
      return {
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.paymentStatus,
        videoCall: {
          started: session.videoCallStarted,
          ended: session.videoCallEnded,
          duration: session.duration,
          isActive: session.videoCallStarted && !session.videoCallEnded
        },
        participants: {
          client: {
            id: session.client.id,
            name: session.client.name,
            profilePicture: session.client.profilePicture
          },
          psychologist: {
            id: session.psychologist.id,
            name: session.psychologist.name,
            profilePicture: session.psychologist.profilePicture
          }
        }
      };
      
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }
  
  /**
   * Check if session can transition to a specific status
   */
  static canTransitionToStatus(currentStatus, targetStatus) {
    const validTransitions = {
      'Pending': ['Pending Approval', 'Cancelled'],
      'Pending Approval': ['Approved', 'Declined', 'Cancelled'],
      'Approved': ['Payment Submitted', 'Cancelled'],
      'Payment Submitted': ['Confirmed', 'Cancelled'],
      'Confirmed': ['In Progress', 'Cancelled'],
      'In Progress': ['Completed', 'Cancelled'],
      'Completed': [], // Terminal state
      'Cancelled': [], // Terminal state
      'Declined': [] // Terminal state
    };
    
    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  }
  
  /**
   * Validate session status transition
   */
  static validateStatusTransition(session, targetStatus) {
    if (!this.canTransitionToStatus(session.status, targetStatus)) {
      throw new Error(`Invalid status transition from ${session.status} to ${targetStatus}`);
    }
    
    // Additional validation for video call specific transitions
    if (targetStatus === 'In Progress') {
      if (session.paymentStatus !== 'Confirmed' && 
          session.paymentStatus !== 'Paid' && 
          session.paymentStatus !== 'Verified') {
        throw new Error('Payment must be confirmed before starting video call');
      }
    }
    
    if (targetStatus === 'Completed') {
      if (!session.videoCallStarted) {
        throw new Error('Cannot complete session that was never started');
      }
    }
  }
}

module.exports = SessionStatusManager;