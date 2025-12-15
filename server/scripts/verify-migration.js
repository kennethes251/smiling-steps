/**
 * Database Migration Verification Script
 * 
 * Verifies that the M-Pesa payment integration database migration was successful.
 * Checks for all required fields, indexes, and data integrity.
 * 
 * Usage: node scripts/verify-migration.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function verifyMigration() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('  M-Pesa Migration Verification', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');
  
  let sequelize;
  
  try {
    // Connect to database
    logInfo('Connecting to database...');
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      logError('DATABASE_URL not set in environment variables');
      process.exit(1);
    }
    
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    
    await sequelize.authenticate();
    logSuccess('Connected to database');
    
    // Check if Sessions table exists
    log('\n1. Checking Sessions Table', 'bright');
    const [tableExists] = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Sessions')"
    );
    
    if (!tableExists[0].exists) {
      logError('Sessions table does not exist');
      process.exit(1);
    }
    logSuccess('Sessions table exists');
    
    // Check for M-Pesa fields
    log('\n2. Checking M-Pesa Fields', 'bright');
    const [columns] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Sessions'"
    );
    
    const requiredFields = [
      'mpesaCheckoutRequestID',
      'mpesaMerchantRequestID',
      'mpesaTransactionID',
      'mpesaAmount',
      'mpesaPhoneNumber',
      'mpesaResultCode',
      'mpesaResultDesc',
      'paymentMethod',
      'paymentStatus',
      'paymentInitiatedAt',
      'paymentVerifiedAt',
      'paymentFailureReason',
      'paymentAttempts'
    ];
    
    const columnNames = columns.map(col => col.column_name);
    let allFieldsPresent = true;
    
    requiredFields.forEach(field => {
      if (columnNames.includes(field)) {
        logSuccess(`Field exists: ${field}`);
      } else {
        logError(`Field missing: ${field}`);
        allFieldsPresent = false;
      }
    });
    
    if (!allFieldsPresent) {
      logError('Some required fields are missing');
      process.exit(1);
    }
    
    // Check for indexes
    log('\n3. Checking Database Indexes', 'bright');
    const [indexes] = await sequelize.query(
      `SELECT indexname, indexdef 
       FROM pg_indexes 
       WHERE tablename = 'Sessions' 
       AND indexname LIKE '%mpesa%' OR indexname LIKE '%payment%'`
    );
    
    if (indexes.length > 0) {
      logSuccess(`Found ${indexes.length} M-Pesa related indexes`);
      indexes.forEach(idx => {
        logInfo(`  - ${idx.indexname}`);
      });
    } else {
      logWarning('No M-Pesa specific indexes found (may impact performance)');
    }
    
    // Check data integrity
    log('\n4. Checking Data Integrity', 'bright');
    const [sessionCount] = await sequelize.query(
      "SELECT COUNT(*) as count FROM \"Sessions\""
    );
    
    const totalSessions = parseInt(sessionCount[0].count);
    logInfo(`Total sessions in database: ${totalSessions}`);
    
    if (totalSessions > 0) {
      // Check if any existing sessions have null values for new fields
      const [nullChecks] = await sequelize.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "paymentStatus" IS NULL THEN 1 END) as null_payment_status,
          COUNT(CASE WHEN "paymentMethod" IS NULL THEN 1 END) as null_payment_method
         FROM "Sessions"`
      );
      
      const nullCount = parseInt(nullChecks[0].null_payment_status);
      if (nullCount === totalSessions) {
        logSuccess('All existing sessions have default values for new fields');
      } else if (nullCount > 0) {
        logWarning(`${nullCount} sessions have null payment status`);
      } else {
        logSuccess('No null values in payment fields');
      }
      
      // Check for any M-Pesa payments
      const [mpesaPayments] = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM "Sessions" 
         WHERE "mpesaCheckoutRequestID" IS NOT NULL`
      );
      
      const mpesaCount = parseInt(mpesaPayments[0].count);
      if (mpesaCount > 0) {
        logSuccess(`Found ${mpesaCount} sessions with M-Pesa payment data`);
      } else {
        logInfo('No M-Pesa payments recorded yet (expected for new migration)');
      }
    } else {
      logInfo('No sessions in database yet');
    }
    
    // Check for audit log table
    log('\n5. Checking Audit Log Table', 'bright');
    const [auditTableExists] = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AuditLogs')"
    );
    
    if (auditTableExists[0].exists) {
      logSuccess('AuditLogs table exists');
      
      const [auditCount] = await sequelize.query(
        "SELECT COUNT(*) as count FROM \"AuditLogs\""
      );
      logInfo(`Audit log entries: ${auditCount[0].count}`);
    } else {
      logWarning('AuditLogs table not found (may need to be created)');
    }
    
    // Summary
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('  Verification Summary', 'bright');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    console.log('\n');
    
    if (allFieldsPresent) {
      logSuccess('Migration verification PASSED');
      logSuccess('Database is ready for M-Pesa payment integration');
      console.log('\n');
      logInfo('Next steps:');
      logInfo('1. Test M-Pesa connectivity: node scripts/test-mpesa-connection.js');
      logInfo('2. Deploy application');
      logInfo('3. Test payment flow');
      console.log('\n');
      process.exit(0);
    } else {
      logError('Migration verification FAILED');
      logError('Please run migration script: node scripts/migrate-mpesa-fields.js');
      console.log('\n');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// Run verification
verifyMigration();
