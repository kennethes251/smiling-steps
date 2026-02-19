/**
 * Cancellation Routes
 * 
 * API endpoints for session cancellation and refund management.
 * Requirements: 9.3, 9.4, 9.5 from Cancellation & Rescheduling
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { cancellationService, CANCELLATION_CONFIG } = require('../services/cancellationService');
const { refundService } = require('../services/refundService');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * GET /api/sessions/:id/cancellation-eligibility
 * Check if session can be cancelled and get refund info
 */
router.get('/sessions/:id/cancellation-eligibility', auth, async (req, res) => {
  try {
    const eligibility = await cancellationService.checkCancellationEligibility(
      req.params.id,
      req.user.id
    );
    res.json(eligibility);
  } catch (error) {
    console.error('Cancellation eligibility check error:', error);
    res.status(500).json({ error: 'Failed to check cancellation eligibility' });
  }
});

/**
 * POST /api/sessions/:id/cancel
 * Cancel a session
 * Requirements: 9.3, 9.4, 9.5
 */
router.post('/sessions/:id/cancel', auth, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ 
        error: 'Cancellation reason is required',
        validReasons: CANCELLATION_CONFIG.CANCELLATION_REASONS
      });
    }

    if (!CANCELLATION_CONFIG.CANCELLATION_REASONS.includes(reason)) {
      return res.status(400).json({
        error: 'Invalid cancellation reason',
        validReasons: CANCELLATION_CONFIG.CANCELLATION_REASONS
      });
    }

    const result = await cancellationService.cancelSession(
      req.params.id,
      req.user.id,
      reason,
      notes || ''
    );

    res.json(result);
  } catch (error) {
    console.error('Session cancellation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/sessions/:id/cancel
 * Admin cancellation of a session (always full refund)
 */
router.post('/admin/sessions/:id/cancel', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const result = await cancellationService.adminCancelSession(
      req.params.id,
      req.user.id,
      reason,
      notes || ''
    );

    res.json(result);
  } catch (error) {
    console.error('Admin session cancellation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/cancellations/history
 * Get user's cancellation history
 */
router.get('/cancellations/history', auth, async (req, res) => {
  try {
    const history = await cancellationService.getCancellationHistory(
      req.user.id,
      req.user.role
    );
    res.json(history);
  } catch (error) {
    console.error('Cancellation history error:', error);
    res.status(500).json({ error: 'Failed to fetch cancellation history' });
  }
});

/**
 * GET /api/cancellations/policy
 * Get cancellation policy details
 */
router.get('/cancellations/policy', (req, res) => {
  const policy = cancellationService.getCancellationPolicy();
  res.json(policy);
});

/**
 * GET /api/admin/refunds/pending
 * Get pending refunds (admin only)
 */
router.get('/admin/refunds/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const pendingRefunds = await cancellationService.getPendingRefunds();
    res.json(pendingRefunds);
  } catch (error) {
    console.error('Pending refunds error:', error);
    res.status(500).json({ error: 'Failed to fetch pending refunds' });
  }
});

/**
 * POST /api/admin/refunds/:sessionId/process
 * Manually process a refund (admin only)
 */
router.post('/admin/refunds/:sessionId/process', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const result = await cancellationService.manuallyProcessRefund(
      req.params.sessionId,
      req.user.id,
      transactionId
    );

    res.json(result);
  } catch (error) {
    console.error('Manual refund processing error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/refunds/:sessionId/deny
 * Deny a refund request (admin only)
 */
router.post('/admin/refunds/:sessionId/deny', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    const result = await cancellationService.denyRefund(
      req.params.sessionId,
      req.user.id,
      reason
    );

    res.json(result);
  } catch (error) {
    console.error('Refund denial error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin/cancellations/stats
 * Get cancellation statistics (admin only)
 */
router.get('/admin/cancellations/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await cancellationService.getCancellationStats();
    res.json(stats);
  } catch (error) {
    console.error('Cancellation stats error:', error);
    res.status(500).json({ error: 'Failed to fetch cancellation statistics' });
  }
});

/**
 * GET /api/refunds/:sessionId/status
 * Get refund status for a session
 */
router.get('/refunds/:sessionId/status', auth, async (req, res) => {
  try {
    const status = await refundService.getRefundStatus(req.params.sessionId);
    res.json(status);
  } catch (error) {
    console.error('Refund status error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/refunds/:sessionId/retry
 * Retry a failed refund (admin only)
 */
router.post('/admin/refunds/:sessionId/retry', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await refundService.retryRefund(req.params.sessionId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Refund retry error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin/refunds/stats
 * Get refund statistics (admin only)
 */
router.get('/admin/refunds/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const stats = await refundService.getRefundStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Refund stats error:', error);
    res.status(500).json({ error: 'Failed to fetch refund statistics' });
  }
});

module.exports = router;
