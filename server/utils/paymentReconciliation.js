/**
 * Payment Reconciliation Utility
 * Handles automatic reconciliation between internal records and M-Pesa transactions
 */

const Session = require('../models/Session');
const mpesaAPI = require('../config/mpesa');

/**
 * Reconciliation status types
 */
const ReconciliationStatus = {
  MATCHED: 'matched',
  UNMATCHED: 'unmatched',
  DISCREPANCY: 'discrepancy',
  PENDING_VERIFICATION: 'pending_verification'
};

/**
 * Compare internal transaction with M-Pesa record
 */
function compareTransactions(internalTx, mpesaTx) {
  const discrepancies = [];

  // Compare amount
  if (parseFloat(internalTx.amount) !== parseFloat(mpesaTx.amount)) {
    discrepancies.push({
      field: 'amount',
      internal: internalTx.amount,
      mpesa: mpesaTx.amount
    });
  }

  // Compare phone number (last 4 digits)
  const internalPhone = internalTx.phoneNumber?.slice(-4);
  const mpesaPhone = mpesaTx.phoneNumber?.slice(-4);
  if (internalPhone !== mpesaPhone) {
    discrepancies.push({
      field: 'phoneNumber',
      internal: `***${internalPhone}`,
      mpesa: `***${mpesaPhone}`
    });
  }

  // Compare transaction date (within 5 minute tolerance)
  const timeDiff = Math.abs(
    new Date(internalTx.timestamp) - new Date(mpesaTx.timestamp)
  );
  if (timeDiff > 5 * 60 * 1000) { // 5 minutes
    discrepancies.push({
      field: 'timestamp',
      internal: internalTx.timestamp,
      mpesa: mpesaTx.timestamp,
      difference: `${Math.round(timeDiff / 1000)}s`
    });
  }

  return discrepancies;
}

/**
 * Reconcile a single session payment
 */
async function reconcileSession(session) {
  try {
    // Skip if no M-Pesa transaction ID
    if (!session.mpesaTransactionID) {
      return {
        sessionId: session._id,
        status: ReconciliationStatus.PENDING_VERIFICATION,
        reason: 'No M-Pesa transaction ID'
      };
    }

    // Query M-Pesa for transaction details
    // Note: This would require M-Pesa Transaction Query API
    // For now, we'll validate against our stored data
    
    const internalRecord = {
      transactionId: session.mpesaTransactionID,
      amount: session.mpesaAmount || session.price,
      phoneNumber: session.mpesaPhoneNumber,
      timestamp: session.paymentVerifiedAt,
      checkoutRequestID: session.mpesaCheckoutRequestID
    };

    // Check for data consistency
    const issues = [];

    // Verify payment status matches transaction ID
    if (session.mpesaTransactionID && session.paymentStatus !== 'Paid') {
      issues.push({
        type: 'status_mismatch',
        message: 'Transaction ID exists but payment status is not Paid',
        currentStatus: session.paymentStatus
      });
    }

    // Verify amount consistency
    if (session.mpesaAmount && parseFloat(session.mpesaAmount) !== session.price) {
      issues.push({
        type: 'amount_mismatch',
        message: 'M-Pesa amount differs from session price',
        mpesaAmount: session.mpesaAmount,
        sessionPrice: session.price
      });
    }

    // Verify result code is success
    if (session.mpesaResultCode !== 0 && session.paymentStatus === 'Paid') {
      issues.push({
        type: 'result_code_mismatch',
        message: 'Payment marked as Paid but result code is not 0',
        resultCode: session.mpesaResultCode,
        resultDesc: session.mpesaResultDesc
      });
    }

    // Check for duplicate transaction IDs
    const duplicates = await Session.countDocuments({
      mpesaTransactionID: session.mpesaTransactionID,
      _id: { $ne: session._id }
    });

    if (duplicates > 0) {
      issues.push({
        type: 'duplicate_transaction',
        message: 'Transaction ID used in multiple sessions',
        duplicateCount: duplicates
      });
    }

    // Determine reconciliation status
    let status;
    if (issues.length === 0) {
      status = ReconciliationStatus.MATCHED;
    } else if (issues.some(i => i.type === 'duplicate_transaction' || i.type === 'amount_mismatch')) {
      status = ReconciliationStatus.DISCREPANCY;
    } else {
      status = ReconciliationStatus.UNMATCHED;
    }

    return {
      sessionId: session._id,
      status,
      transactionId: session.mpesaTransactionID,
      amount: session.price,
      phoneNumber: session.mpesaPhoneNumber?.slice(-4),
      timestamp: session.paymentVerifiedAt,
      issues,
      internalRecord
    };

  } catch (error) {
    console.error('❌ Reconciliation error for session:', session._id, error);
    return {
      sessionId: session._id,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Reconcile all payments within a date range
 */
async function reconcilePayments(startDate, endDate, options = {}) {
  try {
    console.log('🔍 Starting payment reconciliation:', { startDate, endDate });

    // Build query
    const query = {
      paymentStatus: 'Paid',
      paymentVerifiedAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Add optional filters
    if (options.clientId) {
      query.client = options.clientId;
    }
    if (options.psychologistId) {
      query.psychologist = options.psychologistId;
    }

    // Fetch paid sessions
    const sessions = await Session.find(query)
      .populate('client', 'name email')
      .populate('psychologist', 'name')
      .sort({ paymentVerifiedAt: -1 });

    console.log(`📊 Found ${sessions.length} paid sessions to reconcile`);

    // Reconcile each session
    const results = await Promise.all(
      sessions.map(session => reconcileSession(session))
    );

    // Aggregate results
    const summary = {
      totalTransactions: results.length,
      matched: results.filter(r => r.status === ReconciliationStatus.MATCHED).length,
      unmatched: results.filter(r => r.status === ReconciliationStatus.UNMATCHED).length,
      discrepancies: results.filter(r => r.status === ReconciliationStatus.DISCREPANCY).length,
      pendingVerification: results.filter(r => r.status === ReconciliationStatus.PENDING_VERIFICATION).length,
      errors: results.filter(r => r.status === 'error').length,
      totalAmount: sessions.reduce((sum, s) => sum + (s.price || 0), 0),
      dateRange: { startDate, endDate },
      timestamp: new Date()
    };

    // Group by status
    const grouped = {
      matched: results.filter(r => r.status === ReconciliationStatus.MATCHED),
      unmatched: results.filter(r => r.status === ReconciliationStatus.UNMATCHED),
      discrepancies: results.filter(r => r.status === ReconciliationStatus.DISCREPANCY),
      pendingVerification: results.filter(r => r.status === ReconciliationStatus.PENDING_VERIFICATION),
      errors: results.filter(r => r.status === 'error')
    };

    console.log('✅ Reconciliation complete:', summary);

    return {
      success: true,
      summary,
      results: grouped,
      allResults: results,
      sessions // Include sessions for CSV generation
    };

  } catch (error) {
    console.error('❌ Payment reconciliation failed:', error);
    throw error;
  }
}

/**
 * Generate reconciliation report in CSV format
 * Includes all transaction fields with proper escaping
 */
function generateReconciliationReport(reconciliationData, sessions = []) {
  const { allResults, summary } = reconciliationData;

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toISOString();
    } catch (e) {
      return 'N/A';
    }
  };

  // CSV header with all transaction fields
  const headers = [
    'Session ID',
    'Transaction ID',
    'Checkout Request ID',
    'Merchant Request ID',
    'Amount (KES)',
    'M-Pesa Amount',
    'Phone Number',
    'Payment Status',
    'Session Status',
    'Result Code',
    'Result Description',
    'Payment Initiated At',
    'Payment Verified At',
    'Reconciliation Status',
    'Issues',
    'Client Name',
    'Client Email',
    'Psychologist Name',
    'Session Type',
    'Session Date',
    'Payment Method',
    'Payment Attempts'
  ];

  // Create a map of session details for quick lookup
  const sessionMap = new Map();
  sessions.forEach(session => {
    sessionMap.set(session._id.toString(), session);
  });

  // CSV rows with all transaction fields
  const rows = allResults.map(result => {
    const session = sessionMap.get(result.sessionId?.toString());
    const issuesText = result.issues?.map(i => i.message).join('; ') || 'None';
    
    return [
      escapeCSV(result.sessionId),
      escapeCSV(result.transactionId || session?.mpesaTransactionID),
      escapeCSV(session?.mpesaCheckoutRequestID),
      escapeCSV(session?.mpesaMerchantRequestID),
      escapeCSV(result.amount || session?.price),
      escapeCSV(session?.mpesaAmount),
      escapeCSV(result.phoneNumber ? `***${result.phoneNumber}` : (session?.mpesaPhoneNumber ? `***${session.mpesaPhoneNumber.slice(-4)}` : 'N/A')),
      escapeCSV(session?.paymentStatus),
      escapeCSV(session?.status),
      escapeCSV(session?.mpesaResultCode),
      escapeCSV(session?.mpesaResultDesc),
      escapeCSV(formatDate(session?.paymentInitiatedAt)),
      escapeCSV(formatDate(result.timestamp || session?.paymentVerifiedAt)),
      escapeCSV(result.status),
      escapeCSV(issuesText),
      escapeCSV(session?.client?.name),
      escapeCSV(session?.client?.email),
      escapeCSV(session?.psychologist?.name),
      escapeCSV(session?.sessionType),
      escapeCSV(formatDate(session?.sessionDate)),
      escapeCSV(session?.paymentMethod || 'M-Pesa'),
      escapeCSV(session?.paymentAttempts?.length || 0)
    ];
  });

  // Add summary section at the top
  const summaryRows = [
    ['RECONCILIATION REPORT SUMMARY'],
    ['Generated At', formatDate(summary?.timestamp || new Date())],
    ['Date Range', `${formatDate(summary?.dateRange?.startDate)} to ${formatDate(summary?.dateRange?.endDate)}`],
    ['Total Transactions', summary?.totalTransactions || 0],
    ['Matched', summary?.matched || 0],
    ['Unmatched', summary?.unmatched || 0],
    ['Discrepancies', summary?.discrepancies || 0],
    ['Pending Verification', summary?.pendingVerification || 0],
    ['Errors', summary?.errors || 0],
    ['Total Amount (KES)', summary?.totalAmount || 0],
    [''], // Empty row separator
    ['TRANSACTION DETAILS']
  ];

  // Combine into CSV
  const csvContent = [
    ...summaryRows.map(row => row.map(escapeCSV).join(',')),
    '', // Empty row
    headers.join(','),
    ...rows.join('\n')
  ].join('\n');

  return csvContent;
}

/**
 * Automatic daily reconciliation
 */
async function performDailyReconciliation() {
  try {
    console.log('🕐 Starting daily reconciliation at 11 PM EAT...');

    // Get yesterday's date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    // Perform reconciliation
    const results = await reconcilePayments(startDate, endDate);

    // Log summary
    console.log('📊 Daily Reconciliation Summary:', results.summary);

    // Send webhook notification for reconciliation completion
    try {
      const reconciliationWebhook = require('./reconciliationWebhook');
      await reconciliationWebhook.sendDailyReconciliationWebhook(results);
      console.log('✅ Reconciliation completion webhook sent');
    } catch (webhookError) {
      console.error('❌ Failed to send reconciliation webhook:', webhookError.message);
      // Don't fail the entire reconciliation if webhook fails
    }

    // Flag discrepancies for admin review and send email/SMS alerts
    if (results.summary.discrepancies > 0 || results.summary.unmatched > 0) {
      console.warn('⚠️ Discrepancies detected:', {
        discrepancies: results.summary.discrepancies,
        unmatched: results.summary.unmatched
      });

      const notificationService = require('./notificationService');

      // Send email alert to admin
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
      if (adminEmail) {
        await notificationService.sendReconciliationDiscrepancyAlert(results, adminEmail);
        console.log('✅ Discrepancy email alert sent to admin:', adminEmail);
      } else {
        console.warn('⚠️ No admin email configured. Skipping email alert notification.');
      }

      // Send SMS alert to admin
      const adminPhone = process.env.ADMIN_PHONE;
      if (adminPhone) {
        await notificationService.sendReconciliationDiscrepancySMS(results, adminPhone);
        console.log('✅ Discrepancy SMS alert sent to admin:', adminPhone);
      } else {
        console.warn('⚠️ No admin phone configured. Skipping SMS alert notification.');
      }
    }

    return results;

  } catch (error) {
    console.error('❌ Daily reconciliation failed:', error);
    throw error;
  }
}

/**
 * Verify a specific transaction against M-Pesa
 */
async function verifyTransaction(sessionId) {
  try {
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.mpesaCheckoutRequestID) {
      throw new Error('No checkout request ID found');
    }

    // Query M-Pesa for transaction status
    const queryResult = await mpesaAPI.stkQuery(session.mpesaCheckoutRequestID);

    // Compare with stored data
    const verification = {
      sessionId: session._id,
      storedStatus: session.paymentStatus,
      storedResultCode: session.mpesaResultCode,
      mpesaResultCode: queryResult.ResultCode,
      mpesaResultDesc: queryResult.ResultDesc,
      match: session.mpesaResultCode === parseInt(queryResult.ResultCode),
      timestamp: new Date()
    };

    console.log('✅ Transaction verification:', verification);

    return verification;

  } catch (error) {
    console.error('❌ Transaction verification failed:', error);
    throw error;
  }
}

/**
 * Find orphaned payments (payments without sessions)
 */
async function findOrphanedPayments() {
  try {
    // Find sessions with transaction IDs but no proper status
    const orphaned = await Session.find({
      mpesaTransactionID: { $exists: true, $ne: null },
      $or: [
        { paymentStatus: { $ne: 'Paid' } },
        { status: { $nin: ['Confirmed', 'Completed'] } }
      ]
    }).populate('client', 'name email')
      .populate('psychologist', 'name');

    console.log(`🔍 Found ${orphaned.length} potentially orphaned payments`);

    return orphaned.map(session => ({
      sessionId: session._id,
      transactionId: session.mpesaTransactionID,
      paymentStatus: session.paymentStatus,
      sessionStatus: session.status,
      amount: session.price,
      client: session.client?.name,
      psychologist: session.psychologist?.name,
      timestamp: session.paymentVerifiedAt
    }));

  } catch (error) {
    console.error('❌ Failed to find orphaned payments:', error);
    throw error;
  }
}

module.exports = {
  reconcilePayments,
  reconcileSession,
  generateReconciliationReport,
  performDailyReconciliation,
  verifyTransaction,
  findOrphanedPayments,
  ReconciliationStatus
};
