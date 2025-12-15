const crypto = require('crypto');

/**
 * Webhook Signature Verification Utility
 * 
 * Provides signature generation and verification for M-Pesa webhook callbacks
 * to ensure callbacks are authentic and from Safaricom.
 */

class WebhookSignature {
  constructor() {
    // Load webhook secret from environment
    this.webhookSecret = process.env.MPESA_WEBHOOK_SECRET || process.env.MPESA_CONSUMER_SECRET;
    
    if (!this.webhookSecret) {
      console.warn('⚠️ MPESA_WEBHOOK_SECRET not set. Webhook signature verification disabled.');
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * @param {Object} payload - The webhook payload object
   * @returns {string} - The generated signature
   */
  generateSignature(payload) {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Convert payload to canonical JSON string (sorted keys)
    const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
    
    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(canonicalPayload);
    
    return hmac.digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - The webhook payload object
   * @param {string} receivedSignature - The signature from the webhook header
   * @returns {boolean} - True if signature is valid, false otherwise
   */
  verifySignature(payload, receivedSignature) {
    if (!this.webhookSecret) {
      console.warn('⚠️ Webhook signature verification skipped - no secret configured');
      return true; // Allow in development/sandbox without secret
    }

    if (!receivedSignature) {
      console.error('❌ No signature provided in webhook request');
      return false;
    }

    try {
      // Generate expected signature
      const expectedSignature = this.generateSignature(payload);
      
      // Use timing-safe comparison to prevent timing attacks
      const receivedBuffer = Buffer.from(receivedSignature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      // Ensure both buffers are same length
      if (receivedBuffer.length !== expectedBuffer.length) {
        console.error('❌ Signature length mismatch');
        return false;
      }
      
      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
      
      if (!isValid) {
        console.error('❌ Webhook signature verification failed');
        console.error('Expected:', expectedSignature);
        console.error('Received:', receivedSignature);
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error.message);
      return false;
    }
  }

  /**
   * Verify webhook signature from Express request
   * @param {Object} req - Express request object
   * @returns {boolean} - True if signature is valid, false otherwise
   */
  verifyRequest(req) {
    // Get signature from header (common header names)
    const signature = req.header('X-Signature') || 
                     req.header('X-Mpesa-Signature') ||
                     req.header('X-Webhook-Signature');
    
    if (!signature && this.webhookSecret) {
      console.error('❌ No signature header found in webhook request');
      return false;
    }
    
    // Verify signature against request body
    return this.verifySignature(req.body, signature);
  }

  /**
   * Express middleware for webhook signature verification
   * @returns {Function} - Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      // Skip verification in development if no secret is set
      if (!this.webhookSecret && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Webhook signature verification skipped in development');
        return next();
      }

      // Verify signature
      const isValid = this.verifyRequest(req);
      
      if (!isValid) {
        console.error('❌ Webhook signature verification failed - rejecting request');
        return res.status(401).json({ 
          ResultCode: 1, 
          ResultDesc: 'Invalid signature' 
        });
      }
      
      console.log('✅ Webhook signature verified');
      next();
    };
  }
}

module.exports = new WebhookSignature();
