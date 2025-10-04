const axios = require('axios');

async function testProfile() {
  try {
    // First login to get a token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'nancy@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Test profile update
    console.log('Testing profile update...');
    const profileData = {
      name: 'Nancy Updated',
      bio: 'This is a test bio'
    };
    
    const response = await axios.put('http://localhost:5000/api/users/profile', profileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Profile update successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testProfile();