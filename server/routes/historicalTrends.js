/**
 * Historical Trends API Routes
 * Provides endpoints for payment trend analysis and analytics
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  generateTrendAnalysis,
  generateDashboardAnalytics,
  generateComparativeAnalysis,
  exportTrendDataToCSV,
  TimePeriods,
  MetricTypes
} = require('../utils/historicalTrendAnalysis');

/**
 * @route   GET /api/trends/analytics
 * @desc    Get comprehensive dashboard analytics
 * @access  Admin only
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      startDate,
      endDate,
      period = TimePeriods.DAILY,
      clientId,
      psychologistId,
      sessionType
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD format' 
      });
    }

    if (start >= end) {
      return res.status(400).json({ 
        message: 'Start date must be before end date' 
      });
    }

    // Validate period
    if (!Object.values(TimePeriods).includes(period)) {
      return res.status(400).json({ 
        message: `Invalid period. Must be one of: ${Object.values(TimePeriods).join(', ')}` 
      });
    }

    // Build filters
    const filters = {};
    if (clientId) filters.clientId = clientId;
    if (psychologistId) filters.psychologistId = psychologistId;
    if (sessionType) filters.sessionType = sessionType;

    // Generate analytics
    const analytics = await generateDashboardAnalytics(startDate, endDate, period, filters);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error generating dashboard analytics:', error);
    res.status(500).json({ 
      message: 'Failed to generate analytics',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/trends/metric/:metric
 * @desc    Get trend analysis for a specific metric
 * @access  Admin only
 */
router.get('/metric/:metric', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { metric } = req.params;
    const {
      startDate,
      endDate,
      period = TimePeriods.DAILY,
      clientId,
      psychologistId,
      sessionType
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
    }

    // Validate metric
    if (!Object.values(MetricTypes).includes(metric)) {
      return res.status(400).json({ 
        message: `Invalid metric. Must be one of: ${Object.values(MetricTypes).join(', ')}` 
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD format' 
      });
    }

    if (start >= end) {
      return res.status(400).json({ 
        message: 'Start date must be before end date' 
      });
    }

    // Validate period
    if (!Object.values(TimePeriods).includes(period)) {
      return res.status(400).json({ 
        message: `Invalid period. Must be one of: ${Object.values(TimePeriods).join(', ')}` 
      });
    }

    // Build filters
    const filters = {};
    if (clientId) filters.clientId = clientId;
    if (psychologistId) filters.psychologistId = psychologistId;
    if (sessionType) filters.sessionType = sessionType;

    // Generate trend analysis
    const trendAnalysis = await generateTrendAnalysis(startDate, endDate, period, metric, filters);

    res.json({
      success: true,
      trendAnalysis
    });

  } catch (error) {
    console.error('Error generating trend analysis:', error);
    res.status(500).json({ 
      message: 'Failed to generate trend analysis',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/trends/compare
 * @desc    Get comparative analysis between two time periods
 * @access  Admin only
 */
router.get('/compare', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      period1Start,
      period1End,
      period2Start,
      period2End,
      clientId,
      psychologistId,
      sessionType
    } = req.query;

    // Validate required parameters
    if (!period1Start || !period1End || !period2Start || !period2End) {
      return res.status(400).json({ 
        message: 'All period dates are required (period1Start, period1End, period2Start, period2End)' 
      });
    }

    // Validate date formats
    const dates = [period1Start, period1End, period2Start, period2End].map(d => new Date(d));
    if (dates.some(d => isNaN(d.getTime()))) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD format' 
      });
    }

    // Validate date ranges
    if (dates[0] >= dates[1] || dates[2] >= dates[3]) {
      return res.status(400).json({ 
        message: 'Start dates must be before end dates for both periods' 
      });
    }

    // Build filters
    const filters = {};
    if (clientId) filters.clientId = clientId;
    if (psychologistId) filters.psychologistId = psychologistId;
    if (sessionType) filters.sessionType = sessionType;

    // Generate comparative analysis
    const comparison = await generateComparativeAnalysis(
      period1Start, period1End, 
      period2Start, period2End, 
      filters
    );

    res.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('Error generating comparative analysis:', error);
    res.status(500).json({ 
      message: 'Failed to generate comparative analysis',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/trends/export/:metric
 * @desc    Export trend data as CSV
 * @access  Admin only
 */
router.get('/export/:metric', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { metric } = req.params;
    const {
      startDate,
      endDate,
      period = TimePeriods.DAILY,
      clientId,
      psychologistId,
      sessionType
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
    }

    // Validate metric
    if (!Object.values(MetricTypes).includes(metric)) {
      return res.status(400).json({ 
        message: `Invalid metric. Must be one of: ${Object.values(MetricTypes).join(', ')}` 
      });
    }

    // Build filters
    const filters = {};
    if (clientId) filters.clientId = clientId;
    if (psychologistId) filters.psychologistId = psychologistId;
    if (sessionType) filters.sessionType = sessionType;

    // Generate trend analysis
    const trendAnalysis = await generateTrendAnalysis(startDate, endDate, period, metric, filters);

    // Export to CSV
    const csvData = exportTrendDataToCSV(trendAnalysis);

    // Set response headers for file download
    const filename = `mpesa-trend-${metric}-${startDate}-to-${endDate}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(csvData);

  } catch (error) {
    console.error('Error exporting trend data:', error);
    res.status(500).json({ 
      message: 'Failed to export trend data',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/trends/config
 * @desc    Get available configuration options for trend analysis
 * @access  Admin only
 */
router.get('/config', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    res.json({
      success: true,
      config: {
        timePeriods: Object.values(TimePeriods),
        metricTypes: Object.values(MetricTypes),
        timePeriodsDescription: {
          [TimePeriods.DAILY]: 'Daily aggregation',
          [TimePeriods.WEEKLY]: 'Weekly aggregation (Monday to Sunday)',
          [TimePeriods.MONTHLY]: 'Monthly aggregation',
          [TimePeriods.QUARTERLY]: 'Quarterly aggregation (Q1, Q2, Q3, Q4)',
          [TimePeriods.YEARLY]: 'Yearly aggregation'
        },
        metricTypesDescription: {
          [MetricTypes.TRANSACTION_COUNT]: 'Number of payment transactions',
          [MetricTypes.REVENUE]: 'Total revenue in KES',
          [MetricTypes.SUCCESS_RATE]: 'Percentage of successful payments',
          [MetricTypes.AVERAGE_AMOUNT]: 'Average transaction amount in KES',
          [MetricTypes.FAILURE_RATE]: 'Percentage of failed payments',
          [MetricTypes.PROCESSING_TIME]: 'Average processing time in seconds'
        },
        supportedFilters: [
          'clientId',
          'psychologistId',
          'sessionType'
        ],
        dateFormat: 'YYYY-MM-DD',
        maxDateRange: '2 years',
        recommendedPeriods: {
          '1-7 days': TimePeriods.DAILY,
          '1-8 weeks': TimePeriods.WEEKLY,
          '3-24 months': TimePeriods.MONTHLY,
          '1-5 years': TimePeriods.QUARTERLY,
          '5+ years': TimePeriods.YEARLY
        }
      }
    });

  } catch (error) {
    console.error('Error getting trend config:', error);
    res.status(500).json({ 
      message: 'Failed to get configuration',
      error: error.message 
    });
  }
});

module.exports = router;