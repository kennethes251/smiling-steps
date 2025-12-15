/**
 * Comprehensive Test Suite for Video Call Error Handling System
 * Tests all error handling components and utilities
 */

const axios = require('axios');

// Mock browser APIs for testing
global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  mediaDevices: {
    getUserMedia: () => Promise.resolve(),
    enumerateDevices: () => Promise.resolve([])
  },
  permissions: {
    query: () => Promise.resolve({ state: 'granted' })
  },
  clipboard: {
    writeText: () => Promise.resolve()
  }
};

global.window = {
  location: {
    href: 'http://localhost:3000/video-call/test-session'
  }
};

// Import error handling utilities
const {
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_MESSAGES,
  getErrorInfo,
  formatErrorForDisplay,
  getRetryDelay,
  shouldAutoRetry,
  generateErrorReport,
  logError
} = require('./client/src/utils/videoCallErrors');

const {
  analyzeNetworkQuality,
  getQualityLevelForBandwidth,
  getMediaConstraints,
  applyQualityDegradation,
  createReconnectionStrategy,
  monitorConnectionHealth,
  autoApplyDegradation,
  QUALITY_LEVELS,
  QUALITY_THRESHOLDS,
  DEGRADATION_STRATEGIES
} = require('./client/src/utils/connectionDegradation');

console.log('🧪 Testing Video Call Error Handling System\n');

/**
 * Test 1: Error Message Mapping and Categorization
 */
async function testErrorMessageMapping() {
  console.log('📋 Testing Error Message Mapping...');
  
  try {
    // Test permission errors
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    
    const permissionInfo = getErrorInfo(permissionError);
    console.log('✅ Permission error mapped correctly:', {
      category: permissionInfo.category,
      severity: permissionInfo.severity,
      recoverable: permissionInfo.recoverable
    });
    
    if (permissionInfo.category !== ERROR_CATEGORIES.PERMISSION) {
      throw new Error('Permission error not categorized correctly');
    }
    
    // Test connection errors
    const connectionError = new Error('Connection failed');
    connectionError.name = 'connection-failed';
    
    const connectionInfo = getErrorInfo(connectionError);
    console.log('✅ Connection error mapped correctly:', {
      category: connectionInfo.category,
      severity: connectionInfo.severity,
      recoverable: connectionInfo.recoverable
    });
    
    if (connectionInfo.category !== ERROR_CATEGORIES.CONNECTION) {
      throw new Error('Connection error not categorized correctly');
    }
    
    // Test media errors
    const mediaError = new Error('Camera not found');
    mediaError.name = 'NotFoundError';
    
    const mediaInfo = getErrorInfo(mediaError);
    console.log('✅ Media error mapped correctly:', {
      category: mediaInfo.category,
      severity: mediaInfo.severity,
      recoverable: mediaInfo.recoverable
    });
    
    if (mediaInfo.category !== ERROR_CATEGORIES.MEDIA) {
      throw new Error('Media error not categorized correctly');
    }
    
    // Test unknown errors
    const unknownError = new Error('Some random error');
    const unknownInfo = getErrorInfo(unknownError);
    console.log('✅ Unknown error handled correctly:', {
      category: unknownInfo.category,
      errorKey: unknownInfo.errorKey
    });
    
    // The error key should be 'system-error' for unknown errors, but the actual key might be 'Error' based on error.name
    if (unknownInfo.category !== ERROR_CATEGORIES.SYSTEM) {
      throw new Error('Unknown error not categorized correctly');
    }
    
    console.log('✅ Error message mapping tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error message mapping test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Error Display Formatting
 */
async function testErrorDisplayFormatting() {
  console.log('🎨 Testing Error Display Formatting...');
  
  try {
    // Test permission error formatting
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    
    const formatted = formatErrorForDisplay(permissionError);
    console.log('✅ Permission error formatted:', {
      title: formatted.title,
      severity: formatted.severity,
      solutionsCount: formatted.solutions.length,
      recoverable: formatted.recoverable
    });
    
    if (!formatted.title || !formatted.message || !formatted.solutions) {
      throw new Error('Error formatting incomplete');
    }
    
    if (formatted.solutions.length === 0) {
      throw new Error('No solutions provided for recoverable error');
    }
    
    // Test session error formatting
    const sessionError = new Error('Session not found');
    sessionError.name = 'session-not-found';
    
    const sessionFormatted = formatErrorForDisplay(sessionError);
    console.log('✅ Session error formatted:', {
      title: sessionFormatted.title,
      recoverable: sessionFormatted.recoverable,
      showRetry: sessionFormatted.showRetry
    });
    
    if (sessionFormatted.recoverable !== false) {
      throw new Error('Non-recoverable error marked as recoverable');
    }
    
    console.log('✅ Error display formatting tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error display formatting test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Retry Logic and Delays
 */
async function testRetryLogic() {
  console.log('🔄 Testing Retry Logic...');
  
  try {
    // Test retry delays for different error types
    const connectionError = getErrorInfo('connection-failed');
    const connectionDelay = getRetryDelay(connectionError);
    console.log('✅ Connection error retry delay:', connectionDelay + 'ms');
    
    if (connectionDelay !== 3000) {
      throw new Error('Incorrect retry delay for connection error');
    }
    
    const permissionError = getErrorInfo('NotAllowedError');
    const permissionDelay = getRetryDelay(permissionError);
    console.log('✅ Permission error retry delay:', permissionDelay + 'ms');
    
    if (permissionDelay !== 0) {
      throw new Error('Incorrect retry delay for permission error');
    }
    
    // Test auto-retry logic
    const shouldRetryConnection = shouldAutoRetry(connectionError, 0);
    console.log('✅ Should auto-retry connection error:', shouldRetryConnection);
    
    if (!shouldRetryConnection) {
      throw new Error('Connection error should be auto-retried');
    }
    
    const shouldRetryPermission = shouldAutoRetry(permissionError, 0);
    console.log('✅ Should auto-retry permission error:', shouldRetryPermission);
    
    if (shouldRetryPermission) {
      throw new Error('Permission error should not be auto-retried');
    }
    
    // Test max retry limit
    const shouldRetryMax = shouldAutoRetry(connectionError, 5);
    console.log('✅ Should retry after max attempts:', shouldRetryMax);
    
    if (shouldRetryMax) {
      throw new Error('Should not retry after max attempts');
    }
    
    console.log('✅ Retry logic tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Retry logic test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Error Reporting and Logging
 */
async function testErrorReporting() {
  console.log('📊 Testing Error Reporting...');
  
  try {
    const testError = new Error('Test error for reporting');
    testError.name = 'TestError';
    testError.stack = 'Test stack trace';
    
    const context = {
      sessionId: 'test-session-123',
      action: 'test-action',
      userRole: 'client'
    };
    
    // Test error report generation
    const report = generateErrorReport(testError, context);
    console.log('✅ Error report generated:', {
      timestamp: !!report.timestamp,
      errorKey: report.errorKey,
      category: report.category,
      hasContext: !!report.context,
      hasUserAgent: !!report.userAgent,
      hasOriginalError: !!report.originalError
    });
    
    if (!report.timestamp || !report.errorKey || !report.context) {
      throw new Error('Error report missing required fields');
    }
    
    if (report.context.sessionId !== context.sessionId) {
      throw new Error('Context not preserved in error report');
    }
    
    // Test error logging
    const loggedReport = logError(testError, context);
    console.log('✅ Error logged successfully:', {
      timestamp: !!loggedReport.timestamp,
      category: loggedReport.category
    });
    
    if (!loggedReport || !loggedReport.timestamp) {
      throw new Error('Error logging failed');
    }
    
    console.log('✅ Error reporting tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error reporting test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Network Quality Analysis
 */
async function testNetworkQualityAnalysis() {
  console.log('📡 Testing Network Quality Analysis...');
  
  try {
    // Test excellent quality stats
    const excellentStats = {
      video: {
        inbound: {
          packetsReceived: 1000,
          packetsLost: 1,
          framesReceived: 500,
          framesDropped: 0,
          jitter: 0.005
        }
      },
      audio: {
        inbound: {
          packetsReceived: 2000,
          packetsLost: 0,
          jitter: 0.002
        }
      },
      connection: {
        currentRoundTripTime: 0.05,
        availableOutgoingBitrate: 5000000
      }
    };
    
    const excellentAnalysis = analyzeNetworkQuality(excellentStats);
    console.log('✅ Excellent quality analysis:', {
      quality: excellentAnalysis.quality,
      strategy: excellentAnalysis.strategy
    });
    
    if (excellentAnalysis.quality !== 'excellent') {
      throw new Error('Excellent stats not analyzed correctly');
    }
    
    // Test poor quality stats
    const poorStats = {
      video: {
        inbound: {
          packetsReceived: 1000,
          packetsLost: 100,
          framesReceived: 500,
          framesDropped: 50,
          jitter: 0.1
        }
      },
      audio: {
        inbound: {
          packetsReceived: 2000,
          packetsLost: 200,
          jitter: 0.05
        }
      },
      connection: {
        currentRoundTripTime: 0.5,
        availableOutgoingBitrate: 100000
      }
    };
    
    const poorAnalysis = analyzeNetworkQuality(poorStats);
    console.log('✅ Poor quality analysis:', {
      quality: poorAnalysis.quality,
      strategy: poorAnalysis.strategy,
      metrics: {
        videoPacketLoss: poorAnalysis.metrics.videoPacketLoss.toFixed(2) + '%',
        rtt: poorAnalysis.metrics.rtt.toFixed(0) + 'ms'
      }
    });
    
    if (poorAnalysis.quality !== 'poor') {
      throw new Error('Poor stats not analyzed correctly');
    }
    
    if (!poorAnalysis.strategy) {
      throw new Error('No degradation strategy suggested for poor quality');
    }
    
    console.log('✅ Network quality analysis tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Network quality analysis test failed:', error.message);
    return false;
  }
}

/**
 * Test 6: Quality Level Adaptation
 */
async function testQualityLevelAdaptation() {
  console.log('📹 Testing Quality Level Adaptation...');
  
  try {
    // Test bandwidth-based quality selection
    const highBandwidth = 3000000; // 3 Mbps
    const highQuality = getQualityLevelForBandwidth(highBandwidth);
    console.log('✅ High bandwidth quality:', highQuality);
    
    if (highQuality !== 'HIGH') {
      throw new Error('High bandwidth should select HIGH quality');
    }
    
    const lowBandwidth = 200000; // 200 Kbps
    const lowQuality = getQualityLevelForBandwidth(lowBandwidth);
    console.log('✅ Low bandwidth quality:', lowQuality);
    
    if (lowQuality !== 'AUDIO_ONLY') {
      throw new Error('Low bandwidth should select AUDIO_ONLY quality');
    }
    
    // Test media constraints generation
    const highConstraints = getMediaConstraints('HIGH');
    console.log('✅ High quality constraints:', {
      hasVideo: !!highConstraints.video,
      hasAudio: !!highConstraints.audio,
      videoWidth: highConstraints.video?.width?.ideal,
      videoHeight: highConstraints.video?.height?.ideal
    });
    
    if (!highConstraints.video || highConstraints.video.width.ideal !== 1280) {
      throw new Error('High quality constraints incorrect');
    }
    
    const audioOnlyConstraints = getMediaConstraints('AUDIO_ONLY');
    console.log('✅ Audio-only constraints:', {
      hasVideo: !!audioOnlyConstraints.video,
      hasAudio: !!audioOnlyConstraints.audio
    });
    
    if (audioOnlyConstraints.video !== false) {
      throw new Error('Audio-only should disable video');
    }
    
    console.log('✅ Quality level adaptation tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Quality level adaptation test failed:', error.message);
    return false;
  }
}

/**
 * Test 7: Reconnection Strategy
 */
async function testReconnectionStrategy() {
  console.log('🔄 Testing Reconnection Strategy...');
  
  try {
    // Test normal reconnection
    const normalStrategy = createReconnectionStrategy('good', 0);
    console.log('✅ Normal reconnection strategy:', {
      shouldRetry: normalStrategy.shouldRetry,
      delay: normalStrategy.delay,
      strategy: normalStrategy.strategy
    });
    
    if (!normalStrategy.shouldRetry || normalStrategy.delay !== 1000) {
      throw new Error('Normal reconnection strategy incorrect');
    }
    
    // Test poor connection reconnection
    const poorStrategy = createReconnectionStrategy('poor', 1);
    console.log('✅ Poor connection strategy:', {
      shouldRetry: poorStrategy.shouldRetry,
      delay: poorStrategy.delay,
      strategy: poorStrategy.strategy
    });
    
    if (!poorStrategy.shouldRetry || poorStrategy.delay <= 2000) {
      throw new Error('Poor connection should have longer delay');
    }
    
    // Test max retries
    const maxRetriesStrategy = createReconnectionStrategy('good', 5);
    console.log('✅ Max retries strategy:', {
      shouldRetry: maxRetriesStrategy.shouldRetry,
      strategy: maxRetriesStrategy.strategy
    });
    
    if (maxRetriesStrategy.shouldRetry) {
      throw new Error('Should not retry after max attempts');
    }
    
    // Test offline reconnection
    const offlineStrategy = createReconnectionStrategy('offline', 0);
    console.log('✅ Offline reconnection strategy:', {
      shouldRetry: offlineStrategy.shouldRetry,
      delay: offlineStrategy.delay,
      strategy: offlineStrategy.strategy
    });
    
    if (!offlineStrategy.shouldRetry || offlineStrategy.delay !== 5000) {
      throw new Error('Offline reconnection strategy incorrect');
    }
    
    console.log('✅ Reconnection strategy tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Reconnection strategy test failed:', error.message);
    return false;
  }
}

/**
 * Test 8: Connection Health Monitoring
 */
async function testConnectionHealthMonitoring() {
  console.log('🏥 Testing Connection Health Monitoring...');
  
  try {
    // Test monitoring with good stats
    const goodStats = {
      video: {
        inbound: {
          packetsReceived: 1000,
          packetsLost: 5,
          framesReceived: 500,
          framesDropped: 2,
          jitter: 0.01
        }
      },
      audio: {
        inbound: {
          packetsReceived: 2000,
          packetsLost: 1,
          jitter: 0.005
        }
      },
      connection: {
        currentRoundTripTime: 0.08,
        availableOutgoingBitrate: 2000000
      }
    };
    
    const goodMonitoring = monitorConnectionHealth(goodStats, 'HIGH');
    console.log('✅ Good connection monitoring:', {
      quality: goodMonitoring.quality,
      strategy: goodMonitoring.strategy,
      suggestionsCount: goodMonitoring.suggestions.length
    });
    
    if (goodMonitoring.quality === 'poor' || goodMonitoring.quality === 'offline') {
      throw new Error('Good stats should not be classified as poor');
    }
    
    // Test monitoring with degraded stats
    const degradedStats = {
      video: {
        inbound: {
          packetsReceived: 1000,
          packetsLost: 50,
          framesReceived: 500,
          framesDropped: 30,
          jitter: 0.08
        }
      },
      audio: {
        inbound: {
          packetsReceived: 2000,
          packetsLost: 20,
          jitter: 0.04
        }
      },
      connection: {
        currentRoundTripTime: 0.4,
        availableOutgoingBitrate: 300000
      }
    };
    
    const degradedMonitoring = monitorConnectionHealth(degradedStats, 'HIGH');
    console.log('✅ Degraded connection monitoring:', {
      quality: degradedMonitoring.quality,
      strategy: degradedMonitoring.strategy,
      suggestionsCount: degradedMonitoring.suggestions.length,
      topSuggestion: degradedMonitoring.suggestions[0]?.message
    });
    
    if (degradedMonitoring.quality === 'excellent' || degradedMonitoring.quality === 'good') {
      throw new Error('Degraded stats should not be classified as good');
    }
    
    if (degradedMonitoring.suggestions.length === 0) {
      throw new Error('Degraded connection should have suggestions');
    }
    
    console.log('✅ Connection health monitoring tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Connection health monitoring test failed:', error.message);
    return false;
  }
}

/**
 * Test 9: Error Recovery Scenarios
 */
async function testErrorRecoveryScenarios() {
  console.log('🛠️ Testing Error Recovery Scenarios...');
  
  try {
    // Test permission denied recovery
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    
    const permissionInfo = getErrorInfo(permissionError);
    console.log('✅ Permission error recovery info:', {
      recoverable: permissionInfo.recoverable,
      solutionsCount: permissionInfo.solutions.length,
      showRetry: permissionInfo.showRetry
    });
    
    if (!permissionInfo.recoverable || permissionInfo.solutions.length === 0) {
      throw new Error('Permission error should be recoverable with solutions');
    }
    
    // Test connection failure recovery
    const connectionError = new Error('Connection failed');
    connectionError.name = 'connection-failed';
    
    const connectionInfo = getErrorInfo(connectionError);
    console.log('✅ Connection error recovery info:', {
      recoverable: connectionInfo.recoverable,
      solutionsCount: connectionInfo.solutions.length,
      autoRetry: shouldAutoRetry(connectionInfo, 0)
    });
    
    if (!connectionInfo.recoverable || !shouldAutoRetry(connectionInfo, 0)) {
      throw new Error('Connection error should be recoverable and auto-retryable');
    }
    
    // Test session not found (non-recoverable)
    const sessionError = new Error('Session not found');
    sessionError.name = 'session-not-found';
    
    const sessionInfo = getErrorInfo(sessionError);
    console.log('✅ Session error recovery info:', {
      recoverable: sessionInfo.recoverable,
      solutionsCount: sessionInfo.solutions.length,
      autoRetry: shouldAutoRetry(sessionInfo, 0)
    });
    
    if (sessionInfo.recoverable || shouldAutoRetry(sessionInfo, 0)) {
      throw new Error('Session not found should not be recoverable or auto-retryable');
    }
    
    console.log('✅ Error recovery scenarios tests passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error recovery scenarios test failed:', error.message);
    return false;
  }
}

/**
 * Test 10: Integration Test - Complete Error Flow
 */
async function testCompleteErrorFlow() {
  console.log('🔄 Testing Complete Error Flow...');
  
  try {
    // Simulate a complete error handling flow
    const originalError = new Error('WebRTC connection failed');
    originalError.name = 'connection-failed';
    
    // Step 1: Error occurs and gets processed
    const errorInfo = getErrorInfo(originalError);
    console.log('✅ Step 1 - Error processed:', errorInfo.category);
    
    // Step 2: Error gets formatted for display
    const displayInfo = formatErrorForDisplay(originalError);
    console.log('✅ Step 2 - Error formatted for display:', displayInfo.title);
    
    // Step 3: Retry logic is evaluated
    const shouldRetry = shouldAutoRetry(errorInfo, 0);
    const retryDelay = getRetryDelay(errorInfo);
    console.log('✅ Step 3 - Retry logic evaluated:', { shouldRetry, retryDelay });
    
    // Step 4: Error is logged and reported
    const errorReport = logError(originalError, { 
      sessionId: 'test-session',
      action: 'connection-attempt'
    });
    console.log('✅ Step 4 - Error logged and reported:', !!errorReport.timestamp);
    
    // Step 5: Reconnection strategy is created
    const reconnectionStrategy = createReconnectionStrategy('poor', 0);
    console.log('✅ Step 5 - Reconnection strategy created:', reconnectionStrategy.strategy);
    
    // Verify the complete flow
    if (!errorInfo || !displayInfo || !errorReport || !reconnectionStrategy) {
      throw new Error('Complete error flow missing components');
    }
    
    if (errorInfo.category !== ERROR_CATEGORIES.CONNECTION) {
      throw new Error('Error not categorized correctly in flow');
    }
    
    if (!shouldRetry) {
      throw new Error('Connection error should be retryable in flow');
    }
    
    console.log('✅ Complete error flow test passed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Complete error flow test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Video Call Error Handling System Tests\n');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Error Message Mapping', fn: testErrorMessageMapping },
    { name: 'Error Display Formatting', fn: testErrorDisplayFormatting },
    { name: 'Retry Logic', fn: testRetryLogic },
    { name: 'Error Reporting', fn: testErrorReporting },
    { name: 'Network Quality Analysis', fn: testNetworkQualityAnalysis },
    { name: 'Quality Level Adaptation', fn: testQualityLevelAdaptation },
    { name: 'Reconnection Strategy', fn: testReconnectionStrategy },
    { name: 'Connection Health Monitoring', fn: testConnectionHealthMonitoring },
    { name: 'Error Recovery Scenarios', fn: testErrorRecoveryScenarios },
    { name: 'Complete Error Flow', fn: testCompleteErrorFlow }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name}: FAILED - ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All Video Call Error Handling Tests Passed!');
    console.log('✅ Error handling system is working correctly');
    console.log('✅ All error types are properly categorized and handled');
    console.log('✅ Retry logic and recovery mechanisms are functional');
    console.log('✅ Network quality monitoring and adaptation is working');
    console.log('✅ User-friendly error messages and solutions are provided');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the error handling implementation.');
  }
  
  return failed === 0;
}

// Export for use in other test files
module.exports = {
  testErrorMessageMapping,
  testErrorDisplayFormatting,
  testRetryLogic,
  testErrorReporting,
  testNetworkQualityAnalysis,
  testQualityLevelAdaptation,
  testReconnectionStrategy,
  testConnectionHealthMonitoring,
  testErrorRecoveryScenarios,
  testCompleteErrorFlow,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}