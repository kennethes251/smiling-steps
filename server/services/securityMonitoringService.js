/**
 * Security Monitoring Service
 * 
 * Monitors for unusual access patterns, failed authentication attempts,
 * and data export anomalies to detect potential security breaches.
 * 
 * Requirements: 10.5 - WHEN a data breach is detected THEN the system SHALL 
 * log the incident and notify administrators within 15 minutes
 */

const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { logAdminAccess } = require('../utils/auditLogger');

/**
 * Security monitoring thresholds and configuration
 */
const SECURITY_THRESHOLDS = {
  // Failed authentication attempts
  MAX_FAILED_LOGINS_PER_IP: 10, // per 15 minutes
  MAX_FAILED_LOGINS_PER_USER: 5, // per 15 minutes
  
  // Unusual access patterns
  MAX_PHI_ACCESS_PER_USER: 50, // per hour
  MAX_ADMIN_ACTIONS_PER_HOUR: 100,
  MAX_DATA_EXPORTS_PER_USER: 10, // per day
  
  // Time windows (in milliseconds)
  FAILED_LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
  PHI_ACCESS_WINDOW: 60 * 60 * 1000, // 1 hour
  ADMIN_ACTION_WINDOW: 60 * 60 * 1000, // 1 hour
  DATA_EXPORT_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  
  // Unusual patterns
  RAPID_SESSION_ACCESS_THRESHOLD: 20, // sessions accessed in 5 minutes
  RAPID_SESSION_ACCESS_WINDOW: 5 * 60 * 1000, // 5 minutes
  
  // Geographic anomalies (if IP geolocation is available)
  SUSPICIOUS_LOCATION_CHANGE_HOURS: 2, // Login from different country within 2 hours
};

/**
 * Track failed authentication attempts by IP address and user
 */
const failedLoginAttempts = new Map();
const failedLoginsByUser = new Map();

/**
 * Monitor failed authentication attempts
 * Detects brute force attacks and credential stuffing
 * 
 * @param {string} ipAddress - IP address of failed attempt
 * @param {string} email - Email address attempted (if available)
 * @param {string} userAgent - User agent string
 * @param {string} reason - Reason for failure
 * @returns {Object} - Monitoring result with breach detection
 */
async function monitorFailedAuthentication(ipAddress, email = null, userAgent = null, reason = 'invalid_credentials') {
  const now = Date.now();
  const result = {
    breachDetected: false,
    alerts: [],
    recommendations: []
  };
  
  try {
    // Clean up old entries
    cleanupOldEntries(failedLoginAttempts, SECURITY_THRESHOLDS.FAILED_LOGIN_WINDOW);
    cleanupOldEntries(failedLoginsByUser, SECURITY_THRESHOLDS.FAILED_LOGIN_WINDOW);
    
    // Track by IP address
    const ipKey = ipAddress;
    const ipAttempts = failedLoginAttempts.get(ipKey) || [];
    ipAttempts.push({ timestamp: now, email, userAgent, reason });
    failedLoginAttempts.set(ipKey, ipAttempts);
    
    // Track by user email if available
    if (email) {
      const userKey = email.toLowerCase();
      const userAttempts = failedLoginsByUser.get(userKey) || [];
      userAttempts.push({ timestamp: now, ipAddress, userAgent, reason });
      failedLoginsByUser.set(userKey, userAttempts);
      
      // Check user-specific threshold
      if (userAttempts.length >= SECURITY_THRESHOLDS.MAX_FAILED_LOGINS_PER_USER) {
        result.breachDetected = true;
        result.alerts.push({
          type: 'CREDENTIAL_ATTACK',
          severity: 'HIGH',
          message: `User ${email} has ${userAttempts.length} failed login attempts in 15 minutes`,
          details: {
            email,
            attemptCount: userAttempts.length,
            timeWindow: '15 minutes',
            ipAddresses: [...new Set(userAttempts.map(a => a.ipAddress))]
          }
        });
        result.recommendations.push('Consider temporarily locking the user account');
      }
    }
    
    // Check IP-specific threshold
    if (ipAttempts.length >= SECURITY_THRESHOLDS.MAX_FAILED_LOGINS_PER_IP) {
      result.breachDetected = true;
      result.alerts.push({
        type: 'BRUTE_FORCE_ATTACK',
        severity: 'HIGH',
        message: `IP ${ipAddress} has ${ipAttempts.length} failed login attempts in 15 minutes`,
        details: {
          ipAddress,
          attemptCount: ipAttempts.length,
          timeWindow: '15 minutes',
          targetedEmails: [...new Set(ipAttempts.map(a => a.email).filter(Boolean))]
        }
      });
      result.recommendations.push('Consider blocking or rate-limiting the IP address');
    }
    
    // Log the failed attempt
    await AuditLog.create({
      timestamp: new Date(),
      actionType: 'SECURITY_FAILED_LOGIN',
      action: 'Failed authentication attempt monitored',
      ipAddress,
      userAgent,
      metadata: {
        email,
        reason,
        ipAttemptCount: ipAttempts.length,
        userAttemptCount: email ? (failedLoginsByUser.get(email.toLowerCase()) || []).length : 0
      }
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error monitoring failed authentication:', error);
    return {
      breachDetected: false,
      alerts: [],
      recommendations: [],
      error: error.message
    };
  }
}

/**
 * Monitor unusual access patterns to PHI data
 * Detects potential data harvesting or insider threats
 * 
 * @param {string} userId - User ID accessing PHI
 * @param {string} userRole - Role of user (client, psychologist, admin)
 * @param {string} accessType - Type of access (view, export, search)
 * @param {string} dataType - Type of data accessed (session_notes, intake_forms, etc.)
 * @param {string} ipAddress - IP address of access
 * @returns {Object} - Monitoring result with breach detection
 */
async function monitorUnusualAccess(userId, userRole, accessType, dataType, ipAddress) {
  const now = Date.now();
  const result = {
    breachDetected: false,
    alerts: [],
    recommendations: []
  };
  
  try {
    // Query recent PHI access by this user
    const recentAccessCount = await AuditLog.countDocuments({
      userId,
      actionType: { $in: ['VIDEO_CALL_ACCESS', 'ADMIN_ACCESS', 'SESSION_NOTES_ACCESS', 'INTAKE_FORM_ACCESS'] },
      timestamp: { $gte: new Date(now - SECURITY_THRESHOLDS.PHI_ACCESS_WINDOW) }
    });
    
    // Check for excessive PHI access
    if (recentAccessCount >= SECURITY_THRESHOLDS.MAX_PHI_ACCESS_PER_USER) {
      result.breachDetected = true;
      result.alerts.push({
        type: 'EXCESSIVE_PHI_ACCESS',
        severity: 'HIGH',
        message: `User ${userId} has accessed PHI ${recentAccessCount} times in the last hour`,
        details: {
          userId,
          userRole,
          accessCount: recentAccessCount,
          timeWindow: '1 hour',
          currentAccess: { accessType, dataType, ipAddress }
        }
      });
      result.recommendations.push('Review user access patterns and consider temporary access restriction');
    }
    
    // Check for rapid session access (potential data harvesting)
    if (accessType === 'session_access' || dataType === 'session_notes') {
      const rapidAccessCount = await AuditLog.countDocuments({
        userId,
        actionType: { $in: ['VIDEO_CALL_ACCESS', 'SESSION_NOTES_ACCESS'] },
        timestamp: { $gte: new Date(now - SECURITY_THRESHOLDS.RAPID_SESSION_ACCESS_WINDOW) }
      });
      
      if (rapidAccessCount >= SECURITY_THRESHOLDS.RAPID_SESSION_ACCESS_THRESHOLD) {
        result.breachDetected = true;
        result.alerts.push({
          type: 'RAPID_SESSION_ACCESS',
          severity: 'CRITICAL',
          message: `User ${userId} accessed ${rapidAccessCount} sessions in 5 minutes`,
          details: {
            userId,
            userRole,
            sessionAccessCount: rapidAccessCount,
            timeWindow: '5 minutes',
            ipAddress
          }
        });
        result.recommendations.push('Immediately review user activity and consider account suspension');
      }
    }
    
    // Check for admin privilege escalation patterns
    if (userRole === 'admin') {
      const adminActionCount = await AuditLog.countDocuments({
        adminId: userId,
        actionType: { $in: ['ADMIN_ACCESS', 'USER_UPDATE', 'USER_DELETE', 'ADMIN_EXPORT'] },
        timestamp: { $gte: new Date(now - SECURITY_THRESHOLDS.ADMIN_ACTION_WINDOW) }
      });
      
      if (adminActionCount >= SECURITY_THRESHOLDS.MAX_ADMIN_ACTIONS_PER_HOUR) {
        result.breachDetected = true;
        result.alerts.push({
          type: 'EXCESSIVE_ADMIN_ACTIVITY',
          severity: 'HIGH',
          message: `Admin ${userId} performed ${adminActionCount} admin actions in the last hour`,
          details: {
            adminId: userId,
            actionCount: adminActionCount,
            timeWindow: '1 hour',
            ipAddress
          }
        });
        result.recommendations.push('Review admin activity logs and verify legitimacy of actions');
      }
    }
    
    // Log the access for monitoring
    await AuditLog.create({
      timestamp: new Date(),
      actionType: 'SECURITY_ACCESS_MONITOR',
      userId,
      action: `PHI access monitored: ${accessType} - ${dataType}`,
      userType: userRole,
      ipAddress,
      metadata: {
        accessType,
        dataType,
        recentAccessCount,
        monitoringResult: {
          breachDetected: result.breachDetected,
          alertCount: result.alerts.length
        }
      }
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error monitoring unusual access:', error);
    return {
      breachDetected: false,
      alerts: [],
      recommendations: [],
      error: error.message
    };
  }
}

/**
 * Monitor data export anomalies
 * Detects potential data exfiltration attempts
 * 
 * @param {string} userId - User ID performing export
 * @param {string} userRole - Role of user
 * @param {string} exportType - Type of export (session_history, client_data, etc.)
 * @param {number} recordCount - Number of records exported
 * @param {string} ipAddress - IP address of export
 * @returns {Object} - Monitoring result with breach detection
 */
async function monitorDataExportAnomalies(userId, userRole, exportType, recordCount, ipAddress) {
  const now = Date.now();
  const result = {
    breachDetected: false,
    alerts: [],
    recommendations: []
  };
  
  try {
    // Query recent exports by this user
    const recentExports = await AuditLog.find({
      userId,
      actionType: { $in: ['ADMIN_EXPORT', 'SESSION_EXPORT', 'CLIENT_EXPORT'] },
      timestamp: { $gte: new Date(now - SECURITY_THRESHOLDS.DATA_EXPORT_WINDOW) }
    }).sort({ timestamp: -1 });
    
    // Check for excessive exports
    if (recentExports.length >= SECURITY_THRESHOLDS.MAX_DATA_EXPORTS_PER_USER) {
      result.breachDetected = true;
      result.alerts.push({
        type: 'EXCESSIVE_DATA_EXPORT',
        severity: 'CRITICAL',
        message: `User ${userId} has performed ${recentExports.length} data exports in 24 hours`,
        details: {
          userId,
          userRole,
          exportCount: recentExports.length,
          timeWindow: '24 hours',
          currentExport: { exportType, recordCount, ipAddress },
          exportTypes: [...new Set(recentExports.map(e => e.metadata?.exportType).filter(Boolean))]
        }
      });
      result.recommendations.push('Immediately investigate data export activity and consider account suspension');
    }
    
    // Check for large bulk exports (potential data harvesting)
    if (recordCount >= 100) {
      result.breachDetected = true;
      result.alerts.push({
        type: 'BULK_DATA_EXPORT',
        severity: 'HIGH',
        message: `User ${userId} exported ${recordCount} records in single operation`,
        details: {
          userId,
          userRole,
          exportType,
          recordCount,
          ipAddress,
          timestamp: new Date()
        }
      });
      result.recommendations.push('Review export justification and verify user authorization for bulk data access');
    }
    
    // Check for unusual export patterns (different types in short time)
    const recentExportTypes = [...new Set(recentExports.slice(0, 5).map(e => e.metadata?.exportType).filter(Boolean))];
    if (recentExportTypes.length >= 3) {
      result.breachDetected = true;
      result.alerts.push({
        type: 'DIVERSE_EXPORT_PATTERN',
        severity: 'MEDIUM',
        message: `User ${userId} exported ${recentExportTypes.length} different data types recently`,
        details: {
          userId,
          userRole,
          exportTypes: recentExportTypes,
          timeWindow: '24 hours',
          ipAddress
        }
      });
      result.recommendations.push('Verify business justification for accessing diverse data types');
    }
    
    // Log the export for monitoring
    await AuditLog.create({
      timestamp: new Date(),
      actionType: 'SECURITY_EXPORT_MONITOR',
      userId,
      action: `Data export monitored: ${exportType}`,
      userType: userRole,
      ipAddress,
      metadata: {
        exportType,
        recordCount,
        recentExportCount: recentExports.length,
        monitoringResult: {
          breachDetected: result.breachDetected,
          alertCount: result.alerts.length
        }
      }
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error monitoring data export:', error);
    return {
      breachDetected: false,
      alerts: [],
      recommendations: [],
      error: error.message
    };
  }
}

/**
 * Monitor for suspicious IP address patterns
 * Detects potential account takeover or geographic anomalies
 * 
 * @param {string} userId - User ID
 * @param {string} ipAddress - Current IP address
 * @param {string} userAgent - User agent string
 * @returns {Object} - Monitoring result with breach detection
 */
async function monitorSuspiciousIPPatterns(userId, ipAddress, userAgent) {
  const result = {
    breachDetected: false,
    alerts: [],
    recommendations: []
  };
  
  try {
    // Get recent login history for this user
    const recentLogins = await AuditLog.find({
      userId,
      actionType: { $in: ['USER_LOGIN', 'ADMIN_ACCESS'] },
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ timestamp: -1 }).limit(20);
    
    if (recentLogins.length > 0) {
      // Check for multiple IP addresses in short time
      const recentIPs = [...new Set(recentLogins.slice(0, 10).map(l => l.ipAddress).filter(Boolean))];
      
      if (recentIPs.length >= 5) {
        result.breachDetected = true;
        result.alerts.push({
          type: 'MULTIPLE_IP_ACCESS',
          severity: 'MEDIUM',
          message: `User ${userId} accessed from ${recentIPs.length} different IP addresses recently`,
          details: {
            userId,
            ipAddresses: recentIPs,
            currentIP: ipAddress,
            timeWindow: 'Recent logins'
          }
        });
        result.recommendations.push('Verify user identity and check for account compromise');
      }
      
      // Check for first-time IP address
      const knownIPs = recentLogins.map(l => l.ipAddress).filter(Boolean);
      if (!knownIPs.includes(ipAddress)) {
        result.alerts.push({
          type: 'NEW_IP_ACCESS',
          severity: 'LOW',
          message: `User ${userId} accessing from new IP address: ${ipAddress}`,
          details: {
            userId,
            newIP: ipAddress,
            knownIPs: [...new Set(knownIPs)],
            userAgent
          }
        });
        result.recommendations.push('Consider sending security notification to user');
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error monitoring IP patterns:', error);
    return {
      breachDetected: false,
      alerts: [],
      recommendations: [],
      error: error.message
    };
  }
}

/**
 * Comprehensive security monitoring check
 * Runs all monitoring checks and aggregates results
 * 
 * @param {Object} context - Security monitoring context
 * @returns {Object} - Comprehensive monitoring result
 */
async function runSecurityMonitoring(context) {
  const {
    userId,
    userRole,
    ipAddress,
    userAgent,
    action,
    actionType,
    accessType,
    dataType,
    exportType,
    recordCount,
    email
  } = context;
  
  const results = {
    breachDetected: false,
    alerts: [],
    recommendations: [],
    monitoringChecks: []
  };
  
  try {
    // Run appropriate monitoring checks based on action type
    if (actionType === 'failed_login') {
      const loginResult = await monitorFailedAuthentication(ipAddress, email, userAgent, action);
      results.monitoringChecks.push({ type: 'failed_authentication', result: loginResult });
      
      if (loginResult.breachDetected) {
        results.breachDetected = true;
        results.alerts.push(...loginResult.alerts);
        results.recommendations.push(...loginResult.recommendations);
      }
    }
    
    if (actionType === 'phi_access' && userId) {
      const accessResult = await monitorUnusualAccess(userId, userRole, accessType, dataType, ipAddress);
      results.monitoringChecks.push({ type: 'unusual_access', result: accessResult });
      
      if (accessResult.breachDetected) {
        results.breachDetected = true;
        results.alerts.push(...accessResult.alerts);
        results.recommendations.push(...accessResult.recommendations);
      }
    }
    
    if (actionType === 'data_export' && userId) {
      const exportResult = await monitorDataExportAnomalies(userId, userRole, exportType, recordCount, ipAddress);
      results.monitoringChecks.push({ type: 'data_export', result: exportResult });
      
      if (exportResult.breachDetected) {
        results.breachDetected = true;
        results.alerts.push(...exportResult.alerts);
        results.recommendations.push(...exportResult.recommendations);
      }
    }
    
    if (actionType === 'login_success' && userId) {
      const ipResult = await monitorSuspiciousIPPatterns(userId, ipAddress, userAgent);
      results.monitoringChecks.push({ type: 'ip_patterns', result: ipResult });
      
      if (ipResult.breachDetected) {
        results.breachDetected = true;
        results.alerts.push(...ipResult.alerts);
        results.recommendations.push(...ipResult.recommendations);
      }
    }
    
    // Log the comprehensive monitoring result
    await AuditLog.create({
      timestamp: new Date(),
      actionType: 'SECURITY_MONITORING',
      userId,
      action: `Security monitoring performed for ${actionType}`,
      userType: userRole,
      ipAddress,
      metadata: {
        context,
        breachDetected: results.breachDetected,
        alertCount: results.alerts.length,
        checksPerformed: results.monitoringChecks.length
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Error running security monitoring:', error);
    return {
      breachDetected: false,
      alerts: [],
      recommendations: [],
      monitoringChecks: [],
      error: error.message
    };
  }
}

/**
 * Clean up old entries from tracking maps
 * 
 * @param {Map} trackingMap - Map to clean up
 * @param {number} windowMs - Time window in milliseconds
 */
function cleanupOldEntries(trackingMap, windowMs) {
  const cutoff = Date.now() - windowMs;
  
  for (const [key, entries] of trackingMap.entries()) {
    const validEntries = entries.filter(entry => entry.timestamp > cutoff);
    
    if (validEntries.length === 0) {
      trackingMap.delete(key);
    } else {
      trackingMap.set(key, validEntries);
    }
  }
}

/**
 * Get current security monitoring statistics
 * 
 * @returns {Object} - Current monitoring statistics
 */
function getMonitoringStatistics() {
  return {
    failedLoginTracking: {
      ipAddressCount: failedLoginAttempts.size,
      userCount: failedLoginsByUser.size,
      totalAttempts: Array.from(failedLoginAttempts.values()).reduce((sum, attempts) => sum + attempts.length, 0)
    },
    thresholds: SECURITY_THRESHOLDS,
    lastCleanup: new Date()
  };
}

module.exports = {
  monitorFailedAuthentication,
  monitorUnusualAccess,
  monitorDataExportAnomalies,
  monitorSuspiciousIPPatterns,
  runSecurityMonitoring,
  getMonitoringStatistics,
  SECURITY_THRESHOLDS
};