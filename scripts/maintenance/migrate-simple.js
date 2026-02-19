require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize } = require('./server/node_modules/sequelize');

// MongoDB Connection
const MONGODB_URI = "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

// PostgreSQL Connection
const DATABASE_URL = "postgresql://smiling_steps_user:YtwKd1qktaJhM6bb4rkyH2waSM8h7jyW@dpg-d3mbk115pdvs73b4ae9g-a.oregon-postgres.render.com/smiling_steps";

// Define Mongoose schemas directly
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['client', 'psychologist', 'admin'], default: 'client' },
  isVerified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  personalInfo: mongoose.Schema.Types.Mixed,
  healthInfo: mongoose.Schema.Types.Mixed,
  preferences: mongoose.Schema.Types.Mixed,
  psychologistDetails: mongoose.Schema.Types.Mixed,
  profileInfo: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  psychologist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionType: String,
  sessionDate: Date,
  status: String,
  meetingLink: String,
  sessionNotes: String,
  sessionProof: String,
  price: Number,
  sessionRate: Number,
  paymentStatus: String,
  paymentMethod: String,
  paymentProof: mongoose.Schema.Types.Mixed,
  paymentInstructions: String,
  approvedBy: String,
  approvedAt: Date,
  declineReason: String,
  cancellationReason: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Session = mongoose.model('Session', SessionSchema);

async function migrateData() {
  console.log('\n🔄 Starting PostgreSQL → MongoDB Migration\n');
  
  try {
    // Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected\n');
    
    // Connect to PostgreSQL
    console.log('2️⃣ Connecting to PostgreSQL...');
    const sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected\n');
    
    // Export Users
    console.log('3️⃣ Migrating Users...');
    const [users] = await sequelize.query('SELECT * FROM users WHERE active = true');
    console.log(`   Found ${users.length} users`);
    
    const userMap = {}; // Map PostgreSQL ID to MongoDB ID
    
    for (const pgUser of users) {
      try {
        const existingUser = await User.findOne({ email: pgUser.email });
        if (existingUser) {
          console.log(`   ⏭️  ${pgUser.email} already exists`);
          userMap[pgUser.id] = existingUser._id;
          continue;
        }
        
        const mongoUser = new User({
          name: pgUser.name,
          email: pgUser.email,
          password: pgUser.password,
          role: pgUser.role,
          isVerified: pgUser.isVerified || false,
          active: pgUser.active !== false,
          personalInfo: pgUser.personalInfo || {},
          healthInfo: pgUser.healthInfo || {},
          preferences: pgUser.preferences || {},
          psychologistDetails: pgUser.psychologistDetails || {},
          profileInfo: pgUser.profileInfo || {},
          createdAt: pgUser.createdAt,
          updatedAt: pgUser.updatedAt
        });
        
        await mongoUser.save({ validateBeforeSave: false });
        userMap[pgUser.id] = mongoUser._id;
        console.log(`   ✅ ${pgUser.email} (${pgUser.role})`);
      } catch (err) {
        console.log(`   ❌ Error: ${pgUser.email} - ${err.message}`);
      }
    }
    
    // Export Sessions
    console.log('\n4️⃣ Migrating Sessions...');
    const [sessions] = await sequelize.query('SELECT * FROM sessions');
    console.log(`   Found ${sessions.length} sessions`);
    
    for (const pgSession of sessions) {
      try {
        const clientId = userMap[pgSession.clientId];
        const psychologistId = userMap[pgSession.psychologistId];
        
        if (!clientId || !psychologistId) {
          console.log(`   ⏭️  Skipping session (user not found)`);
          continue;
        }
        
        const mongoSession = new Session({
          client: clientId,
          psychologist: psychologistId,
          sessionType: pgSession.sessionType,
          sessionDate: pgSession.sessionDate,
          status: pgSession.status,
          meetingLink: pgSession.meetingLink,
          sessionNotes: pgSession.sessionNotes,
          sessionProof: pgSession.sessionProof,
          price: pgSession.price,
          sessionRate: pgSession.sessionRate,
          paymentStatus: pgSession.paymentStatus,
          paymentMethod: pgSession.paymentMethod,
          paymentProof: pgSession.paymentProof,
          paymentInstructions: pgSession.paymentInstructions,
          approvedBy: pgSession.approvedBy,
          approvedAt: pgSession.approvedAt,
          declineReason: pgSession.declineReason,
          cancellationReason: pgSession.cancellationReason,
          createdAt: pgSession.createdAt,
          updatedAt: pgSession.updatedAt
        });
        
        await mongoSession.save();
        console.log(`   ✅ ${pgSession.sessionType} (${pgSession.status})`);
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
    
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Sessions: ${await Session.countDocuments()}`);
    console.log('\n🎉 All data migrated successfully!\n');
    
    await sequelize.close();
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
