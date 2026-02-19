const crypto = require('crypto');
const User = require('../models/User');
const tokenGenerationService = require('./tokenGenerationService');

// Use production email service for reliable delivery
let productionEmailService;
try {
  productionEmailService = require('./productionEmailService');
} catch (error) {
  console.warn('⚠️ Production email service not available, using fallback');
  productionEmailService = null;
}

// Import error monitoring service
let registrationErrorMonitoring;
try {
  const { registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY } = require('./registrationErrorMonitoringService');
  registrationErrorMonitoring = { service: registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY };
} catch (error) {
  console.warn('⚠️ Registration error monitoring service not available');
  registrationErrorMonitoring = null;
}

// Import performance monitoring service
let registrationPerformance;
try {
  const { registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES } = require('./registrationPerformanceService');
  registrationPerformance = { service: registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES };
} catch (error) {
  console.warn('⚠️ Registration performance service not available');
  registrationPerformance = null;
}

class EmailVerificationService {
  constructor() {
    this.useProductionService = !!productionEmailService;
  }

  /**
   * Get the email transporter (for backward compatibility)
   * @returns {Object} Email transporter or production service
   */
  get transporter() {
    if (this.useProductionService) {
      return {
        sendMail: async (mailOptions) => {
          return productionEmailService.sendEmail(mailOptions);
        }
      };
    }
    return this._createFallbackTransporter();
  }

  _createFallbackTransporter() {
    const nodemailer = require('nodemailer');
    
    // Check if we have custom email hosting configured
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && 
        process.env.EMAIL_PASSWORD !== 'your-email-password') {
      console.log('📧 Using custom email hosting:', process.env.EMAIL_HOST);
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    // For development/testing, use a mock transporter
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
        process.env.EMAIL_USER === 'your-email@gmail.com' || 
        process.env.EMAIL_PASSWORD === 'your-email-password') {
      console.log('📧 Using mock email transporter for development');
      return {
        sendMail: async (mailOptions) => {
          console.log('📧 MOCK EMAIL SENT:');
          console.log('  To:', mailOptions.to);
          console.log('  Subject:', mailOptions.subject);
          
          const urlMatch = mailOptions.html?.match(/href="([^"]*verify-email[^"]*)"/);
          if (urlMatch) {
            console.log('  🔗 Verification URL:', urlMatch[1]);
          }
          
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }

    // Default: Use Gmail
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Generate and store verification token for user
   * Uses the dedicated TokenGenerationService for secure token generation
   * @param {string} userId - User ID
   * @returns {Promise<string>} Plain text token
   */
  async createVerificationToken(userId) {
    try {
      const result = await tokenGenerationService.createVerificationToken(userId);
      return result.token;
    } catch (error) {
      console.error('❌ Failed to create verification token:', error);
      
      // Track error in monitoring service
      if (registrationErrorMonitoring) {
        registrationErrorMonitoring.service.trackError({
          category: registrationErrorMonitoring.ERROR_CATEGORIES.TOKEN_GENERATION,
          code: 'TOKEN_GENERATION_FAILED',
          message: error.message,
          severity: registrationErrorMonitoring.ERROR_SEVERITY.HIGH,
          context: { userId },
          originalError: error
        });
      }
      
      throw error;
    }
  }

  /**
   * Send verification email to user
   * @param {Object} user - User object
   * @param {string} token - Plain text verification token
   */
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'Smiling Steps',
        address: process.env.FROM_EMAIL || 'hr@smilingsteps.com'
      },
      to: user.email,
      subject: 'Verify Your Email - Smiling Steps',
      html: this.getVerificationEmailTemplate(user.name, verificationUrl),
      text: this.getVerificationEmailText(user.name, verificationUrl)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent successfully:', result.messageId);
      
      // Track successful email sending
      if (registrationErrorMonitoring) {
        registrationErrorMonitoring.service.trackEmailSuccess();
        registrationErrorMonitoring.service.trackAttempt('email_verification_send', true, {
          email: user.email,
          messageId: result.messageId
        });
      }
      
      // Track performance metric for email sent
      if (registrationPerformance) {
        const userType = user.role === 'psychologist' || user.role === 'therapist' 
          ? registrationPerformance.USER_TYPES.THERAPIST 
          : registrationPerformance.USER_TYPES.CLIENT;
        registrationPerformance.service.trackEmailSent(user._id.toString(), userType);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      
      // Track error in monitoring service
      if (registrationErrorMonitoring) {
        registrationErrorMonitoring.service.trackError({
          category: registrationErrorMonitoring.ERROR_CATEGORIES.EMAIL_SENDING,
          code: 'EMAIL_SEND_FAILED',
          message: error.message,
          severity: registrationErrorMonitoring.ERROR_SEVERITY.HIGH,
          context: { email: user.email },
          originalError: error
        });
      }
      
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Verify email token and update user status
   * Uses the dedicated TokenGenerationService for secure token validation
   * @param {string} token - Plain text token from email
   * @returns {Promise<Object>} Verification result
   */
  async verifyEmailToken(token) {
    try {
      // Validate token using the token generation service
      const validation = await tokenGenerationService.validateToken(token);
      
      if (!validation.valid) {
        if (validation.reason === 'TOKEN_EXPIRED') {
          return {
            success: false,
            code: 'TOKEN_EXPIRED',
            message: 'Verification link has expired. Please request a new one.'
          };
        }
        
        return {
          success: false,
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired verification token'
        };
      }

      const user = validation.user;

      // Check if already verified (check both fields for compatibility)
      if (user.isVerified || user.isEmailVerified) {
        // Clear the token since it's no longer needed
        await tokenGenerationService.clearVerificationToken(user._id);

        return {
          success: true,
          code: 'ALREADY_VERIFIED',
          message: 'Email is already verified',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: true,
            accountStatus: user.accountStatus
          }
        };
      }

      // Update user verification status
      // Set BOTH fields to ensure compatibility (login checks isVerified)
      user.isVerified = true;
      user.isEmailVerified = true;
      
      // Update account status based on role
      if (user.role === 'client') {
        user.accountStatus = 'email_verified';
      } else if (user.role === 'therapist') {
        user.accountStatus = 'email_verified'; // Will need credential submission next
      }

      await user.save();

      // Clear the verification token after successful verification
      await tokenGenerationService.clearVerificationToken(user._id);

      // Track performance metric for email verified
      if (registrationPerformance) {
        const userType = user.role === 'psychologist' || user.role === 'therapist' 
          ? registrationPerformance.USER_TYPES.THERAPIST 
          : registrationPerformance.USER_TYPES.CLIENT;
        registrationPerformance.service.trackEmailVerified(
          user._id.toString(), 
          userType, 
          user.createdAt
        );
      }

      return {
        success: true,
        code: 'VERIFIED',
        message: 'Email verified successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isEmailVerified,
          accountStatus: user.accountStatus
        }
      };
    } catch (error) {
      console.error('❌ Email verification error:', error);
      
      // Track error in monitoring service
      if (registrationErrorMonitoring) {
        registrationErrorMonitoring.service.trackError({
          category: registrationErrorMonitoring.ERROR_CATEGORIES.EMAIL_VERIFICATION,
          code: 'VERIFICATION_ERROR',
          message: error.message,
          severity: registrationErrorMonitoring.ERROR_SEVERITY.MEDIUM,
          context: { tokenProvided: !!token },
          originalError: error
        });
      }
      
      return {
        success: false,
        code: 'VERIFICATION_ERROR',
        message: 'An error occurred during verification'
      };
    }
  }

  /**
   * Resend verification email
   * @param {string} email - User email address
   */
  async resendVerificationEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // Generate new token and send email
    const token = await this.createVerificationToken(user._id);
    await this.sendVerificationEmail(user, token);

    return {
      success: true,
      message: 'Verification email sent successfully'
    };
  }

  /**
   * Clean up expired verification tokens
   * Uses the dedicated TokenGenerationService for cleanup
   */
  async cleanupExpiredTokens() {
    return await tokenGenerationService.cleanupExpiredTokens();
  }

  /**
   * HTML email template for verification
   */
  getVerificationEmailTemplate(userName, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Smiling Steps</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #663399; font-size: 24px; font-weight: bold; }
            .button { 
                display: inline-block; 
                background: #663399; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌟 Smiling Steps</div>
            </div>
            
            <h2>Welcome to Smiling Steps, ${userName}!</h2>
            
            <p>Thank you for registering with us. We're excited to have you join our community focused on mental health and wellness.</p>
            
            <p>To complete your account setup and start using our platform, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #663399;">${verificationUrl}</p>
            
            <div class="footer">
                <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
                <p>If you didn't create an account with Smiling Steps, please ignore this email.</p>
                <p>Need help? Contact our support team at support@smilingsteps.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Plain text email template for verification
   */
  getVerificationEmailText(userName, verificationUrl) {
    return `
Welcome to Smiling Steps, ${userName}!

Thank you for registering with us. We're excited to have you join our community focused on mental health and wellness.

To complete your account setup and start using our platform, please verify your email address by visiting this link:

${verificationUrl}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with Smiling Steps, please ignore this email.

Need help? Contact our support team at support@smilingsteps.com

Best regards,
The Smiling Steps Team
    `;
  }
}

module.exports = new EmailVerificationService();