import { connect, connection } from 'mongoose';
import User, { findOne } from './models/User';
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully.');

    // Check if admin already exists
    const existingAdmin = await findOne({
      email: 'admin@smilingsteps.com'
    });

    if (existingAdmin) {
      console.log('❌ Admin user already exists with email: admin@smilingsteps.com');
      console.log('🔑 You can login with: admin@smilingsteps.com / admin123');
      process.exit(1);
    }

    // Create admin user (password will be hashed by pre-save hook)
    const admin = new User({
      name: 'Kenneth Esilo',
      email: 'admin@smilingsteps.com',
      password: 'admin123', // Don't hash here - let the pre-save hook do it
      role: 'admin',
      isVerified: true,
      bio: 'Founder and Administrator of Smiling Steps',
      specializations: ['Platform Administration', 'Content Management']
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@smilingsteps.com');
    console.log('🔑 Password: admin123');
    console.log('🌐 Access Developer Dashboard at: http://localhost:3000/developer-dashboard');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await connection.close();
    process.exit(0);
  }
};

createAdmin();