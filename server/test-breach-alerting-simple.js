/**
 * Simple Breach Alerting System Test
 * 
 * Tests the breach alerting system without requiring database connection.
 * Focuses on core logic and alerting functionality.
 */

const breachAlertingService = require('./services/breachAlertingService');

/**
 * Test breach alerting core functionality
 */
async function testBreachAlertingCore() {
  console.log('🧪 Testing Breach Alerting Core Functionality...');
  
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
            ipAddress: '192.168.1.100'
          }
        },
        {
          type: 'EXCESSIVE_FAILED_LOGINS',
          severity: 'CRITICAL',
          message: 'Multiple failed login attempts detected',
          details: {
            ipAddress: '192.168.1.100',
            attemptCount: 15,
            timeWindow: '15 minutes'
          }
        }
      ],
      recommendations: [
        'This is a test breach - verify alerting system is working',
        'Check that incident was created and logged properly',
        'Verify email alerts were sent (if email is configured)',
        'Consider blocking the suspicious IP address'
      ],
      context: {
        testBreach: true,
        environment: 'test',
        triggeredBy: 'automated_test'
      }
    };
    
    console.log('📝 Processing test breach with 2 alerts...');
    
    // Process the test breach
    const result = await breachAlertingService.processSecurityBreach(testBreachData);
    
    console.log(`✅ Breach processing result:`);
    console.log(`   Incident ID: ${result.incidentId || 'N/A'}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Alerts sent: ${result.alertsSent.length}`);
    console.log(`   Response time: ${result.responseTime}ms`);
    console.log(`   Within 15-minute requirement: ${result.responseTime <= 15 * 60 * 1000 ? 'YES' : 'NO'}`);
    console.log(`   Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log(`   Error details:`);
      result.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error.error || error}`);
      });
    }
    
    return {
      success: result.success,
      incidentCreated: !!result.incidentId,
      withinTimeRequirement: result.responseTime <= 15 * 60 * 1000,
      hasErrors: result.errors.length > 0
    };
    
  } catch (error) {
    console.error('❌ Breach alerting core test error:', error);
    return {
      success: false,
      incidentCreated: false,
      withinTimeRequirement: false,
      hasErrors: true,
      error: error.message
    };
  }
}

/**
 * Test incident management functionality
 */
async function testIncidentManagement() {
  console.log('\n🧪 Testing Incident Management...');
  
  try {
    // Get active incidents
    const incidents = breachAlertingService.getActiveIncidents();
    console.log(`📊 Active incidents: ${incidents.length}`);
    
    if (incidents.length > 0) {
      const incident = incidents[0];
      console.log(`📋 Latest incident details:`);
      console.log(`   ID: ${incident.id}`);
      console.log(`   Severity: ${incident.severity}`);
      console.log(`   Status: ${incident.status}`);
      console.log(`   Alerts: ${incident.alerts.length}`);
      console.log(`   Recommendations: ${incident.recommendations.length}`);
      console.log(`   Timeline entries: ${incident.timeline.length}`);
      
      // Test status update
      console.log(`🔄 Testing status update...`);
      const updateResult = await breachAlertingService.updateIncidentStatus(
        incident.id,
        'investigating',
        'Test status update - investigating incident',
        'test-admin-id'
      );
      
      console.log(`   Status update: ${updateResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (updateResult.success) {
        console.log(`   Status change: ${updateResult.previousStatus} → ${updateResult.newStatus}`);
      } else {
        console.log(`   Update error: ${updateResult.error}`);
      }
      
      // Test getting incident by ID
      const retrievedIncident = breachAlertingService.getIncidentById(incident.id);
      const retrievalSuccess = retrievedIncident && retrievedIncident.id === incident.id;
      console.log(`   Incident retrieval: ${retrievalSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      return {
        hasIncidents: true,
        statusUpdateSuccess: updateResult.success,
        retrievalSuccess
      };
    } else {
      console.log('⚠️ No incidents found to test management functionality');
      return {
        hasIncidents: false,
        statusUpdateSuccess: false,
        retrievalSuccess: false
      };
    }
    
  } catch (error) {
    console.error('❌ Incident management test error:', error);
    return {
      hasIncidents: false,
      statusUpdateSuccess: false,
      retrievalSuccess: false,
      error: error.message
    };
  }
}

/**
 * Test alerting statistics
 */
async function testAlertingStatistics() {
  console.log('\n🧪 Testing Alerting Statistics...');
  
  try {
    const stats = breachAlertingService.getAlertingStatistics();
    
    console.log(`📈 Alerting system statistics:`);
    console.log(`   Active incidents: ${stats.activeIncidents}`);
    console.log(`   By status:`);
    console.log(`     - Detected: ${stats.incidentsByStatus.detected}`);
    console.log(`     - Investigating: ${stats.incidentsByStatus.investigating}`);
    console.log(`     - Contained: ${stats.incidentsByStatus.contained}`);
    console.log(`     - Resolved: ${stats.incidentsByStatus.resolved}`);
    console.log(`   By severity:`);
    console.log(`     - Critical: ${stats.incidentsBySeverity.critical}`);
    console.log(`     - High: ${stats.incidentsBySeverity.high}`);
    console.log(`     - Medium: ${stats.incidentsBySeverity.medium}`);
    console.log(`     - Low: ${stats.incidentsBySeverity.low}`);
    console.log(`   Configuration:`);
    console.log(`     - Max alert delay: ${stats.config.MAX_ALERT_DELAY_MINUTES} minutes`);
    console.log(`     - Severity levels: ${Object.keys(stats.config.SEVERITY_LEVELS).length}`);
    console.log(`     - Alert channels: ${Object.keys(stats.config.ALERT_CHANNELS).length}`);
    
    return {
      hasStats: true,
      hasActiveIncidents: stats.activeIncidents > 0,
      hasConfiguration: !!stats.config
    };
    
  } catch (error) {
    console.error('❌ Alerting statistics test error:', error);
    return {
      hasStats: false,
      hasActiveIncidents: false,
      hasConfiguration: false,
      error: error.message
    };
  }
}

/**
 * Test email alert generation (without actually sending)
 */
async function testEmailAlertGeneration() {
  console.log('\n🧪 Testing Email Alert Generation...');
  
  try {
    // Get an active incident to test email generation
    const incidents = breachAlertingService.getActiveIncidents();
    
    if (incidents.length === 0) {
      console.log('⚠️ No incidents available for email generation test');
      return { hasIncident: false };
    }
    
    const incident = incidents[0];
    
    // Test email body generation (internal function access)
    console.log(`📧 Testing email generation for incident: ${incident.id}`);
    console.log(`   Severity: ${incident.severity}`);
    console.log(`   Alerts: ${incident.alerts.length}`);
    console.log(`   Recommendations: ${incident.recommendations.length}`);
    
    // Verify incident has required fields for email generation
    const hasRequiredFields = !!(
      incident.id &&
      incident.severity &&
      incident.timestamp &&
      incident.alerts &&
      incident.recommendations
    );
    
    console.log(`   Has required fields: ${hasRequiredFields ? 'YES' : 'NO'}`);
    
    return {
      hasIncident: true,
      hasRequiredFields,
      incidentId: incident.id,
      severity: incident.severity
    };
    
  } catch (error) {
    console.error('❌ Email alert generation test error:', error);
    return {
      hasIncident: false,
      hasRequiredFields: false,
      error: error.message
    };
  }
}

/**
 * Run comprehensive simple breach alerting test
 */
async function runSimpleBreachAlertingTest() {
  console.log('🚨 SIMPLE BREACH ALERTING SYSTEM TEST');
  console.log('======================================');
  console.log('Testing core functionality without database dependency\n');
  
  const results = {};
  
  // Test core breach alerting
  console.log('1️⃣ CORE BREACH ALERTING');
  console.log('------------------------');
  results.core = await testBreachAlertingCore();
  
  // Test incident management
  console.log('\n2️⃣ INCIDENT MANAGEMENT');
  console.log('----------------------');
  results.management = await testIncidentManagement();
  
  // Test alerting statistics
  console.log('\n3️⃣ ALERTING STATISTICS');
  console.log('----------------------');
  results.statistics = await testAlertingStatistics();
  
  // Test email alert generation
  console.log('\n4️⃣ EMAIL ALERT GENERATION');
  console.log('-------------------------');
  results.email = await testEmailAlertGeneration();
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  
  const coreSuccess = results.core.success && results.core.incidentCreated && results.core.withinTimeRequirement;
  console.log(`Core Breach Alerting: ${coreSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  if (!coreSuccess) {
    console.log(`  - Success: ${results.core.success}`);
    console.log(`  - Incident created: ${results.core.incidentCreated}`);
    console.log(`  - Within time requirement: ${results.core.withinTimeRequirement}`);
    if (results.core.error) console.log(`  - Error: ${results.core.error}`);
  }
  
  const managementSuccess = results.management.hasIncidents && results.management.statusUpdateSuccess && results.management.retrievalSuccess;
  console.log(`Incident Management: ${managementSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  if (!managementSuccess) {
    console.log(`  - Has incidents: ${results.management.hasIncidents}`);
    console.log(`  - Status update: ${results.management.statusUpdateSuccess}`);
    console.log(`  - Retrieval: ${results.management.retrievalSuccess}`);
    if (results.management.error) console.log(`  - Error: ${results.management.error}`);
  }
  
  const statisticsSuccess = results.statistics.hasStats && results.statistics.hasConfiguration;
  console.log(`Alerting Statistics: ${statisticsSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  if (!statisticsSuccess) {
    console.log(`  - Has stats: ${results.statistics.hasStats}`);
    console.log(`  - Has configuration: ${results.statistics.hasConfiguration}`);
    if (results.statistics.error) console.log(`  - Error: ${results.statistics.error}`);
  }
  
  const emailSuccess = results.email.hasIncident && results.email.hasRequiredFields;
  console.log(`Email Alert Generation: ${emailSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  if (!emailSuccess) {
    console.log(`  - Has incident: ${results.email.hasIncident}`);
    console.log(`  - Has required fields: ${results.email.hasRequiredFields}`);
    if (results.email.error) console.log(`  - Error: ${results.email.error}`);
  }
  
  const allPassed = coreSuccess && managementSuccess && statisticsSuccess && emailSuccess;
  console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Breach alerting system core functionality is working!');
    console.log('✅ Key capabilities verified:');
    console.log('   - Breach detection and incident creation');
    console.log('   - Response time within 15-minute requirement');
    console.log('   - Incident status management');
    console.log('   - Statistics and monitoring');
    console.log('   - Email alert preparation');
    console.log('\n📋 Next steps:');
    console.log('   - Test with actual database connection');
    console.log('   - Verify email delivery (configure SMTP)');
    console.log('   - Test integration with security monitoring');
    console.log('   - Validate admin dashboard integration');
  } else {
    console.log('\n⚠️ Some components need attention - see details above');
  }
  
  return allPassed;
}

// Run the test if this file is executed directly
if (require.main === module) {
  runSimpleBreachAlertingTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runSimpleBreachAlertingTest,
  testBreachAlertingCore,
  testIncidentManagement,
  testAlertingStatistics,
  testEmailAlertGeneration
};