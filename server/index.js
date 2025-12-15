require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { securityHeaders, enforceTLS, videoCallCorsOptions } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers - Apply first for all requests
app.use(securityHeaders);
app.use(enforceTLS);

// Helmet for additional security headers (configured for video calls)
app.use(helmet({
  contentSecurityPolicy: false, // We handle CSP in our custom middleware
  crossOriginEmbedderPolicy: false, // Disabled for WebRTC compatibility
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'sameorigin' }, // Allow same origin for video calls
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Enhanced CORS Configuration for Video Calls
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 CORS request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://smiling-steps-frontend.onrender.com',
      'https://smilingsteps.com',
      'https://www.smilingsteps.com',
      // Add development origins for video call testing
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
      console.warn('🚫 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-auth-token',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining', 
    'X-RateLimit-Reset',
    'Retry-After'
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours preflight cache
};
app.use(cors(corsOptions));

// Health check endpoint - should be accessible before auth
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Enhanced security headers for video calls
app.use((req, res, next) => {
  // Video call specific headers
  if (req.path.startsWith('/api/video-calls')) {
    // Allow WebRTC media access
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(self), display-capture=(self), geolocation=()'
    );
    
    // Enhanced CSP for video calls
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "media-src 'self' blob: mediastream:; " +
      "connect-src 'self' wss: ws: https://stun.l.google.com:19302 https://stun1.l.google.com:19302; " +
      "font-src 'self' data:; " +
      "worker-src 'self' blob:; " +
      "child-src 'self' blob:; " +
      "frame-src 'self'"
    );
  }
  
  // Rate limiting headers for video call endpoints
  if (req.path.startsWith('/api/video-calls') && req.method !== 'OPTIONS') {
    const rateLimitInfo = {
      limit: 100,
      window: '15 minutes',
      remaining: 99 // This would be calculated by actual rate limiter
    };
    
    res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
    res.setHeader('X-RateLimit-Window', rateLimitInfo.window);
  }
  
  next();
});

app.use(express.json());

// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin')} - ${new Date().toISOString()}`);
  next();
});

const startServer = async () => {
  const sequelize = await connectDB();

  // Schedule daily payment reconciliation
  const { scheduleReconciliation } = require('./scripts/schedule-reconciliation');
  scheduleReconciliation();

  // Initialize models
  const { DataTypes } = require('sequelize');
  const User = require('./models/User-sequelize')(sequelize, DataTypes);
  const Session = require('./models/Session-sequelize')(sequelize, DataTypes);
  const Blog = require('./models/Blog-sequelize')(sequelize, DataTypes);
  
  // Define associations
  User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
  User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
  Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
  Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
  
  // Blog associations
  User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
  Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
  
  // Make models globally available
  global.User = User;
  global.Session = Session;
  global.Blog = Blog;
  
  // Sync database (create tables if they don't exist)
  // Always sync to ensure tables exist, use alter to update existing tables safely
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ PostgreSQL connected and tables synchronized');
  } catch (syncError) {
    console.log('⚠️ Sync failed, trying basic connection...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected (basic mode)');
  }

  // Define Routes
  console.log('Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('  ✅ auth routes loaded.');
  app.use('/api/users', require('./routes/users'));
  console.log('  ✅ users routes loaded.');
  app.use('/api/upload', require('./routes/upload'));
  console.log('  ✅ upload routes loaded.');
  app.use('/api/admin', require('./routes/admin'));
  console.log('  ✅ admin routes loaded.');
  app.use('/api/admin/blogs', require('./routes/blogs'));
  console.log('  ✅ blog routes loaded.');
  app.use('/api/public', require('./routes/public'));
  console.log('  ✅ public routes loaded.');
  app.use('/api/sessions', require('./routes/sessions'));
  console.log('  ✅ sessions routes loaded.');
  app.use('/api/mpesa', require('./routes/mpesa'));
  console.log('  ✅ mpesa routes loaded.');
  app.use('/api/reconciliation', require('./routes/reconciliation'));
  console.log('  ✅ reconciliation routes loaded.');
  app.use('/api/real-time-reconciliation', require('./routes/realTimeReconciliation').router);
  console.log('  ✅ real-time reconciliation routes loaded.');
  app.use('/api/audit-logs', require('./routes/auditLogs'));
  console.log('  ✅ audit logs routes loaded.');
  app.use('/api/issue-resolution', require('./routes/issueResolution'));
  console.log('  ✅ issue resolution routes loaded.');
  app.use('/api/accounting', require('./routes/accounting'));
  console.log('  ✅ accounting routes loaded.');
  app.use('/api/fraud', require('./routes/fraudDetection'));
  console.log('  ✅ fraud detection routes loaded.');
  // Video calls routes with enhanced CORS
  app.use('/api/video-calls', cors(videoCallCorsOptions), require('./routes/videoCalls'));
  console.log('  ✅ video calls routes loaded with enhanced CORS.');
  app.use('/api/video-call-metrics', require('./routes/videoCallMetrics'));
  console.log('  ✅ video call metrics routes loaded.');
  app.use('/docs', require('./routes/docs'));
  console.log('  ✅ documentation routes loaded.');
  app.use('/api', require('./routes/make-admin'));
  console.log('  ✅ make-admin route loaded (TEMPORARY).');
  
  // Temporarily disabled routes (need model conversion):
  // app.use('/api/chat', require('./routes/chat'));
  // app.use('/api/assessments', require('./routes/assessments'));
  // app.use('/api/feedback', require('./routes/feedback'));
  // app.use('/api/checkins', require('./routes/checkins'));
  // app.use('/api/company', require('./routes/company'));
  
  console.log('✅ Core routes loaded (auth, users, upload, admin, public, sessions, mpesa)');
  console.log('⚠️  Assessment/chat routes temporarily disabled');

  // Start fraud model training scheduler
  try {
    const fraudModelScheduler = require('./scripts/schedule-fraud-model-training');
    fraudModelScheduler.start();
    console.log('✅ Fraud model training scheduler started');
  } catch (error) {
    console.error('⚠️ Failed to start fraud model scheduler:', error.message);
  }

  // Basic Route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Smiling Steps API is running!',
      timestamp: new Date().toISOString(),
      cors: 'Updated CORS configuration active',
      version: '2.1',
      status: 'Railway deployment active'
    });
  });

  // Test route for admin
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running', timestamp: new Date() });
  });

  // Create HTTP server for WebSocket support
  const http = require('http');
  const server = http.createServer(app);

  // Setup WebSocket server for real-time reconciliation
  const { setupWebSocketServer } = require('./routes/realTimeReconciliation');
  const wss = setupWebSocketServer(server);

  // Initialize video call service with Socket.io
  const { initializeVideoCallServer } = require('./services/videoCallService');
  const videoCallIO = initializeVideoCallServer(server);
  console.log('✅ Video call Socket.io server initialized');

  // Start real-time reconciliation service
  const realTimeReconciliationService = require('./services/realTimeReconciliation');
  
  // Start periodic reconciliation checks (every 15 minutes)
  const periodicInterval = realTimeReconciliationService.startPeriodicChecks(15);

  server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time reconciliation`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    
    // Stop real-time reconciliation service
    realTimeReconciliationService.stop();
    
    // Clear periodic interval
    if (periodicInterval) {
      clearInterval(periodicInterval);
    }
    
    // Close WebSocket server
    wss.close(() => {
      console.log('📡 WebSocket server closed');
    });
    
    // Close HTTP server
    server.close(() => {
      console.log('🛑 HTTP server closed');
      process.exit(0);
    });
  });
};

startServer();
