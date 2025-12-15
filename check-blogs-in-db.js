require('dotenv').config({ path: './server/.env' });
const { Sequelize } = require('sequelize');

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

const Blog = require('./server/models/Blog-sequelize')(sequelize, Sequelize.DataTypes);
const User = require('./server/models/User-sequelize')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

async function checkBlogs() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const blogs = await Blog.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Found ${blogs.length} blog(s) in database:\n`);

    if (blogs.length === 0) {
      console.log('❌ No blogs found in database.');
      console.log('\nThis means:');
      console.log('1. No blogs have been created yet');
      console.log('2. You need to create your first blog post');
      console.log('\nTo create a blog:');
      console.log('1. Login as admin at http://localhost:3000/login');
      console.log('2. Go to http://localhost:3000/admin/blogs');
      console.log('3. Click "Create New Blog Post"');
    } else {
      blogs.forEach((blog, index) => {
        console.log(`${index + 1}. "${blog.title}"`);
        console.log(`   Slug: ${blog.slug}`);
        console.log(`   Category: ${blog.category}`);
        console.log(`   Published: ${blog.published ? '✅ Yes' : '❌ No'}`);
        console.log(`   Views: ${blog.views}`);
        console.log(`   Author: ${blog.author?.name || 'Unknown'}`);
        console.log(`   Created: ${new Date(blog.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBlogs();
