const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const {
  reconcilePayments,
  reconcileSession,
  generateReconciliationReport,
  verifyTransaction,
  findOrphanedPayments
} = require('../utils/paymentReconciliation');
const auditLogger = require('../utils/auditLogger');

/**
 * Middleware to check admin access
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// @route   POST api/reconciliation/run
// @desc    Run payment reconciliation for a date range
// @access  Private (Admin only)
router.post('/run', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, clientId, psychologistId } = req.body;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        msg: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        msg: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        msg: 'Start date must be before end date' 
      });
    }

    // Run reconciliation
    const results = await reconcilePayments(start, end, {
      clientId,
      psychologistId
    });

    // Log reconciliation action for audit trail
    auditLogger.logReconciliation({
      adminId: req.user.id,
      action: 'Manual reconciliation run',
      startDate: start,
      endDate: end,
      results: {
        totalTransactions: results.totalTransactions,
        matched: results.matched,
        discrepancies: results.discrepancies?.length || 0
      }
    });

    // Send webhook notification for reconciliation completion
    try {
      const reconciliationWebhook = require('../utils/reconciliationWebhook');
      await reconciliationWebhook.sendManualReconciliationWebhook(results, req.user.id);
      console.log('✅ Manual reconciliation completion webhook sent');
    } catch (webhookError) {
      console.error('❌ Failed to send reconciliation webhook:', webhookError.message);
      // Don't fail the entire reconciliation if webhook fails
    }

    // Send email alert if discrepancies detected
    if (results.summary.discrepancies > 0 || results.summary.unmatched > 0) {
      const user = await User.findById(req.user.id);
      if (user && user.email) {
        const notificationService = require('../utils/notificationService');
        await notificationService.sendReconciliationDiscrepancyAlert(results, user.email);
        console.log('✅ Discrepancy alert sent to admin:', user.email);
      }
    }

    res.json({
      success: true,
      msg: 'Reconciliation completed',
      ...results
    });

  } catch (error) {
    console.error('❌ Reconciliation error:', error);
    res.status(500).json({ 
      msg: 'Reconciliation failed',
      error: error.message 
    });
  }
});

// @route   GET api/reconciliation/report
// @desc    Generate and download reconciliation report with date range filtering
// @access  Private (Admin only)
router.get('/report', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'csv', clientId, psychologistId } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        msg: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        msg: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        msg: 'Start date must be before end date' 
      });
    }

    // Run reconciliation with optional filters
    const results = await reconcilePayments(start, end, {
      clientId,
      psychologistId
    });

    // Fetch full session details for CSV generation
    const Session = require('../models/Session');
    const query = {
      paymentStatus: 'Paid',
      paymentVerifiedAt: {
        $gte: start,
        $lte: end
      }
    };

    if (clientId) query.client = clientId;
    if (psychologistId) query.psychologist = psychologistId;

    const sessions = await Session.find(query)
      .populate('client', 'name email')
      .populate('psychologist', 'name')
      .sort({ paymentVerifiedAt: -1 });

    if (format === 'csv') {
      // Generate CSV report with all transaction fields
      const csvContent = generateReconciliationReport(results, sessions);

      // Log admin access for audit trail
      auditLogger.logAdminAccess({
        adminId: req.user.id,
        action: 'Download reconciliation report (CSV)',
        accessedData: `Payment transactions from ${startDate} to ${endDate}`,
        ipAddress: req.ip || req.connection.remoteAddress
      });

      // Set headers for file download
      const filename = `reconciliation_${startDate}_${endDate}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      res.send(csvContent);
    } else {
      // Return JSON with full details
      res.json({
        ...results,
        sessions: sessions.map(s => ({
          id: s._id,
          transactionId: s.mpesaTransactionID,
          amount: s.price,
          client: s.client?.name,
          psychologist: s.psychologist?.name,
          paymentStatus: s.paymentStatus,
          timestamp: s.paymentVerifiedAt
        }))
      });
    }

  } catch (error) {
    console.error('❌ Report generation error:', error);
    res.status(500).json({ 
      msg: 'Report generation failed',
      error: error.message 
    });
  }
});

// @route   GET api/reconciliation/session/:sessionId
// @desc    Reconcile a specific session
// @access  Private (Admin only)
router.get('/session/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const Session = require('../models/Session');
    
    const session = await Session.findById(req.params.sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    const result = await reconcileSession(session);

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Reconcile specific session',
      accessedData: `Session ${req.params.sessionId} payment data`,
      sessionId: req.params.sessionId,
      transactionID: session.mpesaTransactionID,
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      ...result,
      session: {
        id: session._id,
        client: session.client?.name,
        psychologist: session.psychologist?.name,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        price: session.price,
        paymentStatus: session.paymentStatus,
        status: session.status
      }
    });

  } catch (error) {
    console.error('❌ Session reconciliation error:', error);
    res.status(500).json({ 
      msg: 'Session reconciliation failed',
      error: error.message 
    });
  }
});

// @route   POST api/reconciliation/verify/:sessionId
// @desc    Verify a transaction against M-Pesa API
// @access  Private (Admin only)
router.post('/verify/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const verification = await verifyTransaction(req.params.sessionId);

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Verify transaction against M-Pesa API',
      accessedData: `Session ${req.params.sessionId} transaction verification`,
      sessionId: req.params.sessionId,
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      msg: 'Transaction verified',
      ...verification
    });

  } catch (error) {
    console.error('❌ Transaction verification error:', error);
    res.status(500).json({ 
      msg: 'Transaction verification failed',
      error: error.message 
    });
  }
});

// @route   GET api/reconciliation/orphaned
// @desc    Find orphaned payments (payments without proper session status)
// @access  Private (Admin only)
router.get('/orphaned', auth, requireAdmin, async (req, res) => {
  try {
    const orphaned = await findOrphanedPayments();

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Search for orphaned payments',
      accessedData: `Orphaned payment records (${orphaned.length} found)`,
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      count: orphaned.length,
      orphanedPayments: orphaned
    });

  } catch (error) {
    console.error('❌ Orphaned payments search error:', error);
    res.status(500).json({ 
      msg: 'Failed to find orphaned payments',
      error: error.message 
    });
  }
});

// @route   GET api/reconciliation/summary
// @desc    Get reconciliation summary for dashboard
// @access  Private (Admin only)
router.get('/summary', auth, requireAdmin, async (req, res) => {
  try {
    const Session = require('../models/Session');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this week's date range
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    // Get this month's date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Aggregate payment statistics
    const [todayStats, weekStats, monthStats, orphaned] = await Promise.all([
      Session.aggregate([
        {
          $match: {
            paymentStatus: 'Paid',
            paymentVerifiedAt: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$price' }
          }
        }
      ]),
      Session.aggregate([
        {
          $match: {
            paymentStatus: 'Paid',
            paymentVerifiedAt: { $gte: weekStart }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$price' }
          }
        }
      ]),
      Session.aggregate([
        {
          $match: {
            paymentStatus: 'Paid',
            paymentVerifiedAt: { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$price' }
          }
        }
      ]),
      findOrphanedPayments()
    ]);

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'View reconciliation dashboard summary',
      accessedData: 'Payment statistics (today, week, month)',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      summary: {
        today: todayStats[0] || { count: 0, totalAmount: 0 },
        thisWeek: weekStats[0] || { count: 0, totalAmount: 0 },
        thisMonth: monthStats[0] || { count: 0, totalAmount: 0 },
        orphanedCount: orphaned.length
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Summary generation error:', error);
    res.status(500).json({ 
      msg: 'Failed to generate summary',
      error: error.message 
    });
  }
});

// @route   POST api/reconciliation/webhook/test
// @desc    Test webhook connectivity
// @access  Private (Admin only)
router.post('/webhook/test', auth, requireAdmin, async (req, res) => {
  try {
    const reconciliationWebhook = require('../utils/reconciliationWebhook');
    
    const testResult = await reconciliationWebhook.testWebhookConnectivity();

    // Log admin action for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Test reconciliation webhook connectivity',
      accessedData: 'Webhook configuration and connectivity',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: testResult.success,
      msg: testResult.message,
      results: testResult.results
    });

  } catch (error) {
    console.error('❌ Webhook test error:', error);
    res.status(500).json({ 
      msg: 'Webhook test failed',
      error: error.message 
    });
  }
});

// @route   GET api/reconciliation/webhook/config
// @desc    Get webhook configuration status
// @access  Private (Admin only)
router.get('/webhook/config', auth, requireAdmin, async (req, res) => {
  try {
    const reconciliationWebhook = require('../utils/reconciliationWebhook');
    
    const config = {
      webhookUrlsConfigured: reconciliationWebhook.webhookUrls.length,
      webhookUrls: reconciliationWebhook.webhookUrls.map(url => {
        // Mask the URL for security (show only domain)
        try {
          const urlObj = new URL(url);
          return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
        } catch {
          return 'Invalid URL';
        }
      }),
      secretConfigured: !!reconciliationWebhook.webhookSecret,
      retryAttempts: reconciliationWebhook.retryAttempts,
      retryDelay: reconciliationWebhook.retryDelay
    };

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'View reconciliation webhook configuration',
      accessedData: 'Webhook configuration settings',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('❌ Webhook config error:', error);
    res.status(500).json({ 
      msg: 'Failed to get webhook configuration',
      error: error.message 
    });
  }
});

module.exports = router;
