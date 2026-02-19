/**
 * Test Script for Automatic Issue Resolution System
 * Tests various issue types and resolution strategies
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import required modules
const Session = require('./server/models/Session');
const User = require('./server/models/User');
const automaticIssueResolver = require('./server/utils/automaticIssueResolver');

// Test configuration
const TEST_CONFIG = {
  // Test database connection
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling_steps_test',
  
  // Test scenarios
  scenarios: [
    'timeout_recovery',
    'status_verification', 
    'orphaned_payment',
    'duplicate_callback',
    'amount_mismatch',
    'status_inconsistency',
    'failed_callback_retry',
    'api_sync_issue'
  ]
};

/**
 * Connect to test database
 */
async function connectTestDB() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUri);
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

/**
 * Create test users
 */
async function createTestUsers() {
  try {
    // Create test client
    const testClient = await User.findOneAndUpdate(
      { email: 'test.client@example.com' },
      {
        name: 'Test Client',
        email: 'test.client@example.com',
        role: 'client',
        phone: '254712345678'
      },
      { upsert: true, new: true }
    );

    // Create test psychologist
    const testPsychologist = await User.findOneAndUpdate(
      { email: 'test.psychologist@example.com' },
      {
        name: 'Test Psychologist',
        email: 'test.psychologist@example.com',
        role: 'psychologist',
        phone: '254787654321'
      },
      { upsert: true, new: true }
    );

    console.log('✅ Test users created');
    return { testClient, testPsychologist };

  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    throw error;
  }
}

/**
 * Create test session with specific issue
 */
async function createTestSession(issueType, client, psychologist) {
  const baseSession = {
    client: client._id,
    psychologist: psychologist._id,
    sessionType: 'Individual Therapy',
    sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    price: 2500,
    status: 'Approved',
    paymentMethod: 'M-Pesa'
  };

  let sessionData = { ...baseSession };

  // Configure session based on issue type
  switch (issueType) {
    case 'timeout_recovery':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Processing',
        paymentInitiatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        mpesaCheckoutRequestID: `ws_CO_${Date.now()}_test_timeout`
      };
      break;

    case 'status_verification':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Paid',
        mpesaTransactionID: `TEST${Date.now()}`,
        mpesaResultCode: 0,
        paymentVerifiedAt: new Date()
      };
      break;

    case 'orphaned_payment':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Processing', // Wrong status
        mpesaTransactionID: `ORPHAN${Date.now()}`,
        mpesaResultCode: 0, // Success code
        mpesaAmount: 2500,
        mpesaPhoneNumber: '254712345678'
      };
      break;

    case 'duplicate_callback':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Paid',
        mpesaCheckoutRequestID: `ws_CO_DUPLICATE_${Date.now()}`,
        mpesaTransactionID: `DUP${Date.now()}`
      };
      break;

    case 'amount_mismatch':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Paid',
        mpesaAmount: 2500.50, // Slight difference
        mpesaTransactionID: `MISMATCH${Date.now()}`,
        mpesaResultCode: 0
      };
      break;

    case 'status_inconsistency':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Processing', // Wrong status
        status: 'Approved', // Should be Confirmed
        mpesaTransactionID: `INCONSISTENT${Date.now()}`,
        mpesaResultCode: 0 // Success code
      };
      break;

    case 'failed_callback_retry':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Processing',
        mpesaCheckoutRequestID: `ws_CO_FAILED_${Date.now()}`,
        paymentAttempts: [{
          checkoutRequestID: `ws_CO_FAILED_${Date.now()}`,
          status: 'failed',
          timestamp: new Date()
        }]
      };
      break;

    case 'api_sync_issue':
      sessionData = {
        ...sessionData,
        paymentStatus: 'Paid',
        mpesaResultCode: 1, // Wrong result code
        mpesaTransactionID: `SYNC${Date.now()}`
      };
      break;

    default:
      throw new Error(`Unknown issue type: ${issueType}`);
  }

  const session = new Session(sessionData);
  await session.save();

  console.log(`✅ Created test session for ${issueType}:`, session._id);
  return session;
}

/**
 * Test specific issue resolution
 */
async function testIssueResolution(issueType, session) {
  console.log(`\n🔧 Testing ${issueType} resolution...`);

  try {
    const context = {
      sessionId: session._id,
      checkoutRequestID: session.mpesaCheckoutRequestID
    };

    // Add specific context for certain issue types
    if (issueType === 'failed_callback_retry') {
      context.callbackData = {
        Body: {
          stkCallback: {
            CheckoutRequestID: session.mpesaCheckoutRequestID,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: session.price },
                { Name: 'MpesaReceiptNumber', Value: `TEST${Date.now()}` },
                { Name: 'PhoneNumber', Value: '254712345678' }
              ]
            }
          }
        }
      };
    }

    // Attempt resolution
    const result = await automaticIssueResolver.resolveIssue(issueType, context);

    console.log(`📊 Resolution result:`, {
      success: result.success,
      reason: result.reason,
      requiresManualIntervention: result.requiresManualIntervention
    });

    // Verify the resolution by checking the updated session
    const updatedSession = await Session.findById(session._id);
    console.log(`📋 Session after resolution:`, {
      paymentStatus: updatedSession.paymentStatus,
      sessionStatus: updatedSession.status,
      transactionId: updatedSession.mpesaTransactionID,
      resultCode: updatedSession.mpesaResultCode
    });

    return {
      issueType,
      result,
      sessionBefore: session.toObject(),
      sessionAfter: updatedSession.toObject()
    };

  } catch (error) {
    console.error(`❌ Error testing ${issueType}:`, error);
    return {
      issueType,
      error: error.message
    };
  }
}

/**
 * Test automatic detection and resolution
 */
async function testAutomaticDetection() {
  console.log('\n🔍 Testing automatic detection and resolution...');

  try {
    const results = await automaticIssueResolver.detectAndResolveIssues();
    
    console.log('📊 Automatic detection results:', {
      totalIssues: results.totalIssues,
      resolved: results.resolved,
      failed: results.failed
    });

    return results;

  } catch (error) {
    console.error('❌ Error in automatic detection:', error);
    return { error: error.message };
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    // Remove test sessions
    await Session.deleteMany({
      $or: [
        { mpesaTransactionID: /^TEST/ },
        { mpesaTransactionID: /^ORPHAN/ },
        { mpesaTransactionID: /^DUP/ },
        { mpesaTransactionID: /^MISMATCH/ },
        { mpesaTransactionID: /^INCONSISTENT/ },
        { mpesaTransactionID: /^SYNC/ },
        { mpesaCheckoutRequestID: /test_timeout/ },
        { mpesaCheckoutRequestID: /FAILED/ },
        { mpesaCheckoutRequestID: /DUPLICATE/ }
      ]
    });

    // Remove test users
    await User.deleteMany({
      email: { $in: ['test.client@example.com', 'test.psychologist@example.com'] }
    });

    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('⚠️ Error cleaning up test data:', error);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Automatic Issue Resolution Tests\n');

  try {
    // Connect to database
    await connectTestDB();

    // Create test users
    const { testClient, testPsychologist } = await createTestUsers();

    // Test results
    const testResults = [];

    // Test each issue type
    for (const issueType of TEST_CONFIG.scenarios) {
      console.log(`\n📝 Testing scenario: ${issueType}`);
      
      // Create test session with the specific issue
      const session = await createTestSession(issueType, testClient, testPsychologist);
      
      // Test resolution
      const result = await testIssueResolution(issueType, session);
      testResults.push(result);
    }

    // Test automatic detection
    const detectionResult = await testAutomaticDetection();

    // Print summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const successful = testResults.filter(r => r.result?.success).length;
    const failed = testResults.filter(r => r.error || !r.result?.success).length;
    
    console.log(`✅ Successful resolutions: ${successful}`);
    console.log(`❌ Failed resolutions: ${failed}`);
    console.log(`🔍 Automatic detection: ${detectionResult.error ? 'Failed' : 'Success'}`);

    // Detailed results
    console.log('\n📋 DETAILED RESULTS');
    console.log('===================');
    testResults.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.issueType}: ERROR - ${result.error}`);
      } else if (result.result.success) {
        console.log(`✅ ${result.issueType}: SUCCESS - ${result.result.reason}`);
      } else {
        console.log(`⚠️ ${result.issueType}: FAILED - ${result.result.reason}${result.result.requiresManualIntervention ? ' (Manual intervention required)' : ''}`);
      }
    });

    // Clean up
    await cleanupTestData();

    console.log('\n🎉 Tests completed successfully!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testIssueResolution,
  createTestSession,
  TEST_CONFIG
};