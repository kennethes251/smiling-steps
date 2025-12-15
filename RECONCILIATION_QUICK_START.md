# Payment Reconciliation - Quick Start Guide

## What is Payment Reconciliation?

Payment reconciliation automatically verifies that all M-Pesa payments in your system match the actual transactions, helping you:
- Detect payment discrepancies
- Find orphaned payments
- Ensure data integrity
- Generate audit reports
- Comply with financial regulations

## Installation (5 minutes)

### 1. Install Dependencies

```bash
npm install node-cron
```

### 2. Restart Server

The reconciliation system starts automatically when you restart the server:

```bash
npm start
```

You should see:
```
✅ reconciliation routes loaded.
📅 Scheduling daily payment reconciliation at 11 PM EAT...
✅ Reconciliation scheduler started
```

## Quick Test (2 minutes)

### Test the System

```bash
node test-reconciliation.js
```

This will:
- Login as admin
- Check reconciliation summary
- Find orphaned payments
- Run manual reconciliation
- Generate a report

### Expected Output

```
🧪 Starting Payment Reconciliation System Tests
============================================================
🔐 Logging in as admin...
✅ Admin login successful

📊 Testing reconciliation summary...
✅ Summary retrieved successfully:
   Today: { count: 5, totalAmount: 15000 }
   This Week: { count: 32, totalAmount: 96000 }
   ...

🏁 Test Results:
   Total: 7
   ✅ Passed: 7
   ❌ Failed: 0
============================================================
🎉 All tests passed!
```

## Using the Admin Dashboard (3 minutes)

### 1. Access Dashboard

1. Login as admin at: `http://localhost:3000/admin`
2. Navigate to "Payment Reconciliation" tab

### 2. View Summary

You'll see:
- Today's payment count and total
- This week's statistics
- This month's statistics
- Number of orphaned payments

### 3. Run Reconciliation

1. Select date range (defaults to last 7 days)
2. Click "Run Reconciliation"
3. View results:
   - ✅ Matched: All good
   - ⚠️ Unmatched: Minor issues
   - ❌ Discrepancies: Need attention
   - ℹ️ Pending: Still processing

### 4. Download Report

Click "Download Report" to get a CSV file with all transaction details.

## API Usage (For Developers)

### Get Summary

```javascript
const response = await axios.get('/api/reconciliation/summary', {
  headers: { 'x-auth-token': adminToken }
});

console.log(response.data.summary);
```

### Run Reconciliation

```javascript
const response = await axios.post('/api/reconciliation/run', {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
}, {
  headers: { 'x-auth-token': adminToken }
});

console.log(response.data.summary);
```

### Find Orphaned Payments

```javascript
const response = await axios.get('/api/reconciliation/orphaned', {
  headers: { 'x-auth-token': adminToken }
});

console.log(response.data.orphanedPayments);
```

## Automatic Daily Reconciliation

The system automatically runs reconciliation every day at 11 PM EAT.

**What it does:**
- Reconciles yesterday's payments
- Logs results
- Alerts if discrepancies found

**Check logs:**
```bash
# View reconciliation logs
grep "reconciliation" logs/server.log

# Or watch in real-time
tail -f logs/server.log | grep reconciliation
```

## Common Tasks

### Task 1: Check Today's Payments

1. Go to Admin Dashboard → Reconciliation
2. Look at "Today" card
3. If count matches expectations, you're good!

### Task 2: Investigate Discrepancy

1. Run reconciliation for the date range
2. Look at "Discrepancies" section
3. Click "View Details" on any discrepancy
4. Review the issues listed
5. Take appropriate action:
   - Verify with M-Pesa transaction history
   - Update session status if needed
   - Contact client if payment unclear

### Task 3: Fix Orphaned Payment

1. Go to "Orphaned Payments" section
2. Click "View Details" on orphaned payment
3. Check the transaction ID
4. Verify payment status with M-Pesa
5. If confirmed, manually update session status
6. If failed, notify client to retry

### Task 4: Generate Monthly Report

1. Set date range to first and last day of month
2. Click "Run Reconciliation"
3. Click "Download Report"
4. Open CSV in Excel
5. Share with finance team

## Troubleshooting

### Problem: "Admin access required"

**Solution:** Make sure you're logged in as an admin user.

```bash
# Check your user role in database
node server/scripts/check-user-role.js your-email@example.com
```

### Problem: No payments showing up

**Solution:** Check if you have any paid sessions in the date range.

```bash
# Check database for paid sessions
node server/scripts/check-paid-sessions.js
```

### Problem: Reconciliation fails

**Solution:** Check server logs for errors.

```bash
tail -f logs/server.log
```

Common causes:
- Database connection issue
- M-Pesa API unavailable
- Invalid date range

## Next Steps

1. ✅ **Set up monitoring**: Check dashboard daily
2. ✅ **Schedule reports**: Download monthly reports
3. ✅ **Train team**: Show finance team how to use it
4. ✅ **Document process**: Create internal procedures
5. ✅ **Set alerts**: Configure email notifications (coming soon)

## Need Help?

- 📖 Full documentation: `PAYMENT_RECONCILIATION_GUIDE.md`
- 🐛 Report issues: Contact development team
- 💬 Questions: Ask in team chat

## Key Files

```
server/
├── utils/
│   └── paymentReconciliation.js    # Core reconciliation logic
├── routes/
│   └── reconciliation.js           # API endpoints
└── scripts/
    └── schedule-reconciliation.js  # Automatic scheduler

client/
└── src/
    └── components/
        └── dashboards/
            └── ReconciliationDashboard.js  # Admin UI

test-reconciliation.js              # Test script
PAYMENT_RECONCILIATION_GUIDE.md     # Full documentation
```

## Success Checklist

- [ ] Dependencies installed (`node-cron`)
- [ ] Server restarted
- [ ] Test script passes
- [ ] Admin dashboard accessible
- [ ] Can run manual reconciliation
- [ ] Can download reports
- [ ] Automatic scheduler running
- [ ] Team trained on usage

---

**Time to complete:** ~10 minutes
**Difficulty:** Easy
**Status:** Production Ready ✅
