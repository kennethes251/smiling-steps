require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('./models/Blog');
const User = require('./models/User');

const sampleBlogs = [
  {
    title: 'Understanding Mental Health: A Comprehensive Guide',
    excerpt: 'Mental health is just as important as physical health. Learn about the basics of mental wellness and how to maintain it.',
    content: `<h2>What is Mental Health?</h2>
<p>Mental health includes our emotional, psychological, and social well-being. It affects how we think, feel, and act. It also helps determine how we handle stress, relate to others, and make choices.</p>

<h2>Why Mental Health Matters</h2>
<p>Mental health is important at every stage of life, from childhood and adolescence through adulthood. Over the course of your life, if you experience mental health problems, your thinking, mood, and behavior could be affected.</p>

<h2>Signs of Good Mental Health</h2>
<ul>
<li>Feeling good about yourself</li>
<li>Having healthy relationships</li>
<li>Being able to manage your emotions</li>
<li>Coping with stress effectively</li>
</ul>`,
    category: 'Mental Health',
    tags: ['mental health', 'wellness', 'self-care'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800'
  },
  {
    title: '5 Steps to Start Your Recovery Journey',
    excerpt: 'Recovery is a journey, not a destination. Here are five essential steps to help you begin your path to healing.',
    content: `<h2>Step 1: Acknowledge the Problem</h2>
<p>The first step in recovery is recognizing that there is a problem and that you need help. This takes courage and honesty.</p>

<h2>Step 2: Seek Professional Help</h2>
<p>Connect with mental health professionals who can provide guidance, support, and treatment options tailored to your needs.</p>

<h2>Step 3: Build a Support Network</h2>
<p>Surround yourself with people who support your recovery. This can include family, friends, support groups, and therapists.</p>

<h2>Step 4: Develop Healthy Coping Strategies</h2>
<p>Learn and practice healthy ways to cope with stress, triggers, and difficult emotions.</p>

<h2>Step 5: Be Patient with Yourself</h2>
<p>Recovery takes time. Celebrate small victories and don't be too hard on yourself when you face setbacks.</p>`,
    category: 'Addiction Recovery',
    tags: ['recovery', 'addiction', 'healing', 'support'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'
  },
  {
    title: 'Breaking the Stigma: Talking About Mental Health',
    excerpt: 'Mental health stigma prevents many people from seeking help. Learn how we can break down these barriers together.',
    content: `<h2>Understanding Stigma</h2>
<p>Stigma occurs when society labels someone as tainted or less desirable. Mental health stigma can lead to discrimination and make it harder for people to seek help.</p>

<h2>Types of Stigma</h2>
<ul>
<li><strong>Public stigma:</strong> Negative attitudes held by the general public</li>
<li><strong>Self-stigma:</strong> Internalized shame about one's own mental health</li>
<li><strong>Institutional stigma:</strong> Systemic policies that limit opportunities</li>
</ul>

<h2>How to Combat Stigma</h2>
<p>We can all play a role in reducing mental health stigma:</p>
<ul>
<li>Educate yourself and others</li>
<li>Be mindful of your language</li>
<li>Share your own story (if comfortable)</li>
<li>Show compassion and support</li>
<li>Advocate for mental health awareness</li>
</ul>`,
    category: 'Wellness',
    tags: ['stigma', 'awareness', 'mental health', 'advocacy'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800'
  }
];

async function createSampleBlogs() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find an admin user to be the author
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No admin user found!');
      console.log('💡 Please create an admin user first');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found admin: ${admin.name}\n`);

    // Check if blogs already exist
    const existingBlogs = await Blog.countDocuments();
    if (existingBlogs > 0) {
      console.log(`⚠️  Found ${existingBlogs} existing blogs`);
      console.log('   Skipping creation to avoid duplicates\n');
      await mongoose.connection.close();
      return;
    }

    console.log('📝 Creating sample blogs...\n');

    for (const blogData of sampleBlogs) {
      const blog = await Blog.create({
        ...blogData,
        author: admin._id,
        publishedAt: new Date()
      });

      console.log(`✅ Created: "${blog.title}"`);
      console.log(`   Slug: ${blog.slug}`);
      console.log(`   Category: ${blog.category}`);
      console.log(`   Published: ${blog.published ? 'Yes' : 'No'}`);
      console.log('');
    }

    console.log('🎉 Sample blogs created successfully!\n');
    console.log(`📊 Total blogs: ${sampleBlogs.length}`);
    console.log('\n💡 You can now view them at:');
    console.log('   - Marketing page: http://localhost:3000/');
    console.log('   - Blog page: http://localhost:3000/blog');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createSampleBlogs();
