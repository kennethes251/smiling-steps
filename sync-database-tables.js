const axios = require('axios');

const syncDatabase = async () => {
  try {
    console.log('🔄 Triggering database sync...');
    
    // Create a simple endpoint call that should trigger table creation
    const response = await axios.get('https://smiling-steps.onrender.com/api/users/debug/users', {
      timeout: 30000
    });
    
    console.log('✅ Database sync completed');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('📊 Database sync response:');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    
    if (error.response?.data?.error?.includes('relation "users" does not exist')) {
      console.log('🚨 Tables still don\'t exist - need manual intervention');
    }
  }
};

syncDatabase();