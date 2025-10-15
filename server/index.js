require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Render only
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://smiling-steps-frontend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Additional CORS headers for Render deployment
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://smiling-steps-frontend.onrender.com'
  ];
  
  console.log('🌐 CORS Check - Origin:', origin, 'Allowed:', allowedOrigins.includes(origin));
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
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

const startServer = async () => {
  const sequelize = await connectDB();

  // Initialize models
  const { DataTypes } = require('sequelize');
  const User = require('./models/User')(sequelize, DataTypes);
  const Session = require('./models/Session-sequelize')(sequelize, DataTypes);
  
  // Define associations
  User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
  User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
  Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
  Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
  
  // Make models globally available
  global.User = User;
  global.Session = Session;
  
  // Sync database (create tables if they don't exist)
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  console.log('✅ PostgreSQL connected and tables synchronized');

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
  // app.use('/api/sessions', require('./routes/sessions'));
  // console.log('  ✅ sessions routes loaded.');
  app.use('/api', require('./routes/make-admin'));
  console.log('  ✅ make-admin route loaded (TEMPORARY).');
  
  // Temporarily disabled routes (need model conversion):
  // app.use('/api/chat', require('./routes/chat'));
  // app.use('/api/assessments', require('./routes/assessments'));
  // app.use('/api/feedback', require('./routes/feedback'));
  // app.use('/api/checkins', require('./routes/checkins'));
  // app.use('/api/company', require('./routes/company'));
  
  console.log('✅ Core routes loaded (auth, users, upload, admin, public, sessions)');
  console.log('⚠️  Assessment/chat routes temporarily disabled');

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

  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

startServer();
