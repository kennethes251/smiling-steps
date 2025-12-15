const { Sequelize } = require('sequelize');

const connectDB = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('🚨 FATAL ERROR: DATABASE_URL is not defined in environment variables.');
    console.error('');
    console.error('📋 SETUP REQUIRED:');
    console.error('1. Create a PostgreSQL database in Render Dashboard');
    console.error('2. Copy the Internal Database URL');
    console.error('3. Set DATABASE_URL environment variable in your service');
    console.error('');
    console.error('🔗 Guide: https://render.com/docs/databases');
    console.error('');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to PostgreSQL...');
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        // Enable SSL for Render PostgreSQL (required for external connections)
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully.');
    
    return sequelize;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed. Please check your connection string and network access.');
    console.error('Error details:', err.message);
    setTimeout(() => process.exit(1), 1000);
  }
};

module.exports = connectDB;