const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

class EmailVerificationService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Check if we have custom email hosting configured
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && 
        process.env.EMAIL_PASSWORD !== 'your-email-password') {
      console.log('📧 Using custom email hosting:', process.env.EMAIL_HOST);
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });
    }

    // For development/testing, use a mock transporter that just logs emails
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
        process.env.EMAIL_USER === 'your-email@gmail.com' || 
        process.env.EMAIL_PASSWORD === 'your-email-password') {
      console.log('📧 Using mock email transporter for development');
      return {
        sendMail: async (mailOptions) => {
          console.log('📧 MOCK EMAIL SENT:');
          console.log('  To:', mailOptions.to);
          console.log('  Subject:', mailOptions.subject);
          console.log('  HTML:', mailOptions.html.substring(0, 200) + '...');
          
          // Extract verification URL from HTML
          const urlMatch = mailOptions.html.match(/href="([^"]*verify-email[^"]*)"/);
          if (urlMatch) {
            console.log('  🔗 Verification URL:', urlMatch[1]);
          }
          
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }

    // Configure email transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production: Use SendGrid or AWS SES
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    } else {
      // Development: Use Gmail or test account
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
  }

  /**
   * Generate a secure verification token
   * @returns {string} Plain text token (to be sent in email)
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for secure storage
   * @param {string} token - Plain text token
   * @returns {string} Hashed token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate and store verification token for user
   * @param {string} userId - User ID
   * @returns {Promise<string>} Plain text token
   */
  async createVerificationToken(userId) {
    const token = this.generateVerificationToken();
    const hashedToken = this.hashToken(token);
    
    // Set token expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(userId, {
      verificationToken: hashedToken,
      verificationTokenExpires: expiresAt
    });

    return token;
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
      return result;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Verify email token and update user status
   * @param {string} token - Plain text token from email
   * @returns {Promise<Object>} Verification result
   */
  async verifyEmailToken(token) {
    const hashedToken = this.hashToken(token);
    
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid or expired verification token'
      };
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    
    // Update account status based on role
    if (user.role === 'client') {
      user.accountStatus = 'email_verified';
    } else if (user.role === 'therapist') {
      user.accountStatus = 'email_verified'; // Will need credential submission next
    }

    await user.save();

    return {
      success: true,
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
   */
  async cleanupExpiredTokens() {
    try {
      const result = await User.updateMany(
        { verificationTokenExpires: { $lt: Date.now() } },
        { 
          $unset: { 
            verificationToken: 1, 
            verificationTokenExpires: 1 
          } 
        }
      );
      console.log(`Cleaned up ${result.modifiedCount} expired verification tokens`);
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
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