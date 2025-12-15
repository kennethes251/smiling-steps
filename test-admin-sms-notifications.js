/**
 * Test script for admin SMS notifications
 * Tests the SMS notification functionality for reconciliation discrepancies
 */

const { sendReconciliationDiscrepancySMS } = require('./server/utils/notificationService');

async function testAdminSMSNotifications() {
  console.log('🧪 Testing Admin SMS Notifications...\n');

  // Mock reconciliation data with discrepancies
  const mockReconciliationData = {
    summary: {
      totalTransactions: 15,
      matched: 10,
      discrepancies: 3,
      unmatched: 2,
      totalAmount: 45000,
      timestamp: new Date(),
      dateRange: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date()
      }
    },
    results: {
      discrepancies: [
        {
          sessionId: '507f1f77bcf86cd799439011',
          transactionId: 'QHX12345678',
          issues: [
            { type: 'amount_mismatch', message: 'M-Pesa amount differs from session price' }
          ]
        },
        {
          sessionId: '507f1f77bcf86cd799439012',
          transactionId: 'QHX12345679',
          issues: [
            { type: 'duplicate_transaction', message: 'Transaction ID used in multiple sessions' }
          ]
        }
      ],
      unmatched: [
        {
          sessionId: '507f1f77bcf86cd799439013',
          reason: 'No M-Pesa transaction ID'
        }
      ]
    }
  };

  // Test 1: SMS notification with discrepancies
  console.log('📱 Test 1: SMS notification with discrepancies');
  try {
    const testPhone = process.env.ADMIN_PHONE || '+254700000000';
    console.log(`   Sending SMS to: ${testPhone}`);
    
    const result = await sendReconciliationDiscrepancySMS(mockReconciliationData, testPhone);
    
    if (result.success) {
      console.log('   ✅ SMS sent successfully');
      console.log('   📊 Result:', result);
    } else {
      console.log('   ❌ SMS failed:', result.reason || result.error);
    }
  } catch (error) {
    console.error('   ❌ Test failed:', error.message);
  }

  console.log();

  // Test 2: No SMS when no discrepancies
  console.log('📱 Test 2: No SMS when no discrepancies');
  try {
    const noDiscrepancyData = {
      summary: {
        totalTransactions: 10,
        matched: 10,
        discrepancies: 0,
        unmatched: 0,
        totalAmount: 30000,
        timestamp: new Date()
      }
    };

    const result = await sendReconciliationDiscrepancySMS(noDiscrepancyData, '+254700000000');
    
    if (result.success && result.reason === 'No discrepancies to report') {
      console.log('   ✅ Correctly skipped SMS (no discrepancies)');
    } else {
      console.log('   ❌ Unexpected result:', result);
    }
  } catch (error) {
    console.error('   ❌ Test failed:', error.message);
  }

  console.log();

  // Test 3: SMS configuration check
  console.log('📱 Test 3: SMS configuration check');
  console.log('   Environment variables:');
  console.log(`   - AFRICASTALKING_USERNAME: ${process.env.AFRICASTALKING_USERNAME ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - AFRICASTALKING_API_KEY: ${process.env.AFRICASTALKING_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - ADMIN_PHONE: ${process.env.ADMIN_PHONE ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - SMS_SENDER_ID: ${process.env.SMS_SENDER_ID || 'SmilingSteps (default)'}`);

  console.log('\n🏁 Admin SMS notification tests completed!');
  
  if (!process.env.AFRICASTALKING_API_KEY) {
    console.log('\n⚠️  Note: SMS service not configured. To enable SMS notifications:');
    console.log('   1. Sign up at https://africastalking.com');
    console.log('   2. Add AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY to your .env file');
    console.log('   3. Set ADMIN_PHONE to the admin\'s phone number');
  }
}

// Run the test
if (require.main === module) {
  // Load environment variables
  require('dotenv').config({ path: './server/.env' });
  
  testAdminSMSNotifications().catch(console.error);
}

module.exports = { testAdminSMSNotifications };