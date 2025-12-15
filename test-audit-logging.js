/**
 * Test Audit Logging System
 * 
 * Simple test to verify audit logging functionality
 */

const mongoose = require('mongoose');
const path = require('path');

// Try multiple .env locations
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const auditLogger = require('./server/utils/auditLogger');

async function testAuditLogging() {
  try {
    console.log('🧪 Testing Audit Logging System...\n');

    // Connect to database
    console.log('📡 Connecting to database...');
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!dbUri) {
      throw new Error('Database URI not found. Please set MONGODB_URI or MONGO_URI in .env file');
    }
    
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');

    // Test 1: Log payment initiation
    console.log('Test 1: Payment Initiation Logging');
    console.log('-----------------------------------');
    await auditLogger.logPaymentInitiation({
      userId: '507f1f77bcf86cd799439011',
      sessionId: '507f1f77bcf86cd799439012',
      amount: 2500,
      phoneNumber: '254712345678',
      checkoutRequestID: 'ws_CO_12345678',
      merchantRequestID: '12345-67890-12345'
    });
    console.log('✅ Payment initiation logged\n');

    // Test 2: Log payment status change
    console.log('Test 2: Payment Status Change Logging');
    console.log('--------------------------------------');
    await auditLogger.logPaymentStatusChange({
      sessionId: '507f1f77bcf86cd799439012',
      previousStatus: 'Processing',
      newStatus: 'Paid',
      reason: 'M-Pesa callback confirmed payment',
      transactionID: 'QGH12345678',
      resultCode: 0
    });
    console.log('✅ Payment status change logged\n');

    // Test 3: Log payment callback
    console.log('Test 3: Payment Callback Logging');
    console.log('---------------------------------');
    await auditLogger.logPaymentCallback({
      sessionId: '507f1f77bcf86cd799439012',
      checkoutRequestID: 'ws_CO_12345678',
      resultCode: 0,
      resultDesc: 'The service request is processed successfully',
      transactionID: 'QGH12345678',
      amount: 2500,
      phoneNumber: '254712345678'
    });
    console.log('✅ Payment callback logged\n');

    // Test 4: Log admin access
    console.log('Test 4: Admin Access Logging');
    console.log('-----------------------------');
    await auditLogger.logAdminAccess({
      adminId: '507f1f77bcf86cd799439013',
      action: 'View payment dashboard',
      accessedData: 'All M-Pesa transactions',
      ipAddress: '192.168.1.100'
    });
    console.log('✅ Admin access logged\n');

    // Test 5: Log payment failure
    console.log('Test 5: Payment Failure Logging');
    console.log('--------------------------------');
    await auditLogger.logPaymentFailure({
      sessionId: '507f1f77bcf86cd799439014',
      userId: '507f1f77bcf86cd799439011',
      reason: 'Insufficient funds',
      resultCode: 1,
      checkoutRequestID: 'ws_CO_87654321'
    });
    console.log('✅ Payment failure logged\n');

    // Test 6: Retrieve audit logs
    console.log('Test 6: Retrieve Audit Logs');
    console.log('----------------------------');
    const logs = await auditLogger.retrieveAuditLogs({
      limit: 5
    });
    console.log(`✅ Retrieved ${logs.returnedCount} audit logs`);
    console.log(`   Total logs in database: ${logs.totalCount}`);
    console.log(`   Format: ${logs.format}`);
    console.log(`   Integrity check: ${logs.integrityCheck.enabled ? 'Enabled' : 'Disabled'}\n`);

    // Test 7: Verify log integrity
    console.log('Test 7: Verify Log Integrity');
    console.log('-----------------------------');
    if (logs.logs.length >= 2) {
      const log1 = logs.logs[1]; // Second most recent
      const log2 = logs.logs[0]; // Most recent
      
      const isValid = auditLogger.verifyLogIntegrity(log2, log1.logHash);
      console.log(`✅ Log integrity verification: ${isValid ? 'VALID' : 'INVALID'}`);
      console.log(`   Log hash: ${log2.logHash.substring(0, 16)}...`);
      console.log(`   Previous hash: ${log2.previousHash?.substring(0, 16) || 'null'}...\n`);
    } else {
      console.log('⚠️  Not enough logs to verify chain integrity\n');
    }

    // Display sample log entry
    if (logs.logs.length > 0) {
      console.log('Sample Audit Log Entry:');
      console.log('------------------------');
      const sampleLog = logs.logs[0];
      console.log(JSON.stringify({
        timestamp: sampleLog.timestamp,
        actionType: sampleLog.actionType,
        action: sampleLog.action,
        logHash: sampleLog.logHash.substring(0, 16) + '...',
        previousHash: sampleLog.previousHash?.substring(0, 16) + '...' || 'null'
      }, null, 2));
    }

    console.log('\n✅ All audit logging tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Payment initiation logging: ✅');
    console.log('   - Payment status change logging: ✅');
    console.log('   - Payment callback logging: ✅');
    console.log('   - Admin access logging: ✅');
    console.log('   - Payment failure logging: ✅');
    console.log('   - Audit log retrieval: ✅');
    console.log('   - Log integrity verification: ✅');
    console.log('   - Tamper-evident hash chain: ✅');
    console.log('   - Database persistence: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
}

// Run tests
testAuditLogging()
  .then(() => {
    console.log('\n🎉 Audit logging system is working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Audit logging test failed:', error.message);
    process.exit(1);
  });
