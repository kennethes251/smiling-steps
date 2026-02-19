/**
 * Performance Metrics Collection Service
 * 
 * Tracks booking conversion rates, completion times, and payment success rates
 * Stores metrics in time-series format for analysis and alerting
 */

const { logger } = require('../utils/logger');

class PerformanceMetricsService {
  constructor() {
    // In-memory storage for metrics (in production, use Redis or time-series DB)
    this.metrics = {
      bookingConversion: [],
      bookingCompletionTimes: [],
      paymentSuccessRates: [],
      responseTimesBookingPage: [],
      responseTimesBookingSubmission: [],
      responseTimesMpesaInitiation: []
    };
    
    // Aggregated stats cache
    this.aggregatedStats = {
      lastUpdated: null,
      bookingConversionRate: 0,
      averageBookingCompletionTime: 0,
      paymentSuccessRate: 0,
      averageResponseTimes: {
        bookingPage: 0,
        bookingSubmission: 0,
        mpesaInitiation: 0
      }
    };
    
    // Update aggregated stats every 5 minutes
    setInterval(() => {
      this.updateAggregatedStats();
    }, 5 * 60 * 1000);
  }

  /**
   * Track booking funnel step
   */
  trackBookingStep(userId, step, timestamp = new Date()) {
    const metric = {
      userId,
      step, // 'started', 'therapist_selected', 'time_selected', 'submitted', 'completed'
      timestamp,
      sessionId: `${userId}_${Date.now()}`
    };
    
    this.metrics.bookingConversion.push(metric);
    
    // Keep only last 24 hours of data
    this.cleanupOldMetrics('bookingConversion', 24 * 60 * 60 * 1000);
    
    logger.info('Booking step tracked', { userId, step, timestamp });
  }

  /**
   * Track booking completion time
   */
  trackBookingCompletion(userId, startTime, endTime, success = true) {
    const completionTime = endTime - startTime;
    
    const metric = {
      userId,
      startTime,
      endTime,
      completionTime,
      success,
      timestamp: new Date()
    };
    
    this.metrics.bookingCompletionTimes.push(metric);
    
    // Keep only last 7 days of data
    this.cleanupOldMetrics('bookingCompletionTimes', 7 * 24 * 60 * 60 * 1000);
    
    logger.info('Booking completion tracked', { 
      userId, 
      completionTime: `${completionTime}ms`, 
      success 
    });
  }

  /**
   * Track payment attempt and result
   */
  trackPaymentAttempt(sessionId, userId, amount, success = false, errorCode = null) {
    const metric = {
      sessionId,
      userId,
      amount,
      success,
      errorCode,
      timestamp: new Date()
    };
    
    this.metrics.paymentSuccessRates.push(metric);
    
    // Keep only last 30 days of payment data
    this.cleanupOldMetrics('paymentSuccessRates', 30 * 24 * 60 * 60 * 1000);
    
    logger.info('Payment attempt tracked', { 
      sessionId, 
      userId, 
      amount, 
      success, 
      errorCode 
    });
  }

  /**
   * Track response times for different endpoints
   */
  trackResponseTime(endpoint, responseTime, timestamp = new Date()) {
    const metric = {
      endpoint,
      responseTime,
      timestamp
    };
    
    // Store in appropriate bucket based on endpoint
    if (endpoint.includes('booking') && endpoint.includes('page')) {
      this.metrics.responseTimesBookingPage.push(metric);
      this.cleanupOldMetrics('responseTimesBookingPage', 24 * 60 * 60 * 1000);
    } else if (endpoint.includes('booking') && endpoint.includes('submit')) {
      this.metrics.responseTimesBookingSubmission.push(metric);
      this.cleanupOldMetrics('responseTimesBookingSubmission', 24 * 60 * 60 * 1000);
    } else if (endpoint.includes('mpesa')) {
      this.metrics.responseTimesMpesaInitiation.push(metric);
      this.cleanupOldMetrics('responseTimesMpesaInitiation', 24 * 60 * 60 * 1000);
    }
    
    logger.debug('Response time tracked', { endpoint, responseTime: `${responseTime}ms` });
  }

  /**
   * Calculate booking conversion rate
   */
  calculateBookingConversionRate(timeWindow = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentMetrics = this.metrics.bookingConversion.filter(
      m => m.timestamp >= cutoff
    );
    
    // Group by user session
    const sessions = {};
    recentMetrics.forEach(metric => {
      if (!sessions[metric.userId]) {
        sessions[metric.userId] = [];
      }
      sessions[metric.userId].push(metric.step);
    });
    
    const totalSessions = Object.keys(sessions).length;
    const completedSessions = Object.values(sessions).filter(
      steps => steps.includes('completed')
    ).length;
    
    return totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  }

  /**
   * Calculate average booking completion time
   */
  calculateAverageBookingCompletionTime(timeWindow = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentMetrics = this.metrics.bookingCompletionTimes.filter(
      m => m.timestamp >= cutoff && m.success
    );
    
    if (recentMetrics.length === 0) return 0;
    
    const totalTime = recentMetrics.reduce((sum, m) => sum + m.completionTime, 0);
    return totalTime / recentMetrics.length;
  }

  /**
   * Calculate payment success rate
   */
  calculatePaymentSuccessRate(timeWindow = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentMetrics = this.metrics.paymentSuccessRates.filter(
      m => m.timestamp >= cutoff
    );
    
    if (recentMetrics.length === 0) return 0;
    
    const successfulPayments = recentMetrics.filter(m => m.success).length;
    return (successfulPayments / recentMetrics.length) * 100;
  }

  /**
   * Calculate average response times
   */
  calculateAverageResponseTimes(timeWindow = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timeWindow);
    
    const calculateAvg = (metrics) => {
      const recent = metrics.filter(m => m.timestamp >= cutoff);
      if (recent.length === 0) return 0;
      return recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
    };
    
    return {
      bookingPage: calculateAvg(this.metrics.responseTimesBookingPage),
      bookingSubmission: calculateAvg(this.metrics.responseTimesBookingSubmission),
      mpesaInitiation: calculateAvg(this.metrics.responseTimesMpesaInitiation)
    };
  }

  /**
   * Update aggregated statistics
   */
  updateAggregatedStats() {
    try {
      this.aggregatedStats = {
        lastUpdated: new Date(),
        bookingConversionRate: this.calculateBookingConversionRate(),
        averageBookingCompletionTime: this.calculateAverageBookingCompletionTime(),
        paymentSuccessRate: this.calculatePaymentSuccessRate(),
        averageResponseTimes: this.calculateAverageResponseTimes()
      };
      
      logger.debug('Aggregated stats updated', this.aggregatedStats);
    } catch (error) {
      logger.error('Failed to update aggregated stats', { error: error.message });
    }
  }

  /**
   * Get current metrics summary
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
        bookingConversion: this.metrics.bookingConversion.length,
        bookingCompletionTimes: this.metrics.bookingCompletionTimes.length,
        paymentSuccessRates: this.metrics.paymentSuccessRates.length,
        responseTimesBookingPage: this.metrics.responseTimesBookingPage.length,
        responseTimesBookingSubmission: this.metrics.responseTimesBookingSubmission.length,
        responseTimesMpesaInitiation: this.metrics.responseTimesMpesaInitiation.length
      }
    };
  }

  /**
   * Get detailed metrics for a specific time range
   */
  getDetailedMetrics(startTime, endTime) {
    const filterByTimeRange = (metrics) => 
      metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
    
    return {
      bookingConversion: filterByTimeRange(this.metrics.bookingConversion),
      bookingCompletionTimes: filterByTimeRange(this.metrics.bookingCompletionTimes),
      paymentSuccessRates: filterByTimeRange(this.metrics.paymentSuccessRates),
      responseTimesBookingPage: filterByTimeRange(this.metrics.responseTimesBookingPage),
      responseTimesBookingSubmission: filterByTimeRange(this.metrics.responseTimesBookingSubmission),
      responseTimesMpesaInitiation: filterByTimeRange(this.metrics.responseTimesMpesaInitiation)
    };
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics(metricType, maxAge) {
    const cutoff = new Date(Date.now() - maxAge);
    this.metrics[metricType] = this.metrics[metricType].filter(
      m => m.timestamp >= cutoff
    );
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format = 'json') {
    const data = {
      exportedAt: new Date(),
      summary: this.getMetricsSummary(),
      rawMetrics: this.metrics
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    // Could add CSV export here
    return data;
  }
}

// Create singleton instance
const performanceMetricsService = new PerformanceMetricsService();

module.exports = performanceMetricsService;