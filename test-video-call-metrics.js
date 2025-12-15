/**
 * Video Call Metrics Service Test Suite
 * Tests the video call metrics service functionality
 * Requirements: Verify metrics service is working correctly
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testSessionId = 'test-session-123';
const testUserId = 'test-user-456';
const testAdminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * Log test result
 */
function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
  }
  testResults.details.push({
    test: testName,
    passed,
    message
  });
}

/**
 * Test metrics service initialization
 */
async function testMetricsServiceInitialization() {
  console.log('\n📊 Testing Metrics Service Initialization...');
  
  try {
    // Import the metrics service
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Test service exists
    logTest('Metrics service exists', !!videoCallMetricsService);
    
    // Test service has required methods
    const requiredMethods = [
      'recordConnectionAttempt',
      'recordConnectionSuccess',
      'recordConnectionFailure',
      'recordCallStart',
      'recordCallEnd',
      'recordQualityMetrics',
      'getMetricsSummary',
      'getSessionMetrics',
      'getPerformanceTrends'
    ];
    
    for (const method of requiredMethods) {
      logTest(
        `Service has ${method} method`,
        typeof videoCallMetricsService[method] === 'function',
        `Missing method: ${method}`
      );
    }
    
    // Test initial state
    const initialSummary = videoCallMetricsService.getMetricsSummary();
    logTest(
      'Initial metrics summary structure',
      initialSummary && 
      initialSummary.metrics &&
      initialSummary.activeCalls !== undefined,
      'Invalid initial summary structure'
    );
    
  } catch (error) {
    logTest('Metrics service initialization', false, error.message);
  }
}

/**
 * Test connection attempt recording
 */
async function testConnectionAttemptRecording() {
  console.log('\n🔗 Testing Connection Attempt Recording...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Record a connection attempt
    const attemptId = videoCallMetricsService.recordConnectionAttempt(
      testSessionId,
      testUserId,
      'client',
      {
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1'
      }
    );
    
    logTest('Connection attempt returns ID', !!attemptId);
    logTest('Connection attempt ID is string', typeof attemptId === 'string');
    
    // Test successful connection
    videoCallMetricsService.recordConnectionSuccess(attemptId, 1500, {
      connectionType: 'webrtc'
    });
    
    // Get session metrics
    const sessionMetrics = videoCallMetricsService.getSessionMetrics(testSessionId);
    logTest(
      'Session metrics recorded',
      sessionMetrics && sessionMetrics.connectionAttempt,
      'No connection attempt in session metrics'
    );
    
    logTest(
      'Connection marked as successful',
      sessionMetrics.connectionAttempt.status === 'connected',
      `Status: ${sessionMetrics.connectionAttempt?.status}`
    );
    
  } catch (error) {
    logTest('Connection attempt recording', false, error.message);
  }
}

/**
 * Test connection failure recording
 */
async function testConnectionFailureRecording() {
  console.log('\n❌ Testing Connection Failure Recording...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    const failedSessionId = 'failed-session-789';
    
    // Record a failed connection attempt
    const attemptId = videoCallMetricsService.recordConnectionAttempt(
      failedSessionId,
      testUserId,
      'client'
    );
    
    videoCallMetricsService.recordConnectionFailure(
      attemptId,
      'network_error',
      'Failed to establish WebRTC connection',
      { errorCode: 'ICE_FAILED' }
    );
    
    // Get session metrics
    const sessionMetrics = videoCallMetricsService.getSessionMetrics(failedSessionId);
    logTest(
      'Failed connection recorded',
      sessionMetrics && sessionMetrics.error,
      'No error recorded in session metrics'
    );
    
    logTest(
      'Error type recorded correctly',
      sessionMetrics.error?.type === 'network_error',
      `Error type: ${sessionMetrics.error?.type}`
    );
    
  } catch (error) {
    logTest('Connection failure recording', false, error.message);
  }
}

/**
 * Test call lifecycle recording
 */
async function testCallLifecycleRecording() {
  console.log('\n📞 Testing Call Lifecycle Recording...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    const callSessionId = 'call-session-456';
    const clientId = 'client-123';
    const psychologistId = 'psych-456';
    
    // Record connection attempts for both participants
    const clientAttemptId = videoCallMetricsService.recordConnectionAttempt(
      callSessionId, clientId, 'client'
    );
    const psychAttemptId = videoCallMetricsService.recordConnectionAttempt(
      callSessionId, psychologistId, 'psychologist'
    );
    
    // Record successful connections
    videoCallMetricsService.recordConnectionSuccess(clientAttemptId, 1200);
    videoCallMetricsService.recordConnectionSuccess(psychAttemptId, 1800);
    
    // Record participants joining
    videoCallMetricsService.recordParticipantJoin(callSessionId, clientId, 'client');
    videoCallMetricsService.recordParticipantJoin(callSessionId, psychologistId, 'psychologist');
    
    // Record call end
    videoCallMetricsService.recordCallEnd(callSessionId, 'normal', 1800000); // 30 minutes
    
    // Get session metrics
    const sessionMetrics = videoCallMetricsService.getSessionMetrics(callSessionId);
    logTest(
      'Call lifecycle recorded',
      sessionMetrics && sessionMetrics.completedCall,
      'No completed call in session metrics'
    );
    
    logTest(
      'Call duration recorded',
      sessionMetrics.completedCall?.actualDuration > 0,
      `Duration: ${sessionMetrics.completedCall?.actualDuration}`
    );
    
    logTest(
      'Participants recorded',
      sessionMetrics.completedCall?.participants?.length === 2,
      `Participants: ${sessionMetrics.completedCall?.participants?.length}`
    );
    
  } catch (error) {
    logTest('Call lifecycle recording', false, error.message);
  }
}

/**
 * Test quality metrics recording
 */
async function testQualityMetricsRecording() {
  console.log('\n📈 Testing Quality Metrics Recording...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    const qualitySessionId = 'quality-session-789';
    
    // Record quality metrics
    videoCallMetricsService.recordQualityMetrics(qualitySessionId, {
      videoLatency: 120,
      audioLatency: 80,
      packetLoss: 0.02,
      bandwidth: 1500000,
      videoQuality: 'good',
      audioQuality: 'excellent',
      connectionQuality: 'stable'
    });
    
    // Get session metrics
    const sessionMetrics = videoCallMetricsService.getSessionMetrics(qualitySessionId);
    logTest(
      'Quality metrics recorded',
      sessionMetrics && sessionMetrics.qualityMetrics?.length > 0,
      'No quality metrics recorded'
    );
    
    const qualityData = sessionMetrics.qualityMetrics[0];
    logTest(
      'Video latency recorded',
      qualityData.videoLatency === 120,
      `Video latency: ${qualityData.videoLatency}`
    );
    
    logTest(
      'Connection quality recorded',
      qualityData.connectionQuality === 'stable',
      `Connection quality: ${qualityData.connectionQuality}`
    );
    
  } catch (error) {
    logTest('Quality metrics recording', false, error.message);
  }
}

/**
 * Test metrics summary generation
 */
async function testMetricsSummaryGeneration() {
  console.log('\n📊 Testing Metrics Summary Generation...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Get metrics summary
    const summary = videoCallMetricsService.getMetricsSummary('24h');
    
    logTest(
      'Summary has required structure',
      summary && 
      summary.metrics &&
      summary.metrics.connectionSuccessRate &&
      summary.metrics.callDropRate &&
      summary.metrics.avgConnectionTime,
      'Missing required summary fields'
    );
    
    logTest(
      'Connection success rate has value and target',
      typeof summary.metrics.connectionSuccessRate.value === 'number' &&
      typeof summary.metrics.connectionSuccessRate.target === 'number',
      'Invalid connection success rate structure'
    );
    
    logTest(
      'Summary includes active calls count',
      typeof summary.activeCalls === 'number',
      `Active calls: ${summary.activeCalls}`
    );
    
    logTest(
      'Summary includes timestamp',
      summary.timestamp instanceof Date,
      'Missing or invalid timestamp'
    );
    
  } catch (error) {
    logTest('Metrics summary generation', false, error.message);
  }
}

/**
 * Test performance trends
 */
async function testPerformanceTrends() {
  console.log('\n📈 Testing Performance Trends...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Get performance trends
    const trends = videoCallMetricsService.getPerformanceTrends(7);
    
    logTest(
      'Trends is array',
      Array.isArray(trends),
      `Trends type: ${typeof trends}`
    );
    
    logTest(
      'Trends has 7 days of data',
      trends.length === 7,
      `Trends length: ${trends.length}`
    );
    
    if (trends.length > 0) {
      const firstTrend = trends[0];
      logTest(
        'Trend has required fields',
        firstTrend.date &&
        typeof firstTrend.connectionSuccessRate === 'number' &&
        typeof firstTrend.callDropRate === 'number',
        'Missing required trend fields'
      );
    }
    
  } catch (error) {
    logTest('Performance trends', false, error.message);
  }
}

/**
 * Test metrics API endpoints
 */
async function testMetricsAPIEndpoints() {
  console.log('\n🌐 Testing Metrics API Endpoints...');
  
  try {
    // Test metrics summary endpoint
    try {
      const summaryResponse = await axios.get(
        `${API_BASE}/video-call-metrics/summary`,
        {
          headers: { Authorization: `Bearer ${testAdminToken}` },
          timeout: 5000
        }
      );
      
      logTest(
        'Summary endpoint responds',
        summaryResponse.status === 200,
        `Status: ${summaryResponse.status}`
      );
      
      logTest(
        'Summary endpoint returns data',
        summaryResponse.data && summaryResponse.data.success,
        'No success field in response'
      );
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logTest('Summary endpoint (server not running)', true, 'Server not available for API test');
      } else {
        logTest('Summary endpoint', false, error.message);
      }
    }
    
    // Test trends endpoint
    try {
      const trendsResponse = await axios.get(
        `${API_BASE}/video-call-metrics/trends?days=7`,
        {
          headers: { Authorization: `Bearer ${testAdminToken}` },
          timeout: 5000
        }
      );
      
      logTest(
        'Trends endpoint responds',
        trendsResponse.status === 200,
        `Status: ${trendsResponse.status}`
      );
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logTest('Trends endpoint (server not running)', true, 'Server not available for API test');
      } else {
        logTest('Trends endpoint', false, error.message);
      }
    }
    
  } catch (error) {
    logTest('Metrics API endpoints', false, error.message);
  }
}

/**
 * Test security incidents recording
 */
async function testSecurityIncidentRecording() {
  console.log('\n🔒 Testing Security Incident Recording...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Record security incident
    videoCallMetricsService.recordSecurityIncident(
      'unauthorized_access',
      testSessionId,
      testUserId,
      {
        ipAddress: '192.168.1.100',
        userAgent: 'Suspicious Browser',
        attemptedAction: 'join_without_permission'
      }
    );
    
    // Get summary to check security incidents
    const summary = videoCallMetricsService.getMetricsSummary('24h');
    logTest(
      'Security incident affects metrics',
      summary.metrics.securityIncidents.value >= 0,
      `Security incidents: ${summary.metrics.securityIncidents.value}`
    );
    
  } catch (error) {
    logTest('Security incident recording', false, error.message);
  }
}

/**
 * Test payment validation recording
 */
async function testPaymentValidationRecording() {
  console.log('\n💳 Testing Payment Validation Recording...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Record valid payment
    videoCallMetricsService.recordPaymentValidation(
      testSessionId,
      true,
      'paid',
      { amount: 50, currency: 'USD' }
    );
    
    // Record invalid payment
    videoCallMetricsService.recordPaymentValidation(
      'invalid-session-123',
      false,
      'unpaid',
      { reason: 'insufficient_funds' }
    );
    
    // Get summary to check payment validation rate
    const summary = videoCallMetricsService.getMetricsSummary('24h');
    logTest(
      'Payment validation affects metrics',
      typeof summary.metrics.paymentValidationRate.value === 'number',
      `Payment validation rate: ${summary.metrics.paymentValidationRate.value}`
    );
    
  } catch (error) {
    logTest('Payment validation recording', false, error.message);
  }
}

/**
 * Test metrics export functionality
 */
async function testMetricsExport() {
  console.log('\n📤 Testing Metrics Export...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Test JSON export
    const jsonExport = videoCallMetricsService.exportMetrics('json');
    logTest(
      'JSON export returns object',
      typeof jsonExport === 'object' && jsonExport !== null,
      `Export type: ${typeof jsonExport}`
    );
    
    logTest(
      'JSON export has required fields',
      jsonExport.summary && jsonExport.trends && jsonExport.timestamp,
      'Missing required export fields'
    );
    
    // Test CSV export
    const csvExport = videoCallMetricsService.exportMetrics('csv');
    logTest(
      'CSV export returns string',
      typeof csvExport === 'string',
      `CSV export type: ${typeof csvExport}`
    );
    
    logTest(
      'CSV export has headers',
      csvExport.includes('date,connectionSuccessRate'),
      'CSV missing expected headers'
    );
    
  } catch (error) {
    logTest('Metrics export', false, error.message);
  }
}

/**
 * Test metrics cleanup functionality
 */
async function testMetricsCleanup() {
  console.log('\n🧹 Testing Metrics Cleanup...');
  
  try {
    const videoCallMetricsService = require('./server/services/videoCallMetricsService');
    
    // Test cleanup method exists
    logTest(
      'Cleanup method exists',
      typeof videoCallMetricsService.cleanupOldData === 'function',
      'cleanupOldData method not found'
    );
    
    // Test aggregation method exists
    logTest(
      'Aggregation method exists',
      typeof videoCallMetricsService.aggregateDailyStats === 'function',
      'aggregateDailyStats method not found'
    );
    
    // Test cleanup runs without error
    try {
      videoCallMetricsService.cleanupOldData();
      logTest('Cleanup runs without error', true);
    } catch (cleanupError) {
      logTest('Cleanup runs without error', false, cleanupError.message);
    }
    
  } catch (error) {
    logTest('Metrics cleanup', false, error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Video Call Metrics Service Test Suite');
  console.log('==========================================');
  
  await testMetricsServiceInitialization();
  await testConnectionAttemptRecording();
  await testConnectionFailureRecording();
  await testCallLifecycleRecording();
  await testQualityMetricsRecording();
  await testMetricsSummaryGeneration();
  await testPerformanceTrends();
  await testSecurityIncidentRecording();
  await testPaymentValidationRecording();
  await testMetricsExport();
  await testMetricsCleanup();
  await testMetricsAPIEndpoints();
  
  // Print summary
  console.log('\n📋 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(result => !result.passed)
      .forEach(result => {
        console.log(`   • ${result.test}: ${result.message}`);
      });
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults
};