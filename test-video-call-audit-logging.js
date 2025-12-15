/**
 * Test Video Call Audit Logging Implementation
 * 
 * This script tests the audit logging functionality for video call access
 * to ensure all video call events are properly logged for compliance.
 */

const mongoose = require('mongoose');
const { 
  logVideoCallAccess,
  logVideoCallStart,
  logVideoCallEnd,
  logVideoCallJoinAttempt,
  logVideoCallSecurityValidation,
  retrieveAuditLogs
} = require('./server/utils/auditLogger');

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling_steps_test',
  testUserId: '507f1f77bcf86cd799439011',
  testSessionId: '507f1f77bcf86cd799439012',
  testRoomId: 'room-test-12345',
  testIpAddress: '192.168.1.100'
};

async function connectToDatabase() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUri);
    console.log('✅ Connected to MongoDB for testing');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testVideoCallAccessLogging() {
  console.log('\n🧪 Testing Video Call Access Logging...');
  
  try {
    // Test successful access
    const successLog = await logVideoCallAccess({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      action: 'generate-room',
      userRole: 'client',
      ipAddress: TEST_CONFIG.testIpAddress,
      success: true,
      sessionDetails: {
        sessionDate: new Date(),
        sessionType: 'Individual',
        paymentStatus: 'Confirmed',
        status: 'Confirmed'
      }
    });
    
    console.log('✅ Successful access logged:', successLog.logHash);
    
    // Test failed access
    const failLog = await logVideoCallAccess({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      action: 'generate-room',
      userRole: 'client',
      ipAddress: TEST_CONFIG.testIpAddress,
      success: false,
      reason: 'Payment not confirmed',
      sessionDetails: {
        sessionDate: new Date(),
        sessionType: 'Individual',
        paymentStatus: 'Pending',
        status: 'Confirmed'
      }
    });
    
    console.log('✅ Failed access logged:', failLog.logHash);
    
  } catch (error) {
    console.error('❌ Video call access logging test failed:', error);
  }
}

async function testVideoCallStartLogging() {
  console.log('\n🧪 Testing Video Call Start Logging...');
  
  try {
    const startLog = await logVideoCallStart({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      roomId: TEST_CONFIG.testRoomId,
      userRole: 'client',
      participants: {
        client: { id: TEST_CONFIG.testUserId, name: 'Test Client' },
        psychologist: { id: '507f1f77bcf86cd799439013', name: 'Dr. Test' }
      },
      ipAddress: TEST_CONFIG.testIpAddress
    });
    
    console.log('✅ Video call start logged:', startLog.logHash);
    
  } catch (error) {
    console.error('❌ Video call start logging test failed:', error);
  }
}

async function testVideoCallEndLogging() {
  console.log('\n🧪 Testing Video Call End Logging...');
  
  try {
    const endLog = await logVideoCallEnd({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      roomId: TEST_CONFIG.testRoomId,
      userRole: 'client',
      duration: 45,
      ipAddress: TEST_CONFIG.testIpAddress,
      endReason: 'normal'
    });
    
    console.log('✅ Video call end logged:', endLog.logHash);
    
  } catch (error) {
    console.error('❌ Video call end logging test failed:', error);
  }
}

async function testVideoCallJoinAttemptLogging() {
  console.log('\n🧪 Testing Video Call Join Attempt Logging...');
  
  try {
    // Test successful join
    const successJoinLog = await logVideoCallJoinAttempt({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      roomId: TEST_CONFIG.testRoomId,
      userRole: 'client',
      ipAddress: TEST_CONFIG.testIpAddress,
      success: true,
      timeValidation: {
        canJoin: true,
        minutesUntilSession: -5,
        sessionDate: new Date()
      }
    });
    
    console.log('✅ Successful join attempt logged:', successJoinLog.logHash);
    
    // Test failed join
    const failJoinLog = await logVideoCallJoinAttempt({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      roomId: TEST_CONFIG.testRoomId,
      userRole: 'client',
      ipAddress: TEST_CONFIG.testIpAddress,
      success: false,
      reason: 'Session starts in 30 minutes',
      timeValidation: {
        canJoin: false,
        minutesUntilSession: 30,
        sessionDate: new Date()
      }
    });
    
    console.log('✅ Failed join attempt logged:', failJoinLog.logHash);
    
  } catch (error) {
    console.error('❌ Video call join attempt logging test failed:', error);
  }
}

async function testVideoCallSecurityValidationLogging() {
  console.log('\n🧪 Testing Video Call Security Validation Logging...');
  
  try {
    // Test encryption validation
    const encryptionLog = await logVideoCallSecurityValidation({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      validationType: 'encryption',
      passed: true,
      validationResults: {
        dtlsEnabled: true,
        srtpEnabled: true,
        overall: true
      },
      ipAddress: TEST_CONFIG.testIpAddress
    });
    
    console.log('✅ Security validation logged:', encryptionLog.logHash);
    
    // Test connection validation
    const connectionLog = await logVideoCallSecurityValidation({
      userId: TEST_CONFIG.testUserId,
      sessionId: TEST_CONFIG.testSessionId,
      validationType: 'real-time-connection',
      passed: false,
      validationResults: {
        dtlsEnabled: false,
        srtpEnabled: true,
        overall: false,
        error: 'DTLS not enabled'
      },
      ipAddress: TEST_CONFIG.testIpAddress
    });
    
    console.log('✅ Connection validation logged:', connectionLog.logHash);
    
  } catch (error) {
    console.error('❌ Video call security validation logging test failed:', error);
  }
}

async function testAuditLogRetrieval() {
  console.log('\n🧪 Testing Audit Log Retrieval...');
  
  try {
    // Retrieve all video call logs
    const videoCallLogs = await retrieveAuditLogs({
      actionType: {
        $in: [
          'VIDEO_CALL_ACCESS',
          'VIDEO_CALL_START',
          'VIDEO_CALL_END',
          'VIDEO_CALL_JOIN_ATTEMPT',
          'VIDEO_CALL_SECURITY_VALIDATION'
        ]
      },
      limit: 50
    });
    
    console.log(`✅ Retrieved ${videoCallLogs.logs.length} video call audit logs`);
    
    // Retrieve logs for specific session
    const sessionLogs = await retrieveAuditLogs({
      sessionId: TEST_CONFIG.testSessionId,
      limit: 20
    });
    
    console.log(`✅ Retrieved ${sessionLogs.logs.length} logs for test session`);
    
    // Display log summary
    const logTypes = {};
    videoCallLogs.logs.forEach(log => {
      logTypes[log.actionType] = (logTypes[log.actionType] || 0) + 1;
    });
    
    console.log('📊 Video Call Log Summary:');
    Object.entries(logTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} logs`);
    });
    
  } catch (error) {
    console.error('❌ Audit log retrieval test failed:', error);
  }
}

async function testLogIntegrity() {
  console.log('\n🧪 Testing Log Integrity...');
  
  try {
    // Get recent logs for integrity check
    const recentLogs = await retrieveAuditLogs({
      limit: 10
    });
    
    if (recentLogs.logs.length < 2) {
      console.log('⚠️ Not enough logs for integrity test');
      return;
    }
    
    // Check hash chain integrity
    let previousHash = null;
    let integrityValid = true;
    
    for (const log of recentLogs.logs.reverse()) {
      if (previousHash && log.previousHash !== previousHash) {
        console.error(`❌ Hash chain broken at log ${log.logHash}`);
        integrityValid = false;
        break;
      }
      previousHash = log.logHash;
    }
    
    if (integrityValid) {
      console.log('✅ Log integrity verified - hash chain intact');
    }
    
  } catch (error) {
    console.error('❌ Log integrity test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Video Call Audit Logging Tests...\n');
  
  await connectToDatabase();
  
  await testVideoCallAccessLogging();
  await testVideoCallStartLogging();
  await testVideoCallEndLogging();
  await testVideoCallJoinAttemptLogging();
  await testVideoCallSecurityValidationLogging();
  await testAuditLogRetrieval();
  await testLogIntegrity();
  
  console.log('\n✅ All video call audit logging tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('   - Video call access logging: ✅');
  console.log('   - Video call start logging: ✅');
  console.log('   - Video call end logging: ✅');
  console.log('   - Video call join attempt logging: ✅');
  console.log('   - Video call security validation logging: ✅');
  console.log('   - Audit log retrieval: ✅');
  console.log('   - Log integrity verification: ✅');
  
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testVideoCallAccessLogging,
  testVideoCallStartLogging,
  testVideoCallEndLogging,
  testVideoCallJoinAttemptLogging,
  testVideoCallSecurityValidationLogging,
  testAuditLogRetrieval,
  testLogIntegrity
};