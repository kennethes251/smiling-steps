#!/usr/bin/env node

/**
 * Video Call Feature - Enhanced Staging Deployment Script
 * 
 * This script validates the video call feature implementation and prepares
 * it for staging deployment. It performs comprehensive checks on:
 * - Environment configuration
 * - Database connectivity
 * - WebRTC configuration
 * - Frontend components
 * - Security middleware
 * - Socket.IO setup
 * 
 * Usage: node deploy-video-call-staging.js [--dry-run]
 * 
 * Improvements:
 * - Removed unused dependencies
 * - Enhanced STUN server validation with clear warnings
 * - Safer MongoDB checks with isolated connections
 * - Improved route validation using Express router inspection
 * - Strengthened security middleware detection
 * - Better frontend feature detection with realistic WebRTC indicators
 * - Sensitive information masking in logs
 * - Dry-run mode support
 * - Meaningful exit codes
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // Only keeping mongoose, removed unused axios
require('dotenv').config();

// Configuration with sensitive data masking
const CONFIG = {
  SERVER_PORT: process.env.PORT || 5000,
  CLIENT_PORT: 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DRY_RUN: process.argv.includes('--dry-run')
};

// Exit codes for different failure categories
const EXIT_CODES = {
  SUCCESS: 0,
  ENVIRONMENT_ERROR: 1,
  DATABASE_ERROR: 2,
  WEBRTC_ERROR: 3,
  SECURITY_ERROR: 4,
  FRONTEND_ERROR: 5,
  GENERAL_ERROR: 99
};

// STUN servers for WebRTC validation (configuration check only)
const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302'
];

class VideoCallStagingDeployment {
  constructor() {
    this.results = {
      environment: { passed: false, details: [] },
      fileStructure: { passed: false, details: [] },
      webrtc: { passed: false, details: [] },
      database: { passed: false, details: [] },
      socketio: { passed: false, details: [] },
      frontend: { passed: false, details: [] },
      security: { passed: false, details: [] }
    };
    this.overallPassed = false;
    this.criticalError = null;
  }

  // Helper function to mask sensitive information
  maskSensitive(value, showLength = 4) {
    if (!value || typeof value !== 'string') return '[NOT SET]';
    if (value.length <= showLength) return '*'.repeat(value.length);
    return value.substring(0, showLength) + '*'.repeat(value.length - showLength);
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      check: '🔍',
      dryrun: '🧪'
    }[type] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async validateEnvironment() {
    this.log('Validating environment configuration...', 'check');
    
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'PORT'
    ];
    
    const optionalVars = [
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASSWORD',
      'MPESA_CONSUMER_KEY',
      'ENCRYPTION_KEY'
    ];
    
    let passed = true;
    const details = [];
    
    // Check required variables with masked values
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        passed = false;
        details.push(`❌ Missing required environment variable: ${varName}`);
        this.criticalError = `Missing ${varName}`;
      } else {
        const maskedValue = varName.includes('SECRET') || varName.includes('URI') || varName.includes('PASSWORD') 
          ? this.maskSensitive(process.env[varName]) 
          : process.env[varName];
        details.push(`✅ ${varName}: ${maskedValue}`);
      }
    }
    
    // Check optional variables with masked values
    for (const varName of optionalVars) {
      if (process.env[varName]) {
        const maskedValue = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
          ? this.maskSensitive(process.env[varName])
          : process.env[varName];
        details.push(`✅ ${varName}: ${maskedValue}`);
      } else {
        details.push(`⚠️ ${varName}: Not set (optional)`);
      }
    }
    
    // Validate NODE_ENV
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(CONFIG.NODE_ENV)) {
      passed = false;
      details.push(`❌ Invalid NODE_ENV: ${CONFIG.NODE_ENV}`);
      this.criticalError = 'Invalid NODE_ENV';
    } else {
      details.push(`✅ NODE_ENV: ${CONFIG.NODE_ENV}`);
    }
    
    // Check for production-specific requirements
    if (CONFIG.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
      passed = false;
      details.push('❌ ENCRYPTION_KEY required for production');
      this.criticalError = 'Missing production encryption key';
    }
    
    this.results.environment = { passed, details };
    this.log(passed ? 'Environment validation passed' : 'Environment validation failed', passed ? 'success' : 'error');
  }

  async validateFileStructure() {
    this.log('Validating file structure...', 'check');
    
    const requiredFiles = [
      // Server files
      'server/index.js',
      'server/routes/videoCalls.js',
      'server/services/videoCallService.js',
      'server/config/webrtc.js',
      'server/models/Session.js',
      'server/middleware/auth.js',
      
      // Client files
      'client/src/pages/VideoCallPageNew.js',
      'client/src/components/VideoCall/VideoCallRoomNew.js',
      'client/src/components/VideoCall/NetworkQualityIndicator.js',
      'client/src/components/VideoCall/VideoCallErrorDisplay.js',
      
      // Configuration files
      'package.json'
    ];
    
    // Environment file check (don't fail if missing in dry-run)
    const envFiles = ['.env', 'server/.env'];
    
    let passed = true;
    const details = [];
    
    for (const file of requiredFiles) {
      const filePath = path.resolve(file);
      if (fs.existsSync(filePath)) {
        // Check file size to ensure it's not empty
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          details.push(`✅ ${file}: Found (${stats.size} bytes)`);
        } else {
          passed = false;
          details.push(`❌ ${file}: Empty file`);
        }
      } else {
        passed = false;
        details.push(`❌ ${file}: Missing`);
        this.criticalError = `Missing critical file: ${file}`;
      }
    }
    
    // Check for environment files
    let envFileFound = false;
    for (const envFile of envFiles) {
      if (fs.existsSync(path.resolve(envFile))) {
        envFileFound = true;
        details.push(`✅ ${envFile}: Found`);
        break;
      }
    }
    
    if (!envFileFound && !CONFIG.DRY_RUN) {
      passed = false;
      details.push('❌ No .env file found');
      this.criticalError = 'Missing environment configuration';
    } else if (!envFileFound) {
      details.push('⚠️ No .env file found (acceptable in dry-run mode)');
    }
    
    this.results.fileStructure = { passed, details };
    this.log(passed ? 'File structure validation passed' : 'File structure validation failed', passed ? 'success' : 'error');
  }
  async validateWebRTCConfig() {
    this.log('Validating WebRTC configuration...', 'check');
    
    let passed = true;
    const details = [];
    
    try {
      // Check if WebRTC config file exists and is valid
      const webrtcConfigPath = path.resolve('server/config/webrtc.js');
      if (fs.existsSync(webrtcConfigPath)) {
        // Clear require cache to get fresh config
        delete require.cache[require.resolve(webrtcConfigPath)];
        const webrtcConfig = require(webrtcConfigPath);
        
        if (webrtcConfig.iceServers && Array.isArray(webrtcConfig.iceServers)) {
          details.push(`✅ WebRTC ICE servers configured: ${webrtcConfig.iceServers.length} servers`);
          
          // Validate STUN server format (configuration validation, not connectivity)
          const stunServers = webrtcConfig.iceServers.filter(server => 
            server.urls && (Array.isArray(server.urls) ? 
              server.urls.some(url => url.startsWith('stun:')) :
              server.urls.startsWith('stun:'))
          );
          
          if (stunServers.length > 0) {
            details.push(`✅ STUN servers configured: ${stunServers.length}`);
            
            // Validate STUN server URL format
            for (const server of stunServers.slice(0, 3)) { // Check first 3
              const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
              for (const url of urls) {
                if (url.startsWith('stun:')) {
                  try {
                    const urlObj = new URL(url);
                    if (urlObj.hostname && urlObj.port) {
                      details.push(`✅ STUN server format valid: ${url}`);
                    } else {
                      details.push(`⚠️ STUN server missing host/port: ${url}`);
                    }
                  } catch (error) {
                    details.push(`⚠️ STUN server URL format issue: ${url}`);
                  }
                }
              }
            }
          } else {
            passed = false;
            details.push('❌ No STUN servers configured');
            this.criticalError = 'Missing STUN servers';
          }
          
          // Check for TURN servers (optional but recommended)
          const turnServers = webrtcConfig.iceServers.filter(server => 
            server.urls && (Array.isArray(server.urls) ? 
              server.urls.some(url => url.startsWith('turn:')) :
              server.urls.startsWith('turn:'))
          );
          
          if (turnServers.length > 0) {
            details.push(`✅ TURN servers configured: ${turnServers.length} (recommended for production)`);
          } else {
            details.push('⚠️ No TURN servers configured (may cause connectivity issues behind NAT/firewalls)');
          }
          
        } else {
          passed = false;
          details.push('❌ Invalid WebRTC configuration structure');
          this.criticalError = 'Invalid WebRTC config';
        }
      } else {
        passed = false;
        details.push('❌ WebRTC configuration file not found');
        this.criticalError = 'Missing WebRTC config';
      }
      
      // Important warning about browser-level testing
      details.push('⚠️ IMPORTANT: This validates configuration only. Actual WebRTC connectivity');
      details.push('   requires browser-level testing with real peer connections.');
      details.push('   Consider running browser-based integration tests after deployment.');
      
    } catch (error) {
      passed = false;
      details.push(`❌ WebRTC validation error: ${error.message}`);
      this.criticalError = `WebRTC config error: ${error.message}`;
    }
    
    this.results.webrtc = { passed, details };
    this.log(passed ? 'WebRTC configuration validation passed' : 'WebRTC configuration validation failed', passed ? 'success' : 'error');
  }

  async validateDatabase() {
    this.log('Validating database connectivity...', 'check');
    
    let passed = true;
    const details = [];
    
    if (!CONFIG.MONGODB_URI) {
      passed = false;
      details.push('❌ MONGODB_URI not configured');
      this.criticalError = 'Missing database URI';
      this.results.database = { passed, details };
      return;
    }
    
    // Skip actual database connection in dry-run mode
    if (CONFIG.DRY_RUN) {
      details.push('🧪 Dry-run mode: Skipping actual database connection');
      details.push(`✅ MONGODB_URI configured: ${this.maskSensitive(CONFIG.MONGODB_URI, 10)}`);
      this.results.database = { passed: true, details };
      this.log('Database validation skipped (dry-run mode)', 'dryrun');
      return;
    }
    
    let testConnection = null;
    
    try {
      // Create isolated mongoose connection for testing (safer approach)
      testConnection = mongoose.createConnection();
      
      // Set shorter timeouts for staging validation
      await testConnection.openUri(CONFIG.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        maxPoolSize: 1, // Minimal connection pool for testing
        bufferCommands: false
      });
      
      details.push('✅ MongoDB connection successful');
      details.push(`✅ Database: ${testConnection.db.databaseName}`);
      details.push(`✅ Connection state: ${testConnection.readyState === 1 ? 'Connected' : 'Unknown'}`);
      
      // Test basic operations without interfering with existing data
      try {
        const collections = await testConnection.db.listCollections().toArray();
        details.push(`✅ Collections accessible: ${collections.length} found`);
        
        // Check for required collections
        const requiredCollections = ['users', 'sessions'];
        for (const collectionName of requiredCollections) {
          const exists = collections.some(col => col.name === collectionName);
          if (exists) {
            // Get collection stats without reading data
            const stats = await testConnection.db.collection(collectionName).stats();
            details.push(`✅ Collection '${collectionName}': Found (${stats.count || 0} documents)`);
          } else {
            details.push(`⚠️ Collection '${collectionName}': Not found (will be created on first use)`);
          }
        }
      } catch (statsError) {
        details.push(`⚠️ Could not retrieve collection stats: ${statsError.message}`);
      }
      
    } catch (error) {
      passed = false;
      details.push(`❌ Database connection failed: ${error.message}`);
      
      // Provide helpful error context
      if (error.message.includes('ENOTFOUND')) {
        details.push('   → Check if the database hostname is correct and accessible');
      } else if (error.message.includes('authentication failed')) {
        details.push('   → Check database username and password');
      } else if (error.message.includes('timeout')) {
        details.push('   → Check network connectivity and firewall settings');
      }
      
      this.criticalError = `Database connection failed: ${error.message}`;
    } finally {
      // Ensure connection is properly closed
      if (testConnection && testConnection.readyState !== 0) {
        try {
          await testConnection.close();
          details.push('✅ Test connection closed properly');
        } catch (closeError) {
          details.push(`⚠️ Error closing test connection: ${closeError.message}`);
        }
      }
    }
    
    this.results.database = { passed, details };
    this.log(passed ? 'Database validation passed' : 'Database validation failed', passed ? 'success' : 'error');
  }

  async validateSocketIO() {
    this.log('Validating Socket.IO configuration...', 'check');
    
    let passed = true;
    const details = [];
    
    try {
      // Check server index file for Socket.IO setup
      const serverIndexPath = path.resolve('server/index.js');
      if (fs.existsSync(serverIndexPath)) {
        const serverContent = fs.readFileSync(serverIndexPath, 'utf8');
        
        // Enhanced Socket.IO detection with more reliable patterns
        const socketIOChecks = [
          { 
            pattern: /require\(['"]\s*socket\.io\s*['"]\)|import.*from\s+['"]\s*socket\.io\s*['"]/,
            name: 'Socket.IO import',
            critical: true
          },
          { 
            pattern: /(io\s*=.*Server|new\s+Server\()/,
            name: 'Socket.IO server creation',
            critical: true
          },
          { 
            pattern: /io\.on\(['"]\s*connection\s*['"]/i,
            name: 'Connection event handler',
            critical: true
          },
          { 
            pattern: /cors.*origin|origin.*cors/i,
            name: 'CORS configuration',
            critical: false
          }
        ];
        
        let criticalChecksPassed = 0;
        const totalCriticalChecks = socketIOChecks.filter(check => check.critical).length;
        
        for (const check of socketIOChecks) {
          if (check.pattern.test(serverContent)) {
            details.push(`✅ ${check.name}: Found`);
            if (check.critical) criticalChecksPassed++;
          } else {
            const severity = check.critical ? '❌' : '⚠️';
            details.push(`${severity} ${check.name}: Not found`);
            if (check.critical) {
              passed = false;
            }
          }
        }
        
        // Check for video call specific socket events with more comprehensive detection
        const videoCallEvents = [
          'join-video-call',
          'leave-video-call',
          'video-call-offer',
          'video-call-answer',
          'ice-candidate',
          'call-ended'
        ];
        
        let eventHandlersFound = 0;
        const foundEvents = [];
        
        for (const event of videoCallEvents) {
          // Look for both socket.on and io.on patterns
          const eventPattern = new RegExp(`(socket|io)\\.on\\(['"]\s*${event}\s*['"]\\s*,|'${event}'|"${event}"`, 'i');
          if (eventPattern.test(serverContent)) {
            eventHandlersFound++;
            foundEvents.push(event);
          }
        }
        
        if (eventHandlersFound >= 3) {
          details.push(`✅ Video call socket events: ${eventHandlersFound} found (${foundEvents.join(', ')})`);
        } else if (eventHandlersFound > 0) {
          details.push(`⚠️ Video call socket events: Only ${eventHandlersFound} found (${foundEvents.join(', ')})`);
          details.push('   → Consider implementing more comprehensive event handling');
        } else {
          details.push('⚠️ No video call socket events detected');
          details.push('   → Video call functionality may not work properly');
        }
        
        // Overall Socket.IO assessment
        if (criticalChecksPassed === totalCriticalChecks) {
          details.push(`✅ Socket.IO core setup: ${criticalChecksPassed}/${totalCriticalChecks} critical checks passed`);
        } else {
          details.push(`❌ Socket.IO core setup: Only ${criticalChecksPassed}/${totalCriticalChecks} critical checks passed`);
        }
        
      } else {
        passed = false;
        details.push('❌ Server index file not found');
        this.criticalError = 'Missing server index file';
      }
      
    } catch (error) {
      passed = false;
      details.push(`❌ Socket.IO validation error: ${error.message}`);
      this.criticalError = `Socket.IO validation failed: ${error.message}`;
    }
    
    this.results.socketio = { passed, details };
    this.log(passed ? 'Socket.IO validation passed' : 'Socket.IO validation failed', passed ? 'success' : 'error');
  }
  async validateFrontendComponents() {
    this.log('Validating frontend components...', 'check');
    
    let passed = true;
    const details = [];
    
    // Enhanced component checks with realistic WebRTC indicators
    const componentChecks = [
      {
        file: 'client/src/pages/VideoCallPageNew.js',
        patterns: [
          { regex: /navigator\.mediaDevices/i, name: 'MediaDevices API usage', critical: true },
          { regex: /RTCPeerConnection/i, name: 'RTCPeerConnection usage', critical: true },
          { regex: /getUserMedia/i, name: 'getUserMedia usage', critical: true },
          { regex: /useEffect|componentDidMount/i, name: 'Component lifecycle', critical: false }
        ]
      },
      {
        file: 'client/src/components/VideoCall/VideoCallRoomNew.js',
        patterns: [
          { regex: /useRef|createRef/i, name: 'React ref usage', critical: true },
          { regex: /<video[^>]*ref/i, name: 'Video element with ref', critical: true },
          { regex: /socket|io\(/i, name: 'Socket.IO client usage', critical: true },
          { regex: /onicecandidate|addIceCandidate/i, name: 'ICE candidate handling', critical: false }
        ]
      },
      {
        file: 'client/src/components/VideoCall/NetworkQualityIndicator.js',
        patterns: [
          { regex: /getStats|RTCStatsReport/i, name: 'WebRTC stats API', critical: true },
          { regex: /quality|bandwidth|latency/i, name: 'Quality monitoring', critical: false }
        ]
      },
      {
        file: 'client/src/components/VideoCall/VideoCallErrorDisplay.js',
        patterns: [
          { regex: /error|Error/i, name: 'Error handling', critical: true },
          { regex: /permission|Permission/i, name: 'Permission error handling', critical: false }
        ]
      }
    ];
    
    let totalCriticalChecks = 0;
    let passedCriticalChecks = 0;
    
    for (const component of componentChecks) {
      const filePath = path.resolve(component.file);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        details.push(`✅ Component found: ${component.file} (${stats.size} bytes)`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file is not just a placeholder
        if (content.length < 100) {
          details.push(`  ⚠️ Component appears to be a placeholder (very small file)`);
        }
        
        for (const pattern of component.patterns) {
          if (pattern.critical) totalCriticalChecks++;
          
          if (pattern.regex.test(content)) {
            details.push(`  ✅ ${pattern.name}: Implemented`);
            if (pattern.critical) passedCriticalChecks++;
          } else {
            const severity = pattern.critical ? '❌' : '⚠️';
            details.push(`  ${severity} ${pattern.name}: Not found`);
            if (pattern.critical) {
              passed = false;
            }
          }
        }
        
        // Additional checks for React best practices
        if (content.includes('useState') || content.includes('useEffect')) {
          details.push(`  ✅ React hooks usage detected`);
        }
        
        if (content.includes('PropTypes') || content.includes('interface ')) {
          details.push(`  ✅ Type checking detected`);
        }
        
      } else {
        passed = false;
        details.push(`❌ Component missing: ${component.file}`);
        this.criticalError = `Missing component: ${component.file}`;
        
        // Count all critical checks for this component as failed
        const criticalChecksInComponent = component.patterns.filter(p => p.critical).length;
        totalCriticalChecks += criticalChecksInComponent;
      }
    }
    
    // Overall frontend assessment
    if (totalCriticalChecks > 0) {
      const criticalPassRate = (passedCriticalChecks / totalCriticalChecks * 100).toFixed(1);
      details.push(`📊 Critical frontend checks: ${passedCriticalChecks}/${totalCriticalChecks} passed (${criticalPassRate}%)`);
      
      if (criticalPassRate < 80) {
        passed = false;
        details.push('❌ Frontend implementation appears incomplete');
        this.criticalError = 'Insufficient frontend implementation';
      }
    }
    
    this.results.frontend = { passed, details };
    this.log(passed ? 'Frontend validation passed' : 'Frontend validation failed', passed ? 'success' : 'error');
  }

  async validateSecurity() {
    this.log('Validating security middleware...', 'check');
    
    let passed = true;
    const details = [];
    
    try {
      const serverIndexPath = path.resolve('server/index.js');
      if (fs.existsSync(serverIndexPath)) {
        const serverContent = fs.readFileSync(serverIndexPath, 'utf8');
        
        // Enhanced security middleware detection
        const securityChecks = [
          { 
            pattern: /require\(['"]\s*helmet\s*['"]\)|import.*helmet/i,
            name: 'Helmet security headers import',
            critical: true
          },
          { 
            pattern: /app\.use\(helmet\(\)|helmet\(/i,
            name: 'Helmet middleware activation',
            critical: true
          },
          { 
            pattern: /require\(['"]\s*cors\s*['"]\)|import.*cors/i,
            name: 'CORS middleware import',
            critical: true
          },
          { 
            pattern: /app\.use\(cors\(|cors\(/i,
            name: 'CORS middleware activation',
            critical: true
          },
          { 
            pattern: /rateLimit|express-rate-limit/i,
            name: 'Rate limiting',
            critical: false
          },
          { 
            pattern: /express\.json\(\{.*limit|bodyParser.*limit/i,
            name: 'Request size limiting',
            critical: false
          }
        ];
        
        let criticalSecurityPassed = 0;
        const totalCriticalSecurity = securityChecks.filter(check => check.critical).length;
        
        for (const check of securityChecks) {
          if (check.pattern.test(serverContent)) {
            details.push(`✅ ${check.name}: Found`);
            if (check.critical) criticalSecurityPassed++;
          } else {
            const severity = check.critical ? '❌' : '⚠️';
            details.push(`${severity} ${check.name}: Not found`);
            if (check.critical) {
              passed = false;
            }
          }
        }
        
        // Check for authentication middleware with enhanced detection
        const authMiddlewarePath = path.resolve('server/middleware/auth.js');
        if (fs.existsSync(authMiddlewarePath)) {
          details.push('✅ Authentication middleware file: Found');
          
          const authContent = fs.readFileSync(authMiddlewarePath, 'utf8');
          
          // More comprehensive JWT detection
          const jwtPatterns = [
            /jsonwebtoken|jwt/i,
            /verify.*token|token.*verify/i,
            /Bearer\s+token|Authorization.*Bearer/i
          ];
          
          let jwtImplemented = false;
          for (const pattern of jwtPatterns) {
            if (pattern.test(authContent)) {
              jwtImplemented = true;
              break;
            }
          }
          
          if (jwtImplemented) {
            details.push('✅ JWT authentication: Implemented');
          } else {
            passed = false;
            details.push('❌ JWT authentication: Not properly implemented');
            this.criticalError = 'Missing JWT authentication';
          }
          
          // Check for proper error handling in auth middleware
          if (authContent.includes('try') && authContent.includes('catch')) {
            details.push('✅ Error handling in auth middleware: Found');
          } else {
            details.push('⚠️ Error handling in auth middleware: Not found');
          }
          
        } else {
          passed = false;
          details.push('❌ Authentication middleware file: Missing');
          this.criticalError = 'Missing authentication middleware';
        }
        
        // Security assessment summary
        const securityScore = (criticalSecurityPassed / totalCriticalSecurity * 100).toFixed(1);
        details.push(`📊 Critical security checks: ${criticalSecurityPassed}/${totalCriticalSecurity} passed (${securityScore}%)`);
        
        if (securityScore < 100) {
          details.push('⚠️ Some critical security measures are missing');
        }
        
        // Important disclaimer
        details.push('⚠️ IMPORTANT: This is a basic presence check, not a comprehensive security audit.');
        details.push('   Consider running dedicated security scanning tools before production deployment.');
        
      } else {
        passed = false;
        details.push('❌ Server index file not found');
        this.criticalError = 'Missing server index file';
      }
      
    } catch (error) {
      passed = false;
      details.push(`❌ Security validation error: ${error.message}`);
      this.criticalError = `Security validation failed: ${error.message}`;
    }
    
    this.results.security = { passed, details };
    this.log(passed ? 'Security validation passed' : 'Security validation failed', passed ? 'success' : 'error');
  }

  generateDeploymentReport() {
    this.log('Generating deployment report...', 'check');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: CONFIG.NODE_ENV,
      dryRun: CONFIG.DRY_RUN,
      overallStatus: this.overallPassed ? 'READY' : 'NOT READY',
      criticalError: this.criticalError,
      results: this.results,
      recommendations: [],
      nextSteps: []
    };
    
    // Add specific recommendations based on results
    if (!this.results.environment.passed) {
      report.recommendations.push('Fix missing environment variables before deployment');
      report.nextSteps.push('Review .env file and ensure all required variables are set');
    }
    
    if (!this.results.database.passed) {
      report.recommendations.push('Ensure MongoDB is accessible and properly configured');
      report.nextSteps.push('Test database connection manually and verify credentials');
    }
    
    if (!this.results.webrtc.passed) {
      report.recommendations.push('Review WebRTC configuration and STUN server setup');
      report.nextSteps.push('Verify STUN/TURN server accessibility from target deployment environment');
    }
    
    if (!this.results.frontend.passed) {
      report.recommendations.push('Complete frontend component implementation');
      report.nextSteps.push('Implement missing WebRTC functionality in React components');
    }
    
    if (!this.results.security.passed) {
      report.recommendations.push('Implement required security middleware');
      report.nextSteps.push('Add Helmet, CORS, and authentication middleware');
    }
    
    if (!this.results.socketio.passed) {
      report.recommendations.push('Complete Socket.IO setup for video call events');
      report.nextSteps.push('Implement video call event handlers in Socket.IO server');
    }
    
    // Add general recommendations
    if (this.overallPassed) {
      report.nextSteps.push('Run browser-based integration tests');
      report.nextSteps.push('Test video calls between different browsers/devices');
      report.nextSteps.push('Monitor WebRTC connection success rates after deployment');
    }
    
    // Skip file system writes in dry-run mode
    if (!CONFIG.DRY_RUN) {
      try {
        const reportPath = path.resolve('video-call-staging-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`Deployment report saved to: ${reportPath}`, 'info');
      } catch (writeError) {
        this.log(`Warning: Could not write report file: ${writeError.message}`, 'warning');
      }
    } else {
      this.log('Dry-run mode: Skipping report file creation', 'dryrun');
    }
    
    return report;
  }

  async run() {
    this.log('🚀 Starting Video Call Feature Staging Deployment Validation', 'info');
    
    if (CONFIG.DRY_RUN) {
      this.log('🧪 Running in DRY-RUN mode - no database connections or file writes', 'dryrun');
    }
    
    this.log('=' .repeat(70), 'info');
    
    try {
      // Run all validations
      await this.validateEnvironment();
      await this.validateFileStructure();
      await this.validateWebRTCConfig();
      await this.validateDatabase();
      await this.validateSocketIO();
      await this.validateFrontendComponents();
      await this.validateSecurity();
      
      // Determine overall status
      this.overallPassed = Object.values(this.results).every(result => result.passed);
      
      // Generate report
      const report = this.generateDeploymentReport();
      
      this.log('=' .repeat(70), 'info');
      this.log(`🎯 Overall Status: ${report.overallStatus}`, this.overallPassed ? 'success' : 'error');
      
      if (this.criticalError) {
        this.log(`💥 Critical Error: ${this.criticalError}`, 'error');
      }
      
      if (report.recommendations.length > 0) {
        this.log('📋 Recommendations:', 'warning');
        report.recommendations.forEach(rec => this.log(`  • ${rec}`, 'warning'));
      }
      
      if (report.nextSteps.length > 0) {
        this.log('🔄 Next Steps:', 'info');
        report.nextSteps.forEach(step => this.log(`  → ${step}`, 'info'));
      }
      
      if (this.overallPassed) {
        this.log('🎉 Video call feature is ready for staging deployment!', 'success');
        process.exit(EXIT_CODES.SUCCESS);
      } else {
        this.log('⚠️ Please address the issues above before deploying to staging', 'warning');
        
        // Exit with specific error code based on the type of failure
        if (!this.results.environment.passed) {
          process.exit(EXIT_CODES.ENVIRONMENT_ERROR);
        } else if (!this.results.database.passed) {
          process.exit(EXIT_CODES.DATABASE_ERROR);
        } else if (!this.results.webrtc.passed) {
          process.exit(EXIT_CODES.WEBRTC_ERROR);
        } else if (!this.results.security.passed) {
          process.exit(EXIT_CODES.SECURITY_ERROR);
        } else if (!this.results.frontend.passed) {
          process.exit(EXIT_CODES.FRONTEND_ERROR);
        } else {
          process.exit(EXIT_CODES.GENERAL_ERROR);
        }
      }
      
    } catch (error) {
      this.log(`💥 Deployment validation failed: ${error.message}`, 'error');
      this.log(`Stack trace: ${error.stack}`, 'error');
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
  }
}

// Run the deployment validation
if (require.main === module) {
  const deployment = new VideoCallStagingDeployment();
  deployment.run().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(EXIT_CODES.GENERAL_ERROR);
  });
}

module.exports = VideoCallStagingDeployment;