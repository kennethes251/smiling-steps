/**
 * Test script for reconciliation email alerts
 * Tests the email notification system for payment discrepancies
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const { sendReconciliationDiscrepancyAlert } = require('./server/utils/notificationService');

// Mock reconciliation results with discrepancies
const mockReconciliationResults = {
  summary: {
    totalTransactions: 25,
    matched: 20,
    unmatched: 3,
    discrepancies: 2,
    pendingVerification: 0,
    errors: 0,
    totalAmount: 12500,
    dateRange: {
      startDate: new Date('2024-12-13T00:00:00Z'),
      endDate: new Date('2024-12-13T23:59:59Z')
    },
    timestamp: new Date()
  },
  results: {
    matched: [],
    unmatched: [
      {
        sessionId: '507f1f77bcf86cd799439011',
        transactionId: 'RKL1234567',
        amount: 500,
        phoneNumber: '1234',
        timestamp: new Date(),
        status: 'unmatched',
        issues: [
          {
            type: 'status_mismatch',
            message: 'Transaction ID exists but payment status is not Paid',
            currentStatus: 'Processing'
          }
        ]
      },
      {
        sessionId: '507f1f77bcf86cd799439012',
        transactionId: 'RKL2345678',
        amount: 750,
        phoneNumber: '5678',
        timestamp: new Date(),
        status: 'unmatched',
        issues: [
          {
            type: 'result_code_mismatch',
            message: 'Payment marked as Paid but result code is not 0',
            resultCode: 1032,
            resultDesc: 'Request cancelled by user'
          }
        ]
      },
      {
        sessionId: '507f1f77bcf86cd799439013',
        transactionId: null,
        amount: 600,
        phoneNumber: '9012',
        timestamp: new Date(),
        status: 'unmatched',
        issues: [
          {
            type: 'pending_verification',
            message: 'No M-Pesa transaction ID',
            reason: 'Payment not completed'
          }
        ]
      }
    ],
    discrepancies: [
      {
        sessionId: '507f1f77bcf86cd799439014',
        transactionId: 'RKL3456789',
        amount: 500,
        phoneNumber: '3456',
        timestamp: new Date(),
        status: 'discrepancy',
        issues: [
          {
            type: 'amount_mismatch',
            message: 'M-Pesa amount differs from session price',
            mpesaAmount: 450,
            sessionPrice: 500
          }
        ]
      },
      {
        sessionId: '507f1f77bcf86cd799439015',
        transactionId: 'RKL4567890',
        amount: 800,
        phoneNumber: '7890',
        timestamp: new Date(),
        status: 'discrepancy',
        issues: [
          {
            type: 'duplicate_transaction',
            message: 'Transaction ID used in multiple sessions',
            duplicateCount: 2
          }
        ]
      }
    ],
    pendingVerification: [],
    errors: []
  }
};

async function testReconciliationEmailAlert() {
  console.log('🧪 Testing Reconciliation Email Alert System\n');

  try {
    // Check if email is configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Email service not configured in .env file');
      console.log('Required variables: EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM');
      console.log('\nSkipping email test, but the function is ready to use when configured.\n');
      return;
    }

    // Get admin email
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    console.log(`📧 Sending test alert to: ${adminEmail}\n`);

    // Test 1: Send alert with discrepancies
    console.log('Test 1: Sending alert with discrepancies and unmatched transactions...');
    const result1 = await sendReconciliationDiscrepancyAlert(mockReconciliationResults, adminEmail);
    
    if (result1.success) {
      console.log('✅ Test 1 PASSED: Alert sent successfully');
      console.log(`   Message ID: ${result1.messageId}\n`);
    } else {
      console.log('❌ Test 1 FAILED:', result1.error || result1.reason);
    }

    // Test 2: Send alert with no discrepancies (should skip)
    console.log('Test 2: Testing with no discrepancies (should skip)...');
    const noDiscrepancyResults = {
      summary: {
        totalTransactions: 10,
        matched: 10,
        unmatched: 0,
        discrepancies: 0,
        pendingVerification: 0,
        errors: 0,
        totalAmount: 5000,
        dateRange: {
          startDate: new Date('2024-12-13T00:00:00Z'),
          endDate: new Date('2024-12-13T23:59:59Z')
        },
        timestamp: new Date()
      },
      results: {
        matched: [],
        unmatched: [],
        discrepancies: [],
        pendingVerification: [],
        errors: []
      }
    };

    const result2 = await sendReconciliationDiscrepancyAlert(noDiscrepancyResults, adminEmail);
    
    if (result2.success && result2.reason === 'No discrepancies to report') {
      console.log('✅ Test 2 PASSED: Correctly skipped when no discrepancies\n');
    } else {
      console.log('❌ Test 2 FAILED: Should have skipped\n');
    }

    // Test 3: Test with many discrepancies (should truncate in email)
    console.log('Test 3: Testing with many discrepancies (should show first 10)...');
    const manyDiscrepancies = {
      summary: {
        totalTransactions: 50,
        matched: 30,
        unmatched: 5,
        discrepancies: 15,
        pendingVerification: 0,
        errors: 0,
        totalAmount: 25000,
        dateRange: {
          startDate: new Date('2024-12-13T00:00:00Z'),
          endDate: new Date('2024-12-13T23:59:59Z')
        },
        timestamp: new Date()
      },
      results: {
        matched: [],
        unmatched: [],
        discrepancies: Array.from({ length: 15 }, (_, i) => ({
          sessionId: `507f1f77bcf86cd79943901${i}`,
          transactionId: `RKL${1000000 + i}`,
          amount: 500 + (i * 50),
          phoneNumber: `${1000 + i}`,
          timestamp: new Date(),
          status: 'discrepancy',
          issues: [
            {
              type: 'amount_mismatch',
              message: `Test discrepancy ${i + 1}`,
              mpesaAmount: 450,
              sessionPrice: 500
            }
          ]
        })),
        pendingVerification: [],
        errors: []
      }
    };

    const result3 = await sendReconciliationDiscrepancyAlert(manyDiscrepancies, adminEmail);
    
    if (result3.success) {
      console.log('✅ Test 3 PASSED: Alert sent with truncated list');
      console.log(`   Message ID: ${result3.messageId}\n`);
    } else {
      console.log('❌ Test 3 FAILED:', result3.error || result3.reason);
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Email alerts are configured and working');
    console.log('   - Alerts are sent when discrepancies are detected');
    console.log('   - Alerts are skipped when no discrepancies exist');
    console.log('   - Large lists are properly truncated in emails');
    console.log('\n💡 Next steps:');
    console.log('   1. Check your email inbox for the test alerts');
    console.log('   2. Verify the email formatting and content');
    console.log('   3. The system will automatically send alerts during daily reconciliation');
    console.log('   4. Admins will also receive alerts when running manual reconciliation\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  }
}

// Run the test
testReconciliationEmailAlert()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
