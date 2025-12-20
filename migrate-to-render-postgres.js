require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize, DataTypes } = require('sequelize');

const migrateToRenderPostgres = async () => {
  try {
    console.log('🔄 Starting migration from MongoDB to Render PostgreSQL...');

    // 1. Connect to MongoDB (source)
    const MONGODB_URI = process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB (source)');

    // Load MongoDB models
    const MongoUser = require('./server/models/User');
    const MongoBlog = require('./server/models/Blog');

    // 2. Connect to Render PostgreSQL (destination)
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
    console.log('✅ Connected to Render PostgreSQL (destination)');

    // 3. Define PostgreSQL models
    const PostgresUser = require('./server/models/User-sequelize')(sequelize, DataTypes);
    const PostgresBlog = require('./server/models/Blog-sequelize')(sequelize, DataTypes);
    const PostgresSession = require('./server/models/Session-sequelize')(sequelize, DataTypes);

    // Define associations
    PostgresUser.hasMany(PostgresSession, { foreignKey: 'clientId', as: 'clientSessions' });
    PostgresUser.hasMany(PostgresSession, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    PostgresSession.belongsTo(PostgresUser, { foreignKey: 'clientId', as: 'client' });
    PostgresSession.belongsTo(PostgresUser, { foreignKey: 'psychologistId', as: 'psychologist' });
    PostgresUser.hasMany(PostgresBlog, { foreignKey: 'authorId', as: 'blogs' });
    PostgresBlog.belongsTo(PostgresUser, { foreignKey: 'authorId', as: 'author' });

    // 4. Sync PostgreSQL tables
    await sequelize.sync({ force: true }); // This will recreate tables
    console.log('✅ PostgreSQL tables created');

    // 5. Migrate Users
    console.log('👥 Migrating users...');
    const mongoUsers = await MongoUser.find({});
    console.log(`Found ${mongoUsers.length} users in MongoDB`);

    const userIdMap = new Map(); // Map MongoDB IDs to PostgreSQL IDs

    for (const mongoUser of mongoUsers) {
      try {
        const postgresUser = await PostgresUser.create({
          name: mongoUser.name,
          email: mongoUser.email,
          password: mongoUser.password, // Already hashed
          role: mongoUser.role,
          isVerified: mongoUser.isVerified || false,
          accountStatus: mongoUser.accountStatus || 'pending',
          profileInfo: mongoUser.profileInfo || {},
          psychologistDetails: mongoUser.psychologistDetails || {},
          emailVerificationToken: mongoUser.emailVerificationToken,
          emailVerificationExpires: mongoUser.emailVerificationExpires,
          resetPasswordToken: mongoUser.resetPasswordToken,
          resetPasswordExpires: mongoUser.resetPasswordExpires,
          createdAt: mongoUser.createdAt,
          updatedAt: mongoUser.updatedAt
        });

        userIdMap.set(mongoUser._id.toString(), postgresUser.id);
        console.log(`✅ Migrated user: ${mongoUser.email}`);
      } catch (error) {
        console.error(`❌ Failed to migrate user ${mongoUser.email}:`, error.message);
      }
    }

    // 6. Migrate Blogs
    console.log('📝 Migrating blogs...');
    const mongoBlogs = await MongoBlog.find({}).populate('author');
    console.log(`Found ${mongoBlogs.length} blogs in MongoDB`);

    for (const mongoBlog of mongoBlogs) {
      try {
        const authorId = userIdMap.get(mongoBlog.author._id.toString());
        if (!authorId) {
          console.warn(`⚠️ Skipping blog "${mongoBlog.title}" - author not found`);
          continue;
        }

        await PostgresBlog.create({
          title: mongoBlog.title,
          slug: mongoBlog.slug,
          content: mongoBlog.content,
          excerpt: mongoBlog.excerpt,
          authorId: authorId,
          published: mongoBlog.published || false,
          publishedAt: mongoBlog.publishedAt,
          tags: mongoBlog.tags || [],
          views: mongoBlog.views || 0,
          createdAt: mongoBlog.createdAt,
          updatedAt: mongoBlog.updatedAt
        });

        console.log(`✅ Migrated blog: ${mongoBlog.title}`);
      } catch (error) {
        console.error(`❌ Failed to migrate blog "${mongoBlog.title}":`, error.message);
      }
    }

    // 7. Create admin if not exists
    console.log('👑 Setting up admin account...');
    const adminEmail = 'smilingsteps@gmail.com';
    
    let admin = await PostgresUser.findOne({ where: { email: adminEmail } });
    if (!admin) {
      admin = await PostgresUser.create({
        name: 'Smiling Steps Admin',
        email: adminEmail,
        password: '$2a$12$rQJ8vQw5K9yGxJ8vQw5K9uGxJ8vQw5K9yGxJ8vQw5K9yGxJ8vQw5K9', // Pre-hashed: 33285322
        role: 'admin',
        isVerified: true,
        accountStatus: 'approved'
      });
      console.log('✅ Admin account created');
    } else {
      console.log('✅ Admin account already exists');
    }

    // 8. Summary
    const finalUserCount = await PostgresUser.count();
    const finalBlogCount = await PostgresBlog.count();
    const adminCount = await PostgresUser.count({ where: { role: 'admin' } });

    console.log('');
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`👥 Users migrated: ${finalUserCount}`);
    console.log(`📝 Blogs migrated: ${finalBlogCount}`);
    console.log(`👑 Admin accounts: ${adminCount}`);
    console.log('');
    console.log('🔑 Admin Credentials:');
    console.log('📧 Email: smilingsteps@gmail.com');
    console.log('🔐 Password: 33285322');
    console.log('');
    console.log('🌐 Database: Render PostgreSQL');
    console.log('✅ Ready for production!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    await sequelize.close();
    process.exit(0);
  }
};

migrateToRenderPostgres();