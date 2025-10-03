// Using built-in fetch instead of axios
const https = require('https');
const http = require('http');

const testUsers = [
  {
    name: 'Nancy Client',
    email: 'nancy@gmail.com',
    password: 'password123',
    role: 'client'
  },
  {
    name: 'Dr. John Smith',
    email: 'john@gmail.com',
    password: 'password123',
    role: 'psychologist'
  },
  {
    name: 'Test Client',
    email: 'client@test.com',
    password: 'password123',
    role: 'client'
  }
];

const createTestUsers = async () => {
  console.log('Creating test users...\n');
  
  for (const user of testUsers) {
    try {
      const response = await axios.post('http://localhost:5000/api/users/register', user);
      
      console.log(`✅ ${user.role.toUpperCase()} created successfully!`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
      
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log(`ℹ️  ${user.email} already exists!`);
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.response?.data?.message || error.message);
      }
      console.log('');
    }
  }
  
  console.log('🎉 Test user creation completed!');
  console.log('\nYou can now login with any of these accounts:');
  testUsers.forEach(user => {
    console.log(`- ${user.email} / ${user.password} (${user.role})`);
  });
};

createTestUsers();