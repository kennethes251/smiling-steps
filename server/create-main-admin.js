require('dotenv').config({ path: '../.env' });
const { Sequelize, DataTypes } = require('sequelize');

const createAdmin = async () => {
  try {
    // Connect to PostgreSQL
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });

    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Load User model
    const User = require('./models/User')(sequelize, DataTypes);
    await sequelize.sync();

    // Create Main Admin
    const adminEmail = 'smilingsteps@gmail.com';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin already exists. Updating password...');
      existingAdmin.password = '33285322';
      existingAdmin.role = 'admin';
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      console.log('✅ Admin password updated');
    } else {
      const admin = await User.create({
        name: 'Smiling Steps Admin',
        email: adminEmail,
        password: '33285322',
        role: 'admin',
        isVerified: true
      });
      console.log('✅ Admin created:', admin.email);
    }

    console.log('\n🎉 Admin account ready!');
    console.log('\n📝 Login Credentials:');
    console.log('Email: smilingsteps@gmail.com');
    console.log('Password: 33285322');
    console.log('\n🔗 Login at: https://smiling-steps-frontend.onrender.com');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();