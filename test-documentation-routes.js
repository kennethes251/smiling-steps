const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testDocumentationRoutes() {
  console.log('🧪 Testing Documentation Routes\n');

  const routes = [
    { path: '/docs', name: 'Help Center Index' },
    { path: '/docs/video-call-help', name: 'Video Call Help Center' },
    { path: '/docs/video-call-quick-fixes', name: 'Quick Fixes' },
    { path: '/docs/video-call-faq', name: 'FAQ' },
    { path: '/docs/video-call-troubleshooting', name: 'Troubleshooting Guide' },
    { path: '/docs/video-call-support', name: 'Support Guide' },
    { path: '/docs/api/list', name: 'API Documentation List' }
  ];

  let passedTests = 0;
  let totalTests = routes.length;

  for (const route of routes) {
    try {
      console.log(`Testing ${route.name}...`);
      const response = await axios.get(`${BASE_URL}${route.path}`);
      
      if (response.status === 200) {
        console.log(`✅ ${route.name} - Status: ${response.status}`);
        
        // Check content type
        const contentType = response.headers['content-type'];
        if (route.path.includes('/api/')) {
          if (contentType.includes('application/json')) {
            console.log(`   📄 JSON response received`);
            if (route.path === '/docs/api/list') {
              const data = response.data;
              console.log(`   📋 Found ${data.documents.length} documentation entries`);
            }
          }
        } else {
          if (contentType.includes('text/html')) {
            console.log(`   📄 HTML response received`);
            const contentLength = response.data.length;
            console.log(`   📏 Content length: ${contentLength} characters`);
          }
        }
        
        passedTests++;
      } else {
        console.log(`❌ ${route.name} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${route.name} - Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
      }
    }
    console.log('');
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} routes working`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All documentation routes are working correctly!');
    console.log('\n📚 Available Documentation:');
    console.log('   • Main Help Center: http://localhost:5000/docs');
    console.log('   • Quick Fixes: http://localhost:5000/docs/video-call-quick-fixes');
    console.log('   • FAQ: http://localhost:5000/docs/video-call-faq');
    console.log('   • Troubleshooting: http://localhost:5000/docs/video-call-troubleshooting');
    console.log('   • Support Guide: http://localhost:5000/docs/video-call-support');
  } else {
    console.log('⚠️  Some documentation routes are not working. Check server logs.');
  }

  return passedTests === totalTests;
}

// Test individual route functionality
async function testRouteContent() {
  console.log('\n🔍 Testing Route Content Quality\n');

  try {
    // Test API endpoint
    const apiResponse = await axios.get(`${BASE_URL}/docs/api/list`);
    const docs = apiResponse.data.documents;
    
    console.log('📋 API Documentation List:');
    docs.forEach(doc => {
      console.log(`   • ${doc.title}: ${doc.url}`);
    });

    // Test HTML content
    const htmlResponse = await axios.get(`${BASE_URL}/docs/video-call-quick-fixes`);
    const htmlContent = htmlResponse.data;
    
    // Check for key elements
    const hasTitle = htmlContent.includes('<title>');
    const hasNavigation = htmlContent.includes('nav-menu');
    const hasBackLink = htmlContent.includes('back-link');
    const hasContent = htmlContent.includes('Quick Fixes');
    
    console.log('\n🔍 HTML Content Analysis:');
    console.log(`   Title tag: ${hasTitle ? '✅' : '❌'}`);
    console.log(`   Navigation menu: ${hasNavigation ? '✅' : '❌'}`);
    console.log(`   Back link: ${hasBackLink ? '✅' : '❌'}`);
    console.log(`   Expected content: ${hasContent ? '✅' : '❌'}`);

    return hasTitle && hasNavigation && hasBackLink && hasContent;
  } catch (error) {
    console.log(`❌ Content test failed: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Documentation Route Tests\n');
  console.log('Make sure your server is running on http://localhost:5000\n');

  try {
    // Test basic connectivity
    await axios.get(`${BASE_URL}/api/auth/test`);
    console.log('✅ Server is running and accessible\n');
  } catch (error) {
    console.log('❌ Server is not accessible. Please start the server first.');
    console.log('   Run: npm start or node server/index.js\n');
    return;
  }

  const routesWorking = await testDocumentationRoutes();
  const contentGood = await testRouteContent();

  console.log('\n' + '='.repeat(50));
  console.log('📋 FINAL TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Routes Working: ${routesWorking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Content Quality: ${contentGood ? '✅ PASS' : '❌ FAIL'}`);
  
  if (routesWorking && contentGood) {
    console.log('\n🎉 Task 14 Documentation & Support - COMPLETE!');
    console.log('\n✅ What was implemented:');
    console.log('   • Complete documentation route system');
    console.log('   • HTML-formatted troubleshooting guides');
    console.log('   • Navigation between all help documents');
    console.log('   • API endpoint for programmatic access');
    console.log('   • Responsive design with professional styling');
    console.log('   • Emergency support contact information');
    console.log('\n🌐 Users can now access help at: http://localhost:5000/docs');
  } else {
    console.log('\n⚠️  Some issues need to be resolved before Task 14 is complete.');
  }
}

// Run the tests
runTests().catch(console.error);