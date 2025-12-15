require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

async function autoApproveExistingPsychologists() {
  console.log('\n🔄 Auto-Approving All Existing Psychologists\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all psychologists
    const psychologists = await User.find({ role: 'psychologist' });
    
    console.log(`Found ${psychologists.length} psychologists\n`);
    
    for (const psych of psychologists) {
      const currentStatus = psych.psychologistDetails?.approvalStatus || 'pending';
      const currentActive = psych.psychologistDetails?.isActive;
      
      console.log(`📋 ${psych.name} (${psych.email})`);
      console.log(`   Current: ${currentStatus}, Active: ${currentActive !== false ? 'Yes' : 'No'}`);
      
      // Update to approved and active
      if (!psych.psychologistDetails) {
        psych.psychologistDetails = {};
      }
      psych.psychologistDetails.approvalStatus = 'approved';
      psych.psychologistDetails.isActive = true;
      psych.markModified('psychologistDetails');
      await psych.save();
      
      console.log(`   ✅ Updated to: approved, Active: Yes\n`);
    }
    
    console.log('🎉 All psychologists are now approved and active!\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

autoApproveExistingPsychologists();
