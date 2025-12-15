/**
 * Issue Resolution API Routes
 * Provides endpoints for managing automatic issue resolution
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const automaticIssueResolver = require('../utils/automaticIssueResolver');
// Session model will be available globally after initialization

/**
 * GET /api/issue-resolution/status
 * Get status of automatic issue resolution system
 */
router.get('/status', auth, async (req, res) => {
  try {
    // Only admins can access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get current system status
    const status = {
      systemActive: true,
      lastRun: new Date(), // This would be tracked in a real implementation
      config: automaticIssueResolver.RESOLUTION_CONFIG,
      supportedIssueTypes: Object.values(automaticIssueResolver.ResolvableIssueTypes)
    };

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('❌ Error getting issue resolution status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

/**
 * POST /api/issue-resolution/detect-and-resolve
 * Manually trigger issue detection and resolution
 */
router.post('/detect-and-resolve', auth, async (req, res) => {
  try {
    // Only admins can trigger manual resolution
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log(`🔧 Manual issue resolution triggered by admin: ${req.user.email}`);

    // Run issue detection and resolution
    const results = await automaticIssueResolver.detectAndResolveIssues();

    res.json({
      success: true,
      message: 'Issue detection and resolution completed',
      results
    });

  } catch (error) {
    console.error('❌ Error during manual issue resolution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run issue resolution'
    });
  }
});

/**
 * POST /api/issue-resolution/resolve-specific
 * Resolve a specific issue for a session
 */
router.post('/resolve-specific', auth, async (req, res) => {
  try {
    // Only admins can trigger specific resolution
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { sessionId, issueType, context = {} } = req.body;

    if (!sessionId || !issueType) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and issue type are required'
      });
    }

    // Validate issue type
    if (!Object.values(automaticIssueResolver.ResolvableIssueTypes).includes(issueType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid issue type'
      });
    }

    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    console.log(`🔧 Manual specific resolution triggered by admin: ${req.user.email} for session ${sessionId}, issue: ${issueType}`);

    // Resolve the specific issue
    const result = await automaticIssueResolver.resolveIssue(issueType, {
      sessionId,
      ...context
    });

    res.json({
      success: true,
      message: `Resolution attempt completed for ${issueType}`,
      result
    });

  } catch (error) {
    console.error('❌ Error during specific issue resolution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve specific issue'
    });
  }
});

/**
 * GET /api/issue-resolution/potential-issues
 * Get list of sessions with potential issues
 */
router.get('/potential-issues', auth, async (req, res) => {
  try {
    // Only admins can access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Find sessions with potential issues
    const potentialIssues = await Session.find({
      $or: [
        // Timeout issues - processing for too long
        {
          paymentStatus: 'Processing',
          paymentInitiatedAt: {
            $lt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
          }
        },
        // Status inconsistencies
        {
          mpesaTransactionID: { $exists: true, $ne: null },
          paymentStatus: { $ne: 'Paid' }
        },
        // Orphaned payments
        {
          mpesaResultCode: 0,
          paymentStatus: { $ne: 'Paid' }
        },
        // Amount mismatches
        {
          mpesaAmount: { $exists: true },
          $expr: {
            $ne: [
              { $toDouble: '$mpesaAmount' },
              '$price'
            ]
          }
        }
      ]
    })
    .populate('client', 'name email')
    .populate('psychologist', 'name')
    .sort({ paymentInitiatedAt: -1 })
    .limit(50);

    // Categorize issues
    const categorizedIssues = potentialIssues.map(session => {
      const issues = [];

      // Check for timeout
      if (session.paymentStatus === 'Processing' && 
          session.paymentInitiatedAt < new Date(Date.now() - 5 * 60 * 1000)) {
        issues.push({
          type: automaticIssueResolver.ResolvableIssueTypes.TIMEOUT_RECOVERY,
          description: 'Payment processing timeout',
          severity: 'medium'
        });
      }

      // Check for orphaned payment
      if (session.mpesaTransactionID && session.paymentStatus !== 'Paid') {
        issues.push({
          type: automaticIssueResolver.ResolvableIssueTypes.ORPHANED_PAYMENT,
          description: 'Has transaction ID but payment status not Paid',
          severity: 'high'
        });
      }

      // Check for status inconsistency
      if (session.mpesaResultCode === 0 && session.paymentStatus !== 'Paid') {
        issues.push({
          type: automaticIssueResolver.ResolvableIssueTypes.STATUS_INCONSISTENCY,
          description: 'Success result code but payment not marked as Paid',
          severity: 'high'
        });
      }

      // Check for amount mismatch
      if (session.mpesaAmount && parseFloat(session.mpesaAmount) !== session.price) {
        const difference = Math.abs(parseFloat(session.mpesaAmount) - session.price);
        issues.push({
          type: automaticIssueResolver.ResolvableIssueTypes.AMOUNT_MISMATCH,
          description: `Amount mismatch: Expected ${session.price}, Got ${session.mpesaAmount}`,
          severity: difference > 10 ? 'high' : 'low'
        });
      }

      return {
        sessionId: session._id,
        client: session.client?.name,
        psychologist: session.psychologist?.name,
        paymentStatus: session.paymentStatus,
        sessionStatus: session.status,
        amount: session.price,
        mpesaAmount: session.mpesaAmount,
        transactionId: session.mpesaTransactionID,
        resultCode: session.mpesaResultCode,
        paymentInitiatedAt: session.paymentInitiatedAt,
        issues
      };
    }).filter(item => item.issues.length > 0);

    res.json({
      success: true,
      potentialIssues: categorizedIssues,
      summary: {
        total: categorizedIssues.length,
        high: categorizedIssues.filter(i => i.issues.some(issue => issue.severity === 'high')).length,
        medium: categorizedIssues.filter(i => i.issues.some(issue => issue.severity === 'medium')).length,
        low: categorizedIssues.filter(i => i.issues.some(issue => issue.severity === 'low')).length
      }
    });

  } catch (error) {
    console.error('❌ Error getting potential issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get potential issues'
    });
  }
});

/**
 * POST /api/issue-resolution/schedule
 * Schedule resolution for a specific issue
 */
router.post('/schedule', auth, async (req, res) => {
  try {
    // Only admins can schedule resolution
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { sessionId, issueType, delayMinutes = 5, context = {} } = req.body;

    if (!sessionId || !issueType) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and issue type are required'
      });
    }

    // Validate issue type
    if (!Object.values(automaticIssueResolver.ResolvableIssueTypes).includes(issueType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid issue type'
      });
    }

    const delayMs = delayMinutes * 60 * 1000;

    console.log(`⏰ Admin ${req.user.email} scheduled ${issueType} resolution for session ${sessionId} in ${delayMinutes} minutes`);

    // Schedule the resolution
    automaticIssueResolver.scheduleResolution(issueType, {
      sessionId,
      ...context
    }, delayMs);

    res.json({
      success: true,
      message: `Resolution scheduled for ${issueType} in ${delayMinutes} minutes`,
      scheduledFor: new Date(Date.now() + delayMs)
    });

  } catch (error) {
    console.error('❌ Error scheduling resolution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule resolution'
    });
  }
});

module.exports = router;