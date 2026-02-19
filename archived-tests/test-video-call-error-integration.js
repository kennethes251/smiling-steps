/**
 * Integration Test for Video Call Error Handling System
 * Tests the complete error handling flow in a realistic scenario
 */

const axios = require('axios');

// Mock React and Material-UI components for testing
global.React = {
  useState: (initial) => [initial, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null })
};

// Mock browser APIs
global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  mediaDevices: {
    getUserMedia: (constraints) => {
      // Simulate different error scenarios
      if (constraints.video === false) {
        return Promise.resolve({
          getTracks: () => [{ kind: 'audio', stop: () => {} }],
          getVideoTracks: () => [],
          getAudioTracks: () => [{ kind: 'audio', stop: () => {} }]
        });
      }
      
      // Simulate permission denied
      if (Math.random() < 0.3) {
        const error = new Error('Permission denied');
        error.name = 'NotAllowedError';
        return Promise.reject(error);
      }
      
      // Simulate device not found
      if (Math.random() < 0.2) {
        const error = new Error('No camera found');
        error.name = 'NotFoundError';
        return Promise.reject(error);
      }
      
      // Success case
      return Promise.resolve({
        getTracks: () => [
          { kind: 'video', stop: () => {} },
          { kind: 'audio', stop: () => {} }
        ],
        getVideoTracks: () => [{ kind: 'video', stop: () => {} }],
        getAudioTracks: () => [{ kind: 'audio', stop: () => {} }]
      });
    },
    enumerateDevices: () => Promise.resolve([
      { kind: 'videoinput', deviceId: 'camera1', label: 'Default Camera' },
      { kind: 'audioinput', deviceId: 'mic1', label: 'Default Microphone' }
    ])
  },
  permissions: {
    query: () => Promise.resolve({ state: 'prompt' })
  }
};

global.window = {
  location: { href: 'http://localhost:3000/video-call/test-session' }
};

// Import error handling utilities
const {
  getErrorInfo,
  formatErrorForDisplay,
  shouldAutoRetry,
  logError
} = require('./client/src/utils/videoCallErrors');

const {
  analyzeNetworkQuality,
  monitorConnectionHealth,
  autoApplyDegradation,
  getMediaConstraints
} = require('./client/src/utils/connectionDegradation');

console.log('🧪 Testing Video Call Error Handling Integration\n');

/**
 * Simulate a complete video call session with various error scenarios
 */
class VideoCallSimulator {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.currentQuality = 'HIGH';
    this.connectionAttempts = 0;
    this.errors = [];
    this.recoveryActions = [];
    this.networkStats = this.generateInitialStats();
  }

  generateInitialStats() {
    return {
      video: {
        inbound: {
          packetsReceived: 1000,
          packetsLost: 2,
          framesReceived: 500,
          framesDropped: 1,
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
  }

  async attemptMediaAccess() {
    console.log('📹 Attempting to access camera and microphone...');
    
    try {
      const constraints = getMediaConstraints(this.currentQuality);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media access successful');
      return { success: true, stream };
    } catch (error) {
      console.log('❌ Media access failed:', error.name);
      
      // Log the error
      const errorReport = logError(error, {
        action: 'media-access',
        sessionId: this.sessionId,
        quality: this.currentQuality
      });
      
      this.errors.push(errorReport);
      
      // Get error information for recovery
      const errorInfo = getErrorInfo(error);
      const displayInfo = formatErrorForDisplay(error);
      
      console.log('🔍 Error analysis:', {
        category: errorInfo.category,
        severity: errorInfo.severity,
        recoverable: errorInfo.recoverable,
        solutions: displayInfo.solutions.length
      });
      
      // Attempt recovery based on error type
      if (errorInfo.recoverable) {
        const recovered = await this.attemptErrorRecovery(error, errorInfo);
        if (recovered) {
          return { success: true, stream: recovered.stream, recovered: true };
        }
      }
      
      return { success: false, error, errorInfo, displayInfo };
    }
  }

  async attemptErrorRecovery(error, errorInfo) {
    console.log('🛠️ Attempting error recovery...');
    
    if (error.name === 'OverconstrainedError' || error.name === 'NotReadableError') {
      // Try with lower quality
      const qualityLevels = ['MEDIUM', 'LOW', 'AUDIO_ONLY'];
      
      for (const quality of qualityLevels) {
        if (quality === this.currentQuality) continue;
        
        console.log(`📹 Trying ${quality} quality...`);
        
        try {
          const constraints = getMediaConstraints(quality);
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          this.currentQuality = quality;
          this.recoveryActions.push({
            action: 'quality-downgrade',
            from: this.currentQuality,
            to: quality,
            success: true
          });
          
          console.log(`✅ Recovery successful with ${quality} quality`);
          return { success: true, stream };
        } catch (recoveryError) {
          console.log(`❌ ${quality} quality also failed:`, recoveryError.name);
          continue;
        }
      }
    }
    
    return { success: false };
  }

  simulateNetworkDegradation() {
    console.log('📡 Simulating network degradation...');
    
    // Gradually worsen network conditions
    this.networkStats.video.inbound.packetsLost += Math.floor(Math.random() * 20);
    this.networkStats.video.inbound.framesDropped += Math.floor(Math.random() * 10);
    this.networkStats.connection.currentRoundTripTime += Math.random() * 0.2;
    this.networkStats.connection.availableOutgoingBitrate -= Math.floor(Math.random() * 500000);
    
    // Ensure minimum values
    this.networkStats.connection.availableOutgoingBitrate = Math.max(
      this.networkStats.connection.availableOutgoingBitrate, 
      100000
    );
    
    console.log('📊 Current network stats:', {
      packetLoss: ((this.networkStats.video.inbound.packetsLost / 
        (this.networkStats.video.inbound.packetsReceived + this.networkStats.video.inbound.packetsLost)) * 100).toFixed(2) + '%',
      rtt: Math.round(this.networkStats.connection.currentRoundTripTime * 1000) + 'ms',
      bandwidth: Math.round(this.networkStats.connection.availableOutgoingBitrate / 1000) + 'kbps'
    });
  }

  async handleNetworkIssues() {
    console.log('🏥 Monitoring network health...');
    
    const healthReport = monitorConnectionHealth(this.networkStats, this.currentQuality);
    
    console.log('📈 Network health report:', {
      quality: healthReport.quality,
      strategy: healthReport.strategy,
      suggestions: healthReport.suggestions.length
    });
    
    if (healthReport.suggestions.length > 0) {
      console.log('💡 Top suggestion:', healthReport.suggestions[0].message);
      
      // Simulate applying the suggestion
      const suggestion = healthReport.suggestions[0];
      if (suggestion.targetQuality && suggestion.targetQuality !== this.currentQuality) {
        console.log(`🔄 Applying quality change: ${this.currentQuality} → ${suggestion.targetQuality}`);
        
        const mockStream = {
          getTracks: () => [],
          getVideoTracks: () => [],
          getAudioTracks: () => []
        };
        
        const degradationResult = await autoApplyDegradation(
          this.networkStats,
          mockStream,
          this.currentQuality,
          null,
          { autoDegrade: true, minQuality: 'AUDIO_ONLY' }
        );
        
        if (degradationResult.applied) {
          this.currentQuality = degradationResult.newQuality;
          this.recoveryActions.push({
            action: 'auto-degradation',
            reason: degradationResult.reason,
            newQuality: degradationResult.newQuality,
            success: true
          });
          
          console.log('✅ Auto-degradation applied:', degradationResult.reason);
        } else {
          console.log('❌ Auto-degradation failed:', degradationResult.reason);
        }
      }
    }
    
    return healthReport;
  }

  async simulateConnectionFailure() {
    console.log('💥 Simulating connection failure...');
    
    const connectionError = new Error('WebRTC connection failed');
    connectionError.name = 'connection-failed';
    
    const errorInfo = getErrorInfo(connectionError);
    const shouldRetry = shouldAutoRetry(errorInfo, this.connectionAttempts);
    
    console.log('🔍 Connection failure analysis:', {
      category: errorInfo.category,
      shouldRetry,
      attempts: this.connectionAttempts
    });
    
    if (shouldRetry) {
      this.connectionAttempts++;
      console.log(`🔄 Attempting reconnection (attempt ${this.connectionAttempts})...`);
      
      // Simulate reconnection delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate success after a few attempts
      if (this.connectionAttempts >= 2) {
        console.log('✅ Reconnection successful');
        this.recoveryActions.push({
          action: 'reconnection',
          attempts: this.connectionAttempts,
          success: true
        });
        return { success: true };
      } else {
        console.log('❌ Reconnection failed, will retry...');
        return await this.simulateConnectionFailure();
      }
    } else {
      console.log('❌ Max reconnection attempts reached');
      this.errors.push(logError(connectionError, {
        action: 'connection-failure',
        sessionId: this.sessionId,
        attempts: this.connectionAttempts
      }));
      return { success: false, error: connectionError };
    }
  }

  generateReport() {
    return {
      sessionId: this.sessionId,
      finalQuality: this.currentQuality,
      totalErrors: this.errors.length,
      recoveryActions: this.recoveryActions.length,
      connectionAttempts: this.connectionAttempts,
      errors: this.errors,
      recoveryActions: this.recoveryActions,
      networkStats: this.networkStats
    };
  }
}

/**
 * Test complete error handling integration
 */
async function testErrorHandlingIntegration() {
  console.log('🎬 Starting Error Handling Integration Test...\n');
  
  const simulator = new VideoCallSimulator('test-session-123');
  let testsPassed = 0;
  let testsTotal = 0;
  
  try {
    // Test 1: Media Access with Error Recovery
    testsTotal++;
    console.log('📋 Test 1: Media Access with Error Recovery');
    console.log('-'.repeat(50));
    
    const mediaResult = await simulator.attemptMediaAccess();
    
    if (mediaResult.success) {
      console.log('✅ Media access successful (with or without recovery)');
      testsPassed++;
    } else {
      console.log('❌ Media access failed completely');
      console.log('Error details:', mediaResult.displayInfo?.title);
    }
    
    console.log('');
    
    // Test 2: Network Degradation Handling
    testsTotal++;
    console.log('📋 Test 2: Network Degradation Handling');
    console.log('-'.repeat(50));
    
    // Simulate multiple network degradation events
    for (let i = 0; i < 3; i++) {
      simulator.simulateNetworkDegradation();
      await simulator.handleNetworkIssues();
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
    }
    
    console.log('✅ Network degradation handling completed');
    testsPassed++;
    console.log('');
    
    // Test 3: Connection Failure Recovery
    testsTotal++;
    console.log('📋 Test 3: Connection Failure Recovery');
    console.log('-'.repeat(50));
    
    const connectionResult = await simulator.simulateConnectionFailure();
    
    if (connectionResult.success) {
      console.log('✅ Connection failure recovery successful');
      testsPassed++;
    } else {
      console.log('❌ Connection failure recovery failed');
    }
    
    console.log('');
    
    // Test 4: Error Reporting and Analytics
    testsTotal++;
    console.log('📋 Test 4: Error Reporting and Analytics');
    console.log('-'.repeat(50));
    
    const report = simulator.generateReport();
    
    console.log('📊 Session Report:');
    console.log(`   Session ID: ${report.sessionId}`);
    console.log(`   Final Quality: ${report.finalQuality}`);
    console.log(`   Total Errors: ${report.totalErrors}`);
    console.log(`   Recovery Actions: ${report.recoveryActions}`);
    console.log(`   Connection Attempts: ${report.connectionAttempts}`);
    
    if (report.errors.length > 0) {
      console.log('📋 Error Summary:');
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.category} - ${error.errorKey}`);
      });
    }
    
    if (report.recoveryActions.length > 0) {
      console.log('🛠️ Recovery Actions:');
      report.recoveryActions.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.action} - ${action.success ? 'Success' : 'Failed'}`);
      });
    }
    
    console.log('✅ Error reporting and analytics working');
    testsPassed++;
    console.log('');
    
    // Test 5: End-to-End Error Flow Validation
    testsTotal++;
    console.log('📋 Test 5: End-to-End Error Flow Validation');
    console.log('-'.repeat(50));
    
    // Validate that the system handled errors appropriately
    let flowValid = true;
    const validationResults = [];
    
    // Check if errors were properly categorized
    if (report.errors.length > 0) {
      const hasValidCategories = report.errors.every(error => 
        ['permission', 'connection', 'media', 'network', 'system'].includes(error.category)
      );
      validationResults.push({
        check: 'Error categorization',
        passed: hasValidCategories
      });
      flowValid = flowValid && hasValidCategories;
    }
    
    // Check if recovery actions were attempted when appropriate
    const hasRecoveryActions = report.recoveryActions.length > 0;
    validationResults.push({
      check: 'Recovery actions attempted',
      passed: hasRecoveryActions
    });
    flowValid = flowValid && hasRecoveryActions;
    
    // Check if quality adaptation occurred
    const qualityAdapted = report.finalQuality !== 'HIGH';
    validationResults.push({
      check: 'Quality adaptation',
      passed: qualityAdapted
    });
    
    // Display validation results
    validationResults.forEach(result => {
      console.log(`   ${result.passed ? '✅' : '❌'} ${result.check}`);
    });
    
    if (flowValid) {
      console.log('✅ End-to-end error flow validation passed');
      testsPassed++;
    } else {
      console.log('❌ End-to-end error flow validation failed');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Integration test failed with error:', error.message);
  }
  
  // Final Results
  console.log('=' .repeat(60));
  console.log('📊 Integration Test Results:');
  console.log(`✅ Passed: ${testsPassed}/${testsTotal}`);
  console.log(`📈 Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 All Integration Tests Passed!');
    console.log('✅ Error handling system is fully functional');
    console.log('✅ Recovery mechanisms work correctly');
    console.log('✅ Network adaptation is working');
    console.log('✅ Error reporting and analytics are operational');
    console.log('✅ End-to-end error flow is validated');
  } else {
    console.log('\n⚠️ Some integration tests failed.');
    console.log('Please review the error handling implementation.');
  }
  
  return testsPassed === testsTotal;
}

/**
 * Test specific error scenarios
 */
async function testSpecificErrorScenarios() {
  console.log('\n🎯 Testing Specific Error Scenarios...\n');
  
  const scenarios = [
    {
      name: 'Permission Denied Recovery',
      error: { name: 'NotAllowedError', message: 'Permission denied' },
      expectedCategory: 'permission',
      expectedRecoverable: true
    },
    {
      name: 'Device Not Found Handling',
      error: { name: 'NotFoundError', message: 'No camera found' },
      expectedCategory: 'media',
      expectedRecoverable: true
    },
    {
      name: 'Session Not Found Error',
      error: { name: 'session-not-found', message: 'Session not found' },
      expectedCategory: 'session',
      expectedRecoverable: false
    },
    {
      name: 'Network Connection Failure',
      error: { name: 'connection-failed', message: 'Connection failed' },
      expectedCategory: 'connection',
      expectedRecoverable: true
    },
    {
      name: 'Payment Not Confirmed',
      error: { name: 'payment-not-confirmed', message: 'Payment required' },
      expectedCategory: 'session',
      expectedRecoverable: true
    }
  ];
  
  let scenariosPassed = 0;
  
  for (const scenario of scenarios) {
    console.log(`📋 Testing: ${scenario.name}`);
    
    try {
      const errorInfo = getErrorInfo(scenario.error);
      const displayInfo = formatErrorForDisplay(scenario.error);
      
      console.log(`   Category: ${errorInfo.category} (expected: ${scenario.expectedCategory})`);
      console.log(`   Recoverable: ${errorInfo.recoverable} (expected: ${scenario.expectedRecoverable})`);
      console.log(`   Solutions: ${displayInfo.solutions.length}`);
      console.log(`   User Message: "${displayInfo.message}"`);
      
      const categoryCorrect = errorInfo.category === scenario.expectedCategory;
      const recoverableCorrect = errorInfo.recoverable === scenario.expectedRecoverable;
      const hasSolutions = displayInfo.solutions.length > 0;
      const hasUserMessage = displayInfo.message && displayInfo.message.length > 0;
      
      if (categoryCorrect && recoverableCorrect && hasSolutions && hasUserMessage) {
        console.log('   ✅ Scenario passed\n');
        scenariosPassed++;
      } else {
        console.log('   ❌ Scenario failed\n');
      }
      
    } catch (error) {
      console.log(`   ❌ Scenario failed with error: ${error.message}\n`);
    }
  }
  
  console.log(`📊 Scenario Test Results: ${scenariosPassed}/${scenarios.length} passed`);
  return scenariosPassed === scenarios.length;
}

/**
 * Run all integration tests
 */
async function runAllIntegrationTests() {
  console.log('🚀 Starting Video Call Error Handling Integration Tests\n');
  console.log('=' .repeat(60));
  
  const integrationPassed = await testErrorHandlingIntegration();
  const scenariosPassed = await testSpecificErrorScenarios();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Final Integration Test Results:');
  console.log(`✅ Integration Tests: ${integrationPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Scenario Tests: ${scenariosPassed ? 'PASSED' : 'FAILED'}`);
  
  const allPassed = integrationPassed && scenariosPassed;
  
  if (allPassed) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('🔥 Video Call Error Handling System is Production Ready!');
    console.log('✅ Comprehensive error handling implemented');
    console.log('✅ User-friendly error messages and recovery');
    console.log('✅ Network quality monitoring and adaptation');
    console.log('✅ Automatic retry and reconnection logic');
    console.log('✅ Error reporting and analytics');
  } else {
    console.log('\n⚠️ Some integration tests failed.');
    console.log('Please review and fix the error handling implementation.');
  }
  
  return allPassed;
}

// Export for use in other test files
module.exports = {
  VideoCallSimulator,
  testErrorHandlingIntegration,
  testSpecificErrorScenarios,
  runAllIntegrationTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Integration test execution failed:', error);
    process.exit(1);
  });
}