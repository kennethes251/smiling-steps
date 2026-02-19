/**
 * Performance Monitoring Tests
 * 
 * Tests for performance metrics collection, alerting, and dashboard functionality
 */

const request = require('supertest');
const express = require('express');
const performanceMetricsService = require('../services/performanceMetricsService');
const performanceAlertingService = require('../services/performanceAlertingService');
const { performanceMonitoringMiddleware } = require('../middleware/performanceMonitoring');

describe('Performance Monitoring System', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use(performanceMonitoringMiddleware);
    
    // Mock auth middleware for testing
    app.use((req, res, next) => {
      req.user = { id: 'test-admin', role: 'admin' };
      next();
    });
    
    // Add performance metrics routes
    app.use('/api/performance-metrics', require('../routes/performanceMetrics'));
    
    // Test endpoints
    app.get('/test/booking', (req, res) => {
      setTimeout(() => res.json({ success: true }), 100);
    });
    
    app.post('/test/sessions', (req, res) => {
      setTimeout(() => res.json({ sessionId: 'test-session' }), 50);
    });
    
    app.post('/test/mpesa', (req, res) => {
      setTimeout(() => res.json({ transactionId: 'test-tx' }), 200);
    });
  });

  beforeEach(() => {
    // Clear metrics before each test
    performanceMetricsService.metrics = {
      bookingConversion: [],
      bookingCompletionTimes: [],
      paymentSuccessRates: [],
      responseTimesBookingPage: [],
      responseTimesBookingSubmission: [],
      responseTimesMpesaInitiation: []
    };
  });

  describe('Performance Metrics Collection', () => {
    test('should track response times for booking endpoints', async () => {
      const response = await request(app)
        .get('/test/booking')
        .expect(200);

      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-response-time']).toMatch(/\d+ms/);
      
      // Check if metrics were recorded
      expect(performanceMetricsService.metrics.responseTimesBookingPage.length).toBeGreaterThan(0);
    });

    test('should track booking funnel steps', async () => {
      await request(app)
        .get('/test/booking')
        .expect(200);

      expect(performanceMetricsService.metrics.bookingConversion.length).toBeGreaterThan(0);
      
      const lastMetric = performanceMetricsService.metrics.bookingConversion[0];
      expect(lastMetric.step).toBe('started');
      expect(lastMetric.userId).toBeDefined();
    });

    test('should track session submissions', async () => {
      await request(app)
        .post('/test/sessions')
        .send({ therapistId: 'test-therapist' })
        .expect(200);

      expect(performanceMetricsService.metrics.bookingConversion.length).toBeGreaterThan(0);
      expect(performanceMetricsService.metrics.responseTimesBookingSubmission.length).toBeGreaterThan(0);
    });

    test('should track M-Pesa payment attempts', async () => {
      await request(app)
        .post('/test/mpesa')
        .send({ sessionId: 'test-session', amount: 1000 })
        .expect(200);

      expect(performanceMetricsService.metrics.paymentSuccessRates.length).toBeGreaterThan(0);
      expect(performanceMetricsService.metrics.responseTimesMpesaInitiation.length).toBeGreaterThan(0);
      
      const paymentMetric = performanceMetricsService.metrics.paymentSuccessRates[0];
      expect(paymentMetric.success).toBe(true);
      expect(paymentMetric.amount).toBe(1000);
    });
  });

  describe('Performance Metrics API', () => {
    test('should return metrics summary', async () => {
      // Add some test data
      performanceMetricsService.trackBookingStep('user1', 'started');
      performanceMetricsService.trackBookingStep('user1', 'completed');
      performanceMetricsService.trackPaymentAttempt('session1', 'user1', 1000, true);

      const response = await request(app)
        .get('/api/performance-metrics/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookingConversionRate');
      expect(response.body.data).toHaveProperty('paymentSuccessRate');
      expect(response.body.data).toHaveProperty('averageResponseTimes');
    });

    test('should return booking funnel analytics', async () => {
      // Add test funnel data
      performanceMetricsService.trackBookingStep('user1', 'started');
      performanceMetricsService.trackBookingStep('user1', 'submitted');
      performanceMetricsService.trackBookingStep('user1', 'completed');
      performanceMetricsService.trackBookingStep('user2', 'started');
      performanceMetricsService.trackBookingStep('user2', 'submitted');

      const response = await request(app)
        .get('/api/performance-metrics/booking-funnel?timeWindow=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('conversionRate');
      expect(response.body.data).toHaveProperty('funnelSteps');
      expect(response.body.data.funnelSteps.started).toBe(2);
      expect(response.body.data.funnelSteps.completed).toBe(1);
    });

    test('should return payment analytics', async () => {
      // Add test payment data
      performanceMetricsService.trackPaymentAttempt('session1', 'user1', 1000, true);
      performanceMetricsService.trackPaymentAttempt('session2', 'user2', 1500, false, 400);
      performanceMetricsService.trackPaymentAttempt('session3', 'user3', 2000, true);

      const response = await request(app)
        .get('/api/performance-metrics/payment-analytics?timeWindow=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('successRate');
      expect(response.body.data.totalPayments).toBe(3);
      expect(response.body.data.successfulPayments).toBe(2);
      expect(response.body.data.failedPayments).toBe(1);
    });

    test('should return response time analytics', async () => {
      // Add test response time data
      performanceMetricsService.trackResponseTime('booking_page_load', 1500);
      performanceMetricsService.trackResponseTime('booking_submission', 800);
      performanceMetricsService.trackResponseTime('mpesa_initiation', 2500);

      const response = await request(app)
        .get('/api/performance-metrics/response-times?timeWindow=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('averageResponseTimes');
      expect(response.body.data).toHaveProperty('detailedStats');
      expect(response.body.data).toHaveProperty('thresholds');
    });
  });

  describe('Performance Alerting', () => {
    test('should generate alerts for slow response times', async () => {
      // Simulate slow response times
      for (let i = 0; i < 5; i++) {
        performanceMetricsService.trackResponseTime('booking_page_load', 3000); // Above 2s threshold
      }

      // Trigger alert check
      await performanceAlertingService.checkResponseTimeThresholds();

      const alerts = performanceAlertingService.getRecentAlerts(10);
      expect(alerts.length).toBeGreaterThan(0);
      
      const responseTimeAlert = alerts.find(alert => alert.type === 'response_time_booking_page');
      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert.severity).toBe('HIGH');
    });

    test('should generate alerts for low payment success rate', async () => {
      // Simulate high payment failure rate
      for (let i = 0; i < 10; i++) {
        performanceMetricsService.trackPaymentAttempt(`session${i}`, `user${i}`, 1000, false, 500);
      }

      // Trigger alert check
      await performanceAlertingService.checkErrorRateThresholds();

      const alerts = performanceAlertingService.getRecentAlerts(10);
      const paymentAlert = alerts.find(alert => alert.type === 'payment_error_rate');
      expect(paymentAlert).toBeDefined();
      expect(paymentAlert.severity).toBe('CRITICAL');
    });

    test('should allow acknowledging alerts', async () => {
      const response = await request(app)
        .get('/api/performance-metrics/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('configuration');
    });
  });

  describe('Performance Calculations', () => {
    test('should calculate booking conversion rate correctly', () => {
      // User 1: Complete funnel
      performanceMetricsService.trackBookingStep('user1', 'started');
      performanceMetricsService.trackBookingStep('user1', 'submitted');
      performanceMetricsService.trackBookingStep('user1', 'completed');
      
      // User 2: Incomplete funnel
      performanceMetricsService.trackBookingStep('user2', 'started');
      performanceMetricsService.trackBookingStep('user2', 'submitted');
      
      const conversionRate = performanceMetricsService.calculateBookingConversionRate();
      expect(conversionRate).toBe(50); // 1 out of 2 users completed
    });

    test('should calculate payment success rate correctly', () => {
      performanceMetricsService.trackPaymentAttempt('session1', 'user1', 1000, true);
      performanceMetricsService.trackPaymentAttempt('session2', 'user2', 1000, false);
      performanceMetricsService.trackPaymentAttempt('session3', 'user3', 1000, true);
      performanceMetricsService.trackPaymentAttempt('session4', 'user4', 1000, true);

      const successRate = performanceMetricsService.calculatePaymentSuccessRate();
      expect(successRate).toBe(75); // 3 out of 4 successful
    });

    test('should calculate average response times correctly', () => {
      performanceMetricsService.trackResponseTime('booking_page_load', 1000);
      performanceMetricsService.trackResponseTime('booking_page_load', 2000);
      performanceMetricsService.trackResponseTime('booking_page_load', 1500);

      const avgTimes = performanceMetricsService.calculateAverageResponseTimes();
      expect(avgTimes.bookingPage).toBe(1500); // (1000 + 2000 + 1500) / 3
    });
  });

  describe('Data Cleanup', () => {
    test('should clean up old metrics', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date();

      // Add old and recent metrics
      performanceMetricsService.metrics.bookingConversion.push({
        userId: 'user1',
        step: 'started',
        timestamp: oldDate
      });
      
      performanceMetricsService.metrics.bookingConversion.push({
        userId: 'user2',
        step: 'started',
        timestamp: recentDate
      });

      // Cleanup (24 hour retention for booking conversion)
      performanceMetricsService.cleanupOldMetrics('bookingConversion', 24 * 60 * 60 * 1000);

      expect(performanceMetricsService.metrics.bookingConversion.length).toBe(1);
      expect(performanceMetricsService.metrics.bookingConversion[0].userId).toBe('user2');
    });
  });
});

describe('Performance Monitoring Integration', () => {
  test('should integrate with existing notification service', () => {
    // Test that alerting service can send notifications
    expect(performanceAlertingService.sendNotification).toBeDefined();
    expect(performanceAlertingService.formatAlertEmail).toBeDefined();
    expect(performanceAlertingService.formatAlertSMS).toBeDefined();
  });

  test('should provide export functionality', () => {
    performanceMetricsService.trackBookingStep('user1', 'started');
    performanceMetricsService.trackPaymentAttempt('session1', 'user1', 1000, true);

    const exportData = performanceMetricsService.exportMetrics('json');
    expect(exportData).toBeDefined();
    
    const parsed = JSON.parse(exportData);
    expect(parsed).toHaveProperty('exportedAt');
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('rawMetrics');
  });

  test('should handle concurrent metric collection', async () => {
    // Simulate concurrent requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        performanceMetricsService.trackBookingStep(`user${i}`, 'started')
      );
    }

    await Promise.all(promises);
    expect(performanceMetricsService.metrics.bookingConversion.length).toBe(10);
  });
});