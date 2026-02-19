/**
 * Production Email Service
 * 
 * Provides reliable email delivery with:
 * - Automatic retry with exponential backoff
 * - Health monitoring and status reporting
 * - Rate limiting
 * - Delivery logging
 * - Multiple provider support
 * 
 * @module services/productionEmailService
 */

const emailConfig = require('../config/emailConfig');

// Use Winston logger if available, otherwise use console
let logger;
try {
  const loggerModule = require('../utils/logger');
  logger = loggerModule.logger || loggerModule;
} catch (error) {
  // Fallback to console-based logger
  logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
    debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta || '')
  };
}

class ProductionEmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.stats = {
      sent: 0,
      failed: 0,
      retried: 0,
      lastSent: null,
      lastError: null
    };
    this.rateLimitCounter = {
      minute: { count: 0, resetAt: Date.now() + 60000 },
      hour: { count: 0, resetAt: Date.now() + 3600000 }
    };
  }

  /**
   * Initialize the email service
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    try {
      this.transporter = emailConfig.createTransporter();
      const verification = await emailConfig.verifyTransporter(this.transporter);
      
      if (verification.success) {
        this.isInitialized = true;
        logger.info('📧 Email service initialized successfully', {
          provider: verification.provider
        });
      } else {
        logger.warn('⚠️ Email service initialized with warnings', {
          provider: verification.provider,
          message: verification.message
        });
        // Still mark as initialized - may work for sending
        this.isInitialized = true;
      }
      
      return verification;
    } catch (error) {
      logger.error('❌ Failed to initialize email service', { error: error.message });
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Check if rate limit allows sending
   * @returns {boolean} Whether sending is allowed
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Reset counters if needed
    if (now > this.rateLimitCounter.minute.resetAt) {
      this.rateLimitCounter.minute = { count: 0, resetAt: now + 60000 };
    }
    if (now > this.rateLimitCounter.hour.resetAt) {
      this.rateLimitCounter.hour = { count: 0, resetAt: now + 3600000 };
    }
    
    // Check limits
    if (this.rateLimitCounter.minute.count >= emailConfig.rateLimit.maxPerMinute) {
      return false;
    }
    if (this.rateLimitCounter.hour.count >= emailConfig.rateLimit.maxPerHour) {
      return false;
    }
    
    return true;
  }

  /**
   * Increment rate limit counters
   */
  incrementRateLimit() {
    this.rateLimitCounter.minute.count++;
    this.rateLimitCounter.hour.count++;
  }


  /**
   * Send email with retry logic
   * @param {Object} mailOptions - Nodemailer mail options
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(mailOptions, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      const error = new Error('Email rate limit exceeded');
      error.code = 'RATE_LIMIT_EXCEEDED';
      this.stats.failed++;
      this.stats.lastError = { message: error.message, timestamp: new Date() };
      throw error;
    }

    // Set default sender if not provided
    if (!mailOptions.from) {
      mailOptions.from = emailConfig.getDefaultSender();
    }

    const maxAttempts = options.maxAttempts || emailConfig.retry.maxAttempts;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        
        // Success
        this.stats.sent++;
        this.stats.lastSent = new Date();
        this.incrementRateLimit();
        
        logger.info('📧 Email sent successfully', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          messageId: result.messageId,
          attempt
        });
        
        return {
          success: true,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
          attempt
        };
      } catch (error) {
        lastError = error;
        this.stats.retried++;
        
        logger.warn(`⚠️ Email send attempt ${attempt}/${maxAttempts} failed`, {
          to: mailOptions.to,
          subject: mailOptions.subject,
          error: error.message
        });
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < maxAttempts) {
          const delay = Math.min(
            emailConfig.retry.initialDelay * Math.pow(emailConfig.retry.backoffMultiplier, attempt - 1),
            emailConfig.retry.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    this.stats.failed++;
    this.stats.lastError = { 
      message: lastError.message, 
      timestamp: new Date(),
      to: mailOptions.to
    };
    
    logger.error('❌ Email send failed after all retries', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      error: lastError.message,
      attempts: maxAttempts
    });
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - The error to check
   * @returns {boolean} Whether error is non-retryable
   */
  isNonRetryableError(error) {
    const nonRetryableCodes = [
      'EAUTH',           // Authentication failed
      'EENVELOPE',       // Invalid envelope
      'EMESSAGE',        // Invalid message
      'ENOTFOUND',       // DNS lookup failed
      'INVALID_LOGIN'    // Invalid credentials
    ];
    
    return nonRetryableCodes.some(code => 
      error.code === code || error.message?.includes(code)
    );
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send verification email
   * @param {Object} user - User object with email and name
   * @param {string} verificationUrl - Verification URL
   * @returns {Promise<Object>} Send result
   */
  async sendVerificationEmail(user, verificationUrl) {
    const mailOptions = {
      to: user.email,
      subject: 'Verify Your Email - Smiling Steps',
      html: this.getVerificationEmailTemplate(user.name, verificationUrl),
      text: this.getVerificationEmailText(user.name, verificationUrl)
    };
    
    return this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetUrl - Password reset URL
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(user, resetUrl) {
    const mailOptions = {
      to: user.email,
      subject: 'Reset Your Password - Smiling Steps',
      html: this.getPasswordResetTemplate(user.name, resetUrl),
      text: this.getPasswordResetText(user.name, resetUrl)
    };
    
    return this.sendEmail(mailOptions);
  }

  /**
   * Send therapist approval notification
   * @param {Object} therapist - Therapist user object
   * @param {string} status - Approval status (approved/rejected)
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Send result
   */
  async sendApprovalNotification(therapist, status, notes = '') {
    const isApproved = status === 'approved';
    const mailOptions = {
      to: therapist.email,
      subject: isApproved 
        ? '🎉 Your Application Has Been Approved - Smiling Steps'
        : 'Application Status Update - Smiling Steps',
      html: this.getApprovalNotificationTemplate(therapist.name, isApproved, notes),
      text: this.getApprovalNotificationText(therapist.name, isApproved, notes)
    };
    
    return this.sendEmail(mailOptions);
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const status = {
      initialized: this.isInitialized,
      provider: emailConfig.getProvider(),
      stats: { ...this.stats },
      rateLimit: {
        minuteRemaining: emailConfig.rateLimit.maxPerMinute - this.rateLimitCounter.minute.count,
        hourRemaining: emailConfig.rateLimit.maxPerHour - this.rateLimitCounter.hour.count
      }
    };

    // Test connection if initialized
    if (this.isInitialized && this.transporter.verify) {
      try {
        await this.transporter.verify();
        status.connectionStatus = 'connected';
      } catch (error) {
        status.connectionStatus = 'error';
        status.connectionError = error.message;
      }
    }

    return status;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      sent: 0,
      failed: 0,
      retried: 0,
      lastSent: null,
      lastError: null
    };
  }


  // ============================================
  // Email Templates
  // ============================================

  getVerificationEmailTemplate(userName, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Smiling Steps</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #663399 0%, #8B5CF6 100%); border-radius: 10px 10px 0 0; }
            .logo { color: white; font-size: 28px; font-weight: bold; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; }
            .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #663399 0%, #8B5CF6 100%);
                color: white !important; 
                padding: 15px 40px; 
                text-decoration: none; 
                border-radius: 8px; 
                margin: 25px 0;
                font-weight: bold;
                font-size: 16px;
            }
            .button:hover { opacity: 0.9; }
            .footer { margin-top: 30px; padding: 20px; font-size: 13px; color: #666; text-align: center; background: #f8f9fa; border-radius: 0 0 10px 10px; }
            .link { color: #663399; word-break: break-all; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌟 Smiling Steps</div>
                <p style="color: white; margin: 10px 0 0 0;">Your Mental Health Journey Starts Here</p>
            </div>
            
            <div class="content">
                <h2 style="color: #663399;">Welcome, ${userName}!</h2>
                
                <p>Thank you for joining Smiling Steps. We're excited to have you as part of our community dedicated to mental health and wellness.</p>
                
                <p>To complete your account setup and start your journey with us, please verify your email address:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p class="link">${verificationUrl}</p>
                
                <div class="warning">
                    <strong>⏰ Important:</strong> This verification link will expire in 24 hours for security reasons.
                </div>
                
                <p>If you didn't create an account with Smiling Steps, please ignore this email or contact our support team.</p>
            </div>
            
            <div class="footer">
                <p>Need help? Contact us at <a href="mailto:support@smilingsteps.com" class="link">support@smilingsteps.com</a></p>
                <p>© ${new Date().getFullYear()} Smiling Steps. All rights reserved.</p>
                <p style="font-size: 11px; color: #999;">This is an automated message. Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getVerificationEmailText(userName, verificationUrl) {
    return `
Welcome to Smiling Steps, ${userName}!

Thank you for joining our community dedicated to mental health and wellness.

To complete your account setup, please verify your email address by visiting this link:

${verificationUrl}

IMPORTANT: This verification link will expire in 24 hours for security reasons.

If you didn't create an account with Smiling Steps, please ignore this email.

Need help? Contact us at support@smilingsteps.com

Best regards,
The Smiling Steps Team

© ${new Date().getFullYear()} Smiling Steps. All rights reserved.
    `.trim();
  }

  getPasswordResetTemplate(userName, resetUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Smiling Steps</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #663399 0%, #8B5CF6 100%); border-radius: 10px 10px 0 0; }
            .logo { color: white; font-size: 28px; font-weight: bold; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; }
            .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #663399 0%, #8B5CF6 100%);
                color: white !important; 
                padding: 15px 40px; 
                text-decoration: none; 
                border-radius: 8px; 
                margin: 25px 0;
                font-weight: bold;
            }
            .footer { margin-top: 30px; padding: 20px; font-size: 13px; color: #666; text-align: center; background: #f8f9fa; border-radius: 0 0 10px 10px; }
            .link { color: #663399; word-break: break-all; }
            .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌟 Smiling Steps</div>
            </div>
            
            <div class="content">
                <h2 style="color: #663399;">Password Reset Request</h2>
                
                <p>Hi ${userName},</p>
                
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p>If the button doesn't work, copy and paste this link:</p>
                <p class="link">${resetUrl}</p>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
                </div>
            </div>
            
            <div class="footer">
                <p>Need help? Contact us at <a href="mailto:support@smilingsteps.com" class="link">support@smilingsteps.com</a></p>
                <p>© ${new Date().getFullYear()} Smiling Steps. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getPasswordResetText(userName, resetUrl) {
    return `
Password Reset Request - Smiling Steps

Hi ${userName},

We received a request to reset your password. Visit this link to create a new password:

${resetUrl}

SECURITY NOTICE: This link will expire in 1 hour. If you didn't request this reset, please ignore this email.

Need help? Contact us at support@smilingsteps.com

The Smiling Steps Team
    `.trim();
  }

  getApprovalNotificationTemplate(userName, isApproved, notes) {
    const statusColor = isApproved ? '#28a745' : '#dc3545';
    const statusText = isApproved ? 'Approved' : 'Requires Attention';
    const statusIcon = isApproved ? '✅' : '⚠️';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Status - Smiling Steps</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #663399 0%, #8B5CF6 100%); border-radius: 10px 10px 0 0; }
            .logo { color: white; font-size: 28px; font-weight: bold; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; }
            .status-badge { display: inline-block; padding: 10px 20px; border-radius: 5px; font-weight: bold; color: white; background: ${statusColor}; }
            .notes { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${statusColor}; }
            .footer { margin-top: 30px; padding: 20px; font-size: 13px; color: #666; text-align: center; background: #f8f9fa; border-radius: 0 0 10px 10px; }
            .link { color: #663399; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌟 Smiling Steps</div>
            </div>
            
            <div class="content">
                <h2 style="color: #663399;">${statusIcon} Application Status Update</h2>
                
                <p>Dear ${userName},</p>
                
                <p>Your therapist application status has been updated:</p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <span class="status-badge">${statusText}</span>
                </div>
                
                ${isApproved ? `
                <p>🎉 <strong>Congratulations!</strong> Your application has been approved. You can now:</p>
                <ul>
                    <li>Set up your availability schedule</li>
                    <li>Configure your session rates</li>
                    <li>Start accepting client bookings</li>
                </ul>
                <p>Log in to your dashboard to get started!</p>
                ` : `
                <p>Our team has reviewed your application and requires additional information or clarification.</p>
                ${notes ? `<div class="notes"><strong>Feedback:</strong><br>${notes}</div>` : ''}
                <p>Please log in to your account to view the details and respond to any requests.</p>
                `}
            </div>
            
            <div class="footer">
                <p>Questions? Contact us at <a href="mailto:support@smilingsteps.com" class="link">support@smilingsteps.com</a></p>
                <p>© ${new Date().getFullYear()} Smiling Steps. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getApprovalNotificationText(userName, isApproved, notes) {
    return `
Application Status Update - Smiling Steps

Dear ${userName},

Your therapist application status has been updated: ${isApproved ? 'APPROVED' : 'REQUIRES ATTENTION'}

${isApproved ? `
Congratulations! Your application has been approved. You can now:
- Set up your availability schedule
- Configure your session rates
- Start accepting client bookings

Log in to your dashboard to get started!
` : `
Our team has reviewed your application and requires additional information.
${notes ? `\nFeedback: ${notes}\n` : ''}
Please log in to your account to view the details and respond to any requests.
`}

Questions? Contact us at support@smilingsteps.com

The Smiling Steps Team
    `.trim();
  }
}

// Export singleton instance
module.exports = new ProductionEmailService();
