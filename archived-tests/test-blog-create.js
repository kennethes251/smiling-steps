const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Update with your admin credentials
const ADMIN_EMAIL = 'admin@smilingsteps.com';
const ADMIN_PASSWORD = 'admin123';

async function testBlogCreation() {
  try {
    // 1. Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // 2. Create a blog
    console.log('\n📝 Creating blog...');
    const blogData = {
      title: 'Test Blog Post',
      excerpt: 'This is a test blog post excerpt',
      content: '# Test Blog\n\nThis is test content.',
      category: 'Mental Health',
      tags: ['test', 'mental-health'],
      status: 'draft',
      featured: false
    };

    const createResponse = await axios.post(
      `${BASE_URL}/admin/blogs`,
      blogData,
      {
        headers: { 'x-auth-token': token }
      }
    );

    console.log('✅ Blog created successfully!');
    console.log('Blog ID:', createResponse.data.blog._id);
    console.log('Blog Title:', createResponse.data.blog.title);

    // 3. Fetch all blogs
    console.log('\n📋 Fetching all blogs...');
    const fetchResponse = await axios.get(`${BASE_URL}/admin/blogs`, {
      headers: { 'x-auth-token': token }
    });

    console.log(`✅ Found ${fetchResponse.data.blogs.length} blogs`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testBlogCreation();
