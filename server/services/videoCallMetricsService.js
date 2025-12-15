/**
 * Video Call Metrics Service
 * Monitors call success rates, quality metrics, and performance indicators
 * Requirements: Monitor call success rates and quality metrics
 */

const { v4: uuidv4 } = require('uuid');

class VideoCallMetricsService {
  constructor() {
    // In-memory storage for real-time metrics (production should use Redis/database)
    this.metrics = {
      connectionAttempts: new Map(), // sessionId -> attempt data
      activeCalls: new Map(), // sessionId -> call data
      completedCalls: new Map(), // sessionId -> completion data
      errors: new Map(), // sessionId -> error data
      qualityMetrics: new Map(), // sessionId -> quality data
      dailyStats: new Map() // date -> daily aggregated stats
    };
    
    // Performance targets from requirements
    this.targets = {
      connectionSuccessRate: 0.95, // 95%+
      callDropRate: 0.05, // <5%
      connectionTime: 3000, // <3 seconds
      userSatisfaction: 0.90, // 90%+
      securityIncidents: 0, // 0
      paymentValidation: 1.0 // 100%
    };
    
    // Start periodic cleanup and aggregation
    this.startPeriodicTasks();
  }
  
  /**
   * Record a connection attempt
   */
  recordConnectionAttempt(sessionId, userId, userRole, metadata = {}) {
    const attemptId = uuidv4();
    const timestamp = new Date();
    
    const attemptData = {
      attemptId,
      sessionId,
      userId,
      userRole,
      timestamp,
      startTime: Date.now(),
      status: 'attempting',
      metadata: {
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        browser: metadata.browser,
        ...metadata
      }
    };
    
    this.metrics.connectionAttempts.set(attemptId, attemptData);
    
    console.log(`📊 Connection attempt recorded: ${sessionId} by ${userRole} ${userId}`);
    
    return attemptId;
  }
  
  /**
   * Record successful connection
   */
  recordConnectionSuccess(attemptId, connectionTime, metadata = {}) {
    const attempt = this.metrics.connectionAttempts.get(attemptId);
    if (!attempt) {
      console.warn(`📊 Connection attempt not found: ${attemptId}`);
      return;
    }
    
    const actualConnectionTime = connectionTime || (Date.now() - attempt.startTime);
    
    attempt.status = 'connected';
    attempt.connectionTime = actualConnectionTime;
    attempt.connectedAt = new Date();
    attempt.metadata = { ...attempt.metadata, ...metadata };
    
    // Move to active calls
    this.metrics.activeCalls.set(attempt.sessionId, {
      ...attempt,
      callStartTime: Date.now(),
      participants: [attempt.userId],
      qualityEvents: []
    });
    
    console.log(`📊 Connection successful: ${attempt.sessionId} in ${actualConnectionTime}ms`);
    
    // Update daily stats
    this.updateDailyStats('connectionSuccess', {
      connectionTime: actualConnectionTime,
      sessionId: attempt.sessionId
    });
  }
  
  /**
   * Record connection failure
   */
  recordConnectionFailure(attemptId, errorType, errorMessage, metadata = {}) {
    const attempt = this.metrics.connectionAttempts.get(attemptId);
    if (!attempt) {
      console.warn(`📊 Connection attempt not found: ${attemptId}`);
      return;
    }
    
    const connectionTime = Date.now() - attempt.startTime;
    
    attempt.status = 'failed';
    attempt.connectionTime = connectionTime;
    attempt.failedAt = new Date();
    attempt.error = {
      type: errorType,
      message: errorMessage,
      ...metadata
    };
    
    // Store in errors map
    this.metrics.errors.set(attempt.sessionId, {
      ...attempt,
      errorType,
      errorMessage,
      timestamp: new Date()
    });
    
    console.log(`📊 Connection failed: ${attempt.sessionId} - ${errorType}: ${errorMessage}`);
    
    // Update daily stats
    this.updateDailyStats('connectionFailure', {
      errorType,
      sessionId: attempt.sessionId
    });
  }
  
  /**
   * Record participant joining call
   */
  recordParticipantJoin(sessionId, userId, userRole, metadata = {}) {
    const activeCall = this.metrics.activeCalls.get(sessionId);
    if (!activeCall) {
      console.warn(`📊 Active call not found: ${sessionId}`);
      return;
    }
    
    if (!activeCall.participants.includes(userId)) {
      activeCall.participants.push(userId);
      activeCall.participantJoinTimes = activeCall.participantJoinTimes || {};
      activeCall.participantJoinTimes[userId] = Date.now();
      
      console.log(`📊 Participant joined: ${userId} (${userRole}) in session ${sessionId}`);
      
      // If this is the second participant, record call start
      if (activeCall.participants.length === 2) {
        this.recordCallStart(sessionId);
      }
    }
  }
  
  /**
   * Record call start (when both participants are connected)
   */
  recordCallStart(sessionId, metadata = {}) {
    const activeCall = this.metrics.activeCalls.get(sessionId);
    if (!activeCall) {
      console.warn(`📊 Active call not found: ${sessionId}`);
      return;
    }
    
    activeCall.callActualStartTime = Date.now();
    activeCall.status = 'in_progress';
    activeCall.metadata = { ...activeCall.metadata, ...metadata };
    
    console.log(`📊 Call started: ${sessionId} with ${activeCall.participants.length} participants`);
    
    // Update daily stats
    this.updateDailyStats('callStart', {
      sessionId,
      participantCount: activeCall.participants.length
    });
  }
  
  /**
   * Record call end
   */
  recordCallEnd(sessionId, endReason = 'normal', duration, metadata = {}) {
    const activeCall = this.metrics.activeCalls.get(sessionId);
    if (!activeCall) {
      console.warn(`📊 Active call not found: ${sessionId}`);
      return;
    }
    
    const callEndTime = Date.now();
    const actualDuration = duration || (callEndTime - (activeCall.callActualStartTime || activeCall.callStartTime));
    
    const completedCall = {
      ...activeCall,
      status: 'completed',
      endReason,
      callEndTime,
      actualDuration,
      endMetadata: metadata
    };
    
    // Move to completed calls
    this.metrics.completedCalls.set(sessionId, completedCall);
    this.metrics.activeCalls.delete(sessionId);
    
    console.log(`📊 Call ended: ${sessionId} - Duration: ${Math.round(actualDuration / 1000)}s - Reason: ${endReason}`);
    
    // Update daily stats
    this.updateDailyStats('callEnd', {
      sessionId,
      duration: actualDuration,
      endReason,
      participantCount: completedCall.participants.length
    });
  }
  
  /**
   * Record call drop (unexpected disconnection)
   */
  recordCallDrop(sessionId, dropReason, metadata = {}) {
    const activeCall = this.metrics.activeCalls.get(sessionId);
    if (!activeCall) {
      console.warn(`📊 Active call not found: ${sessionId}`);
      return;
    }
    
    const callEndTime = Date.now();
    const duration = callEndTime - (activeCall.callActualStartTime || activeCall.callStartTime);
    
    const droppedCall = {
      ...activeCall,
      status: 'dropped',
      dropReason,
      callEndTime,
      actualDuration: duration,
      dropMetadata: metadata
    };
    
    // Move to completed calls with drop status
    this.metrics.completedCalls.set(sessionId, droppedCall);
    this.metrics.activeCalls.delete(sessionId);
    
    console.log(`📊 Call dropped: ${sessionId} - Duration: ${Math.round(duration / 1000)}s - Reason: ${dropReason}`);
    
    // Update daily stats
    this.updateDailyStats('callDrop', {
      sessionId,
      duration,
      dropReason,
      participantCount: droppedCall.participants.length
    });
  }
  
  /**
   * Record quality metrics
   */
  recordQualityMetrics(sessionId, metrics) {
    const activeCall = this.metrics.activeCalls.get(sessionId);
    if (activeCall) {
      activeCall.qualityEvents.push({
        timestamp: Date.now(),
        ...metrics
      });
    }
    
    // Store in quality metrics map
    if (!this.metrics.qualityMetrics.has(sessionId)) {
      this.metrics.qualityMetrics.set(sessionId, []);
    }
    
    this.metrics.qualityMetrics.get(sessionId).push({
      timestamp: Date.now(),
      ...metrics
    });
    
    console.log(`📊 Quality metrics recorded: ${sessionId}`, metrics);
  }
  
  /**
   * Record security incident
   */
  recordSecurityIncident(type, sessionId, userId, details) {
    const incident = {
      id: uuidv4(),
      type,
      sessionId,
      userId,
      timestamp: new Date(),
      details
    };
    
    // Store security incidents separately
    if (!this.metrics.securityIncidents) {
      this.metrics.securityIncidents = new Map();
    }
    
    this.metrics.securityIncidents.set(incident.id, incident);
    
    console.warn(`🚨 Security incident: ${type} - Session: ${sessionId} - User: ${userId}`, details);
    
    // Update daily stats
    this.updateDailyStats('securityIncident', {
      type,
      sessionId,
      userId
    });
  }
  
  /**
   * Record payment validation result
   */
  recordPaymentValidation(sessionId, isValid, paymentStatus, metadata = {}) {
    const validation = {
      sessionId,
      isValid,
      paymentStatus,
      timestamp: new Date(),
      metadata
    };
    
    if (!this.metrics.paymentValidations) {
      this.metrics.paymentValidations = new Map();
    }
    
    this.metrics.paymentValidations.set(sessionId, validation);
    
    console.log(`📊 Payment validation: ${sessionId} - Valid: ${isValid} - Status: ${paymentStatus}`);
    
    // Update daily stats
    this.updateDailyStats('paymentValidation', {
      sessionId,
      isValid,
      paymentStatus
    });
  }
  
  /**
   * Get current metrics summary
   */
  getMetricsSummary(timeRange = '24h') {
    const now = new Date();
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    
    // Calculate connection success rate
    const recentAttempts = Array.from(this.metrics.connectionAttempts.values())
      .filter(attempt => attempt.timestamp >= cutoffTime);
    
    const successfulConnections = recentAttempts.filter(attempt => attempt.status === 'connected').length;
    const failedConnections = recentAttempts.filter(attempt => attempt.status === 'failed').length;
    const totalAttempts = recentAttempts.length;
    
    const connectionSuccessRate = totalAttempts > 0 ? successfulConnections / totalAttempts : 0;
    
    // Calculate call drop rate
    const recentCalls = Array.from(this.metrics.completedCalls.values())
      .filter(call => call.timestamp >= cutoffTime);
    
    const droppedCalls = recentCalls.filter(call => call.status === 'dropped').length;
    const totalCalls = recentCalls.length;
    
    const callDropRate = totalCalls > 0 ? droppedCalls / totalCalls : 0;
    
    // Calculate average connection time
    const successfulConnectionTimes = recentAttempts
      .filter(attempt => attempt.status === 'connected' && attempt.connectionTime)
      .map(attempt => attempt.connectionTime);
    
    const avgConnectionTime = successfulConnectionTimes.length > 0 
      ? successfulConnectionTimes.reduce((sum, time) => sum + time, 0) / successfulConnectionTimes.length
      : 0;
    
    // Get security incidents
    const securityIncidents = this.metrics.securityIncidents 
      ? Array.from(this.metrics.securityIncidents.values())
          .filter(incident => incident.timestamp >= cutoffTime).length
      : 0;
    
    // Get payment validation rate
    const paymentValidations = this.metrics.paymentValidations
      ? Array.from(this.metrics.paymentValidations.values())
          .filter(validation => validation.timestamp >= cutoffTime)
      : [];
    
    const validPayments = paymentValidations.filter(v => v.isValid).length;
    const paymentValidationRate = paymentValidations.length > 0 
      ? validPayments / paymentValidations.length 
      : 0;
    
    const summary = {
      timeRange,
      timestamp: now,
      metrics: {
        connectionSuccessRate: {
          value: connectionSuccessRate,
          target: this.targets.connectionSuccessRate,
          status: connectionSuccessRate >= this.targets.connectionSuccessRate ? 'good' : 'warning',
          count: { successful: successfulConnections, failed: failedConnections, total: totalAttempts }
        },
        callDropRate: {
          value: callDropRate,
          target: this.targets.callDropRate,
          status: callDropRate <= this.targets.callDropRate ? 'good' : 'warning',
          count: { dropped: droppedCalls, total: totalCalls }
        },
        avgConnectionTime: {
          value: avgConnectionTime,
          target: this.targets.connectionTime,
          status: avgConnectionTime <= this.targets.connectionTime ? 'good' : 'warning',
          unit: 'ms'
        },
        securityIncidents: {
          value: securityIncidents,
          target: this.targets.securityIncidents,
          status: securityIncidents <= this.targets.securityIncidents ? 'good' : 'critical'
        },
        paymentValidationRate: {
          value: paymentValidationRate,
          target: this.targets.paymentValidation,
          status: paymentValidationRate >= this.targets.paymentValidation ? 'good' : 'warning',
          count: { valid: validPayments, total: paymentValidations.length }
        }
      },
      activeCalls: this.metrics.activeCalls.size,
      totalSessions: {
        attempted: totalAttempts,
        successful: successfulConnections,
        completed: totalCalls,
        active: this.metrics.activeCalls.size
      }
    };
    
    return summary;
  }
  
  /**
   * Get detailed metrics for a specific session
   */
  getSessionMetrics(sessionId) {
    const attempt = Array.from(this.metrics.connectionAttempts.values())
      .find(a => a.sessionId === sessionId);
    
    const activeCall = this.metrics.activeCalls.get(sessionId);
    const completedCall = this.metrics.completedCalls.get(sessionId);
    const qualityMetrics = this.metrics.qualityMetrics.get(sessionId) || [];
    const error = this.metrics.errors.get(sessionId);
    
    return {
      sessionId,
      connectionAttempt: attempt,
      activeCall,
      completedCall,
      qualityMetrics,
      error,
      status: activeCall ? 'active' : (completedCall ? 'completed' : (error ? 'failed' : 'unknown'))
    };
  }
  
  /**
   * Get performance trends over time
   */
  getPerformanceTrends(days = 7) {
    const trends = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayStats = this.metrics.dailyStats.get(dateKey) || {
        connectionAttempts: 0,
        connectionSuccesses: 0,
        connectionFailures: 0,
        callStarts: 0,
        callEnds: 0,
        callDrops: 0,
        securityIncidents: 0,
        paymentValidations: 0,
        validPayments: 0
      };
      
      const connectionSuccessRate = dayStats.connectionAttempts > 0 
        ? dayStats.connectionSuccesses / dayStats.connectionAttempts 
        : 0;
      
      const callDropRate = dayStats.callEnds > 0 
        ? dayStats.callDrops / dayStats.callEnds 
        : 0;
      
      const paymentValidationRate = dayStats.paymentValidations > 0
        ? dayStats.validPayments / dayStats.paymentValidations
        : 0;
      
      trends.push({
        date: dateKey,
        connectionSuccessRate,
        callDropRate,
        paymentValidationRate,
        securityIncidents: dayStats.securityIncidents,
        totalCalls: dayStats.callStarts,
        ...dayStats
      });
    }
    
    return trends;
  }
  
  /**
   * Update daily statistics
   */
  updateDailyStats(eventType, data) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.metrics.dailyStats.has(today)) {
      this.metrics.dailyStats.set(today, {
        connectionAttempts: 0,
        connectionSuccesses: 0,
        connectionFailures: 0,
        callStarts: 0,
        callEnds: 0,
        callDrops: 0,
        securityIncidents: 0,
        paymentValidations: 0,
        validPayments: 0
      });
    }
    
    const stats = this.metrics.dailyStats.get(today);
    
    switch (eventType) {
      case 'connectionSuccess':
        stats.connectionAttempts++;
        stats.connectionSuccesses++;
        break;
      case 'connectionFailure':
        stats.connectionAttempts++;
        stats.connectionFailures++;
        break;
      case 'callStart':
        stats.callStarts++;
        break;
      case 'callEnd':
        stats.callEnds++;
        break;
      case 'callDrop':
        stats.callDrops++;
        break;
      case 'securityIncident':
        stats.securityIncidents++;
        break;
      case 'paymentValidation':
        stats.paymentValidations++;
        if (data.isValid) {
          stats.validPayments++;
        }
        break;
    }
  }
  
  /**
   * Get time range cutoff for filtering
   */
  getTimeRangeCutoff(timeRange) {
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
  
  /**
   * Start periodic cleanup and aggregation tasks
   */
  startPeriodicTasks() {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour
    
    // Aggregate daily stats every 6 hours
    setInterval(() => {
      this.aggregateDailyStats();
    }, 6 * 60 * 60 * 1000); // 6 hours
  }
  
  /**
   * Clean up old data to prevent memory leaks
   */
  cleanupOldData() {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    // Clean up old connection attempts
    for (const [id, attempt] of this.metrics.connectionAttempts.entries()) {
      if (attempt.timestamp < cutoffTime) {
        this.metrics.connectionAttempts.delete(id);
      }
    }
    
    // Clean up old completed calls
    for (const [sessionId, call] of this.metrics.completedCalls.entries()) {
      if (call.timestamp < cutoffTime) {
        this.metrics.completedCalls.delete(sessionId);
      }
    }
    
    // Clean up old errors
    for (const [sessionId, error] of this.metrics.errors.entries()) {
      if (error.timestamp < cutoffTime) {
        this.metrics.errors.delete(sessionId);
      }
    }
    
    // Clean up old quality metrics
    for (const [sessionId, metrics] of this.metrics.qualityMetrics.entries()) {
      const recentMetrics = metrics.filter(m => new Date(m.timestamp) >= cutoffTime);
      if (recentMetrics.length === 0) {
        this.metrics.qualityMetrics.delete(sessionId);
      } else {
        this.metrics.qualityMetrics.set(sessionId, recentMetrics);
      }
    }
    
    console.log('📊 Cleaned up old metrics data');
  }
  
  /**
   * Aggregate daily statistics
   */
  aggregateDailyStats() {
    // Keep only last 30 days of daily stats
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffDateKey = cutoffDate.toISOString().split('T')[0];
    
    for (const [dateKey] of this.metrics.dailyStats.entries()) {
      if (dateKey < cutoffDateKey) {
        this.metrics.dailyStats.delete(dateKey);
      }
    }
    
    console.log('📊 Aggregated daily statistics');
  }
  
  /**
   * Export metrics data for external analysis
   */
  exportMetrics(format = 'json') {
    const data = {
      summary: this.getMetricsSummary(),
      trends: this.getPerformanceTrends(),
      activeCalls: Array.from(this.metrics.activeCalls.values()),
      recentErrors: Array.from(this.metrics.errors.values()).slice(-50),
      timestamp: new Date()
    };
    
    if (format === 'csv') {
      // Convert to CSV format for external analysis
      return this.convertToCSV(data);
    }
    
    return data;
  }
  
  /**
   * Convert metrics data to CSV format
   */
  convertToCSV(data) {
    const trends = data.trends;
    const headers = ['date', 'connectionSuccessRate', 'callDropRate', 'paymentValidationRate', 'securityIncidents', 'totalCalls'];
    
    let csv = headers.join(',') + '\n';
    
    trends.forEach(trend => {
      const row = headers.map(header => trend[header] || 0).join(',');
      csv += row + '\n';
    });
    
    return csv;
  }
}

// Create singleton instance
const videoCallMetricsService = new VideoCallMetricsService();

module.exports = videoCallMetricsService;