const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const SessionNote = require('../models/SessionNote');
const IntakeForm = require('../models/IntakeForm');
const sessionReportGenerator = require('../utils/sessionReportGenerator');
const { logSessionStatusChange } = require('../utils/auditLogger');
const securityMonitoringService = require('../services/securityMonitoringService');
const breachAlertingService = require('../services/breachAlertingService');

/**
 * Session Export API Routes
 * 
 * Provides endpoints for exporting session data as PDF reports.
 * Requirements: 11.5 - HIPAA-compliant report in PDF format
 */

/**
 * Helper function to monitor data export and trigger breach detection
 */
async function monitorDataExport(userId, userRole, exportType, recordCount, ipAddress, userAgent) {
  try {
    const monitoringResult = await securityMonitoringService.runSecurityMonitoring({
      actionType: 'data_export',
      userId,
      userRole,
      exportType,
      recordCount,
      ipAddress,
      userAgent
    });
    
    // Trigger breach alerting if detected
    if (monitoringResult.breachDetected) {
      await breachAlertingService.processSecurityBreach({
        alerts: monitoringResult.alerts,
        recommendations: monitoringResult.recommendations,
        context: {
          actionType: 'data_export',
          userId,
          userRole,
          exportType,
          recordCount,
          ipAddress,
          reason: 'suspicious_export_activity'
        }
      });
    }
    
    return monitoringResult;
  } catch (error) {
    console.error('❌ Error monitoring data export:', error);
    return { breachDetected: false, alerts: [], recommendations: [] };
  }
}

// @route   GET /api/session-export/:sessionId/report
// @desc    Generate PDF report for a session
// @access  Private (Psychologist only)
router.get('/:sessionId/report', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeNotes = 'true', includeIntake = 'true', encrypted = 'false' } = req.query;
    
    // Verify user is a psychologist
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied. Psychologists only.' });
    }
    
    // Monitor data export activity
    await monitorDataExport(
      req.user.id,
      user.role,
      'session_report',
      1, // Single session
      req.ip,
      req.get('User-Agent')
    );
    
    // Get session with populated data
    const session = await Session.findById(sessionId)
      .populate('client', 'name email phone profilePicture createdAt')
      .populate('psychologist', 'name email psychologistDetails');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Verify authorization
    if (session.psychologist._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to export this session' });
    }
    
    // Get session notes (decrypted)
    let notes = [];
    if (includeNotes === 'true') {
      const sessionNotes = await SessionNote.find({ session: sessionId, isLatest: true })
        .populate('author', 'name email role')
        .sort({ createdAt: -1 });
      
      notes = sessionNotes.map(note => ({
        ...note.toObject(),
        content: note.getDecryptedContent()
      }));
    }
    
    // Get intake form (decrypted)
    let intakeForm = null;
    if (includeIntake === 'true') {
      const form = await IntakeForm.findOne({ session: sessionId });
      if (form) {
        intakeForm = form.getDecryptedData();
      }
    }
    
    // Generate report
    const reportOptions = {
      session: session.toObject(),
      client: session.client,
      therapist: session.psychologist,
      notes,
      intakeForm,
      includeNotes: includeNotes === 'true',
      isClientReport: false
    };
    
    // Log the export action
    try {
      await logSessionStatusChange({
        sessionId: sessionId,
        previousStatus: 'N/A',
        newStatus: 'Report Exported',
        reason: `Session report exported by therapist (encrypted: ${encrypted})`,
        userId: req.user.id,
        userRole: 'psychologist',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log export action:', auditError.message);
    }
    
    if (encrypted === 'true') {
      // Return encrypted report
      const encryptedReport = await sessionReportGenerator.generateEncryptedReport(reportOptions);
      
      res.json({
        success: true,
        encrypted: true,
        data: encryptedReport.encryptedData,
        filename: encryptedReport.filename,
        contentType: encryptedReport.contentType
      });
    } else {
      // Return PDF directly
      const pdfBuffer = await sessionReportGenerator.generateSessionReport(reportOptions);
      
      const filename = `session-report-${session.bookingReference || sessionId}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    }
    
    console.log(`📄 Session report generated for session ${sessionId}`);
  } catch (err) {
    console.error('Error generating session report:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});


// @route   GET /api/session-export/client/:sessionId/report
// @desc    Generate client-friendly PDF report for a session
// @access  Private (Client only)
router.get('/client/:sessionId/report', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify user is a client
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ msg: 'Access denied. Clients only.' });
    }
    
    // Monitor data export activity
    await monitorDataExport(
      req.user.id,
      user.role,
      'client_session_report',
      1, // Single session
      req.ip,
      req.get('User-Agent')
    );
    
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
    
    // Get only client-visible notes
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

// @route   POST /api/session-export/bulk
// @desc    Generate bulk export of multiple sessions
// @access  Private (Psychologist only)
router.post('/bulk', auth, async (req, res) => {
  try {
    const { sessionIds, includeNotes = true, includeIntake = true } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ msg: 'Session IDs array is required' });
    }
    
    if (sessionIds.length > 10) {
      return res.status(400).json({ msg: 'Maximum 10 sessions per bulk export' });
    }
    
    // Verify user is a psychologist
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied. Psychologists only.' });
    }
    
    // Monitor bulk data export activity (high risk)
    await monitorDataExport(
      req.user.id,
      user.role,
      'bulk_session_export',
      sessionIds.length, // Number of sessions being exported
      req.ip,
      req.get('User-Agent')
    );
    
    // Get all sessions
    const sessions = await Session.find({
      _id: { $in: sessionIds },
      psychologist: req.user.id
    })
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email psychologistDetails');
    
    if (sessions.length === 0) {
      return res.status(404).json({ msg: 'No authorized sessions found' });
    }
    
    // Generate reports for each session
    const reports = [];
    
    for (const session of sessions) {
      let notes = [];
      if (includeNotes) {
        const sessionNotes = await SessionNote.find({ session: session._id, isLatest: true })
          .populate('author', 'name email role');
        notes = sessionNotes.map(note => ({
          ...note.toObject(),
          content: note.getDecryptedContent()
        }));
      }
      
      let intakeForm = null;
      if (includeIntake) {
        const form = await IntakeForm.findOne({ session: session._id });
        if (form) {
          intakeForm = form.getDecryptedData();
        }
      }
      
      const pdfBuffer = await sessionReportGenerator.generateSessionReport({
        session: session.toObject(),
        client: session.client,
        therapist: session.psychologist,
        notes,
        intakeForm,
        includeNotes,
        isClientReport: false
      });
      
      reports.push({
        sessionId: session._id,
        bookingReference: session.bookingReference,
        clientName: session.client?.name,
        sessionDate: session.sessionDate,
        pdf: pdfBuffer.toString('base64')
      });
    }
    
    // Log bulk export
    try {
      await logSessionStatusChange({
        sessionId: 'BULK_EXPORT',
        previousStatus: 'N/A',
        newStatus: 'Bulk Export',
        reason: `Bulk export of ${reports.length} sessions`,
        userId: req.user.id,
        userRole: 'psychologist',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log bulk export:', auditError.message);
    }
    
    res.json({
      success: true,
      count: reports.length,
      reports
    });
    
    console.log(`📄 Bulk export generated: ${reports.length} sessions`);
  } catch (err) {
    console.error('Error generating bulk export:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST /api/session-export/decrypt
// @desc    Decrypt an encrypted report
// @access  Private (Psychologist only)
router.post('/decrypt', auth, async (req, res) => {
  try {
    const { encryptedData } = req.body;
    
    if (!encryptedData) {
      return res.status(400).json({ msg: 'Encrypted data is required' });
    }
    
    // Verify user is a psychologist
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Access denied. Psychologists only.' });
    }
    
    const pdfBuffer = sessionReportGenerator.decryptReport(encryptedData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="decrypted-report.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error decrypting report:', err);
    res.status(500).json({ msg: 'Failed to decrypt report', error: err.message });
  }
});

module.exports = router;
