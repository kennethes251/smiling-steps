const { Client } = require('pg');

console.log('🐘 Testing PostgreSQL Connection');
console.log('================================');

const testConnection = async () => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log('❌ DATABASE_URL not found in .env file');
    return;
  }
  
  console.log(`📍 Database URL: ${dbUrl.substring(0, 50)}...`);
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔗 Attempting connection...');
    await client.connect();
    console.log('✅ PostgreSQL connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Server time:', result.rows[0].current_time);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables:', tablesResult.rows.map(row => row.table_name));
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This might be a network/firewall issue');
    } else if (error.message.includes('authentication')) {
      console.log('💡 Check your database credentials');
    } else if (error.message.includes('does not exist')) {
      console.log('💡 Database might not be created yet');
    }
  } finally {
    await client.end();
  }
};

// Load environment variables
require('dotenv').config();

testConnection();