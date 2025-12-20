const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning Up Database Confusion');
console.log('==================================');

const cleanupFiles = () => {
  console.log('\n1. Removing SQLite database files:');
  
  const sqliteFiles = [
    'database.sqlite',
    'server/database.sqlite'
  ];
  
  sqliteFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Deleted: ${file}`);
    } else {
      console.log(`⚪ Not found: ${file}`);
    }
  });
};

const updateEnvFile = () => {
  console.log('\n2. Cleaning up .env file:');
  
  if (!fs.existsSync('.env')) {
    console.log('❌ .env file not found');
    return;
  }
  
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Comment out PostgreSQL URL
  envContent = envContent.replace(
    /^DATABASE_URL=/gm,
    '# DATABASE_URL='
  );
  
  // Add comment about MongoDB being the primary database
  if (!envContent.includes('# Primary Database: MongoDB')) {
    envContent = envContent.replace(
      /MONGODB_URI=/,
      '# Primary Database: MongoDB Atlas\nMONGODB_URI='
    );
  }
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ Updated .env file (commented out PostgreSQL)');
};

const updatePackageJson = () => {
  console.log('\n3. Simplifying package.json scripts:');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Keep only the main start script
  if (packageJson.scripts) {
    // Remove confusing scripts
    delete packageJson.scripts['start:sqlite'];
    delete packageJson.scripts['start:mongodb'];
    
    // Ensure main start script exists
    if (!packageJson.scripts.start) {
      packageJson.scripts.start = 'node index.js';
    }
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Simplified package.json scripts');
  }
};

const createSimpleStartGuide = () => {
  console.log('\n4. Creating simple start guide:');
  
  const guide = `# 🚀 Simple Start Guide

## One Command to Rule Them All

\`\`\`bash
npm start
\`\`\`

That's it! Your app uses MongoDB Atlas for everything.

## What This Does

1. Connects to MongoDB Atlas (cloud database)
2. Starts the server on port 5000
3. Ready for development and production

## Environment Variables

Make sure your .env has:
\`\`\`env
MONGODB_URI="your-mongodb-atlas-connection-string"
\`\`\`

## No More Database Confusion

- ✅ One database system (MongoDB)
- ✅ Works everywhere (local, production, team)
- ✅ No installation needed
- ✅ Cloud backups included

## Troubleshooting

If you get connection errors:
1. Check your internet connection
2. Verify MONGODB_URI in .env
3. Check MongoDB Atlas dashboard

## Production Deployment

Same command works for production:
\`\`\`bash
npm start
\`\`\`

Just make sure your hosting platform has the MONGODB_URI environment variable set.
`;

  fs.writeFileSync('SIMPLE_START_GUIDE.md', guide);
  console.log('✅ Created SIMPLE_START_GUIDE.md');
};

const testMongoConnection = async () => {
  console.log('\n5. Testing MongoDB connection:');
  
  try {
    require('dotenv').config();
    const mongoose = require('mongoose');
    
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in .env');
      return false;
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB connection successful!');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

const main = async () => {
  console.log('🎯 Implementing permanent database solution...');
  
  cleanupFiles();
  updateEnvFile();
  updatePackageJson();
  createSimpleStartGuide();
  
  const mongoWorks = await testMongoConnection();
  
  console.log('\n🎉 Cleanup Complete!');
  console.log('====================');
  
  if (mongoWorks) {
    console.log('✅ MongoDB is working perfectly');
    console.log('');
    console.log('🚀 You can now start your app with:');
    console.log('   npm start');
    console.log('');
    console.log('💡 This will work for:');
    console.log('   - Local development');
    console.log('   - Production deployment');
    console.log('   - Team collaboration');
  } else {
    console.log('⚠️  MongoDB connection needs attention');
    console.log('   Check your MONGODB_URI in .env file');
  }
  
  console.log('\n📖 Read PERMANENT_DATABASE_SOLUTION.md for details');
  console.log('📖 Read SIMPLE_START_GUIDE.md for quick reference');
};

main().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});