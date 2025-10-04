const axios = require('axios');

async function testRegistration() {
  try {
    console.log('Testing client registration...');
    
    const newClient = {
      name: 'Test Client',
      email: 'nancy@gmail.com',
      password: 'password123',
      role: 'client'
    };
    
    const response = await axios.post('http://localhost:5000/api/users/register', newClient);
    
    console.log('Registration successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Registration failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
  }
}

testRegistration();