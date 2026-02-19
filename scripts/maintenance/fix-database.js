<<<<<<< HEAD
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

const fixDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Fixing user data...');
    
    // Fix role case issues and NaN loginAttempts
    const result = await User.updateMany(
      {}, 
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null
        },
        $unset: {
          lockUntil: ""
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);

    // Fix role case issues specifically
    const roleResult = await User.updateMany(
      { role: { $regex: /^Psychologist$/i } },
      { $set: { role: 'psychologist' } }
    );

    console.log(`✅ Fixed ${roleResult.modifiedCount} psychologist role cases`);

    // Show current users
    const users = await User.find({}).select('name email role loginAttempts lockUntil');
    console.log('\n📋 Current users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - LoginAttempts: ${user.loginAttempts}`);
    });

    console.log('\n✅ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

=======
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

const fixDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Fixing user data...');
    
    // Fix role case issues and NaN loginAttempts
    const result = await User.updateMany(
      {}, 
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null
        },
        $unset: {
          lockUntil: ""
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);

    // Fix role case issues specifically
    const roleResult = await User.updateMany(
      { role: { $regex: /^Psychologist$/i } },
      { $set: { role: 'psychologist' } }
    );

    console.log(`✅ Fixed ${roleResult.modifiedCount} psychologist role cases`);

    // Show current users
    const users = await User.find({}).select('name email role loginAttempts lockUntil');
    console.log('\n📋 Current users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - LoginAttempts: ${user.loginAttempts}`);
    });

    console.log('\n✅ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

>>>>>>> 54f043a91682edcc5659e6f2a6d44c4e4425ada5
fixDatabase();