require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    console.log('📡 Connecting to PostgreSQL...');
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Initialize models
    const User = require('./models/User-sequelize')(sequelize, DataTypes);
    const Session = require('./models/Session-sequelize')(sequelize, DataTypes);
    const Blog = require('./models/Blog-sequelize')(sequelize, DataTypes);
    
    // Define associations
    User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
    User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
    
    // Blog associations
    User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
    Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

    console.log('🔄 Syncing database tables...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database tables created/updated successfully');

    // Create test user
    console.log('👤 Creating test user...');
    const testUser = await User.create({
      name: 'Nancy Client',
      email: 'nancy@gmail.com',
      password: 'password123',
      role: 'client',
      isVerified: true
    });
    
    console.log('✅ Test user created:', testUser.email);
    console.log('🎉 Database initialization complete!');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Full error:', error);
  }
};

initDatabase();