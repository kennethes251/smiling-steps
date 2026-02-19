#!/usr/bin/env node

/**
 * Video Call Feature - Staging Environment Setup
 * 
 * Sets up the staging environment with proper configuration,
 * database initialization, and monitoring setup.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class StagingEnvironmentSetup {
  constructor() {
    this.stagingConfig = {
      // Core settings
      NODE_ENV: 'staging',
      PORT: process.env.PORT || '5000',
      
      // Database
      MONGODB_URI: process.env.MONGODB_URI,
      
      // Authentication
      JWT_SECRET: process.env.JWT_SECRET,
      
      // Client configuration
      CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
      
      // Video call specific settings
      VIDEO_CALL_ENABLED: 'true',
      WEBRTC_DEBUG: 'true',
      SOCKET_IO_DEBUG: 'true',
      VIDEO_CALL_LOG_LEVEL: 'debug',
      
      // Security settings for staging
      CORS_ORIGIN: process.env.CLIENT_URL || 'http://localhost:3000',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_WINDOW: '15', // minutes
      RATE_LIMIT_MAX: '100', // requests per window
      
      // Monitoring and logging
      AUDIT_LOGGING: 'true',
      PERFORMANCE_MONITORING: 'true',
      ERROR_TRACKING: 'true',
      
      // WebRTC configuration
      STUN_SERVERS: 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302',
      TURN_SERVER_ENABLED: 'false', // Disable TURN for staging to save resources
      
      // Email configuration (use existing)
      EMAIL_HOST: process.env.EMAIL_HOST || '',
      EMAIL_PORT: process.env.EMAIL_PORT || '',
      EMAIL_USER: process.env.EMAIL_USER || '',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
      FROM_EMAIL: process.env.FROM_EMAIL || '',
      FROM_NAME: process.env.FROM_NAME || '',
      
      // M-Pesa configuration (sandbox for staging)
      MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || '',
      MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || '',
      MPESA_BUSINESS_SHORT_CODE: process.env.MPESA_BUSINESS_SHORT_CODE || '',
      MPESA_PASSKEY: process.env.MPESA_PASSKEY || '',
      MPESA_CALLBACK_URL: `http://localhost:${process.env.PORT || 5000}/api/mpesa/callback`,
      MPESA_ENVIRONMENT: 'sandbox'
    };
    
    console.log('🔧 Video Call Feature - Staging Environment Setup');
    console.log('=' .repeat(60));
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📝',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || '📝';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  createStagingEnvFile() {
    this.log('Creating staging environment file...', 'info');
    
    const envContent = Object.entries(this.stagingConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const envHeader = `# Video Call Feature - Staging Environment Configuration
# Generated on: ${new Date().toISOString()}
# 
# This file contains staging-specific configuration for the video call feature.
# It includes debug settings, monitoring, and staging-appropriate security settings.
#

`;
    
    fs.writeFileSync('.env.staging', envHeader + envContent);
    
    this.log('✅ Staging environment file created: .env.staging', 'success');
    
    return {
      file: '.env.staging',
      variables: Object.keys(this.stagingConfig).length
    };
  }

  createStagingStartScript() {
    this.log('Creating staging start script...', 'info');
    
    const startScript = `#!/bin/bash

# Video Call Feature - Staging Start Script
# This script starts the server in staging mode with proper configuration

echo "🚀 Starting Video Call Feature in Staging Mode..."
echo "=================================================="

# Load staging environment
export NODE_ENV=staging
if [ -f .env.staging ]; then
    echo "📋 Loading staging environment variables..."
    export $(cat .env.staging | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env.staging file not found, using default .env"
fi

# Display configuration
echo "🔧 Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   CLIENT_URL: $CLIENT_URL"
echo "   VIDEO_CALL_ENABLED: $VIDEO_CALL_ENABLED"
echo "   WEBRTC_DEBUG: $WEBRTC_DEBUG"
echo ""

# Start the server
echo "🎬 Starting server..."
node server/index.js

`;
    
    fs.writeFileSync('start-staging.sh', startScript);
    
    // Make script executable (Unix systems)
    try {
      fs.chmodSync('start-staging.sh', '755');
    } catch (error) {
      this.log('Warning: Could not make start script executable', 'warning');
    }
    
    // Create Windows batch file
    const batchScript = `@echo off
REM Video Call Feature - Staging Start Script (Windows)

echo 🚀 Starting Video Call Feature in Staging Mode...
echo ==================================================

REM Load staging environment
set NODE_ENV=staging
if exist .env.staging (
    echo 📋 Loading staging environment variables...
    for /f "delims=" %%x in (.env.staging) do (set "%%x")
) else (
    echo ⚠️  Warning: .env.staging file not found, using default .env
)

REM Display configuration
echo 🔧 Configuration:
echo    NODE_ENV: %NODE_ENV%
echo    PORT: %PORT%
echo    CLIENT_URL: %CLIENT_URL%
echo    VIDEO_CALL_ENABLED: %VIDEO_CALL_ENABLED%
echo    WEBRTC_DEBUG: %WEBRTC_DEBUG%
echo.

REM Start the server
echo 🎬 Starting server...
node server/index.js
`;
    
    fs.writeFileSync('start-staging.bat', batchScript);
    
    this.log('✅ Staging start scripts created: start-staging.sh, start-staging.bat', 'success');
    
    return {
      scripts: ['start-staging.sh', 'start-staging.bat']
    };
  }

  createStagingDocumentation() {
    this.log('Creating staging documentation...', 'info');
    
    const documentation = `# Video Call Feature - Staging Environment Guide

## Overview

This staging environment is configured specifically for testing the video call feature before production deployment. It includes enhanced logging, debugging capabilities, and staging-appropriate security settings.

## Quick Start

### Option 1: Using Staging Scripts
\`\`\`bash
# Unix/Linux/macOS
./start-staging.sh

# Windows
start-staging.bat
\`\`\`

### Option 2: Manual Start
\`\`\`bash
# Load staging environment
export NODE_ENV=staging
source .env.staging  # or: export $(cat .env.staging | grep -v '^#' | xargs)

# Start server
npm start
\`\`\`

## Configuration

The staging environment includes the following key configurations:

### Video Call Settings
- **VIDEO_CALL_ENABLED**: true
- **WEBRTC_DEBUG**: true (enhanced WebRTC logging)
- **SOCKET_IO_DEBUG**: true (detailed Socket.IO logs)
- **VIDEO_CALL_LOG_LEVEL**: debug

### Security Settings
- **RATE_LIMIT_ENABLED**: true
- **AUDIT_LOGGING**: true
- **CORS_ORIGIN**: Configured for local development

### Monitoring
- **PERFORMANCE_MONITORING**: true
- **ERROR_TRACKING**: true

## Testing

### 1. Run Deployment Validation
\`\`\`bash
node deploy-video-call-staging.js
\`\`\`

### 2. Run Staging Tests
\`\`\`bash
node test-video-call-staging.js
\`\`\`

### 3. Manual Testing Checklist

#### API Endpoints
- [ ] Health check: \`GET /health\`
- [ ] Video call config: \`GET /api/video-calls/config\`
- [ ] Generate room: \`POST /api/video-calls/generate-room/:sessionId\`
- [ ] Can join: \`GET /api/video-calls/can-join/:sessionId\`
- [ ] Start call: \`POST /api/video-calls/start/:sessionId\`
- [ ] End call: \`POST /api/video-calls/end/:sessionId\`

#### WebSocket Events
- [ ] Connection establishment
- [ ] Authentication
- [ ] Room joining
- [ ] Offer/Answer exchange
- [ ] ICE candidate exchange
- [ ] Disconnection handling

#### Frontend Components
- [ ] Video call page loads
- [ ] Camera/microphone permissions
- [ ] Video feed display
- [ ] Audio controls
- [ ] Screen sharing
- [ ] Call termination

## URLs

### API Endpoints
- Health: http://localhost:${this.stagingConfig.PORT}/health
- Video Call Config: http://localhost:${this.stagingConfig.PORT}/api/video-calls/config

### Frontend
- Main App: ${this.stagingConfig.CLIENT_URL}
- Video Call Page: ${this.stagingConfig.CLIENT_URL}/video-call/:sessionId

## Monitoring

### Logs
The staging environment provides enhanced logging:
- WebRTC connection details
- Socket.IO event tracking
- API request/response logging
- Error stack traces
- Performance metrics

### Debug Information
- Set \`WEBRTC_DEBUG=true\` for detailed WebRTC logs
- Set \`SOCKET_IO_DEBUG=true\` for Socket.IO debugging
- Check browser console for client-side logs

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if server is running on correct port
   - Verify CORS configuration
   - Check browser console for errors

2. **Video Call Config Not Loading**
   - Verify STUN servers are accessible
   - Check network connectivity
   - Review server logs for errors

3. **Authentication Issues**
   - Ensure JWT_SECRET is configured
   - Check token expiration
   - Verify user permissions

### Debug Commands

\`\`\`bash
# Check server status
curl http://localhost:${this.stagingConfig.PORT}/health

# Test video call config
curl http://localhost:${this.stagingConfig.PORT}/api/video-calls/config

# View server logs
tail -f server.log  # if logging to file

# Test WebSocket connection
wscat -c ws://localhost:${this.stagingConfig.PORT}
\`\`\`

## Next Steps

After successful staging testing:

1. Review all test results
2. Fix any identified issues
3. Update production configuration
4. Deploy to production environment
5. Monitor production deployment

## Support

For issues or questions:
- Check server logs for error details
- Review test reports for failure analysis
- Consult video call documentation
- Contact development team

---

Generated on: ${new Date().toISOString()}
Environment: Staging
Version: Video Call Feature v1.0
`;
    
    fs.writeFileSync('STAGING_ENVIRONMENT_GUIDE.md', documentation);
    
    this.log('✅ Staging documentation created: STAGING_ENVIRONMENT_GUIDE.md', 'success');
    
    return {
      file: 'STAGING_ENVIRONMENT_GUIDE.md'
    };
  }

  createMonitoringScript() {
    this.log('Creating monitoring script...', 'info');
    
    const monitoringScript = `#!/usr/bin/env node

/**
 * Video Call Feature - Staging Monitoring Script
 * 
 * Monitors the staging environment for health, performance, and issues.
 */

require('dotenv').config();
const axios = require('axios');

class StagingMonitor {
  constructor() {
    this.baseURL = \`http://localhost:\${process.env.PORT || 5000}\`;
    this.checkInterval = 30000; // 30 seconds
    this.isRunning = false;
  }

  async checkHealth() {
    try {
      const response = await axios.get(\`\${this.baseURL}/health\`, { timeout: 5000 });
      return {
        status: 'healthy',
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        code: error.code
      };
    }
  }

  async checkVideoCallConfig() {
    try {
      const response = await axios.get(\`\${this.baseURL}/api/video-calls/config\`, { timeout: 5000 });
      return {
        status: 'available',
        servers: response.data.iceServers?.length || 0
      };
    } catch (error) {
      return {
        status: 'unavailable',
        error: error.message
      };
    }
  }

  async runChecks() {
    const timestamp = new Date().toISOString();
    console.log(\`\\n📊 [\${timestamp}] Staging Health Check\`);
    console.log('=' .repeat(50));

    // Health check
    const health = await this.checkHealth();
    console.log(\`🏥 Health: \${health.status}\`);
    if (health.status === 'healthy') {
      console.log(\`   Database: \${health.data.database}\`);
      console.log(\`   Response Time: \${health.responseTime}\`);
    } else {
      console.log(\`   Error: \${health.error}\`);
    }

    // Video call config check
    const videoCall = await this.checkVideoCallConfig();
    console.log(\`📹 Video Call Config: \${videoCall.status}\`);
    if (videoCall.status === 'available') {
      console.log(\`   ICE Servers: \${videoCall.servers}\`);
    } else {
      console.log(\`   Error: \${videoCall.error}\`);
    }

    // Overall status
    const overallStatus = health.status === 'healthy' && videoCall.status === 'available' 
      ? '✅ HEALTHY' 
      : '❌ ISSUES DETECTED';
    console.log(\`\\n🎯 Overall Status: \${overallStatus}\`);
  }

  start() {
    console.log('🔍 Starting Video Call Staging Monitor...');
    console.log(\`🌐 Monitoring: \${this.baseURL}\`);
    console.log(\`⏱️  Check Interval: \${this.checkInterval / 1000}s\`);
    console.log('Press Ctrl+C to stop monitoring');

    this.isRunning = true;
    
    // Run initial check
    this.runChecks();
    
    // Set up interval
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      this.runChecks();
    }, this.checkInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Stopping monitor...');
      this.isRunning = false;
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// Start monitoring if called directly
if (require.main === module) {
  const monitor = new StagingMonitor();
  monitor.start();
}

module.exports = StagingMonitor;
`;
    
    fs.writeFileSync('monitor-staging.js', monitoringScript);
    
    this.log('✅ Monitoring script created: monitor-staging.js', 'success');
    
    return {
      file: 'monitor-staging.js'
    };
  }

  setup() {
    try {
      this.log('Setting up staging environment for video call feature...', 'info');
      
      // Create all staging files
      const envResult = this.createStagingEnvFile();
      const scriptsResult = this.createStagingStartScript();
      const docsResult = this.createStagingDocumentation();
      const monitorResult = this.createMonitoringScript();
      
      console.log('\n' + '='.repeat(60));
      this.log('🎉 Staging environment setup completed!', 'success');
      console.log('='.repeat(60));
      
      console.log('\n📁 FILES CREATED:');
      console.log(`   📄 ${envResult.file} (${envResult.variables} variables)`);
      scriptsResult.scripts.forEach(script => {
        console.log(`   🚀 ${script}`);
      });
      console.log(`   📖 ${docsResult.file}`);
      console.log(`   📊 ${monitorResult.file}`);
      
      console.log('\n🚀 NEXT STEPS:');
      console.log('   1. Review staging configuration in .env.staging');
      console.log('   2. Start staging server: ./start-staging.sh (or start-staging.bat)');
      console.log('   3. Run deployment validation: node deploy-video-call-staging.js');
      console.log('   4. Run staging tests: node test-video-call-staging.js');
      console.log('   5. Monitor staging health: node monitor-staging.js');
      console.log('   6. Read full guide: STAGING_ENVIRONMENT_GUIDE.md');
      
      console.log('\n🔗 STAGING URLS:');
      console.log(`   • Health Check: http://localhost:${this.stagingConfig.PORT}/health`);
      console.log(`   • Video Call Config: http://localhost:${this.stagingConfig.PORT}/api/video-calls/config`);
      console.log(`   • Frontend: ${this.stagingConfig.CLIENT_URL}`);
      
      return {
        success: true,
        files: [envResult.file, ...scriptsResult.scripts, docsResult.file, monitorResult.file]
      };
      
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new StagingEnvironmentSetup();
  setup.setup().catch(console.error);
}

module.exports = StagingEnvironmentSetup;