/**
 * Verify Test Users
 * Marks test users as verified so they can log in
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User model (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function verifyTestUsers() {
  try {
    await connectDB();
    
    console.log('🔍 Finding unverified users...');
    
    // Find all unverified users
    const unverifiedUsers = await User.find({ isVerified: false });
    console.log(`Found ${unverifiedUsers.length} unverified users`);
    
    if (unverifiedUsers.length === 0) {
      console.log('✅ All users are already verified!');
      return;
    }
    
    // Verify all users
    const result = await User.updateMany(
      { isVerified: false },
      { $set: { isVerified: true } }
    );
    
    console.log(`✅ Verified ${result.modifiedCount} users`);
    
    // Show verified users
    const verifiedUsers = await User.find({ isVerified: true }).select('name email role');
    console.log('\n📋 Verified users you can now log in with:');
    verifiedUsers.forEach(user => {
      console.log(`  📧 ${user.email} (${user.name}) - ${user.role}`);
      console.log(`     Password: password123`);
    });
    
    console.log('\n🎉 You can now log in with any of these accounts!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyTestUsers();