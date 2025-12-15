require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Database connected successfully.');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: 'admin@smilingsteps.co.ke'
    });

    if (existingAdmin) {
      console.log('❌ Admin user already exists with email: admin@smilingsteps.co.ke');
      console.log('🔑 You can login with: admin@smilingsteps.co.ke / admin123');
      process.exit(0);
    }

    // Create admin user (password will be hashed by pre-save hook)
    const admin = new User({
      name: 'Kenneth Esilo',
      email: 'admin@smilingsteps.co.ke',
      password: 'admin123', // Don't hash here - let the pre-save hook do it
      role: 'admin',
      isVerified: true,
      bio: 'Founder and Administrator of Smiling Steps',
      specializations: ['Platform Administration', 'Content Management']
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@smilingsteps.co.ke');
    console.log('🔑 Password: admin123');
    console.log('🌐 Access Developer Dashboard at: http://localhost:3000/developer-dashboard');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createAdmin();