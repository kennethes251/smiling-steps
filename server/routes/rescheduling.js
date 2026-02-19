/**
 * Rescheduling Routes
 * 
 * API endpoints for session rescheduling management.
 * Requirements: 9.1, 9.2, 9.5 from Cancellation & Rescheduling
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { reschedulingService, RESCHEDULE_CONFIG } = require('../services/reschedulingService');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * GET /api/sessions/:id/reschedule-eligibility
 * Check if session can be rescheduled and get requirements
 * Requirements: 9.1, 9.2
 */
router.get('/sessions/:id/reschedule-eligibility', auth, async (req, res) => {
  try {
    const eligibility = await reschedulingService.checkRescheduleEligibility(
      req.params.id,
      req.user.id
    );
    res.json(eligibility);
  } catch (error) {
    console.error('Reschedule eligibility check error:', error);
    res.status(500).json({ error: 'Failed to check reschedule eligibility' });
  }
});

/**
 * GET /api/sessions/:id/availability
 * Check therapist availability for rescheduling
 * Requirements: 9.1, 9.2
 */
router.get('/sessions/:id/availability', auth, async (req, res) => {
  try {
    const { date, duration } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user has access to this session
    const isClient = session.client.toString() === req.user.id;
    const isTherapist = session.psychologist.toString() === req.user.id;
    
    if (!isClient && !isTherapist && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to check availability for this session' });
    }
    
    const availability = await reschedulingService.checkAvailability(
      session.psychologist,
      new Date(date),
      parseInt(duration) || 60,
      req.params.id
    );
    
    res.json(availability);
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * POST /api/sessions/:id/reschedule
 * Request to reschedule a session
 * Requirements: 9.1, 9.2, 9.5
 */
router.post('/sessions/:id/reschedule', auth, async (req, res) => {
  try {
    const { newDate, reason, notes } = req.body;
    
    if (!newDate) {
      return res.status(400).json({ error: 'New date is required' });
    }
    
    if (!reason) {
      return res.status(400).json({ 
        error: 'Reschedule reason is required',
        validReasons: RESCHEDULE_CONFIG.RESCHEDULE_REASONS
      });
    }
    
    if (!RESCHEDULE_CONFIG.RESCHEDULE_REASONS.includes(reason)) {
      return res.status(400).json({
        error: 'Invalid reschedule reason',
        validReasons: RESCHEDULE_CONFIG.RESCHEDULE_REASONS
      });
    }
    
    const result = await reschedulingService.requestReschedule(
      req.params.id,
      req.user.id,
      new Date(newDate),
      reason,
      notes || ''
    );
    
    res.json(result);
  } catch (error) {
    console.error('Session reschedule error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:id/reschedule/approve
 * Approve a pending reschedule request (therapist only)
 * Requirements: 9.2
 */
router.post('/sessions/:id/reschedule/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only therapists can approve reschedule requests' });
    }
    
    const { notes } = req.body;
    
    const result = await reschedulingService.approveReschedule(
      req.params.id,
      req.user.id,
      notes || ''
    );
    
    res.json(result);
  } catch (error) {
    console.error('Reschedule approval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:id/reschedule/reject
 * Reject a pending reschedule request (therapist only)
 * Requirements: 9.2
 */
router.post('/sessions/:id/reschedule/reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only therapists can reject reschedule requests' });
    }
    
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const result = await reschedulingService.rejectReschedule(
      req.params.id,
      req.user.id,
      reason
    );
    
    res.json(result);
  } catch (error) {
    console.error('Reschedule rejection error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/reschedule/pending
 * Get pending reschedule requests for therapist
 */
router.get('/reschedule/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only therapists can view pending reschedule requests' });
    }
    
    const pendingRequests = await reschedulingService.getPendingRescheduleRequests(req.user.id);
    res.json(pendingRequests);
  } catch (error) {
    console.error('Pending reschedule requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reschedule requests' });
  }
});

/**
 * GET /api/sessions/:id/reschedule/history
 * Get reschedule history for a session
 */
router.get('/sessions/:id/reschedule/history', auth, async (req, res) => {
  try {
    const history = await reschedulingService.getRescheduleHistory(
      req.params.id,
      req.user.id
    );
    res.json(history);
  } catch (error) {
    console.error('Reschedule history error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/reschedule/history
 * Get user's reschedule history (all sessions)
 */
router.get('/reschedule/history', auth, async (req, res) => {
  try {
    const history = await reschedulingService.getUserRescheduleHistory(
      req.user.id,
      req.user.role
    );
    res.json(history);
  } catch (error) {
    console.error('User reschedule history error:', error);
    res.status(500).json({ error: 'Failed to fetch reschedule history' });
  }
});

/**
 * GET /api/reschedule/policy
 * Get reschedule policy details
 */
router.get('/reschedule/policy', (req, res) => {
  const policy = reschedulingService.getReschedulePolicy();
  res.json(policy);
});

/**
 * GET /api/admin/reschedule/stats
 * Get reschedule statistics (admin only)
 */
router.get('/admin/reschedule/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { startDate, endDate } = req.query;
    const stats = await reschedulingService.getRescheduleStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Reschedule stats error:', error);
    res.status(500).json({ error: 'Failed to fetch reschedule statistics' });
  }
});

/**
 * POST /api/admin/sessions/:id/reschedule
 * Admin reschedule (always approved)
 */
router.post('/admin/sessions/:id/reschedule', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { newDate, reason, notes } = req.body;
    
    if (!newDate) {
      return res.status(400).json({ error: 'New date is required' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reschedule reason is required' });
    }
    
    // Admin reschedules are always approved
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id)
      .populate('client', 'name email')
      .populate('psychologist', 'name email');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check availability
    const availability = await reschedulingService.checkAvailability(
      session.psychologist._id,
      new Date(newDate),
      60,
      req.params.id
    );
    
    if (!availability.available) {
      return res.status(400).json({
        error: 'The requested time slot is not available',
        conflicts: availability.conflicts
      });
    }
    
    const originalDate = session.sessionDate;
    const newDateTime = new Date(newDate);
    
    // Update session
    session.originalSessionDate = originalDate;
    session.sessionDate = newDateTime;
    session.rescheduleRequestedAt = new Date();
    session.rescheduleApprovedAt = new Date();
    session.rescheduleRequestedBy = 'admin';
    session.rescheduleApprovedBy = req.user.id;
    session.rescheduleReason = reason;
    session.rescheduleNotes = notes || '';
    session.rescheduleStatus = 'approved';
    session.rescheduleCount = (session.rescheduleCount || 0) + 1;
    session.newRequestedDate = newDateTime;
    
    await session.save();
    
    // Log audit event
    await logAuditEvent({
      action: 'ADMIN_SESSION_RESCHEDULED',
      userId: req.user.id,
      sessionId: session._id,
      details: {
        originalDate,
        newDate: newDateTime,
        reason,
        notes,
        adminId: req.user.id
      }
    });
    
    res.json({
      success: true,
      message: 'Session rescheduled by admin',
      session: {
        id: session._id,
        originalDate,
        newDate: newDateTime,
        rescheduleCount: session.rescheduleCount
      }
    });
  } catch (error) {
    console.error('Admin reschedule error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
