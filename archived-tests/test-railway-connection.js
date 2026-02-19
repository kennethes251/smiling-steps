// Test Railway Backend Connection
// Run this in browser console to test if Railway backend is responding

const testRailwayConnection = async () => {
  const railwayUrl = 'https://smiling-steps-production.up.railway.app';
  
  console.log('🧪 Testing Railway Backend Connection...');
  console.log('🔗 URL:', railwayUrl);
  
  try {
    // Test 1: Basic health check
    console.log('\n1️⃣ Testing basic connection...');
    const response = await fetch(railwayUrl);
    console.log('✅ Status:', response.status);
    console.log('✅ Response received');
    
    // Test 2: API endpoint
    console.log('\n2️⃣ Testing API endpoint...');
    const apiResponse = await fetch(`${railwayUrl}/api/public/psychologists`);
    console.log('✅ API Status:', apiResponse.status);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ API Data:', data);
    } else {
      console.log('❌ API Error:', await apiResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Connection Error:', error);
    console.log('\n🔧 Possible Issues:');
    console.log('- Railway service might be sleeping');
    console.log('- CORS configuration issue');
    console.log('- Backend not deployed properly');
  }
};

// Run the test
testRailwayConnection();