/**
 * Performance Metrics API Routes
 * 
 * Provides endpoints for accessing performance metrics and analytics
 */

const express = require('express');
const router = express.Router();
const performanceMetricsService = require('../services/performanceMetricsService');
const performanceAlertingService = require('../services/performanceAlertingService');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { logger } = require('../utils/logger');

/**
 * GET /api/performance-metrics/summary
 * Get current performance metrics summary
 * Admin only
 */
router.get('/summary', auth, requireRole('admin'), async (req, res) => {
  try {
    const summary = performanceMetricsService.getMetricsSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to get performance metrics summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics'
    });
  }
});

/**
 * GET /api/performance-metrics/detailed
 * Get detailed metrics for a specific time range
 * Admin only
 */
router.get('/detailed', auth, requireRole('admin'), async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime query parameters are required'
      });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format for startTime or endTime'
      });
    }
    
    const metrics = performanceMetricsService.getDetailedMetrics(start, end);
    
    res.json({
      success: true,
      data: {
        timeRange: { startTime: start, endTime: end },
        metrics
      }
    });
  } catch (error) {
    logger.error('Failed to get detailed performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve detailed metrics'
    });
  }
});

/**
 * GET /api/performance-metrics/booking-funnel
 * Get booking funnel analytics
 * Admin only
 */
router.get('/booking-funnel', auth, requireRole('admin'), async (req, res) => {
  try {
    const { timeWindow = 24 } = req.query; // Default to 24 hours
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const conversionRate = performanceMetricsService.calculateBookingConversionRate(timeWindowMs);
    const avgCompletionTime = performanceMetricsService.calculateAverageBookingCompletionTime(timeWindowMs);
    
    // Get funnel step breakdown
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentMetrics = performanceMetricsService.metrics.bookingConversion.filter(
      m => m.timestamp >= cutoff
    );
    
    // Count steps
    const stepCounts = {
      started: 0,
      therapist_selected: 0,
      time_selected: 0,
      submitted: 0,
      completed: 0
    };
    
    recentMetrics.forEach(metric => {
      if (stepCounts.hasOwnProperty(metric.step)) {
        stepCounts[metric.step]++;
      }
    });
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} hours`,
        conversionRate: `${conversionRate.toFixed(2)}%`,
        averageCompletionTime: `${(avgCompletionTime / 1000).toFixed(2)} seconds`,
        funnelSteps: stepCounts,
        dropoffRates: {
          'started_to_submitted': stepCounts.started > 0 ? 
            `${(((stepCounts.started - stepCounts.submitted) / stepCounts.started) * 100).toFixed(2)}%` : '0%',
          'submitted_to_completed': stepCounts.submitted > 0 ? 
            `${(((stepCounts.submitted - stepCounts.completed) / stepCounts.submitted) * 100).toFixed(2)}%` : '0%'
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get booking funnel analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve booking funnel analytics'
    });
  }
});

/**
 * GET /api/performance-metrics/payment-analytics
 * Get payment success rate analytics
 * Admin only
 */
router.get('/payment-analytics', auth, requireRole('admin'), async (req, res) => {
  try {
    const { timeWindow = 24 } = req.query; // Default to 24 hours
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const successRate = performanceMetricsService.calculatePaymentSuccessRate(timeWindowMs);
    
    // Get payment breakdown
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentPayments = performanceMetricsService.metrics.paymentSuccessRates.filter(
      m => m.timestamp >= cutoff
    );
    
    const totalPayments = recentPayments.length;
    const successfulPayments = recentPayments.filter(p => p.success).length;
    const failedPayments = totalPayments - successfulPayments;
    
    // Error code breakdown
    const errorCodes = {};
    recentPayments.filter(p => !p.success).forEach(p => {
      const code = p.errorCode || 'unknown';
      errorCodes[code] = (errorCodes[code] || 0) + 1;
    });
    
    // Amount statistics
    const amounts = recentPayments.map(p => p.amount).filter(a => a);
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    const avgAmount = amounts.length > 0 ? totalAmount / amounts.length : 0;
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} hours`,
        successRate: `${successRate.toFixed(2)}%`,
        totalPayments,
        successfulPayments,
        failedPayments,
        errorCodeBreakdown: errorCodes,
        amountStatistics: {
          totalAmount,
          averageAmount: avgAmount.toFixed(2),
          currency: 'KES'
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get payment analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment analytics'
    });
  }
});

/**
 * GET /api/performance-metrics/response-times
 * Get response time analytics
 * Admin only
 */
router.get('/response-times', auth, requireRole('admin'), async (req, res) => {
  try {
    const { timeWindow = 24 } = req.query; // Default to 24 hours
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const avgResponseTimes = performanceMetricsService.calculateAverageResponseTimes(timeWindowMs);
    
    // Get detailed response time statistics
    const cutoff = new Date(Date.now() - timeWindowMs);
    
    const getStats = (metrics) => {
      const recent = metrics.filter(m => m.timestamp >= cutoff);
      if (recent.length === 0) return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
      
      const times = recent.map(m => m.responseTime).sort((a, b) => a - b);
      return {
        count: times.length,
        avg: times.reduce((sum, t) => sum + t, 0) / times.length,
        min: times[0],
        max: times[times.length - 1],
        p95: times[Math.floor(times.length * 0.95)] || 0
      };
    };
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} hours`,
        averageResponseTimes: {
          bookingPage: `${avgResponseTimes.bookingPage.toFixed(2)}ms`,
          bookingSubmission: `${avgResponseTimes.bookingSubmission.toFixed(2)}ms`,
          mpesaInitiation: `${avgResponseTimes.mpesaInitiation.toFixed(2)}ms`
        },
        detailedStats: {
          bookingPage: getStats(performanceMetricsService.metrics.responseTimesBookingPage),
          bookingSubmission: getStats(performanceMetricsService.metrics.responseTimesBookingSubmission),
          mpesaInitiation: getStats(performanceMetricsService.metrics.responseTimesMpesaInitiation)
        },
        thresholds: {
          bookingPage: '2000ms',
          bookingSubmission: '1000ms',
          mpesaInitiation: '3000ms'
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get response time analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve response time analytics'
    });
  }
});

/**
 * GET /api/performance-metrics/export
 * Export performance metrics data
 * Admin only
 */
router.get('/export', auth, requireRole('admin'), async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const exportData = performanceMetricsService.exportMetrics(format);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="performance-metrics-${Date.now()}.json"`);
      res.send(exportData);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format. Currently only "json" is supported.'
      });
    }
  } catch (error) {
    logger.error('Failed to export performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export performance metrics'
    });
  }
});

/**
 * GET /api/performance-metrics/alerts
 * Get recent performance alerts
 * Admin only
 */
router.get('/alerts', auth, requireRole('admin'), async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const alerts = performanceAlertingService.getRecentAlerts(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        alerts,
        configuration: performanceAlertingService.getAlertConfiguration()
      }
    });
  } catch (error) {
    logger.error('Failed to get performance alerts', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance alerts'
    });
  }
});

/**
 * POST /api/performance-metrics/alerts/:alertId/acknowledge
 * Acknowledge a performance alert
 * Admin only
 */
router.post('/alerts/:alertId/acknowledge', auth, requireRole('admin'), async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledged = performanceAlertingService.acknowledgeAlert(alertId);
    
    if (acknowledged) {
      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * PUT /api/performance-metrics/alert-thresholds
 * Update alert thresholds
 * Admin only
 */
router.put('/alert-thresholds', auth, requireRole('admin'), async (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid thresholds object is required'
      });
    }
    
    performanceAlertingService.updateThresholds(thresholds);
    
    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      data: performanceAlertingService.getAlertConfiguration()
    });
  } catch (error) {
    logger.error('Failed to update alert thresholds', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update alert thresholds'
    });
  }
});

module.exports = router;