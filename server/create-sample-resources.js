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

User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

const sampleResources = [
  // Recovery Guides (3)
  {
    title: 'Understanding Addiction: A Comprehensive Recovery Guide',
    excerpt: 'A complete guide to understanding addiction, its causes, and the path to recovery.',
    content: `<h2>What is Addiction?</h2>
<p>Addiction is a complex condition characterized by compulsive substance use or behavior despite harmful consequences.</p>
<h2>Types of Addiction</h2>
<ul><li>Substance addiction</li><li>Behavioral addiction</li><li>Process addiction</li></ul>
<h2>The Recovery Process</h2>
<p>Recovery involves acknowledgment, professional treatment, building support systems, and maintaining long-term sobriety.</p>`,
    category: 'Recovery Guide',
    tags: ['recovery', 'addiction', 'guide'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800'
  },
  {
    title: 'Harm Reduction Strategies: A Practical Guide',
    excerpt: 'Learn evidence-based harm reduction strategies to minimize risks and support recovery.',
    content: `<h2>What is Harm Reduction?</h2>
<p>Harm reduction is a set of practical strategies aimed at reducing negative consequences associated with substance use.</p>
<h2>Key Strategies</h2>
<ul><li>Safe use practices</li><li>Overdose prevention</li><li>Access to clean supplies</li><li>Medical support</li></ul>
<h2>Benefits</h2>
<p>Harm reduction saves lives, reduces disease transmission, and provides pathways to treatment and recovery.</p>`,
    category: 'Recovery Guide',
    tags: ['harm reduction', 'safety', 'prevention'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'
  },
  {
    title: 'Family Support Guide: Supporting a Loved One in Recovery',
    excerpt: 'A guide for families on how to support loved ones through addiction recovery.',
    content: `<h2>Understanding Your Role</h2>
<p>Family support is crucial in recovery, but it's important to know how to help without enabling.</p>
<h2>How to Support</h2>
<ul><li>Educate yourself about addiction</li><li>Set healthy boundaries</li><li>Encourage treatment</li><li>Practice self-care</li></ul>
<h2>What to Avoid</h2>
<p>Avoid enabling behaviors, judgment, and taking on their recovery as your responsibility.</p>`,
    category: 'Recovery Guide',
    tags: ['family', 'support', 'recovery'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800'
  },
  
  // Community Education (3)
  {
    title: 'Breaking the Stigma: Mental Health Awareness Workshop',
    excerpt: 'Educational materials to help communities understand and reduce mental health stigma.',
    content: `<h2>Understanding Stigma</h2>
<p>Stigma prevents people from seeking help and creates barriers to recovery.</p>
<h2>Types of Stigma</h2>
<ul><li>Public stigma</li><li>Self-stigma</li><li>Structural stigma</li></ul>
<h2>How to Combat Stigma</h2>
<p>Use person-first language, share stories, educate others, and challenge stereotypes.</p>
<h2>Workshop Materials</h2>
<p>This resource includes presentation slides, discussion guides, and handouts for community workshops.</p>`,
    category: 'Community Education',
    tags: ['stigma', 'education', 'awareness'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800'
  },
  {
    title: 'Mental Health First Aid: Community Training Guide',
    excerpt: 'Learn how to provide initial support to someone experiencing a mental health crisis.',
    content: `<h2>What is Mental Health First Aid?</h2>
<p>Mental Health First Aid teaches you how to identify, understand, and respond to signs of mental health challenges.</p>
<h2>Key Skills</h2>
<ul><li>Recognizing warning signs</li><li>Approaching someone in crisis</li><li>Providing initial support</li><li>Connecting to professional help</li></ul>
<h2>When to Use</h2>
<p>Use these skills when someone shows signs of depression, anxiety, psychosis, or substance use problems.</p>`,
    category: 'Community Education',
    tags: ['first aid', 'crisis', 'training'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800'
  },
  {
    title: 'Addiction Education: Facts vs. Myths',
    excerpt: 'Dispelling common myths about addiction with evidence-based facts.',
    content: `<h2>Common Myths</h2>
<p>Many misconceptions about addiction prevent understanding and compassion.</p>
<h2>Myth vs. Fact</h2>
<ul><li>Myth: Addiction is a choice. Fact: It's a medical condition.</li><li>Myth: You have to hit rock bottom. Fact: Early intervention is better.</li><li>Myth: Treatment doesn't work. Fact: Treatment is effective.</li></ul>
<h2>The Science</h2>
<p>Addiction changes brain chemistry and requires professional treatment, just like any other medical condition.</p>`,
    category: 'Community Education',
    tags: ['education', 'myths', 'facts'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800'
  },
  
  // Support Tools (3)
  {
    title: 'Daily Mood Tracker & Wellness Journal',
    excerpt: 'Track your mood, identify patterns, and monitor your mental health journey.',
    content: `<h2>Why Track Your Mood?</h2>
<p>Mood tracking helps you identify triggers, patterns, and progress in your mental health journey.</p>
<h2>How to Use This Tool</h2>
<ul><li>Rate your mood daily (1-10)</li><li>Note activities and events</li><li>Identify triggers</li><li>Track sleep and exercise</li></ul>
<h2>Benefits</h2>
<p>Regular tracking helps you understand your mental health better and communicate more effectively with your therapist.</p>
<h2>Download the Tracker</h2>
<p>Get your free printable mood tracker and start monitoring your wellness today.</p>`,
    category: 'Support Tool',
    tags: ['mood tracker', 'journal', 'wellness'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800'
  },
  {
    title: 'Coping Strategies Toolkit: Managing Stress & Anxiety',
    excerpt: 'A collection of evidence-based coping strategies for managing difficult emotions.',
    content: `<h2>What's in the Toolkit?</h2>
<p>This toolkit provides practical strategies you can use anytime, anywhere to manage stress and anxiety.</p>
<h2>Coping Strategies</h2>
<ul><li>Deep breathing exercises</li><li>Grounding techniques</li><li>Progressive muscle relaxation</li><li>Mindfulness practices</li><li>Distraction techniques</li></ul>
<h2>When to Use</h2>
<p>Use these tools when feeling overwhelmed, anxious, stressed, or triggered.</p>
<h2>Download</h2>
<p>Get your free coping strategies cards to keep with you.</p>`,
    category: 'Support Tool',
    tags: ['coping', 'stress', 'anxiety', 'tools'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'
  },
  {
    title: 'Crisis Support Directory: Kenya Mental Health Resources',
    excerpt: 'A comprehensive directory of mental health and crisis support services in Kenya.',
    content: `<h2>Emergency Contacts</h2>
<p>If you're in crisis, help is available 24/7.</p>
<h2>National Helplines</h2>
<ul><li>Kenya Red Cross: 1199</li><li>Befrienders Kenya: 0722 178 177</li><li>MHFA Kenya: 0731 473 806</li></ul>
<h2>Local Services</h2>
<p>Find mental health services, support groups, and treatment centers in your area.</p>
<h2>Online Resources</h2>
<p>Access online counseling, support forums, and educational materials.</p>
<h2>Download Directory</h2>
<p>Get the complete directory with contact information and service descriptions.</p>`,
    category: 'Support Tool',
    tags: ['crisis', 'directory', 'resources', 'kenya'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1516841273335-e39b37888115?w=800'
  }
];

async function createResources() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected!\n');

    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.log('❌ No admin user found!');
      process.exit(1);
    }

    console.log(`✅ Found admin: ${admin.name}\n`);
    console.log('📝 Creating sample resources...\n');

    for (const resourceData of sampleResources) {
      const resource = await Blog.create({
        ...resourceData,
        authorId: admin.id,
        publishedAt: new Date()
      });

      console.log(`✅ Created: "${resource.title}"`);
      console.log(`   Category: ${resource.category}`);
      console.log('');
    }

    console.log('🎉 Sample resources created!\n');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createResources();
