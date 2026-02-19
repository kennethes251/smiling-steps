/**
 * Security Monitoring Routes
 * 
 * API endpoints for security monitoring and breach detection
 * 
 * Requirements: 10.5 - Breach detection and alerting
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const securityMonitoringService = require('../services/securityMonitoringService');
const breachAlertingService = require('../services/breachAlertingService');
const { logAdminAccess } = require('../utils/auditLogger');

/**
 * GET /api/security-monitoring/statistics
 * Get security monitoring statistics (Admin only)
 */
router.get('/statistics', auth, requireRole('admin'), async (req, res) => {
  try {
    await logAdminAccess({
      adminId: req.user.id,
      action: 'Viewed security monitoring statistics',
      accessedData: 'Security monitoring statistics',
      ipAddress: req.ip
    });

    const monitoringStats = securityMonitoringService.getMonitoringStatistics();
    const alertingStats = breachAlertingService.getAlertingStatistics();

    res.json({
      success: true,
      data: {
        monitoring: monitoringStats,
        alerting: alertingStats,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching security statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security statistics',
      error: error.message
    });
  }
});

/**
 * POST /api/security-monitoring/run-check
 * Manually trigger security monitoring check (Admin only)
 */
router.post('/run-check', auth, requireRole('admin'), async (req, res) => {
  try {
    const { context } = req.body;

    if (!context || !context.actionType) {
      return res.status(400).json({
        success: false,
        message: 'Security monitoring context with actionType is required'
      });
    }

    await logAdminAccess({
      adminId: req.user.id,
      action: 'Manually triggered security monitoring check',
      accessedData: `Security check for ${context.actionType}`,
      ipAddress: req.ip
    });

    const result = await securityMonitoringService.runSecurityMonitoring({
      ...context,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // If breach detected, trigger alerting system
    if (result.breachDetected) {
      const alertResult = await breachAlertingService.processSecurityBreach({
        alerts: result.alerts,
        recommendations: result.recommendations,
        context: {
          ...context,
          triggeredBy: 'manual_check',
          adminId: req.user.id
        }
      });

      result.alertingResult = alertResult;
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error running security check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run security check',
      error: error.message
    });
  }
});

/**
 * GET /api/security-monitoring/incidents
 * Get active security incidents (Admin only)
 */
router.get('/incidents', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    await logAdminAccess({
      adminId: req.user.id,
      action: 'Viewed security incidents',
      accessedData: `Security incidents${status ? ` with status: ${status}` : ''}`,
      ipAddress: req.ip
    });

    const incidents = breachAlertingService.getActiveIncidents(status);

    res.json({
      success: true,
      data: {
        incidents,
        count: incidents.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching security incidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security incidents',
      error: error.message
    });
  }
});

/**
 * GET /api/security-monitoring/incidents/:incidentId
 * Get specific security incident details (Admin only)
 */
router.get('/incidents/:incidentId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { incidentId } = req.params;

    await logAdminAccess({
      adminId: req.user.id,
      action: 'Viewed security incident details',
      accessedData: `Security incident: ${incidentId}`,
      ipAddress: req.ip
    });

    const incident = breachAlertingService.getIncidentById(incidentId);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Security incident not found'
      });
    }

    res.json({
      success: true,
      data: incident
    });

  } catch (error) {
    console.error('❌ Error fetching security incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security incident',
      error: error.message
    });
  }
});

/**
 * PUT /api/security-monitoring/incidents/:incidentId/status
 * Update security incident status (Admin only)
 */
router.put('/incidents/:incidentId/status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = Object.values(breachAlertingService.BREACH_ALERT_CONFIG.INCIDENT_STAGES);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await breachAlertingService.updateIncidentStatus(
      incidentId,
      status,
      note || `Status updated by admin ${req.user.name}`,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    await logAdminAccess({
      adminId: req.user.id,
      action: 'Updated security incident status',
      accessedData: `Incident ${incidentId}: ${result.previousStatus} → ${result.newStatus}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error updating incident status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident status',
      error: error.message
    });
  }
});

/**
 * POST /api/security-monitoring/incidents/:incidentId/archive
 * Archive resolved security incident (Admin only)
 */
router.post('/incidents/:incidentId/archive', auth, requireRole('admin'), async (req, res) => {
  try {
    const { incidentId } = req.params;

    const result = await breachAlertingService.archiveIncident(incidentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    await logAdminAccess({
      adminId: req.user.id,
      action: 'Archived security incident',
      accessedData: `Incident ${incidentId} archived`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error archiving incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive incident',
      error: error.message
    });
  }
});

/**
 * POST /api/security-monitoring/test-breach
 * Test breach detection and alerting system (Admin only, development/testing)
 */
router.post('/test-breach', auth, requireRole('admin'), async (req, res) => {
  try {
    // Only allow in development/testing environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test breach endpoint not available in production'
      });
    }

    const { severity = 'MEDIUM', alertType = 'TEST_BREACH' } = req.body;

    await logAdminAccess({
      adminId: req.user.id,
      action: 'Triggered test security breach',
      accessedData: `Test breach with severity: ${severity}`,
      ipAddress: req.ip
    });

    // Create test breach data
    const testBreachData = {
      alerts: [{
        type: alertType,
        severity: severity,
        message: `Test security breach triggered by admin ${req.user.name}`,
        details: {
          adminId: req.user.id,
          adminName: req.user.name,
          testTimestamp: new Date(),
          ipAddress: req.ip
        }
      }],
      recommendations: [
        'This is a test breach - verify alerting system is working correctly',
        'Check that email alerts were sent to administrators',
        'Verify incident was created and logged properly'
      ],
      context: {
        testBreach: true,
        triggeredBy: req.user.id,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Process the test breach
    const result = await breachAlertingService.processSecurityBreach(testBreachData);

    res.json({
      success: true,
      message: 'Test breach processed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error processing test breach:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process test breach',
      error: error.message
    });
  }
});

module.exports = router;
