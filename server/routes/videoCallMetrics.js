/**
 * Video Call Metrics API Routes
 * Provides endpoints for monitoring call success rates and quality metrics
 * Requirements: Monitor call success rates and quality metrics
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const videoCallMetricsService = require('../services/videoCallMetricsService');

/**
 * @route   GET /api/video-call-metrics/summary
 * @desc    Get current metrics summary
 * @access  Admin only
 */
router.get('/summary', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const { timeRange = '24h' } = req.query;
    
    // Validate time range
    const validTimeRanges = ['1h', '24h', '7d', '30d'];
    if (!validTimeRanges.includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Valid options: 1h, 24h, 7d, 30d'
      });
    }
    
    const summary = videoCallMetricsService.getMetricsSummary(timeRange);
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get metrics summary',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-call-metrics/trends
 * @desc    Get performance trends over time
 * @access  Admin only
 */
router.get('/trends', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const { days = 7 } = req.query;
    const daysNum = parseInt(days);
    
    // Validate days parameter
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid days parameter. Must be between 1 and 90'
      });
    }
    
    const trends = videoCallMetricsService.getPerformanceTrends(daysNum);
    
    res.json({
      success: true,
      data: {
        trends,
        period: `${daysNum} days`,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error getting performance trends:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get performance trends',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-call-metrics/session/:sessionId
 * @desc    Get detailed metrics for a specific session
 * @access  Admin or session participant
 */
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session to verify access
    const Session = global.Session || require('../models').Session;
    const session = await Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Verify access (admin or session participant)
    const isAuthorized = 
      req.user.role === 'admin' ||
      session.clientId === req.user.id ||
      session.psychologistId === req.user.id;
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const sessionMetrics = videoCallMetricsService.getSessionMetrics(sessionId);
    
    res.json({
      success: true,
      data: sessionMetrics
    });
    
  } catch (error) {
    console.error('Error getting session metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get session metrics',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/video-call-metrics/quality
 * @desc    Record quality metrics from client
 * @access  Authenticated users
 */
router.post('/quality', auth, async (req, res) => {
  try {
    const { sessionId, metrics } = req.body;
    
    if (!sessionId || !metrics) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and metrics are required'
      });
    }
    
    // Verify user is participant in the session
    const Session = global.Session || require('../models').Session;
    const session = await Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    const isParticipant = 
      session.clientId === req.user.id ||
      session.psychologistId === req.user.id ||
      req.user.role === 'admin';
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Validate metrics structure
    const validMetrics = {};
    if (typeof metrics.videoLatency === 'number') validMetrics.videoLatency = metrics.videoLatency;
    if (typeof metrics.audioLatency === 'number') validMetrics.audioLatency = metrics.audioLatency;
    if (typeof metrics.packetLoss === 'number') validMetrics.packetLoss = metrics.packetLoss;
    if (typeof metrics.bandwidth === 'number') validMetrics.bandwidth = metrics.bandwidth;
    if (typeof metrics.videoQuality === 'string') validMetrics.videoQuality = metrics.videoQuality;
    if (typeof metrics.audioQuality === 'string') validMetrics.audioQuality = metrics.audioQuality;
    if (typeof metrics.connectionQuality === 'string') validMetrics.connectionQuality = metrics.connectionQuality;
    
    // Record quality metrics
    videoCallMetricsService.recordQualityMetrics(sessionId, {
      ...validMetrics,
      userId: req.user.id,
      userRole: req.user.role,
      reportedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Quality metrics recorded successfully'
    });
    
  } catch (error) {
    console.error('Error recording quality metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to record quality metrics',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-call-metrics/export
 * @desc    Export metrics data for analysis
 * @access  Admin only
 */
router.get('/export', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const { format = 'json' } = req.query;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Valid options: json, csv'
      });
    }
    
    const exportData = videoCallMetricsService.exportMetrics(format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="video-call-metrics-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(exportData);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }
    
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export metrics',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-call-metrics/health
 * @desc    Get system health status based on metrics
 * @access  Admin only
 */
router.get('/health', auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const summary = videoCallMetricsService.getMetricsSummary('24h');
    const trends = videoCallMetricsService.getPerformanceTrends(7);
    
    // Determine overall health status
    let overallStatus = 'healthy';
    const issues = [];
    
    // Check connection success rate
    if (summary.metrics.connectionSuccessRate.status !== 'good') {
      overallStatus = 'warning';
      issues.push({
        metric: 'connectionSuccessRate',
        current: summary.metrics.connectionSuccessRate.value,
        target: summary.metrics.connectionSuccessRate.target,
        severity: 'warning'
      });
    }
    
    // Check call drop rate
    if (summary.metrics.callDropRate.status !== 'good') {
      overallStatus = 'warning';
      issues.push({
        metric: 'callDropRate',
        current: summary.metrics.callDropRate.value,
        target: summary.metrics.callDropRate.target,
        severity: 'warning'
      });
    }
    
    // Check connection time
    if (summary.metrics.avgConnectionTime.status !== 'good') {
      overallStatus = 'warning';
      issues.push({
        metric: 'avgConnectionTime',
        current: summary.metrics.avgConnectionTime.value,
        target: summary.metrics.avgConnectionTime.target,
        severity: 'warning'
      });
    }
    
    // Check security incidents
    if (summary.metrics.securityIncidents.status !== 'good') {
      overallStatus = 'critical';
      issues.push({
        metric: 'securityIncidents',
        current: summary.metrics.securityIncidents.value,
        target: summary.metrics.securityIncidents.target,
        severity: 'critical'
      });
    }
    
    // Check payment validation rate
    if (summary.metrics.paymentValidationRate.status !== 'good') {
      overallStatus = 'warning';
      issues.push({
        metric: 'paymentValidationRate',
        current: summary.metrics.paymentValidationRate.value,
        target: summary.metrics.paymentValidationRate.target,
        severity: 'warning'
      });
    }
    
    // Calculate trend indicators
    const recentTrends = trends.slice(-3); // Last 3 days
    const trendIndicators = {
      connectionSuccessRate: calculateTrend(recentTrends.map(t => t.connectionSuccessRate)),
      callDropRate: calculateTrend(recentTrends.map(t => t.callDropRate)),
      totalCalls: calculateTrend(recentTrends.map(t => t.totalCalls))
    };
    
    res.json({
      success: true,
      data: {
        overallStatus,
        timestamp: new Date(),
        summary: summary.metrics,
        issues,
        trends: trendIndicators,
        recommendations: generateRecommendations(issues, trendIndicators)
      }
    });
    
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get health status',
      error: error.message 
    });
  }
});

/**
 * Calculate trend direction for a metric
 */
function calculateTrend(values) {
  if (values.length < 2) return 'stable';
  
  const recent = values[values.length - 1];
  const previous = values[values.length - 2];
  
  if (recent > previous * 1.1) return 'increasing';
  if (recent < previous * 0.9) return 'decreasing';
  return 'stable';
}

/**
 * Generate recommendations based on issues and trends
 */
function generateRecommendations(issues, trends) {
  const recommendations = [];
  
  issues.forEach(issue => {
    switch (issue.metric) {
      case 'connectionSuccessRate':
        recommendations.push({
          priority: 'high',
          message: 'Connection success rate is below target. Check STUN/TURN server availability and network infrastructure.',
          action: 'investigate_connection_failures'
        });
        break;
      case 'callDropRate':
        recommendations.push({
          priority: 'high',
          message: 'Call drop rate is above target. Investigate network stability and implement better reconnection logic.',
          action: 'improve_connection_stability'
        });
        break;
      case 'avgConnectionTime':
        recommendations.push({
          priority: 'medium',
          message: 'Connection time is above target. Optimize ICE candidate gathering and signaling process.',
          action: 'optimize_connection_time'
        });
        break;
      case 'securityIncidents':
        recommendations.push({
          priority: 'critical',
          message: 'Security incidents detected. Review security logs and strengthen access controls.',
          action: 'review_security_incidents'
        });
        break;
      case 'paymentValidationRate':
        recommendations.push({
          priority: 'high',
          message: 'Payment validation rate is below target. Check payment system integration.',
          action: 'fix_payment_validation'
        });
        break;
    }
  });
  
  // Add trend-based recommendations
  if (trends.callDropRate === 'increasing') {
    recommendations.push({
      priority: 'medium',
      message: 'Call drop rate is trending upward. Monitor network conditions and user feedback.',
      action: 'monitor_drop_rate_trend'
    });
  }
  
  if (trends.totalCalls === 'decreasing') {
    recommendations.push({
      priority: 'low',
      message: 'Total call volume is decreasing. Consider user engagement strategies.',
      action: 'analyze_usage_patterns'
    });
  }
  
  return recommendations;
}

module.exports = router;