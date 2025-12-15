# CSV Report Generation Guide

## Overview

The CSV report generation feature provides comprehensive transaction reports for payment reconciliation. Reports include all M-Pesa transaction fields, summary statistics, and support date range filtering.

## Features

✅ **Complete Transaction Data**
- All M-Pesa transaction fields included
- Session details (client, psychologist, type, date)
- Payment status and reconciliation status
- Timestamps for payment initiation and verification

✅ **Summary Section**
- Report generation timestamp
- Date range covered
- Transaction counts by status
- Total amount reconciled

✅ **Date Range Filtering**
- Filter by start and end date
- Optional client filtering
- Optional psychologist filtering

✅ **Proper CSV Formatting**
- Escaped special characters
- Quoted fields with commas/quotes
- UTF-8 encoding support
- Excel-compatible format

## API Endpoint

### GET /api/reconciliation/report

Generate and download a reconciliation report in CSV or JSON format.

**Authentication:** Required (Admin only)

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `format` (optional): Report format - 'csv' (default) or 'json'
- `clientId` (optional): Filter by specific client
- `psychologistId` (optional): Filter by specific psychologist

**Response:**
- CSV format: Returns CSV file for download
- JSON format: Returns JSON object with reconciliation data

## CSV Report Structure

### Summary Section
```csv
RECONCILIATION REPORT SUMMARY
Generated At,2024-12-10T10:30:00.000Z
Date Range,2024-11-10 to 2024-12-10
Total Transactions,45
Matched,42
Unmatched,1
Discrepancies,2
Pending Verification,0
Errors,0
Total Amount (KES),135000

TRANSACTION DETAILS
```

### Transaction Fields

The CSV includes the following fields for each transaction:

1. **Session ID** - Unique session identifier
2. **Transaction ID** - M-Pesa transaction receipt number
3. **Checkout Request ID** - M-Pesa checkout request identifier
4. **Merchant Request ID** - M-Pesa merchant request identifier
5. **Amount (KES)** - Session price
6. **M-Pesa Amount** - Amount processed by M-Pesa
7. **Phone Number** - Masked phone number (last 4 digits)
8. **Payment Status** - Current payment status (Paid, Processing, Failed)
9. **Session Status** - Current session status (Confirmed, Completed, etc.)
10. **Result Code** - M-Pesa result code (0 = success)
11. **Result Description** - M-Pesa result description
12. **Payment Initiated At** - Timestamp when payment was initiated
13. **Payment Verified At** - Timestamp when payment was verified
14. **Reconciliation Status** - Reconciliation result (matched, unmatched, discrepancy)
15. **Issues** - Any issues detected during reconciliation
16. **Client Name** - Client's full name
17. **Client Email** - Client's email address
18. **Psychologist Name** - Psychologist's full name
19. **Session Type** - Type of therapy session
20. **Session Date** - Scheduled session date
21. **Payment Method** - Payment method used (M-Pesa)
22. **Payment Attempts** - Number of payment attempts

## Usage Examples

### Example 1: Generate CSV Report for Last 30 Days

```bash
curl -X GET "http://localhost:5000/api/reconciliation/report?startDate=2024-11-10&endDate=2024-12-10&format=csv" \
  -H "x-auth-token: YOUR_ADMIN_TOKEN" \
  -o reconciliation_report.csv
```

### Example 2: Generate JSON Report with Client Filter

```bash
curl -X GET "http://localhost:5000/api/reconciliation/report?startDate=2024-11-10&endDate=2024-12-10&format=json&clientId=CLIENT_ID" \
  -H "x-auth-token: YOUR_ADMIN_TOKEN"
```

### Example 3: Using JavaScript/Axios

```javascript
const axios = require('axios');

async function downloadCSVReport() {
  const response = await axios.get('http://localhost:5000/api/reconciliation/report', {
    params: {
      startDate: '2024-11-10',
      endDate: '2024-12-10',
      format: 'csv'
    },
    headers: {
      'x-auth-token': adminToken
    }
  });

  // Save to file
  const fs = require('fs');
  fs.writeFileSync('reconciliation_report.csv', response.data);
  console.log('Report saved to reconciliation_report.csv');
}
```

### Example 4: Frontend Download Button

```javascript
const downloadReport = async () => {
  try {
    const response = await axios.get('/api/reconciliation/report', {
      params: {
        startDate: startDate,
        endDate: endDate,
        format: 'csv'
      },
      headers: {
        'x-auth-token': token
      }
    });

    // Create blob and download
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reconciliation_${startDate}_${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

## Testing

Run the comprehensive test suite:

```bash
node test-reconciliation.js
```

This will test:
- CSV report generation
- JSON report generation
- Date range filtering
- Field completeness
- Error handling

## Error Handling

### Missing Dates
```json
{
  "msg": "Start date and end date are required"
}
```

### Invalid Date Format
```json
{
  "msg": "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
}
```

### Invalid Date Range
```json
{
  "msg": "Start date must be before end date"
}
```

### Unauthorized Access
```json
{
  "msg": "Admin access required"
}
```

## Best Practices

1. **Date Ranges**
   - Use reasonable date ranges (e.g., 30-90 days)
   - Very large ranges may take longer to process
   - Consider pagination for very large datasets

2. **File Naming**
   - Files are automatically named: `reconciliation_YYYY-MM-DD_YYYY-MM-DD.csv`
   - Includes date range for easy identification

3. **Data Privacy**
   - Phone numbers are automatically masked (last 4 digits only)
   - Admin access required for all reports
   - Audit logs track all report generation

4. **Excel Compatibility**
   - CSV uses proper escaping for Excel
   - UTF-8 encoding supported
   - Comma-separated with quoted fields

5. **Regular Reconciliation**
   - Generate reports weekly or monthly
   - Compare with M-Pesa statements
   - Flag discrepancies for investigation

## Integration with Admin Dashboard

The CSV report generation is integrated into the Reconciliation Dashboard:

1. Navigate to Admin Dashboard → Reconciliation
2. Select date range using date pickers
3. Click "Download CSV Report" button
4. Report downloads automatically

## Troubleshooting

### Issue: Empty CSV File
**Solution:** Check that there are paid transactions in the selected date range

### Issue: Missing Fields
**Solution:** Ensure all sessions have complete M-Pesa data

### Issue: Encoding Issues
**Solution:** Open CSV with UTF-8 encoding in Excel (Data → From Text/CSV)

### Issue: Large File Size
**Solution:** Use narrower date ranges or filter by client/psychologist

## Requirements Validation

This implementation satisfies **Requirement 8.4** from the M-Pesa Payment Integration specification:

✅ Create CSV export functionality
✅ Include all transaction fields
✅ Add date range filtering
✅ Proper error handling
✅ Admin-only access control

## Related Documentation

- [Payment Reconciliation Guide](PAYMENT_RECONCILIATION_GUIDE.md)
- [Reconciliation Quick Start](RECONCILIATION_QUICK_START.md)
- [M-Pesa Integration Guide](MPESA_INTEGRATION_GUIDE.md)

---

**Last Updated:** December 10, 2024
**Status:** ✅ Complete and Production Ready
