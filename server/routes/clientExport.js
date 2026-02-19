const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const SessionNote = require('../models/SessionNote');
const sessionReportGenerator = require('../utils/sessionReportGenerator');
const { logSessionStatusChange } = require('../utils/auditLogger');

/**
 * Client Export API Routes
 * 
 * Provides endpoints for clients to export their session history as PDF.
 * Requirements: 12.5 - Generate session history summary PDF
 */

// @route   GET /api/client-export/my-history
// @desc    Generate PDF summary of client's session history
// @access  Private (Client only)
router.get('/my-history', auth, async (req, res) => {
  try {
    // Verify user is a client
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ msg: 'Access denied. Clients only.' });
    }
    
    // Get all completed sessions for this client
    const sessions = await Session.find({
      client: req.user.id,
      status: { $in: ['Completed', 'Confirmed', 'In Progress'] }
    })
      .populate('psychologist', 'name email psychologistDetails')
      .sort({ sessionDate: -1 })
      .lean();
    
    if (sessions.length === 0) {
      return res.status(404).json({ msg: 'No sessions found to export' });
    }
    
    // Calculate summary statistics
    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'Completed').length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.callDuration || 0), 0),
      therapists: [...new Set(sessions.map(s => s.psychologist?.name).filter(Boolean))],
      sessionTypes: sessions.reduce((acc, s) => {
        acc[s.sessionType] = (acc[s.sessionType] || 0) + 1;
        return acc;
      }, {}),
      dateRange: {
        earliest: sessions[sessions.length - 1]?.sessionDate,
        latest: sessions[0]?.sessionDate
      }
    };
    
    // Generate the PDF report
    const pdfBuffer = await sessionReportGenerator.generateClientHistorySummary({
      client: user,
      sessions,
      stats
    });
    
    // Log the export action
    try {
      await logSessionStatusChange({
        sessionId: 'CLIENT_HISTORY_EXPORT',
        previousStatus: 'N/A',
        newStatus: 'History Exported',
        reason: `Client exported session history summary (${sessions.length} sessions)`,
        userId: req.user.id,
        userRole: 'client',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log export action:', auditError.message);
    }
    
    const filename = `session-history-${user.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
    console.log(`📄 Client history export generated for user ${req.user.id} (${sessions.length} sessions)`);
  } catch (err) {
    console.error('Error generating client history export:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET /api/client-export/session/:sessionId
// @desc    Generate PDF report for a single session (client version)
// @access  Private (Client only)
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify user is a client
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ msg: 'Access denied. Clients only.' });
    }
    
    // Get session with populated data
    const session = await Session.findById(sessionId)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email psychologistDetails');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Verify authorization - client can only export their own sessions
    if (session.client._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to export this session' });
    }
    
    // Get only client-visible notes (exclude confidential clinical notes)
    const sessionNotes = await SessionNote.find({ 
      session: sessionId, 
      isLatest: true,
      isClientVisible: true 
    })
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });
    
    const notes = sessionNotes.map(note => ({
      ...note.toObject(),
      content: note.getDecryptedContent()
    }));
    
    // Generate client report (no intake form, only visible notes)
    const reportOptions = {
      session: session.toObject(),
      client: session.client,
      therapist: session.psychologist,
      notes,
      intakeForm: null, // Don't include intake form in client reports
      includeNotes: true,
      isClientReport: true
    };
    
    const pdfBuffer = await sessionReportGenerator.generateSessionReport(reportOptions);
    
    // Log the export action
    try {
      await logSessionStatusChange({
        sessionId: sessionId,
        previousStatus: 'N/A',
        newStatus: 'Session Exported',
        reason: 'Client exported individual session report',
        userId: req.user.id,
        userRole: 'client',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log export action:', auditError.message);
    }
    
    const filename = `my-session-${session.bookingReference || sessionId}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
    console.log(`📄 Client session report generated for session ${sessionId}`);
  } catch (err) {
    console.error('Error generating client session report:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
