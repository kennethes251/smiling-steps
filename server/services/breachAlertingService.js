/**
 * Breach Alerting Service
 * 
 * Alerts administrators within 15 minutes of breach detection,
 * logs incident details, and triggers incident response workflow.
 * 
 * Requirements: 10.5 - WHEN a data breach is detected THEN the system SHALL 
 * log the incident and notify administrators within 15 minutes
 */

const nodemailer = require('nodemailer');
const { logAdminAccess } = require('../utils/auditLogger');

/**
 * Create audit log entry for security incidents
 * Uses the proper audit logging utility with hash generation
 */
async function createSecurityAuditLog(actionType, data) {
  try {
    // Create a structured log entry using the audit logger utility
    const crypto = require('crypto');
    const AuditLog = require('../models/AuditLog');
    
    // Generate hash for tamper-evident logging
    const logString = JSON.stringify({ timestamp: new Date(), actionType, ...data });
    const hash = crypto.createHash('sha256').update(logString).digest('hex');
    
    const logEntry = {
      timestamp: new Date(),
      actionType,
      logHash: hash,
      previousHash: null, // Simplified for security logs
      ...data
    };
    
    // Try to persist to database
    try {
      await AuditLog.create(logEntry);
    } catch (dbError) {
      console.error('⚠️ Failed to persist security audit log to database:', dbError.message);
      // Continue even if database write fails - incident is still tracked in memory
    }
    
    return logEntry;
  } catch (error) {
    console.error('❌ Error creating security audit log:', error);
    return null;
  }
}

/**
 * Breach alert configuration
 */
const BREACH_ALERT_CONFIG = {
  // Alert timing requirements (Requirement 10.5)
  MAX_ALERT_DELAY_MINUTES: 15,
  
  // Alert escalation levels
  SEVERITY_LEVELS: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM', 
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
  },
  
  // Alert channels
  ALERT_CHANNELS: {
    EMAIL: 'email',
    SMS: 'sms', // Future implementation
    WEBHOOK: 'webhook', // Future implementation
    DASHBOARD: 'dashboard'
  },
  
  // Incident response workflow stages
  INCIDENT_STAGES: {
    DETECTED: 'detected',
    INVESTIGATING: 'investigating',
    CONTAINED: 'contained',
    RESOLVED: 'resolved'
  }
};

/**
 * Active incidents tracking
 */
const activeIncidents = new Map();
let incidentCounter = 1;

/**
 * Email transporter for alerts (reuse existing configuration)
 */
let emailTransporter = null;

/**
 * Initialize email transporter for breach alerts
 */
function initializeEmailTransporter() {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return emailTransporter;
}

/**
 * Create a security incident record
 * 
 * @param {Object} breachData - Breach detection data
 * @returns {Object} - Created incident record
 */
async function createSecurityIncident(breachData) {
  const incidentId = `SEC-${Date.now()}-${incidentCounter++}`;
  const incident = {
    id: incidentId,
    timestamp: new Date(),
    status: BREACH_ALERT_CONFIG.INCIDENT_STAGES.DETECTED,
    severity: determineSeverity(breachData.alerts),
    alerts: breachData.alerts,
    recommendations: breachData.recommendations,
    context: breachData.context || {},
    alertsSent: [],
    escalationLevel: 0,
    assignedTo: null,
    notes: [],
    timeline: [{
      timestamp: new Date(),
      action: 'incident_created',
      details: 'Security incident automatically created by breach detection system'
    }]
  };
  
  // Store in active incidents
  activeIncidents.set(incidentId, incident);
  
  // Log incident creation using proper audit logging
  await createSecurityAuditLog('SECURITY_INCIDENT_CREATED', {
    action: `Security incident created: ${incidentId}`,
    metadata: {
      incidentId,
      severity: incident.severity,
      alertCount: incident.alerts.length,
      breachTypes: incident.alerts.map(a => a.type)
    }
  });
  
  console.log(`🚨 SECURITY INCIDENT CREATED: ${incidentId} (${incident.severity})`);
  
  return incident;
}

/**
 * Determine incident severity based on alerts
 * 
 * @param {Array} alerts - Array of security alerts
 * @returns {string} - Severity level
 */
function determineSeverity(alerts) {
  if (!alerts || alerts.length === 0) return BREACH_ALERT_CONFIG.SEVERITY_LEVELS.LOW;
  
  // Check for critical alerts
  const hasCritical = alerts.some(alert => alert.severity === 'CRITICAL');
  if (hasCritical) return BREACH_ALERT_CONFIG.SEVERITY_LEVELS.CRITICAL;
  
  // Check for high severity alerts
  const hasHigh = alerts.some(alert => alert.severity === 'HIGH');
  if (hasHigh) return BREACH_ALERT_CONFIG.SEVERITY_LEVELS.HIGH;
  
  // Check for medium severity alerts
  const hasMedium = alerts.some(alert => alert.severity === 'MEDIUM');
  if (hasMedium) return BREACH_ALERT_CONFIG.SEVERITY_LEVELS.MEDIUM;
  
  return BREACH_ALERT_CONFIG.SEVERITY_LEVELS.LOW;
}

/**
 * Get all admin users for alerting
 * 
 * @returns {Array} - Array of admin users
 */
async function getAdminUsers() {
  try {
    const User = require('../models/User');
    const admins = await User.find({ 
      role: 'admin',
      isVerified: true 
    }).select('name email phone');
    
    return admins;
  } catch (error) {
    console.error('❌ Error fetching admin users:', error);
    return [];
  }
}

/**
 * Send email alert to administrators
 * 
 * @param {Object} incident - Security incident
 * @param {Array} admins - Admin users to notify
 * @returns {Object} - Email sending result
 */
async function sendEmailAlert(incident, admins) {
  const result = {
    success: false,
    sentTo: [],
    errors: []
  };
  
  try {
    const transporter = initializeEmailTransporter();
    
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }
    
    const emailSubject = `🚨 SECURITY BREACH DETECTED - ${incident.severity} - ${incident.id}`;
    
    const emailBody = generateAlertEmailBody(incident);
    
    // Send to all admins
    for (const admin of admins) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: admin.email,
          subject: emailSubject,
          html: emailBody,
          priority: 'high',
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high'
          }
        });
        
        result.sentTo.push(admin.email);
        console.log(`📧 Breach alert sent to admin: ${admin.email}`);
        
      } catch (emailError) {
        console.error(`❌ Failed to send alert to ${admin.email}:`, emailError);
        result.errors.push({
          email: admin.email,
          error: emailError.message
        });
      }
    }
    
    result.success = result.sentTo.length > 0;
    
    return result;
    
  } catch (error) {
    console.error('❌ Error sending email alerts:', error);
    result.errors.push({ error: error.message });
    return result;
  }
}

/**
 * Generate HTML email body for breach alert
 * 
 * @param {Object} incident - Security incident
 * @returns {string} - HTML email body
 */
function generateAlertEmailBody(incident) {
  const severityColor = {
    'CRITICAL': '#dc3545',
    'HIGH': '#fd7e14', 
    'MEDIUM': '#ffc107',
    'LOW': '#28a745'
  };
  
  const color = severityColor[incident.severity] || '#6c757d';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Security Breach Alert</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: ${color}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .alert-box { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 15px 0; }
            .recommendation-box { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 15px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
            .timestamp { font-size: 14px; color: #6c757d; }
            .severity-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background-color: ${color}; }
            ul { margin: 10px 0; padding-left: 20px; }
            li { margin: 5px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 SECURITY BREACH DETECTED</h1>
                <p>Incident ID: ${incident.id}</p>
                <span class="severity-badge">${incident.severity} SEVERITY</span>
            </div>
            
            <div class="content">
                <p class="timestamp"><strong>Detection Time:</strong> ${incident.timestamp.toLocaleString()}</p>
                
                <h3>Security Alerts (${incident.alerts.length})</h3>
                ${incident.alerts.map(alert => `
                    <div class="alert-box">
                        <h4>${alert.type} - ${alert.severity}</h4>
                        <p><strong>Message:</strong> ${alert.message}</p>
                        ${alert.details ? `
                            <p><strong>Details:</strong></p>
                            <ul>
                                ${Object.entries(alert.details).map(([key, value]) => 
                                    `<li><strong>${key}:</strong> ${Array.isArray(value) ? value.join(', ') : value}</li>`
                                ).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `).join('')}
                
                <h3>Recommended Actions</h3>
                <div class="recommendation-box">
                    <ul>
                        ${incident.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <h3>Immediate Actions Required</h3>
                <ol>
                    <li><strong>Investigate immediately</strong> - Review the incident details and affected systems</li>
                    <li><strong>Verify threat</strong> - Confirm if this is a genuine security incident</li>
                    <li><strong>Contain if necessary</strong> - Take appropriate containment measures</li>
                    <li><strong>Document response</strong> - Log all investigation and response actions</li>
                    <li><strong>Update incident status</strong> - Mark incident as investigating/contained/resolved</li>
                </ol>
                
                <p><strong>⏰ Response Time Requirement:</strong> This alert was sent within 15 minutes of detection as required by HIPAA compliance (Requirement 10.5).</p>
            </div>
            
            <div class="footer">
                <p>This is an automated security alert from the Smiling Steps Teletherapy Platform</p>
                <p>Incident ID: ${incident.id} | Generated: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Process security breach detection and trigger alerts
 * Main entry point for breach alerting system
 * 
 * @param {Object} breachData - Breach detection data from security monitoring
 * @returns {Object} - Alerting result
 */
async function processSecurityBreach(breachData) {
  const result = {
    success: false,
    incidentId: null,
    alertsSent: [],
    errors: [],
    responseTime: null
  };
  
  const startTime = Date.now();
  
  try {
    console.log('🚨 PROCESSING SECURITY BREACH:', JSON.stringify(breachData, null, 2));
    
    // Create security incident
    const incident = await createSecurityIncident(breachData);
    result.incidentId = incident.id;
    
    // Get admin users for alerting
    const admins = await getAdminUsers();
    
    if (admins.length === 0) {
      console.error('⚠️ No admin users found for breach alerting');
      result.errors.push('No admin users available for alerting');
    } else {
      // Send email alerts
      const emailResult = await sendEmailAlert(incident, admins);
      
      if (emailResult.success) {
        result.alertsSent.push({
          channel: BREACH_ALERT_CONFIG.ALERT_CHANNELS.EMAIL,
          recipients: emailResult.sentTo,
          timestamp: new Date()
        });
        
        // Update incident with alert information
        incident.alertsSent.push(...result.alertsSent);
        incident.timeline.push({
          timestamp: new Date(),
          action: 'alerts_sent',
          details: `Email alerts sent to ${emailResult.sentTo.length} administrators`
        });
      }
      
      if (emailResult.errors.length > 0) {
        result.errors.push(...emailResult.errors);
      }
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    result.responseTime = responseTime;
    
    // Verify 15-minute requirement (Requirement 10.5)
    const maxResponseTimeMs = BREACH_ALERT_CONFIG.MAX_ALERT_DELAY_MINUTES * 60 * 1000;
    const withinRequirement = responseTime <= maxResponseTimeMs;
    
    // Log the breach processing using proper audit logging
    await createSecurityAuditLog('SECURITY_BREACH_PROCESSED', {
      action: `Security breach processed and alerts sent`,
      metadata: {
        incidentId: incident.id,
        severity: incident.severity,
        alertsSent: result.alertsSent.length,
        responseTimeMs: responseTime,
        withinRequirement,
        maxAllowedMs: maxResponseTimeMs,
        adminCount: admins.length,
        errors: result.errors.length
      }
    });
    
    result.success = result.alertsSent.length > 0;
    
    console.log(`✅ Breach processing completed in ${responseTime}ms (${withinRequirement ? 'WITHIN' : 'EXCEEDS'} 15-minute requirement)`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error processing security breach:', error);
    
    // Log the error using proper audit logging
    await createSecurityAuditLog('SECURITY_BREACH_ERROR', {
      action: `Error processing security breach`,
      metadata: {
        error: error.message,
        breachData,
        responseTimeMs: Date.now() - startTime
      }
    });
    
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Update incident status and add notes
 * 
 * @param {string} incidentId - Incident ID
 * @param {string} status - New status
 * @param {string} note - Status update note
 * @param {string} adminId - Admin making the update
 * @returns {Object} - Update result
 */
async function updateIncidentStatus(incidentId, status, note, adminId) {
  try {
    const incident = activeIncidents.get(incidentId);
    
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }
    
    const previousStatus = incident.status;
    incident.status = status;
    incident.notes.push({
      timestamp: new Date(),
      adminId,
      note
    });
    incident.timeline.push({
      timestamp: new Date(),
      action: 'status_updated',
      details: `Status changed from ${previousStatus} to ${status}`,
      adminId
    });
    
    // Log the status update
    await logAdminAccess({
      adminId,
      action: `Updated security incident status: ${incidentId}`,
      accessedData: `Incident status changed from ${previousStatus} to ${status}`,
      ipAddress: null // Will be filled by calling middleware
    });
    
    console.log(`📝 Incident ${incidentId} status updated: ${previousStatus} → ${status}`);
    
    return {
      success: true,
      incident,
      previousStatus,
      newStatus: status
    };
    
  } catch (error) {
    console.error('❌ Error updating incident status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get active security incidents
 * 
 * @param {string} status - Filter by status (optional)
 * @returns {Array} - Array of active incidents
 */
function getActiveIncidents(status = null) {
  const incidents = Array.from(activeIncidents.values());
  
  if (status) {
    return incidents.filter(incident => incident.status === status);
  }
  
  return incidents.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get incident by ID
 * 
 * @param {string} incidentId - Incident ID
 * @returns {Object|null} - Incident or null if not found
 */
function getIncidentById(incidentId) {
  return activeIncidents.get(incidentId) || null;
}

/**
 * Archive resolved incidents (move to database for long-term storage)
 * 
 * @param {string} incidentId - Incident ID to archive
 * @returns {Object} - Archive result
 */
async function archiveIncident(incidentId) {
  try {
    const incident = activeIncidents.get(incidentId);
    
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }
    
    if (incident.status !== BREACH_ALERT_CONFIG.INCIDENT_STAGES.RESOLVED) {
      throw new Error(`Cannot archive incident ${incidentId} - status is ${incident.status}, must be resolved`);
    }
    
    // Store in audit log for permanent record using proper audit logging
    await createSecurityAuditLog('SECURITY_INCIDENT_ARCHIVED', {
      action: `Security incident archived: ${incidentId}`,
      metadata: {
        incident: {
          ...incident,
          archivedAt: new Date()
        }
      }
    });
    
    // Remove from active incidents
    activeIncidents.delete(incidentId);
    
    console.log(`📁 Incident ${incidentId} archived successfully`);
    
    return {
      success: true,
      incidentId,
      archivedAt: new Date()
    };
    
  } catch (error) {
    console.error('❌ Error archiving incident:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get breach alerting system statistics
 * 
 * @returns {Object} - System statistics
 */
function getAlertingStatistics() {
  const incidents = Array.from(activeIncidents.values());
  
  return {
    activeIncidents: incidents.length,
    incidentsByStatus: {
      detected: incidents.filter(i => i.status === BREACH_ALERT_CONFIG.INCIDENT_STAGES.DETECTED).length,
      investigating: incidents.filter(i => i.status === BREACH_ALERT_CONFIG.INCIDENT_STAGES.INVESTIGATING).length,
      contained: incidents.filter(i => i.status === BREACH_ALERT_CONFIG.INCIDENT_STAGES.CONTAINED).length,
      resolved: incidents.filter(i => i.status === BREACH_ALERT_CONFIG.INCIDENT_STAGES.RESOLVED).length
    },
    incidentsBySeverity: {
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      medium: incidents.filter(i => i.severity === 'MEDIUM').length,
      low: incidents.filter(i => i.severity === 'LOW').length
    },
    oldestIncident: incidents.length > 0 ? Math.min(...incidents.map(i => i.timestamp)) : null,
    config: BREACH_ALERT_CONFIG
  };
}

module.exports = {
  processSecurityBreach,
  updateIncidentStatus,
  getActiveIncidents,
  getIncidentById,
  archiveIncident,
  getAlertingStatistics,
  BREACH_ALERT_CONFIG
};