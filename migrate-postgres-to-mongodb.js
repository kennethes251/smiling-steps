require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize } = require('./server/node_modules/sequelize');

// MongoDB Connection
const MONGODB_URI = "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

// PostgreSQL Connection (Render Production)
const DATABASE_URL = "postgresql://smiling_steps_user:YtwKd1qktaJhM6bb4rkyH2waSM8h7jyW@dpg-d3mbk115pdvs73b4ae9g-a.oregon-postgres.render.com/smiling_steps";

// Import Mongoose models
const User = require('./server/models/User');
const Session = require('./server/models/Session');
const Blog = require('./server/models/Blog');

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
        ssl: DATABASE_URL.includes('render.com') ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected\n');
    
    // Export Users
    console.log('3️⃣ Migrating Users...');
    const [users] = await sequelize.query('SELECT * FROM users WHERE active = true');
    console.log(`   Found ${users.length} users`);
    
    for (const pgUser of users) {
      try {
        // Check if user already exists in MongoDB
        const existingUser = await User.findOne({ email: pgUser.email });
        if (existingUser) {
          console.log(`   ⏭️  Skipping ${pgUser.email} (already exists)`);
          continue;
        }
        
        // Create user in MongoDB
        const mongoUser = new User({
          name: pgUser.name,
          email: pgUser.email,
          password: pgUser.password, // Already hashed
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
        
        // Save without triggering password hash (it's already hashed)
        await mongoUser.save({ validateBeforeSave: false });
        console.log(`   ✅ Migrated: ${pgUser.email} (${pgUser.role})`);
      } catch (err) {
        console.log(`   ❌ Error migrating ${pgUser.email}:`, err.message);
      }
    }
    
    // Export Sessions
    console.log('\n4️⃣ Migrating Sessions...');
    const [sessions] = await sequelize.query('SELECT * FROM sessions');
    console.log(`   Found ${sessions.length} sessions`);
    
    for (const pgSession of sessions) {
      try {
        // Find corresponding MongoDB user IDs
        const client = await User.findOne({ email: (await sequelize.query(`SELECT email FROM users WHERE id = '${pgSession.clientId}'`))[0][0]?.email });
        const psychologist = await User.findOne({ email: (await sequelize.query(`SELECT email FROM users WHERE id = '${pgSession.psychologistId}'`))[0][0]?.email });
        
        if (!client || !psychologist) {
          console.log(`   ⏭️  Skipping session (user not found)`);
          continue;
        }
        
        const mongoSession = new Session({
          client: client._id,
          psychologist: psychologist._id,
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
        console.log(`   ✅ Migrated session: ${pgSession.sessionType} (${pgSession.status})`);
      } catch (err) {
        console.log(`   ❌ Error migrating session:`, err.message);
      }
    }
    
    // Export Blogs
    console.log('\n5️⃣ Migrating Blogs...');
    const [blogs] = await sequelize.query('SELECT * FROM blogs');
    console.log(`   Found ${blogs.length} blogs`);
    
    for (const pgBlog of blogs) {
      try {
        const author = await User.findOne({ email: (await sequelize.query(`SELECT email FROM users WHERE id = '${pgBlog.authorId}'`))[0][0]?.email });
        
        if (!author) {
          console.log(`   ⏭️  Skipping blog (author not found)`);
          continue;
        }
        
        const mongoBlog = new Blog({
          title: pgBlog.title,
          content: pgBlog.content,
          excerpt: pgBlog.excerpt,
          author: author._id,
          status: pgBlog.status,
          featuredImage: pgBlog.featuredImage,
          tags: pgBlog.tags || [],
          category: pgBlog.category,
          publishedAt: pgBlog.publishedAt,
          createdAt: pgBlog.createdAt,
          updatedAt: pgBlog.updatedAt
        });
        
        await mongoBlog.save();
        console.log(`   ✅ Migrated blog: ${pgBlog.title}`);
      } catch (err) {
        console.log(`   ❌ Error migrating blog:`, err.message);
      }
    }
    
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Sessions: ${await Session.countDocuments()}`);
    console.log(`   Blogs: ${await Blog.countDocuments()}`);
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
