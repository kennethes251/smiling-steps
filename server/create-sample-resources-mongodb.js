require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const User = require('./models/User');

const sampleResources = [
  // Recovery Guides (3)
  {
    title: 'Understanding Addiction: A Comprehensive Recovery Guide',
    description: 'A complete guide to understanding addiction, its causes, and the path to recovery. Learn about different types of addiction and evidence-based recovery strategies.',
    type: 'Guide',
    category: 'Recovery',
    tags: ['recovery', 'addiction', 'guide', 'treatment'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  },
  {
    title: 'Harm Reduction Strategies: A Practical Guide',
    description: 'Learn evidence-based harm reduction strategies to minimize risks and support recovery. Includes safe use practices, overdose prevention, and pathways to treatment.',
    type: 'Guide',
    category: 'Recovery',
    tags: ['harm reduction', 'safety', 'prevention', 'overdose'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'intermediate'
  },
  {
    title: 'Family Support Guide: Supporting a Loved One in Recovery',
    description: 'A comprehensive guide for families on how to support loved ones through addiction recovery while maintaining healthy boundaries.',
    type: 'Guide',
    category: 'Family Support',
    tags: ['family', 'support', 'recovery', 'boundaries'],
    accessLevel: 'public',
    requiresAuth: false,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  },
  
  // Community Education (3)
  {
    title: 'Breaking the Stigma: Mental Health Awareness Workshop',
    description: 'Educational materials to help communities understand and reduce mental health stigma. Includes presentation slides, discussion guides, and handouts.',
    type: 'Article',
    category: 'Education',
    tags: ['stigma', 'education', 'awareness', 'community'],
    accessLevel: 'public',
    requiresAuth: false,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  },
  {
    title: 'Mental Health First Aid: Community Training Guide',
    description: 'Learn how to provide initial support to someone experiencing a mental health crisis. Covers recognizing warning signs and connecting to professional help.',
    type: 'Guide',
    category: 'Education',
    tags: ['first aid', 'crisis', 'training', 'mental health'],
    accessLevel: 'public',
    requiresAuth: false,
    downloadable: true,
    active: true,
    difficulty: 'intermediate'
  },
  {
    title: 'Addiction Education: Facts vs. Myths',
    description: 'Dispelling common myths about addiction with evidence-based facts. Learn the science behind addiction and effective treatment approaches.',
    type: 'Article',
    category: 'Education',
    tags: ['education', 'myths', 'facts', 'science'],
    accessLevel: 'public',
    requiresAuth: false,
    downloadable: false,
    active: true,
    difficulty: 'beginner'
  },
  
  // Support Tools (3)
  {
    title: 'Daily Mood Tracker & Wellness Journal',
    description: 'Track your mood, identify patterns, and monitor your mental health journey. Includes daily mood ratings, activity tracking, and trigger identification.',
    type: 'Tool',
    category: 'Self-Help',
    tags: ['mood tracker', 'journal', 'wellness', 'self-monitoring'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  },
  {
    title: 'Coping Strategies Toolkit: Managing Stress & Anxiety',
    description: 'A collection of evidence-based coping strategies for managing difficult emotions. Includes breathing exercises, grounding techniques, and mindfulness practices.',
    type: 'Tool',
    category: 'Self-Help',
    tags: ['coping', 'stress', 'anxiety', 'tools', 'mindfulness'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  },
  {
    title: 'Crisis Support Directory: Kenya Mental Health Resources',
    description: 'A comprehensive directory of mental health and crisis support services in Kenya. Includes emergency contacts, helplines, and local treatment centers.',
    type: 'Tool',
    category: 'Resources',
    tags: ['crisis', 'directory', 'resources', 'kenya', 'emergency'],
    accessLevel: 'public',
    requiresAuth: false,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  },
  
  // Worksheets (3)
  {
    title: 'Relapse Prevention Plan Worksheet',
    description: 'Create your personalized relapse prevention plan. Identify triggers, warning signs, and coping strategies to maintain your recovery.',
    type: 'Worksheet',
    category: 'Recovery',
    tags: ['relapse prevention', 'worksheet', 'planning', 'recovery'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'intermediate'
  },
  {
    title: 'Thought Record Worksheet: CBT Tool',
    description: 'Use this cognitive behavioral therapy tool to identify and challenge negative thought patterns. Track situations, thoughts, emotions, and alternative perspectives.',
    type: 'Worksheet',
    category: 'Self-Help',
    tags: ['CBT', 'worksheet', 'thoughts', 'cognitive therapy'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'intermediate'
  },
  {
    title: 'Self-Care Action Plan',
    description: 'Develop a comprehensive self-care routine covering physical, emotional, social, and spiritual wellness. Includes goal-setting and progress tracking.',
    type: 'Worksheet',
    category: 'Self-Help',
    tags: ['self-care', 'wellness', 'worksheet', 'goals'],
    accessLevel: 'client',
    requiresAuth: true,
    downloadable: true,
    active: true,
    difficulty: 'beginner'
  }
];

async function createResources() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No admin user found!');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found admin: ${admin.name}\n`);
    console.log('📝 Creating sample resources...\n');

    // Clear existing resources (optional)
    const existingCount = await Resource.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing resources`);
      console.log('   Skipping creation to avoid duplicates\n');
      console.log('   To recreate, delete existing resources first\n');
      await mongoose.connection.close();
      return;
    }

    for (const resourceData of sampleResources) {
      const resource = await Resource.create({
        ...resourceData,
        createdBy: admin._id
      });

      console.log(`✅ Created: "${resource.title}"`);
      console.log(`   Type: ${resource.type} | Category: ${resource.category}`);
      console.log(`   Access: ${resource.accessLevel} | Downloadable: ${resource.downloadable}`);
      console.log('');
    }

    console.log('🎉 Sample resources created successfully!\n');
    console.log(`📊 Total resources: ${sampleResources.length}`);
    console.log('   - 3 Recovery Guides');
    console.log('   - 3 Community Education');
    console.log('   - 3 Support Tools');
    console.log('   - 3 Worksheets\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createResources();
