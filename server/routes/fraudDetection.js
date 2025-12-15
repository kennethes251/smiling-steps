/**
 * Fraud Detection API Routes
 * Handles fraud detection, monitoring, and investigation endpoints
 * Requirements: 16.1-16.7, 19.1-19.6, 20.1-20.7, 21.1-21.6
 */

const express = require('express');
const router = express.Router();
const fraudDetectionService = require('../services/fraudDetectionService');
const { Session, User } = require('../models');
const AuditLog = require('../models/AuditLog'); // Import Mongoose model directly
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');

// Middleware to ensure admin access for fraud management endpoints
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Analyze transaction for fraud risk
 * POST /api/fraud/analyze
 * Requirement 16.1: Analyze transaction within 2 seconds
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    const {
      sessionId,
      amount,
      phoneNumber,
      deviceFingerprint,
      ipAddress
    } = req.body;

    // Validate required fields
    if (!sessionId || !amount || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, amount, phoneNumber'
      });
    }

    // Get session details
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Prepare transaction data for analysis
    const transactionData = {
      userId: req.user.id,
      sessionId,
      amount: parseFloat(amount),
      phoneNumber,
      deviceFingerprint,
      ipAddress: ipAddress || req.ip,
      sessionType: session.sessionType,
      timestamp: new Date()
    };

    // Perform fraud analysis
    const analysis = await fraudDetectionService.analyzeTransaction(transactionData);

    // Handle different decisions
    if (analysis.decision === 'BLOCK') {
      // Requirement 16.3: Automatically block high-risk transactions
      await fraudDetectionService.blockUserForFraud(
        req.user.id,
        phoneNumber,
        'Automatic fraud detection block'
      );

      // Requirement 16.7: Display security message
      return res.status(403).json({
        error: 'Transaction blocked for security reasons',
        message: 'This transaction has been flagged as potentially fraudulent. Please contact support for assistance.',
        supportContact: 'support@smilingsteps.co.ke',
        riskScore: analysis.riskScore,
        blocked: true
      });
    }

    if (analysis.decision === 'REVIEW') {
      // Requirement 16.2: Flag for manual review
      await Session.update(
        {
          fraudReviewRequired: true,
          fraudRiskScore: analysis.riskScore,
          fraudReasons: analysis.reasons
        },
        { where: { id: sessionId } }
      );

      // Requirement 16.6: Send real-time alert to administrators
      await sendFraudAlert({
        type: 'HIGH_RISK_TRANSACTION',
        sessionId,
        userId: req.user.id,
        riskScore: analysis.riskScore,
        reasons: analysis.reasons
      });
    }

    res.json({
      allowed: analysis.decision === 'ALLOW',
      riskScore: analysis.riskScore,
      decision: analysis.decision,
      reasons: analysis.reasons,
      processingTime: analysis.processingTime,
      requiresReview: analysis.decision === 'REVIEW'
    });

  } catch (error) {
    console.error('Fraud analysis failed:', error);
    res.status(500).json({
      error: 'Fraud analysis failed',
      message: 'An error occurred during fraud detection. Transaction allowed by default.',
      allowed: true // Fail-safe: allow transaction if analysis fails
    });
  }
});

/**
 * Get fraud detection metrics for dashboard
 * GET /api/fraud/metrics
 * Requirement 19.1, 19.2: Display fraud metrics and statistics
 */
router.get('/metrics', auth, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get transaction statistics
    const totalTransactions = await Session.count({
      where: {
        paymentInitiatedAt: {
          [Op.gte]: startTime
        }
      }
    });

    const blockedTransactions = await Session.count({
      where: {
        paymentInitiatedAt: {
          [Op.gte]: startTime
        },
        paymentStatus: 'Blocked'
      }
    });

    const underReview = await Session.count({
      where: {
        paymentInitiatedAt: {
          [Op.gte]: startTime
        },
        fraudReviewRequired: true,
        paymentStatus: 'Processing'
      }
    });

    // Get risk score distribution
    const riskDistribution = await Session.findAll({
      where: {
        paymentInitiatedAt: {
          [Op.gte]: startTime
        },
        fraudRiskScore: {
          [Op.not]: null
        }
      },
      attributes: ['fraudRiskScore']
    });

    const distribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    riskDistribution.forEach(session => {
      const score = session.fraudRiskScore;
      if (score < 40) distribution.low++;
      else if (score < 70) distribution.medium++;
      else if (score < 90) distribution.high++;
      else distribution.critical++;
    });

    // Get blocked users
    const blockedUsers = await User.findAll({
      where: {
        status: 'blocked',
        blockedReason: {
          [Op.like]: '%fraud%'
        }
      },
      attributes: ['id', 'email', 'phoneNumber', 'blockedAt', 'blockedReason'],
      limit: 50
    });

    // Get fraud detection service metrics
    const serviceMetrics = fraudDetectionService.getFraudMetrics();

    res.json({
      totalTransactions,
      blockedTransactions,
      underReview,
      detectionRate: totalTransactions > 0 ? (blockedTransactions + underReview) / totalTransactions : 0,
      riskDistribution: distribution,
      modelMetrics: serviceMetrics.metrics,
      modelVersion: serviceMetrics.modelVersion,
      thresholds: serviceMetrics.thresholds,
      blockedUsers: blockedUsers.map(user => ({
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        blockedDate: user.blockedAt,
        reason: user.blockedReason
      }))
    });

  } catch (error) {
    console.error('Failed to get fraud metrics:', error);
    res.status(500).json({ error: 'Failed to get fraud metrics' });
  }
});

/**
 * Get high-risk transactions for review
 * GET /api/fraud/transactions
 * Requirement 19.3: Display high-risk transactions prominently
 */
router.get('/transactions', auth, requireAdmin, async (req, res) => {
  try {
    const {
      riskLevel = 'all',
      timeRange = '24h',
      status = 'all',
      limit = 50,
      offset = 0
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    // Time range filter
    const now = new Date();
    let startTime;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    whereConditions.paymentInitiatedAt = {
      [Op.gte]: startTime
    };

    // Risk level filter
    if (riskLevel !== 'all') {
      switch (riskLevel) {
        case 'critical':
          whereConditions.fraudRiskScore = { [Op.gte]: 90 };
          break;
        case 'high':
          whereConditions.fraudRiskScore = { [Op.between]: [70, 89] };
          break;
        case 'medium':
          whereConditions.fraudRiskScore = { [Op.between]: [40, 69] };
          break;
        case 'low':
          whereConditions.fraudRiskScore = { [Op.lt]: 40 };
          break;
      }
    }

    // Status filter
    if (status !== 'all') {
      switch (status) {
        case 'blocked':
          whereConditions.paymentStatus = 'Blocked';
          break;
        case 'review':
          whereConditions.fraudReviewRequired = true;
          break;
        case 'allowed':
          whereConditions.paymentStatus = 'Paid';
          break;
      }
    }

    const transactions = await Session.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'clientUser',
          attributes: ['email', 'firstName', 'lastName']
        }
      ],
      order: [['fraudRiskScore', 'DESC'], ['paymentInitiatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedTransactions = transactions.map(session => ({
      id: session.id,
      timestamp: session.paymentInitiatedAt,
      userEmail: session.clientUser?.email,
      userName: `${session.clientUser?.firstName} ${session.clientUser?.lastName}`,
      amount: session.price,
      riskScore: session.fraudRiskScore || 0,
      status: session.paymentStatus === 'Blocked' ? 'BLOCKED' :
              session.fraudReviewRequired ? 'REVIEW' : 'ALLOWED',
      riskFactors: session.fraudReasons || [],
      userHistory: {
        transactionCount: 0, // Would be calculated from user profile
        averageAmount: 0
      }
    }));

    res.json(formattedTransactions);

  } catch (error) {
    console.error('Failed to get fraud transactions:', error);
    res.status(500).json({ error: 'Failed to get fraud transactions' });
  }
});

/**
 * Get fraud alerts
 * GET /api/fraud/alerts
 * Requirement 16.6: Send real-time alerts to administrators
 */
router.get('/alerts', auth, requireAdmin, async (req, res) => {
  try {
    const alerts = await AuditLog.findAll({
      where: {
        action: {
          [Op.in]: ['FRAUD_ALERT', 'FRAUD_BLOCK_USER', 'HIGH_RISK_TRANSACTION']
        },
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      title: getAlertTitle(alert.action),
      description: getAlertDescription(alert),
      timestamp: alert.createdAt,
      severity: getAlertSeverity(alert.action)
    }));

    res.json(formattedAlerts);

  } catch (error) {
    console.error('Failed to get fraud alerts:', error);
    res.status(500).json({ error: 'Failed to get fraud alerts' });
  }
});

/**
 * Perform action on flagged transaction
 * POST /api/fraud/transactions/:id/action
 * Requirement 20.3, 20.4: Admin investigation and response actions
 */
router.post('/transactions/:id/action', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const session = await Session.findByPk(id, {
      include: [{ model: User, as: 'clientUser' }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    switch (action) {
      case 'approve':
        await Session.update(
          {
            fraudReviewRequired: false,
            paymentStatus: 'Approved',
            reviewedBy: req.user.id,
            reviewedAt: new Date()
          },
          { where: { id } }
        );

        await AuditLog.create({
          action: 'FRAUD_TRANSACTION_APPROVED',
          userId: req.user.id,
          targetUserId: session.client,
          details: {
            sessionId: id,
            previousRiskScore: session.fraudRiskScore,
            approvedBy: req.user.email
          }
        });
        break;

      case 'block':
        await Session.update(
          {
            paymentStatus: 'Blocked',
            reviewedBy: req.user.id,
            reviewedAt: new Date()
          },
          { where: { id } }
        );

        // Block the user
        await fraudDetectionService.blockUserForFraud(
          session.client,
          session.mpesaPhoneNumber,
          `Manual block by admin: ${req.user.email}`
        );

        await AuditLog.create({
          action: 'FRAUD_TRANSACTION_BLOCKED',
          userId: req.user.id,
          targetUserId: session.client,
          details: {
            sessionId: id,
            riskScore: session.fraudRiskScore,
            blockedBy: req.user.email
          }
        });
        break;

      case 'unblock':
        // This would be for unblocking users, not transactions
        await User.update(
          {
            status: 'active',
            blockedAt: null,
            blockedReason: null
          },
          { where: { id: session.client } }
        );
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true, message: `Transaction ${action}ed successfully` });

  } catch (error) {
    console.error('Failed to perform transaction action:', error);
    res.status(500).json({ error: 'Failed to perform action' });
  }
});

/**
 * Export fraud detection report
 * POST /api/fraud/export
 * Requirement 20.7: Generate case reports
 */
router.post('/export', auth, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '30d', format = 'csv' } = req.body;

    // Calculate time range
    const now = new Date();
    let startTime;
    switch (timeRange) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const transactions = await Session.findAll({
      where: {
        paymentInitiatedAt: {
          [Op.gte]: startTime
        },
        fraudRiskScore: {
          [Op.not]: null
        }
      },
      include: [
        {
          model: User,
          as: 'clientUser',
          attributes: ['email', 'firstName', 'lastName']
        }
      ],
      order: [['paymentInitiatedAt', 'DESC']]
    });

    if (format === 'csv') {
      const csvHeader = 'Date,User Email,Amount,Risk Score,Status,Decision,Risk Factors\n';
      const csvRows = transactions.map(session => {
        const riskFactors = (session.fraudReasons || []).join('; ');
        return [
          session.paymentInitiatedAt?.toISOString(),
          session.clientUser?.email,
          session.price,
          session.fraudRiskScore,
          session.paymentStatus,
          session.fraudReviewRequired ? 'REVIEW' : 'AUTO',
          `"${riskFactors}"`
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=fraud-report-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } else {
      res.json(transactions);
    }

  } catch (error) {
    console.error('Failed to export fraud report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

/**
 * Update fraud detection model metrics
 * POST /api/fraud/model/metrics
 * Requirement 17.4: Alert when model performance drops
 */
router.post('/model/metrics', auth, requireAdmin, async (req, res) => {
  try {
    const { precision, recall, f1Score, falsePositiveRate } = req.body;

    // Validate metrics
    if (precision < 0 || precision > 1 || recall < 0 || recall > 1 || 
        f1Score < 0 || f1Score > 1 || falsePositiveRate < 0 || falsePositiveRate > 1) {
      return res.status(400).json({ error: 'Invalid metric values. All values must be between 0 and 1.' });
    }

    // Check if performance has dropped below threshold
    const threshold = 0.85;
    if (precision < threshold || recall < threshold || f1Score < threshold) {
      // Send alert to administrators
      await sendFraudAlert({
        type: 'MODEL_PERFORMANCE_DEGRADED',
        metrics: { precision, recall, f1Score, falsePositiveRate },
        threshold
      });
    }

    // Update model metrics
    fraudDetectionService.updateModelMetrics({
      precision,
      recall,
      f1Score,
      falsePositiveRate
    });

    await AuditLog.create({
      action: 'FRAUD_MODEL_METRICS_UPDATED',
      userId: req.user.id,
      details: {
        newMetrics: { precision, recall, f1Score, falsePositiveRate },
        updatedBy: req.user.email
      }
    });

    res.json({ success: true, message: 'Model metrics updated successfully' });

  } catch (error) {
    console.error('Failed to update model metrics:', error);
    res.status(500).json({ error: 'Failed to update model metrics' });
  }
});

// Helper functions
function getAlertTitle(action) {
  switch (action) {
    case 'FRAUD_ALERT':
      return 'Fraud Alert';
    case 'FRAUD_BLOCK_USER':
      return 'User Blocked for Fraud';
    case 'HIGH_RISK_TRANSACTION':
      return 'High Risk Transaction Detected';
    default:
      return 'Security Alert';
  }
}

function getAlertDescription(alert) {
  const details = alert.details || {};
  switch (alert.action) {
    case 'FRAUD_BLOCK_USER':
      return `User ${details.phoneNumber} has been automatically blocked due to suspicious activity.`;
    case 'HIGH_RISK_TRANSACTION':
      return `Transaction with risk score ${details.riskScore} requires manual review.`;
    default:
      return 'Security event detected requiring attention.';
  }
}

function getAlertSeverity(action) {
  switch (action) {
    case 'FRAUD_BLOCK_USER':
      return 'error';
    case 'HIGH_RISK_TRANSACTION':
      return 'warning';
    default:
      return 'info';
  }
}

async function sendFraudAlert(alertData) {
  try {
    // In a real implementation, this would send notifications via email, SMS, or push notifications
    await AuditLog.create({
      action: 'FRAUD_ALERT',
      userId: 'system',
      details: {
        ...alertData,
        timestamp: new Date()
      }
    });

    console.log('Fraud alert sent:', alertData);
  } catch (error) {
    console.error('Failed to send fraud alert:', error);
  }
}

module.exports = router;