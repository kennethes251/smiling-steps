// Test Render Backend Connection
const testRender = async () => {
  const renderUrl = 'https://smiling-steps.onrender.com';
  
  console.log('🧪 Testing Render Backend Connection...');
  console.log('🔗 URL:', renderUrl);
  
  try {
    // Test 1: Basic health check
    console.log('\n1️⃣ Testing basic connection...');
    const response = await fetch(renderUrl);
    console.log('✅ Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response:', data);
    }
    
    // Test 2: API endpoint
    console.log('\n2️⃣ Testing API endpoint...');
    const apiResponse = await fetch(`${renderUrl}/api/public/psychologists`);
    console.log('✅ API Status:', apiResponse.status);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ API Data:', `${data.length || 0} therapists found`);
      console.log('✅ Sample therapist:', data[0]?.name || 'No data');
    } else {
      console.log('❌ API Error:', await apiResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
  }
};

testRender();