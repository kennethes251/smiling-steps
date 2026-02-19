# Payment Reconciliation - Deployment Checklist

## Pre-Deployment (5 minutes)

### 1. Install Dependencies
- [ ] Run `npm install` to install node-cron
- [ ] Verify installation: `npm list node-cron`
- [ ] Check for any dependency conflicts

### 2. Verify Files
- [ ] `server/utils/paymentReconciliation.js` exists
- [ ] `server/routes/reconciliation.js` exists
- [ ] `server/scripts/schedule-reconciliation.js` exists
- [ ] `client/src/components/dashboards/ReconciliationDashboard.js` exists

### 3. Check Configuration
- [ ] Routes registered in `server/index.js`
- [ ] Scheduler initialized in `server/index.js`
- [ ] No syntax errors (run diagnostics)

## Deployment (10 minutes)

### 4. Start Server
- [ ] Stop existing server
- [ ] Run `npm start`
- [ ] Check for startup messages:
  - [ ] "✅ reconciliation routes loaded."
  - [ ] "📅 Scheduling daily payment reconciliation at 11 PM EAT..."
  - [ ] "✅ Reconciliation scheduler started"

### 5. Run Tests
- [ ] Execute `node test-reconciliation.js`
- [ ] Verify all 7 tests pass:
  - [ ] Admin Login
  - [ ] Reconciliation Summary
  - [ ] Orphaned Payments Detection
  - [ ] Manual Reconciliation
  - [ ] Report Generation
  - [ ] Session Reconciliation
  - [ ] Access Control

### 6. Verify API Endpoints
Test each endpoint manually:

- [ ] **GET /api/reconciliation/summary**
  ```bash
  curl -H "x-auth-token: YOUR_ADMIN_TOKEN" \
       http://localhost:5000/api/reconciliation/summary
  ```

- [ ] **POST /api/reconciliation/run**
  ```bash
  curl -X POST \
       -H "x-auth-token: YOUR_ADMIN_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"startDate":"2024-01-01","endDate":"2024-01-31"}' \
       http://localhost:5000/api/reconciliation/run
  ```

- [ ] **GET /api/reconciliation/orphaned**
  ```bash
  curl -H "x-auth-token: YOUR_ADMIN_TOKEN" \
       http://localhost:5000/api/reconciliation/orphaned
  ```

## Post-Deployment (15 minutes)

### 7. Admin Dashboard Access
- [ ] Login as admin user
- [ ] Navigate to admin dashboard
- [ ] Locate "Payment Reconciliation" tab
- [ ] Verify dashboard loads without errors

### 8. Dashboard Functionality
- [ ] Summary cards display correctly
- [ ] Date range selector works
- [ ] "Run Reconciliation" button functions
- [ ] Results display properly
- [ ] "Download Report" generates CSV
- [ ] Transaction details dialog opens
- [ ] Orphaned payments table shows data

### 9. Test Manual Reconciliation
- [ ] Select last 7 days as date range
- [ ] Click "Run Reconciliation"
- [ ] Wait for results to load
- [ ] Verify summary statistics are accurate
- [ ] Check that results are categorized correctly
- [ ] Download CSV report
- [ ] Open CSV in Excel/Sheets
- [ ] Verify data is complete and accurate

### 10. Test Automatic Scheduler
- [ ] Check server logs for scheduler initialization
- [ ] Verify cron job is scheduled
- [ ] (Optional) Manually trigger: `node server/scripts/schedule-reconciliation.js`
- [ ] Check logs for reconciliation results

## User Training (30 minutes)

### 11. Train Admin Users
- [ ] Show how to access dashboard
- [ ] Demonstrate running manual reconciliation
- [ ] Explain status indicators (✅ ⚠️ ❌ ℹ️)
- [ ] Show how to download reports
- [ ] Explain how to handle discrepancies
- [ ] Demonstrate orphaned payment resolution

### 12. Document Procedures
- [ ] Create internal SOP for daily checks
- [ ] Document escalation procedures
- [ ] Set up monitoring schedule
- [ ] Assign responsibility for reviews

## Monitoring Setup (10 minutes)

### 13. Set Up Monitoring
- [ ] Configure log monitoring
- [ ] Set up daily reconciliation alerts (if available)
- [ ] Create dashboard bookmark for admins
- [ ] Schedule weekly report generation
- [ ] Set up monthly compliance reports

### 14. Establish Metrics
- [ ] Define success metrics
- [ ] Set up tracking for:
  - [ ] Daily reconciliation completion rate
  - [ ] Discrepancy detection rate
  - [ ] Resolution time for issues
  - [ ] Admin satisfaction score

## Documentation Review (5 minutes)

### 15. Review Documentation
- [ ] Read `RECONCILIATION_QUICK_START.md`
- [ ] Bookmark `PAYMENT_RECONCILIATION_GUIDE.md`
- [ ] Review `RECONCILIATION_FLOW_DIAGRAM.md`
- [ ] Keep `🎉_RECONCILIATION_READY.md` handy

## Final Verification (5 minutes)

### 16. End-to-End Test
- [ ] Create a test payment (if in sandbox)
- [ ] Wait for payment to complete
- [ ] Run reconciliation
- [ ] Verify payment appears in results
- [ ] Check status is "Matched"
- [ ] Download report and verify entry

### 17. Security Check
- [ ] Verify non-admin users cannot access endpoints
- [ ] Check that phone numbers are masked in logs
- [ ] Confirm audit trail is working
- [ ] Verify no sensitive data in CSV exports

## Production Readiness (Final Check)

### 18. Pre-Production Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] No server errors in logs
- [ ] Dashboard fully functional
- [ ] Reports generating correctly
- [ ] Scheduler running
- [ ] Documentation complete
- [ ] Team trained
- [ ] Monitoring configured
- [ ] Backup procedures in place

### 19. Go-Live Decision
- [ ] Development team approval
- [ ] Admin team approval
- [ ] Finance team approval
- [ ] Security review complete
- [ ] Compliance review complete

### 20. Post-Go-Live
- [ ] Monitor first 24 hours closely
- [ ] Check first automatic reconciliation
- [ ] Review first week's reports
- [ ] Gather user feedback
- [ ] Address any issues immediately

## Rollback Plan (If Needed)

### Emergency Rollback
If critical issues arise:

1. [ ] Stop the server
2. [ ] Comment out reconciliation routes in `server/index.js`
3. [ ] Comment out scheduler initialization
4. [ ] Restart server
5. [ ] Notify team
6. [ ] Review logs for root cause
7. [ ] Fix issues
8. [ ] Re-deploy following this checklist

## Success Criteria

The deployment is successful when:

- ✅ All tests pass (7/7)
- ✅ Dashboard accessible to admins
- ✅ Manual reconciliation works
- ✅ Reports download correctly
- ✅ Automatic scheduler running
- ✅ No errors in logs
- ✅ Team trained and confident
- ✅ Documentation reviewed
- ✅ Monitoring in place
- ✅ First reconciliation completes successfully

## Support Contacts

### Technical Issues
- **Development Team:** [Contact Info]
- **Server Logs:** `tail -f logs/server.log`
- **Test Suite:** `node test-reconciliation.js`

### Business Issues
- **Finance Team:** [Contact Info]
- **Admin Team:** [Contact Info]
- **Compliance:** [Contact Info]

## Quick Reference

### Important Commands
```bash
# Install dependencies
npm install

# Start server
npm start

# Run tests
node test-reconciliation.js

# Manual reconciliation
node server/scripts/schedule-reconciliation.js

# Check logs
tail -f logs/server.log | grep reconciliation
```

### Important URLs
- Admin Dashboard: `http://localhost:3000/admin`
- API Base: `http://localhost:5000/api/reconciliation`
- Documentation: `PAYMENT_RECONCILIATION_GUIDE.md`

### Status Indicators
- ✅ **Matched** - All good, no action needed
- ⚠️ **Unmatched** - Minor issues, review recommended
- ❌ **Discrepancy** - Serious issues, immediate attention required
- ℹ️ **Pending** - Still processing, check later

## Notes

### Deployment Date: _______________
### Deployed By: _______________
### Issues Encountered: _______________
### Resolution: _______________
### Sign-off: _______________

---

**Checklist Version:** 1.0.0
**Last Updated:** December 10, 2024
**Status:** Ready for Use

✅ **Complete this checklist before marking deployment as successful!**
