#!/usr/bin/env node

/**
 * Switch Back to MongoDB Database
 * 
 * This script switches the system from PostgreSQL back to MongoDB
 * and updates all necessary configuration files.
 */

const fs = require('fs');
const path = require('path');

async function switchToMongoDB() {
  console.log('🔄 Switching System Back to MongoDB...\n');

  try {
    // 1. Update server/index.js to use MongoDB
    console.log('1. Updating server/index.js to use MongoDB...');
    
    const mongoIndexPath = 'server/index-mongodb.js';
    const mainIndexPath = 'server/index.js';
    
    if (fs.existsSync(mongoIndexPath)) {
      const mongoIndexContent = fs.readFileSync(mongoIndexPath, 'utf8');
      fs.writeFileSync(mainIndexPath, mongoIndexContent);
      console.log('   ✅ Updated server/index.js to use MongoDB');
    } else {
      console.log('   ⚠️ MongoDB index file not found, creating new one...');
      
      const mongoIndexContent = `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 CORS request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://smiling-steps-frontend.onrender.com',
      'https://smilingsteps.com',
      'https://www.smilingsteps.com',
      'https://localhost:3000',
      'https://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-auth-token',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// Serve static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'MongoDB',
    message: 'Server is running with MongoDB'
  });
});

// Debug middleware
app.use((req, res, next) => {
  console.log(\`🌐 \${req.method} \${req.path} - Origin: \${req.get('Origin')} - \${new Date().toISOString()}\`);
  next();
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');

    // Define Routes
    console.log('Loading routes...');
    app.use('/api/auth', require('./routes/auth'));
    console.log('  ✅ auth routes loaded.');
    app.use('/api/users', require('./routes/users-mongodb'));
    console.log('  ✅ users routes loaded (MongoDB version).');
    app.use('/api/email-verification', require('./routes/emailVerification'));
    console.log('  ✅ email verification routes loaded.');
    app.use('/api/upload', require('./routes/upload'));
    console.log('  ✅ upload routes loaded.');
    app.use('/api/admin', require('./routes/admin'));
    console.log('  ✅ admin routes loaded.');
    app.use('/api/public', require('./routes/public-mongodb'));
    console.log('  ✅ public routes loaded (MongoDB version).');
    app.use('/api/sessions', require('./routes/sessions'));
    console.log('  ✅ sessions routes loaded.');
    
    console.log('✅ MongoDB routes loaded successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(\`🚀 Server running on port \${PORT} with MongoDB\`);
      console.log(\`📊 Database: MongoDB Atlas\`);
      console.log(\`🌐 Environment: \${process.env.NODE_ENV || 'development'}\`);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
`;
      
      fs.writeFileSync(mainIndexPath, mongoIndexContent);
      console.log('   ✅ Created new MongoDB server/index.js');
    }

    // 2. Update .env file to prioritize MongoDB
    console.log('\n2. Updating .env file to prioritize MongoDB...');
    
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Comment out PostgreSQL and uncomment MongoDB
    envContent = envContent.replace(/^DATABASE_URL=/gm, '# DATABASE_URL=');
    envContent = envContent.replace(/^# MONGODB_URI=/gm, 'MONGODB_URI=');
    
    fs.writeFileSync(envPath, envContent);
    console.log('   ✅ Updated .env to use MongoDB');

    // 3. Update package.json start script
    console.log('\n3. Updating package.json start script...');
    
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.scripts.start = 'node server/index.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Updated package.json start script');

    // 4. Create MongoDB-compatible routes if they don't exist
    console.log('\n4. Ensuring MongoDB routes exist...');
    
    const mongoUsersRoute = 'server/routes/users-mongodb.js';
    const mongoPublicRoute = 'server/routes/public-mongodb.js';
    
    if (!fs.existsSync(mongoUsersRoute)) {
      console.log('   ⚠️ Creating MongoDB users route...');
      // Copy from existing users route and modify for MongoDB
      const usersContent = fs.readFileSync('server/routes/users.js', 'utf8');
      const mongoUsersContent = usersContent
        .replace(/global\.User/g, 'User')
        .replace(/const { DataTypes } = require\('sequelize'\);/g, '')
        .replace(/const User = require\('\.\.\/models\/User-sequelize'\)\(sequelize, DataTypes\);/g, 'const User = require(\'../models/User\');');
      
      fs.writeFileSync(mongoUsersRoute, mongoUsersContent);
      console.log('   ✅ Created MongoDB users route');
    }
    
    if (!fs.existsSync(mongoPublicRoute)) {
      console.log('   ⚠️ Creating MongoDB public route...');
      const publicContent = `const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   GET api/public/psychologists
// @desc    Get all approved psychologists
// @access  Public
router.get('/psychologists', async (req, res) => {
  try {
    console.log('🔍 Fetching psychologists from MongoDB...');
    
    const psychologists = await User.find({ 
      role: 'psychologist',
      'psychologistDetails.approvalStatus': 'approved'
    }).select('name email psychologistDetails profileInfo createdAt');

    console.log(\`📊 Found \${psychologists.length} approved psychologist(s)\`);

    const enhancedPsychologists = psychologists.map(psych => ({
      id: psych._id.toString(),
      _id: psych._id,
      name: psych.name,
      email: psych.email,
      bio: psych.psychologistDetails?.bio || \`Dr. \${psych.name} is a dedicated mental health professional.\`,
      specializations: psych.psychologistDetails?.specializations || ['General Therapy', 'Anxiety', 'Depression'],
      experience: psych.psychologistDetails?.experience || '5 years',
      psychologistDetails: psych.psychologistDetails,
      rates: psych.psychologistDetails?.rates || {
        Individual: { amount: 2000, duration: 60 },
        Couples: { amount: 3500, duration: 75 },
        Family: { amount: 4500, duration: 90 },
        Group: { amount: 1500, duration: 90 }
      }
    }));

    res.json({
      success: true,
      data: enhancedPsychologists
    });

  } catch (err) {
    console.error('❌ Error fetching psychologists:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch psychologists',
      error: err.message
    });
  }
});

module.exports = router;
`;
      
      fs.writeFileSync(mongoPublicRoute, publicContent);
      console.log('   ✅ Created MongoDB public route');
    }

    console.log('\n✅ Successfully switched to MongoDB!');
    console.log('\n📋 Changes made:');
    console.log('   - Updated server/index.js to use MongoDB');
    console.log('   - Updated .env to prioritize MongoDB URI');
    console.log('   - Updated package.json start script');
    console.log('   - Ensured MongoDB routes exist');
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Commit and push changes to trigger deployment');
    console.log('   2. Wait for deployment to complete');
    console.log('   3. Run comprehensive end-to-end tests');

  } catch (error) {
    console.error('❌ Failed to switch to MongoDB:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  switchToMongoDB().catch(console.error);
}

module.exports = { switchToMongoDB };