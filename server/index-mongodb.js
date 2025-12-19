require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database-mongodb');
const { initializeVideoCallServer } = require('./services/videoCallService');
const { securityHeaders, enforceTLS, videoCallCorsOptions } = require('./middleware/security');

const app = express();
const server = http.createServer(app);
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
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://smiling-steps-frontend.onrender.com',
      // Add development origins for video call testing
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
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

// Debug middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();
  
  // Load Mongoose models (they auto-register with mongoose)
  require('./models/User');
  require('./models/Session');
  require('./models/Blog');
  console.log('✅ Mongoose models loaded');

  // Initialize WebSocket server for video calls
  const io = initializeVideoCallServer(server);
  app.set('io', io);
  console.log('✅ WebSocket server initialized for video calls');

  // Define Routes
  console.log('Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('  ✅ auth routes loaded');
  app.use('/api/users', require('./routes/users-mongodb'));
  console.log('  ✅ users routes loaded');
  app.use('/api/email-verification', require('./routes/emailVerification'));
  console.log('  ✅ email verification routes loaded');
  app.use('/api/upload', require('./routes/upload'));
  console.log('  ✅ upload routes loaded');
  app.use('/api/admin', require('./routes/admin'));
  console.log('  ✅ admin routes loaded');
  app.use('/api/admin/blogs', require('./routes/blogs'));
  console.log('  ✅ blog routes loaded');
  app.use('/api/resources', require('./routes/resources'));
  console.log('  ✅ resource routes loaded');
  app.use('/api/public', require('./routes/public-mongodb'));
  console.log('  ✅ public routes loaded');
  app.use('/api/sessions', require('./routes/sessions'));
  console.log('  ✅ sessions routes loaded');
  app.use('/api/mpesa', require('./routes/mpesa'));
  console.log('  ✅ mpesa routes loaded');
  app.use('/api/reconciliation', require('./routes/reconciliation'));
  console.log('  ✅ reconciliation routes loaded');
  app.use('/api/trends', require('./routes/historicalTrends'));
  console.log('  ✅ historical trends routes loaded');
  // Video calls routes with enhanced CORS
  app.use('/api/video-calls', cors(videoCallCorsOptions), require('./routes/videoCalls'));
  console.log('  ✅ video call routes loaded with enhanced CORS.');
  
  console.log('✅ All routes loaded with MongoDB');

  // Basic Route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Smiling Steps API is running with MongoDB!',
      timestamp: new Date().toISOString(),
      database: 'MongoDB',
      version: '3.0'
    });
  });

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT} with MongoDB`);
    console.log(`✅ WebSocket server ready for video calls`);
    
    // Start session reminder jobs
    try {
      const { startReminderJobs } = require('./services/sessionReminderService');
      startReminderJobs();
      console.log('✅ Session reminder service started');
    } catch (error) {
      console.error('⚠️ Failed to start reminder service:', error.message);
      console.error('   Reminders will not be sent. Check SMS configuration.');
    }
  });
};

startServer();
