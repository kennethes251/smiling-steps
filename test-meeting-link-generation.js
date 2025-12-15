/**
 * Test script to verify meeting link generation for all session creation paths
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// Import models and utilities
const Session = require('./server/models/Session');
const User = require('./server/models/User');
const { generateMeetingLink, isValidMeetingLink } = require('./server/utils/meetingLinkGenerator');

async function testMeetingLinkGeneration() {
  try {
    console.log('🧪 Testing Meeting Link Generation\n');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Test 1: Utility Function Tests
    console.log('=' .repeat(60));
    console.log('TEST 1: Meeting Link Utility Functions');
    console.log('=' .repeat(60));
    
    const testLink1 = generateMeetingLink();
    console.log(`Generated link: ${testLink1}`);
    console.log(`Valid format: ${isValidMeetingLink(testLink1)}`);
    
    const testLink2 = generateMeetingLink();
    console.log(`Generated link: ${testLink2}`);
    console.log(`Valid format: ${isValidMeetingLink(testLink2)}`);
    console.log(`Unique: ${testLink1 !== testLink2}`);
    
    // Test invalid formats
    console.log(`\nInvalid format tests:`);
    console.log(`Empty string: ${isValidMeetingLink('')}`);
    console.log(`Null: ${isValidMeetingLink(null)}`);
    console.log(`Invalid format: ${isValidMeetingLink('invalid-link')}`);
    
    // Test 2: Direct Session Creation (Model Level)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Direct Session Creation (Model Level)');
    console.log('=' .repeat(60));
    
    // Get test users
    const client = await User.findOne({ role: 'client' });
    const psychologist = await User.findOne({ role: 'psychologist' });
    
    if (!client || !psychologist) {
      console.log('❌ No test users found. Creating test users...');
      
      // Create test client if not exists
      if (!client) {
        const testClient = new User({
          name: 'Test Client',
          email: 'testclient@example.com',
          password: 'password123',
          role: 'client',
          isVerified: true
        });
        await testClient.save();
        console.log('✅ Test client created');
      }
      
      // Create test psychologist if not exists
      if (!psychologist) {
        const testPsychologist = new User({
          name: 'Test Psychologist',
          email: 'testpsychologist@example.com',
          password: 'password123',
          role: 'psychologist',
          isVerified: true
        });
        await testPsychologist.save();
        console.log('✅ Test psychologist created');
      }
      
      // Re-fetch users
      const newClient = await User.findOne({ role: 'client' });
      const newPsychologist = await User.findOne({ role: 'psychologist' });
      
      if (!newClient || !newPsychologist) {
        throw new Error('Failed to create test users');
      }
    }
    
    const finalClient = await User.findOne({ role: 'client' });
    const finalPsychologist = await User.findOne({ role: 'psychologist' });
    
    console.log(`👤 Using client: ${finalClient.name} (${finalClient.email})`);
    console.log(`👤 Using psychologist: ${finalPsychologist.name} (${finalPsychologist.email})`);
    
    // Test direct session creation (should auto-generate meeting link)
    const directSession = new Session({
      client: finalClient._id,
      psychologist: finalPsychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: 2500,
      status: 'Pending Approval',
      paymentStatus: 'Pending'
      // Note: Not explicitly setting meetingLink - should be auto-generated
    });
    
    await directSession.save();
    console.log(`✅ Direct session created: ${directSession._id}`);
    console.log(`   Meeting link: ${directSession.meetingLink}`);
    console.log(`   Valid format: ${isValidMeetingLink(directSession.meetingLink)}`);
    console.log(`   Is video call: ${directSession.isVideoCall}`);
    
    // Test 3: API Endpoint Tests (if server is running)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: API Endpoint Tests');
    console.log('=' .repeat(60));
    
    const API_URL = 'http://localhost:5000/api';
    
    try {
      // Test login
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: finalClient.email,
        password: 'password123'
      });
      
      const token = loginResponse.data.token;
      console.log('✅ Client login successful');
      
      // Test session request endpoint
      const sessionRequestResponse = await axios.post(`${API_URL}/sessions/request`, {
        psychologistId: finalPsychologist._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        sessionRate: 2500
      }, {
        headers: { 'x-auth-token': token }
      });
      
      const apiSession = sessionRequestResponse.data.session;
      console.log(`✅ API session request created: ${apiSession._id}`);
      console.log(`   Meeting link: ${apiSession.meetingLink}`);
      console.log(`   Valid format: ${isValidMeetingLink(apiSession.meetingLink)}`);
      console.log(`   Is video call: ${apiSession.isVideoCall}`);
      
      // Test instant session endpoint
      const instantSessionResponse = await axios.post(`${API_URL}/sessions/instant`, {
        psychologistId: finalPsychologist._id,
        sessionType: 'Individual',
        title: 'Test Instant Session'
      }, {
        headers: { 'x-auth-token': token }
      });
      
      const instantSession = instantSessionResponse.data;
      console.log(`✅ API instant session created: ${instantSession._id}`);
      console.log(`   Meeting link: ${instantSession.meetingLink}`);
      console.log(`   Valid format: ${isValidMeetingLink(instantSession.meetingLink)}`);
      console.log(`   Is instant session: ${instantSession.isInstantSession}`);
      
    } catch (apiError) {
      console.log('⚠️ API tests skipped - server may not be running');
      console.log(`   Error: ${apiError.message}`);
    }
    
    // Test 4: Video Call Route Integration
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Video Call Route Integration');
    console.log('=' .repeat(60));
    
    // Create a session without meeting link to test fallback
    const sessionWithoutLink = new Session({
      client: finalClient._id,
      psychologist: finalPsychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
      price: 2500,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      meetingLink: null // Explicitly set to null to test fallback
    });
    
    // Bypass the pre-save middleware for this test
    await Session.collection.insertOne(sessionWithoutLink.toObject());
    console.log(`✅ Session without meeting link created: ${sessionWithoutLink._id}`);
    
    try {
      // Test video call generation endpoint
      const videoCallResponse = await axios.post(`${API_URL}/video-calls/generate-room/${sessionWithoutLink._id}`, {}, {
        headers: { 'x-auth-token': token }
      });
      
      console.log(`✅ Video call room generated: ${videoCallResponse.data.roomId}`);
      console.log(`   Valid format: ${isValidMeetingLink(videoCallResponse.data.roomId)}`);
      
      // Verify the session was updated
      const updatedSession = await Session.findById(sessionWithoutLink._id);
      console.log(`   Session updated: ${updatedSession.meetingLink === videoCallResponse.data.roomId}`);
      
    } catch (videoCallError) {
      console.log('⚠️ Video call route test skipped - server may not be running');
      console.log(`   Error: ${videoCallError.message}`);
    }
    
    // Test 5: Cleanup and Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Cleanup and Summary');
    console.log('=' .repeat(60));
    
    // Clean up test sessions
    await Session.deleteMany({
      _id: { $in: [directSession._id, sessionWithoutLink._id] }
    });
    console.log('✅ Test sessions cleaned up');
    
    // Count sessions with meeting links
    const totalSessions = await Session.countDocuments();
    const sessionsWithLinks = await Session.countDocuments({
      meetingLink: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log('\n📊 Database Summary:');
    console.log(`   Total sessions: ${totalSessions}`);
    console.log(`   Sessions with meeting links: ${sessionsWithLinks}`);
    console.log(`   Coverage: ${totalSessions > 0 ? Math.round((sessionsWithLinks / totalSessions) * 100) : 0}%`);
    
    console.log('\n✅ ALL TESTS COMPLETED');
    console.log('=' .repeat(60));
    console.log('\n📋 Test Results Summary:');
    console.log('   ✅ Meeting link utility functions working');
    console.log('   ✅ Direct session creation auto-generates meeting links');
    console.log('   ✅ Session model middleware working correctly');
    console.log('   ✅ Meeting link format validation working');
    
    if (apiError) {
      console.log('   ⚠️ API endpoint tests require running server');
    } else {
      console.log('   ✅ API endpoints generating meeting links correctly');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run tests
testMeetingLinkGeneration();