/**
 * Test script for reconciliation SMS integration
 * Tests the integration between reconciliation system and SMS notifications
 */

const { performDailyReconciliation } = require('./server/utils/paymentReconciliation');

async function testReconciliationSMSIntegration() {
  console.log('🧪 Testing Reconciliation SMS Integration...\n');

  try {
    // Load environment variables
    require('dotenv').config({ path: './server/.env' });

    console.log('📊 Running daily reconciliation with SMS integration...');
    
    // This will test the actual reconciliation process
    // which includes both email and SMS notifications
    const results = await performDailyReconciliation();
    
    console.log('✅ Reconciliation completed successfully');
    console.log('📈 Summary:', {
      totalTransactions: results.summary.totalTransactions,
      matched: results.summary.matched,
      discrepancies: results.summary.discrepancies,
      unmatched: results.summary.unmatched,
      totalAmount: results.summary.totalAmount
    });

    // Check if SMS would be sent
    const wouldSendSMS = results.summary.discrepancies > 0 || results.summary.unmatched > 0;
    const adminPhone = process.env.ADMIN_PHONE;
    
    console.log('\n📱 SMS Notification Status:');
    console.log(`   Would send SMS: ${wouldSendSMS ? '✅ Yes' : '❌ No (no issues detected)'}`);
    console.log(`   Admin phone configured: ${adminPhone ? '✅ Yes' : '❌ No'}`);
    console.log(`   SMS service configured: ${process.env.AFRICASTALKING_API_KEY ? '✅ Yes' : '❌ No'}`);

    if (wouldSendSMS && adminPhone && process.env.AFRICASTALKING_API_KEY) {
      console.log('   📤 SMS alert would be sent to admin');
    } else if (wouldSendSMS) {
      console.log('   ⚠️  SMS alert needed but service not fully configured');
    } else {
      console.log('   ℹ️  No SMS alert needed (no discrepancies found)');
    }

  } catch (error) {
    console.error('❌ Reconciliation test failed:', error.message);
    
    // Check if it's a database connection error
    if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 This appears to be a database connection issue.');
      console.log('   Make sure MongoDB is running and connection string is correct.');
    }
  }

  console.log('\n🏁 Reconciliation SMS integration test completed!');
}

// Run the test
if (require.main === module) {
  testReconciliationSMSIntegration().catch(console.error);
}

module.exports = { testReconciliationSMSIntegration };