console.log('🚀 Starting server...');

try {
  console.log('📦 Loading dotenv...');
  require('dotenv').config();
  console.log('✅ Dotenv loaded');

  console.log('📦 Loading express...');
  const express = require('express');
  console.log('✅ Express loaded');

  console.log('📦 Loading cors...');
  const cors = require('cors');
  console.log('✅ CORS loaded');

  console.log('📦 Loading mongoose...');
  const mongoose = require('mongoose');
  console.log('✅ Mongoose loaded');
} catch (error) {
  console.error('❌ Error loading dependencies:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Temporary very permissive CORS for debugging
const corsOptions = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Additional CORS headers as backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin')} - ${new Date().toISOString()}`);
  next();
});

// Connect to MongoDB
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in .env file.');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection failed. Please check your connection string and network access.');
    console.error('Error details:', JSON.stringify(err, null, 2));
    // Use a timeout to ensure logs are written before exiting
    setTimeout(() => process.exit(1), 1000);
  }
};

const startServer = async () => {
  console.log('🔗 Connecting to database...');
  await connectDB();

  console.log('📋 Loading models...');
  try {
    require('./models/User');
    console.log('✅ User model loaded');
    require('./models/Session');
    console.log('✅ Session model loaded');
    require('./models/Assessment');
    console.log('✅ Assessment model loaded');
    require('./models/AssessmentResult');
    console.log('✅ AssessmentResult model loaded');
    require('./models/Feedback');
    console.log('✅ Feedback model loaded');
    require('./models/CheckIn');
    console.log('✅ CheckIn model loaded');
    require('./models/Blog');
    console.log('✅ Blog model loaded');
    require('./models/Resource');
    console.log('✅ Resource model loaded');
  } catch (error) {
    console.error('❌ Error loading models:', error);
    process.exit(1);
  }

  // Define Routes
  console.log('Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('  ✅ auth routes loaded.');
  app.use('/api/chat', require('./routes/chat'));
  console.log('  ✅ chat routes loaded.');
  app.use('/api/users', require('./routes/users'));
  console.log('  ✅ users routes loaded.');
  app.use('/api/sessions', require('./routes/sessions'));
  console.log('  ✅ sessions routes loaded.');
  app.use('/api/assessments', require('./routes/assessments'));
  console.log('  ✅ assessments routes loaded.');
  const feedbackRoutes = require('./routes/feedback');
  app.use('/api/feedback', feedbackRoutes);
  console.log('  ✅ feedback routes loaded.');
  app.use('/api/checkins', require('./routes/checkins'));
  console.log('  ✅ checkins routes loaded.');
  app.use('/api/admin', require('./routes/admin'));
  console.log('  ✅ admin routes loaded.');
  app.use('/api/upload', require('./routes/upload'));
  console.log('  ✅ upload routes loaded.');
  app.use('/api/company', require('./routes/company'));
  console.log('  ✅ company routes loaded.');
  app.use('/api/public', require('./routes/public'));
  console.log('  ✅ public routes loaded.');
  console.log('All routes loaded successfully.');

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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });
};

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🎯 Starting server process...');
startServer().catch(error => {
  console.error('❌ Fatal server error:', error);
  process.exit(1);
});
