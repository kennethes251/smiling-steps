/**
 * Registration Monitoring Routes
 * 
 * Provides API endpoints for accessing registration error monitoring data.
 * These endpoints are admin-only and provide insights into registration
 * system health and error patterns.
 * 
 * @module routes/registrationMonitoring
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { 
  registrationErrorMonitoringService, 
  ERROR_CATEGORIES 
} = require('../services/registrationErrorMonitoringService');
const { logger } = require('../utils/logger');

// Admin-only middleware
const adminOnly = requireRole('admin');

/**
 * @route   GET /api/registration-monitoring/stats
 * @desc    Get registration error statistics
 * @access  Admin only
 */
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = registrationErrorMonitoringService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get registration monitoring stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monitoring statistics'
    });
  }
});

/**
 * @route   GET /api/registration-monitoring/errors
 * @desc    Get recent registration errors
 * @access  Admin only
 */
router.get('/errors', auth, adminOnly, async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    
    let errors;
    if (category && ERROR_CATEGORIES[category.toUpperCase()]) {
      errors = registrationErrorMonitoringService.getErrorsByCategory(
        ERROR_CATEGORIES[category.toUpperCase()],
        parseInt(limit)
      );
    } else {
      // Get all recent errors
      const stats = registrationErrorMonitoringService.getStats();
      errors = stats.recentErrors;
    }
    
    res.json({
      success: true,
      data: {
        errors,
        categories: Object.values(ERROR_CATEGORIES)
      }
    });
  } catch (error) {
    logger.error('Failed to get registration errors', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve errors'
    });
  }
});

/**
 * @route   GET /api/registration-monitoring/error-rate
 * @desc    Get error rate for a specific time window
 * @access  Admin only
 */
router.get('/error-rate', auth, adminOnly, async (req, res) => {
  try {
    const { window = 60 } = req.query; // Default 60 minutes
    const windowMs = parseInt(window) * 60 * 1000;
    
    const errorRate = registrationErrorMonitoringService.getErrorRate(windowMs);
    
    res.json({
      success: true,
      data: errorRate
    });
  } catch (error) {
    logger.error('Failed to get error rate', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve error rate'
    });
  }
});

/**
 * @route   POST /api/registration-monitoring/errors/:errorId/resolve
 * @desc    Mark an error as resolved
 * @access  Admin only
 */
router.post('/errors/:errorId/resolve', auth, adminOnly, async (req, res) => {
  try {
    const { errorId } = req.params;
    const { resolution } = req.body;
    
    registrationErrorMonitoringService.resolveError(errorId, resolution);
    
    res.json({
      success: true,
      message: 'Error marked as resolved'
    });
  } catch (error) {
    logger.error('Failed to resolve error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to resolve error'
    });
  }
});

/**
 * @route   GET /api/registration-monitoring/export
 * @desc    Export error data for analysis
 * @access  Admin only
 */
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const exportData = registrationErrorMonitoringService.exportErrors(start, end);
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    logger.error('Failed to export errors', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export error data'
    });
  }
});

/**
 * @route   GET /api/registration-monitoring/health
 * @desc    Get registration system health status
 * @access  Admin only
 */
router.get('/health', auth, adminOnly, async (req, res) => {
  try {
    const stats = registrationErrorMonitoringService.getStats();
    const errorRate = registrationErrorMonitoringService.getErrorRate(5 * 60 * 1000); // Last 5 minutes
    
    // Determine health status
    let status = 'healthy';
    let issues = [];
    
    if (stats.consecutiveEmailFailures >= 3) {
      status = 'critical';
      issues.push('Email service experiencing consecutive failures');
    }
    
    if (errorRate.totalErrors > 10) {
      status = status === 'critical' ? 'critical' : 'degraded';
      issues.push(`High error rate: ${errorRate.totalErrors} errors in last 5 minutes`);
    }
    
    if (stats.errorsBySeverity.critical > 0) {
      status = 'critical';
      issues.push(`${stats.errorsBySeverity.critical} critical errors detected`);
    }
    
    res.json({
      success: true,
      data: {
        status,
        issues,
        metrics: {
          totalErrors: stats.totalErrors,
          lastHourErrors: stats.lastHourErrors,
          lastDayErrors: stats.lastDayErrors,
          consecutiveEmailFailures: stats.consecutiveEmailFailures,
          recentErrorRate: errorRate.totalErrors
        },
        lastUpdated: stats.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Failed to get health status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve health status'
    });
  }
});

module.exports = router;
