/**
 * Accounting Software Integration Routes
 * 
 * Provides endpoints for exporting payment data to various accounting software formats
 */

const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const { generateAccountingExport, generateJournalEntries, getSupportedFormats, CHART_OF_ACCOUNTS } = require('../utils/accountingExport');
const auditLogger = require('../utils/auditLogger');
const moment = require('moment');

/**
 * GET /api/accounting/formats
 * Get supported accounting software formats
 */
router.get('/formats', auth, admin, async (req, res) => {
  try {
    const formats = getSupportedFormats();
    
    // Log admin access
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'View accounting formats',
      accessedData: 'Supported accounting software formats',
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      formats,
      chartOfAccounts: CHART_OF_ACCOUNTS
    });
  } catch (error) {
    console.error('Error fetching accounting formats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounting formats'
    });
  }
});

/**
 * GET /api/accounting/export
 * Export payment data in specified accounting format
 */
router.get('/export', auth, admin, async (req, res) => {
  try {
    const { 
      format = 'generic',
      startDate,
      endDate,
      clientId,
      psychologistId,
      includeRefunds = 'false'
    } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Validate date format
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (start.isAfter(end)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    // Build query for sessions with payments
    const Session = require('../models/Session');
    const query = {
      paymentStatus: 'Paid',
      paymentVerifiedAt: {
        $gte: start.toDate(),
        $lte: end.endOf('day').toDate()
      }
    };
    
    // Add optional filters
    if (clientId) {
      query.client = clientId;
    }
    
    if (psychologistId) {
      query.psychologist = psychologistId;
    }
    
    // Include refunds if requested
    if (includeRefunds === 'true') {
      query.paymentStatus = { $in: ['Paid', 'Refunded'] };
    }
    
    // Fetch sessions with populated client and psychologist data
    const sessions = await Session.find(query)
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .sort({ paymentVerifiedAt: -1 });
    
    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payment transactions found for the specified criteria'
      });
    }
    
    // Generate export content
    const exportOptions = {
      startDate: startDate,
      endDate: endDate,
      includeRefunds: includeRefunds === 'true'
    };
    
    const exportContent = generateAccountingExport(sessions, format, exportOptions);
    
    // Get format info for proper file naming and headers
    const formats = getSupportedFormats();
    const formatInfo = formats.find(f => f.key === format.toLowerCase()) || formats.find(f => f.key === 'generic');
    
    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: `Export accounting data (${formatInfo.name})`,
      accessedData: `${sessions.length} payment transactions from ${startDate} to ${endDate}`,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    // Set headers for file download
    const filename = `accounting_export_${format}_${startDate}_${endDate}.${formatInfo.fileExtension}`;
    res.setHeader('Content-Type', formatInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(exportContent);
    
  } catch (error) {
    console.error('Error generating accounting export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate accounting export'
    });
  }
});

/**
 * GET /api/accounting/journal-entries
 * Generate journal entries for double-entry bookkeeping
 */
router.get('/journal-entries', auth, admin, async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      clientId,
      psychologistId,
      includeRefunds = 'false'
    } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Validate date format
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Build query
    const Session = require('../models/Session');
    const query = {
      paymentStatus: 'Paid',
      paymentVerifiedAt: {
        $gte: start.toDate(),
        $lte: end.endOf('day').toDate()
      }
    };
    
    if (clientId) query.client = clientId;
    if (psychologistId) query.psychologist = psychologistId;
    if (includeRefunds === 'true') {
      query.paymentStatus = { $in: ['Paid', 'Refunded'] };
    }
    
    // Fetch sessions
    const sessions = await Session.find(query)
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .sort({ paymentVerifiedAt: -1 });
    
    // Generate journal entries
    const journalEntries = generateJournalEntries(sessions, {
      includeRefunds: includeRefunds === 'true'
    });
    
    // Calculate totals
    const totals = journalEntries.reduce((acc, entry) => {
      entry.entries.forEach(line => {
        acc.totalDebits += parseFloat(line.debit || 0);
        acc.totalCredits += parseFloat(line.credit || 0);
      });
      return acc;
    }, { totalDebits: 0, totalCredits: 0 });
    
    // Log admin access
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Generate journal entries',
      accessedData: `${journalEntries.length} journal entries from ${startDate} to ${endDate}`,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      journalEntries,
      summary: {
        totalEntries: journalEntries.length,
        totalTransactions: sessions.length,
        totalDebits: totals.totalDebits.toFixed(2),
        totalCredits: totals.totalCredits.toFixed(2),
        balanced: Math.abs(totals.totalDebits - totals.totalCredits) < 0.01,
        dateRange: {
          start: startDate,
          end: endDate
        }
      },
      chartOfAccounts: CHART_OF_ACCOUNTS
    });
    
  } catch (error) {
    console.error('Error generating journal entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate journal entries'
    });
  }
});

/**
 * GET /api/accounting/summary
 * Get accounting summary for dashboard
 */
router.get('/summary', auth, admin, async (req, res) => {
  try {
    const { 
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().endOf('month').format('YYYY-MM-DD')
    } = req.query;
    
    const start = moment(startDate);
    const end = moment(endDate);
    
    const Session = require('../models/Session');
    
    // Get paid transactions
    const paidSessions = await Session.find({
      paymentStatus: 'Paid',
      paymentVerifiedAt: {
        $gte: start.toDate(),
        $lte: end.endOf('day').toDate()
      }
    });
    
    // Get refunded transactions
    const refundedSessions = await Session.find({
      paymentStatus: 'Refunded',
      paymentVerifiedAt: {
        $gte: start.toDate(),
        $lte: end.endOf('day').toDate()
      }
    });
    
    // Calculate totals
    const totalRevenue = paidSessions.reduce((sum, session) => sum + (parseFloat(session.price) || 0), 0);
    const totalRefunds = refundedSessions.reduce((sum, session) => sum + (parseFloat(session.price) || 0), 0);
    const processingFees = totalRevenue * 0.01; // 1% M-Pesa fee
    const netRevenue = totalRevenue - processingFees - totalRefunds;
    
    // Group by session type
    const revenueByType = paidSessions.reduce((acc, session) => {
      const type = session.sessionType || 'Standard';
      acc[type] = (acc[type] || 0) + (parseFloat(session.price) || 0);
      return acc;
    }, {});
    
    // Log admin access
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'View accounting summary',
      accessedData: `Accounting summary from ${startDate} to ${endDate}`,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      summary: {
        dateRange: { start: startDate, end: endDate },
        totalTransactions: paidSessions.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalRefunds: totalRefunds.toFixed(2),
        processingFees: processingFees.toFixed(2),
        netRevenue: netRevenue.toFixed(2),
        revenueByType,
        averageTransactionValue: paidSessions.length > 0 ? (totalRevenue / paidSessions.length).toFixed(2) : '0.00'
      },
      chartOfAccounts: CHART_OF_ACCOUNTS
    });
    
  } catch (error) {
    console.error('Error generating accounting summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate accounting summary'
    });
  }
});

/**
 * POST /api/accounting/schedule-export
 * Schedule automated accounting exports
 */
router.post('/schedule-export', auth, admin, async (req, res) => {
  try {
    const { 
      format,
      frequency, // daily, weekly, monthly
      dayOfWeek, // for weekly (0-6, Sunday=0)
      dayOfMonth, // for monthly (1-31)
      email,
      enabled = true
    } = req.body;
    
    // Validate format
    const supportedFormats = getSupportedFormats();
    if (!supportedFormats.find(f => f.key === format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format'
      });
    }
    
    // Validate frequency
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid frequency. Must be daily, weekly, or monthly'
      });
    }
    
    // For now, we'll store the schedule in a simple way
    // In production, you'd want to use a proper job scheduler like node-cron or Bull
    const schedule = {
      id: Date.now().toString(),
      format,
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      email,
      enabled,
      createdBy: req.user.id,
      createdAt: new Date(),
      lastRun: null,
      nextRun: calculateNextRun(frequency, dayOfWeek, dayOfMonth)
    };
    
    // Log the scheduling action
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Schedule accounting export',
      accessedData: `${frequency} ${format} export to ${email}`,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    // In a real implementation, you'd save this to a database
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Accounting export scheduled successfully',
      schedule
    });
    
  } catch (error) {
    console.error('Error scheduling accounting export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule accounting export'
    });
  }
});

/**
 * Calculate next run time for scheduled export
 */
function calculateNextRun(frequency, dayOfWeek, dayOfMonth) {
  const now = moment();
  
  switch (frequency) {
    case 'daily':
      return now.add(1, 'day').startOf('day').add(9, 'hours').toDate(); // 9 AM next day
    case 'weekly':
      const nextWeek = now.clone().add(1, 'week').startOf('week').add(dayOfWeek || 1, 'days');
      return nextWeek.startOf('day').add(9, 'hours').toDate();
    case 'monthly':
      const nextMonth = now.clone().add(1, 'month').startOf('month').add((dayOfMonth || 1) - 1, 'days');
      return nextMonth.startOf('day').add(9, 'hours').toDate();
    default:
      return now.add(1, 'day').toDate();
  }
}

module.exports = router;