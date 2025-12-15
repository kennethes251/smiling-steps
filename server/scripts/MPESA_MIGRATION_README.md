# M-Pesa Payment Fields Migration Guide

## Overview

This guide explains how to run the M-Pesa payment fields migration script to add the necessary database schema updates for M-Pesa payment integration.

## What the Migration Does

The migration script (`migrate-mpesa-fields.js`) performs the following operations:

### 1. Adds New Columns to Sessions Table

- `paymentInitiatedAt` - Timestamp when payment was initiated
- `mpesaCheckoutRequestID` - M-Pesa checkout request identifier
- `mpesaMerchantRequestID` - M-Pesa merchant request identifier
- `mpesaTransactionID` - M-Pesa transaction receipt number
- `mpesaAmount` - Amount paid via M-Pesa
- `mpesaPhoneNumber` - Phone number used for payment
- `mpesaResultCode` - M-Pesa result code
- `mpesaResultDesc` - M-Pesa result description
- `paymentAttempts` - JSONB array of payment attempt audit trail

### 2. Updates Payment Status Enum

Adds new payment status values:
- `Processing` - Payment is being processed
- `Paid` - Payment completed
- `Confirmed` - Payment confirmed and session confirmed
- `Failed` - Payment failed

### 3. Migrates Existing Data

- Sets `paymentInitiatedAt` to `createdAt` for existing non-pending sessions
- Initializes `paymentAttempts` as empty array for all sessions

### 4. Creates Performance Indexes

- Compound index on `mpesaCheckoutRequestID` and `paymentStatus`
- Compound index on `clientId`, `paymentStatus`, and `sessionDate`
- Compound index on `psychologistId`, `paymentStatus`, and `sessionDate`
- Unique sparse index on `mpesaTransactionID` (only for non-null values)

## Prerequisites

1. PostgreSQL database must be running and accessible
2. `DATABASE_URL` environment variable must be set in `server/.env`
3. Database user must have permissions to:
   - Add columns
   - Modify enum types
   - Create indexes
   - Update records

## Running the Migration

### Development Environment

```bash
# From the project root
node server/scripts/migrate-mpesa-fields.js
```

### Production Environment

**⚠️ IMPORTANT: Always backup your database before running migrations in production!**

```bash
# 1. Backup the database first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run the migration
node server/scripts/migrate-mpesa-fields.js

# 3. Verify the migration was successful
# Check the output for any errors
```

## Expected Output

```
════════════════════════════════════════════════════════════
   M-Pesa Payment Fields Migration for PostgreSQL
════════════════════════════════════════════════════════════

✅ PostgreSQL connected successfully

🔄 Adding M-Pesa payment columns...

✅ Added column: paymentInitiatedAt
✅ Added column: mpesaCheckoutRequestID
✅ Added column: mpesaMerchantRequestID
✅ Added column: mpesaTransactionID
✅ Added column: mpesaAmount
✅ Added column: mpesaPhoneNumber
✅ Added column: mpesaResultCode
✅ Added column: mpesaResultDesc
✅ Added column: paymentAttempts

📊 Column Addition Summary:
   Added: 9
   Skipped: 0

🔄 Updating payment status enum...

✅ Added enum value: Processing
✅ Added enum value: Paid
✅ Added enum value: Confirmed
✅ Added enum value: Failed

🔄 Migrating existing session data...

✅ Updated 0 existing sessions with default values

🔄 Creating database indexes...

✅ Created index: idx_mpesa_checkout_payment_status
✅ Created index: idx_client_payment_date
✅ Created index: idx_psychologist_payment_date
✅ Created unique sparse index: idx_mpesa_transaction_unique

════════════════════════════════════════════════════════════
🎉 All migration tasks completed successfully!
════════════════════════════════════════════════════════════
```

## Troubleshooting

### Connection Errors

If you see "PostgreSQL connection error":

1. Verify `DATABASE_URL` is set correctly in `server/.env`
2. Check that the database server is running
3. Verify network connectivity to the database
4. Ensure SSL settings are correct for your environment

### Permission Errors

If you see permission-related errors:

1. Ensure the database user has `ALTER TABLE` privileges
2. Ensure the database user has `CREATE INDEX` privileges
3. For enum modifications, user needs `ALTER TYPE` privileges

### Column Already Exists

If you see "column already exists" messages:

- This is normal if you're re-running the migration
- The script will skip existing columns and continue
- Check the summary to see what was added vs skipped

### Enum Value Already Exists

If you see enum-related errors:

- The script uses `ADD VALUE IF NOT EXISTS` to prevent duplicates
- This is safe to ignore if values already exist

## Rollback

If you need to rollback the migration:

```sql
-- Remove added columns
ALTER TABLE sessions DROP COLUMN IF EXISTS paymentInitiatedAt;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaCheckoutRequestID;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaMerchantRequestID;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaTransactionID;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaAmount;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaPhoneNumber;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaResultCode;
ALTER TABLE sessions DROP COLUMN IF EXISTS mpesaResultDesc;
ALTER TABLE sessions DROP COLUMN IF EXISTS paymentAttempts;

-- Remove indexes
DROP INDEX IF EXISTS idx_mpesa_checkout_payment_status;
DROP INDEX IF EXISTS idx_client_payment_date;
DROP INDEX IF EXISTS idx_psychologist_payment_date;
DROP INDEX IF EXISTS idx_mpesa_transaction_unique;

-- Note: Enum values cannot be easily removed in PostgreSQL
-- You would need to recreate the enum type if needed
```

## Verification

After running the migration, verify the changes:

```sql
-- Check that columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND column_name LIKE 'mpesa%' OR column_name = 'paymentInitiatedAt' OR column_name = 'paymentAttempts';

-- Check that indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'sessions' 
  AND indexname LIKE 'idx_mpesa%' OR indexname LIKE 'idx_%_payment_%';

-- Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'enum_sessions_paymentStatus'
);
```

## Next Steps

After successfully running the migration:

1. Restart your application server to load the updated schema
2. Test M-Pesa payment initiation
3. Verify payment status updates are working
4. Check that audit trail is being recorded in `paymentAttempts`

## Support

If you encounter issues not covered in this guide:

1. Check the application logs for detailed error messages
2. Verify your PostgreSQL version is compatible (9.5+)
3. Ensure all environment variables are correctly set
4. Review the migration script source code for any custom modifications needed

## Migration Safety

This migration is designed to be:

- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only adds columns and indexes, doesn't remove or modify existing data
- **Backward compatible**: Existing functionality continues to work
- **Reversible**: Can be rolled back if needed (see Rollback section)
