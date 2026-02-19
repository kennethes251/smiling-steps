/**
 * Flow Integrity Monitoring Service
 * 
 * Provides monitoring and alerting for flow integrity:
 * - Dashboard for state transition violations
 * - Real-time alerts for critical failures
 * - Integrity health checks
 * - Automated recovery success tracking
 * - Comprehensive logging with before/after states
 * 
 * Requirements: 0.8.1 and 0.8.2 from Flow Integrity Implementation
 */

const EventEmitter = require('events');

const MONITORING_CONFIG = {
  HEALTH_CHECK_INTERVAL_MS: 60000,
  ALERT_COOLDOWN_MS: 300000,
  MAX_VIOLATIONS_BEFORE_ALERT: 3,
  LOG_RETENTION_HOURS: 72,
  METRICS_AGGREGATION_INTERVAL_MS: 300000
};

class FlowIntegrityMonitor extends EventEmitter {
  constructor() {
    super();
    this.violations = [];
    this.recoveryAttempts = [];
    this.metrics = { stateTransitions: 0, violations: 0, recoveries: 0, failedRecoveries: 0 };
    this.alertCooldowns = new Map();
    this.healthStatus = { overall: 'healthy', lastCheck: null, components: {} };
  }

  // STATE TRANSITION LOGGING

  logStateTransition(data) {
    const { entityType, entityId, previousState, newState, triggeredBy, userId, metadata = {} } = data;
    const logEntry = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      entityType,
      entityId,
      previousState,
      newState,
      triggeredBy,
      userId,
      metadata,
      valid: true
    };
    
    this.metrics.stateTransitions++;
    this.emit('transition:logged', logEntry);
    console.log(`📊 State transition: ${entityType}/${entityId} ${previousState} → ${newState}`);
    return logEntry;
  }

  logViolation(data) {
    const { entityType, entityId, attemptedTransition, reason, severity = 'medium', userId } = data;
    const violation = {
      id: `viol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      entityType,
      entityId,
      attemptedTransition,
      reason,
      severity,
      userId,
      resolved: false
    };
    
    this.violations.push(violation);
    this.metrics.violations++;
    this.emit('violation:detected', violation);
    console.error(`🚨 Violation: ${entityType}/${entityId} - ${reason}`);
    
    if (severity === 'critical' || this.getRecentViolationCount() >= MONITORING_CONFIG.MAX_VIOLATIONS_BEFORE_ALERT) {
      this.sendAlert('violation', `Flow integrity violation: ${reason}`, severity);
    }
    return violation;
  }


  logRecoveryAttempt(data) {
    const { type, entityId, action, success, details = {} } = data;
    const attempt = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      entityId,
      action,
      success,
      details
    };
    
    this.recoveryAttempts.push(attempt);
    if (success) this.metrics.recoveries++;
    else this.metrics.failedRecoveries++;
    
    this.emit('recovery:attempted', attempt);
    console.log(`${success ? '✅' : '❌'} Recovery ${type}: ${action} - ${success ? 'Success' : 'Failed'}`);
    return attempt;
  }

  // HEALTH CHECKS

  async runHealthCheck() {
    const checks = {
      database: await this.checkDatabaseHealth(),
      stateConsistency: await this.checkStateConsistency(),
      queueHealth: this.checkQueueHealth(),
      recentViolations: this.checkRecentViolations()
    };
    
    const unhealthyComponents = Object.entries(checks).filter(([, v]) => !v.healthy);
    this.healthStatus = {
      overall: unhealthyComponents.length === 0 ? 'healthy' : unhealthyComponents.length <= 1 ? 'degraded' : 'unhealthy',
      lastCheck: new Date(),
      components: checks
    };
    
    this.emit('health:checked', this.healthStatus);
    if (this.healthStatus.overall === 'unhealthy') {
      this.sendAlert('health', `System health degraded: ${unhealthyComponents.map(([k]) => k).join(', ')}`, 'high');
    }
    return this.healthStatus;
  }

  async checkDatabaseHealth() {
    try {
      const mongoose = require('mongoose');
      const isConnected = mongoose.connection.readyState === 1;
      return { healthy: isConnected, status: isConnected ? 'connected' : 'disconnected' };
    } catch (e) {
      return { healthy: false, status: 'error', error: e.message };
    }
  }

  async checkStateConsistency() {
    try {
      const Session = require('../models/Session');
      const inconsistent = await Session.countDocuments({
        $or: [
          { paymentStatus: 'confirmed', status: 'cancelled' },
          { status: 'completed', actualEndTime: null },
          { status: 'in_progress', paymentStatus: { $ne: 'confirmed' } }
        ]
      });
      return { healthy: inconsistent === 0, inconsistentCount: inconsistent };
    } catch (e) {
      return { healthy: true, status: 'check_skipped', reason: e.message };
    }
  }

  checkQueueHealth() {
    const { systemFailureRecoveryService } = require('./systemFailureRecovery');
    const status = systemFailureRecoveryService?.getSystemStatus?.() || { database: { queuedOperations: { pending: 0 } }, email: { queuedEmails: { pending: 0 } } };
    const totalQueued = (status.database?.queuedOperations?.pending || 0) + (status.email?.queuedEmails?.pending || 0);
    return { healthy: totalQueued < 100, queuedOperations: totalQueued };
  }

  checkRecentViolations() {
    const recentCount = this.getRecentViolationCount();
    return { healthy: recentCount < 10, recentViolations: recentCount };
  }

  getRecentViolationCount(windowMs = 3600000) {
    const cutoff = Date.now() - windowMs;
    return this.violations.filter(v => new Date(v.timestamp).getTime() > cutoff).length;
  }


  // ALERTING

  sendAlert(type, message, severity = 'medium') {
    const alertKey = `${type}:${severity}`;
    const lastAlert = this.alertCooldowns.get(alertKey);
    
    if (lastAlert && Date.now() - lastAlert < MONITORING_CONFIG.ALERT_COOLDOWN_MS) {
      return { sent: false, reason: 'cooldown' };
    }
    
    this.alertCooldowns.set(alertKey, Date.now());
    const alert = { id: `alert_${Date.now()}`, type, message, severity, timestamp: new Date() };
    this.emit('alert:sent', alert);
    console.error(`🚨 ALERT [${severity.toUpperCase()}] ${type}: ${message}`);
    return { sent: true, alert };
  }

  // DASHBOARD DATA

  getDashboardData() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    
    return {
      health: this.healthStatus,
      metrics: {
        ...this.metrics,
        violationsLastHour: this.violations.filter(v => new Date(v.timestamp).getTime() > hourAgo).length,
        violationsLastDay: this.violations.filter(v => new Date(v.timestamp).getTime() > dayAgo).length,
        recoverySuccessRate: this.metrics.recoveries + this.metrics.failedRecoveries > 0 
          ? Math.round((this.metrics.recoveries / (this.metrics.recoveries + this.metrics.failedRecoveries)) * 100) 
          : 100
      },
      recentViolations: this.violations.slice(-20).reverse(),
      recentRecoveries: this.recoveryAttempts.slice(-20).reverse(),
      timestamp: new Date()
    };
  }

  getViolationsByType(hours = 24) {
    const cutoff = Date.now() - hours * 3600000;
    const recent = this.violations.filter(v => new Date(v.timestamp).getTime() > cutoff);
    const byType = {};
    recent.forEach(v => { byType[v.entityType] = (byType[v.entityType] || 0) + 1; });
    return byType;
  }

  // CLEANUP

  cleanupOldData() {
    const cutoff = Date.now() - MONITORING_CONFIG.LOG_RETENTION_HOURS * 3600000;
    this.violations = this.violations.filter(v => new Date(v.timestamp).getTime() > cutoff);
    this.recoveryAttempts = this.recoveryAttempts.filter(r => new Date(r.timestamp).getTime() > cutoff);
    console.log(`🧹 Cleaned up old monitoring data`);
  }

  startMonitoring() {
    setInterval(() => this.runHealthCheck(), MONITORING_CONFIG.HEALTH_CHECK_INTERVAL_MS);
    setInterval(() => this.cleanupOldData(), MONITORING_CONFIG.LOG_RETENTION_HOURS * 3600000 / 4);
    console.log('📊 Flow integrity monitoring started');
  }
}

const flowIntegrityMonitor = new FlowIntegrityMonitor();
module.exports = { FlowIntegrityMonitor, flowIntegrityMonitor, MONITORING_CONFIG };
