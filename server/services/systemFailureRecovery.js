/**
 * System Failure Recovery Service
 * 
 * Implements recovery mechanisms for system-level failures:
 * - Operation queuing for database failures
 * - Email service failure detection and queuing
 * - Exponential backoff retry logic
 * - Comprehensive failure alerting system
 * 
 * Requirements: Network/System Failures from Flow Integrity Contract
 */

const EventEmitter = require('events');

const SYSTEM_RECOVERY_CONFIG = {
  MAX_RETRY_ATTEMPTS: 5,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
  QUEUE_PERSISTENCE_INTERVAL_MS: 30000,
  EMAIL_RETRY_INTERVAL_MS: 15 * 60 * 1000,
  EMAIL_MAX_RETRY_HOURS: 24,
  ALERT_THRESHOLD_CONSECUTIVE_FAILURES: 3,
  DB_HEALTH_CHECK_INTERVAL_MS: 30000
};

class OperationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.failedOperations = [];
  }

  enqueue(operation) {
    const queuedOp = { id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, operation, enqueuedAt: new Date(), attempts: 0, status: 'pending' };
    this.queue.push(queuedOp);
    console.log(`📥 Operation queued: ${queuedOp.id}`);
    return queuedOp.id;
  }

  async processQueue(executor) {
    if (this.processing || this.queue.length === 0) return { processed: 0, failed: 0 };
    this.processing = true;
    const results = { processed: 0, failed: 0 };
    
    while (this.queue.length > 0) {
      const op = this.queue[0];
      try {
        await executor(op.operation);
        this.queue.shift();
        op.status = 'completed';
        op.completedAt = new Date();
        results.processed++;
        console.log(`✅ Operation completed: ${op.id}`);
      } catch (error) {
        op.attempts++;
        op.lastError = error.message;
        if (op.attempts >= SYSTEM_RECOVERY_CONFIG.MAX_RETRY_ATTEMPTS) {
          this.queue.shift();
          op.status = 'failed';
          this.failedOperations.push(op);
          results.failed++;
          console.error(`❌ Operation failed permanently: ${op.id}`);
        } else {
          break;
        }
      }
    }
    this.processing = false;
    return results;
  }

  getStatus() {
    return { pending: this.queue.length, failed: this.failedOperations.length, oldestPending: this.queue[0]?.enqueuedAt };
  }
}


class RetryHandler {
  static calculateDelay(attempt) {
    const delay = SYSTEM_RECOVERY_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(SYSTEM_RECOVERY_CONFIG.BACKOFF_MULTIPLIER, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, SYSTEM_RECOVERY_CONFIG.MAX_RETRY_DELAY_MS);
  }

  static async withRetry(operation, options = {}) {
    const { maxAttempts = SYSTEM_RECOVERY_CONFIG.MAX_RETRY_ATTEMPTS, onRetry, operationName = 'operation' } = options;
    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts - 1) {
          const delay = this.calculateDelay(attempt);
          console.log(`🔄 Retrying ${operationName} (attempt ${attempt + 2}/${maxAttempts}) in ${delay}ms`);
          if (onRetry) onRetry(attempt + 1, error, delay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}

class SystemFailureRecoveryService extends EventEmitter {
  constructor() {
    super();
    this.dbOperationQueue = new OperationQueue();
    this.emailQueue = new OperationQueue();
    this.consecutiveDbFailures = 0;
    this.consecutiveEmailFailures = 0;
    this.isDbHealthy = true;
    this.isEmailServiceHealthy = true;
    this.alertsSent = new Set();
  }

  async executeWithDbFailover(operation, operationName = 'database operation') {
    try {
      const result = await RetryHandler.withRetry(operation, { operationName, onRetry: (attempt, error) => {
        this.consecutiveDbFailures++;
        this.emit('db:retry', { attempt, error: error.message, operationName });
        if (this.consecutiveDbFailures >= SYSTEM_RECOVERY_CONFIG.ALERT_THRESHOLD_CONSECUTIVE_FAILURES) {
          this.sendAlert('database', `Database experiencing issues: ${this.consecutiveDbFailures} consecutive failures`);
        }
      }});
      this.consecutiveDbFailures = 0;
      this.isDbHealthy = true;
      return result;
    } catch (error) {
      this.isDbHealthy = false;
      const opId = this.dbOperationQueue.enqueue({ type: 'db', name: operationName, operation: operation.toString(), timestamp: new Date() });
      this.emit('db:queued', { operationId: opId, operationName, error: error.message });
      throw new Error(`Database operation queued for retry: ${opId}`);
    }
  }


  async queueEmail(emailData) {
    const opId = this.emailQueue.enqueue({ type: 'email', data: emailData, timestamp: new Date() });
    this.emit('email:queued', { operationId: opId, to: emailData.to, subject: emailData.subject });
    console.log(`📧 Email queued: ${opId} to ${emailData.to}`);
    return { queued: true, operationId: opId, message: 'Email queued for delivery' };
  }

  async processEmailQueue(emailSender) {
    const results = await this.emailQueue.processQueue(async (op) => {
      await emailSender(op.data);
      this.consecutiveEmailFailures = 0;
      this.isEmailServiceHealthy = true;
    });
    
    if (results.failed > 0) {
      this.consecutiveEmailFailures += results.failed;
      if (this.consecutiveEmailFailures >= SYSTEM_RECOVERY_CONFIG.ALERT_THRESHOLD_CONSECUTIVE_FAILURES) {
        this.sendAlert('email', `Email service experiencing issues: ${results.failed} emails failed`);
      }
    }
    return results;
  }

  sendAlert(service, message) {
    const alertKey = `${service}:${Date.now().toString().slice(0, -5)}`;
    if (this.alertsSent.has(alertKey)) return;
    
    this.alertsSent.add(alertKey);
    this.emit('alert', { service, message, timestamp: new Date(), severity: 'high' });
    console.error(`🚨 ALERT [${service}]: ${message}`);
    
    setTimeout(() => this.alertsSent.delete(alertKey), 300000);
  }

  async checkDatabaseHealth(dbConnection) {
    try {
      if (dbConnection?.readyState === 1) {
        this.isDbHealthy = true;
        this.consecutiveDbFailures = 0;
        return { healthy: true, status: 'connected' };
      }
      this.isDbHealthy = false;
      return { healthy: false, status: 'disconnected' };
    } catch (error) {
      this.isDbHealthy = false;
      return { healthy: false, status: 'error', error: error.message };
    }
  }

  async checkEmailServiceHealth(emailService) {
    try {
      if (emailService?.verify) {
        await emailService.verify();
        this.isEmailServiceHealthy = true;
        return { healthy: true, status: 'connected' };
      }
      return { healthy: true, status: 'unknown' };
    } catch (error) {
      this.isEmailServiceHealthy = false;
      return { healthy: false, status: 'error', error: error.message };
    }
  }

  getSystemStatus() {
    return {
      database: { healthy: this.isDbHealthy, consecutiveFailures: this.consecutiveDbFailures, queuedOperations: this.dbOperationQueue.getStatus() },
      email: { healthy: this.isEmailServiceHealthy, consecutiveFailures: this.consecutiveEmailFailures, queuedEmails: this.emailQueue.getStatus() },
      timestamp: new Date()
    };
  }
}

const systemFailureRecoveryService = new SystemFailureRecoveryService();
module.exports = { SystemFailureRecoveryService, systemFailureRecoveryService, RetryHandler, OperationQueue, SYSTEM_RECOVERY_CONFIG };
