// Deployment Status Checker
// Run this in browser console on your Netlify site

const checkDeploymentStatus = async () => {
  console.log('🔍 Checking Deployment Status...');
  
  // Check frontend
  console.log('📱 Frontend Status:');
  console.log('  URL:', window.location.href);
  console.log('  Environment:', process.env.NODE_ENV || 'development');
  
  // Check API configuration
  console.log('🌐 API Configuration:');
  const apiConfig = {
    hostname: window.location.hostname,
    isNetlify: window.location.hostname.includes('netlify'),
    isLocalhost: window.location.hostname === 'localhost'
  };
  console.log('  Config:', apiConfig);
  
  // Test backend connection
  console.log('🔗 Backend Connection Test:');
  try {
    const backendUrl = apiConfig.isNetlify 
      ? 'https://smiling-steps-production.up.railway.app'
      : 'http://localhost:5000';
    
    console.log('  Testing:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/public/psychologists`);
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Backend Connected');
      console.log('  📊 Therapists found:', data.length);
    } else {
      console.log('  ❌ Backend Error:', response.status);
    }
  } catch (error) {
    console.log('  ❌ Connection Failed:', error.message);
  }
  
  console.log('✅ Status check complete!');
};

// Auto-run the check
checkDeploymentStatus();