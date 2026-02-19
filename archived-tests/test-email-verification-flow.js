const axios = require('axios');

const testEmailVerificationFlow = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🧪 Email Verification Flow Test');
  console.log('================================\n');
  
  try {
    // Step 1: Check if the system is ready
    console.log('1. 🔍 Checking system status...');
    const healthResponse = await axios.get(`${baseURL}/`);
    console.log('✅ System is online');
    
    // Step 2: Check admin login (should work without verification)
    console.log('\n2. 👑 Testing admin login (no verification needed)...');
    try {
      const adminLogin = await axios.post(`${baseURL}/api/users/login`, {
        email: 'admin@smilingsteps.com',
        password: 'admin123'
      });
      console.log('✅ Admin login successful - no email verification required');
      console.log('   Role:', adminLogin.data.user?.role);
    } catch (adminError) {
      console.log('❌ Admin login failed:', adminError.response?.data?.message);
    }
    
    // Step 3: Check psychologists endpoint
    console.log('\n3. 👨‍⚕️ Checking psychologists data...');
    const psychResponse = await axios.get(`${baseURL}/api/public/psychologists`);
    console.log(`✅ Found ${psychResponse.data.length} psychologists available`);
    
    console.log('\n🎉 System Status: READY FOR TESTING!');
    console.log('====================================\n');
    
    console.log('📧 EMAIL VERIFICATION TESTING INSTRUCTIONS:');
    console.log('');
    console.log('🌐 Go to: https://smiling-steps.onrender.com');
    console.log('');
    console.log('📝 STEP 1: Register a New Account');
    console.log('   - Click "Register" or "Sign Up"');
    console.log('   - Fill in your details with YOUR REAL EMAIL');
    console.log('   - Choose "Client" as your role');
    console.log('   - Submit the form');
    console.log('');
    console.log('📧 STEP 2: Check Your Email');
    console.log('   - Check your inbox (and spam folder)');
    console.log('   - Look for email from "Smiling Steps" (hr@smilingsteps.com)');
    console.log('   - Subject: Email verification');
    console.log('');
    console.log('🔗 STEP 3: Verify Your Account');
    console.log('   - Click the verification link in the email');
    console.log('   - You should see a success message');
    console.log('');
    console.log('🔑 STEP 4: Login');
    console.log('   - Go back to the login page');
    console.log('   - Use your registered email and password');
    console.log('   - You should be able to login successfully');
    console.log('');
    console.log('✅ EXPECTED BEHAVIOR:');
    console.log('   - Registration creates unverified account');
    console.log('   - Email is sent automatically');
    console.log('   - Login is blocked until email is verified');
    console.log('   - After verification, login works normally');
    console.log('');
    console.log('👑 ADMIN ACCESS (for management):');
    console.log('   - Email: admin@smilingsteps.com');
    console.log('   - Password: admin123');
    console.log('   - No email verification needed');
    console.log('');
    console.log('🆘 IF YOU HAVE ISSUES:');
    console.log('   - Check spam/junk folder for verification email');
    console.log('   - Wait 5-10 minutes for email delivery');
    console.log('   - Try registering with a different email provider');
    console.log('   - Use admin account to verify system is working');
    
  } catch (error) {
    console.error('❌ System check failed:', error.message);
    console.log('\n⚠️ The system might still be starting up.');
    console.log('   Wait 2-3 minutes and try again.');
  }
};

testEmailVerificationFlow();