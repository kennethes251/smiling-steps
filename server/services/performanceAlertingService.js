/**
 * Performance Alerting Service
 * 
 * Monitors performance metrics and sends alerts when thresholds are exceeded
 * Integrates with notification service for email/SMS alerts
 */

const performanceMetricsService = require('./performanceMetricsService');
const { logger } = require('../utils/logger');

class PerformanceAlertingService {
  constructor() {
    // Alert thresholds (configurable via environment variables)
    this.thresholds = {
      responseTime: {
        bookingPage: parseInt(process.env.ALERT_THRESHOLD_BOOKING_PAGE) || 2000, // 2 seconds
        bookingSubmission: parseInt(process.env.ALERT_THRESHOLD_BOOKING_SUBMISSION) || 1000, // 1 second
        mpesaInitiation: parseInt(process.env.ALERT_THRESHOLD_MPESA) || 3000 // 3 seconds
      },
      errorRate: {
        general: parseFloat(process.env.ALERT_THRESHOLD_ERROR_RATE) || 5.0, // 5%
        payment: parseFloat(process.env.ALERT_THRESHOLD_PAYMENT_ERROR_RATE) || 10.0 // 10%
      },
      paymentFailure: {
        consecutiveFailures: parseInt(process.env.ALERT_THRESHOLD_CONSECUTIVE_PAYMENT_FAILURES) || 5,
        failureRateWindow: parseInt(process.env.ALERT_THRESHOLD_PAYMENT_FAILURE_WINDOW) || 60 * 60 * 1000 // 1 hour
      },
      bookingConversion: {
        minimumRate: parseFloat(process.env.ALERT_THRESHOLD_MIN_CONVERSION_RATE) || 20.0 // 20%
      }
    };
    
    // Alert state tracking
    this.alertState = {
      lastAlerts: {},
      consecutivePaymentFailures: 0,
      alertCooldowns: {} // Prevent spam alerts
    };
    
    // Alert cooldown period (5 minutes)
    this.alertCooldownPeriod = 5 * 60 * 1000;
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Check performance metrics every minute
    setInterval(() => {
      this.checkPerformanceThresholds();
    }, 60 * 1000);
    
    // Check payment failures every 30 seconds (more frequent for critical issues)
    setInterval(() => {
      this.checkPaymentFailures();
    }, 30 * 1000);
    
    logger.info('Performance alerting service started', { thresholds: this.thresholds });
  }

  /**
   * Check all performance thresholds
   */
  async checkPerformanceThresholds() {
    try {
      await this.checkResponseTimeThresholds();
      await this.checkErrorRateThresholds();
      await this.checkBookingConversionThresholds();
    } catch (error) {
      logger.error('Error checking performance thresholds', { error: error.message });
    }
  }

  /**
   * Check response time thresholds
   */
  async checkResponseTimeThresholds() {
    const avgResponseTimes = performanceMetricsService.calculateAverageResponseTimes(15 * 60 * 1000); // 15 minutes
    
    // Check booking page response time
    if (avgResponseTimes.bookingPage > this.thresholds.responseTime.bookingPage) {
      await this.sendAlert('response_time_booking_page', {
        type: 'Response Time Alert',
        severity: 'HIGH',
        message: `Booking page response time exceeded threshold`,
        details: {
          currentResponseTime: `${avgResponseTimes.bookingPage.toFixed(2)}ms`,
          threshold: `${this.thresholds.responseTime.bookingPage}ms`,
          endpoint: 'Booking Page Load'
        }
      });
    }
    
    // Check booking submission response time
    if (avgResponseTimes.bookingSubmission > this.thresholds.responseTime.bookingSubmission) {
      await this.sendAlert('response_time_booking_submission', {
        type: 'Response Time Alert',
        severity: 'HIGH',
        message: `Booking submission response time exceeded threshold`,
        details: {
          currentResponseTime: `${avgResponseTimes.bookingSubmission.toFixed(2)}ms`,
          threshold: `${this.thresholds.responseTime.bookingSubmission}ms`,
          endpoint: 'Booking Submission'
        }
      });
    }
    
    // Check M-Pesa initiation response time
    if (avgResponseTimes.mpesaInitiation > this.thresholds.responseTime.mpesaInitiation) {
      await this.sendAlert('response_time_mpesa', {
        type: 'Response Time Alert',
        severity: 'CRITICAL',
        message: `M-Pesa payment initiation response time exceeded threshold`,
        details: {
          currentResponseTime: `${avgResponseTimes.mpesaInitiation.toFixed(2)}ms`,
          threshold: `${this.thresholds.responseTime.mpesaInitiation}ms`,
          endpoint: 'M-Pesa Payment Initiation'
        }
      });
    }
  }

  /**
   * Check error rate thresholds
   */
  async checkErrorRateThresholds() {
    // Calculate general error rate from response times (assuming errors are tracked)
    const metrics = performanceMetricsService.getMetricsSummary();
    
    // Check payment error rate
    const paymentSuccessRate = metrics.paymentSuccessRate;
    const paymentErrorRate = 100 - paymentSuccessRate;
    
    if (paymentErrorRate > this.thresholds.errorRate.payment) {
      await this.sendAlert('payment_error_rate', {
        type: 'Payment Error Rate Alert',
        severity: 'CRITICAL',
        message: `Payment error rate exceeded threshold`,
        details: {
          currentErrorRate: `${paymentErrorRate.toFixed(2)}%`,
          threshold: `${this.thresholds.errorRate.payment}%`,
          successRate: `${paymentSuccessRate.toFixed(2)}%`
        }
      });
    }
  }

  /**
   * Check booking conversion thresholds
   */
  async checkBookingConversionThresholds() {
    const conversionRate = performanceMetricsService.calculateBookingConversionRate(2 * 60 * 60 * 1000); // 2 hours
    
    if (conversionRate < this.thresholds.bookingConversion.minimumRate) {
      await this.sendAlert('booking_conversion_low', {
        type: 'Booking Conversion Alert',
        severity: 'MEDIUM',
        message: `Booking conversion rate below threshold`,
        details: {
          currentConversionRate: `${conversionRate.toFixed(2)}%`,
          threshold: `${this.thresholds.bookingConversion.minimumRate}%`,
          timeWindow: '2 hours'
        }
      });
    }
  }

  /**
   * Check for consecutive payment failures
   */
  async checkPaymentFailures() {
    const recentPayments = performanceMetricsService.metrics.paymentSuccessRates
      .filter(p => p.timestamp >= new Date(Date.now() - 10 * 60 * 1000)) // Last 10 minutes
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    // Count consecutive failures from the most recent payments
    let consecutiveFailures = 0;
    for (const payment of recentPayments) {
      if (!payment.success) {
        consecutiveFailures++;
      } else {
        break; // Stop at first success
      }
    }
    
    // Alert on consecutive failures
    if (consecutiveFailures >= this.thresholds.paymentFailure.consecutiveFailures) {
      await this.sendAlert('consecutive_payment_failures', {
        type: 'Payment Failure Alert',
        severity: 'CRITICAL',
        message: `Multiple consecutive payment failures detected`,
        details: {
          consecutiveFailures,
          threshold: this.thresholds.paymentFailure.consecutiveFailures,
          timeWindow: '10 minutes',
          action: 'Immediate investigation required'
        }
      });
    }
  }

  /**
   * Send alert with cooldown protection
   */
  async sendAlert(alertType, alertData) {
    const now = Date.now();
    const lastAlert = this.alertCooldowns[alertType];
    
    // Check cooldown
    if (lastAlert && (now - lastAlert) < this.alertCooldownPeriod) {
      logger.debug('Alert suppressed due to cooldown', { alertType, cooldownRemaining: this.alertCooldownPeriod - (now - lastAlert) });
      return;
    }
    
    // Update cooldown
    this.alertCooldowns[alertType] = now;
    
    try {
      // Log the alert
      logger.warn('Performance alert triggered', {
        alertType,
        ...alertData,
        timestamp: new Date().toISOString()
      });
      
      // Send notification (integrate with existing notification service)
      await this.sendNotification(alertData);
      
      // Store alert in metrics for dashboard
      this.storeAlert(alertType, alertData);
      
    } catch (error) {
      logger.error('Failed to send performance alert', { 
        alertType, 
        error: error.message 
      });
    }
  }

  /**
   * Send notification via email/SMS
   */
  async sendNotification(alertData) {
    try {
      // Try to use existing notification service
      const notificationService = require('./notificationService');
      
      const adminEmails = process.env.ADMIN_ALERT_EMAILS?.split(',') || ['admin@smilingsteps.co.ke'];
      
      const emailContent = this.formatAlertEmail(alertData);
      
      for (const email of adminEmails) {
        await notificationService.sendEmail(
          email.trim(),
          `[ALERT] ${alertData.type} - ${alertData.severity}`,
          emailContent
        );
      }
      
      // Send SMS for critical alerts
      if (alertData.severity === 'CRITICAL') {
        const adminPhones = process.env.ADMIN_ALERT_PHONES?.split(',') || [];
        const smsContent = this.formatAlertSMS(alertData);
        
        for (const phone of adminPhones) {
          try {
            await notificationService.sendSMS(phone.trim(), smsContent);
          } catch (smsError) {
            logger.warn('Failed to send SMS alert', { phone, error: smsError.message });
          }
        }
      }
      
    } catch (error) {
      logger.error('Failed to send alert notification', { error: error.message });
      
      // Fallback: just log the alert prominently
      console.error('🚨 PERFORMANCE ALERT 🚨');
      console.error(JSON.stringify(alertData, null, 2));
    }
  }

  /**
   * Format alert for email
   */
  formatAlertEmail(alertData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Alert</title>
</head>
<body>
    <h2 style="color: ${alertData.severity === 'CRITICAL' ? '#d32f2f' : alertData.severity === 'HIGH' ? '#f57c00' : '#1976d2'};">
        🚨 ${alertData.type}
    </h2>
    
    <p><strong>Severity:</strong> ${alertData.severity}</p>
    <p><strong>Message:</strong> ${alertData.message}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    
    <h3>Details:</h3>
    <ul>
        ${Object.entries(alertData.details || {}).map(([key, value]) => 
          `<li><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${value}</li>`
        ).join('')}
    </ul>
    
    <hr>
    <p><em>This is an automated alert from the Smiling Steps performance monitoring system.</em></p>
    <p><em>Please investigate and take appropriate action.</em></p>
</body>
</html>
    `.trim();
  }

  /**
   * Format alert for SMS
   */
  formatAlertSMS(alertData) {
    return `ALERT: ${alertData.type} - ${alertData.severity}. ${alertData.message}. Check admin dashboard immediately.`;
  }

  /**
   * Store alert for dashboard display
   */
  storeAlert(alertType, alertData) {
    if (!this.alertState.recentAlerts) {
      this.alertState.recentAlerts = [];
    }
    
    this.alertState.recentAlerts.push({
      id: `${alertType}_${Date.now()}`,
      type: alertType,
      ...alertData,
      timestamp: new Date(),
      acknowledged: false
    });
    
    // Keep only last 100 alerts
    if (this.alertState.recentAlerts.length > 100) {
      this.alertState.recentAlerts = this.alertState.recentAlerts.slice(-100);
    }
  }

  /**
   * Get recent alerts for dashboard
   */
  getRecentAlerts(limit = 20) {
    return (this.alertState.recentAlerts || [])
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alertState.recentAlerts?.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      logger.info('Alert acknowledged', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Alert thresholds updated', { thresholds: this.thresholds });
  }

  /**
   * Get current alert configuration
   */
  getAlertConfiguration() {
    return {
      thresholds: this.thresholds,
      cooldownPeriod: this.alertCooldownPeriod,
      monitoringStatus: 'active',
      recentAlertsCount: this.alertState.recentAlerts?.length || 0
    };
  }
}

// Create singleton instance
const performanceAlertingService = new PerformanceAlertingService();

module.exports = performanceAlertingService;