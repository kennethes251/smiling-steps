const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const createTestUsers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@smilingsteps.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@smilingsteps.com',
        password: 'admin123',
        role: 'admin',
        isEmailVerified: true
      });
      await admin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create test psychologist
    const psychExists = await User.findOne({ email: 'psychologist@smilingsteps.com' });
    if (!psychExists) {
      const psychologist = new User({
        name: 'Dr. Test Psychologist',
        email: 'psychologist@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isEmailVerified: true,
        isApproved: true,
        specialization: 'Clinical Psychology',
        experience: '5 years',
        bio: 'Experienced clinical psychologist specializing in anxiety and depression.',
        hourlyRate: 50
      });
      await psychologist.save();
      console.log('✅ Test psychologist created');
    } else {
      console.log('✅ Test psychologist already exists');
    }

    // Create test client
    const clientExists = await User.findOne({ email: 'client@smilingsteps.com' });
    if (!clientExists) {
      const client = new User({
        name: 'Test Client',
        email: 'client@smilingsteps.com',
        password: 'client123',
        role: 'client',
        isEmailVerified: true
      });
      await client.save();
      console.log('✅ Test client created');
    } else {
      console.log('✅ Test client already exists');
    }

    console.log('\n🎉 Test users ready!');
    console.log('Admin: admin@smilingsteps.com / admin123');
    console.log('Psychologist: psychologist@smilingsteps.com / psych123');
    console.log('Client: client@smilingsteps.com / client123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createTestUsers();