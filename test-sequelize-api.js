const { Sequelize } = require('sequelize');
const path = require('path');

console.log('🔍 Testing Sequelize/SQLite Connection');
console.log('====================================');

// Test SQLite connection
const testSQLiteConnection = async () => {
  console.log('\n1. Testing SQLite Connection:');
  
  const sqlitePath = path.join(__dirname, 'database.sqlite');
  console.log(`📁 SQLite file path: ${sqlitePath}`);
  
  try {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('✅ SQLite connection successful');
    
    // Check tables
    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('📋 Tables found:', results.map(r => r.name));
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.log('❌ SQLite connection failed:', error.message);
    return false;
  }
};

// Test PostgreSQL connection
const testPostgreSQLConnection = async () => {
  console.log('\n2. Testing PostgreSQL Connection:');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('❌ DATABASE_URL not found in environment');
    return false;
  }
  
  console.log(`🐘 PostgreSQL URL: ${dbUrl.substring(0, 50)}...`);
  
  try {
    const sequelize = new Sequelize(dbUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection successful');
    
    // Check tables
    const [results] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log('📋 Tables found:', results.map(r => r.table_name));
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('🎯 Current Configuration Analysis:');
  console.log('- Main server (index.js) is configured for MongoDB');
  console.log('- You have SQLite files locally');
  console.log('- You have PostgreSQL credentials for Render');
  console.log('');
  
  const sqliteWorks = await testSQLiteConnection();
  const postgresWorks = await testPostgreSQLConnection();
  
  console.log('\n🎯 Summary:');
  console.log('===========');
  
  if (sqliteWorks) {
    console.log('✅ SQLite is working locally');
  }
  
  if (postgresWorks) {
    console.log('✅ PostgreSQL (Render) is accessible');
  }
  
  console.log('\n💡 Recommendations:');
  console.log('==================');
  
  if (sqliteWorks && !postgresWorks) {
    console.log('🔧 Use SQLite for local development');
    console.log('   Run: node server/index-sequelize.js');
  } else if (postgresWorks) {
    console.log('🔧 Switch to PostgreSQL for production-ready setup');
    console.log('   Run: node switch-to-postgres-production.js');
  } else {
    console.log('🔧 Set up a local database first');
    console.log('   Run: node setup-local-postgres.js');
  }
  
  console.log('\n🚀 Quick Start Options:');
  console.log('1. Use MongoDB (current): npm start');
  console.log('2. Use SQLite (local): node server/index-sequelize.js');
  console.log('3. Use PostgreSQL: Update .env and restart');
};

// Load environment variables
require('dotenv').config();

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});