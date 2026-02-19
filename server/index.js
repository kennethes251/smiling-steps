require('dotenv').config();

// Validate environment before starting
const { validateEnvironment, getEnvironmentConfig } = require('./config/environmentValidator');
validateEnvironment();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');

// Import new enhanced modules
const { initializeDatabase } = require('./config/databaseResilience');
const { logger, httpLogger } = require('./utils/logger');
const { 
  globalErrorHandler, 
  notFoundHandler, 
  setupGlobalErrorHandlers 
} = require('./middleware/errorHandler');
const { smartRateLimiter } = require('./middleware/rateLimiting');
const { 
  getCorsConfig, 
  getHelmetConfig, 
  securityHeadersMiddleware, 
  tlsEnforcementMiddleware 
} = require('./config/securityConfig');
const { initializeVideoCallServer } = require('./services/videoCallService');
const { initializeChatRoomSocket } = require('./services/chatRoomSocketService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Get environment-specific configuration
const environment = process.env.NODE_ENV || 'development';
const config = getEnvironmentConfig(environment);

logger.info('🚀 Starting Smiling Steps API', {
  environment,
  port: PORT,
  nodeVersion: process.version,
  version: process.env.APP_VERSION || '3.0'
});

// Setup global error handlers for unhandled rejections/exceptions
setupGlobalErrorHandlers();

// Security Headers - Apply first for all requests
app.use(securityHeadersMiddleware);
app.use(tlsEnforcementMiddleware);

// Helmet for additional security headers
const helmetConfig = getHelmetConfig(environment);
app.use(helmet(helmetConfig));

// CORS Configuration - Environment-based
const corsConfig = getCorsConfig(environment);
app.use(cors(corsConfig));

// Rate limiting - Apply before other middleware
app.use(smartRateLimiter);

// Request logging
app.use(httpLogger);

// Performance monitoring middleware
const { performanceMonitoringMiddleware } = require('./middleware/performanceMonitoring');
app.use(performanceMonitoringMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint - Enhanced with database status
app.get('/health', async (req, res) => {
  try {
    const { dbConnection } = require('./config/databaseResilience');
    const dbHealth = await dbConnection.getHealthStatus();
    
    const health = {
      status: dbHealth.status === 'connected' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      database: dbHealth.status,
      environment,
      version: process.env.APP_VERSION || '3.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
    
    if (dbHealth.responseTime) {
      health.databaseResponseTime = dbHealth.responseTime;
    }
    
    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

const startServer = async () => {
  try {
    logger.info('🔄 Initializing server components...');
    
    // Connect to MongoDB with resilience
    await initializeDatabase();
    
    // Load Mongoose models (they auto-register with mongoose)
    require('./models/User');
    require('./models/Session');
    require('./models/Blog');
    logger.info('✅ Mongoose models loaded');

    // Initialize production email service
    try {
      const productionEmailService = require('./services/productionEmailService');
      await productionEmailService.initialize();
      logger.info('✅ Production email service initialized');
    } catch (emailError) {
      logger.warn('⚠️ Email service initialization warning', { 
        error: emailError.message,
        note: 'Email functionality may be limited. Check email configuration.'
      });
    }

    // Initialize WebSocket server for video calls
    const io = initializeVideoCallServer(server);
    app.set('io', io);
    logger.info('✅ WebSocket server initialized for video calls');
    
    // Initialize WebSocket namespace for chat rooms
    const chatIO = initializeChatRoomSocket(io);
    app.set('chatIO', chatIO);
    logger.info('✅ WebSocket namespace initialized for chat rooms');

    // Define Routes with error handling
    logger.info('🔄 Loading API routes...');
    
    try {
      app.use('/api/auth', require('./routes/auth'));
      logger.info('  ✅ auth routes loaded');
      
      app.use('/api/users', require('./routes/users-mongodb-fixed'));
      logger.info('  ✅ users routes loaded');
      
      app.use('/api/profile', require('./routes/profile'));
      logger.info('  ✅ profile routes loaded');
      
      app.use('/api/users/availability', require('./routes/availability'));
      logger.info('  ✅ availability routes loaded');
      
      app.use('/api/users/earnings', require('./routes/earnings'));
      logger.info('  ✅ earnings routes loaded');
      
      app.use('/api/email-verification', require('./routes/emailVerification'));
      logger.info('  ✅ email verification routes loaded');
      
      app.use('/api/credentials', require('./routes/credentials'));
      logger.info('  ✅ credentials routes loaded');
      
      app.use('/api/upload', require('./routes/upload'));
      logger.info('  ✅ upload routes loaded');
      
      app.use('/api/admin', require('./routes/admin'));
      logger.info('  ✅ admin routes loaded');
      
      app.use('/api/admin/blogs', require('./routes/blogs'));
      logger.info('  ✅ blog routes loaded');
      
      app.use('/api/resources', require('./routes/resources'));
      logger.info('  ✅ resource routes loaded');
      
      app.use('/api/public', require('./routes/public-mongodb'));
      logger.info('  ✅ public routes loaded');
      
      app.use('/api/sessions', require('./routes/sessions'));
      logger.info('  ✅ sessions routes loaded');
      
      app.use('/api/feedback', require('./routes/feedback'));
      logger.info('  ✅ feedback routes loaded');
      
      app.use('/api/mpesa', require('./routes/mpesa'));
      logger.info('  ✅ mpesa routes loaded');
      
      // Manual payment verification routes (Till Number + Confirmation Code)
      app.use('/api/manual-payments', require('./routes/manualPayments'));
      logger.info('  ✅ manual payment routes loaded');
      
      app.use('/api/reconciliation', require('./routes/reconciliation'));
      logger.info('  ✅ reconciliation routes loaded');
      
      app.use('/api', require('./routes/cancellations'));
      logger.info('  ✅ cancellation routes loaded');
      
      app.use('/api', require('./routes/rescheduling'));
      logger.info('  ✅ rescheduling routes loaded');
      
      app.use('/api/trends', require('./routes/historicalTrends'));
      logger.info('  ✅ historical trends routes loaded');
      
      // Video calls routes with enhanced CORS
      app.use('/api/video-calls', require('./routes/videoCalls'));
      logger.info('  ✅ video call routes loaded');
      
      // Reminder routes
      app.use('/api/reminders', require('./routes/reminders'));
      logger.info('  ✅ reminder routes loaded');
      
      // Notification preferences routes
      app.use('/api/notification-preferences', require('./routes/notificationPreferences'));
      logger.info('  ✅ notification preferences routes loaded');
      
      // Availability windows routes (enhanced availability management)
      app.use('/api/availability-windows', require('./routes/availabilityWindows'));
      logger.info('  ✅ availability windows routes loaded');
      
      // Session notes routes (versioned, encrypted notes - Requirement 11.3)
      app.use('/api/session-notes', require('./routes/sessionNotes'));
      logger.info('  ✅ session notes routes loaded');
      
      // Session export routes (PDF reports - Requirement 11.5)
      app.use('/api/session-export', require('./routes/sessionExport'));
      logger.info('  ✅ session export routes loaded');
      
      // Client export routes (Client session history PDF - Requirement 12.5)
      app.use('/api/client-export', require('./routes/clientExport'));
      logger.info('  ✅ client export routes loaded');
      
      // Session rates routes (Rate management - Requirements 14.1, 14.2, 14.3, 14.4, 14.5)
      app.use('/api', require('./routes/sessionRates'));
      logger.info('  ✅ session rates routes loaded');
      
      // Performance metrics routes (Performance monitoring - Requirements 13.1, 13.2, 13.3, 13.4, 13.5)
      app.use('/api/performance-metrics', require('./routes/performanceMetrics'));
      logger.info('  ✅ performance metrics routes loaded');
      
      // Security monitoring routes (Breach detection and alerting - Requirement 10.5)
      app.use('/api/security-monitoring', require('./routes/securityMonitoring'));
      logger.info('  ✅ security monitoring routes loaded');
      
      // Email health monitoring routes (Production email service)
      app.use('/api/email', require('./routes/emailHealth'));
      logger.info('  ✅ email health routes loaded');
      
      // Registration monitoring routes (Error monitoring for registration system)
      app.use('/api/registration-monitoring', require('./routes/registrationMonitoring'));
      logger.info('  ✅ registration monitoring routes loaded');
      
      // Registration performance routes (Performance monitoring for registration system)
      app.use('/api/registration-performance', require('./routes/registrationPerformance'));
      logger.info('  ✅ registration performance routes loaded');
      
      // Registration security audit routes (Security audit for registration system)
      app.use('/api/registration-security', require('./routes/registrationSecurityAudit'));
      logger.info('  ✅ registration security audit routes loaded');
      
      // Registration analytics routes (Post-launch monitoring and analytics)
      app.use('/api/registration-analytics', require('./routes/registrationAnalytics'));
      logger.info('  ✅ registration analytics routes loaded');
      
      // Content management routes (Social media management - Requirements 1.1-1.5)
      app.use('/api/admin/content', require('./routes/content'));
      logger.info('  ✅ content management routes loaded');
      
      // Chat routes (Client-Psychologist messaging)
      app.use('/api/chat', require('./routes/chat'));
      logger.info('  ✅ chat routes loaded');
      
      // Chat room routes (Group chat rooms with moderation)
      app.use('/api/chat-rooms', require('./routes/chatRooms'));
      logger.info('  ✅ chat room routes loaded');
      
    } catch (routeError) {
      logger.error('❌ Failed to load routes', { error: routeError.message });
      throw routeError;
    }
    
    logger.info('✅ All routes loaded successfully');

    // Basic Route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Smiling Steps API is running with enhanced security!',
        timestamp: new Date().toISOString(),
        database: 'MongoDB',
        version: process.env.APP_VERSION || '3.0',
        environment
      });
    });
    
    // 404 handler for unmatched routes
    app.use(notFoundHandler);
    
    // Global error handler (must be last)
    app.use(globalErrorHandler);

    // Start the server
    server.listen(PORT, () => {
      logger.info('🎉 Server started successfully', {
        port: PORT,
        environment,
        database: 'MongoDB',
        security: 'Enhanced',
        cors: config.allowedOrigins.length > 0 ? 'Configured' : 'Default'
      });
      
      logger.info('✅ WebSocket server ready for video calls');
      
      // Start session reminder jobs
      try {
        const { startReminderJobs } = require('./services/reminderSchedulerService');
        startReminderJobs();
        logger.info('✅ Automated reminder scheduler started');
      } catch (error) {
        logger.warn('⚠️ Failed to start reminder scheduler', { 
          error: error.message,
          note: 'Reminders will not be sent. Check email/SMS configuration.'
        });
      }
    });
    
  } catch (error) {
    logger.error('🚨 Failed to start server', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Graceful shutdown on startup failure
    process.exit(1);
  }
};

startServer();
