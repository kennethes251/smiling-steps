require('dotenv').config();
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

const Blog = require('./models/Blog-sequelize')(sequelize, Sequelize.DataTypes);
const User = require('./models/User-sequelize')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

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
<li>Dealing with life's challenges</li>
<li>Having a sense of purpose</li>
</ul>

<h2>How to Maintain Mental Wellness</h2>
<p>Taking care of your mental health is an ongoing process. Here are some ways to maintain good mental health:</p>
<ul>
<li>Stay physically active</li>
<li>Get enough sleep</li>
<li>Eat nutritious foods</li>
<li>Connect with others</li>
<li>Practice mindfulness and relaxation</li>
<li>Seek professional help when needed</li>
</ul>

<p>Remember, it's okay to ask for help. Mental health professionals are here to support you on your journey to wellness.</p>`,
    category: 'Mental Health',
    tags: ['mental health', 'wellness', 'self-care', 'guide'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800',
    metaTitle: 'Understanding Mental Health - Complete Guide',
    metaDescription: 'Learn about mental health basics, why it matters, and how to maintain mental wellness in your daily life.'
  },
  {
    title: 'The Journey to Recovery: First Steps in Addiction Treatment',
    excerpt: 'Starting the path to recovery can feel overwhelming. Here\'s what you need to know about taking those crucial first steps.',
    content: `<h2>Acknowledging the Problem</h2>
<p>The first step in recovery is recognizing that there's a problem. This takes courage and honesty with yourself.</p>

<h2>Seeking Professional Help</h2>
<p>Recovery is not a journey you have to take alone. Professional counselors and therapists specialize in addiction recovery and can provide the support you need.</p>

<h2>Building a Support System</h2>
<p>Surrounding yourself with supportive people is crucial. This might include:</p>
<ul>
<li>Family and friends who support your recovery</li>
<li>Support groups</li>
<li>Counselors and therapists</li>
<li>Peer mentors</li>
</ul>

<h2>Creating a Recovery Plan</h2>
<p>A personalized recovery plan helps you stay focused on your goals. Work with your counselor to develop strategies that work for you.</p>

<h2>Celebrating Small Wins</h2>
<p>Recovery is a journey, not a destination. Celebrate each milestone, no matter how small. Every day of progress is worth acknowledging.</p>

<p>Remember: Recovery is possible, and you don't have to do it alone. Reach out for help today.</p>`,
    category: 'Addiction Recovery',
    tags: ['recovery', 'addiction', 'treatment', 'support'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800',
    metaTitle: 'First Steps in Addiction Recovery',
    metaDescription: 'Learn about the crucial first steps in addiction recovery and how to start your journey to wellness.'
  },
  {
    title: '5 Self-Care Practices for Better Mental Health',
    excerpt: 'Self-care isn\'t selfish—it\'s essential. Discover five simple practices you can start today to improve your mental wellness.',
    content: `<h2>1. Practice Mindfulness Daily</h2>
<p>Take 10 minutes each day to sit quietly and focus on your breath. Mindfulness helps reduce stress and increases self-awareness.</p>

<h2>2. Maintain a Regular Sleep Schedule</h2>
<p>Quality sleep is fundamental to mental health. Aim for 7-9 hours per night and try to go to bed and wake up at the same time each day.</p>

<h2>3. Move Your Body</h2>
<p>Physical activity releases endorphins, which naturally boost your mood. Find an activity you enjoy, whether it's walking, dancing, or yoga.</p>

<h2>4. Connect with Others</h2>
<p>Human connection is vital for mental health. Make time to connect with friends, family, or join a community group.</p>

<h2>5. Set Boundaries</h2>
<p>Learn to say no to things that drain your energy. Protecting your time and energy is an important form of self-care.</p>

<h2>Making Self-Care a Habit</h2>
<p>Start small and be consistent. Choose one practice to focus on this week, then gradually add more as they become habits.</p>

<p>Remember: Taking care of yourself isn't selfish—it's necessary for your well-being and helps you show up better for others.</p>`,
    category: 'Self-Care',
    tags: ['self-care', 'wellness', 'mental health', 'mindfulness'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    metaTitle: '5 Essential Self-Care Practices',
    metaDescription: 'Discover five simple self-care practices you can start today to improve your mental health and overall wellness.'
  }
];

async function createSampleBlogs() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected!\n');

    // Find an admin user
    console.log('🔍 Looking for admin user...');
    const admin = await User.findOne({ where: { role: 'admin' } });
    
    if (!admin) {
      console.log('❌ No admin user found!');
      console.log('Please create an admin user first.');
      process.exit(1);
    }

    console.log(`✅ Found admin: ${admin.name}\n`);

    // Check if blogs already exist
    const existingBlogs = await Blog.count();
    if (existingBlogs > 0) {
      console.log(`⚠️  Found ${existingBlogs} existing blog(s).`);
      console.log('Do you want to add more sample blogs? (This will not delete existing ones)\n');
    }

    console.log('📝 Creating sample blogs...\n');

    for (const blogData of sampleBlogs) {
      const blog = await Blog.create({
        ...blogData,
        authorId: admin.id,
        publishedAt: new Date()
      });

      console.log(`✅ Created: "${blog.title}"`);
      console.log(`   Slug: ${blog.slug}`);
      console.log(`   Category: ${blog.category}`);
      console.log(`   Published: ${blog.published ? 'Yes' : 'No'}`);
      console.log('');
    }

    console.log('🎉 Sample blogs created successfully!\n');
    console.log('📍 You can now view them at:');
    console.log('   - Admin: http://localhost:3000/admin/blogs');
    console.log('   - Public: http://localhost:3000/blog');
    console.log('   - Marketing: http://localhost:3000/learn-more (Resources section)\n');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSampleBlogs();
