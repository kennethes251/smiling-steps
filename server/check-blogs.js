const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smiling_steps', {
  dialect: 'postgresql',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Import Blog model
const Blog = require('./models/Blog-sequelize')(sequelize, Sequelize.DataTypes);

async function checkBlogs() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected!\n');

    console.log('📊 Checking for existing blogs...\n');
    
    const blogs = await Blog.findAll({
      order: [['createdAt', 'DESC']]
    });

    if (blogs.length === 0) {
      console.log('❌ No blogs found in database.');
      console.log('\nThis could mean:');
      console.log('1. No blogs have been created yet');
      console.log('2. The Blog table needs to be synced');
      console.log('3. Previous blogs were not saved\n');
    } else {
      console.log(`✅ Found ${blogs.length} blog(s) in database:\n`);
      
      blogs.forEach((blog, index) => {
        console.log(`${index + 1}. "${blog.title}"`);
        console.log(`   - Slug: ${blog.slug}`);
        console.log(`   - Category: ${blog.category}`);
        console.log(`   - Published: ${blog.published ? '✅ Yes' : '❌ No'}`);
        console.log(`   - Views: ${blog.views}`);
        console.log(`   - Created: ${new Date(blog.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    // Check table structure
    console.log('📋 Checking Blog table structure...');
    const tableInfo = await sequelize.getQueryInterface().describeTable('Blogs');
    console.log('✅ Blog table exists with columns:', Object.keys(tableInfo).join(', '));

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('relation "Blogs" does not exist')) {
      console.log('\n⚠️  Blog table does not exist!');
      console.log('You need to sync the database. Run: node server/index.js');
    }
  } finally {
    await sequelize.close();
  }
}

checkBlogs();
