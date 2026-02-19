#!/usr/bin/env node

/**
 * Integration Test Runner
 * 
 * Runs comprehensive system integration tests for the teletherapy booking enhancement.
 * This script executes all test suites and generates a detailed report.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_SUITES = [
  {
    name: 'System Integration Tests',
    file: 'system-integration.test.js',
    description: 'End-to-end workflow testing'
  },
  {
    name: 'Security Audit Tests',
    file: 'security-audit.test.js',
    description: 'HIPAA compliance and security verification'
  },
  {
    name: 'Requirements Verification Tests',
    file: 'requirements-verification.test.js',
    description: 'Systematic verification of all 15 requirements'
  },
  {
    name: 'Performance Tests',
    file: 'performance-monitoring.test.js',
    description: 'Response time and performance validation'
  },
  {
    name: 'Database Optimization Tests',
    file: 'database-optimization.test.js',
    description: 'Query performance and indexing verification'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
  console.log(colorize('\n' + '='.repeat(80), 'cyan'));
  console.log(colorize('TELETHERAPY BOOKING ENHANCEMENT - SYSTEM INTEGRATION TESTS', 'cyan'));
  console.log(colorize('='.repeat(80), 'cyan'));
  console.log(colorize(`Started at: ${new Date().toISOString()}`, 'blue'));
  console.log(colorize('='.repeat(80), 'cyan'));
}

function printSummary(results) {
  console.log(colorize('\n' + '='.repeat(80), 'cyan'));
  console.log(colorize('TEST EXECUTION SUMMARY', 'cyan'));
  console.log(colorize('='.repeat(80), 'cyan'));
  
  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.status === 'PASSED').length;
  const failedSuites = results.filter(r => r.status === 'FAILED').length;
  const skippedSuites = results.filter(r => r.status === 'SKIPPED').length;
  
  console.log(`Total Test Suites: ${totalSuites}`);
  console.log(colorize(`Passed: ${passedSuites}`, 'green'));
  console.log(colorize(`Failed: ${failedSuites}`, 'red'));
  console.log(colorize(`Skipped: ${skippedSuites}`, 'yellow'));
  
  const totalTests = results.reduce((sum, r) => sum + (r.tests || 0), 0);
  const totalPassed = results.reduce((sum, r) => sum + (r.passed || 0), 0);
  const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(colorize(`Total Passed: ${totalPassed}`, 'green'));
  console.log(colorize(`Total Failed: ${totalFailed}`, 'red'));
  
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  console.log(`Success Rate: ${successRate}%`);
  
  console.log(colorize('\n' + '='.repeat(80), 'cyan'));
  
  // Overall status
  if (failedSuites === 0) {
    console.log(colorize('🎉 ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT', 'green'));
  } else {
    console.log(colorize('❌ SOME TESTS FAILED - REVIEW REQUIRED BEFORE DEPLOYMENT', 'red'));
  }
  
  console.log(colorize('='.repeat(80), 'cyan'));
}

function runTestSuite(suite) {
  console.log(colorize(`\n📋 Running: ${suite.name}`, 'bright'));
  console.log(colorize(`   ${suite.description}`, 'blue'));
  console.log(colorize(`   File: ${suite.file}`, 'blue'));
  
  const testFilePath = path.join(__dirname, suite.file);
  
  // Check if test file exists
  if (!fs.existsSync(testFilePath)) {
    console.log(colorize(`   ⚠️  Test file not found: ${suite.file}`, 'yellow'));
    return {
      name: suite.name,
      status: 'SKIPPED',
      reason: 'Test file not found',
      duration: 0
    };
  }
  
  const startTime = Date.now();
  
  try {
    // Run the test suite
    const output = execSync(`npm test -- --testPathPattern="${suite.file}" --verbose`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    
    // Parse Jest output to extract test results
    const testResults = parseJestOutput(output);
    
    console.log(colorize(`   ✅ PASSED (${duration}ms)`, 'green'));
    console.log(colorize(`   Tests: ${testResults.tests}, Passed: ${testResults.passed}, Failed: ${testResults.failed}`, 'blue'));
    
    return {
      name: suite.name,
      status: 'PASSED',
      duration,
      tests: testResults.tests,
      passed: testResults.passed,
      failed: testResults.failed,
      output: output
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(colorize(`   ❌ FAILED (${duration}ms)`, 'red'));
    
    // Try to parse error output for test results
    const testResults = parseJestOutput(error.stdout || error.message || '');
    
    console.log(colorize(`   Tests: ${testResults.tests}, Passed: ${testResults.passed}, Failed: ${testResults.failed}`, 'blue'));
    
    // Show first few lines of error
    const errorLines = (error.stdout || error.message || '').split('\n').slice(0, 5);
    errorLines.forEach(line => {
      if (line.trim()) {
        console.log(colorize(`   ${line}`, 'red'));
      }
    });
    
    return {
      name: suite.name,
      status: 'FAILED',
      duration,
      tests: testResults.tests,
      passed: testResults.passed,
      failed: testResults.failed,
      error: error.message,
      output: error.stdout
    };
  }
}

function parseJestOutput(output) {
  const results = {
    tests: 0,
    passed: 0,
    failed: 0
  };
  
  // Parse Jest summary line
  const summaryMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (summaryMatch) {
    results.failed = parseInt(summaryMatch[1]);
    results.passed = parseInt(summaryMatch[2]);
    results.tests = parseInt(summaryMatch[3]);
  } else {
    // Try alternative format
    const passedMatch = output.match(/(\d+)\s+passing/);
    const failedMatch = output.match(/(\d+)\s+failing/);
    
    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    results.tests = results.passed + results.failed;
  }
  
  return results;
}

function generateReport(results) {
  const reportPath = path.join(__dirname, '..', 'integration-test-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSuites: results.length,
      passedSuites: results.filter(r => r.status === 'PASSED').length,
      failedSuites: results.filter(r => r.status === 'FAILED').length,
      skippedSuites: results.filter(r => r.status === 'SKIPPED').length,
      totalTests: results.reduce((sum, r) => sum + (r.tests || 0), 0),
      totalPassed: results.reduce((sum, r) => sum + (r.passed || 0), 0),
      totalFailed: results.reduce((sum, r) => sum + (r.failed || 0), 0),
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    },
    results: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(colorize(`\n📄 Detailed report saved to: ${reportPath}`, 'blue'));
  
  return report;
}

function checkPrerequisites() {
  console.log(colorize('\n🔍 Checking prerequisites...', 'blue'));
  
  // Check if we're in the right directory
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(colorize('❌ package.json not found. Please run from server directory.', 'red'));
    process.exit(1);
  }
  
  // Check if test environment is set up
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  
  // Check if MongoDB test URI is available
  if (!process.env.MONGODB_URI_TEST && !process.env.MONGODB_URI) {
    console.log(colorize('⚠️  No test database URI found. Using default.', 'yellow'));
  }
  
  console.log(colorize('✅ Prerequisites check passed', 'green'));
}

async function main() {
  try {
    printHeader();
    checkPrerequisites();
    
    const results = [];
    
    // Run each test suite
    for (const suite of TEST_SUITES) {
      const result = runTestSuite(suite);
      results.push(result);
      
      // Add a small delay between test suites
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate report
    const report = generateReport(results);
    
    // Print summary
    printSummary(results);
    
    // Exit with appropriate code
    const hasFailures = results.some(r => r.status === 'FAILED');
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error(colorize(`\n❌ Test runner error: ${error.message}`, 'red'));
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(colorize('\n\n⚠️  Test execution interrupted by user', 'yellow'));
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(colorize('\n\n⚠️  Test execution terminated', 'yellow'));
  process.exit(143);
});

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error(colorize(`Fatal error: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = {
  runTestSuite,
  generateReport,
  TEST_SUITES
};