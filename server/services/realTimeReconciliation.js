/**
 * Real-Time Payment Reconciliation Service
 * Provides immediate reconciliation on payment events and WebSocket updates
 */

const EventEmitter = require('events');
const { reconcileSession, ReconciliationStatus } = require('../utils/paymentReconciliation');
const auditLogger = require('../utils/auditLogger');

class RealTimeReconciliationService extends EventEmitter {
  constructor() {
    super();
    this.activeReconciliations = new Map();
    this.reconciliationQueue = [];
    this.isProcessing = false;
    this.websocketClients = new Set();
    
    // Statistics tracking
    this.stats = {
      totalProcessed: 0,
      successfulReconciliations: 0,
      failedReconciliations: 0,
      discrepanciesDetected: 0,
      averageProcessingTime: 0,
      lastProcessedAt: null
    };

    console.log('🔄 Real-Time Reconciliation Service initialized');
  }

  /**
   * Register WebSocket client for real-time updates
   */
  registerWebSocketClient(ws, adminId) {
    const client = {
      ws,
      adminId,
      connectedAt: new Date(),
      id: Math.random().toString(36).substr(2, 9)
    };

    this.websocketClients.add(client);
    
    console.log(`📡 WebSocket client registered: ${client.id} (Admin: ${adminId})`);

    // Send current stats to new client
    this.sendToClient(client, {
      type: 'reconciliation_stats',
      data: this.getStats()
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.websocketClients.delete(client);
      console.log(`📡 WebSocket client disconnected: ${client.id}`);
    });

    return client.id;
  }

  /**
   * Send message to specific WebSocket client
   */
  sendToClient(client, message) {
    try {
      if (client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('❌ Failed to send WebSocket message:', error);
      this.websocketClients.delete(client);
    }
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  broadcast(message) {
    const connectedClients = Array.from(this.websocketClients).filter(
      client => client.ws.readyState === 1
    );

    connectedClients.forEach(client => {
      this.sendToClient(client, message);
    });

    // Clean up disconnected clients
    this.websocketClients = new Set(connectedClients);
  }

  /**
   * Trigger real-time reconciliation for a session
   */
  async reconcileSessionRealTime(sessionId, trigger = 'manual') {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting real-time reconciliation for session: ${sessionId} (trigger: ${trigger})`);

      // Check if already processing this session
      if (this.activeReconciliations.has(sessionId)) {
        console.log(`⚠️ Reconciliation already in progress for session: ${sessionId}`);
        return this.activeReconciliations.get(sessionId);
      }

      // Mark as processing
      const reconciliationPromise = this._performSessionReconciliation(sessionId, trigger, startTime);
      this.activeReconciliations.set(sessionId, reconciliationPromise);

      const result = await reconciliationPromise;

      // Clean up
      this.activeReconciliations.delete(sessionId);

      return result;

    } catch (error) {
      console.error(`❌ Real-time reconciliation failed for session ${sessionId}:`, error);
      this.activeReconciliations.delete(sessionId);
      
      // Update stats
      this.stats.failedReconciliations++;
      this.updateStats();

      throw error;
    }
  }

  /**
   * Internal method to perform session reconciliation
   */
  async _performSessionReconciliation(sessionId, trigger, startTime) {
    const Session = require('../models/Session');

    // Fetch session with populated data
    const session = await Session.findById(sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Perform reconciliation
    const reconciliationResult = await reconcileSession(session);
    const processingTime = Date.now() - startTime;

    // Update statistics
    this.stats.totalProcessed++;
    this.stats.lastProcessedAt = new Date();
    
    if (reconciliationResult.status === ReconciliationStatus.MATCHED) {
      this.stats.successfulReconciliations++;
    } else if (reconciliationResult.status === ReconciliationStatus.DISCREPANCY) {
      this.stats.discrepanciesDetected++;
    }

    // Update average processing time
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime) / 
      this.stats.totalProcessed;

    // Create enriched result
    const enrichedResult = {
      ...reconciliationResult,
      sessionDetails: {
        id: session._id,
        client: session.client?.name,
        psychologist: session.psychologist?.name,
        amount: session.price,
        paymentStatus: session.paymentStatus,
        sessionStatus: session.status,
        transactionId: session.mpesaTransactionID
      },
      reconciliationMetadata: {
        trigger,
        processingTime,
        timestamp: new Date(),
        realTime: true
      }
    };

    // Log reconciliation for audit trail
    auditLogger.logReconciliation({
      sessionId: sessionId,
      action: 'Real-time reconciliation',
      trigger,
      status: reconciliationResult.status,
      processingTime,
      issues: reconciliationResult.issues?.length || 0
    });

    // Broadcast to WebSocket clients
    this.broadcast({
      type: 'reconciliation_result',
      data: enrichedResult
    });

    // Emit event for other services
    this.emit('reconciliation_completed', enrichedResult);

    // Handle discrepancies
    if (reconciliationResult.status === ReconciliationStatus.DISCREPANCY) {
      await this._handleDiscrepancy(enrichedResult);
    }

    console.log(`✅ Real-time reconciliation completed for session ${sessionId}: ${reconciliationResult.status} (${processingTime}ms)`);

    return enrichedResult;
  }

  /**
   * Handle discrepancies detected during reconciliation
   */
  async _handleDiscrepancy(reconciliationResult) {
    try {
      console.log(`⚠️ Discrepancy detected for session ${reconciliationResult.sessionId}`);

      // Send immediate alert to connected admins
      this.broadcast({
        type: 'discrepancy_alert',
        data: {
          sessionId: reconciliationResult.sessionId,
          issues: reconciliationResult.issues,
          sessionDetails: reconciliationResult.sessionDetails,
          timestamp: new Date(),
          severity: this._calculateDiscrepancySeverity(reconciliationResult.issues)
        }
      });

      // Send email/SMS alerts for high-severity discrepancies
      const severity = this._calculateDiscrepancySeverity(reconciliationResult.issues);
      if (severity === 'high') {
        const notificationService = require('../utils/notificationService');
        
        // Send email alert
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
          await notificationService.sendRealTimeDiscrepancyAlert(reconciliationResult, adminEmail);
        }

        // Send SMS alert
        const adminPhone = process.env.ADMIN_PHONE;
        if (adminPhone) {
          await notificationService.sendRealTimeDiscrepancySMS(reconciliationResult, adminPhone);
        }
      }

      // Log discrepancy for audit trail
      auditLogger.logPaymentDiscrepancy({
        sessionId: reconciliationResult.sessionId,
        issues: reconciliationResult.issues,
        severity,
        detectedAt: new Date(),
        realTime: true
      });

    } catch (error) {
      console.error('❌ Failed to handle discrepancy:', error);
    }
  }

  /**
   * Calculate discrepancy severity based on issues
   */
  _calculateDiscrepancySeverity(issues) {
    if (!issues || issues.length === 0) return 'low';

    const highSeverityTypes = ['duplicate_transaction', 'amount_mismatch'];
    const mediumSeverityTypes = ['status_mismatch', 'result_code_mismatch'];

    const hasHighSeverity = issues.some(issue => 
      highSeverityTypes.includes(issue.type)
    );
    
    const hasMediumSeverity = issues.some(issue => 
      mediumSeverityTypes.includes(issue.type)
    );

    if (hasHighSeverity) return 'high';
    if (hasMediumSeverity) return 'medium';
    return 'low';
  }

  /**
   * Process reconciliation queue
   */
  async processQueue() {
    if (this.isProcessing || this.reconciliationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.reconciliationQueue.length > 0) {
        const { sessionId, trigger } = this.reconciliationQueue.shift();
        
        try {
          await this.reconcileSessionRealTime(sessionId, trigger);
        } catch (error) {
          console.error(`❌ Queue processing failed for session ${sessionId}:`, error);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Queue session for reconciliation
   */
  queueReconciliation(sessionId, trigger = 'queued') {
    // Avoid duplicates in queue
    const exists = this.reconciliationQueue.some(item => item.sessionId === sessionId);
    if (!exists && !this.activeReconciliations.has(sessionId)) {
      this.reconciliationQueue.push({ sessionId, trigger });
      console.log(`📋 Queued reconciliation for session: ${sessionId} (trigger: ${trigger})`);
      
      // Process queue asynchronously
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Trigger reconciliation on payment callback
   */
  async onPaymentCallback(sessionId, callbackData) {
    try {
      console.log(`🔔 Payment callback received for session: ${sessionId}`);
      
      // Wait a moment for callback processing to complete
      setTimeout(async () => {
        try {
          await this.reconcileSessionRealTime(sessionId, 'payment_callback');
        } catch (error) {
          console.error(`❌ Callback reconciliation failed for session ${sessionId}:`, error);
        }
      }, 2000); // 2 second delay

    } catch (error) {
      console.error('❌ Failed to handle payment callback reconciliation:', error);
    }
  }

  /**
   * Trigger reconciliation on payment initiation
   */
  async onPaymentInitiation(sessionId) {
    try {
      console.log(`🚀 Payment initiated for session: ${sessionId}`);
      
      // Queue for reconciliation to verify initial state
      this.queueReconciliation(sessionId, 'payment_initiation');

    } catch (error) {
      console.error('❌ Failed to handle payment initiation reconciliation:', error);
    }
  }

  /**
   * Trigger reconciliation on status query
   */
  async onStatusQuery(sessionId) {
    try {
      console.log(`🔍 Status query for session: ${sessionId}`);
      
      // Queue for reconciliation after status query
      this.queueReconciliation(sessionId, 'status_query');

    } catch (error) {
      console.error('❌ Failed to handle status query reconciliation:', error);
    }
  }

  /**
   * Get current reconciliation statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeReconciliations: this.activeReconciliations.size,
      queueLength: this.reconciliationQueue.length,
      connectedClients: this.websocketClients.size,
      uptime: process.uptime()
    };
  }

  /**
   * Update and broadcast statistics
   */
  updateStats() {
    const stats = this.getStats();
    
    this.broadcast({
      type: 'reconciliation_stats',
      data: stats
    });
  }

  /**
   * Perform bulk real-time reconciliation for multiple sessions
   */
  async reconcileMultipleSessions(sessionIds, trigger = 'bulk') {
    console.log(`🔄 Starting bulk real-time reconciliation for ${sessionIds.length} sessions`);

    const results = [];
    const batchSize = 5; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < sessionIds.length; i += batchSize) {
      const batch = sessionIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(sessionId => 
        this.reconcileSessionRealTime(sessionId, trigger).catch(error => ({
          sessionId,
          error: error.message,
          status: 'error'
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < sessionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Bulk reconciliation completed: ${results.length} sessions processed`);

    // Broadcast bulk completion
    this.broadcast({
      type: 'bulk_reconciliation_completed',
      data: {
        totalSessions: sessionIds.length,
        results: results.length,
        trigger,
        timestamp: new Date()
      }
    });

    return results;
  }

  /**
   * Start periodic reconciliation checks
   */
  startPeriodicChecks(intervalMinutes = 15) {
    console.log(`⏰ Starting periodic reconciliation checks every ${intervalMinutes} minutes`);

    const interval = setInterval(async () => {
      try {
        console.log('🔄 Running periodic reconciliation check...');
        
        // Find sessions that might need reconciliation
        const Session = require('../models/Session');
        const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

        const sessionsToCheck = await Session.find({
          paymentStatus: 'Processing',
          paymentInitiatedAt: { $lt: cutoffTime }
        }).limit(10);

        if (sessionsToCheck.length > 0) {
          console.log(`🔍 Found ${sessionsToCheck.length} sessions for periodic reconciliation`);
          
          const sessionIds = sessionsToCheck.map(s => s._id.toString());
          await this.reconcileMultipleSessions(sessionIds, 'periodic_check');
        }

      } catch (error) {
        console.error('❌ Periodic reconciliation check failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    return interval;
  }

  /**
   * Stop the service and clean up resources
   */
  stop() {
    console.log('🛑 Stopping Real-Time Reconciliation Service...');
    
    // Close all WebSocket connections
    this.websocketClients.forEach(client => {
      try {
        client.ws.close();
      } catch (error) {
        // Ignore close errors
      }
    });
    
    this.websocketClients.clear();
    this.activeReconciliations.clear();
    this.reconciliationQueue.length = 0;
    
    console.log('✅ Real-Time Reconciliation Service stopped');
  }
}

// Create singleton instance
const realTimeReconciliationService = new RealTimeReconciliationService();

module.exports = realTimeReconciliationService;