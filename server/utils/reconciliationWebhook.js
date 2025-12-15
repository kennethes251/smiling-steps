/**
 * Reconciliation Webhook Utility
 * 
 * Provides webhook notification functionality for reconciliation completion events.
 * Allows external systems to be notified when reconciliation processes finish.
 */

const crypto = require('crypto');
const axios = require('axios');

class ReconciliationWebhook {
  constructor() {
    // Load webhook configuration from environment
    this.webhookUrls = this.parseWebhookUrls();
    this.webhookSecret = process.env.RECONCILIATION_WEBHOOK_SECRET || process.env.MPESA_WEBHOOK_SECRET;
    this.retryAttempts = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.WEBHOOK_RETRY_DELAY) || 1000; // 1 second
    
    if (this.webhookUrls.length === 0) {
      console.log('ℹ️ No reconciliation webhook URLs configured');
    } else {
      console.log(`✅ Reconciliation webhooks configured for ${this.webhookUrls.length} endpoint(s)`);
    }
  }

  /**
   * Parse webhook URLs from environment variable
   * Supports multiple URLs separated by commas
   */
  parseWebhookUrls() {
    const urlsString = process.env.RECONCILIATION_WEBHOOK_URLS || '';
    
    if (!urlsString.trim()) {
      return [];
    }
    
    return urlsString
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .filter(url => {
        try {
          new URL(url);
          return true;
        } catch (error) {
          console.warn(`⚠️ Invalid webhook URL: ${url}`);
          return false;
        }
      });
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  generateSignature(payload) {
    if (!this.webhookSecret) {
      return null;
    }

    const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(canonicalPayload);
    
    return hmac.digest('hex');
  }

  /**
   * Send webhook notification to a single URL
   */
  async sendWebhookToUrl(url, payload, attempt = 1) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Smiling-Steps-Reconciliation-Webhook/1.0',
        'X-Webhook-Event': 'reconciliation.completed',
        'X-Webhook-Timestamp': new Date().toISOString(),
        'X-Webhook-Attempt': attempt.toString()
      };

      // Add signature if secret is configured
      const signature = this.generateSignature(payload);
      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      console.log(`📤 Sending reconciliation webhook to ${url} (attempt ${attempt})`);

      const response = await axios.post(url, payload, {
        headers,
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      console.log(`✅ Webhook delivered successfully to ${url}:`, response.status);
      
      return {
        success: true,
        url,
        status: response.status,
        attempt,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Webhook delivery failed to ${url} (attempt ${attempt}):`, error.message);
      
      // Retry logic with exponential backoff
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 Retrying webhook to ${url} in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWebhookToUrl(url, payload, attempt + 1);
      }

      return {
        success: false,
        url,
        error: error.message,
        attempt,
        timestamp: new Date()
      };
    }
  }

  /**
   * Send webhook notifications to all configured URLs
   */
  async sendReconciliationCompletedWebhook(reconciliationData) {
    if (this.webhookUrls.length === 0) {
      console.log('ℹ️ No webhook URLs configured - skipping webhook notifications');
      return { sent: false, reason: 'No URLs configured' };
    }

    // Prepare webhook payload
    const payload = {
      event: 'reconciliation.completed',
      timestamp: new Date().toISOString(),
      data: {
        summary: reconciliationData.summary,
        reconciliationId: crypto.randomUUID(),
        dateRange: reconciliationData.summary?.dateRange,
        statistics: {
          totalTransactions: reconciliationData.summary?.totalTransactions || 0,
          matched: reconciliationData.summary?.matched || 0,
          unmatched: reconciliationData.summary?.unmatched || 0,
          discrepancies: reconciliationData.summary?.discrepancies || 0,
          pendingVerification: reconciliationData.summary?.pendingVerification || 0,
          errors: reconciliationData.summary?.errors || 0,
          totalAmount: reconciliationData.summary?.totalAmount || 0
        },
        hasIssues: (reconciliationData.summary?.discrepancies || 0) > 0 || 
                   (reconciliationData.summary?.unmatched || 0) > 0 ||
                   (reconciliationData.summary?.errors || 0) > 0,
        issuesSummary: this.generateIssuesSummary(reconciliationData)
      },
      metadata: {
        source: 'smiling-steps-reconciliation',
        version: '1.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    console.log(`📡 Sending reconciliation webhook to ${this.webhookUrls.length} endpoint(s)`);

    // Send to all URLs in parallel
    const results = await Promise.all(
      this.webhookUrls.map(url => this.sendWebhookToUrl(url, payload))
    );

    // Aggregate results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`📊 Webhook delivery summary: ${successful.length} successful, ${failed.length} failed`);

    return {
      sent: true,
      successful: successful.length,
      failed: failed.length,
      results,
      payload
    };
  }

  /**
   * Generate a summary of issues found during reconciliation
   */
  generateIssuesSummary(reconciliationData) {
    const issues = [];
    const summary = reconciliationData.summary || {};

    if (summary.discrepancies > 0) {
      issues.push(`${summary.discrepancies} transaction(s) with discrepancies`);
    }

    if (summary.unmatched > 0) {
      issues.push(`${summary.unmatched} unmatched transaction(s)`);
    }

    if (summary.errors > 0) {
      issues.push(`${summary.errors} error(s) during reconciliation`);
    }

    if (summary.pendingVerification > 0) {
      issues.push(`${summary.pendingVerification} transaction(s) pending verification`);
    }

    return issues;
  }

  /**
   * Send webhook for daily reconciliation completion
   */
  async sendDailyReconciliationWebhook(reconciliationData) {
    const payload = {
      event: 'reconciliation.daily_completed',
      timestamp: new Date().toISOString(),
      data: {
        ...reconciliationData,
        reconciliationType: 'daily_automatic',
        scheduledTime: '23:00 EAT'
      }
    };

    return this.sendReconciliationCompletedWebhook({ summary: reconciliationData.summary });
  }

  /**
   * Send webhook for manual reconciliation completion
   */
  async sendManualReconciliationWebhook(reconciliationData, adminId) {
    const payload = {
      event: 'reconciliation.manual_completed',
      timestamp: new Date().toISOString(),
      data: {
        ...reconciliationData,
        reconciliationType: 'manual',
        triggeredBy: adminId
      }
    };

    return this.sendReconciliationCompletedWebhook({ summary: reconciliationData.summary });
  }

  /**
   * Test webhook connectivity
   */
  async testWebhookConnectivity() {
    if (this.webhookUrls.length === 0) {
      return { success: false, message: 'No webhook URLs configured' };
    }

    const testPayload = {
      event: 'reconciliation.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Smiling Steps reconciliation system',
        testId: crypto.randomUUID()
      }
    };

    console.log('🧪 Testing webhook connectivity...');

    const results = await Promise.all(
      this.webhookUrls.map(url => this.sendWebhookToUrl(url, testPayload))
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: failed.length === 0,
      message: `${successful.length}/${this.webhookUrls.length} webhooks successful`,
      results
    };
  }
}

module.exports = new ReconciliationWebhook();