const SessionStatusManager = require('./server/utils/sessionStatusManager');

/**
 * Unit tests for SessionStatusManager logic
 * Tests the status transition logic without database dependencies
 */

function runTests() {
  console.log('🧪 Testing SessionStatusManager Logic');
  console.log('=' .repeat(50));
  
  try {
    testStatusTransitions();
    testValidationLogic();
    
    console.log('\n✅ All SessionStatusManager logic tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

function testStatusTransitions() {
  console.log('\n🔄 Testing status transitions...');
  
  // Test valid transitions
  console.log('   Testing valid status transitions...');
  const validTransitions = [
    ['Pending', 'Pending Approval'],
    ['Pending', 'Cancelled'],
    ['Pending Approval', 'Approved'],
    ['Pending Approval', 'Declined'],
    ['Pending Approval', 'Cancelled'],
    ['Approved', 'Payment Submitted'],
    ['Approved', 'Cancelled'],
    ['Payment Submitted', 'Confirmed'],
    ['Payment Submitted', 'Cancelled'],
    ['Confirmed', 'In Progress'],
    ['Confirmed', 'Cancelled'],
    ['In Progress', 'Completed'],
    ['In Progress', 'Cancelled']
  ];
  
  for (const [from, to] of validTransitions) {
    const canTransition = SessionStatusManager.canTransitionToStatus(from, to);
    if (!canTransition) {
      throw new Error(`Expected transition from ${from} to ${to} to be valid`);
    }
  }
  
  console.log('   ✅ Valid transitions work correctly');
  
  // Test invalid transitions
  console.log('   Testing invalid status transitions...');
  const invalidTransitions = [
    ['Completed', 'In Progress'],
    ['Completed', 'Confirmed'],
    ['Cancelled', 'Confirmed'],
    ['Cancelled', 'In Progress'],
    ['Declined', 'Approved'],
    ['Declined', 'Confirmed'],
    ['Pending', 'Completed'],
    ['Pending', 'In Progress'],
    ['Approved', 'Confirmed'], // Should go through Payment Submitted
    ['Payment Submitted', 'In Progress'] // Should go through Confirmed
  ];
  
  for (const [from, to] of invalidTransitions) {
    const canTransition = SessionStatusManager.canTransitionToStatus(from, to);
    if (canTransition) {
      throw new Error(`Expected transition from ${from} to ${to} to be invalid`);
    }
  }
  
  console.log('   ✅ Invalid transitions properly rejected');
}

function testValidationLogic() {
  console.log('\n✅ Testing validation logic...');
  
  // Test validation for "In Progress" status
  console.log('   Testing "In Progress" validation...');
  
  // Mock session with confirmed payment
  const validSession = {
    status: 'Confirmed',
    paymentStatus: 'Confirmed'
  };
  
  try {
    SessionStatusManager.validateStatusTransition(validSession, 'In Progress');
    console.log('   ✅ Valid "In Progress" transition accepted');
  } catch (error) {
    throw new Error(`Valid "In Progress" transition rejected: ${error.message}`);
  }
  
  // Mock session with unconfirmed payment
  const invalidSession = {
    status: 'Confirmed',
    paymentStatus: 'Pending'
  };
  
  try {
    SessionStatusManager.validateStatusTransition(invalidSession, 'In Progress');
    throw new Error('Should have rejected "In Progress" with unconfirmed payment');
  } catch (error) {
    if (error.message.includes('Payment must be confirmed')) {
      console.log('   ✅ Invalid "In Progress" transition properly rejected');
    } else {
      throw error;
    }
  }
  
  // Test validation for "Completed" status
  console.log('   Testing "Completed" validation...');
  
  // Mock session that was started
  const startedSession = {
    status: 'In Progress',
    videoCallStarted: new Date()
  };
  
  try {
    SessionStatusManager.validateStatusTransition(startedSession, 'Completed');
    console.log('   ✅ Valid "Completed" transition accepted');
  } catch (error) {
    throw new Error(`Valid "Completed" transition rejected: ${error.message}`);
  }
  
  // Mock session that was never started
  const neverStartedSession = {
    status: 'In Progress',
    videoCallStarted: null
  };
  
  try {
    SessionStatusManager.validateStatusTransition(neverStartedSession, 'Completed');
    throw new Error('Should have rejected "Completed" for never-started session');
  } catch (error) {
    if (error.message.includes('Cannot complete session that was never started')) {
      console.log('   ✅ Invalid "Completed" transition properly rejected');
    } else {
      throw error;
    }
  }
  
  // Test invalid status transition
  console.log('   Testing invalid status transition validation...');
  
  const completedSession = {
    status: 'Completed'
  };
  
  try {
    SessionStatusManager.validateStatusTransition(completedSession, 'In Progress');
    throw new Error('Should have rejected invalid status transition');
  } catch (error) {
    if (error.message.includes('Invalid status transition')) {
      console.log('   ✅ Invalid status transition properly rejected');
    } else {
      throw error;
    }
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };