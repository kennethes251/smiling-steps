/**
 * Production Email Service Tests
 * 
 * Tests the production email service configuration, retry logic,
 * rate limiting, and health monitoring.
 */

const emailConfig = require('../config/emailConfig');

describe('Email Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEmailProvider', () => {
    it('should return mock provider when no credentials configured in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.EMAIL_PROVIDER;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.AWS_SES_ACCESS_KEY_ID;
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
      
      const config = require('../config/emailConfig');
      expect(config.getProvider()).toBe('mock');
    });

    it('should return explicit provider when EMAIL_PROVIDER is set', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      
      const config = require('../config/emailConfig');
      expect(config.getProvider()).toBe('sendgrid');
    });

    it('should auto-detect SendGrid when SENDGRID_API_KEY is set', () => {
      delete process.env.EMAIL_PROVIDER;
      process.env.SENDGRID_API_KEY = 'SG.test-key';
      
      const config = require('../config/emailConfig');
      expect(config.getProvider()).toBe('sendgrid');
    });

    it('should auto-detect Gmail when EMAIL_USER contains gmail.com', () => {
      delete process.env.EMAIL_PROVIDER;
      delete process.env.SENDGRID_API_KEY;
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.EMAIL_PASSWORD = 'test-password';
      
      const config = require('../config/emailConfig');
      expect(config.getProvider()).toBe('gmail');
    });

    it('should return custom_smtp when EMAIL_HOST is set with non-Gmail', () => {
      delete process.env.EMAIL_PROVIDER;
      delete process.env.SENDGRID_API_KEY;
      process.env.EMAIL_HOST = 'smtp.custom.com';
      process.env.EMAIL_USER = 'user@custom.com';
      process.env.EMAIL_PASSWORD = 'password';
      
      const config = require('../config/emailConfig');
      expect(config.getProvider()).toBe('custom_smtp');
    });
  });

  describe('getDefaultSender', () => {
    it('should return configured sender information', () => {
      process.env.FROM_NAME = 'Test Sender';
      process.env.FROM_EMAIL = 'test@example.com';
      
      const config = require('../config/emailConfig');
      const sender = config.getDefaultSender();
      
      expect(sender.name).toBe('Test Sender');
      expect(sender.address).toBe('test@example.com');
    });

    it('should use defaults when not configured', () => {
      delete process.env.FROM_NAME;
      delete process.env.FROM_EMAIL;
      delete process.env.EMAIL_FROM_NAME;
      delete process.env.EMAIL_FROM;
      delete process.env.EMAIL_USER;
      
      const config = require('../config/emailConfig');
      const sender = config.getDefaultSender();
      
      expect(sender.name).toBe('Smiling Steps');
      expect(sender.address).toBe('noreply@smilingsteps.com');
    });
  });

  describe('retry configuration', () => {
    it('should have default retry settings', () => {
      const config = require('../config/emailConfig');
      
      expect(config.retry.maxAttempts).toBe(3);
      expect(config.retry.initialDelay).toBe(1000);
      expect(config.retry.maxDelay).toBe(30000);
      expect(config.retry.backoffMultiplier).toBe(2);
    });

    it('should use environment variables for retry settings', () => {
      process.env.EMAIL_RETRY_ATTEMPTS = '5';
      process.env.EMAIL_RETRY_DELAY = '2000';
      process.env.EMAIL_RETRY_MAX_DELAY = '60000';
      process.env.EMAIL_RETRY_BACKOFF = '3';
      
      jest.resetModules();
      const config = require('../config/emailConfig');
      
      expect(config.retry.maxAttempts).toBe(5);
      expect(config.retry.initialDelay).toBe(2000);
      expect(config.retry.maxDelay).toBe(60000);
      expect(config.retry.backoffMultiplier).toBe(3);
    });
  });

  describe('rate limit configuration', () => {
    it('should have default rate limits', () => {
      const config = require('../config/emailConfig');
      
      expect(config.rateLimit.maxPerMinute).toBe(30);
      expect(config.rateLimit.maxPerHour).toBe(500);
    });

    it('should use environment variables for rate limits', () => {
      process.env.EMAIL_RATE_LIMIT = '50';
      process.env.EMAIL_RATE_LIMIT_HOUR = '1000';
      
      jest.resetModules();
      const config = require('../config/emailConfig');
      
      expect(config.rateLimit.maxPerMinute).toBe(50);
      expect(config.rateLimit.maxPerHour).toBe(1000);
    });
  });

  describe('createTransporter', () => {
    it('should create a mock transporter in development without credentials', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.EMAIL_PROVIDER;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
      
      jest.resetModules();
      const config = require('../config/emailConfig');
      const transporter = config.createTransporter();
      
      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');
    });

    it('should create a transporter that can send mock emails', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.EMAIL_PROVIDER;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
      
      jest.resetModules();
      const config = require('../config/emailConfig');
      const transporter = config.createTransporter();
      
      const result = await transporter.sendMail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      expect(result.messageId).toMatch(/^mock-/);
      expect(result.accepted).toContain('test@example.com');
    });
  });
});

describe('Production Email Service', () => {
  let productionEmailService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    delete process.env.EMAIL_PROVIDER;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASSWORD;
    
    productionEmailService = require('../services/productionEmailService');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initialize', () => {
    it('should initialize successfully with mock transporter', async () => {
      const result = await productionEmailService.initialize();
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('mock');
    });
  });

  describe('sendEmail', () => {
    beforeEach(async () => {
      await productionEmailService.initialize();
    });

    it('should send email successfully', async () => {
      const result = await productionEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content'
      });
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should increment stats on successful send', async () => {
      productionEmailService.resetStats();
      
      await productionEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      const health = await productionEmailService.getHealthStatus();
      expect(health.stats.sent).toBe(1);
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await productionEmailService.initialize();
      productionEmailService.resetStats();
    });

    it('should track rate limit counters', async () => {
      await productionEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      const health = await productionEmailService.getHealthStatus();
      expect(health.rateLimit.minuteRemaining).toBeLessThan(30);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      await productionEmailService.initialize();
      
      const health = await productionEmailService.getHealthStatus();
      
      expect(health.initialized).toBe(true);
      expect(health.provider).toBe('mock');
      expect(health.stats).toBeDefined();
      expect(health.rateLimit).toBeDefined();
    });
  });

  describe('email templates', () => {
    it('should generate verification email template', () => {
      const html = productionEmailService.getVerificationEmailTemplate(
        'John Doe',
        'https://example.com/verify?token=abc123'
      );
      
      expect(html).toContain('John Doe');
      expect(html).toContain('https://example.com/verify?token=abc123');
      expect(html).toContain('Smiling Steps');
      expect(html).toContain('Verify Email Address');
    });

    it('should generate password reset template', () => {
      const html = productionEmailService.getPasswordResetTemplate(
        'Jane Doe',
        'https://example.com/reset?token=xyz789'
      );
      
      expect(html).toContain('Jane Doe');
      expect(html).toContain('https://example.com/reset?token=xyz789');
      expect(html).toContain('Reset Password');
    });

    it('should generate approval notification template for approved', () => {
      const html = productionEmailService.getApprovalNotificationTemplate(
        'Dr. Smith',
        true,
        ''
      );
      
      expect(html).toContain('Dr. Smith');
      expect(html).toContain('Approved');
      expect(html).toContain('Congratulations');
    });

    it('should generate approval notification template for rejected with notes', () => {
      const html = productionEmailService.getApprovalNotificationTemplate(
        'Dr. Smith',
        false,
        'Please provide additional documentation'
      );
      
      expect(html).toContain('Dr. Smith');
      expect(html).toContain('Requires Attention');
      expect(html).toContain('Please provide additional documentation');
    });
  });
});
