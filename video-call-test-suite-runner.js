/**
 * Video Call Test Suite Runner
 * 
 * Runs existing video call tests and generates a comprehensive report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VideoCallTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: { passed: 0, failed: 0, skipped: 0 },
      categories: {},
      details: []
    };
  }

  async runTest(testName, command, category = 'general') {
    console.log(`🔍 Running: ${testName}`);
    
    if (!this.results.categories[category]) {
      this.results.categories[category] = { passed: 0, failed: 0, skipped: 0 };
    }
    
    try {
      const output = execSync(command, { 
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf8'
      });
      
      console.log(`   ✅ PASSED: ${testName}`);
      this.results.summary.passed++;
      this.results.categories[category].passed++;
      this.results.details.push({
        name: testName,
        category,
        status: 'PASSED',
        output: output.slice(-200)
      });
      
      return true;
    } catch (error) {
      console.log(`   ❌ FAILED: ${testName}`);
      console.log(`      Error: ${error.message.slice(0, 100)}...`);
      
      this.results.summary.failed++;
      this.results.categories[category].failed++;
      this.results.details.push({
        name: testName,
        category,
        status: 'FAILED',
        error: error.message.slice(0, 300)
      });
      
      return false;
    }
  }

  async runExistingTests() {
    console.log('🚀 Running Video Call Test Suite\n');
    
    // Test existing standalone test files
    const standaloneTests = [
      {
        name: 'Video Call API Tests',
        command: 'node test-video-call-api.js',
        category: 'api'
      },
      {
        name: 'Security Comprehensive Tests',
        command: 'node test-video-call-security-comprehensive.js',
        category: 'security'
      },
      {
        name: 'Error Handling Tests',
        command: 'node test-video-call-error-handling.js',
        category: 'error-handling'
      },
      {
        name: 'Audit Logging Tests',
        command: 'node test-video-call-audit-logging.js',
        category: 'security'
      },
      {
        name: 'WSS Security Tests',
        command: 'node test-wss-security-validation.js',
        category: 'security'
      }
    ];

    // Run standalone tests
    for (const test of standaloneTests) {
      if (fs.existsSync(test.command.split(' ')[1])) {
        await this.runTest(test.name, test.command, test.category);
      } else {
        console.log(`   ⏭️  SKIPPED: ${test.name} (file not found)`);
        this.results.summary.skipped++;
        this.results.categories[test.category] = this.results.categories[test.category] || { passed: 0, failed: 0, skipped: 0 };
        this.results.categories[test.category].skipped++;
      }
    }

    // Test server Jest tests
    const serverTestDir = 'server/test';
    if (fs.existsSync(serverTestDir)) {
      const videoCallTests = fs.readdirSync(serverTestDir)
        .filter(file => file.includes('videoCall') && file.endsWith('.test.js'));
      
      for (const testFile of videoCallTests) {
        await this.runTest(
          `Server: ${testFile}`,
          `cd server && npm test -- "${testFile}" --runInBand --silent`,
          'server-unit'
        );
      }
    }

    // Test client component tests
    const clientTestDir = 'client/src/components/VideoCall';
    if (fs.existsSync(clientTestDir)) {
      const componentTests = fs.readdirSync(clientTestDir)
        .filter(file => file.endsWith('.test.js'));
      
      for (const testFile of componentTests) {
        await this.runTest(
          `Client: ${testFile}`,
          `cd client && npm test -- --testPathPattern="${testFile}" --watchAll=false --silent`,
          'client-unit'
        );
      }
    }
  }

  generateReport() {
    console.log('\n📋 TEST SUITE REPORT');
    console.log('='.repeat(50));
    
    const total = this.results.summary.passed + this.results.summary.failed + this.results.summary.skipped;
    const successRate = total > 0 ? Math.round((this.results.summary.passed / (this.results.summary.passed + this.results.summary.failed)) * 100) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    // Category breakdown
    console.log('\n📂 Category Results:');
    for (const [category, results] of Object.entries(this.results.categories)) {
      const categoryTotal = results.passed + results.failed + results.skipped;
      const categorySuccess = results.failed === 0 && results.passed > 0 ? '✅' : results.failed > 0 ? '❌' : '⏭️';
      console.log(`   ${categorySuccess} ${category.toUpperCase()}: ${results.passed}/${results.passed + results.failed} passed`);
    }
    
    // Failed tests details
    const failedTests = this.results.details.filter(test => test.status === 'FAILED');
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.error.slice(0, 100)}...`);
      });
    }
    
    // Save detailed report
    const reportFile = `video-call-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    
    // Overall status
    const overallStatus = this.results.summary.failed === 0 && this.results.summary.passed > 0 ? 'PASS' : 'FAIL';
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
    
    return overallStatus === 'PASS';
  }

  async runFullSuite() {
    await this.runExistingTests();
    
    // Run performance benchmarks
    console.log('\n📈 Running Performance Benchmarks...');
    try {
      execSync('node video-call-performance-benchmark.js', { stdio: 'pipe' });
      console.log('   ✅ Performance benchmarks completed');
    } catch (error) {
      console.log('   ❌ Performance benchmarks failed');
    }
    
    // Generate compatibility matrix
    console.log('\n🌐 Generating Compatibility Matrix...');
    try {
      execSync('node video-call-compatibility-matrix.js', { stdio: 'pipe' });
      console.log('   ✅ Compatibility matrix generated');
    } catch (error) {
      console.log('   ❌ Compatibility matrix generation failed');
    }
    
    return this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new VideoCallTestRunner();
  runner.runFullSuite().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = VideoCallTestRunner;