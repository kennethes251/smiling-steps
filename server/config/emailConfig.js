/**
 * Production Email Configuration
 * 
 * Supports multiple email providers for reliability:
 * - Gmail SMTP (with App Password)
 * - SendGrid
 * - AWS SES
 * - Custom SMTP
 * 
 * @module config/emailConfig
 */

const nodemailer = require('nodemailer');

/**
 * Email provider configurations
 */
const EMAIL_PROVIDERS = {
  GMAIL: 'gmail',
  SENDGRID: 'sendgrid',
  AWS_SES: 'aws_ses',
  CUSTOM_SMTP: 'custom_smtp',
  MOCK: 'mock'
};

/**
 * Get the configured email provider based on environment variables
 * @returns {string} The email provider to use
 */
function getEmailProvider() {
  // Explicit provider selection
  if (process.env.EMAIL_PROVIDER) {
    return process.env.EMAIL_PROVIDER.toLowerCase();
  }

  // Auto-detect based on available credentials
  if (process.env.SENDGRID_API_KEY) {
    return EMAIL_PROVIDERS.SENDGRID;
  }

  if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
    return EMAIL_PROVIDERS.AWS_SES;
  }

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    // Check if it's Gmail
    if (process.env.EMAIL_HOST.includes('gmail') || 
        process.env.EMAIL_USER?.includes('gmail.com')) {
      return EMAIL_PROVIDERS.GMAIL;
    }
    return EMAIL_PROVIDERS.CUSTOM_SMTP;
  }

  // Gmail without explicit host (using service)
  if (process.env.EMAIL_USER?.includes('gmail.com') && process.env.EMAIL_PASSWORD) {
    return EMAIL_PROVIDERS.GMAIL;
  }

  // Development/testing fallback
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ No email provider configured, using mock transporter');
    return EMAIL_PROVIDERS.MOCK;
  }

  throw new Error('No email provider configured. Please set EMAIL_PROVIDER or provide credentials.');
}

/**
 * Create Gmail SMTP transporter
 * Requires: EMAIL_USER, EMAIL_PASSWORD (App Password)
 */
function createGmailTransporter() {
  const config = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };

  // If explicit host is provided, use it instead of service
  if (process.env.EMAIL_HOST) {
    delete config.service;
    config.host = process.env.EMAIL_HOST;
    config.port = parseInt(process.env.EMAIL_PORT) || 587;
    config.secure = process.env.EMAIL_SECURE === 'true';
  }

  return nodemailer.createTransport(config);
}

/**
 * Create SendGrid transporter
 * Requires: SENDGRID_API_KEY
 */
function createSendGridTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
}


/**
 * Create AWS SES transporter
 * Requires: AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY, AWS_SES_REGION
 */
function createAWSSESTransporter() {
  const aws = require('@aws-sdk/client-ses');
  const { defaultProvider } = require('@aws-sdk/credential-provider-node');

  const ses = new aws.SES({
    apiVersion: '2010-12-01',
    region: process.env.AWS_SES_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY
    }
  });

  return nodemailer.createTransport({
    SES: { ses, aws }
  });
}

/**
 * Create custom SMTP transporter
 * Requires: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
 */
function createCustomSMTPTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
    }
  });
}

/**
 * Create mock transporter for development/testing
 */
function createMockTransporter() {
  return {
    sendMail: async (mailOptions) => {
      console.log('📧 MOCK EMAIL SENT:');
      console.log('  To:', mailOptions.to);
      console.log('  Subject:', mailOptions.subject);
      console.log('  From:', mailOptions.from);
      
      // Extract verification URL from HTML if present
      if (mailOptions.html) {
        const urlMatch = mailOptions.html.match(/href="([^"]*verify-email[^"]*)"/);
        if (urlMatch) {
          console.log('  🔗 Verification URL:', urlMatch[1]);
        }
      }
      
      return { 
        messageId: 'mock-' + Date.now(),
        accepted: [mailOptions.to],
        rejected: [],
        response: 'Mock email sent successfully'
      };
    },
    verify: async () => true
  };
}

/**
 * Create email transporter based on configuration
 * @returns {Object} Nodemailer transporter
 */
function createTransporter() {
  const provider = getEmailProvider();
  
  console.log(`📧 Initializing email service with provider: ${provider}`);

  switch (provider) {
    case EMAIL_PROVIDERS.GMAIL:
      return createGmailTransporter();
    
    case EMAIL_PROVIDERS.SENDGRID:
      return createSendGridTransporter();
    
    case EMAIL_PROVIDERS.AWS_SES:
      return createAWSSESTransporter();
    
    case EMAIL_PROVIDERS.CUSTOM_SMTP:
      return createCustomSMTPTransporter();
    
    case EMAIL_PROVIDERS.MOCK:
      return createMockTransporter();
    
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}

/**
 * Verify email transporter connection
 * @param {Object} transporter - Nodemailer transporter
 * @returns {Promise<Object>} Verification result
 */
async function verifyTransporter(transporter) {
  try {
    // Mock transporter always passes
    if (transporter.verify) {
      await transporter.verify();
    }
    
    return {
      success: true,
      provider: getEmailProvider(),
      message: 'Email service is ready'
    };
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error.message);
    return {
      success: false,
      provider: getEmailProvider(),
      message: error.message,
      error: error
    };
  }
}

/**
 * Get default sender information
 * @returns {Object} From address configuration
 */
function getDefaultSender() {
  return {
    name: process.env.FROM_NAME || process.env.EMAIL_FROM_NAME || 'Smiling Steps',
    address: process.env.FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@smilingsteps.com'
  };
}

/**
 * Email configuration object
 */
const emailConfig = {
  providers: EMAIL_PROVIDERS,
  getProvider: getEmailProvider,
  createTransporter,
  verifyTransporter,
  getDefaultSender,
  
  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 3,
    initialDelay: parseInt(process.env.EMAIL_RETRY_DELAY) || 1000,
    maxDelay: parseInt(process.env.EMAIL_RETRY_MAX_DELAY) || 30000,
    backoffMultiplier: parseFloat(process.env.EMAIL_RETRY_BACKOFF) || 2
  },
  
  // Rate limiting
  rateLimit: {
    maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT) || 30,
    maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR) || 500
  }
};

module.exports = emailConfig;
