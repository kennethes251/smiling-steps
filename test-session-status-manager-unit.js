/**
 * Unit Test for SessionStatusManager
 * Tests the session status update functionality directly
 */

const SessionStatusManager = require('./server/utils/sessionStatusManager');

// Mock global Session model for testing
global.Session = {
  findByPk: async (id, options) => {
    // Mock session data
    const mockSession = {
      id: id,
      clientId: 'client-123',
      psychologistId: 'psychologist-456',
      status: 'Confirmed',
      paymentStatus: 'Confirmed',
      videoCallStarted: null,
      videoCallEnded: null,
      duration: null,
      save: async function() {
        console.log(`💾 Mock session saved: ${JSON.stringify({
          id: this.id,
          status: this.status,
          videoCallStarted: this.videoCallStarted,
          videoCallEnded: this.videoCallEnded,
          duration: this.duration
        }, null, 2)}`);
        return this;
      },
      client: { id: 'client-123', name: 'Test Client' },
      psychologist: { id: 'psychologist-456', name: 'Test Psychologist' }
    };
    
    return mockSession;
  }
};

async function testSessionStatusManager() {
  console.log('🧪 Testing SessionStatusManager Unit Functions');
  console.log('=' .repeat(50));

  const testSessionId = 'test-session-123';
  const testUserId = 'client-123';

  try {
    // Test 1: Start video call
    console.log('\n📝 Test 1: Starting video call...');
    
    const startResult = await SessionStatusManager.startVideoCall(testSessionId, testUserId);
    
    console.log('✅ Start result:', {
      success: startResult.success,
      message: startResult.message,
      sessionStatus: startResult.session?.status,
      videoCallStarted: startResult.session?.videoCallStarted
    });

    if (startResult.success && startResult.session?.status === 'In Progress') {
      console.log('✅ Video call start working correctly');
    } else {
      console.log('❌ Video call start not working as expected');
    }

    // Test 2: End video call
    console.log('\n📝 Test 2: Ending video call...');
    
    // Simulate some time passing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const endResult = await SessionStatusManager.endVideoCall(testSessionId, testUserId);
    
    console.log('✅ End result:', {
      success: endResult.success,
      message: endResult.message,
      duration: endResult.duration,
      sessionStatus: endResult.session?.status,
      videoCallEnded: endResult.session?.videoCallEnded
    });

    if (endResult.success && endResult.session?.status === 'Completed') {
      console.log('✅ Video call end working correctly');
    } else {
      console.log('❌ Video call end not working as expected');
    }

    // Test 3: Auto-start functionality
    console.log('\n📝 Test 3: Testing auto-start functionality...');
    
    const autoStartResult = await SessionStatusManager.autoStartVideoCall(testSessionId);
    
    console.log('✅ Auto-start result:', {
      success: autoStartResult.success,
      reason: autoStartResult.reason,
      sessionStatus: autoStartResult.session?.status
    });

    // Test 4: Status transition validation
    console.log('\n📝 Test 4: Testing status transition validation...');
    
    const canTransition1 = SessionStatusManager.canTransitionToStatus('Confirmed', 'In Progress');
    const canTransition2 = SessionStatusManager.canTransitionToStatus('In Progress', 'Completed');
    const canTransition3 = SessionStatusManager.canTransitionToStatus('Completed', 'In Progress');
    
    console.log('✅ Status transition tests:', {
      'Confirmed -> In Progress': canTransition1, // Should be true
      'In Progress -> Completed': canTransition2, // Should be true
      'Completed -> In Progress': canTransition3  // Should be false
    });

    if (canTransition1 && canTransition2 && !canTransition3) {
      console.log('✅ Status transition validation working correctly');
    } else {
      console.log('❌ Status transition validation not working as expected');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🎯 SessionStatusManager Unit Test Complete!');
  console.log('=' .repeat(50));
}

// Run the test
if (require.main === module) {
  testSessionStatusManager().catch(console.error);
}

module.exports = { testSessionStatusManager };