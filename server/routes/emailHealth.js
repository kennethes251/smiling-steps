/**
 * Email Health Check Routes
 * 
 * Provides endpoints for monitoring email service health
 * and testing email delivery in production.
 * 
 * @module routes/emailHealth
 */

const express = require('express');
const router = express.Router();
const productionEmailService = require('../services/productionEmailService');
const { auth, admin } = require('../middleware/auth');

/**
 * GET /api/email/health
 * Get email service health status
 * Admin only
 */
router.get('/health', auth, admin, async (req, res) => {
  try {
    const health = await productionEmailService.getHealthStatus();
    
    const statusCode = health.initialized && health.connectionStatus !== 'error' ? 200 : 503;
    
    res.status(statusCode).json({
      success: statusCode === 200,
      service: 'email',
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'email',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/email/test
 * Send a test email
 * Admin only
 */
router.post('/test', auth, admin, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address is required'
      });
    }

    const result = await productionEmailService.sendEmail({
      to,
      subject: subject || 'Test Email from Smiling Steps',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #663399;">🧪 Test Email</h2>
          <p>${message || 'This is a test email from Smiling Steps to verify email delivery is working correctly.'}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}<br>
            Sent by: ${req.user.email}
          </p>
        </div>
      `,
      text: message || 'This is a test email from Smiling Steps to verify email delivery is working correctly.'
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      accepted: result.accepted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

/**
 * GET /api/email/stats
 * Get email sending statistics
 * Admin only
 */
router.get('/stats', auth, admin, async (req, res) => {
  try {
    const health = await productionEmailService.getHealthStatus();
    
    res.json({
      success: true,
      stats: health.stats,
      rateLimit: health.rateLimit,
      provider: health.provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/stats/reset
 * Reset email statistics
 * Admin only
 */
router.post('/stats/reset', auth, admin, async (req, res) => {
  try {
    productionEmailService.resetStats();
    
    res.json({
      success: true,
      message: 'Email statistics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
