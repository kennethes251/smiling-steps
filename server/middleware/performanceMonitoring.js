/**
 * Performance Monitoring Middleware
 * 
 * Tracks response times for all requests and specific endpoints
 * Integrates with performance metrics service for analysis
 */

const performanceMetricsService = require('../services/performanceMetricsService');
const { logger } = require('../utils/logger');

/**
 * General response time tracking middleware
 */
const responseTimeMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Track specific endpoints
    const endpoint = `${req.method} ${req.path}`;
    
    // Track booking page loads
    if (req.path.includes('/booking') && req.method === 'GET') {
      performanceMetricsService.trackResponseTime('booking_page_load', responseTime);
    }
    
    // Track booking submissions
    if (req.path.includes('/sessions') && req.method === 'POST') {
      performanceMetricsService.trackResponseTime('booking_submission', responseTime);
    }
    
    // Track M-Pesa payment initiations
    if (req.path.includes('/mpesa') && req.method === 'POST') {
      performanceMetricsService.trackResponseTime('mpesa_initiation', responseTime);
    }
    
    // Log slow requests (>2 seconds for booking, >3 seconds for M-Pesa)
    const isBookingEndpoint = req.path.includes('/booking') || req.path.includes('/sessions');
    const isMpesaEndpoint = req.path.includes('/mpesa');
    
    if ((isBookingEndpoint && responseTime > 2000) || 
        (isMpesaEndpoint && responseTime > 3000) ||
        (!isBookingEndpoint && !isMpesaEndpoint && responseTime > 5000)) {
      logger.warn('Slow request detected', {
        endpoint,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Booking funnel tracking middleware
 */
const bookingFunnelMiddleware = (req, res, next) => {
  // Track booking funnel steps
  if (req.path.includes('/booking') && req.method === 'GET') {
    const userId = req.user?.id || req.ip; // Use user ID if available, otherwise IP
    performanceMetricsService.trackBookingStep(userId, 'started');
  }
  
  if (req.path.includes('/sessions') && req.method === 'POST') {
    const userId = req.user?.id || req.ip;
    performanceMetricsService.trackBookingStep(userId, 'submitted');
    
    // Track booking start time for completion tracking
    req.bookingStartTime = Date.now();
  }
  
  next();
};

/**
 * Payment tracking middleware
 */
const paymentTrackingMiddleware = (req, res, next) => {
  if (req.path.includes('/mpesa') && req.method === 'POST') {
    const originalJson = res.json;
    res.json = function(data) {
      // Track payment attempt
      const sessionId = req.body?.sessionId || req.params?.sessionId;
      const userId = req.user?.id || req.ip;
      const amount = req.body?.amount;
      const success = res.statusCode >= 200 && res.statusCode < 300;
      const errorCode = success ? null : res.statusCode;
      
      if (sessionId) {
        performanceMetricsService.trackPaymentAttempt(sessionId, userId, amount, success, errorCode);
      }
      
      originalJson.call(this, data);
    };
  }
  
  next();
};

/**
 * Session completion tracking middleware
 */
const sessionCompletionMiddleware = (req, res, next) => {
  // Track when sessions are marked as completed/confirmed
  if (req.path.includes('/sessions') && (req.method === 'PUT' || req.method === 'PATCH')) {
    const originalJson = res.json;
    res.json = function(data) {
      const userId = req.user?.id || req.ip;
      const success = res.statusCode >= 200 && res.statusCode < 300;
      
      // If this was a booking completion and we have start time
      if (success && req.bookingStartTime) {
        const endTime = Date.now();
        performanceMetricsService.trackBookingCompletion(userId, req.bookingStartTime, endTime, true);
        performanceMetricsService.trackBookingStep(userId, 'completed');
      }
      
      originalJson.call(this, data);
    };
  }
  
  next();
};

/**
 * Combined performance monitoring middleware
 */
const performanceMonitoringMiddleware = [
  responseTimeMiddleware,
  bookingFunnelMiddleware,
  paymentTrackingMiddleware,
  sessionCompletionMiddleware
];

module.exports = {
  responseTimeMiddleware,
  bookingFunnelMiddleware,
  paymentTrackingMiddleware,
  sessionCompletionMiddleware,
  performanceMonitoringMiddleware
};