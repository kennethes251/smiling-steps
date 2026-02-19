/**
 * Comprehensive Registration System Test Suite
 * 
 * Tests all components of the user registration and verification system:
 * - Registration flow (client and therapist)
 * - Email verification
 * - Token generation and validation
 * - Access control
 * - Credential submission
 * - Approval workflow
 * - Performance monitoring
 * - Security audit
 * - Analytics
 * 
 * @module test/registration-system-comprehensive
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Services
const { registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES } = require('../services/registrationPerformanceService');
const { registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY } = require('../services/registrationErrorMonitoringService');
const { registrationSecurityAuditService, AUDIT_CATEGORIES, CHECK_STATUS } = require('../services/registrationSecurityAuditService');
const registrationAnalyticsService = require('../services/registrationAnalyticsService');
const tokenGenerationService = require('../services/tokenGenerationService');

// Mock User model for unit tests
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedPassword',
  role: 'client',
  isVerified: false,
  isEmailVerified: false,
  createdAt: new Date(),
  save: jest.fn().mockResolvedValue(true)
};

describe('Registration System Comprehensive Tests', () => {
  
  // ============================================
  // SECTION 1: Token Generation Service Tests
  // ============================================
  describe('Token Generation Service', () => {
    
    test('should generate cryptographically secure tokens', () => {
      const token1 = tokenGenerationService.generateSecureToken();
      const token2 = tokenGenerationService.generateSecureToken();
      
      // Tokens should be 64 characters (32 bytes hex encoded)
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      
      // Tokens should be unique
      expect(token1).not.toBe(token2);
      
      // Tokens should only contain hex characters
      expect(token1).toMatch(/^[a-f0-9]+$/);
    });

    test('should hash tokens securely', () => {
      const token = 'test-token-12345';
      const hash1 = tokenGenerationService.hashToken(token);
      const hash2 = tokenGenerationService.hashToken(token);
      
      // Same token should produce same hash
      expect(hash1).toBe(hash2);
      
      // Hash should be 64 characters (SHA-256)
      expect(hash1).toHaveLength(64);
      
      // Hash should be different from original token
      expect(hash1).not.toBe(token);
    });

    test('should calculate correct expiration time', () => {
      const expirationHours = 24;
      const expiration = tokenGenerationService.calculateExpiration(expirationHours);
      
      const expectedTime = Date.now() + (expirationHours * 60 * 60 * 1000);
      
      // Should be within 1 second of expected time
      expect(Math.abs(expiration.getTime() - expectedTime)).toBeLessThan(1000);
    });

    test('should correctly identify expired tokens', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      
      expect(tokenGenerationService.isTokenExpired(pastDate)).toBe(true);
      expect(tokenGenerationService.isTokenExpired(futureDate)).toBe(false);
    });
  });

  // ============================================
  // SECTION 2: Performance Monitoring Tests
  // ============================================
  describe('Registration Performance Service', () => {
    
    beforeEach(() => {
      // Clear metrics before each test
      registrationPerformanceService.metrics = {
        registrationFunnel: [],
        emailVerificationTimes: [],
        approvalProcessingTimes: [],
        registrationCompletions: [],
        dropOffs: [],
        emailResends: []
      };
    });

    test('should track registration funnel steps', () => {
      const userId = 'test-user-123';
      
      registrationPerformanceService.trackFunnelStep(userId, REGISTRATION_STEPS.STARTED, USER_TYPES.CLIENT);
      registrationPerformanceService.trackFunnelStep(userId, REGISTRATION_STEPS.ACCOUNT_CREATED, USER_TYPES.CLIENT);
      
      expect(registrationPerformanceService.metrics.registrationFunnel).toHaveLength(2);
      expect(registrationPerformanceService.metrics.registrationFunnel[0].step).toBe(REGISTRATION_STEPS.STARTED);
      expect(registrationPerformanceService.metrics.registrationFunnel[1].step).toBe(REGISTRATION_STEPS.ACCOUNT_CREATED);
    });

    test('should track email verification timing', () => {
      const userId = 'test-user-456';
      const registrationTime = new Date(Date.now() - 3600000); // 1 hour ago
      
      registrationPerformanceService.trackEmailVerified(userId, USER_TYPES.CLIENT, registrationTime);
      
      expect(registrationPerformanceService.metrics.emailVerificationTimes).toHaveLength(1);
      expect(registrationPerformanceService.metrics.emailVerificationTimes[0].userId).toBe(userId);
      expect(registrationPerformanceService.metrics.emailVerificationTimes[0].verificationTime).toBeGreaterThan(0);
    });

    test('should calculate registration completion rate', () => {
      // Add test data
      registrationPerformanceService.trackFunnelStep('user1', REGISTRATION_STEPS.STARTED, USER_TYPES.CLIENT);
      registrationPerformanceService.trackFunnelStep('user1', REGISTRATION_STEPS.ACCOUNT_CREATED, USER_TYPES.CLIENT);
      registrationPerformanceService.trackFunnelStep('user2', REGISTRATION_STEPS.STARTED, USER_TYPES.CLIENT);
      // user2 doesn't complete
      
      const rate = registrationPerformanceService.calculateRegistrationCompletionRate();
      
      expect(rate).toBe(50); // 1 out of 2 completed
    });

    test('should calculate email verification rate', () => {
      // Add test data
      registrationPerformanceService.trackFunnelStep('user1', REGISTRATION_STEPS.ACCOUNT_CREATED, USER_TYPES.CLIENT);
      registrationPerformanceService.trackFunnelStep('user1', REGISTRATION_STEPS.EMAIL_VERIFIED, USER_TYPES.CLIENT);
      registrationPerformanceService.trackFunnelStep('user2', REGISTRATION_STEPS.ACCOUNT_CREATED, USER_TYPES.CLIENT);
      // user2 doesn't verify
      
      const rate = registrationPerformanceService.calculateEmailVerificationRate();
      
      expect(rate).toBe(50); // 1 out of 2 verified
    });

    test('should track therapist approval timing', () => {
      const userId = 'therapist-123';
      const submissionTime = new Date(Date.now() - 86400000); // 1 day ago
      
      registrationPerformanceService.trackApprovalDecision(userId, submissionTime, 'approved');
      
      expect(registrationPerformanceService.metrics.approvalProcessingTimes).toHaveLength(1);
      expect(registrationPerformanceService.metrics.approvalProcessingTimes[0].status).toBe('approved');
      expect(registrationPerformanceService.metrics.approvalProcessingTimes[0].processingTime).toBeGreaterThan(0);
    });

    test('should provide metrics summary', () => {
      const summary = registrationPerformanceService.getMetricsSummary();
      
      expect(summary).toHaveProperty('registrationCompletionRate');
      expect(summary).toHaveProperty('emailVerificationRate');
      expect(summary).toHaveProperty('averageTimeToVerification');
      expect(summary).toHaveProperty('averageApprovalTime');
      expect(summary).toHaveProperty('rawMetricsCounts');
    });
  });

  // ============================================
  // SECTION 3: Error Monitoring Tests
  // ============================================
  describe('Registration Error Monitoring Service', () => {
    
    beforeEach(() => {
      // Clear errors before each test
      registrationErrorMonitoringService.errors = [];
      registrationErrorMonitoringService.consecutiveEmailFailures = 0;
    });

    test('should track errors with correct category and severity', () => {
      const errorId = registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'TEST_ERROR',
        message: 'Test error message',
        severity: ERROR_SEVERITY.MEDIUM,
        context: { userId: 'test-123' }
      });
      
      expect(errorId).toBeDefined();
      expect(registrationErrorMonitoringService.errors).toHaveLength(1);
      expect(registrationErrorMonitoringService.errors[0].category).toBe(ERROR_CATEGORIES.REGISTRATION);
      expect(registrationErrorMonitoringService.errors[0].severity).toBe(ERROR_SEVERITY.MEDIUM);
    });

    test('should track consecutive email failures', () => {
      // Track 3 email failures
      for (let i = 0; i < 3; i++) {
        registrationErrorMonitoringService.trackError({
          category: ERROR_CATEGORIES.EMAIL_SENDING,
          code: 'EMAIL_FAILED',
          message: 'Email sending failed',
          severity: ERROR_SEVERITY.HIGH
        });
      }
      
      expect(registrationErrorMonitoringService.consecutiveEmailFailures).toBe(3);
    });

    test('should reset consecutive failures on success', () => {
      registrationErrorMonitoringService.consecutiveEmailFailures = 5;
      registrationErrorMonitoringService.trackEmailSuccess();
      
      expect(registrationErrorMonitoringService.consecutiveEmailFailures).toBe(0);
    });

    test('should provide error statistics', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.VALIDATION,
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
        severity: ERROR_SEVERITY.LOW
      });
      
      const stats = registrationErrorMonitoringService.getStats();
      
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorsByCategory');
      expect(stats).toHaveProperty('errorsBySeverity');
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    test('should calculate error rate for time window', () => {
      // Add some errors
      for (let i = 0; i < 5; i++) {
        registrationErrorMonitoringService.trackError({
          category: ERROR_CATEGORIES.REGISTRATION,
          code: 'TEST_ERROR',
          message: 'Test error',
          severity: ERROR_SEVERITY.LOW
        });
      }
      
      const errorRate = registrationErrorMonitoringService.getErrorRate(60 * 60 * 1000); // 1 hour
      
      expect(errorRate.totalErrors).toBe(5);
      expect(errorRate.errorsByCategory[ERROR_CATEGORIES.REGISTRATION]).toBe(5);
    });

    test('should sanitize sensitive context data', () => {
      const errorId = registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: ERROR_SEVERITY.LOW,
        context: {
          userId: 'test-123',
          password: 'secret123',
          token: 'abc123'
        }
      });
      
      const error = registrationErrorMonitoringService.errors.find(e => e.id === errorId);
      
      expect(error.context.userId).toBe('test-123');
      expect(error.context.password).toBe('[REDACTED]');
      expect(error.context.token).toBe('[REDACTED]');
    });
  });

  // ============================================
  // SECTION 4: Security Audit Tests
  // ============================================
  describe('Registration Security Audit Service', () => {
    
    test('should run full security audit', async () => {
      const results = await registrationSecurityAuditService.runFullAudit();
      
      expect(results).toHaveProperty('auditId');
      expect(results).toHaveProperty('checks');
      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('overallStatus');
      expect(results.checks.length).toBeGreaterThan(0);
    });

    test('should check password policy', async () => {
      const results = await registrationSecurityAuditService.runFullAudit();
      
      const passwordCheck = results.checks.find(c => c.category === AUDIT_CATEGORIES.PASSWORD_POLICY);
      
      expect(passwordCheck).toBeDefined();
      expect(passwordCheck.status).toBe(CHECK_STATUS.PASS);
      expect(passwordCheck.details.length).toBeGreaterThan(0);
    });

    test('should check token security', async () => {
      const results = await registrationSecurityAuditService.runFullAudit();
      
      const tokenCheck = results.checks.find(c => c.category === AUDIT_CATEGORIES.TOKEN_SECURITY);
      
      expect(tokenCheck).toBeDefined();
      expect(tokenCheck.status).toBe(CHECK_STATUS.PASS);
    });

    test('should check input validation', async () => {
      const results = await registrationSecurityAuditService.runFullAudit();
      
      const inputCheck = results.checks.find(c => c.category === AUDIT_CATEGORIES.INPUT_VALIDATION);
      
      expect(inputCheck).toBeDefined();
      expect(inputCheck.status).toBe(CHECK_STATUS.PASS);
    });

    test('should check rate limiting', async () => {
      const results = await registrationSecurityAuditService.runFullAudit();
      
      const rateLimitCheck = results.checks.find(c => c.category === AUDIT_CATEGORIES.RATE_LIMITING);
      
      expect(rateLimitCheck).toBeDefined();
      expect(rateLimitCheck.status).toBe(CHECK_STATUS.PASS);
    });

    test('should provide security recommendations', async () => {
      await registrationSecurityAuditService.runFullAudit();
      
      const recommendations = registrationSecurityAuditService.getSecurityRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should store audit history', async () => {
      await registrationSecurityAuditService.runFullAudit();
      await registrationSecurityAuditService.runFullAudit();
      
      const history = registrationSecurityAuditService.getAuditHistory(10);
      
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('should export audit report', async () => {
      await registrationSecurityAuditService.runFullAudit();
      
      const report = registrationSecurityAuditService.exportAuditReport('json');
      
      expect(typeof report).toBe('string');
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('audit');
      expect(parsed).toHaveProperty('recommendations');
    });
  });

  // ============================================
  // SECTION 5: Registration Steps Constants Tests
  // ============================================
  describe('Registration Constants', () => {
    
    test('should have all required registration steps', () => {
      expect(REGISTRATION_STEPS.STARTED).toBeDefined();
      expect(REGISTRATION_STEPS.FORM_SUBMITTED).toBeDefined();
      expect(REGISTRATION_STEPS.ACCOUNT_CREATED).toBeDefined();
      expect(REGISTRATION_STEPS.EMAIL_SENT).toBeDefined();
      expect(REGISTRATION_STEPS.EMAIL_VERIFIED).toBeDefined();
      expect(REGISTRATION_STEPS.CREDENTIALS_SUBMITTED).toBeDefined();
      expect(REGISTRATION_STEPS.APPROVED).toBeDefined();
      expect(REGISTRATION_STEPS.FIRST_LOGIN).toBeDefined();
    });

    test('should have all required user types', () => {
      expect(USER_TYPES.CLIENT).toBe('client');
      expect(USER_TYPES.THERAPIST).toBe('therapist');
    });

    test('should have all required error categories', () => {
      expect(ERROR_CATEGORIES.REGISTRATION).toBeDefined();
      expect(ERROR_CATEGORIES.EMAIL_VERIFICATION).toBeDefined();
      expect(ERROR_CATEGORIES.TOKEN_GENERATION).toBeDefined();
      expect(ERROR_CATEGORIES.EMAIL_SENDING).toBeDefined();
      expect(ERROR_CATEGORIES.CREDENTIAL_SUBMISSION).toBeDefined();
      expect(ERROR_CATEGORIES.APPROVAL_WORKFLOW).toBeDefined();
      expect(ERROR_CATEGORIES.ACCESS_CONTROL).toBeDefined();
      expect(ERROR_CATEGORIES.DATABASE).toBeDefined();
      expect(ERROR_CATEGORIES.VALIDATION).toBeDefined();
    });

    test('should have all required error severities', () => {
      expect(ERROR_SEVERITY.LOW).toBe('low');
      expect(ERROR_SEVERITY.MEDIUM).toBe('medium');
      expect(ERROR_SEVERITY.HIGH).toBe('high');
      expect(ERROR_SEVERITY.CRITICAL).toBe('critical');
    });

    test('should have all required audit categories', () => {
      expect(AUDIT_CATEGORIES.INPUT_VALIDATION).toBeDefined();
      expect(AUDIT_CATEGORIES.RATE_LIMITING).toBeDefined();
      expect(AUDIT_CATEGORIES.TOKEN_SECURITY).toBeDefined();
      expect(AUDIT_CATEGORIES.PASSWORD_POLICY).toBeDefined();
      expect(AUDIT_CATEGORIES.SESSION_SECURITY).toBeDefined();
      expect(AUDIT_CATEGORIES.DATA_SANITIZATION).toBeDefined();
      expect(AUDIT_CATEGORIES.ACCESS_CONTROL).toBeDefined();
    });

    test('should have all required check statuses', () => {
      expect(CHECK_STATUS.PASS).toBe('pass');
      expect(CHECK_STATUS.FAIL).toBe('fail');
      expect(CHECK_STATUS.WARNING).toBe('warning');
      expect(CHECK_STATUS.SKIPPED).toBe('skipped');
    });
  });

  // ============================================
  // SECTION 6: Integration Tests
  // ============================================
  describe('Service Integration', () => {
    
    test('should track complete registration flow', () => {
      const userId = 'integration-test-user';
      const userType = USER_TYPES.CLIENT;
      
      // Track registration start
      registrationPerformanceService.trackRegistrationStart(userId, userType);
      
      // Track account creation
      registrationPerformanceService.trackAccountCreated(userId, userType, Date.now() - 30000);
      
      // Track email sent
      registrationPerformanceService.trackEmailSent(userId, userType);
      
      // Track email verified
      registrationPerformanceService.trackEmailVerified(userId, userType, new Date(Date.now() - 60000));
      
      // Verify all steps were tracked
      const funnel = registrationPerformanceService.metrics.registrationFunnel.filter(
        m => m.userId === userId
      );
      
      expect(funnel.length).toBe(4);
    });

    test('should track therapist approval flow', () => {
      const userId = 'therapist-integration-test';
      const userType = USER_TYPES.THERAPIST;
      
      // Track registration
      registrationPerformanceService.trackRegistrationStart(userId, userType);
      registrationPerformanceService.trackAccountCreated(userId, userType);
      registrationPerformanceService.trackEmailSent(userId, userType);
      registrationPerformanceService.trackEmailVerified(userId, userType, new Date(Date.now() - 3600000));
      
      // Track credentials submission
      registrationPerformanceService.trackCredentialsSubmitted(userId, new Date(Date.now() - 3600000));
      
      // Track approval
      registrationPerformanceService.trackApprovalDecision(userId, new Date(Date.now() - 86400000), 'approved');
      
      // Verify approval was tracked
      const approvals = registrationPerformanceService.metrics.approvalProcessingTimes.filter(
        m => m.userId === userId
      );
      
      expect(approvals.length).toBe(1);
      expect(approvals[0].status).toBe('approved');
    });

    test('should track errors during registration flow', () => {
      // Simulate registration error
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'DUPLICATE_EMAIL',
        message: 'Email already exists',
        severity: ERROR_SEVERITY.LOW,
        context: { email: 'test@example.com' }
      });
      
      // Simulate email error
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.EMAIL_SENDING,
        code: 'SMTP_ERROR',
        message: 'Failed to connect to SMTP server',
        severity: ERROR_SEVERITY.HIGH
      });
      
      const stats = registrationErrorMonitoringService.getStats();
      
      expect(stats.errorsByCategory[ERROR_CATEGORIES.REGISTRATION]).toBeGreaterThan(0);
      expect(stats.errorsByCategory[ERROR_CATEGORIES.EMAIL_SENDING]).toBeGreaterThan(0);
    });
  });

  // ============================================
  // SECTION 7: Cleanup and Export Tests
  // ============================================
  describe('Data Management', () => {
    
    test('should export performance metrics', () => {
      // Add some test data
      registrationPerformanceService.trackFunnelStep('export-test', REGISTRATION_STEPS.STARTED, USER_TYPES.CLIENT);
      
      const exported = registrationPerformanceService.exportMetrics('json');
      
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('rawMetrics');
    });

    test('should export error data', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.VALIDATION,
        code: 'EXPORT_TEST',
        message: 'Test error for export',
        severity: ERROR_SEVERITY.LOW
      });
      
      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date();
      
      const exported = registrationErrorMonitoringService.exportErrors(startDate, endDate);
      
      expect(exported).toHaveProperty('totalErrors');
      expect(exported).toHaveProperty('errors');
      expect(exported.errors.length).toBeGreaterThan(0);
    });

    test('should resolve errors', () => {
      const errorId = registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'RESOLVE_TEST',
        message: 'Test error to resolve',
        severity: ERROR_SEVERITY.LOW
      });
      
      registrationErrorMonitoringService.resolveError(errorId, 'Fixed by test');
      
      const error = registrationErrorMonitoringService.errors.find(e => e.id === errorId);
      
      expect(error.resolved).toBe(true);
      expect(error.resolution).toBe('Fixed by test');
    });
  });
});

// Summary test to verify all components are working
describe('Registration System Summary', () => {
  
  test('All registration system components should be functional', async () => {
    // Token generation
    const token = tokenGenerationService.generateSecureToken();
    expect(token).toHaveLength(64);
    
    // Performance tracking
    const summary = registrationPerformanceService.getMetricsSummary();
    expect(summary).toBeDefined();
    
    // Error monitoring
    const stats = registrationErrorMonitoringService.getStats();
    expect(stats).toBeDefined();
    
    // Security audit
    const auditResults = await registrationSecurityAuditService.runFullAudit();
    expect(auditResults.overallStatus).toBeDefined();
    
    console.log('\n✅ Registration System Comprehensive Test Summary:');
    console.log('   - Token Generation: Working');
    console.log('   - Performance Monitoring: Working');
    console.log('   - Error Monitoring: Working');
    console.log('   - Security Audit: Working');
    console.log(`   - Security Status: ${auditResults.overallStatus}`);
    console.log(`   - Checks Passed: ${auditResults.summary.passed}/${auditResults.summary.total}`);
  });
});
