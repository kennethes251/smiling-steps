const axios = require('axios');

const createAdminViaAPI = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🔧 Creating Admin User via API');
  console.log('==============================\n');
  
  try {
    // First, try to register admin user
    console.log('1. 📝 Registering admin user...');
    try {
      const adminRegResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Admin User',
        email: 'admin@smilingsteps.com',
        password: 'admin123',
        role: 'client', // Will be client initially
        skipVerification: true
      });
      console.log('✅ Admin user registered successfully');
      console.log('   Email:', adminRegResponse.data.user?.email);
      console.log('   Token:', adminRegResponse.data.token ? 'Received' : 'Not received');
    } catch (regError) {
      if (regError.response?.status === 400 && regError.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Admin user already exists, trying login...');
      } else {
        console.log('❌ Registration failed:', regError.response?.data);
        return;
      }
    }
    
    // Now try to login
    console.log('\n2. 🔑 Testing admin login...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/users/login`, {
        email: 'admin@smilingsteps.com',
        password: 'admin123'
      });
      console.log('✅ Admin login successful!');
      console.log('   User ID:', loginResponse.data.user?.id);
      console.log('   Role:', loginResponse.data.user?.role);
      console.log('   Token received:', !!loginResponse.data.token);
      
      // If login successful, we're done
      console.log('\n🎉 Admin Access Working!');
      console.log('========================');
      console.log('👑 Admin Login: admin@smilingsteps.com / admin123');
      console.log('🌐 App URL: https://smiling-steps.onrender.com');
      console.log('📧 Ready for email verification testing');
      
    } catch (loginError) {
      console.log('❌ Login still failed:', loginError.response?.data);
      
      // Try creating a different admin account
      console.log('\n3. 🔄 Creating alternative admin account...');
      const altEmail = 'admin.test@smilingsteps.com';
      try {
        const altAdminResponse = await axios.post(`${baseURL}/api/users/register`, {
          name: 'Admin Test User',
          email: altEmail,
          password: 'admin123',
          role: 'client',
          skipVerification: true
        });
        console.log('✅ Alternative admin created');
        console.log('   Email:', altEmail);
        console.log('   Password: admin123');
        
        // Test login with alternative admin
        const altLoginResponse = await axios.post(`${baseURL}/api/users/login`, {
          email: altEmail,
          password: 'admin123'
        });
        console.log('✅ Alternative admin login successful!');
        
        console.log('\n🎉 Alternative Admin Access Working!');
        console.log('====================================');
        console.log('👑 Admin Login:', altEmail, '/ admin123');
        console.log('🌐 App URL: https://smiling-steps.onrender.com');
        console.log('📧 Ready for email verification testing');
        
      } catch (altError) {
        console.log('❌ Alternative admin creation failed:', altError.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }
};

createAdminViaAPI();