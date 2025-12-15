/**
 * Migration script to add meeting links to existing sessions that don't have them
 * This ensures all video call sessions have meeting links for the video call feature
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { generateMeetingLink } = require('../utils/meetingLinkGenerator');

// Import models
const Session = require('../models/Session');

async function addMeetingLinksToSessions() {
  try {
    console.log('🔄 Adding meeting links to existing sessions...\n');
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find sessions without meeting links
    const sessionsWithoutLinks = await Session.find({
      $or: [
        { meetingLink: { $exists: false } },
        { meetingLink: null },
        { meetingLink: '' }
      ]
    });
    
    console.log(`📊 Found ${sessionsWithoutLinks.length} sessions without meeting links\n`);
    
    if (sessionsWithoutLinks.length === 0) {
      console.log('✅ All sessions already have meeting links!');
      return;
    }
    
    let updated = 0;
    let errors = 0;
    
    for (const session of sessionsWithoutLinks) {
      try {
        // Generate meeting link
        session.meetingLink = generateMeetingLink();
        
        // Set isVideoCall to true if not explicitly set to false
        if (session.isVideoCall === undefined || session.isVideoCall === null) {
          session.isVideoCall = true;
        }
        
        await session.save();
        updated++;
        
        console.log(`✅ Session ${session._id}: ${session.meetingLink}`);
      } catch (error) {
        errors++;
        console.log(`❌ Error updating session ${session._id}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Sessions updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total processed: ${sessionsWithoutLinks.length}`);
    
    if (updated > 0) {
      console.log('\n✅ Meeting links successfully added to existing sessions!');
      console.log('🎥 All sessions are now ready for video calls');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration if called directly
if (require.main === module) {
  addMeetingLinksToSessions();
}

module.exports = { addMeetingLinksToSessions };