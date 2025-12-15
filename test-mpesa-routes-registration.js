/**
 * Test script to verify M-Pesa routes are properly registered
 * This script checks the route structure without requiring database connection
 */

const express = require('express');

// Mock the database connection
const mockConnectDB = async () => {
  const { Sequelize, DataTypes } = require('sequelize');
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });
  return sequelize;
};

// Mock the models
const mockModels = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    role: DataTypes.STRING
  });

  const Session = sequelize.define('Session', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: DataTypes.STRING,
    paymentStatus: DataTypes.STRING,
    price: DataTypes.DECIMAL,
    mpesaCheckoutRequestID: DataTypes.STRING,
    mpesaMerchantRequestID: DataTypes.STRING,
    mpesaTransactionID: DataTypes.STRING
  });

  const Blog = sequelize.define('Blog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: DataTypes.STRING
  });

  return { User, Session, Blog };
};

async function testRouteRegistration() {
  console.log('🧪 Testing M-Pesa Route Registration...\n');

  try {
    // Create a test Express app
    const app = express();
    app.use(express.json());

    // Mock database connection
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });
    
    // Create mock models
    const { User, Session, Blog } = mockModels(sequelize, DataTypes);
    
    // Set up associations
    User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
    User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
    User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
    Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
    
    // Make models globally available
    global.User = User;
    global.Session = Session;
    global.Blog = Blog;

    // Sync database
    await sequelize.sync();

    // Load the mpesa routes
    const mpesaRoutes = require('./server/routes/mpesa');
    app.use('/api/mpesa', mpesaRoutes);

    console.log('✅ M-Pesa routes loaded successfully');

    // Check if routes are registered
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods)
        });
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const path = middleware.regexp.source
              .replace('\\/?', '')
              .replace('(?=\\/|$)', '')
              .replace(/\\\//g, '/')
              .replace('^', '');
            routes.push({
              path: path + handler.route.path,
              methods: Object.keys(handler.route.methods)
            });
          }
        });
      }
    });

    console.log('\n📋 Registered M-Pesa Routes:');
    const mpesaRoutes_list = routes.filter(r => r.path.includes('mpesa'));
    
    if (mpesaRoutes_list.length === 0) {
      console.log('⚠️  No M-Pesa routes found in registration');
    } else {
      mpesaRoutes_list.forEach(route => {
        console.log(`   ${route.methods.join(', ').toUpperCase()} ${route.path}`);
      });
    }

    // Expected routes
    const expectedRoutes = [
      { method: 'POST', path: '/api/mpesa/initiate' },
      { method: 'POST', path: '/api/mpesa/callback' },
      { method: 'GET', path: '/api/mpesa/status/:sessionId' },
      { method: 'POST', path: '/api/mpesa/test-connection' }
    ];

    console.log('\n📋 Expected M-Pesa Routes:');
    expectedRoutes.forEach(route => {
      console.log(`   ${route.method} ${route.path}`);
    });

    // Verify all expected routes are present
    console.log('\n🔍 Verification:');
    let allRoutesPresent = true;
    
    expectedRoutes.forEach(expected => {
      const found = mpesaRoutes_list.some(r => 
        r.path.includes(expected.path.replace(':sessionId', '')) &&
        r.methods.includes(expected.method.toLowerCase())
      );
      
      if (found) {
        console.log(`   ✅ ${expected.method} ${expected.path}`);
      } else {
        console.log(`   ❌ ${expected.method} ${expected.path} - NOT FOUND`);
        allRoutesPresent = false;
      }
    });

    if (allRoutesPresent) {
      console.log('\n✅ SUCCESS: All M-Pesa routes are properly registered!');
      console.log('\n📝 Route Registration Summary:');
      console.log('   - POST /api/mpesa/initiate - Initiate M-Pesa payment');
      console.log('   - POST /api/mpesa/callback - Receive M-Pesa callbacks');
      console.log('   - GET /api/mpesa/status/:sessionId - Check payment status');
      console.log('   - POST /api/mpesa/test-connection - Test API connectivity (Admin)');
      return true;
    } else {
      console.log('\n❌ FAILURE: Some M-Pesa routes are missing!');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Error testing route registration:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testRouteRegistration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
