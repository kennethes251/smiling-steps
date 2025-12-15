require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('./server/models/Blog');

async function checkBlogs() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const allBlogs = await Blog.find();
    console.log(`📊 Total blogs in database: ${allBlogs.length}\n`);

    const publishedBlogs = await Blog.find({ published: true });
    console.log(`✅ Published blogs: ${publishedBlogs.length}`);

    const unpublishedBlogs = await Blog.find({ published: false });
    console.log(`❌ Unpublished blogs: ${unpublishedBlogs.length}\n`);

    if (allBlogs.length > 0) {
      console.log('📝 Blog details:\n');
      allBlogs.forEach((blog, index) => {
        console.log(`${index + 1}. ${blog.title}`);
        console.log(`   Published: ${blog.published ? '✅ Yes' : '❌ No'}`);
        console.log(`   Category: ${blog.category}`);
        console.log(`   Slug: ${blog.slug}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No blogs found in database!');
      console.log('\n💡 To create sample blogs, run:');
      console.log('   node server/create-sample-blogs.js');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkBlogs();
