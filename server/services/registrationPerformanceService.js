/**
 * Registration Performance Monitoring Service
 * 
 * Tracks performance metrics specific to the user registration and verification system:
 * - Registration completion rates
 * - Email verification rates and timing
 * - Therapist approval processing times
 * - User drop-off analysis
 * - Registration funnel analytics
 * 
 * @module services/registrationPerformanceService
 */

const { logger, logBusinessEvent } = require('../utils/logger');

/**
 * Registration funnel steps
 */
const REGISTRATION_STEPS = {
  STARTED: 'started',
  FORM_SUBMITTED: 'form_submitted',
  ACCOUNT_CREATED: 'account_created',
  EMAIL_SENT: 'email_sent',
  EMAIL_VERIFIED: 'email_verified',
  CREDENTIALS_SUBMITTED: 'credentials_submitted',
  APPROVED: 'approved',
  FIRST_LOGIN: 'first_login'
};

/**
 * User types for tracking
 */
const USER_TYPES = {
  CLIENT: 'client',
  THERAPIST: 'therapist'
};

class RegistrationPerformanceService {
  constructor() {
    // In-memory storage for metrics (in production, use Redis or time-series DB)
    this.metrics = {
      // Registration funnel tracking
      registrationFunnel: [],
      
      // Email verification timing
      emailVerificationTimes: [],
      
      // Therapist approval timing
      approvalProcessingTimes: [],
      
      // Registration completion tracking
      registrationCompletions: [],
      
      // Drop-off tracking
      dropOffs: [],
      
      // Resend email tracking
      emailResends: []
    };

    // Aggregated statistics cache
    this.aggregatedStats = {
      lastUpdated: null,
      registrationCompletionRate: 0,
      emailVerificationRate: 0,
      averageTimeToVerification: 0,
      averageApprovalTime: 0,
      dropOffRates: {}
    };

    // Update aggregated stats every 5 minutes
    this.statsInterval = setInterval(() => {
      this.updateAggregatedStats();
    }, 5 * 60 * 1000);

    // Cleanup old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    logger.info('Registration performance monitoring service initialized');
  }

  /**
   * Track a registration funnel step
   * @param {string} userId - User ID or session ID
   * @param {string} step - Funnel step from REGISTRATION_STEPS
   * @param {string} userType - User type from USER_TYPES
   * @param {Object} metadata - Additional metadata
   */
  trackFunnelStep(userId, step, userType = USER_TYPES.CLIENT, metadata = {}) {
    const metric = {
      id: `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      step,
      userType,
      metadata,
      timestamp: new Date()
    };

    this.metrics.registrationFunnel.push(metric);

    logger.debug('Registration funnel step tracked', {
      userId,
      step,
      userType
    });

    logBusinessEvent('registration_funnel_step', {
      userId,
      step,
      userType,
      ...metadata
    });

    return metric.id;
  }

  /**
   * Track registration start
   * @param {string} sessionId - Session identifier
   * @param {string} userType - User type
   * @param {Object} metadata - Additional metadata
   */
  trackRegistrationStart(sessionId, userType, metadata = {}) {
    return this.trackFunnelStep(sessionId, REGISTRATION_STEPS.STARTED, userType, {
      ...metadata,
      startTime: Date.now()
    });
  }

  /**
   * Track successful account creation
   * @param {string} userId - Created user ID
   * @param {string} userType - User type
   * @param {number} startTime - Registration start timestamp
   */
  trackAccountCreated(userId, userType, startTime = null) {
    const completionTime = startTime ? Date.now() - startTime : null;

    this.metrics.registrationCompletions.push({
      userId,
      userType,
      completionTime,
      timestamp: new Date()
    });

    return this.trackFunnelStep(userId, REGISTRATION_STEPS.ACCOUNT_CREATED, userType, {
      completionTime
    });
  }

  /**
   * Track email verification sent
   * @param {string} userId - User ID
   * @param {string} userType - User type
   */
  trackEmailSent(userId, userType) {
    return this.trackFunnelStep(userId, REGISTRATION_STEPS.EMAIL_SENT, userType, {
      emailSentAt: Date.now()
    });
  }

  /**
   * Track email verification completed
   * @param {string} userId - User ID
   * @param {string} userType - User type
   * @param {Date} registrationTime - When user registered
   */
  trackEmailVerified(userId, userType, registrationTime = null) {
    const verificationTime = registrationTime 
      ? Date.now() - new Date(registrationTime).getTime() 
      : null;

    this.metrics.emailVerificationTimes.push({
      userId,
      userType,
      verificationTime,
      timestamp: new Date()
    });

    return this.trackFunnelStep(userId, REGISTRATION_STEPS.EMAIL_VERIFIED, userType, {
      verificationTime,
      verifiedAt: Date.now()
    });
  }

  /**
   * Track therapist credentials submission
   * @param {string} userId - User ID
   * @param {Date} registrationTime - When user registered
   */
  trackCredentialsSubmitted(userId, registrationTime = null) {
    const timeToSubmit = registrationTime 
      ? Date.now() - new Date(registrationTime).getTime() 
      : null;

    return this.trackFunnelStep(userId, REGISTRATION_STEPS.CREDENTIALS_SUBMITTED, USER_TYPES.THERAPIST, {
      timeToSubmit,
      submittedAt: Date.now()
    });
  }

  /**
   * Track therapist approval
   * @param {string} userId - User ID
   * @param {Date} submissionTime - When credentials were submitted
   * @param {string} status - Approval status (approved/rejected)
   */
  trackApprovalDecision(userId, submissionTime = null, status = 'approved') {
    const processingTime = submissionTime 
      ? Date.now() - new Date(submissionTime).getTime() 
      : null;

    this.metrics.approvalProcessingTimes.push({
      userId,
      processingTime,
      status,
      timestamp: new Date()
    });

    if (status === 'approved') {
      return this.trackFunnelStep(userId, REGISTRATION_STEPS.APPROVED, USER_TYPES.THERAPIST, {
        processingTime,
        approvedAt: Date.now()
      });
    }

    return null;
  }

  /**
   * Track user drop-off
   * @param {string} userId - User ID or session ID
   * @param {string} lastStep - Last completed step
   * @param {string} userType - User type
   * @param {string} reason - Drop-off reason if known
   */
  trackDropOff(userId, lastStep, userType, reason = 'unknown') {
    const dropOff = {
      userId,
      lastStep,
      userType,
      reason,
      timestamp: new Date()
    };

    this.metrics.dropOffs.push(dropOff);

    logger.info('Registration drop-off tracked', {
      userId,
      lastStep,
      userType,
      reason
    });

    return dropOff;
  }

  /**
   * Track email resend request
   * @param {string} userId - User ID
   * @param {number} resendCount - Number of resends for this user
   */
  trackEmailResend(userId, resendCount = 1) {
    this.metrics.emailResends.push({
      userId,
      resendCount,
      timestamp: new Date()
    });

    logger.debug('Email resend tracked', { userId, resendCount });
  }

  /**
   * Calculate registration completion rate
   * @param {number} timeWindowMs - Time window in milliseconds
   * @param {string} userType - Filter by user type (optional)
   * @returns {number} Completion rate as percentage
   */
  calculateRegistrationCompletionRate(timeWindowMs = 24 * 60 * 60 * 1000, userType = null) {
    const cutoff = new Date(Date.now() - timeWindowMs);
    
    let started = this.metrics.registrationFunnel.filter(
      m => m.timestamp >= cutoff && 
           m.step === REGISTRATION_STEPS.STARTED &&
           (!userType || m.userType === userType)
    );

    let completed = this.metrics.registrationFunnel.filter(
      m => m.timestamp >= cutoff && 
           m.step === REGISTRATION_STEPS.ACCOUNT_CREATED &&
           (!userType || m.userType === userType)
    );

    const startedCount = new Set(started.map(m => m.userId)).size;
    const completedCount = new Set(completed.map(m => m.userId)).size;

    return startedCount > 0 ? (completedCount / startedCount) * 100 : 0;
  }

  /**
   * Calculate email verification rate
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {number} Verification rate as percentage
   */
  calculateEmailVerificationRate(timeWindowMs = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindowMs);

    const accountsCreated = this.metrics.registrationFunnel.filter(
      m => m.timestamp >= cutoff && m.step === REGISTRATION_STEPS.ACCOUNT_CREATED
    );

    const emailsVerified = this.metrics.registrationFunnel.filter(
      m => m.timestamp >= cutoff && m.step === REGISTRATION_STEPS.EMAIL_VERIFIED
    );

    const createdCount = new Set(accountsCreated.map(m => m.userId)).size;
    const verifiedCount = new Set(emailsVerified.map(m => m.userId)).size;

    return createdCount > 0 ? (verifiedCount / createdCount) * 100 : 0;
  }

  /**
   * Calculate average time to email verification
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {number} Average time in milliseconds
   */
  calculateAverageTimeToVerification(timeWindowMs = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindowMs);
    
    const recentVerifications = this.metrics.emailVerificationTimes.filter(
      m => m.timestamp >= cutoff && m.verificationTime !== null
    );

    if (recentVerifications.length === 0) return 0;

    const totalTime = recentVerifications.reduce((sum, m) => sum + m.verificationTime, 0);
    return totalTime / recentVerifications.length;
  }

  /**
   * Calculate average therapist approval processing time
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {number} Average time in milliseconds
   */
  calculateAverageApprovalTime(timeWindowMs = 30 * 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindowMs);
    
    const recentApprovals = this.metrics.approvalProcessingTimes.filter(
      m => m.timestamp >= cutoff && 
           m.processingTime !== null && 
           m.status === 'approved'
    );

    if (recentApprovals.length === 0) return 0;

    const totalTime = recentApprovals.reduce((sum, m) => sum + m.processingTime, 0);
    return totalTime / recentApprovals.length;
  }

  /**
   * Calculate drop-off rates by step
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {Object} Drop-off rates by step
   */
  calculateDropOffRates(timeWindowMs = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindowMs);
    
    const recentFunnel = this.metrics.registrationFunnel.filter(
      m => m.timestamp >= cutoff
    );

    // Group by user and find their last step
    const userSteps = {};
    recentFunnel.forEach(m => {
      if (!userSteps[m.userId]) {
        userSteps[m.userId] = [];
      }
      userSteps[m.userId].push(m.step);
    });

    // Count users at each step
    const stepCounts = {};
    Object.values(REGISTRATION_STEPS).forEach(step => {
      stepCounts[step] = 0;
    });

    Object.values(userSteps).forEach(steps => {
      steps.forEach(step => {
        stepCounts[step] = (stepCounts[step] || 0) + 1;
      });
    });

    // Calculate drop-off rates between steps
    const stepOrder = [
      REGISTRATION_STEPS.STARTED,
      REGISTRATION_STEPS.FORM_SUBMITTED,
      REGISTRATION_STEPS.ACCOUNT_CREATED,
      REGISTRATION_STEPS.EMAIL_SENT,
      REGISTRATION_STEPS.EMAIL_VERIFIED
    ];

    const dropOffRates = {};
    for (let i = 0; i < stepOrder.length - 1; i++) {
      const currentStep = stepOrder[i];
      const nextStep = stepOrder[i + 1];
      const currentCount = stepCounts[currentStep] || 0;
      const nextCount = stepCounts[nextStep] || 0;

      dropOffRates[`${currentStep}_to_${nextStep}`] = currentCount > 0 
        ? ((currentCount - nextCount) / currentCount) * 100 
        : 0;
    }

    return dropOffRates;
  }

  /**
   * Get funnel analytics
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {Object} Funnel analytics
   */
  getFunnelAnalytics(timeWindowMs = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindowMs);
    
    const recentFunnel = this.metrics.registrationFunnel.filter(
      m => m.timestamp >= cutoff
    );

    // Count by step and user type
    const stepCounts = {
      client: {},
      therapist: {},
      total: {}
    };

    Object.values(REGISTRATION_STEPS).forEach(step => {
      stepCounts.client[step] = 0;
      stepCounts.therapist[step] = 0;
      stepCounts.total[step] = 0;
    });

    recentFunnel.forEach(m => {
      stepCounts[m.userType][m.step] = (stepCounts[m.userType][m.step] || 0) + 1;
      stepCounts.total[m.step] = (stepCounts.total[m.step] || 0) + 1;
    });

    return {
      timeWindow: `${timeWindowMs / (60 * 60 * 1000)} hours`,
      stepCounts,
      dropOffRates: this.calculateDropOffRates(timeWindowMs),
      uniqueUsers: new Set(recentFunnel.map(m => m.userId)).size
    };
  }

  /**
   * Update aggregated statistics
   */
  updateAggregatedStats() {
    try {
      this.aggregatedStats = {
        lastUpdated: new Date(),
        registrationCompletionRate: this.calculateRegistrationCompletionRate(),
        emailVerificationRate: this.calculateEmailVerificationRate(),
        averageTimeToVerification: this.calculateAverageTimeToVerification(),
        averageApprovalTime: this.calculateAverageApprovalTime(),
        dropOffRates: this.calculateDropOffRates()
      };

      logger.debug('Registration performance stats updated', {
        completionRate: `${this.aggregatedStats.registrationCompletionRate.toFixed(2)}%`,
        verificationRate: `${this.aggregatedStats.emailVerificationRate.toFixed(2)}%`
      });
    } catch (error) {
      logger.error('Failed to update registration performance stats', { 
        error: error.message 
      });
    }
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    // Ensure stats are fresh
    if (!this.aggregatedStats.lastUpdated || 
        Date.now() - this.aggregatedStats.lastUpdated.getTime() > 5 * 60 * 1000) {
      this.updateAggregatedStats();
    }

    return {
      ...this.aggregatedStats,
      rawMetricsCounts: {
        registrationFunnel: this.metrics.registrationFunnel.length,
        emailVerificationTimes: this.metrics.emailVerificationTimes.length,
        approvalProcessingTimes: this.metrics.approvalProcessingTimes.length,
        registrationCompletions: this.metrics.registrationCompletions.length,
        dropOffs: this.metrics.dropOffs.length,
        emailResends: this.metrics.emailResends.length
      }
    };
  }

  /**
   * Get detailed metrics for a time range
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Object} Detailed metrics
   */
  getDetailedMetrics(startTime, endTime) {
    const filterByTimeRange = (metrics) =>
      metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

    return {
      registrationFunnel: filterByTimeRange(this.metrics.registrationFunnel),
      emailVerificationTimes: filterByTimeRange(this.metrics.emailVerificationTimes),
      approvalProcessingTimes: filterByTimeRange(this.metrics.approvalProcessingTimes),
      registrationCompletions: filterByTimeRange(this.metrics.registrationCompletions),
      dropOffs: filterByTimeRange(this.metrics.dropOffs),
      emailResends: filterByTimeRange(this.metrics.emailResends)
    };
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const retentionPeriods = {
      registrationFunnel: 7 * 24 * 60 * 60 * 1000, // 7 days
      emailVerificationTimes: 30 * 24 * 60 * 60 * 1000, // 30 days
      approvalProcessingTimes: 90 * 24 * 60 * 60 * 1000, // 90 days
      registrationCompletions: 30 * 24 * 60 * 60 * 1000, // 30 days
      dropOffs: 30 * 24 * 60 * 60 * 1000, // 30 days
      emailResends: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    let totalRemoved = 0;

    Object.entries(retentionPeriods).forEach(([metricType, retention]) => {
      const cutoff = new Date(Date.now() - retention);
      const beforeCount = this.metrics[metricType].length;
      
      this.metrics[metricType] = this.metrics[metricType].filter(
        m => m.timestamp >= cutoff
      );
      
      totalRemoved += beforeCount - this.metrics[metricType].length;
    });

    if (totalRemoved > 0) {
      logger.info(`Cleaned up ${totalRemoved} old registration performance metrics`);
    }
  }

  /**
   * Export metrics for analysis
   * @param {string} format - Export format (json)
   * @returns {string|Object} Exported data
   */
  exportMetrics(format = 'json') {
    const data = {
      exportedAt: new Date(),
      summary: this.getMetricsSummary(),
      funnelAnalytics: this.getFunnelAnalytics(),
      rawMetrics: this.metrics
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    return data;
  }

  /**
   * Shutdown service and cleanup
   */
  shutdown() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    logger.info('Registration performance service shut down');
  }
}

// Create singleton instance
const registrationPerformanceService = new RegistrationPerformanceService();

// Export service and constants
module.exports = {
  registrationPerformanceService,
  REGISTRATION_STEPS,
  USER_TYPES
};
