/**
 * Registration Performance Monitoring Routes
 * 
 * Provides API endpoints for accessing registration performance metrics.
 * These endpoints are admin-only and provide insights into registration
 * system performance and user behavior.
 * 
 * @module routes/registrationPerformance
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { 
  registrationPerformanceService,
  REGISTRATION_STEPS,
  USER_TYPES
} = require('../services/registrationPerformanceService');
const { logger } = require('../utils/logger');

// Admin-only middleware
const adminOnly = requireRole('admin');

/**
 * @route   GET /api/registration-performance/summary
 * @desc    Get registration performance metrics summary
 * @access  Admin only
 */
router.get('/summary', auth, adminOnly, async (req, res) => {
  try {
    const summary = registrationPerformanceService.getMetricsSummary();
    
    res.json({
      success: true,
      data: {
        ...summary,
        // Format times for readability
        formattedMetrics: {
          registrationCompletionRate: `${summary.registrationCompletionRate.toFixed(2)}%`,
          emailVerificationRate: `${summary.emailVerificationRate.toFixed(2)}%`,
          averageTimeToVerification: formatDuration(summary.averageTimeToVerification),
          averageApprovalTime: formatDuration(summary.averageApprovalTime)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get registration performance summary', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance summary'
    });
  }
});

/**
 * @route   GET /api/registration-performance/funnel
 * @desc    Get registration funnel analytics
 * @access  Admin only
 */
router.get('/funnel', auth, adminOnly, async (req, res) => {
  try {
    const { timeWindow = 24 } = req.query; // Default 24 hours
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const funnelAnalytics = registrationPerformanceService.getFunnelAnalytics(timeWindowMs);
    
    res.json({
      success: true,
      data: {
        ...funnelAnalytics,
        steps: Object.values(REGISTRATION_STEPS),
        userTypes: Object.values(USER_TYPES)
      }
    });
  } catch (error) {
    logger.error('Failed to get funnel analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve funnel analytics'
    });
  }
});

/**
 * @route   GET /api/registration-performance/verification-rate
 * @desc    Get email verification rate analytics
 * @access  Admin only
 */
router.get('/verification-rate', auth, adminOnly, async (req, res) => {
  try {
    const { timeWindow = 24 } = req.query; // Default 24 hours
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const verificationRate = registrationPerformanceService.calculateEmailVerificationRate(timeWindowMs);
    const avgTimeToVerification = registrationPerformanceService.calculateAverageTimeToVerification(timeWindowMs);
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} hours`,
        verificationRate: `${verificationRate.toFixed(2)}%`,
        averageTimeToVerification: formatDuration(avgTimeToVerification),
        averageTimeToVerificationMs: avgTimeToVerification
      }
    });
  } catch (error) {
    logger.error('Failed to get verification rate', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve verification rate'
    });
  }
});

/**
 * @route   GET /api/registration-performance/completion-rate
 * @desc    Get registration completion rate analytics
 * @access  Admin only
 */
router.get('/completion-rate', auth, adminOnly, async (req, res) => {
  try {
    const { timeWindow = 24, userType } = req.query;
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const completionRate = registrationPerformanceService.calculateRegistrationCompletionRate(
      timeWindowMs, 
      userType || null
    );
    
    // Get rates by user type
    const clientRate = registrationPerformanceService.calculateRegistrationCompletionRate(
      timeWindowMs, 
      USER_TYPES.CLIENT
    );
    const therapistRate = registrationPerformanceService.calculateRegistrationCompletionRate(
      timeWindowMs, 
      USER_TYPES.THERAPIST
    );
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} hours`,
        overallCompletionRate: `${completionRate.toFixed(2)}%`,
        byUserType: {
          client: `${clientRate.toFixed(2)}%`,
          therapist: `${therapistRate.toFixed(2)}%`
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get completion rate', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve completion rate'
    });
  }
});

/**
 * @route   GET /api/registration-performance/approval-time
 * @desc    Get therapist approval processing time analytics
 * @access  Admin only
 */
router.get('/approval-time', auth, adminOnly, async (req, res) => {
  try {
    const { timeWindow = 30 } = req.query; // Default 30 days
    const timeWindowMs = parseInt(timeWindow) * 24 * 60 * 60 * 1000;
    
    const avgApprovalTime = registrationPerformanceService.calculateAverageApprovalTime(timeWindowMs);
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} days`,
        averageApprovalTime: formatDuration(avgApprovalTime),
        averageApprovalTimeMs: avgApprovalTime,
        // SLA targets
        slaTargets: {
          target: '48 hours',
          targetMs: 48 * 60 * 60 * 1000,
          withinSla: avgApprovalTime <= 48 * 60 * 60 * 1000
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get approval time analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve approval time analytics'
    });
  }
});

/**
 * @route   GET /api/registration-performance/drop-off
 * @desc    Get user drop-off analysis
 * @access  Admin only
 */
router.get('/drop-off', auth, adminOnly, async (req, res) => {
  try {
    const { timeWindow = 24 } = req.query; // Default 24 hours
    const timeWindowMs = parseInt(timeWindow) * 60 * 60 * 1000;
    
    const dropOffRates = registrationPerformanceService.calculateDropOffRates(timeWindowMs);
    
    // Format drop-off rates for readability
    const formattedDropOffRates = {};
    Object.entries(dropOffRates).forEach(([key, value]) => {
      formattedDropOffRates[key] = `${value.toFixed(2)}%`;
    });
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} hours`,
        dropOffRates: formattedDropOffRates,
        rawDropOffRates: dropOffRates,
        insights: generateDropOffInsights(dropOffRates)
      }
    });
  } catch (error) {
    logger.error('Failed to get drop-off analysis', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve drop-off analysis'
    });
  }
});

/**
 * @route   GET /api/registration-performance/detailed
 * @desc    Get detailed metrics for a specific time range
 * @access  Admin only
 */
router.get('/detailed', auth, adminOnly, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'startTime and endTime query parameters are required'
      });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for startTime or endTime'
      });
    }
    
    const metrics = registrationPerformanceService.getDetailedMetrics(start, end);
    
    res.json({
      success: true,
      data: {
        timeRange: { startTime: start, endTime: end },
        metrics
      }
    });
  } catch (error) {
    logger.error('Failed to get detailed metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve detailed metrics'
    });
  }
});

/**
 * @route   GET /api/registration-performance/export
 * @desc    Export registration performance metrics
 * @access  Admin only
 */
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const exportData = registrationPerformanceService.exportMetrics(format);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="registration-performance-${Date.now()}.json"`);
      res.send(exportData);
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported export format. Currently only "json" is supported.'
      });
    }
  } catch (error) {
    logger.error('Failed to export registration performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export metrics'
    });
  }
});

/**
 * @route   GET /api/registration-performance/health
 * @desc    Get registration system health based on performance metrics
 * @access  Admin only
 */
router.get('/health', auth, adminOnly, async (req, res) => {
  try {
    const summary = registrationPerformanceService.getMetricsSummary();
    
    // Determine health status based on metrics
    let status = 'healthy';
    const issues = [];
    const recommendations = [];
    
    // Check verification rate
    if (summary.emailVerificationRate < 50) {
      status = 'degraded';
      issues.push(`Low email verification rate: ${summary.emailVerificationRate.toFixed(2)}%`);
      recommendations.push('Review email deliverability and verification email content');
    }
    
    // Check completion rate
    if (summary.registrationCompletionRate < 70) {
      status = status === 'degraded' ? 'critical' : 'degraded';
      issues.push(`Low registration completion rate: ${summary.registrationCompletionRate.toFixed(2)}%`);
      recommendations.push('Review registration form UX and error handling');
    }
    
    // Check approval time (if > 72 hours)
    if (summary.averageApprovalTime > 72 * 60 * 60 * 1000) {
      issues.push(`Slow approval processing: ${formatDuration(summary.averageApprovalTime)}`);
      recommendations.push('Review admin approval workflow and staffing');
    }
    
    // Check drop-off rates
    const highDropOffSteps = Object.entries(summary.dropOffRates)
      .filter(([_, rate]) => rate > 30)
      .map(([step]) => step);
    
    if (highDropOffSteps.length > 0) {
      issues.push(`High drop-off at: ${highDropOffSteps.join(', ')}`);
      recommendations.push('Investigate user experience at high drop-off points');
    }
    
    res.json({
      success: true,
      data: {
        status,
        issues,
        recommendations,
        metrics: {
          registrationCompletionRate: `${summary.registrationCompletionRate.toFixed(2)}%`,
          emailVerificationRate: `${summary.emailVerificationRate.toFixed(2)}%`,
          averageTimeToVerification: formatDuration(summary.averageTimeToVerification),
          averageApprovalTime: formatDuration(summary.averageApprovalTime)
        },
        lastUpdated: summary.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Failed to get registration health status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve health status'
    });
  }
});

/**
 * Helper function to format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (!ms || ms === 0) return '0 seconds';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Generate insights from drop-off rates
 * @param {Object} dropOffRates - Drop-off rates by step
 * @returns {Array} Array of insight strings
 */
function generateDropOffInsights(dropOffRates) {
  const insights = [];
  
  Object.entries(dropOffRates).forEach(([step, rate]) => {
    if (rate > 50) {
      insights.push({
        severity: 'critical',
        step,
        message: `Critical drop-off at ${step.replace(/_/g, ' ')}: ${rate.toFixed(2)}% of users abandon at this step`
      });
    } else if (rate > 30) {
      insights.push({
        severity: 'warning',
        step,
        message: `High drop-off at ${step.replace(/_/g, ' ')}: ${rate.toFixed(2)}% of users abandon at this step`
      });
    } else if (rate > 15) {
      insights.push({
        severity: 'info',
        step,
        message: `Moderate drop-off at ${step.replace(/_/g, ' ')}: ${rate.toFixed(2)}%`
      });
    }
  });
  
  return insights;
}

module.exports = router;
