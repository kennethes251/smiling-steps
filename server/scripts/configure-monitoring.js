/**
 * Monitoring Configuration Script
 * 
 * Sets up monitoring, logging, and alerting for M-Pesa payment integration.
 * Configures health checks, error tracking, and performance monitoring.
 * 
 * Usage: node scripts/configure-monitoring.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Create monitoring configuration file
 */
function createMonitoringConfig() {
  log('\n1. Creating Monitoring Configuration', 'bright');
  
  const config = {
    monitoring: {
      enabled: true,
      environment: process.env.NODE_ENV || 'development',
      
      // Health check configuration
      healthCheck: {
        enabled: true,
        interval: 60000, // 1 minute
        endpoints: [
          '/api/mpesa/health',
          '/api/health'
        ]
      },
      
      // Payment event logging
      paymentLogging: {
        enabled: true,
        logLevel: 'info',
        logPaymentInitiation: true,
        logPaymentCallback: true,
        logPaymentStatusChange: true,
        logPaymentFailure: true,
        logAdminAccess: true,
        retentionDays: 2555 // 7 years
      },
      
      // Error rate monitoring
      errorMonitoring: {
        enabled: true,
        thresholds: {
          paymentErrorRate: 0.05, // 5%
          apiErrorRate: 0.02, // 2%
          callbackFailureRate: 0.03 // 3%
        },
        alerting: {
          enabled: true,
          channels: ['email', 'log']
        }
      },
      
      // Performance monitoring
      performanceMonitoring: {
        enabled: true,
        thresholds: {
          paymentInitiationTime: 3000, // 3 seconds
          callbackProcessingTime: 5000, // 5 seconds
          stkPushDeliveryTime: 10000, // 10 seconds
          databaseQueryTime: 100 // 100ms
        }
      },
      
      // M-Pesa API monitoring
      mpesaApiMonitoring: {
        enabled: true,
        checkInterval: 300000, // 5 minutes
        timeout: 10000, // 10 seconds
        alertOnFailure: true
      },
      
      // Reconciliation monitoring
      reconciliationMonitoring: {
        enabled: true,
        dailySchedule: '23:00', // 11 PM EAT
        alertOnDiscrepancy: true,
        discrepancyThreshold: 0 // Alert on any discrepancy
      },
      
      // Metrics collection
      metrics: {
        enabled: true,
        collectInterval: 60000, // 1 minute
        metrics: [
          'payment_success_rate',
          'payment_error_rate',
          'average_processing_time',
          'callback_processing_time',
          'api_response_time',
          'active_payments',
          'failed_payments',
          'reconciliation_status'
        ]
      }
    }
  };
  
  const configPath = path.join(__dirname, '..', 'config', 'monitoring.json');
  
  try {
    // Ensure config directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logSuccess(`Monitoring configuration created: ${configPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create monitoring config: ${error.message}`);
    return false;
  }
}

/**
 * Create health check endpoint documentation
 */
function createHealthCheckDocs() {
  log('\n2. Creating Health Check Documentation', 'bright');
  
  const docs = `# M-Pesa Payment Integration - Health Check Endpoints

## Overview

Health check endpoints provide real-time status of the M-Pesa payment integration system.

## Endpoints

### 1. M-Pesa Health Check

**Endpoint:** \`GET /api/mpesa/health\`

**Description:** Checks M-Pesa API connectivity and authentication.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "mpesaConnection": "active",
  "environment": "production",
  "timestamp": "2024-12-11T10:00:00.000Z"
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "status": "unhealthy",
  "error": "Authentication failed",
  "timestamp": "2024-12-11T10:00:00.000Z"
}
\`\`\`

### 2. System Health Check

**Endpoint:** \`GET /api/health\`

**Description:** Overall system health including database and services.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "database": "connected",
  "mpesa": "active",
  "reconciliation": "running",
  "timestamp": "2024-12-11T10:00:00.000Z"
}
\`\`\`

## Monitoring Integration

### Uptime Monitoring

Configure your uptime monitoring service (e.g., UptimeRobot, Pingdom) to check:
- \`/api/mpesa/health\` every 5 minutes
- Alert if status is not "healthy"
- Alert if response time > 5 seconds

### Example cURL Commands

\`\`\`bash
# Check M-Pesa health
curl https://yourdomain.com/api/mpesa/health

# Check system health
curl https://yourdomain.com/api/health
\`\`\`

## Alert Thresholds

- **Critical:** Health check fails for 2 consecutive checks
- **Warning:** Response time > 5 seconds
- **Info:** Environment mismatch detected

## Troubleshooting

### M-Pesa Health Check Fails

1. Verify M-Pesa credentials are correct
2. Check if IP is whitelisted by Safaricom
3. Verify network connectivity
4. Check M-Pesa API status

### Database Health Check Fails

1. Verify DATABASE_URL is correct
2. Check database server status
3. Verify SSL configuration
4. Check connection pool settings
`;
  
  const docsPath = path.join(__dirname, '..', 'docs', 'HEALTH_CHECK_ENDPOINTS.md');
  
  try {
    const docsDir = path.dirname(docsPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(docsPath, docs);
    logSuccess(`Health check documentation created: ${docsPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create health check docs: ${error.message}`);
    return false;
  }
}

/**
 * Create alerting configuration template
 */
function createAlertingConfig() {
  log('\n3. Creating Alerting Configuration', 'bright');
  
  const config = `# M-Pesa Payment Integration - Alerting Configuration

## Alert Rules

### Critical Alerts

#### 1. High Payment Error Rate
- **Condition:** Payment error rate > 5%
- **Duration:** 5 minutes
- **Action:** Send email to admin, page on-call engineer
- **Severity:** Critical

#### 2. M-Pesa API Down
- **Condition:** M-Pesa health check fails
- **Duration:** 2 minutes
- **Action:** Send email to admin, page on-call engineer
- **Severity:** Critical

#### 3. Database Connection Failed
- **Condition:** Database health check fails
- **Duration:** 1 minute
- **Action:** Send email to admin, page on-call engineer
- **Severity:** Critical

#### 4. Webhook Endpoint Unreachable
- **Condition:** Webhook returns 5xx errors
- **Duration:** 5 minutes
- **Action:** Send email to admin
- **Severity:** Critical

### Warning Alerts

#### 1. Slow Callback Processing
- **Condition:** Callback processing time > 10 seconds
- **Duration:** 5 minutes
- **Action:** Send email to admin
- **Severity:** Warning

#### 2. Elevated Error Rate
- **Condition:** Payment error rate > 2%
- **Duration:** 10 minutes
- **Action:** Send email to admin
- **Severity:** Warning

#### 3. Reconciliation Discrepancy
- **Condition:** Daily reconciliation finds discrepancies
- **Duration:** Immediate
- **Action:** Send email to admin and finance team
- **Severity:** Warning

#### 4. High Payment Volume
- **Condition:** Payment volume > 100 per hour
- **Duration:** 1 hour
- **Action:** Send email to admin (informational)
- **Severity:** Info

## Alert Channels

### Email Alerts
- **Recipients:** admin@yourdomain.com, tech@yourdomain.com
- **Format:** HTML with details and links
- **Frequency:** Immediate for critical, batched for warnings

### Log Alerts
- **Location:** /var/log/mpesa-alerts.log
- **Format:** JSON structured logs
- **Rotation:** Daily, keep 30 days

### SMS Alerts (Optional)
- **Recipients:** On-call engineer
- **Conditions:** Critical alerts only
- **Provider:** Africa's Talking

## Alert Configuration Examples

### For Prometheus/Grafana

\`\`\`yaml
groups:
  - name: mpesa_alerts
    interval: 1m
    rules:
      - alert: HighPaymentErrorRate
        expr: payment_error_rate > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High payment error rate detected"
          description: "Payment error rate is {{ $value }}%"
      
      - alert: MpesaAPIDown
        expr: mpesa_health_check == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "M-Pesa API is down"
          description: "M-Pesa health check has failed"
\`\`\`

### For UptimeRobot

1. Create HTTP(s) monitor for \`/api/mpesa/health\`
2. Set check interval to 5 minutes
3. Configure alert contacts
4. Set up status page

## Testing Alerts

\`\`\`bash
# Test email alerts
node scripts/test-alerts.js --type=email

# Test SMS alerts
node scripts/test-alerts.js --type=sms

# Simulate high error rate
node scripts/test-alerts.js --simulate=high-error-rate
\`\`\`

## Alert Response Procedures

### Critical Alert Response

1. Acknowledge alert within 5 minutes
2. Check system status and logs
3. Identify root cause
4. Implement fix or workaround
5. Verify system recovery
6. Document incident

### Warning Alert Response

1. Review alert details
2. Check trends and patterns
3. Investigate if persistent
4. Schedule fix if needed
5. Update monitoring if false positive

## Escalation Policy

- **Level 1:** On-call engineer (0-15 minutes)
- **Level 2:** Senior engineer (15-30 minutes)
- **Level 3:** Engineering manager (30-60 minutes)
- **Level 4:** CTO (60+ minutes)
`;
  
  const configPath = path.join(__dirname, '..', 'docs', 'ALERTING_CONFIGURATION.md');
  
  try {
    fs.writeFileSync(configPath, config);
    logSuccess(`Alerting configuration created: ${configPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create alerting config: ${error.message}`);
    return false;
  }
}

/**
 * Create metrics dashboard configuration
 */
function createMetricsDashboard() {
  log('\n4. Creating Metrics Dashboard Configuration', 'bright');
  
  const dashboard = {
    dashboard: {
      title: 'M-Pesa Payment Integration Metrics',
      panels: [
        {
          title: 'Payment Success Rate',
          type: 'graph',
          metric: 'payment_success_rate',
          target: 95,
          unit: '%'
        },
        {
          title: 'Payment Error Rate',
          type: 'graph',
          metric: 'payment_error_rate',
          threshold: 5,
          unit: '%'
        },
        {
          title: 'Average Processing Time',
          type: 'graph',
          metric: 'average_processing_time',
          target: 60,
          unit: 'seconds'
        },
        {
          title: 'Active Payments',
          type: 'counter',
          metric: 'active_payments'
        },
        {
          title: 'Failed Payments (24h)',
          type: 'counter',
          metric: 'failed_payments_24h'
        },
        {
          title: 'M-Pesa API Response Time',
          type: 'graph',
          metric: 'mpesa_api_response_time',
          unit: 'ms'
        },
        {
          title: 'Callback Processing Time',
          type: 'graph',
          metric: 'callback_processing_time',
          target: 5000,
          unit: 'ms'
        },
        {
          title: 'Reconciliation Status',
          type: 'status',
          metric: 'reconciliation_status'
        }
      ]
    }
  };
  
  const dashboardPath = path.join(__dirname, '..', 'config', 'metrics-dashboard.json');
  
  try {
    fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
    logSuccess(`Metrics dashboard configuration created: ${dashboardPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create metrics dashboard: ${error.message}`);
    return false;
  }
}

/**
 * Main configuration function
 */
async function configureMonitoring() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('  M-Pesa Monitoring Configuration', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');
  
  const results = {
    monitoringConfig: false,
    healthCheckDocs: false,
    alertingConfig: false,
    metricsDashboard: false
  };
  
  // Create all configurations
  results.monitoringConfig = createMonitoringConfig();
  results.healthCheckDocs = createHealthCheckDocs();
  results.alertingConfig = createAlertingConfig();
  results.metricsDashboard = createMetricsDashboard();
  
  // Summary
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  Configuration Summary', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');
  
  const allSuccess = Object.values(results).every(r => r === true);
  
  if (allSuccess) {
    logSuccess('Monitoring configuration completed successfully');
    console.log('\n');
    logInfo('Created files:');
    logInfo('  - server/config/monitoring.json');
    logInfo('  - server/config/metrics-dashboard.json');
    logInfo('  - server/docs/HEALTH_CHECK_ENDPOINTS.md');
    logInfo('  - server/docs/ALERTING_CONFIGURATION.md');
    console.log('\n');
    logInfo('Next steps:');
    logInfo('1. Review and customize monitoring configuration');
    logInfo('2. Set up external monitoring service (UptimeRobot, Pingdom, etc.)');
    logInfo('3. Configure alert channels (email, SMS)');
    logInfo('4. Test health check endpoints');
    logInfo('5. Set up metrics dashboard (Grafana, custom)');
    console.log('\n');
  } else {
    logError('Some configurations failed');
    logWarning('Please check the errors above and try again');
  }
  
  process.exit(allSuccess ? 0 : 1);
}

// Run configuration
configureMonitoring();
