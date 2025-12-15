/**
 * Simple test to verify M-Pesa routes file structure
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing M-Pesa Route Registration...\n');

try {
  // Check if mpesa routes file exists
  const mpesaRoutesPath = path.join(__dirname, 'server', 'routes', 'mpesa.js');
  
  if (!fs.existsSync(mpesaRoutesPath)) {
    console.error('❌ M-Pesa routes file not found at:', mpesaRoutesPath);
    process.exit(1);
  }
  
  console.log('✅ M-Pesa routes file exists');
  
  // Read the routes file
  const routesContent = fs.readFileSync(mpesaRoutesPath, 'utf8');
  
  // Check for expected route definitions
  const expectedRoutes = [
    { method: 'POST', path: '/initiate', description: 'Initiate M-Pesa payment' },
    { method: 'POST', path: '/callback', description: 'M-Pesa callback endpoint' },
    { method: 'GET', path: '/status/:sessionId', description: 'Check payment status' },
    { method: 'POST', path: '/test-connection', description: 'Test API connectivity' }
  ];
  
  console.log('\n📋 Checking for expected routes:\n');
  
  let allRoutesFound = true;
  
  expectedRoutes.forEach(route => {
    const escapedPath = route.path.replace(':sessionId', ':[^\'\"]+');
    const routePattern = new RegExp(`router\\.${route.method.toLowerCase()}\\(['\"]${escapedPath}`);
    
    if (routePattern.test(routesContent)) {
      console.log(`   ✅ ${route.method} /api/mpesa${route.path} - ${route.description}`);
    } else {
      console.log(`   ❌ ${route.method} /api/mpesa${route.path} - NOT FOUND`);
      allRoutesFound = false;
    }
  });
  
  // Check if server/index.js registers the routes
  console.log('\n📋 Checking server registration:\n');
  
  const serverIndexPath = path.join(__dirname, 'server', 'index.js');
  
  if (!fs.existsSync(serverIndexPath)) {
    console.error('❌ Server index file not found');
    process.exit(1);
  }
  
  const serverContent = fs.readFileSync(serverIndexPath, 'utf8');
  
  // Check if mpesa routes are imported and mounted
  const mpesaImportPattern = /require\(['"]\.\/routes\/mpesa['"]\)/;
  const mpesaMountPattern = /app\.use\(['"]\/api\/mpesa['"],\s*require\(['"]\.\/routes\/mpesa['"]\)\)/;
  
  if (mpesaMountPattern.test(serverContent)) {
    console.log('   ✅ M-Pesa routes are registered at /api/mpesa');
  } else if (mpesaImportPattern.test(serverContent)) {
    console.log('   ⚠️  M-Pesa routes imported but may not be mounted correctly');
    allRoutesFound = false;
  } else {
    console.log('   ❌ M-Pesa routes are NOT registered in server');
    allRoutesFound = false;
  }
  
  // Check for route logging
  if (serverContent.includes('mpesa routes loaded')) {
    console.log('   ✅ M-Pesa routes logging is configured');
  }
  
  if (allRoutesFound) {
    console.log('\n✅ SUCCESS: All M-Pesa routes are properly defined and registered!\n');
    console.log('📝 Route Registration Summary:');
    console.log('   - POST /api/mpesa/initiate - Initiate M-Pesa payment');
    console.log('   - POST /api/mpesa/callback - Receive M-Pesa callbacks');
    console.log('   - GET /api/mpesa/status/:sessionId - Check payment status');
    console.log('   - POST /api/mpesa/test-connection - Test API connectivity (Admin)\n');
    
    console.log('✅ Task 4.9 Complete: M-Pesa routes registered in main server file\n');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE: Some M-Pesa routes are missing or not properly registered!\n');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Error testing route registration:', error.message);
  process.exit(1);
}
