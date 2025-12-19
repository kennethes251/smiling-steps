const axios = require('axios');

const initDatabase = async () => {
  try {
    console.log('🔄 Triggering database initialization...');
    
    const response = await axios.get('https://smiling-steps.onrender.com/api/users/debug/init-db', {
      timeout: 60000
    });
    
    console.log('✅ Database initialization result:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    console.log('Test user created:', response.data.testUserCreated);
    console.log('Test user:', response.data.testUser);
    
  } catch (error) {
    console.error('❌ Database initialization failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

initDatabase();