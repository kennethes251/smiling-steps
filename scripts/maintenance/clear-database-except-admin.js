const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Load User model
const User = require('./server/models/User');

const clearDatabaseExceptAdmin = async () => {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Connect to database
    await connectDB();
    
    // Find the admin user to preserve
    const adminUser = await User.findOne({ 
      email: 'smilingsteps@gmail.com',
      role: 'admin'
    });
    
    if (!adminUser) {
      console.log('⚠️ Admin user not found. Creating admin user...');
      
      // Create the admin user
      const newAdmin = await User.create({
        name: 'Smiling Steps Admin',
        email: 'smilingsteps@gmail.com',
        password: '33285322', // Will be hashed by pre-save middleware
        role: 'admin',
        isVerified: true,
        lastLogin: new Date()
      });
      
      console.log('✅ Admin user created:', {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      });
    } else {
      console.log('✅ Admin user found:', {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      });
    }
    
    // Count total users before cleanup
    const totalUsersBefore = await User.countDocuments();
    console.log(`📊 Total users before cleanup: ${totalUsersBefore}`);
    
    // Delete all users except the admin
    const deleteResult = await User.deleteMany({
      email: { $ne: 'smilingsteps@gmail.com' }
    });
    
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} non-admin users`);
    
    // Count remaining users
    const totalUsersAfter = await User.countDocuments();
    console.log(`📊 Total users after cleanup: ${totalUsersAfter}`);
    
    // Also clear other collections if they exist
    try {
      const Session = require('./server/models/Session');
      const sessionDeleteResult = await Session.deleteMany({});
      console.log(`🗑️ Deleted ${sessionDeleteResult.deletedCount} sessions`);
    } catch (error) {
      console.log('ℹ️ No sessions to delete or Session model not available');
    }
    
    try {
      const Blog = require('./server/models/Blog');
      const blogDeleteResult = await Blog.deleteMany({});
      console.log(`🗑️ Deleted ${blogDeleteResult.deletedCount} blogs`);
    } catch (error) {
      console.log('ℹ️ No blogs to delete or Blog model not available');
    }
    
    console.log('🎉 Database cleanup completed successfully!');
    console.log('');
    console.log('👤 Admin Login Credentials:');
    console.log('   Email: smilingsteps@gmail.com');
    console.log('   Password: 33285322');
    console.log('');
    console.log('🚀 Ready for testing!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
    process.exit(0);
  }
};

// Run the cleanup
clearDatabaseExceptAdmin();