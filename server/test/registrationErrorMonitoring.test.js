/**
 * Registration Error Monitoring Service Tests
 * 
 * Tests for the error monitoring service that tracks registration-related errors.
 */

const { 
  registrationErrorMonitoringService, 
  ERROR_CATEGORIES, 
  ERROR_SEVERITY,
  ALERT_THRESHOLDS 
} = require('../services/registrationErrorMonitoringService');

describe('Registration Error Monitoring Service', () => {
  beforeEach(() => {
    // Clear errors before each test
    registrationErrorMonitoringService.errors = [];
    registrationErrorMonitoringService.stats.totalErrors = 0;
    Object.values(ERROR_CATEGORIES).forEach(category => {
      registrationErrorMonitoringService.stats.errorsByCategory[category] = 0;
    });
    Object.values(ERROR_SEVERITY).forEach(severity => {
      registrationErrorMonitoringService.stats.errorsBySeverity[severity] = 0;
    });
    registrationErrorMonitoringService.consecutiveEmailFailures = 0;
    registrationErrorMonitoringService.alertsSent.clear();
  });

  describe('Error Tracking', () => {
    test('should track a registration error', () => {
      const errorId = registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'DUPLICATE_EMAIL',
        message: 'Email already exists',
        severity: ERROR_SEVERITY.LOW,
        context: { email: 'test@example.com' }
      });

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^err_/);
      expect(registrationErrorMonitoringService.errors.length).toBe(1);
      expect(registrationErrorMonitoringService.stats.totalErrors).toBe(1);
    });

    test('should sanitize sensitive data in context', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: ERROR_SEVERITY.LOW,
        context: { 
          email: 'test@example.com',
          password: 'secret123',
          token: 'abc123'
        }
      });

      const error = registrationErrorMonitoringService.errors[0];
      expect(error.context.email).toBe('test@example.com');
      expect(error.context.password).toBe('[REDACTED]');
      expect(error.context.token).toBe('[REDACTED]');
    });

    test('should track errors by category', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.EMAIL_SENDING,
        code: 'EMAIL_FAILED',
        message: 'Failed to send email',
        severity: ERROR_SEVERITY.HIGH
      });

      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.TOKEN_GENERATION,
        code: 'TOKEN_FAILED',
        message: 'Failed to generate token',
        severity: ERROR_SEVERITY.HIGH
      });

      expect(registrationErrorMonitoringService.stats.errorsByCategory[ERROR_CATEGORIES.EMAIL_SENDING]).toBe(1);
      expect(registrationErrorMonitoringService.stats.errorsByCategory[ERROR_CATEGORIES.TOKEN_GENERATION]).toBe(1);
    });

    test('should track errors by severity', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'LOW_ERROR',
        message: 'Low severity error',
        severity: ERROR_SEVERITY.LOW
      });

      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'CRITICAL_ERROR',
        message: 'Critical error',
        severity: ERROR_SEVERITY.CRITICAL
      });

      expect(registrationErrorMonitoringService.stats.errorsBySeverity[ERROR_SEVERITY.LOW]).toBe(1);
      expect(registrationErrorMonitoringService.stats.errorsBySeverity[ERROR_SEVERITY.CRITICAL]).toBe(1);
    });
  });

  describe('Email Failure Tracking', () => {
    test('should track consecutive email failures', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.EMAIL_SENDING,
        code: 'EMAIL_FAILED',
        message: 'Failed to send email',
        severity: ERROR_SEVERITY.HIGH
      });

      expect(registrationErrorMonitoringService.consecutiveEmailFailures).toBe(1);
    });

    test('should reset consecutive failures on success', () => {
      registrationErrorMonitoringService.consecutiveEmailFailures = 2;
      registrationErrorMonitoringService.trackEmailSuccess();

      expect(registrationErrorMonitoringService.consecutiveEmailFailures).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should return current stats', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: ERROR_SEVERITY.MEDIUM
      });

      const stats = registrationErrorMonitoringService.getStats();

      expect(stats.totalErrors).toBe(1);
      expect(stats.recentErrors).toHaveLength(1);
      expect(stats.lastUpdated).toBeDefined();
    });

    test('should get errors by category', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.VALIDATION,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        severity: ERROR_SEVERITY.LOW
      });

      const errors = registrationErrorMonitoringService.getErrorsByCategory(ERROR_CATEGORIES.VALIDATION);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('VALIDATION_ERROR');
    });

    test('should calculate error rate', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'ERROR_1',
        message: 'Error 1',
        severity: ERROR_SEVERITY.MEDIUM
      });

      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'ERROR_2',
        message: 'Error 2',
        severity: ERROR_SEVERITY.MEDIUM
      });

      const errorRate = registrationErrorMonitoringService.getErrorRate(60 * 60 * 1000);

      expect(errorRate.totalErrors).toBe(2);
      expect(errorRate.errorsByCategory[ERROR_CATEGORIES.REGISTRATION]).toBe(2);
    });
  });

  describe('Error Resolution', () => {
    test('should mark error as resolved', () => {
      const errorId = registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: ERROR_SEVERITY.MEDIUM
      });

      registrationErrorMonitoringService.resolveError(errorId, 'Fixed the issue');

      const error = registrationErrorMonitoringService.errors.find(e => e.id === errorId);
      expect(error.resolved).toBe(true);
      expect(error.resolution).toBe('Fixed the issue');
      expect(error.resolvedAt).toBeDefined();
    });
  });

  describe('Export', () => {
    test('should export errors for date range', () => {
      registrationErrorMonitoringService.trackError({
        category: ERROR_CATEGORIES.REGISTRATION,
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: ERROR_SEVERITY.MEDIUM
      });

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const exportData = registrationErrorMonitoringService.exportErrors(startDate, endDate);

      expect(exportData.totalErrors).toBe(1);
      expect(exportData.errors).toHaveLength(1);
      expect(exportData.dateRange.startDate).toEqual(startDate);
      expect(exportData.dateRange.endDate).toEqual(endDate);
    });
  });

  describe('Attempt Tracking', () => {
    test('should track registration attempts', () => {
      const attempt = registrationErrorMonitoringService.trackAttempt('registration', true, {
        email: 'test@example.com',
        role: 'client'
      });

      expect(attempt.type).toBe('registration');
      expect(attempt.success).toBe(true);
      expect(attempt.timestamp).toBeDefined();
    });
  });

  describe('Constants', () => {
    test('should export error categories', () => {
      expect(ERROR_CATEGORIES.REGISTRATION).toBe('registration');
      expect(ERROR_CATEGORIES.EMAIL_VERIFICATION).toBe('email_verification');
      expect(ERROR_CATEGORIES.TOKEN_GENERATION).toBe('token_generation');
      expect(ERROR_CATEGORIES.EMAIL_SENDING).toBe('email_sending');
    });

    test('should export error severity levels', () => {
      expect(ERROR_SEVERITY.LOW).toBe('low');
      expect(ERROR_SEVERITY.MEDIUM).toBe('medium');
      expect(ERROR_SEVERITY.HIGH).toBe('high');
      expect(ERROR_SEVERITY.CRITICAL).toBe('critical');
    });

    test('should export alert thresholds', () => {
      expect(ALERT_THRESHOLDS.ERROR_RATE_THRESHOLD).toBe(10);
      expect(ALERT_THRESHOLDS.EMAIL_FAILURE_THRESHOLD).toBe(3);
    });
  });
});
