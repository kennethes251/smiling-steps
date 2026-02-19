<<<<<<< HEAD
const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login...');
    
    const response = await axios.post('http://localhost:5000/api/users/login', {
      email: 'nancy@gmail.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token ? 'Present' : 'Missing');
    console.log('User:', response.data.user ? response.data.user : 'Missing');
    
    // Test auth endpoint
    if (response.data.token) {
      console.log('\nTesting auth endpoint...');
      const authResponse = await axios.get('http://localhost:5000/api/auth', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('Auth endpoint successful!');
      console.log('User data:', authResponse.data);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

=======
const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login...');
    
    const response = await axios.post('http://localhost:5000/api/users/login', {
      email: 'nancy@gmail.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token ? 'Present' : 'Missing');
    console.log('User:', response.data.user ? response.data.user : 'Missing');
    
    // Test auth endpoint
    if (response.data.token) {
      console.log('\nTesting auth endpoint...');
      const authResponse = await axios.get('http://localhost:5000/api/auth', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('Auth endpoint successful!');
      console.log('User data:', authResponse.data);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

>>>>>>> 54f043a91682edcc5659e6f2a6d44c4e4425ada5
testLogin();