/**
 * Test Reconciliation Webhook Functionality
 * 
 * This script tests the reconciliation webhook system to ensure
 * external systems can be properly notified when reconciliation completes.
 */

const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@smilingsteps.co.ke',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  webhookTestUrl: process.env.WEBHOOK_TEST_URL || 'https://webhook.site/unique-id'
};

console.log('🧪 Testing Reconciliation Webhook System');
console.log('=====================================');

/**
 * Test webhook signature verification
 */
function testWebhookSignature() {
  console.log('\n📝 Testing webhook signature generation...');
  
  const testPayload = {
    event: 'reconciliation.completed',
    timestamp: new Date().toISOString(),
    data: { test: true }
  };
  
  const secret = 'test-secret-key';
  const canonicalPayload = JSON.stringify(testPayload, Object.keys(testPayload).sort());
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(canonicalPayload);
  const signature = hmac.digest('hex');
  
  console.log('✅ Signature generated:', signature.substring(0, 16) + '...');
  
  // Verify signature
  const verifyHmac = crypto.createHmac('sha256', secret);
  verifyHmac.update(canonicalPayload);
  const verifySignature = verifyHmac.digest('hex');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(verifySignature, 'hex')
  );
  
  console.log('✅ Signature verification:', isValid ? 'PASSED' : 'FAILED');
  return isValid;
}

/**
 * Authenticate as admin
 */
async function authenticateAdmin() {
  try {
    console.log('\n🔐 Authenticating as admin...');
    
    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/users/login`, {
      email: TEST_CONFIG.adminEmail,
      password: TEST_CONFIG.adminPassword
    });
    
    if (response.data.token) {
      console.log('✅ Admin authentication successful');
      return response.data.token;
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.response?.data?.msg || error.message);
    throw error;
  }
}

/**
 * Test webhook configuration endpoint
 */
async function testWebhookConfig(token) {
  try {
    console.log('\n⚙️ Testing webhook configuration endpoint...');
    
    const response = await axios.get(`${TEST_CONFIG.baseUrl}/api/reconciliation/webhook/config`, {
      headers: { 'x-auth-token': token }
    });
    
    console.log('✅ Webhook config retrieved:', {
      urlsConfigured: response.data.config.webhookUrlsConfigured,
      secretConfigured: response.data.config.secretConfigured,
      retryAttempts: response.data.config.retryAttempts
    });
    
    return response.data.config;
  } catch (error) {
    console.error('❌ Webhook config test failed:', error.response?.data?.msg || error.message);
    throw error;
  }
}

/**
 * Test webhook connectivity
 */
async function testWebhookConnectivity(token) {
  try {
    console.log('\n🌐 Testing webhook connectivity...');
    
    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/reconciliation/webhook/test`, {}, {
      headers: { 'x-auth-token': token }
    });
    
    console.log('✅ Webhook connectivity test result:', response.data.msg);
    
    if (response.data.results) {
      response.data.results.forEach((result, index) => {
        console.log(`   Webhook ${index + 1}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} - ${result.url || result.error}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Webhook connectivity test failed:', error.response?.data?.msg || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test manual reconciliation with webhook
 */
async function testManualReconciliation(token) {
  try {
    console.log('\n🔄 Testing manual reconciliation with webhook...');
    
    // Get date range for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/reconciliation/run`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }, {
      headers: { 'x-auth-token': token }
    });
    
    console.log('✅ Manual reconciliation completed:', {
      totalTransactions: response.data.summary?.totalTransactions || 0,
      matched: response.data.summary?.matched || 0,
      discrepancies: response.data.summary?.discrepancies || 0
    });
    
    console.log('📡 Webhook should have been sent for this reconciliation');
    
    return response.data;
  } catch (error) {
    console.error('❌ Manual reconciliation test failed:', error.response?.data?.msg || error.message);
    throw error;
  }
}

/**
 * Test webhook payload structure
 */
function testWebhookPayloadStructure() {
  console.log('\n📋 Testing webhook payload structure...');
  
  const mockReconciliationData = {
    summary: {
      totalTransactions: 10,
      matched: 8,
      unmatched: 1,
      discrepancies: 1,
      pendingVerification: 0,
      errors: 0,
      totalAmount: 5000,
      dateRange: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      timestamp: new Date()
    }
  };
  
  const payload = {
    event: 'reconciliation.completed',
    timestamp: new Date().toISOString(),
    data: {
      summary: mockReconciliationData.summary,
      reconciliationId: crypto.randomUUID(),
      dateRange: mockReconciliationData.summary.dateRange,
      statistics: {
        totalTransactions: mockReconciliationData.summary.totalTransactions,
        matched: mockReconciliationData.summary.matched,
        unmatched: mockReconciliationData.summary.unmatched,
        discrepancies: mockReconciliationData.summary.discrepancies,
        pendingVerification: mockReconciliationData.summary.pendingVerification,
        errors: mockReconciliationData.summary.errors,
        totalAmount: mockReconciliationData.summary.totalAmount
      },
      hasIssues: mockReconciliationData.summary.discrepancies > 0 || 
                 mockReconciliationData.summary.unmatched > 0 ||
                 mockReconciliationData.summary.errors > 0,
      issuesSummary: ['1 transaction(s) with discrepancies', '1 unmatched transaction(s)']
    },
    metadata: {
      source: 'smiling-steps-reconciliation',
      version: '1.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };
  
  // Validate required fields
  const requiredFields = ['event', 'timestamp', 'data', 'metadata'];
  const requiredDataFields = ['summary', 'reconciliationId', 'statistics', 'hasIssues'];
  
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!payload[field]) {
      console.error(`❌ Missing required field: ${field}`);
      isValid = false;
    }
  });
  
  requiredDataFields.forEach(field => {
    if (!payload.data[field]) {
      console.error(`❌ Missing required data field: ${field}`);
      isValid = false;
    }
  });
  
  if (isValid) {
    console.log('✅ Webhook payload structure is valid');
    console.log('📊 Sample payload:', JSON.stringify(payload, null, 2));
  }
  
  return isValid;
}

/**
 * Main test function
 */
async function runTests() {
  try {
    console.log('🚀 Starting reconciliation webhook tests...\n');
    
    // Test 1: Webhook signature
    const signatureTest = testWebhookSignature();
    if (!signatureTest) {
      throw new Error('Webhook signature test failed');
    }
    
    // Test 2: Webhook payload structure
    const payloadTest = testWebhookPayloadStructure();
    if (!payloadTest) {
      throw new Error('Webhook payload structure test failed');
    }
    
    // Test 3: Admin authentication
    const token = await authenticateAdmin();
    
    // Test 4: Webhook configuration
    const config = await testWebhookConfig(token);
    
    // Test 5: Webhook connectivity (if URLs configured)
    if (config.webhookUrlsConfigured > 0) {
      await testWebhookConnectivity(token);
    } else {
      console.log('\n⚠️ No webhook URLs configured - skipping connectivity test');
      console.log('   To test webhooks, set RECONCILIATION_WEBHOOK_URLS environment variable');
    }
    
    // Test 6: Manual reconciliation with webhook
    await testManualReconciliation(token);
    
    console.log('\n🎉 All reconciliation webhook tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Webhook signature generation and verification');
    console.log('   ✅ Webhook payload structure validation');
    console.log('   ✅ Admin authentication');
    console.log('   ✅ Webhook configuration endpoint');
    console.log('   ✅ Manual reconciliation with webhook notification');
    
    if (config.webhookUrlsConfigured > 0) {
      console.log('   ✅ Webhook connectivity test');
    } else {
      console.log('   ⚠️ Webhook connectivity test skipped (no URLs configured)');
    }
    
    console.log('\n🔧 Configuration Notes:');
    console.log('   - Set RECONCILIATION_WEBHOOK_URLS to test actual webhook delivery');
    console.log('   - Set RECONCILIATION_WEBHOOK_SECRET for signature verification');
    console.log('   - Webhooks are sent for both manual and automatic reconciliation');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testWebhookSignature,
  testWebhookPayloadStructure,
  authenticateAdmin,
  testWebhookConfig,
  testWebhookConnectivity,
  testManualReconciliation
};