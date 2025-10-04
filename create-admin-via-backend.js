// Create admin user via the create-psychologist endpoint with admin role
const createAdminUser = async () => {
  try {
    console.log('🧪 Creating admin user via backend endpoint...');
    
    const response = await fetch('https://smiling-steps.onrender.com/api/users/create-psychologist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Kenneth Esilo',
        email: 'kenneth.admin@smilingsteps.com',
        password: 'admin123',
        role: 'admin',
        specializations: ['Platform Administration', 'System Management'],
        bio: 'Founder and Administrator of Smiling Steps platform',
        education: 'Platform Administration',
        experience: 'Founder',
        sessionRate: 0
      })
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: kenneth.admin@smilingsteps.com');
      console.log('🔑 Password: admin123');
      console.log('🎯 Role: admin');
      console.log('🛠️ Dev Dashboard button should now appear!');
      
      // Test login to verify role
      console.log('\n🔍 Testing login to verify admin role...');
      const loginResponse = await fetch('https://smiling-steps.onrender.com/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'kenneth.admin@smilingsteps.com',
          password: 'admin123'
        })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login test successful');
        console.log('👤 User role:', loginData.user.role);
        
        if (loginData.user.role === 'admin') {
          console.log('🎉 Perfect! User has admin role - Dev Dashboard button will appear');
        }
      }
      
    } else {
      const error = await response.text();
      console.log('❌ Error creating admin:', error);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

createAdminUser();