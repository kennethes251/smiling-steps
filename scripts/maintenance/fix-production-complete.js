const mongoose = require('mongoose');
require('dotenv').config();

const PRODUCTION_MONGODB_URI = "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

const User = require('./models/User');

const fixProductionComplete = async () => {
  try {
    console.log('🔗 Connecting to Production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to Production MongoDB');

    // Remove all existing users
    await User.deleteMany({});
    console.log('🧹 Cleared all existing users');

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@smilingsteps.com',
      password: 'admin123',
      role: 'admin',
      isEmailVerified: true
    });
    await admin.save();
    console.log('✅ Admin user created');

    // Create test psychologists for the public endpoint
    const psychologists = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isEmailVerified: true,
        psychologistDetails: {
          approvalStatus: 'approved',
          specializations: ['Anxiety Disorders', 'Depression', 'Cognitive Behavioral Therapy'],
          experience: '8 years',
          education: 'Ph.D. in Clinical Psychology, Harvard University',
          bio: 'Dr. Sarah Johnson specializes in anxiety and depression treatment using evidence-based cognitive behavioral therapy techniques.',
          rates: {
            individual: 2500,
            couples: 4000,
            family: 5000,
            group: 1800
          }
        }
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isEmailVerified: true,
        psychologistDetails: {
          approvalStatus: 'approved',
          specializations: ['Trauma Therapy', 'PTSD', 'EMDR'],
          experience: '12 years',
          education: 'Ph.D. in Clinical Psychology, Stanford University',
          bio: 'Dr. Michael Chen is a trauma specialist with extensive experience in EMDR and PTSD treatment.',
          rates: {
            individual: 3000,
            couples: 4500,
            family: 5500,
            group: 2000
          }
        }
      },
      {
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isEmailVerified: true,
        psychologistDetails: {
          approvalStatus: 'approved',
          specializations: ['Family Therapy', 'Couples Counseling', 'Relationship Issues'],
          experience: '10 years',
          education: 'Ph.D. in Marriage and Family Therapy, UCLA',
          bio: 'Dr. Emily Rodriguez focuses on family dynamics and relationship counseling with a systemic approach.',
          rates: {
            individual: 2800,
            couples: 4200,
            family: 4800,
            group: 1900
          }
        }
      },
      {
        name: 'Dr. James Wilson',
        email: 'james.wilson@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isEmailVerified: true,
        psychologistDetails: {
          approvalStatus: 'approved',
          specializations: ['Addiction Recovery', 'Substance Abuse', 'Group Therapy'],
          experience: '15 years',
          education: 'Ph.D. in Addiction Psychology, Johns Hopkins University',
          bio: 'Dr. James Wilson specializes in addiction recovery and has helped hundreds of clients overcome substance abuse.',
          rates: {
            individual: 3200,
            couples: 4800,
            family: 5200,
            group: 2200
          }
        }
      }
    ];

    for (const psychData of psychologists) {
      const psych = new User(psychData);
      await psych.save();
      console.log(`✅ Created psychologist: ${psychData.name}`);
    }

    // Verify all users
    const allUsers = await User.find({}, 'name email role isEmailVerified');
    console.log('\n👥 All users in production:');
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Verified: ${user.isEmailVerified}`);
    });

    console.log('\n🎉 Production Database Complete!');
    console.log('================================');
    console.log('👑 Admin Login: admin@smilingsteps.com / admin123');
    console.log('👨‍⚕️ Psychologists: 4 test psychologists created');
    console.log('📧 Ready for email verification testing');
    console.log('🌐 Public psychologists endpoint should now work');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

fixProductionComplete();