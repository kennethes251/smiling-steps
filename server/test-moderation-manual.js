/**
 * Manual Testing Script for Chat Room Moderation
 * 
 * This script helps you test the moderation functionality by:
 * 1. Creating test users (owner, moderator, participant)
 * 2. Creating a test chat room
 * 3. Testing moderation actions via API calls
 * 
 * Usage: node server/test-moderation-manual.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');
const ModerationLog = require('./models/ModerationLog');

// Test configuration
const TEST_PREFIX = 'modtest_';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up previous test data...');
  
  // Find test users
  const testUsers = await User.find({ email: { $regex: `^${TEST_PREFIX}` } });
  const testUserIds = testUsers.map(u => u._id);
  
  // Delete test rooms
  await ChatRoom.deleteMany({ owner: { $in: testUserIds } });
  
  // Delete moderation logs for test rooms
  await ModerationLog.deleteMany({ moderator: { $in: testUserIds } });
  
  // Delete test users
  await User.deleteMany({ email: { $regex: `^${TEST_PREFIX}` } });
  
  console.log('✅ Cleanup complete');
}

async function createTestUsers() {
  console.log('\n👥 Creating test users...');
  
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('Test123!', 10);
  
  // Create owner (psychologist)
  const owner = await User.create({
    name: 'Test Owner',
    email: `${TEST_PREFIX}owner@test.com`,
    password: hashedPassword,
    role: 'psychologist',
    isVerified: true,
    approvalStatus: 'approved'
  });
  console.log(`  ✅ Owner created: ${owner.email} (ID: ${owner._id})`);
  
  // Create moderator (psychologist)
  const moderator = await User.create({
    name: 'Test Moderator',
    email: `${TEST_PREFIX}moderator@test.com`,
    password: hashedPassword,
    role: 'psychologist',
    isVerified: true,
    approvalStatus: 'approved'
  });
  console.log(`  ✅ Moderator created: ${moderator.email} (ID: ${moderator._id})`);
  
  // Create participant (client)
  const participant = await User.create({
    name: 'Test Participant',
    email: `${TEST_PREFIX}participant@test.com`,
    password: hashedPassword,
    role: 'client',
    isVerified: true
  });
  console.log(`  ✅ Participant created: ${participant.email} (ID: ${participant._id})`);
  
  // Create another participant for testing
  const participant2 = await User.create({
    name: 'Test Participant 2',
    email: `${TEST_PREFIX}participant2@test.com`,
    password: hashedPassword,
    role: 'client',
    isVerified: true
  });
  console.log(`  ✅ Participant 2 created: ${participant2.email} (ID: ${participant2._id})`);
  
  return { owner, moderator, participant, participant2 };
}

async function createTestRoom(owner, moderator, participants) {
  console.log('\n🏠 Creating test chat room...');
  
  const room = await ChatRoom.create({
    name: 'Test Support Group',
    description: 'A test room for moderation testing',
    roomType: 'support_group',
    owner: owner._id,
    moderators: [moderator._id],
    participants: [
      { user: owner._id, role: 'owner', joinedAt: new Date() },
      { user: moderator._id, role: 'moderator', joinedAt: new Date() },
      ...participants.map(p => ({ user: p._id, role: 'participant', joinedAt: new Date() }))
    ],
    settings: {
      maxParticipants: 50,
      isJoinable: true,
      isPublic: true
    }
  });
  
  console.log(`  ✅ Room created: ${room.name} (ID: ${room._id})`);
  return room;
}

async function testModerationService(room, owner, moderator, participant, participant2) {
  console.log('\n🧪 Testing ModerationService directly...');
  
  const { moderationService } = require('./services/moderationService');
  
  // Test 1: Mute participant
  console.log('\n  📌 Test 1: Mute participant');
  try {
    const muteResult = await moderationService.muteParticipant(
      room._id.toString(),
      moderator._id.toString(),
      participant._id.toString(),
      30,
      'Testing mute functionality'
    );
    console.log(`    ✅ Mute successful. Muted until: ${muteResult.mutedUntil}`);
  } catch (error) {
    console.log(`    ❌ Mute failed: ${error.message}`);
  }
  
  // Test 2: Check mute status
  console.log('\n  📌 Test 2: Check mute status');
  try {
    const muteStatus = await moderationService.checkMuteStatus(
      room._id.toString(),
      participant._id.toString()
    );
    console.log(`    ✅ Mute status: ${JSON.stringify(muteStatus)}`);
  } catch (error) {
    console.log(`    ❌ Check mute status failed: ${error.message}`);
  }
  
  // Test 3: Unmute participant
  console.log('\n  📌 Test 3: Unmute participant');
  try {
    await moderationService.unmuteParticipant(
      room._id.toString(),
      moderator._id.toString(),
      participant._id.toString()
    );
    console.log('    ✅ Unmute successful');
  } catch (error) {
    console.log(`    ❌ Unmute failed: ${error.message}`);
  }
  
  // Test 4: Kick participant
  console.log('\n  📌 Test 4: Kick participant');
  try {
    await moderationService.kickParticipant(
      room._id.toString(),
      moderator._id.toString(),
      participant2._id.toString(),
      'Testing kick functionality'
    );
    console.log('    ✅ Kick successful');
  } catch (error) {
    console.log(`    ❌ Kick failed: ${error.message}`);
  }
  
  // Test 5: Ban participant
  console.log('\n  📌 Test 5: Ban participant');
  try {
    await moderationService.banParticipant(
      room._id.toString(),
      owner._id.toString(),
      participant._id.toString(),
      'Testing ban functionality'
    );
    console.log('    ✅ Ban successful');
  } catch (error) {
    console.log(`    ❌ Ban failed: ${error.message}`);
  }
  
  // Test 6: Check ban status
  console.log('\n  📌 Test 6: Check ban status');
  try {
    const banStatus = await moderationService.checkBanStatus(
      room._id.toString(),
      participant._id.toString()
    );
    console.log(`    ✅ Ban status: ${JSON.stringify(banStatus)}`);
  } catch (error) {
    console.log(`    ❌ Check ban status failed: ${error.message}`);
  }
  
  // Test 7: Unban participant
  console.log('\n  📌 Test 7: Unban participant');
  try {
    await moderationService.unbanParticipant(
      room._id.toString(),
      owner._id.toString(),
      participant._id.toString()
    );
    console.log('    ✅ Unban successful');
  } catch (error) {
    console.log(`    ❌ Unban failed: ${error.message}`);
  }
  
  // Test 8: Assign moderator
  console.log('\n  📌 Test 8: Assign moderator (need to re-add participant first)');
  try {
    // Re-add participant to room
    const updatedRoom = await ChatRoom.findById(room._id);
    updatedRoom.participants.push({
      user: participant._id,
      role: 'participant',
      joinedAt: new Date()
    });
    await updatedRoom.save();
    
    await moderationService.assignModerator(
      room._id.toString(),
      owner._id.toString(),
      participant._id.toString()
    );
    console.log('    ✅ Assign moderator successful');
  } catch (error) {
    console.log(`    ❌ Assign moderator failed: ${error.message}`);
  }
  
  // Test 9: Remove moderator
  console.log('\n  📌 Test 9: Remove moderator');
  try {
    await moderationService.removeModerator(
      room._id.toString(),
      owner._id.toString(),
      participant._id.toString()
    );
    console.log('    ✅ Remove moderator successful');
  } catch (error) {
    console.log(`    ❌ Remove moderator failed: ${error.message}`);
  }
  
  // Test 10: Get moderation logs
  console.log('\n  📌 Test 10: Get moderation logs');
  try {
    const logs = await moderationService.getModerationLogs(room._id.toString());
    console.log(`    ✅ Found ${logs.length} moderation log entries:`);
    logs.forEach(log => {
      console.log(`       - ${log.action} by ${log.moderator} on ${log.targetUser} at ${log.createdAt}`);
    });
  } catch (error) {
    console.log(`    ❌ Get moderation logs failed: ${error.message}`);
  }
  
  // Test 11: Permission checks
  console.log('\n  📌 Test 11: Verify moderator permissions');
  try {
    const ownerPerms = await moderationService.verifyModeratorPermissions(
      room._id.toString(),
      owner._id.toString()
    );
    console.log(`    ✅ Owner permissions: ${JSON.stringify(ownerPerms)}`);
    
    const modPerms = await moderationService.verifyModeratorPermissions(
      room._id.toString(),
      moderator._id.toString()
    );
    console.log(`    ✅ Moderator permissions: ${JSON.stringify(modPerms)}`);
  } catch (error) {
    console.log(`    ❌ Permission check failed: ${error.message}`);
  }
}

function printAPITestInstructions(room, owner, moderator, participant) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 API TESTING INSTRUCTIONS');
  console.log('='.repeat(70));
  
  console.log('\nTo test via API, start your server and use these curl commands:');
  console.log('\n1. First, login to get a JWT token:');
  console.log(`
curl -X POST http://localhost:5000/api/users/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "${TEST_PREFIX}owner@test.com", "password": "Test123!"}'
`);
  
  console.log('\n2. Use the token in subsequent requests. Example - Mute a user:');
  console.log(`
curl -X POST http://localhost:5000/api/chat-rooms/${room._id}/mute/${participant._id} \\
  -H "Content-Type: application/json" \\
  -H "x-auth-token: YOUR_TOKEN_HERE" \\
  -d '{"duration": 30, "reason": "Testing mute"}'
`);
  
  console.log('\n3. Check mute status:');
  console.log(`
curl http://localhost:5000/api/chat-rooms/${room._id}/mute-status/${participant._id} \\
  -H "x-auth-token: YOUR_TOKEN_HERE"
`);
  
  console.log('\n4. Unmute user:');
  console.log(`
curl -X POST http://localhost:5000/api/chat-rooms/${room._id}/unmute/${participant._id} \\
  -H "x-auth-token: YOUR_TOKEN_HERE"
`);
  
  console.log('\n5. Kick user:');
  console.log(`
curl -X POST http://localhost:5000/api/chat-rooms/${room._id}/kick/${participant._id} \\
  -H "Content-Type: application/json" \\
  -H "x-auth-token: YOUR_TOKEN_HERE" \\
  -d '{"reason": "Testing kick"}'
`);
  
  console.log('\n6. Ban user:');
  console.log(`
curl -X POST http://localhost:5000/api/chat-rooms/${room._id}/ban/${participant._id} \\
  -H "Content-Type: application/json" \\
  -H "x-auth-token: YOUR_TOKEN_HERE" \\
  -d '{"reason": "Testing ban"}'
`);
  
  console.log('\n7. Get moderation logs:');
  console.log(`
curl http://localhost:5000/api/chat-rooms/${room._id}/moderation-logs \\
  -H "x-auth-token: YOUR_TOKEN_HERE"
`);
  
  console.log('\n8. Assign moderator (owner only):');
  console.log(`
curl -X POST http://localhost:5000/api/chat-rooms/${room._id}/moderators/${participant._id} \\
  -H "x-auth-token: YOUR_TOKEN_HERE"
`);
  
  console.log('\n' + '='.repeat(70));
  console.log('TEST DATA SUMMARY');
  console.log('='.repeat(70));
  console.log(`
Room ID:        ${room._id}
Owner ID:       ${owner._id} (${owner.email})
Moderator ID:   ${moderator._id} (${moderator.email})
Participant ID: ${participant._id} (${participant.email})

All test users have password: Test123!
`);
}

async function main() {
  console.log('🚀 Chat Room Moderation Manual Test Script');
  console.log('='.repeat(50));
  
  await connectDB();
  await cleanupTestData();
  
  const { owner, moderator, participant, participant2 } = await createTestUsers();
  const room = await createTestRoom(owner, moderator, [participant, participant2]);
  
  await testModerationService(room, owner, moderator, participant, participant2);
  
  printAPITestInstructions(room, owner, moderator, participant);
  
  console.log('\n✅ Test script completed!');
  console.log('💡 The test data has been left in the database for API testing.');
  console.log('   Run this script again to reset the test data.\n');
  
  await mongoose.disconnect();
}

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
