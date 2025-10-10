// Setup production admin and clean database
const setupProduction = async () => {
  try {
    console.log('🧹 Setting up production environment...');
    
    // 1. Clear all existing users
    console.log('1️⃣ Clearing existing test users...');
    const clearResponse = await fetch('https://smiling-steps.onrender.com/api/admin/clear-test-users', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (clearResponse.ok) {
      console.log('✅ Test users cleared');
    } else {
      console.log('⚠️ Clear users endpoint not available - will create manually');
    }
    
    // 2. Create main admin account
    console.log('2️⃣ Creating main admin account...');
    const adminResponse = await fetch('https://smiling-steps.onrender.com/api/users/create-psychologist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Smiling Steps',
        email: 'smilingsteps@gmail.com',
        password: '33285322',
        role: 'admin',
        specializations: ['Platform Administration'],
        bio: 'Official Smiling Steps Administrator Account',
        education: 'Platform Management',
        experience: 'System Administration'
      })
    });
    
    if (adminResponse.ok) {
      console.log('✅ Main admin account created successfully!');
      console.log('📧 Email: smilingsteps@gmail.com');
      console.log('🔑 Password: 33285322');
      console.log('👤 Name: Smiling Steps');
      
      // Test login
      const loginResponse = await fetch('https://smiling-steps.onrender.com/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'smilingsteps@gmail.com',
          password: '33285322'
        })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Admin login test successful');
        console.log('🎯 Role:', loginData.user.role);
      }
      
    } else {
      const error = await adminResponse.text();
      console.log('❌ Error creating admin:', error);
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
};

setupProduction();