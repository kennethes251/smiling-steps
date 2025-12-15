# Payment Reconciliation System - Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Payment Reconciliation System                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Automatic  │    │    Manual    │    │  Real-time   │
│     Daily    │    │ Reconciliation│    │  Dashboard   │
│ Reconciliation│    │   (Admin)    │    │  Statistics  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Reconciliation  │
                    │      Engine      │
                    └──────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Database │  │  M-Pesa  │  │  Audit   │
        │  Queries │  │   API    │  │   Logs   │
        └──────────┘  └──────────┘  └──────────┘
```

## Daily Reconciliation Flow

```
11 PM EAT Daily
      │
      ▼
┌─────────────────────────────────────────┐
│  Cron Job Triggers                      │
│  schedule-reconciliation.js             │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  performDailyReconciliation()           │
│  - Get yesterday's date range           │
│  - Query all paid sessions              │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  For Each Session:                      │
│  reconcileSession()                     │
└─────────────────────────────────────────┘
      │
      ├─────────────────────────────────────┐
      │                                     │
      ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│  Validation  │                    │  M-Pesa API  │
│   Checks     │                    │    Query     │
│              │                    │  (if needed) │
│ • Amount     │                    └──────────────┘
│ • Status     │                           │
│ • Timestamp  │                           │
│ • Duplicates │◄──────────────────────────┘
└──────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Categorize Results:                    │
│  • Matched ✅                           │
│  • Unmatched ⚠️                         │
│  • Discrepancies ❌                     │
│  • Pending ℹ️                           │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Generate Summary Report                │
│  - Total transactions                   │
│  - Status breakdown                     │
│  - Total amount                         │
└─────────────────────────────────────────┘
      │
      ├─────────────────┬─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│   Log    │    │  Alert   │    │  Store   │
│ Results  │    │  Admin   │    │  Report  │
│          │    │(if issues)│    │          │
└──────────┘    └──────────┘    └──────────┘
```

## Manual Reconciliation Flow

```
Admin User
      │
      ▼
┌─────────────────────────────────────────┐
│  Access Reconciliation Dashboard        │
│  /admin/reconciliation                  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Select Date Range                      │
│  - Start Date                           │
│  - End Date                             │
│  - Optional: Client/Psychologist filter │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Click "Run Reconciliation"             │
│  POST /api/reconciliation/run           │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Backend Processing                     │
│  reconcilePayments(startDate, endDate)  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Query Database                         │
│  - Find all paid sessions in range      │
│  - Populate client & psychologist       │
│  - Sort by payment date                 │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Reconcile Each Session                 │
│  - Validate data consistency            │
│  - Check for duplicates                 │
│  - Verify amounts                       │
│  - Confirm timestamps                   │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Return Results to Frontend             │
│  - Summary statistics                   │
│  - Grouped by status                    │
│  - Detailed issue list                  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Display Results                        │
│  - Summary cards                        │
│  - Results table                        │
│  - Discrepancies highlighted            │
└─────────────────────────────────────────┘
      │
      ├─────────────────┬─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│   View   │    │ Download │    │  Verify  │
│ Details  │    │  Report  │    │Individual│
│          │    │   (CSV)  │    │Transaction│
└──────────┘    └──────────┘    └──────────┘
```

## Transaction Verification Flow

```
Admin Clicks "View Details"
      │
      ▼
┌─────────────────────────────────────────┐
│  GET /api/reconciliation/session/:id    │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Load Session from Database             │
│  - Include client & psychologist        │
│  - Get all payment fields               │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Run Validation Checks                  │
└─────────────────────────────────────────┘
      │
      ├──────────────────────────────────────┐
      │                                      │
      ▼                                      ▼
┌──────────────────┐              ┌──────────────────┐
│  Data Validation │              │  M-Pesa Query    │
│                  │              │  (if needed)     │
│ • Amount match   │              │                  │
│ • Status match   │              │ stkQuery()       │
│ • Timestamp OK   │              │                  │
│ • No duplicates  │              └──────────────────┘
└──────────────────┘                       │
      │                                    │
      └────────────────┬───────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │  Compile Issues  │
            │                  │
            │ • Type           │
            │ • Message        │
            │ • Details        │
            └──────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │ Return to Admin  │
            │                  │
            │ • Session info   │
            │ • Issues list    │
            │ • Recommendations│
            └──────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │  Display Dialog  │
            │                  │
            │ • Session details│
            │ • Issue alerts   │
            │ • Action buttons │
            └──────────────────┘
```

## Orphaned Payment Detection Flow

```
System Check
      │
      ▼
┌─────────────────────────────────────────┐
│  Query Database for Anomalies           │
│  findOrphanedPayments()                 │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Find Sessions Where:                   │
│  • mpesaTransactionID exists            │
│  • BUT paymentStatus != 'Paid'          │
│  • OR status not in ['Confirmed',      │
│    'Completed']                         │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  For Each Orphaned Payment:             │
│  - Extract session details              │
│  - Get transaction info                 │
│  - Identify the issue                   │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Return List to Admin                   │
│  - Session ID                           │
│  - Transaction ID                       │
│  - Current statuses                     │
│  - Client & psychologist                │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Display in Dashboard                   │
│  "Orphaned Payments" Section            │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Admin Actions:                         │
│  1. View details                        │
│  2. Verify with M-Pesa                  │
│  3. Update session status               │
│  4. Notify client if needed             │
└─────────────────────────────────────────┘
```

## Report Generation Flow

```
Admin Clicks "Download Report"
      │
      ▼
┌─────────────────────────────────────────┐
│  GET /api/reconciliation/report         │
│  ?startDate=...&endDate=...&format=csv  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Run Reconciliation                     │
│  reconcilePayments(startDate, endDate)  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Generate CSV Content                   │
│  generateReconciliationReport()         │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  CSV Structure:                         │
│  - Session ID                           │
│  - Transaction ID                       │
│  - Amount                               │
│  - Phone Number (masked)                │
│  - Timestamp                            │
│  - Status                               │
│  - Issues                               │
│  - Client                               │
│  - Psychologist                         │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Set Response Headers                   │
│  Content-Type: text/csv                 │
│  Content-Disposition: attachment        │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Send CSV to Browser                    │
│  Browser triggers download              │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Admin Opens in Excel/Sheets            │
│  - Review data                          │
│  - Share with finance team              │
│  - Archive for compliance               │
└─────────────────────────────────────────┘
```

## Data Validation Checks

```
Session Record
      │
      ▼
┌─────────────────────────────────────────┐
│  Check 1: Transaction ID Exists?        │
│  mpesaTransactionID != null             │
└─────────────────────────────────────────┘
      │
      ├─── No ──► Pending Verification ℹ️
      │
      ▼ Yes
┌─────────────────────────────────────────┐
│  Check 2: Payment Status Correct?       │
│  paymentStatus === 'Paid'               │
└─────────────────────────────────────────┘
      │
      ├─── No ──► Status Mismatch ❌
      │
      ▼ Yes
┌─────────────────────────────────────────┐
│  Check 3: Amount Matches?               │
│  mpesaAmount === session.price          │
└─────────────────────────────────────────┘
      │
      ├─── No ──► Amount Discrepancy ❌
      │
      ▼ Yes
┌─────────────────────────────────────────┐
│  Check 4: Result Code Success?          │
│  mpesaResultCode === 0                  │
└─────────────────────────────────────────┘
      │
      ├─── No ──► Result Code Mismatch ⚠️
      │
      ▼ Yes
┌─────────────────────────────────────────┐
│  Check 5: Duplicate Transaction?        │
│  Count sessions with same txn ID        │
└─────────────────────────────────────────┘
      │
      ├─── Yes ──► Duplicate Transaction ❌
      │
      ▼ No
┌─────────────────────────────────────────┐
│  Check 6: Timestamp Reasonable?         │
│  Within 5 minutes of expected           │
└─────────────────────────────────────────┘
      │
      ├─── No ──► Timestamp Issue ⚠️
      │
      ▼ Yes
┌─────────────────────────────────────────┐
│  ✅ All Checks Passed                   │
│  Status: MATCHED                        │
└─────────────────────────────────────────┘
```

## Status Determination Logic

```
                    Start
                      │
                      ▼
            ┌──────────────────┐
            │  Has Issues?     │
            └──────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼ No                        ▼ Yes
┌──────────────┐          ┌──────────────────┐
│   MATCHED    │          │  Check Severity  │
│      ✅      │          └──────────────────┘
└──────────────┘                    │
                          ┌─────────┴─────────┐
                          │                   │
                          ▼                   ▼
                  ┌──────────────┐    ┌──────────────┐
                  │   Critical   │    │   Minor      │
                  │   Issues?    │    │   Issues?    │
                  └──────────────┘    └──────────────┘
                          │                   │
                          ▼                   ▼
                  ┌──────────────┐    ┌──────────────┐
                  │ DISCREPANCY  │    │  UNMATCHED   │
                  │      ❌      │    │      ⚠️      │
                  └──────────────┘    └──────────────┘

Critical Issues:
• Duplicate transaction ID
• Amount mismatch
• Payment marked paid but result code != 0

Minor Issues:
• Timestamp slightly off
• Status inconsistency (but payment confirmed)
• Missing optional fields
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│              Existing M-Pesa Payment System             │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Payment Completed
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Session Record Updated                     │
│  • mpesaTransactionID                                   │
│  • paymentStatus = 'Paid'                               │
│  • mpesaAmount, mpesaPhoneNumber                        │
│  • paymentVerifiedAt                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Stored in Database
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│           Reconciliation System Reads Data              │
│  • Daily automatic check                                │
│  • Manual admin verification                            │
│  • Real-time dashboard stats                            │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Validates & Reports
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Admin Takes Action (if needed)             │
│  • Review discrepancies                                 │
│  • Verify with M-Pesa                                   │
│  • Update session status                                │
│  • Generate reports                                     │
└─────────────────────────────────────────────────────────┘
```

---

**Note:** These diagrams show the logical flow of the reconciliation system. The actual implementation uses asynchronous JavaScript with proper error handling, database transactions, and comprehensive logging at each step.
