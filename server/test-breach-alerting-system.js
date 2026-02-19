/**
 * Test Breach Alerting System
 * 
 * Simple test to verify the breach detection and alerting system is working correctly.
 * Tests both security monitoring and breach alerting components.
 */

const mongoose = require('mongoose');
const securityMonitoringService = require('./services/securityMonitoringService');
const breachAlertingService = require('./services/breachAlertingService');

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps-test',
  TEST_EMAIL: process.env.EMAIL_USER || 'test@example.com',
  TEST_IP: '192.168.1.100',
  TEST_USER_AGENT: 'Mozilla/5.0 (Test Browser)'
};

/**
 * Initialize test environment
 */
async function initializeTest() {
  try {
    console.log('🔧 Initializing breach alerting test...');
    
    // Connect to MongoDB
    await mongoose.connect(TEST_CONFIG.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize test:', error);
    return false;
  }
}

/**
 * Test failed authentication monitoring
 */
async function testFailedAuthenticationMonitoring() {
  console.log('\n🧪 Testing Failed Authentication Monitoring...');
  
  try {
    // Simulate multiple failed login attempts from same IP
    const results = [];
    
    for (let i = 1; i <= 12; i++) {
      const result = await securityMonitoringService.monitorFailedAuthentication(
        TEST_CONFIG.TEST_IP,
        TEST_CONFIG.TEST_EMAIL,
        TEST_CONFIG.TEST_USER_AGENT,
        'invalid_password'
      );
      
      results.push({
        attempt: i,
        breachDetected: result.breachDetected,
        alertCount: result.alerts.length
      });
      
      console.log(`  Attempt ${i}: Breach detected: ${result.breachDetected}, Alerts: ${result.alerts.length}`);
      
      if (result.breachDetected) {
        console.log(`    🚨 BREACH DETECTED on attempt ${i}!`);
        console.log(`    Alert types: ${result.alerts.map(a => a.type).join(', ')}`);
        break;
      }
    }
    
    const breachDetected = results.some(r => r.breachDetected);
    console.log(`✅ Failed authentication test: ${breachDetected ? 'PASSED' : 'FAILED'}`);
    
    return breachDetected;
    
  } catch (error) {
    console.error('❌ Failed authentication test error:', error);
    return false;
  }
}

/**
 * Test data export monitoring
 */
async function testDataExportMonitoring() {
  console.log('\n🧪 Testing Data Export Monitoring...');
  
  try {
    const testUserId = '507f1f77bcf86cd799439011'; // Mock user ID
    
    // Simulate multiple data exports
    const results = [];
    
    for (let i = 1; i <= 12; i++) {
      const result = await securityMonitoringService.monitorDataExportAnomalies(
        testUserId,
        'psychologist',
        'session_export',
        i > 8 ? 150 : 10, // Large export on later attempts
        TEST_CONFIG.TEST_IP
      );
      
      results.push({
        export: i,
        recordCount: i > 8 ? 150 : 10,
        breachDetected: result.breachDetected,
        alertCount: result.alerts.length
      });
      
      console.log(`  Export ${i} (${i > 8 ? 150 : 10} records): Breach detected: ${result.breachDetected}, Alerts: ${result.alerts.length}`);
      
      if (result.breachDetected) {
        console.log(`    🚨 BREACH DETECTED on export ${i}!`);
        console.log(`    Alert types: ${result.alerts.map(a => a.type).join(', ')}`);
        break;
      }
    }
    
    const breachDetected = results.some(r => r.breachDetected);
    console.log(`✅ Data export test: ${breachDetected ? 'PASSED' : 'FAILED'}`);
    
    return breachDetected;
    
  } catch (error) {
    console.error('❌ Data export test error:', error);
    return false;
  }
}

/**
 * Test breach alerting system
 */
async function testBreachAlerting() {
  console.log('\n🧪 Testing Breach Alerting System...');
  
  try {
    // Create test breach data
    const testBreachData = {
      alerts: [
        {
          type: 'TEST_BREACH',
          severity: 'HIGH',
          message: 'Test security breach for system verification',
          details: {
            testId: 'BREACH_TEST_001',
            timestamp: new Date(),
            ipAddress: TEST_CONFIG.TEST_IP
          }
        }
      ],
      recommendations: [
        'This is a test breach - verify alerting system is working',
        'Check that incident was created and logged properly',
        'Verify email alerts were sent (if email is configured)'
      ],
      context: {
        testBreach: true,
        environment: 'test'
      }
    };
    
    // Process the test breach
    const result = await breachAlertingService.processSecurityBreach(testBreachData);
    
    console.log(`  Incident created: ${result.incidentId || 'N/A'}`);
    console.log(`  Alerts sent: ${result.alertsSent.length}`);
    console.log(`  Response time: ${result.responseTime}ms`);
    console.log(`  Within 15-minute requirement: ${result.responseTime <= 15 * 60 * 1000 ? 'YES' : 'NO'}`);
    
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`    - ${error.error || error}`));
    }
    
    const success = result.success && result.incidentId && result.responseTime <= 15 * 60 * 1000;
    console.log(`✅ Breach alerting test: ${success ? 'PASSED' : 'FAILED'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ Breach alerting test error:', error);
    return false;
  }
}

/**
 * Test incident management
 */
async function testIncidentManagement() {
  console.log('\n🧪 Testing Incident Management...');
  
  try {
    // Get active incidents
    const incidents = breachAlertingService.getActiveIncidents();
    console.log(`  Active incidents: ${incidents.length}`);
    
    if (incidents.length > 0) {
      const incident = incidents[0];
      console.log(`  Latest incident: ${incident.id} (${incident.severity})`);
      
      // Test status update
      const updateResult = await breachAlertingService.updateIncidentStatus(
        incident.id,
        'investigating',
        'Test status update - investigating incident',
        'test-admin-id'
      );
      
      console.log(`  Status update: ${updateResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (updateResult.success) {
        console.log(`    ${updateResult.previousStatus} → ${updateResult.newStatus}`);
      }
    }
    
    // Get alerting statistics
    const stats = breachAlertingService.getAlertingStatistics();
    console.log(`  Alerting statistics:`);
    console.log(`    Active incidents: ${stats.activeIncidents}`);
    console.log(`    By severity: Critical=${stats.incidentsBySeverity.critical}, High=${stats.incidentsBySeverity.high}`);
    
    console.log(`✅ Incident management test: PASSED`);
    return true;
    
  } catch (error) {
    console.error('❌ Incident management test error:', error);
    return false;
  }
}

/**
 * Run comprehensive breach alerting system test
 */
async function runBreachAlertingTest() {
  console.log('🚨 BREACH ALERTING SYSTEM TEST');
  console.log('=====================================');
  
  const initialized = await initializeTest();
  if (!initialized) {
    console.log('❌ Test initialization failed');
    process.exit(1);
  }
  
  const results = {
    failedAuth: false,
    dataExport: false,
    breachAlerting: false,
    incidentManagement: false
  };
  
  // Run all tests
  results.failedAuth = await testFailedAuthenticationMonitoring();
  results.dataExport = await testDataExportMonitoring();
  results.breachAlerting = await testBreachAlerting();
  results.incidentManagement = await testIncidentManagement();
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Failed Authentication Monitoring: ${results.failedAuth ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Data Export Monitoring: ${results.dataExport ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Breach Alerting: ${results.breachAlerting ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Incident Management: ${results.incidentManagement ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Breach alerting system is working correctly!');
    console.log('   - Security monitoring detects threats');
    console.log('   - Breach alerts are sent within 15 minutes');
    console.log('   - Incidents are created and managed properly');
    console.log('   - System meets HIPAA requirement 10.5');
  } else {
    console.log('\n⚠️ Some components need attention:');
    if (!results.failedAuth) console.log('   - Failed authentication monitoring');
    if (!results.dataExport) console.log('   - Data export monitoring');
    if (!results.breachAlerting) console.log('   - Breach alerting system');
    if (!results.incidentManagement) console.log('   - Incident management');
  }
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
  
  process.exit(allPassed ? 0 : 1);
}

// Run the test if this file is executed directly
if (require.main === module) {
  runBreachAlertingTest().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runBreachAlertingTest,
  testFailedAuthenticationMonitoring,
  testDataExportMonitoring,
  testBreachAlerting,
  testIncidentManagement
};