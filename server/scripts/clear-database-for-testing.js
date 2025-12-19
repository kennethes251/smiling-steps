const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isVerified: Boolean,
  lastLogin: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const clearDatabase = async () => {
  try {
    console.log('🧹 Starting database cleanup for testing...');
    
    await connectDB();
    
    // Count users before
    const usersBefore = await User.countDocuments();
    console.log(`📊 Users before cleanup: ${usersBefore}`);
    
    // Check if admin exists
    const adminExists = await User.findOne({ 
      email: 'smilingsteps@gmail.com' 
    });
    
    if (adminExists) {
      console.log('✅ Admin user found, preserving...');
      
      // Delete all users except admin
      const result = await User.deleteMany({
        email: { $ne: 'smilingsteps@gmail.com' }
      });
      
      console.log(`🗑️ Deleted ${result.deletedCount} non-admin users`);
    } else {
      console.log('⚠️ Admin user not found, clearing all and creating admin...');
      
      // Clear all users
      await User.deleteMany({});
      
      // Create admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('33285322', 12);
      
      const admin = new User({
        name: 'Smiling Steps Admin',
        email: 'smilingsteps@gmail.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        lastLogin: new Date()
      });
      
      await admin.save();
      console.log('✅ Admin user created');
    }
    
    // Clear other collections
    try {
      await mongoose.connection.db.collection('sessions').deleteMany({});
      console.log('🗑️ Cleared sessions collection');
    } catch (e) {
      console.log('ℹ️ Sessions collection not found or already empty');
    }
    
    try {
      await mongoose.connection.db.collection('blogs').deleteMany({});
      console.log('🗑️ Cleared blogs collection');
    } catch (e) {
      console.log('ℹ️ Blogs collection not found or already empty');
    }
    
    // Final count
    const usersAfter = await User.countDocuments();
    console.log(`📊 Users after cleanup: ${usersAfter}`);
    
    console.log('');
    console.log('🎉 Database cleanup completed!');
    console.log('');
    console.log('👤 Admin Login Credentials:');
    console.log('   Email: smilingsteps@gmail.com');
    console.log('   Password: 33285322');
    console.log('   Role: admin');
    console.log('');
    console.log('🚀 Database is now ready for testing!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
    process.exit(0);
  }
};

clearDatabase();