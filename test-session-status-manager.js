const mongoose = require('mongoose');
const SessionStatusManager = require('./server/utils/sessionStatusManager');
const Session = require('./server/models/Session');
const User = require('./server/models/User');

// Connect to test database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling_steps_test';

/**
 * Unit tests for SessionStatusManager
 * Tests the core session status update functionality
 */

async function runTests() {
  console.log('🧪 Testing SessionStatusManager');
  console.log('=' .repeat(50));
  
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to test database');
    
    // Clean up any existing test data
    await Session.deleteMany({ sessionType: 'Test Session' });
    await User.deleteMany({ email: /test.*@example\.com/ });
    
    // Run tests
    await testSessionStatusUpdates();
    await testErrorHandling();
    await testStatusTransitions();
    
    console.log('\n✅ All SessionStatusManager tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // Clean up and disconnect
    await Session.deleteMany({ sessionType: 'Test Session' });
    await User.deleteMany({ email: /test.*@example\.com/ });
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

async function testSessionStatusUpdates() {
  console.log('\n🎥 Testing session status updates...');
  
  // Create test users
  const client = new User({
    name: 'Test Client',
    email: 'testclient@example.com',
    password: 'hashedpassword',
    role: 'client'
  });
  await client.save();
  
  const psychologist = new User({
    name: 'Test Psychologist',
    email: 'testpsych@example.com',
    password: 'hashedpassword',
    role: 'psychologist'
  });
  await psychologist.save();
  
  // Create test session
  const session = new Session({
    client: client._id,
    psychologist: psychologist._id,
    sessionType: 'Test Session',
    sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    price: 2500,
    status: 'Confirmed',
    paymentStatus: 'Confirmed',
    isVideoCall: true,
    meetingLink: 'test-room-123'
  });
  await session.save();
  
  console.log('   Testing video call start...');
  
  // Test starting video call
  const startResult = await SessionStatusManager.startVideoCall(session._id.toString(), client._id.toString());
  
  if (!startResult.success) {
    throw new Error('Failed to start video call');
  }
  
  if (startResult.session.status !== 'In Progress') {
    throw new Error(`Expected status 'In Progress', got '${startResult.session.status}'`);
  }
  
  if (!startResult.session.videoCallStarted) {
    throw new Error('Video call start time not recorded');
  }
  
  console.log('   ✅ Video call started successfully');
  console.log(`      Status: ${startResult.session.status}`);
  
  // Wait a moment for duration calculation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('   Testing video call end...');
  
  // Test ending video call
  const endResult = await SessionStatusManager.endVideoCall(session._id.toString(), psychologist._id.toString());
  
  if (!endResult.success) {
    throw new Error('Failed to end video call');
  }
  
  if (endResult.session.status !== 'Completed') {
    throw new Error(`Expected status 'Completed', got '${endResult.session.status}'`);
  }
  
  if (!endResult.session.videoCallEnded) {
    throw new Error('Video call end time not recorded');
  }
  
  if (typeof endResult.duration !== 'number' || endResult.duration < 0) {
    throw new Error(`Invalid call duration: ${endResult.duration}`);
  }
  
  console.log('   ✅ Video call ended successfully');
  console.log(`      Status: ${endResult.session.status}`);
  console.log(`      Duration: ${endResult.duration} minutes`);
  
  // Verify data persistence
  const updatedSession = await Session.findById(session._id);
  if (updatedSession.status !== 'Completed') {
    throw new Error('Session status not persisted correctly');
  }
  
  if (!updatedSession.videoCallStarted || !updatedSession.videoCallEnded) {
    throw new Error('Video call timestamps not persisted');
  }
  
  if (typeof updatedSession.callDuration !== 'number') {
    throw new Error('Call duration not persisted correctly');
  }
  
  console.log('   ✅ Session data persisted correctly');
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing error handling...');
  
  // Test with non-existent session
  console.log('   Testing non-existent session...');
  try {
    const fakeId = new mongoose.Types.ObjectId();
    await SessionStatusManager.startVideoCall(fakeId.toString(), new mongoose.Types.ObjectId().toString());
    throw new Error('Should have failed for non-existent session');
  } catch (error) {
    if (error.message === 'Session not found') {
      console.log('   ✅ Non-existent session properly rejected');
    } else {
      throw error;
    }
  }
  
  // Create session with invalid payment status
  const client = new User({
    name: 'Test Client 2',
    email: 'testclient2@example.com',
    password: 'hashedpassword',
    role: 'client'
  });
  await client.save();
  
  const psychologist = new User({
    name: 'Test Psychologist 2',
    email: 'testpsych2@example.com',
    password: 'hashedpassword',
    role: 'psychologist'
  });
  await psychologist.save();
  
  const unpaidSession = new Session({
    client: client._id,
    psychologist: psychologist._id,
    sessionType: 'Test Session',
    sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    price: 2500,
    status: 'Confirmed',
    paymentStatus: 'Pending', // Invalid for starting call
    isVideoCall: true,
    meetingLink: 'test-room-456'
  });
  await unpaidSession.save();
  
  console.log('   Testing unpaid session...');
  try {
    await SessionStatusManager.startVideoCall(unpaidSession._id.toString(), client._id.toString());
    throw new Error('Should have failed for unpaid session');
  } catch (error) {
    if (error.message.includes('Payment must be confirmed')) {
      console.log('   ✅ Unpaid session properly rejected');
    } else {
      throw error;
    }
  }
  
  // Test unauthorized access
  console.log('   Testing unauthorized access...');
  const unauthorizedUser = new User({
    name: 'Unauthorized User',
    email: 'unauthorized@example.com',
    password: 'hashedpassword',
    role: 'client'
  });
  await unauthorizedUser.save();
  
  try {
    await SessionStatusManager.startVideoCall(unpaidSession._id.toString(), unauthorizedUser._id.toString());
    throw new Error('Should have failed for unauthorized user');
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      console.log('   ✅ Unauthorized access properly rejected');
    } else {
      throw error;
    }
  }
}

async function testStatusTransitions() {
  console.log('\n🔄 Testing status transitions...');
  
  // Test valid transitions
  console.log('   Testing valid status transitions...');
  const validTransitions = [
    ['Pending', 'Pending Approval'],
    ['Pending Approval', 'Approved'],
    ['Approved', 'Payment Submitted'],
    ['Payment Submitted', 'Confirmed'],
    ['Confirmed', 'In Progress'],
    ['In Progress', 'Completed']
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
    ['Cancelled', 'Confirmed'],
    ['Declined', 'Approved'],
    ['Pending', 'Completed']
  ];
  
  for (const [from, to] of invalidTransitions) {
    const canTransition = SessionStatusManager.canTransitionToStatus(from, to);
    if (canTransition) {
      throw new Error(`Expected transition from ${from} to ${to} to be invalid`);
    }
  }
  
  console.log('   ✅ Invalid transitions properly rejected');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };