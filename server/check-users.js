const axios = require('axios');

async function checkUsers() {
  try {
    console.log('Checking existing users...');
    
    const response = await axios.get('http://localhost:5000/api/users/debug/users');
    
    console.log('Existing users:');
    response.data.users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log(`\nTotal users: ${response.data.count}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkUsers();