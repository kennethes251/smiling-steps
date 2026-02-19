/**
 * Earnings Routes
 * 
 * Implements earnings dashboard endpoints for psychologists.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * Endpoints:
 * - GET /api/users/earnings - Get psychologist earnings (7.1, 7.2, 7.3)
 * - GET /api/users/earnings/export - Export earnings as CSV (7.4)
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { earningsService } = require('../services/earningsService');

/**
 * @route   GET /api/users/earnings
 * @desc    Get psychologist earnings with optional date range filtering
 * @access  Private (Psychologist only)
 * Requirements: 7.1, 7.2, 7.3
 */
router.get('/', auth, async (req, res) => {
  try {
    console.log('💰 Earnings request for user:', req.user.id);
    
    // Verify user is a psychologist
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can access earnings'
      });
    }
    
    // Parse query parameters
    const {
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    
    // Get earnings data
    const earnings = await earningsService.getEarnings(req.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: pageNum,
      limit: limitNum
    });
    
    console.log('✅ Earnings fetched successfully:', {
      userId: req.user.id,
      totalEarnings: earnings.totals.totalEarnings,
      totalSessions: earnings.totals.totalSessions,
      paymentsCount: earnings.payments.length
    });
    
    res.json({
      success: true,
      ...earnings
    });
    
  } catch (error) {
    console.error('❌ Earnings fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching earnings'
    });
  }
});

/**
 * @route   GET /api/users/earnings/export
 * @desc    Export psychologist earnings as CSV
 * @access  Private (Psychologist only)
 * Requirements: 7.4
 */
router.get('/export', auth, async (req, res) => {
  try {
    console.log('📊 Earnings export request for user:', req.user.id);
    
    // Verify user is a psychologist
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only psychologists can export earnings'
      });
    }
    
    // Parse query parameters
    const { startDate, endDate } = req.query;
    
    // Get earnings data for export
    const payments = await earningsService.getEarningsForExport(req.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
    
    // Generate CSV content - Requirement 7.4
    const csvHeaders = ['Date', 'Client', 'Session Type', 'Amount (KES)', 'Transaction ID', 'Payment Status', 'Verified Date'];
    const csvRows = payments.map(p => [
      p.date,
      `"${(p.clientName || '').replace(/"/g, '""')}"`, // Escape quotes in client name
      p.sessionType,
      p.amount,
      p.transactionId,
      p.paymentStatus,
      p.verifiedAt
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // Generate filename with date range
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `earnings_${dateStr}.csv`;
    
    console.log('✅ Earnings export generated:', {
      userId: req.user.id,
      recordCount: payments.length,
      filename
    });
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('❌ Earnings export error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while exporting earnings'
    });
  }
});

module.exports = router;
