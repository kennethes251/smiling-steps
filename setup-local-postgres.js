const { Sequelize } = require('sequelize');
const path = require('path');

console.log('🔧 Local Database Setup');
console.log('=======================');

const setupLocalSQLite = async () => {
  console.log('\n1. Setting up SQLite for local development:');
  
  const sqlitePath = path.join(__dirname, 'database.sqlite');
  console.log(`📁 SQLite file: ${sqlitePath}`);
  
  try {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: console.log
    });
    
    await sequelize.authenticate();
    console.log('✅ SQLite connection established');
    
    // Create tables if they don't exist
    console.log('📋 Synchronizing database schema...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database schema synchronized');
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.log('❌ SQLite setup failed:', error.message);
    return false;
  }
};

const createSequelizeServer = () => {
  console.log('\n2. Creating Sequelize server configuration:');
  
  const serverContent = `const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// SQLite Database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connected');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smiling Steps API (SQLite)',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// Basic API routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'SQLite server running', timestamp: new Date() });
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(\`🚀 Server running on port \${PORT}\`);
    console.log(\`📁 Using SQLite database\`);
    console.log(\`🌐 API: http://localhost:\${PORT}\`);
  });
};

startServer().catch(error => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});

module.exports = { app, sequelize };`;

  const fs = require('fs');
  fs.writeFileSync('server/index-sequelize.js', serverContent);
  console.log('✅ Created server/index-sequelize.js');
};

const updatePackageJson = () => {
  console.log('\n3. Updating package.json scripts:');
  
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  packageJson.scripts['start:sqlite'] = 'node server/index-sequelize.js';
  packageJson.scripts['start:mongodb'] = 'node index.js';
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated package.json with new scripts');
};

const main = async () => {
  console.log('🎯 Setting up local development environment...');
  
  const sqliteWorking = await setupLocalSQLite();
  
  if (sqliteWorking) {
    createSequelizeServer();
    updatePackageJson();
    
    console.log('\n🎉 Setup Complete!');
    console.log('==================');
    console.log('');
    console.log('🚀 Start Options:');
    console.log('1. SQLite (local):  npm run start:sqlite');
    console.log('2. MongoDB (cloud): npm run start:mongodb');
    console.log('');
    console.log('💡 For local development, use SQLite');
    console.log('💡 For production, use MongoDB or PostgreSQL');
  } else {
    console.log('\n❌ Setup failed. Please check your SQLite installation.');
  }
};

main().catch(error => {
  console.error('❌ Setup error:', error);
  process.exit(1);
});