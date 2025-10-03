require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const User = require('./server/models/User');

const resetDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Show current users count
    const currentCount = await User.countDocuments();
    console.log(`📊 Current users in database: ${currentCount}`);

    // Ask for confirmation (in a real scenario, you'd want user input)
    console.log('🗑️  Deleting all users...');
    
    // Delete all users
    const deleteResult = await User.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} users`);

    // Verify database is empty
    const remainingCount = await User.countDocuments();
    console.log(`📊 Remaining users: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('🎉 Database successfully reset!');
      console.log('');
      console.log('You can now:');
      console.log('1. Register new users through the UI at http://localhost:3000/register');
      console.log('2. Run "node create-test-user.js" to create a test user');
      console.log('3. Use the registration form to create fresh accounts');
    } else {
      console.log('⚠️  Some users may still remain in the database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

resetDatabase();