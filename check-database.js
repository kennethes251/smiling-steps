const fs = require('fs');
const path = require('path');

console.log('🔍 Database Configuration Check');
console.log('================================');

// 1. Check .env file
console.log('\n1. Environment Configuration:');
const envPath = '.env';
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for database URL
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  if (dbUrlMatch) {
    const dbUrl = dbUrlMatch[1].trim();
    console.log(`📍 DATABASE_URL found: ${dbUrl.substring(0, 50)}...`);
    
    // Determine database type
    if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
      console.log('🐘 Database type: PostgreSQL');
    } else if (dbUrl.startsWith('mongodb://') || dbUrl.startsWith('mongodb+srv://')) {
      console.log('🍃 Database type: MongoDB');
    } else if (dbUrl.startsWith('sqlite://') || dbUrl.includes('.db') || dbUrl.includes('.sqlite')) {
      console.log('📁 Database type: SQLite');
    } else {
      console.log('❓ Database type: Unknown');
    }
  } else {
    console.log('❌ DATABASE_URL not found in .env');
  }
} else {
  console.log('❌ .env file not found');
}

// 2. Check for SQLite database files
console.log('\n2. SQLite Database Files:');
const possibleDbFiles = [
  'database.db',
  'database.sqlite',
  'smiling-steps.db',
  'app.db',
  'server/database.db',
  'server/database.sqlite',
  'server/smiling-steps.db'
];

let foundDbFiles = [];
possibleDbFiles.forEach(dbFile => {
  if (fs.existsSync(dbFile)) {
    const stats = fs.statSync(dbFile);
    console.log(`✅ Found: ${dbFile} (${(stats.size / 1024).toFixed(2)} KB)`);
    foundDbFiles.push(dbFile);
  }
});

if (foundDbFiles.length === 0) {
  console.log('❌ No SQLite database files found');
}

// 3. Check server configuration files
console.log('\n3. Server Configuration Files:');
const serverFiles = [
  'server/index.js',
  'server/index-mongodb.js',
  'server/index-sequelize.js',
  'server/config/database.js'
];

serverFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found: ${file}`);
    
    // Read and analyze the file
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for database connections
    if (content.includes('mongoose.connect')) {
      console.log(`   🍃 MongoDB connection found in ${file}`);
    }
    if (content.includes('new Sequelize') || content.includes('sequelize.authenticate')) {
      console.log(`   🐘 Sequelize/PostgreSQL connection found in ${file}`);
    }
    if (content.includes('sqlite') || content.includes('.db')) {
      console.log(`   📁 SQLite reference found in ${file}`);
    }
  } else {
    console.log(`❌ Missing: ${file}`);
  }
});

// 4. Check package.json for database dependencies
console.log('\n4. Database Dependencies:');
const packageJsonPath = 'package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (deps.mongoose) {
    console.log(`✅ MongoDB: mongoose@${deps.mongoose}`);
  }
  if (deps.sequelize) {
    console.log(`✅ PostgreSQL: sequelize@${deps.sequelize}`);
  }
  if (deps.pg) {
    console.log(`✅ PostgreSQL driver: pg@${deps.pg}`);
  }
  if (deps.sqlite3) {
    console.log(`✅ SQLite: sqlite3@${deps.sqlite3}`);
  }
  if (deps['better-sqlite3']) {
    console.log(`✅ SQLite: better-sqlite3@${deps['better-sqlite3']}`);
  }
}

// 5. Check which server file is being used
console.log('\n5. Active Server Configuration:');
const mainIndexPath = 'index.js';
if (fs.existsSync(mainIndexPath)) {
  const mainContent = fs.readFileSync(mainIndexPath, 'utf8');
  console.log('✅ Main index.js exists');
  
  if (mainContent.includes('server/index-mongodb')) {
    console.log('🍃 Currently configured for MongoDB');
  } else if (mainContent.includes('server/index-sequelize')) {
    console.log('🐘 Currently configured for PostgreSQL/Sequelize');
  } else if (mainContent.includes('server/index')) {
    console.log('📁 Using default server/index.js');
  }
}

// 6. Check render.yaml for deployment config
console.log('\n6. Deployment Configuration:');
const renderYamlPath = 'render.yaml';
if (fs.existsSync(renderYamlPath)) {
  const renderContent = fs.readFileSync(renderYamlPath, 'utf8');
  console.log('✅ render.yaml exists');
  
  if (renderContent.includes('mongodb')) {
    console.log('🍃 Render configured for MongoDB');
  }
  if (renderContent.includes('postgres')) {
    console.log('🐘 Render configured for PostgreSQL');
  }
}

console.log('\n================================');
console.log('🎯 Summary & Recommendations:');
console.log('================================');

if (foundDbFiles.length > 0) {
  console.log('📁 SQLite files found - you may be using local SQLite');
  console.log('💡 For production, consider PostgreSQL or MongoDB');
}

console.log('\n🔧 Next Steps:');
console.log('1. Run: node test-postgres-connection-simple.js');
console.log('2. Run: node test-sequelize-api.js');
console.log('3. Check server logs when starting the application');