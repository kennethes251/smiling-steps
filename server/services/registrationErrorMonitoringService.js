/**
 * Registration Error Monitoring Service
 * 
 * Provides comprehensive error tracking, aggregation, and alerting
 * for the user registration and verification system.
 * 
 * Tracks:
 * - Registration failures (validation, duplicate emails, server errors)
 * - Email verification errors (token generation, sending, validation)
 * - Credential submission errors
 * - Approval workflow errors
 * 
 * @module services/registrationErrorMonitoringService
 */

const { logger, logSecurityEvent, logBusinessEvent } = require('../utils/logger');

/**
 * Error categories for registration system
 */
const ERROR_CATEGORIES = {
  REGISTRATION: 'registration',
  EMAIL_VERIFICATION: 'email_verification',
  TOKEN_GENERATION: 'token_generation',
  EMAIL_SENDING: 'email_sending',
  CREDENTIAL_SUBMISSION: 'credential_submission',
  APPROVAL_WORKFLOW: 'approval_workflow',
  ACCESS_CONTROL: 'access_control',
  DATABASE: 'database',
  VALIDATION: 'validation'
};

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Alert thresholds for error rates
 */
const ALERT_THRESHOLDS = {
  // Alert if more than 10 errors in 5 minutes
  ERROR_RATE_THRESHOLD: 10,
  ERROR_RATE_WINDOW_MS: 5 * 60 * 1000,
  
  // Alert if error rate exceeds 20% of total attempts
  ERROR_PERCENTAGE_THRESHOLD: 20,
  
  // Alert if same error occurs 5 times in 1 minute
  REPEATED_ERROR_THRESHOLD: 5,
  REPEATED_ERROR_WINDOW_MS: 60 * 1000,
  
  // Critical alert if email service fails 3 times consecutively
  EMAIL_FAILURE_THRESHOLD: 3
};

class RegistrationErrorMonitoringService {
  constructor() {
    // In-memory error storage (in production, use Redis or time-series DB)
    this.errors = [];
    this.errorCounts = {};
    this.consecutiveEmailFailures = 0;
    this.alertsSent = new Map(); // Track sent alerts to prevent spam
    
    // Aggregated statistics
    this.stats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      lastHourErrors: 0,
      lastDayErrors: 0,
      lastUpdated: null
    };
    
    // Initialize error counts by category
    Object.values(ERROR_CATEGORIES).forEach(category => {
      this.errorCounts[category] = 0;
      this.stats.errorsByCategory[category] = 0;
    });
    
    Object.values(ERROR_SEVERITY).forEach(severity => {
      this.stats.errorsBySeverity[severity] = 0;
    });
    
    // Update stats every minute
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 60 * 1000);
    
    // Cleanup old errors every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  /**
   * Track a registration-related error
   * @param {Object} errorData - Error details
   * @param {string} errorData.category - Error category from ERROR_CATEGORIES
   * @param {string} errorData.code - Specific error code
   * @param {string} errorData.message - Error message
   * @param {string} errorData.severity - Error severity from ERROR_SEVERITY
   * @param {Object} errorData.context - Additional context (userId, email, etc.)
   * @param {Error} errorData.originalError - Original error object if available
   */
  trackError(errorData) {
    const {
      category = ERROR_CATEGORIES.REGISTRATION,
      code = 'UNKNOWN_ERROR',
      message = 'An error occurred',
      severity = ERROR_SEVERITY.MEDIUM,
      context = {},
      originalError = null
    } = errorData;

    const error = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      code,
      message,
      severity,
      context: this.sanitizeContext(context),
      stack: originalError?.stack,
      timestamp: new Date(),
      resolved: false
    };

    // Store error
    this.errors.push(error);
    this.stats.totalErrors++;
    this.stats.errorsByCategory[category] = (this.stats.errorsByCategory[category] || 0) + 1;
    this.stats.errorsBySeverity[severity] = (this.stats.errorsBySeverity[severity] || 0) + 1;
    this.errorCounts[category] = (this.errorCounts[category] || 0) + 1;

    // Log the error
    this.logError(error);

    // Check for alerts
    this.checkAlertConditions(error);

    // Track consecutive email failures
    if (category === ERROR_CATEGORIES.EMAIL_SENDING) {
      this.consecutiveEmailFailures++;
      if (this.consecutiveEmailFailures >= ALERT_THRESHOLDS.EMAIL_FAILURE_THRESHOLD) {
        this.triggerCriticalAlert('EMAIL_SERVICE_DOWN', {
          consecutiveFailures: this.consecutiveEmailFailures,
          lastError: error
        });
      }
    }

    return error.id;
  }

  /**
   * Track successful email sending (resets consecutive failure counter)
   */
  trackEmailSuccess() {
    this.consecutiveEmailFailures = 0;
  }

  /**
   * Track a registration attempt (for calculating error rates)
   * @param {string} type - Type of attempt (registration, verification, etc.)
   * @param {boolean} success - Whether the attempt was successful
   * @param {Object} context - Additional context
   */
  trackAttempt(type, success, context = {}) {
    const attempt = {
      type,
      success,
      context: this.sanitizeContext(context),
      timestamp: new Date()
    };

    // Log business event
    logBusinessEvent(`registration_${type}_attempt`, {
      success,
      ...this.sanitizeContext(context)
    });

    return attempt;
  }

  /**
   * Log error based on severity
   * @param {Object} error - Error object
   */
  logError(error) {
    const logData = {
      errorId: error.id,
      category: error.category,
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp
    };

    switch (error.severity) {
      case ERROR_SEVERITY.CRITICAL:
        logger.error('🚨 CRITICAL Registration Error', logData);
        logSecurityEvent('critical_registration_error', logData, 'critical');
        break;
      case ERROR_SEVERITY.HIGH:
        logger.error('❌ High Severity Registration Error', logData);
        logSecurityEvent('high_registration_error', logData, 'high');
        break;
      case ERROR_SEVERITY.MEDIUM:
        logger.warn('⚠️ Registration Error', logData);
        break;
      case ERROR_SEVERITY.LOW:
        logger.info('ℹ️ Registration Warning', logData);
        break;
      default:
        logger.warn('Registration Error', logData);
    }
  }

  /**
   * Check if alert conditions are met
   * @param {Object} error - The error that was just tracked
   */
  checkAlertConditions(error) {
    const now = Date.now();

    // Check error rate threshold
    const recentErrors = this.errors.filter(
      e => now - e.timestamp.getTime() < ALERT_THRESHOLDS.ERROR_RATE_WINDOW_MS
    );

    if (recentErrors.length >= ALERT_THRESHOLDS.ERROR_RATE_THRESHOLD) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        errorCount: recentErrors.length,
        windowMinutes: ALERT_THRESHOLDS.ERROR_RATE_WINDOW_MS / 60000,
        categories: this.groupByCategory(recentErrors)
      });
    }

    // Check for repeated errors
    const sameCodeErrors = this.errors.filter(
      e => e.code === error.code && 
           now - e.timestamp.getTime() < ALERT_THRESHOLDS.REPEATED_ERROR_WINDOW_MS
    );

    if (sameCodeErrors.length >= ALERT_THRESHOLDS.REPEATED_ERROR_THRESHOLD) {
      this.triggerAlert('REPEATED_ERROR', {
        errorCode: error.code,
        count: sameCodeErrors.length,
        windowSeconds: ALERT_THRESHOLDS.REPEATED_ERROR_WINDOW_MS / 1000
      });
    }

    // Critical errors always trigger alerts
    if (error.severity === ERROR_SEVERITY.CRITICAL) {
      this.triggerCriticalAlert('CRITICAL_ERROR', error);
    }
  }

  /**
   * Trigger a standard alert
   * @param {string} alertType - Type of alert
   * @param {Object} data - Alert data
   */
  triggerAlert(alertType, data) {
    const alertKey = `${alertType}_${Math.floor(Date.now() / 60000)}`; // One alert per minute per type
    
    if (this.alertsSent.has(alertKey)) {
      return; // Already sent this alert recently
    }

    this.alertsSent.set(alertKey, true);
    
    // Clean up old alert keys
    setTimeout(() => this.alertsSent.delete(alertKey), 60000);

    logger.warn(`🔔 ALERT: ${alertType}`, {
      alertType,
      data,
      timestamp: new Date()
    });

    logSecurityEvent(`registration_alert_${alertType.toLowerCase()}`, data, 'medium');

    // In production, this would send to external alerting service
    // (e.g., PagerDuty, Slack, email)
    this.notifyAdmins(alertType, data);
  }

  /**
   * Trigger a critical alert
   * @param {string} alertType - Type of alert
   * @param {Object} data - Alert data
   */
  triggerCriticalAlert(alertType, data) {
    logger.error(`🚨 CRITICAL ALERT: ${alertType}`, {
      alertType,
      data,
      timestamp: new Date()
    });

    logSecurityEvent(`registration_critical_alert_${alertType.toLowerCase()}`, data, 'critical');

    // In production, this would trigger immediate notification
    this.notifyAdmins(alertType, data, true);
  }

  /**
   * Notify administrators of alerts
   * @param {string} alertType - Type of alert
   * @param {Object} data - Alert data
   * @param {boolean} critical - Whether this is a critical alert
   */
  notifyAdmins(alertType, data, critical = false) {
    // Log notification for now (in production, integrate with notification service)
    const notification = {
      type: critical ? 'CRITICAL_ALERT' : 'ALERT',
      alertType,
      data,
      timestamp: new Date(),
      requiresAction: critical
    };

    logger.info('Admin notification queued', notification);

    // TODO: Integrate with actual notification service
    // - Send email to admin
    // - Send Slack notification
    // - Create admin dashboard notification
  }

  /**
   * Sanitize context to remove sensitive data
   * @param {Object} context - Context object
   * @returns {Object} Sanitized context
   */
  sanitizeContext(context) {
    if (!context || typeof context !== 'object') return {};

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'credential'];
    const sanitized = { ...context };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Group errors by category
   * @param {Array} errors - Array of errors
   * @returns {Object} Errors grouped by category
   */
  groupByCategory(errors) {
    return errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Update aggregated statistics
   */
  updateStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    this.stats.lastHourErrors = this.errors.filter(
      e => e.timestamp.getTime() > oneHourAgo
    ).length;

    this.stats.lastDayErrors = this.errors.filter(
      e => e.timestamp.getTime() > oneDayAgo
    ).length;

    this.stats.lastUpdated = new Date();

    logger.debug('Registration error stats updated', this.stats);
  }

  /**
   * Clean up old errors to prevent memory leaks
   */
  cleanupOldErrors() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // Keep 7 days
    const beforeCount = this.errors.length;
    
    this.errors = this.errors.filter(e => e.timestamp.getTime() > cutoff);
    
    const removedCount = beforeCount - this.errors.length;
    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} old registration errors`);
    }
  }

  /**
   * Get current error statistics
   * @returns {Object} Error statistics
   */
  getStats() {
    this.updateStats();
    return {
      ...this.stats,
      recentErrors: this.errors.slice(-10).map(e => ({
        id: e.id,
        category: e.category,
        code: e.code,
        message: e.message,
        severity: e.severity,
        timestamp: e.timestamp
      })),
      consecutiveEmailFailures: this.consecutiveEmailFailures
    };
  }

  /**
   * Get errors by category
   * @param {string} category - Error category
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array} Errors in the category
   */
  getErrorsByCategory(category, limit = 50) {
    return this.errors
      .filter(e => e.category === category)
      .slice(-limit)
      .map(e => ({
        id: e.id,
        code: e.code,
        message: e.message,
        severity: e.severity,
        context: e.context,
        timestamp: e.timestamp
      }));
  }

  /**
   * Get error rate for a specific time window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} Error rate statistics
   */
  getErrorRate(windowMs = 60 * 60 * 1000) {
    const cutoff = Date.now() - windowMs;
    const recentErrors = this.errors.filter(e => e.timestamp.getTime() > cutoff);

    return {
      totalErrors: recentErrors.length,
      errorsByCategory: this.groupByCategory(recentErrors),
      errorsBySeverity: recentErrors.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {}),
      windowMs,
      windowDescription: `Last ${windowMs / 60000} minutes`
    };
  }

  /**
   * Mark an error as resolved
   * @param {string} errorId - Error ID
   * @param {string} resolution - Resolution description
   */
  resolveError(errorId, resolution = '') {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;
      error.resolvedAt = new Date();
      
      logger.info('Registration error resolved', {
        errorId,
        resolution
      });
    }
  }

  /**
   * Export error data for analysis
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Exported error data
   */
  exportErrors(startDate, endDate) {
    const filteredErrors = this.errors.filter(e => 
      e.timestamp >= startDate && e.timestamp <= endDate
    );

    return {
      exportedAt: new Date(),
      dateRange: { startDate, endDate },
      totalErrors: filteredErrors.length,
      errorsByCategory: this.groupByCategory(filteredErrors),
      errors: filteredErrors.map(e => ({
        id: e.id,
        category: e.category,
        code: e.code,
        message: e.message,
        severity: e.severity,
        timestamp: e.timestamp,
        resolved: e.resolved
      }))
    };
  }

  /**
   * Cleanup resources on shutdown
   */
  shutdown() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    logger.info('Registration error monitoring service shut down');
  }
}

// Create singleton instance
const registrationErrorMonitoringService = new RegistrationErrorMonitoringService();

// Export service and constants
module.exports = {
  registrationErrorMonitoringService,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ALERT_THRESHOLDS
};
