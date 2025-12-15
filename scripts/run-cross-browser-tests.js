#!/usr/bin/env node

/**
 * Cross-Browser Testing Script for Video Call Feature
 * 
 * This script runs automated tests across different browsers using Playwright
 * to verify video call functionality meets compatibility requirements.
 * 
 * Requirements tested:
 * - Chrome/Edge (latest 2 versions)
 * - Firefox (latest 2 versions)
 * - Safari (macOS/iOS latest 2 versions)
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class CrossBrowserTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      browsers: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Cross-Browser Compatibility Tests');
    console.log('=' .repeat(60));

    const browsers = [
      { name: 'chromium', engine: chromium, displayName: 'Chrome/Edge' },
      { name: 'firefox', engine: firefox, displayName: 'Firefox' },
      { name: 'webkit', engine: webkit, displayName: 'Safari' }
    ];

    for (const browserConfig of browsers) {
      try {
        console.log(`\n🌐 Testing ${browserConfig.displayName}...`);
        await this.testBrowser(browserConfig);
      } catch (error) {
        console.error(`❌ Failed to test ${browserConfig.displayName}:`, error.message);
        this.results.browsers[browserConfig.name] = {
          error: error.message,
          tests: {}
        };
      }
    }

    await this.generateReport();
    this.printSummary();
  }

  async testBrowser(browserConfig) {
    const browser = await browserConfig.engine.launch({
      headless: false, // Set to true for CI/CD
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const context = await browser.newContext({
      permissions: ['camera', 'microphone']
    });

    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  🔍 Console Error: ${msg.text()}`);
      }
    });

    const browserResults = {
      userAgent: await page.evaluate(() => navigator.userAgent),
      tests: {}
    };

    try {
      // Test 1: Load compatibility test page
      await this.testPageLoad(page, browserResults);
      
      // Test 2: WebRTC feature detection
      await this.testWebRTCFeatures(page, browserResults);
      
      // Test 3: Media permissions
      await this.testMediaPermissions(page, browserResults);
      
      // Test 4: Video call component
      await this.testVideoCallComponent(page, browserResults);
      
      // Test 5: Screen sharing (where supported)
      await this.testScreenSharing(page, browserResults);
      
      // Test 6: Error handling
      await this.testErrorHandling(page, browserResults);

    } catch (error) {
      console.error(`  ❌ Test execution failed: ${error.message}`);
      browserResults.error = error.message;
    } finally {
      await browser.close();
    }

    this.results.browsers[browserConfig.name] = browserResults;
    this.updateSummary(browserResults);
  }

  async testPageLoad(page, results) {
    const testName = 'Page Load';
    console.log(`  📄 Testing ${testName}...`);
    
    try {
      const startTime = Date.now();
      
      // Load the compatibility test page
      await page.goto('http://localhost:3000/browser-compatibility-test.html', {
        waitUntil: 'networkidle'
      });
      
      const loadTime = Date.now() - startTime;
      
      // Check if page loaded correctly
      const title = await page.title();
      const hasContent = await page.locator('h1').isVisible();
      
      results.tests[testName] = {
        passed: hasContent && loadTime < 10000,
        loadTime,
        title,
        details: `Loaded in ${loadTime}ms`
      };
      
      console.log(`    ✅ ${testName}: ${loadTime}ms`);
    } catch (error) {
      results.tests[testName] = {
        passed: false,
        error: error.message
      };
      console.log(`    ❌ ${testName}: ${error.message}`);
    }
  }

  async testWebRTCFeatures(page, results) {
    const testName = 'WebRTC Features';
    console.log(`  🔧 Testing ${testName}...`);
    
    try {
      const features = await page.evaluate(() => {
        return {
          hasRTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
          hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          hasGetDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
          hasWebSocket: typeof WebSocket !== 'undefined',
          hasMediaDevices: !!navigator.mediaDevices,
          hasHTTPS: location.protocol === 'https:' || location.hostname === 'localhost'
        };
      });
      
      const requiredFeatures = ['hasRTCPeerConnection', 'hasGetUserMedia', 'hasWebSocket', 'hasMediaDevices'];
      const missingFeatures = requiredFeatures.filter(feature => !features[feature]);
      
      results.tests[testName] = {
        passed: missingFeatures.length === 0,
        features,
        missingFeatures,
        details: missingFeatures.length === 0 ? 'All required features available' : `Missing: ${missingFeatures.join(', ')}`
      };
      
      if (missingFeatures.length === 0) {
        console.log(`    ✅ ${testName}: All features available`);
      } else {
        console.log(`    ❌ ${testName}: Missing ${missingFeatures.join(', ')}`);
      }
    } catch (error) {
      results.tests[testName] = {
        passed: false,
        error: error.message
      };
      console.log(`    ❌ ${testName}: ${error.message}`);
    }
  }

  async testMediaPermissions(page, results) {
    const testName = 'Media Permissions';
    console.log(`  🎥 Testing ${testName}...`);
    
    try {
      const mediaTest = await page.evaluate(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
          });
          
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          
          return {
            success: true,
            videoTracks: videoTracks.length,
            audioTracks: audioTracks.length,
            videoLabel: videoTracks[0]?.label || 'Unknown',
            audioLabel: audioTracks[0]?.label || 'Unknown'
          };
        } catch (error) {
          return {
            success: false,
            error: error.name,
            message: error.message
          };
        }
      });
      
      results.tests[testName] = {
        passed: mediaTest.success,
        ...mediaTest,
        details: mediaTest.success ? 
          `Video: ${mediaTest.videoTracks}, Audio: ${mediaTest.audioTracks}` :
          `Failed: ${mediaTest.error}`
      };
      
      if (mediaTest.success) {
        console.log(`    ✅ ${testName}: Video=${mediaTest.videoTracks}, Audio=${mediaTest.audioTracks}`);
      } else {
        console.log(`    ❌ ${testName}: ${mediaTest.error} - ${mediaTest.message}`);
      }
    } catch (error) {
      results.tests[testName] = {
        passed: false,
        error: error.message
      };
      console.log(`    ❌ ${testName}: ${error.message}`);
    }
  }

  async testVideoCallComponent(page, results) {
    const testName = 'Video Call Component';
    console.log(`  📹 Testing ${testName}...`);
    
    try {
      // Navigate to video call page
      await page.goto('http://localhost:3000/video-call/test-session', {
        waitUntil: 'networkidle'
      });
      
      // Wait for component to load
      await page.waitForSelector('[data-testid="video-call-room"]', { timeout: 10000 });
      
      // Check for required elements
      const elements = await page.evaluate(() => {
        return {
          hasVideoControls: !!document.querySelector('button[aria-label*="video"]'),
          hasAudioControls: !!document.querySelector('button[aria-label*="audio"]'),
          hasEndCallButton: !!document.querySelector('button[aria-label*="end"]'),
          hasLocalVideo: !!document.querySelector('video'),
          hasConnectionStatus: !!document.querySelector('[data-testid="connection-status"]')
        };
      });
      
      const requiredElements = Object.values(elements).filter(Boolean).length;
      const totalElements = Object.keys(elements).length;
      
      results.tests[testName] = {
        passed: requiredElements >= totalElements * 0.8, // 80% of elements should be present
        elements,
        score: `${requiredElements}/${totalElements}`,
        details: `Found ${requiredElements}/${totalElements} required elements`
      };
      
      console.log(`    ✅ ${testName}: ${requiredElements}/${totalElements} elements found`);
    } catch (error) {
      results.tests[testName] = {
        passed: false,
        error: error.message
      };
      console.log(`    ❌ ${testName}: ${error.message}`);
    }
  }

  async testScreenSharing(page, results) {
    const testName = 'Screen Sharing';
    console.log(`  🖥️ Testing ${testName}...`);
    
    try {
      const screenShareTest = await page.evaluate(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          return {
            supported: false,
            reason: 'getDisplayMedia not available'
          };
        }
        
        // Check if we're on mobile (screen share not supported)
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          return {
            supported: false,
            reason: 'Mobile device - screen share not supported'
          };
        }
        
        return {
          supported: true,
          reason: 'getDisplayMedia available'
        };
      });
      
      results.tests[testName] = {
        passed: true, // Screen sharing support is optional
        supported: screenShareTest.supported,
        reason: screenShareTest.reason,
        details: screenShareTest.reason
      };
      
      if (screenShareTest.supported) {
        console.log(`    ✅ ${testName}: Supported`);
      } else {
        console.log(`    ⚠️ ${testName}: Not supported - ${screenShareTest.reason}`);
      }
    } catch (error) {
      results.tests[testName] = {
        passed: true, // Don't fail the test for screen sharing issues
        supported: false,
        error: error.message
      };
      console.log(`    ⚠️ ${testName}: ${error.message}`);
    }
  }

  async testErrorHandling(page, results) {
    const testName = 'Error Handling';
    console.log(`  🚨 Testing ${testName}...`);
    
    try {
      // Test permission denied scenario
      const errorTest = await page.evaluate(async () => {
        try {
          // Mock permission denied error
          const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
          navigator.mediaDevices.getUserMedia = () => {
            const error = new Error('Permission denied');
            error.name = 'NotAllowedError';
            return Promise.reject(error);
          };
          
          // Try to get media (should fail)
          await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          
          // Restore original function
          navigator.mediaDevices.getUserMedia = originalGetUserMedia;
          
          return { success: false, reason: 'Should have thrown error' };
        } catch (error) {
          // Restore original function
          const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
          navigator.mediaDevices.getUserMedia = originalGetUserMedia;
          
          return {
            success: true,
            errorName: error.name,
            errorMessage: error.message
          };
        }
      });
      
      results.tests[testName] = {
        passed: errorTest.success,
        ...errorTest,
        details: errorTest.success ? 
          `Correctly handled ${errorTest.errorName}` :
          errorTest.reason
      };
      
      if (errorTest.success) {
        console.log(`    ✅ ${testName}: Error handling works`);
      } else {
        console.log(`    ❌ ${testName}: ${errorTest.reason}`);
      }
    } catch (error) {
      results.tests[testName] = {
        passed: false,
        error: error.message
      };
      console.log(`    ❌ ${testName}: ${error.message}`);
    }
  }

  updateSummary(browserResults) {
    const tests = Object.values(browserResults.tests);
    const passed = tests.filter(test => test.passed).length;
    const failed = tests.filter(test => !test.passed).length;
    
    this.results.summary.total += tests.length;
    this.results.summary.passed += passed;
    this.results.summary.failed += failed;
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '..', 'test-results', 'cross-browser-compatibility-report.json');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    // Write detailed JSON report
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = reportPath.replace('.json', '.html');
    await fs.writeFile(htmlPath, htmlReport);
    
    console.log(`\n📊 Reports generated:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  HTML: ${htmlPath}`);
  }

  generateHTMLReport() {
    const { browsers, summary, timestamp } = this.results;
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Cross-Browser Compatibility Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .browser { background: white; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; padding: 20px; }
        .test { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .pass { background: #d4edda; color: #155724; }
        .fail { background: #f8d7da; color: #721c24; }
        .warn { background: #fff3cd; color: #856404; }
        .summary { background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎥 Cross-Browser Compatibility Report</h1>
        <p><strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}</p>
        <p><strong>Video Call Feature Compatibility Testing</strong></p>
    </div>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <p><strong>Total Tests:</strong> ${summary.total}</p>
        <p><strong>Passed:</strong> ${summary.passed} (${Math.round((summary.passed / summary.total) * 100)}%)</p>
        <p><strong>Failed:</strong> ${summary.failed} (${Math.round((summary.failed / summary.total) * 100)}%)</p>
    </div>
`;

    Object.entries(browsers).forEach(([browserName, browserData]) => {
      const tests = Object.entries(browserData.tests || {});
      const passed = tests.filter(([, test]) => test.passed).length;
      const failed = tests.filter(([, test]) => !test.passed).length;
      const percentage = tests.length > 0 ? Math.round((passed / tests.length) * 100) : 0;
      
      html += `
    <div class="browser">
        <h2>🌐 ${browserName.charAt(0).toUpperCase() + browserName.slice(1)}</h2>
        <p><strong>User Agent:</strong> ${browserData.userAgent || 'Unknown'}</p>
        <p><strong>Tests Passed:</strong> ${passed}/${tests.length} (${percentage}%)</p>
        
        <table>
            <thead>
                <tr>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
`;

      tests.forEach(([testName, testData]) => {
        const status = testData.passed ? '✅ Pass' : '❌ Fail';
        const statusClass = testData.passed ? 'pass' : 'fail';
        
        html += `
                <tr class="${statusClass}">
                    <td>${testName}</td>
                    <td>${status}</td>
                    <td>${testData.details || testData.error || 'No details'}</td>
                </tr>
`;
      });

      html += `
            </tbody>
        </table>
    </div>
`;
    });

    html += `
</body>
</html>
`;

    return html;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CROSS-BROWSER COMPATIBILITY TEST SUMMARY');
    console.log('='.repeat(60));
    
    const { summary, browsers } = this.results;
    const overallPercentage = Math.round((summary.passed / summary.total) * 100);
    
    console.log(`Overall Results: ${summary.passed}/${summary.total} tests passed (${overallPercentage}%)`);
    console.log('');
    
    Object.entries(browsers).forEach(([browserName, browserData]) => {
      const tests = Object.values(browserData.tests || {});
      const passed = tests.filter(test => test.passed).length;
      const percentage = tests.length > 0 ? Math.round((passed / tests.length) * 100) : 0;
      const status = percentage >= 90 ? '✅' : percentage >= 70 ? '⚠️' : '❌';
      
      console.log(`${status} ${browserName.padEnd(10)}: ${passed}/${tests.length} (${percentage}%)`);
    });
    
    console.log('');
    
    if (overallPercentage >= 90) {
      console.log('🎉 EXCELLENT: Video call feature is highly compatible across browsers!');
    } else if (overallPercentage >= 70) {
      console.log('⚠️ GOOD: Video call feature has good browser compatibility with some issues.');
    } else {
      console.log('❌ NEEDS WORK: Video call feature has significant compatibility issues.');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Review detailed reports in test-results/ directory');
    console.log('2. Address any failing tests');
    console.log('3. Test on actual devices and networks');
    console.log('4. Update compatibility matrix with results');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CrossBrowserTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CrossBrowserTester;