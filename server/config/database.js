const { Sequelize } = require('sequelize');

const connectDB = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('FATAL ERROR: DATABASE_URL is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to PostgreSQL...');
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
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