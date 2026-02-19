/**
 * Registration Security Audit Routes
 * 
 * Provides API endpoints for running and viewing security audits
 * on the registration system. Admin-only access.
 * 
 * @module routes/registrationSecurityAudit
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { 
  registrationSecurityAuditService,
  AUDIT_CATEGORIES,
  CHECK_STATUS
} = require('../services/registrationSecurityAuditService');
const { logger } = require('../utils/logger');

// Admin-only middleware
const adminOnly = requireRole('admin');

/**
 * @route   POST /api/registration-security/audit
 * @desc    Run a full security audit on the registration system
 * @access  Admin only
 */
router.post('/audit', auth, adminOnly, async (req, res) => {
  try {
    logger.info('Security audit requested by admin', { adminId: req.user.id });
    
    const results = await registrationSecurityAuditService.runFullAudit();
    
    res.json({
      success: true,
      message: 'Security audit completed',
      data: results
    });
  } catch (error) {
    logger.error('Failed to run security audit', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to run security audit'
    });
  }
});

/**
 * @route   GET /api/registration-security/audit/latest
 * @desc    Get the most recent security audit results
 * @access  Admin only
 */
router.get('/audit/latest', auth, adminOnly, async (req, res) => {
  try {
    const results = registrationSecurityAuditService.getLastAuditResults();
    
    if (!results) {
      return res.status(404).json({
        success: false,
        message: 'No audit results available. Run an audit first.'
      });
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Failed to get audit results', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit results'
    });
  }
});

/**
 * @route   GET /api/registration-security/audit/history
 * @desc    Get security audit history
 * @access  Admin only
 */
router.get('/audit/history', auth, adminOnly, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const history = registrationSecurityAuditService.getAuditHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        audits: history,
        count: history.length
      }
    });
  } catch (error) {
    logger.error('Failed to get audit history', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit history'
    });
  }
});

/**
 * @route   GET /api/registration-security/recommendations
 * @desc    Get security recommendations based on latest audit
 * @access  Admin only
 */
router.get('/recommendations', auth, adminOnly, async (req, res) => {
  try {
    const recommendations = registrationSecurityAuditService.getSecurityRecommendations();
    
    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        lastAuditTime: registrationSecurityAuditService.lastAuditTime
      }
    });
  } catch (error) {
    logger.error('Failed to get recommendations', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendations'
    });
  }
});

/**
 * @route   GET /api/registration-security/export
 * @desc    Export security audit report
 * @access  Admin only
 */
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const report = registrationSecurityAuditService.exportAuditReport(format);
    
    if (report.error) {
      return res.status(404).json({
        success: false,
        message: report.error
      });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="security-audit-${Date.now()}.json"`);
    res.send(report);
  } catch (error) {
    logger.error('Failed to export audit report', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export audit report'
    });
  }
});

/**
 * @route   GET /api/registration-security/status
 * @desc    Get quick security status overview
 * @access  Admin only
 */
router.get('/status', auth, adminOnly, async (req, res) => {
  try {
    const lastAudit = registrationSecurityAuditService.getLastAuditResults();
    
    let status = 'unknown';
    let message = 'No security audit has been run yet';
    let lastAuditTime = null;
    let summary = null;
    
    if (lastAudit) {
      status = lastAudit.overallStatus.toLowerCase();
      lastAuditTime = lastAudit.endTime;
      summary = lastAudit.summary;
      
      if (lastAudit.overallStatus === 'PASSED') {
        message = 'All security checks passed';
      } else if (lastAudit.overallStatus === 'PASSED_WITH_WARNINGS') {
        message = 'Security checks passed with some warnings';
      } else {
        message = 'Security audit found issues that need attention';
      }
    }
    
    res.json({
      success: true,
      data: {
        status,
        message,
        lastAuditTime,
        summary,
        categories: Object.values(AUDIT_CATEGORIES),
        checkStatuses: Object.values(CHECK_STATUS)
      }
    });
  } catch (error) {
    logger.error('Failed to get security status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security status'
    });
  }
});

module.exports = router;
