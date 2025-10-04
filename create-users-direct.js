require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const User = require('./server/models/User');

const testUsers = [
  {
    name: 'Nancy Client',
    email: 'nancy@gmail.com',
    password: 'password123',
    role: 'client'
  },
  {
    name: 'Dr. John Smith',
    email: 'john@gmail.com',
    password: 'password123',
    role: 'psychologist'
  },
  {
    name: 'Test Client',
    email: 'client@test.com',
    password: 'password123',
    role: 'client'
  }
];

const createUsersDirectly = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Creating test users directly in database...\n');
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`ℹ️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Create new user (password will be hashed automatically by the pre-save middleware)
        const user = new User(userData);
        await user.save();
        
        console.log(`✅ ${userData.role.toUpperCase()} created successfully!`);
        console.log(`   Name: ${userData.name}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Role: ${userData.role}`);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Error creating ${userData.email}:`, error.message);
        console.log('');
      }
    }
    
    // Show all users
    const allUsers = await User.find({}).select('name email role');
    console.log('📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log('\n🎉 User creation completed!');
    console.log('\nYou can now login with:');
    testUsers.forEach(user => {
      console.log(`- ${user.email} / ${user.password} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

createUsersDirectly();