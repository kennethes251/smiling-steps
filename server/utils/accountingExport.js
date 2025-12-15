/**
 * Accounting Software Export Utility
 * 
 * Provides standardized export formats for popular accounting software:
 * - QuickBooks (QBO/IIF format)
 * - Xero (CSV format)
 * - Sage (CSV format)
 * - Generic CSV for other accounting systems
 */

const moment = require('moment');

/**
 * Chart of Accounts mapping for therapy business
 */
const CHART_OF_ACCOUNTS = {
  REVENUE: {
    account: '4000',
    name: 'Therapy Services Revenue',
    type: 'Income'
  },
  PAYMENT_PROCESSING_FEES: {
    account: '6100',
    name: 'Payment Processing Fees',
    type: 'Expense'
  },
  ACCOUNTS_RECEIVABLE: {
    account: '1200',
    name: 'Accounts Receivable',
    type: 'Asset'
  },
  MPESA_CLEARING: {
    account: '1210',
    name: 'M-Pesa Clearing Account',
    type: 'Asset'
  }
};

/**
 * Generate QuickBooks IIF format export
 * @param {Array} transactions - Array of payment transactions
 * @param {Object} options - Export options
 * @returns {String} IIF formatted content
 */
function generateQuickBooksIIF(transactions, options = {}) {
  const { startDate, endDate, includeRefunds = false } = options;
  
  let iifContent = [];
  
  // IIF Header
  iifContent.push('!HDR\tPROD\tVER\tREL\tIIFVER\tDATE\tTIME\tACCNT');
  iifContent.push('HDR\tSmiling Steps\t2024\tR1\t1\t' + moment().format('MM/DD/YYYY') + '\t' + moment().format('HH:mm:ss') + '\tN');
  
  // Account definitions
  iifContent.push('!ACCNT\tNAME\tACCNTTYPE\tDESC');
  Object.values(CHART_OF_ACCOUNTS).forEach(account => {
    iifContent.push(`ACCNT\t${account.name}\t${account.type}\t${account.name}`);
  });
  
  // Transaction entries
  iifContent.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO');
  iifContent.push('!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO');
  
  transactions.forEach((transaction, index) => {
    if (!includeRefunds && transaction.paymentStatus === 'Refunded') return;
    
    const date = moment(transaction.paymentVerifiedAt).format('MM/DD/YYYY');
    const amount = parseFloat(transaction.price || 0);
    const docNum = transaction.mpesaTransactionID || `TXN-${index + 1}`;
    const memo = `Therapy session - ${transaction.sessionType || 'Standard'}`;
    const clientName = transaction.client?.name || 'Unknown Client';
    
    // Revenue entry (Credit)
    iifContent.push(`TRNS\tDEPOSIT\t${date}\t${CHART_OF_ACCOUNTS.MPESA_CLEARING.name}\t${clientName}\t\t${amount}\t${docNum}\t${memo}`);
    iifContent.push(`SPL\t${index * 2 + 1}\tDEPOSIT\t${date}\t${CHART_OF_ACCOUNTS.REVENUE.name}\t${clientName}\t\t-${amount}\t${docNum}\t${memo}`);
    
    // Processing fee entry if applicable (typically 1% for M-Pesa)
    const processingFee = amount * 0.01;
    if (processingFee > 0) {
      iifContent.push(`SPL\t${index * 2 + 2}\tDEPOSIT\t${date}\t${CHART_OF_ACCOUNTS.PAYMENT_PROCESSING_FEES.name}\t${clientName}\t\t${processingFee.toFixed(2)}\t${docNum}\tM-Pesa processing fee`);
    }
  });
  
  iifContent.push('!ENDTRNS');
  
  return iifContent.join('\n');
}

/**
 * Generate Xero CSV format export
 * @param {Array} transactions - Array of payment transactions
 * @param {Object} options - Export options
 * @returns {String} CSV formatted content for Xero
 */
function generateXeroCSV(transactions, options = {}) {
  const { includeRefunds = false } = options;
  
  const headers = [
    'Date',
    'Description',
    'Reference',
    'Amount',
    'Account Code',
    'Account Name',
    'Tax Type',
    'Tax Amount',
    'Contact Name',
    'Invoice Number',
    'Region'
  ];
  
  let csvRows = [headers.join(',')];
  
  transactions.forEach((transaction, index) => {
    if (!includeRefunds && transaction.paymentStatus === 'Refunded') return;
    
    const date = moment(transaction.paymentVerifiedAt).format('YYYY-MM-DD');
    const amount = parseFloat(transaction.price || 0);
    const reference = transaction.mpesaTransactionID || `TXN-${index + 1}`;
    const description = `Therapy session - ${transaction.sessionType || 'Standard'}`;
    const clientName = escapeCSV(transaction.client?.name || 'Unknown Client');
    
    // Revenue entry
    csvRows.push([
      date,
      escapeCSV(description),
      escapeCSV(reference),
      amount.toFixed(2),
      CHART_OF_ACCOUNTS.REVENUE.account,
      escapeCSV(CHART_OF_ACCOUNTS.REVENUE.name),
      'GST',
      '0.00',
      clientName,
      escapeCSV(reference),
      'Kenya'
    ].join(','));
    
    // Processing fee entry
    const processingFee = amount * 0.01;
    if (processingFee > 0) {
      csvRows.push([
        date,
        'M-Pesa processing fee',
        escapeCSV(reference),
        processingFee.toFixed(2),
        CHART_OF_ACCOUNTS.PAYMENT_PROCESSING_FEES.account,
        escapeCSV(CHART_OF_ACCOUNTS.PAYMENT_PROCESSING_FEES.name),
        'GST',
        '0.00',
        'Safaricom M-Pesa',
        escapeCSV(reference),
        'Kenya'
      ].join(','));
    }
  });
  
  return csvRows.join('\n');
}

/**
 * Generate Sage CSV format export
 * @param {Array} transactions - Array of payment transactions
 * @param {Object} options - Export options
 * @returns {String} CSV formatted content for Sage
 */
function generateSageCSV(transactions, options = {}) {
  const { includeRefunds = false } = options;
  
  const headers = [
    'Transaction Type',
    'Account Reference',
    'Nominal Code',
    'Date',
    'Reference',
    'Details',
    'Net Amount',
    'Tax Code',
    'Tax Amount',
    'Exchange Rate',
    'Gross Amount'
  ];
  
  let csvRows = [headers.join(',')];
  
  transactions.forEach((transaction, index) => {
    if (!includeRefunds && transaction.paymentStatus === 'Refunded') return;
    
    const date = moment(transaction.paymentVerifiedAt).format('DD/MM/YYYY');
    const amount = parseFloat(transaction.price || 0);
    const reference = transaction.mpesaTransactionID || `TXN-${index + 1}`;
    const details = `Therapy session - ${transaction.sessionType || 'Standard'}`;
    const clientRef = transaction.client?.email?.substring(0, 8) || 'CLIENT';
    
    // Revenue entry
    csvRows.push([
      'SI', // Sales Invoice
      escapeCSV(clientRef),
      CHART_OF_ACCOUNTS.REVENUE.account,
      date,
      escapeCSV(reference),
      escapeCSV(details),
      amount.toFixed(2),
      'T0', // No tax
      '0.00',
      '1.00',
      amount.toFixed(2)
    ].join(','));
    
    // Processing fee entry
    const processingFee = amount * 0.01;
    if (processingFee > 0) {
      csvRows.push([
        'PI', // Purchase Invoice
        'MPESA',
        CHART_OF_ACCOUNTS.PAYMENT_PROCESSING_FEES.account,
        date,
        escapeCSV(reference),
        'M-Pesa processing fee',
        processingFee.toFixed(2),
        'T0',
        '0.00',
        '1.00',
        processingFee.toFixed(2)
      ].join(','));
    }
  });
  
  return csvRows.join('\n');
}

/**
 * Generate generic accounting CSV format
 * @param {Array} transactions - Array of payment transactions
 * @param {Object} options - Export options
 * @returns {String} Generic CSV formatted content
 */
function generateGenericCSV(transactions, options = {}) {
  const { includeRefunds = false } = options;
  
  const headers = [
    'Date',
    'Transaction ID',
    'Client Name',
    'Client Email',
    'Therapist Name',
    'Session Type',
    'Amount',
    'Currency',
    'Payment Method',
    'Payment Status',
    'Account Code',
    'Account Name',
    'Description',
    'Debit',
    'Credit',
    'Processing Fee',
    'Net Amount'
  ];
  
  let csvRows = [headers.join(',')];
  
  transactions.forEach((transaction) => {
    if (!includeRefunds && transaction.paymentStatus === 'Refunded') return;
    
    const date = moment(transaction.paymentVerifiedAt).format('YYYY-MM-DD');
    const amount = parseFloat(transaction.price || 0);
    const processingFee = amount * 0.01;
    const netAmount = amount - processingFee;
    
    csvRows.push([
      date,
      escapeCSV(transaction.mpesaTransactionID || ''),
      escapeCSV(transaction.client?.name || ''),
      escapeCSV(transaction.client?.email || ''),
      escapeCSV(transaction.psychologist?.name || ''),
      escapeCSV(transaction.sessionType || ''),
      amount.toFixed(2),
      'KES',
      'M-Pesa',
      escapeCSV(transaction.paymentStatus || ''),
      CHART_OF_ACCOUNTS.REVENUE.account,
      escapeCSV(CHART_OF_ACCOUNTS.REVENUE.name),
      escapeCSV(`Therapy session - ${transaction.sessionType || 'Standard'}`),
      '0.00',
      amount.toFixed(2),
      processingFee.toFixed(2),
      netAmount.toFixed(2)
    ].join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Generate journal entries for double-entry bookkeeping
 * @param {Array} transactions - Array of payment transactions
 * @param {Object} options - Export options
 * @returns {Array} Array of journal entries
 */
function generateJournalEntries(transactions, options = {}) {
  const { includeRefunds = false } = options;
  const journalEntries = [];
  
  transactions.forEach((transaction, index) => {
    if (!includeRefunds && transaction.paymentStatus === 'Refunded') return;
    
    const amount = parseFloat(transaction.price || 0);
    const processingFee = amount * 0.01;
    const netAmount = amount - processingFee;
    const date = moment(transaction.paymentVerifiedAt).format('YYYY-MM-DD');
    const reference = transaction.mpesaTransactionID || `TXN-${index + 1}`;
    
    // Journal entry for the transaction
    const journalEntry = {
      date,
      reference,
      description: `Therapy session payment - ${transaction.client?.name || 'Unknown'}`,
      entries: [
        {
          account: CHART_OF_ACCOUNTS.MPESA_CLEARING.account,
          accountName: CHART_OF_ACCOUNTS.MPESA_CLEARING.name,
          debit: netAmount.toFixed(2),
          credit: '0.00'
        },
        {
          account: CHART_OF_ACCOUNTS.PAYMENT_PROCESSING_FEES.account,
          accountName: CHART_OF_ACCOUNTS.PAYMENT_PROCESSING_FEES.name,
          debit: processingFee.toFixed(2),
          credit: '0.00'
        },
        {
          account: CHART_OF_ACCOUNTS.REVENUE.account,
          accountName: CHART_OF_ACCOUNTS.REVENUE.name,
          debit: '0.00',
          credit: amount.toFixed(2)
        }
      ]
    };
    
    journalEntries.push(journalEntry);
  });
  
  return journalEntries;
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Main export function - generates accounting export in specified format
 * @param {Array} transactions - Array of payment transactions
 * @param {String} format - Export format (quickbooks, xero, sage, generic)
 * @param {Object} options - Export options
 * @returns {String} Formatted export content
 */
function generateAccountingExport(transactions, format = 'generic', options = {}) {
  switch (format.toLowerCase()) {
    case 'quickbooks':
    case 'qb':
      return generateQuickBooksIIF(transactions, options);
    case 'xero':
      return generateXeroCSV(transactions, options);
    case 'sage':
      return generateSageCSV(transactions, options);
    case 'generic':
    default:
      return generateGenericCSV(transactions, options);
  }
}

/**
 * Get supported accounting software formats
 * @returns {Array} Array of supported formats
 */
function getSupportedFormats() {
  return [
    {
      key: 'quickbooks',
      name: 'QuickBooks',
      description: 'QuickBooks IIF format for desktop versions',
      fileExtension: 'iif',
      mimeType: 'application/octet-stream'
    },
    {
      key: 'xero',
      name: 'Xero',
      description: 'Xero CSV format for cloud accounting',
      fileExtension: 'csv',
      mimeType: 'text/csv'
    },
    {
      key: 'sage',
      name: 'Sage',
      description: 'Sage CSV format for various Sage products',
      fileExtension: 'csv',
      mimeType: 'text/csv'
    },
    {
      key: 'generic',
      name: 'Generic CSV',
      description: 'Generic CSV format for other accounting systems',
      fileExtension: 'csv',
      mimeType: 'text/csv'
    }
  ];
}

module.exports = {
  generateAccountingExport,
  generateJournalEntries,
  getSupportedFormats,
  CHART_OF_ACCOUNTS
};