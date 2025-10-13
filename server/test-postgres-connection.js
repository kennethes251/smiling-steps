require('dotenv').config();
const connectDB = require('./config/database');

const testConnection = async () => {
  console.log('🧪 Testing PostgreSQL connection...\n');
  
  try {
    const sequelize = await connectDB();
    
    console.log('✅ Connection successful!');
    console.log('\n📊 Database Info:');
    console.log('- Database:', sequelize.config.database);
    console.log('- Host:', sequelize.config.host);
    console.log('- Port:', sequelize.config.port);
    console.log('- Dialect:', sequelize.config.dialect);
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT version()');
    console.log('\n🐘 PostgreSQL Version:', results[0].version);
    
    await sequelize.close();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Make sure PostgreSQL is installed and running');
    console.error('2. Verify DATABASE_URL in .env file');
    console.error('3. Check that the database exists');
    console.error('4. Verify username and password are correct');
    process.exit(1);
  }
};

testConnection();