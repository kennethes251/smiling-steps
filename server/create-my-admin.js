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

    // Your admin credentials
    const adminEmail = 'kennethesilo@gmail.com'; // Replace with your email
    const adminPassword = 'admin123'; // You can change this
    
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      // Update existing user to admin
      existingAdmin.role = 'admin';
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      console.log('✅ Updated existing user to admin:', existingAdmin.email);
    } else {
      // Create new admin
      const admin = await User.create({
        name: 'Kenneth Esilo',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isVerified: true
      });
      console.log('✅ Admin created:', admin.email);
    }

    console.log('\n🎉 Admin setup complete!');
    console.log('\n📝 Login Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\n⚠️  Please change your password after first login!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();