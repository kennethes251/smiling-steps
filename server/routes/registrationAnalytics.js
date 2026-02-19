/**
 * Registration Analytics Routes
 * 
 * Provides API endpoints for registration analytics and insights.
 * Admin-only access.
 * 
 * @module routes/registrationAnalytics
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const registrationAnalyticsService = require('../services/registrationAnalyticsService');
const { logger } = require('../utils/logger');

// Admin-only middleware
const adminOnly = requireRole('admin');

/**
 * @route   GET /api/registration-analytics/dashboard
 * @desc    Get comprehensive analytics dashboard data
 * @access  Admin only
 */
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    const dashboardData = await registrationAnalyticsService.getDashboardData();
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Failed to get analytics dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics dashboard'
    });
  }
});

/**
 * @route   GET /api/registration-analytics/verification-rates
 * @desc    Get email verification success rates
 * @access  Admin only
 */
router.get('/verification-rates', auth, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const rates = await registrationAnalyticsService.getVerificationSuccessRates({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    logger.error('Failed to get verification rates', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve verification rates'
    });
  }
});

/**
 * @route   GET /api/registration-analytics/completion-rates
 * @desc    Get registration completion rates
 * @access  Admin only
 */
router.get('/completion-rates', auth, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const rates = await registrationAnalyticsService.getRegistrationCompletionRates({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    logger.error('Failed to get completion rates', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve completion rates'
    });
  }
});

/**
 * @route   GET /api/registration-analytics/drop-off
 * @desc    Get user drop-off analysis
 * @access  Admin only
 */
router.get('/drop-off', auth, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const analysis = await registrationAnalyticsService.getUserDropOffAnalysis({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: analysis
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
 * @route   GET /api/registration-analytics/trends
 * @desc    Get registration trends over time
 * @access  Admin only
 */
router.get('/trends', auth, adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const trends = await registrationAnalyticsService.getRegistrationTrends({
      days: parseInt(days)
    });
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Failed to get registration trends', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve registration trends'
    });
  }
});

/**
 * @route   GET /api/registration-analytics/health-score
 * @desc    Get registration system health score
 * @access  Admin only
 */
router.get('/health-score', auth, adminOnly, async (req, res) => {
  try {
    const dashboardData = await registrationAnalyticsService.getDashboardData();
    
    res.json({
      success: true,
      data: {
        healthScore: dashboardData.healthScore,
        generatedAt: dashboardData.generatedAt
      }
    });
  } catch (error) {
    logger.error('Failed to get health score', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve health score'
    });
  }
});

/**
 * @route   POST /api/registration-analytics/refresh
 * @desc    Force refresh analytics cache
 * @access  Admin only
 */
router.post('/refresh', auth, adminOnly, async (req, res) => {
  try {
    registrationAnalyticsService.clearCache();
    const dashboardData = await registrationAnalyticsService.getDashboardData();
    
    res.json({
      success: true,
      message: 'Analytics cache refreshed',
      data: dashboardData
    });
  } catch (error) {
    logger.error('Failed to refresh analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to refresh analytics'
    });
  }
});

module.exports = router;
