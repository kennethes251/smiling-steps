require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize, DataTypes } = require('sequelize');

// MongoDB connection (old)
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0");
    console.log('✅ MongoDB connected for migration');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// PostgreSQL connection (new)
const connectPostgreSQL = async () => {
  try {
    const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://localhost:5432/smiling_steps_dev', {
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
    console.log('✅ PostgreSQL connected for migration');
    return sequelize;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
};

// Define basic PostgreSQL User model for migration
const defineUserModel = (sequelize) => {
  return sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('client', 'psychologist', 'admin'),
      defaultValue: 'client'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Store complex data as JSON for now
    psychologistDetails: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    tableName: 'users'
  });
};

const migrateData = async () => {
  console.log('🚀 Starting migration from MongoDB to PostgreSQL...');
  
  // Connect to both databases
  await connectMongoDB();
  const sequelize = await connectPostgreSQL();
  
  // Define models
  const PostgresUser = defineUserModel(sequelize);
  
  // Sync PostgreSQL tables
  await sequelize.sync({ force: true });
  console.log('✅ PostgreSQL tables created');
  
  // Load MongoDB models
  const MongoUser = require('./models/User');
  
  try {
    // Migrate Users
    const mongoUsers = await MongoUser.find({}).select('+password');
    console.log(`📊 Found ${mongoUsers.length} users to migrate`);
    
    for (const mongoUser of mongoUsers) {
      const userData = {
        name: mongoUser.name,
        email: mongoUser.email,
        password: mongoUser.password,
        role: mongoUser.role,
        isVerified: mongoUser.isVerified || false,
        active: mongoUser.active !== false,
        psychologistDetails: mongoUser.psychologistDetails || {},
        preferences: {
          preferredName: mongoUser.preferredName,
          phone: mongoUser.phone,
          dateOfBirth: mongoUser.dateOfBirth,
          gender: mongoUser.gender,
          address: mongoUser.address,
          city: mongoUser.city,
          state: mongoUser.state,
          zipCode: mongoUser.zipCode,
          country: mongoUser.country,
          occupation: mongoUser.occupation,
          education: mongoUser.education,
          emergencyContact: mongoUser.emergencyContact,
          emergencyPhone: mongoUser.emergencyPhone,
          medicalConditions: mongoUser.medicalConditions,
          medications: mongoUser.medications,
          allergies: mongoUser.allergies,
          therapyGoals: mongoUser.therapyGoals,
          preferredTherapyType: mongoUser.preferredTherapyType,
          preferredLanguage: mongoUser.preferredLanguage,
          timeZone: mongoUser.timeZone,
          profileVisibility: mongoUser.profileVisibility,
          emailNotifications: mongoUser.emailNotifications,
          smsNotifications: mongoUser.smsNotifications,
          reminderNotifications: mongoUser.reminderNotifications,
          bio: mongoUser.bio,
          profilePicture: mongoUser.profilePicture
        }
      };
      
      await PostgresUser.create(userData);
    }
    
    console.log('✅ User migration completed');
    
    // Close connections
    await mongoose.connection.close();
    await sequelize.close();
    
    console.log('🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('1. Update your .env file to use DATABASE_URL instead of MONGODB_URI');
    console.log('2. Install PostgreSQL dependencies: npm install pg sequelize');
    console.log('3. Remove MongoDB dependencies: npm uninstall mongoose');
    console.log('4. Update your models to use Sequelize');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };