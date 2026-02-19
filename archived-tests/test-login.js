<<<<<<< HEAD
const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('Testing login...');
    
    const loginData = {
      email: 'nancy@gmail.com',
      password: 'password123'
    };

    const response = await axios.post('http://localhost:5000/api/users/login', loginData);
    
    console.log('✅ Login successful!');
    console.log('User:', response.data.user);
    console.log('Token:', response.data.token);
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Possible issues:');
      console.log('1. User does not exist - run: node create-test-user.js');
      console.log('2. Wrong password');
      console.log('3. Account is locked due to failed attempts');
    }
  }
};

=======
const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('Testing login...');
    
    const loginData = {
      email: 'nancy@gmail.com',
      password: 'password123'
    };

    const response = await axios.post('http://localhost:5000/api/users/login', loginData);
    
    console.log('✅ Login successful!');
    console.log('User:', response.data.user);
    console.log('Token:', response.data.token);
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Possible issues:');
      console.log('1. User does not exist - run: node create-test-user.js');
      console.log('2. Wrong password');
      console.log('3. Account is locked due to failed attempts');
    }
  }
};

>>>>>>> 54f043a91682edcc5659e6f2a6d44c4e4425ada5
testLogin();