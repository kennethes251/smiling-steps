# Accounting Software Integration Guide

## Overview

The Accounting Software Integration feature allows administrators to export M-Pesa payment data in formats compatible with popular accounting software. This streamlines financial reporting and ensures accurate bookkeeping for the therapy practice.

## Supported Accounting Software

### 1. QuickBooks Desktop
- **Format**: IIF (Intuit Interchange Format)
- **File Extension**: `.iif`
- **Use Case**: QuickBooks Desktop versions
- **Features**: 
  - Double-entry journal entries
  - Automatic chart of accounts setup
  - Processing fee tracking

### 2. Xero
- **Format**: CSV
- **File Extension**: `.csv`
- **Use Case**: Xero cloud accounting
- **Features**:
  - Bank reconciliation ready
  - Tax code mapping
  - Contact management integration

### 3. Sage
- **Format**: CSV
- **File Extension**: `.csv`
- **Use Case**: Various Sage products
- **Features**:
  - Nominal code mapping
  - Multi-currency support
  - VAT/Tax handling

### 4. Generic CSV
- **Format**: CSV
- **File Extension**: `.csv`
- **Use Case**: Other accounting systems
- **Features**:
  - Universal format
  - All transaction details
  - Easy customization

## Chart of Accounts

The system uses a standardized chart of accounts for therapy businesses:

| Account Code | Account Name | Type | Description |
|--------------|--------------|------|-------------|
| 4000 | Therapy Services Revenue | Income | Revenue from therapy sessions |
| 6100 | Payment Processing Fees | Expense | M-Pesa and other processing fees |
| 1200 | Accounts Receivable | Asset | Outstanding client payments |
| 1210 | M-Pesa Clearing Account | Asset | M-Pesa payment clearing |

## Features

### 1. Export Functionality
- **Date Range Selection**: Export data for specific periods
- **Format Selection**: Choose from supported accounting formats
- **Refund Handling**: Option to include or exclude refunded transactions
- **Instant Download**: Direct file download with proper naming

### 2. Journal Entries
- **Double-Entry Bookkeeping**: Proper debit/credit entries
- **Automatic Balancing**: Ensures debits equal credits
- **Processing Fee Allocation**: Separate tracking of M-Pesa fees
- **Transaction Grouping**: Organized by date and reference

### 3. Accounting Summary
- **Revenue Tracking**: Total revenue by period
- **Fee Analysis**: Processing fee breakdown
- **Net Revenue**: Revenue after fees and refunds
- **Transaction Metrics**: Average transaction values and counts

### 4. Automated Scheduling
- **Recurring Exports**: Daily, weekly, or monthly schedules
- **Email Delivery**: Automatic export delivery via email
- **Format Flexibility**: Different formats for different schedules
- **Admin Control**: Enable/disable scheduled exports

## API Endpoints

### GET /api/accounting/formats
Get supported accounting software formats and chart of accounts.

**Response:**
```json
{
  "success": true,
  "formats": [
    {
      "key": "quickbooks",
      "name": "QuickBooks",
      "description": "QuickBooks IIF format for desktop versions",
      "fileExtension": "iif",
      "mimeType": "application/octet-stream"
    }
  ],
  "chartOfAccounts": {
    "REVENUE": {
      "account": "4000",
      "name": "Therapy Services Revenue",
      "type": "Income"
    }
  }
}
```

### GET /api/accounting/export
Export payment data in specified format.

**Parameters:**
- `format`: Export format (quickbooks, xero, sage, generic)
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `includeRefunds`: Include refunded transactions (true/false)
- `clientId`: Filter by specific client (optional)
- `psychologistId`: Filter by specific therapist (optional)

**Response:** File download with appropriate content type

### GET /api/accounting/journal-entries
Generate journal entries for double-entry bookkeeping.

**Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `includeRefunds`: Include refunded transactions (true/false)

**Response:**
```json
{
  "success": true,
  "journalEntries": [
    {
      "date": "2024-12-14",
      "reference": "MPESA123456",
      "description": "Therapy session payment - John Doe",
      "entries": [
        {
          "account": "1210",
          "accountName": "M-Pesa Clearing Account",
          "debit": "2970.00",
          "credit": "0.00"
        },
        {
          "account": "6100",
          "accountName": "Payment Processing Fees",
          "debit": "30.00",
          "credit": "0.00"
        },
        {
          "account": "4000",
          "accountName": "Therapy Services Revenue",
          "debit": "0.00",
          "credit": "3000.00"
        }
      ]
    }
  ],
  "summary": {
    "totalEntries": 1,
    "totalTransactions": 1,
    "totalDebits": "3000.00",
    "totalCredits": "3000.00",
    "balanced": true
  }
}
```

### GET /api/accounting/summary
Get accounting summary for dashboard display.

**Parameters:**
- `startDate`: Start date (YYYY-MM-DD, defaults to month start)
- `endDate`: End date (YYYY-MM-DD, defaults to month end)

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalRevenue": "45000.00",
    "totalRefunds": "0.00",
    "processingFees": "450.00",
    "netRevenue": "44550.00",
    "totalTransactions": 15,
    "averageTransactionValue": "3000.00",
    "revenueByType": {
      "Individual Therapy": "30000.00",
      "Couples Therapy": "15000.00"
    }
  }
}
```

### POST /api/accounting/schedule-export
Schedule automated accounting exports.

**Request Body:**
```json
{
  "format": "quickbooks",
  "frequency": "monthly",
  "dayOfMonth": 1,
  "email": "admin@smilingsteps.com",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Accounting export scheduled successfully",
  "schedule": {
    "id": "1702569600000",
    "format": "quickbooks",
    "frequency": "monthly",
    "nextRun": "2024-01-01T09:00:00.000Z"
  }
}
```

## Usage Instructions

### 1. Accessing the Accounting Dashboard
1. Log in as an administrator
2. Navigate to Admin Dashboard
3. Click on "Accounting Integration" card
4. The accounting dashboard will display current summary and export options

### 2. Exporting Data
1. Select the desired accounting format from the dropdown
2. Choose start and end dates for the export period
3. Decide whether to include refunded transactions
4. Click "Export" to download the file
5. Import the downloaded file into your accounting software

### 3. Viewing Journal Entries
1. Set the date range for the period you want to review
2. Click "Journal Entries" to generate double-entry bookkeeping entries
3. Review the entries to ensure they match your accounting requirements
4. Use the entries for manual posting if needed

### 4. Scheduling Automated Exports
1. Click "Schedule Export" button
2. Select the export format and frequency
3. Enter the email address for delivery
4. Configure the schedule (daily, weekly, or monthly)
5. Click "Schedule" to activate automated exports

## Integration Steps by Software

### QuickBooks Desktop
1. Export data in QuickBooks format (.iif)
2. Open QuickBooks Desktop
3. Go to File > Utilities > Import > IIF Files
4. Select the downloaded .iif file
5. Review and accept the imported transactions

### Xero
1. Export data in Xero format (.csv)
2. Log into Xero
3. Go to Accounting > Bank Accounts
4. Select your M-Pesa clearing account
5. Click "Import a Statement"
6. Upload the CSV file and map columns

### Sage
1. Export data in Sage format (.csv)
2. Open your Sage software
3. Go to File > Import
4. Select the CSV file
5. Map the columns to appropriate Sage fields
6. Import the transactions

### Other Software
1. Export data in Generic CSV format
2. Open your accounting software's import function
3. Map the CSV columns to your chart of accounts
4. Import the transactions

## Best Practices

### 1. Regular Exports
- Export data monthly for accurate financial reporting
- Schedule automated exports to ensure consistency
- Keep backup copies of all export files

### 2. Reconciliation
- Compare exported totals with M-Pesa statements
- Verify processing fees are correctly allocated
- Check that refunds are properly handled

### 3. Chart of Accounts
- Customize account codes to match your existing setup
- Ensure consistency across all exports
- Document any modifications for future reference

### 4. Data Validation
- Review journal entries before importing
- Verify that debits equal credits
- Check transaction dates and amounts

## Troubleshooting

### Common Issues

**Export Returns Empty File**
- Check that there are transactions in the selected date range
- Verify that sessions have been paid (status = "Paid")
- Ensure proper authentication and admin permissions

**Import Fails in Accounting Software**
- Verify the file format matches the software requirements
- Check that account codes exist in your chart of accounts
- Ensure date formats are compatible

**Balancing Issues**
- Review processing fee calculations (default 1% for M-Pesa)
- Check for rounding differences in currency conversion
- Verify that all transaction components are included

**Scheduling Not Working**
- Verify email configuration is correct
- Check that the schedule service is running
- Ensure proper permissions for automated exports

### Support

For technical support with the accounting integration:
1. Check the system logs for error messages
2. Verify API endpoints are responding correctly
3. Test with a small date range first
4. Contact system administrator if issues persist

## Security Considerations

### Data Protection
- All exports are encrypted during transmission
- Access is restricted to admin users only
- Audit logs track all export activities
- Phone numbers are masked in exported data

### Compliance
- Exports comply with Kenya Data Protection Act
- Financial data retention follows regulatory requirements
- Audit trails are maintained for all accounting activities
- User access is logged and monitored

## Future Enhancements

### Planned Features
- Real-time synchronization with accounting software APIs
- Advanced filtering and grouping options
- Custom chart of accounts mapping
- Multi-currency support for international clients
- Integration with tax reporting systems

### API Integrations
- QuickBooks Online API integration
- Xero API direct synchronization
- Sage Business Cloud API connection
- Custom webhook notifications for accounting events

---

**Last Updated:** December 14, 2024
**Version:** 1.0.0
**Status:** Production Ready