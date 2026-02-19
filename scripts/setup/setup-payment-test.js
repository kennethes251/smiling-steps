/**
 * Setup Script for Manual Payment System Testing
 * 
 * This script:
 * 1. Creates test users (admin, psychologist, client)
 * 2. Creates a test session in "Approved" status
 * 3. Outputs credentials and instructions
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';

async function setup() {
  console.log('🚀 Setting up Manual Payment System Test Environment');
  console.log('=' .repeat(60));
  
  try {
    // Connect to MongoDB with extended timeout
    console.log('\n📦 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.substring(0, 30) + '...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });
    console.log('✅ Connected to MongoDB');
    
    // Load models
    const User = require('./server/models/User');
    const Session = require('./server/models/Session');
    
    // Test credentials
    const testPassword = 'Test123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // 1. Create Admin User
    console.log('\n👤 Creating test users...');
    
    let admin = await User.findOne({ email: 'admin@test.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isEmailVerified: true
      });
      console.log('✅ Created admin: admin@test.com');
    } else {
      // Update password in case it changed
      admin.password = hashedPassword;
      admin.isVerified = true;
      admin.isEmailVerified = true;
      await admin.save();
      console.log('✅ Admin exists: admin@test.com (password reset)');
    }
    
    // 2. Create Psychologist User
    let psychologist = await User.findOne({ email: 'psychologist@test.com' });
    if (!psychologist) {
      psychologist = await User.create({
        name: 'Dr. Test Psychologist',
        email: 'psychologist@test.com',
        password: hashedPassword,
        role: 'psychologist',
        isVerified: true,
        isEmailVerified: true,
        approvalStatus: 'approved',
        psychologistDetails: {
          approvalStatus: 'approved',
          specializations: ['Anxiety', 'Depression'],
          sessionRate: 2500
        }
      });
      console.log('✅ Created psychologist: psychologist@test.com');
    } else {
      psychologist.password = hashedPassword;
      psychologist.isVerified = true;
      psychologist.isEmailVerified = true;
      psychologist.approvalStatus = 'approved';
      await psychologist.save();
      console.log('✅ Psychologist exists: psychologist@test.com (password reset)');
    }
    
    // 3. Create Client User
    let client = await User.findOne({ email: 'client@test.com' });
    if (!client) {
      client = await User.create({
        name: 'Test Client',
        email: 'client@test.com',
        password: hashedPassword,
        role: 'client',
        isVerified: true,
        isEmailVerified: true
      });
      console.log('✅ Created client: client@test.com');
    } else {
      client.password = hashedPassword;
      client.isVerified = true;
      client.isEmailVerified = true;
      await client.save();
      console.log('✅ Client exists: client@test.com (password reset)');
    }
    
    // 4. Create a test session in "Approved" status (ready for payment)
    console.log('\n📅 Creating test session...');
    
    // Check if there's already an approved session
    let testSession = await Session.findOne({
      client: client._id,
      psychologist: psychologist._id,
      status: 'Approved'
    });
    
    if (!testSession) {
      // Generate a booking reference
      const bookingRef = 'SS-TEST-' + Date.now().toString(36).toUpperCase();
      
      testSession = await Session.create({
        client: client._id,
        psychologist: psychologist._id,
        sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        sessionType: 'Individual Therapy',
        status: 'Approved',
        paymentStatus: 'Pending',
        sessionRate: 2500,
        price: 2500,
        bookingReference: bookingRef,
        notes: 'Test session for payment verification'
      });
      console.log('✅ Created test session:', bookingRef);
    } else {
      console.log('✅ Test session exists:', testSession.bookingReference);
    }
    
    // Output summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 TEST ENVIRONMENT READY!');
    console.log('=' .repeat(60));
    
    console.log('\n📋 TEST CREDENTIALS (all use password: Test123!)');
    console.log('-'.repeat(40));
    console.log('Admin:        admin@test.com');
    console.log('Psychologist: psychologist@test.com');
    console.log('Client:       client@test.com');
    
    console.log('\n📅 TEST SESSION');
    console.log('-'.repeat(40));
    console.log('Session ID:      ', testSession._id.toString());
    console.log('Booking Ref:     ', testSession.bookingReference);
    console.log('Status:          ', testSession.status);
    console.log('Payment Status:  ', testSession.paymentStatus);
    console.log('Amount:           KSh', testSession.sessionRate || testSession.price);
    
    console.log('\n🧪 TESTING STEPS');
    console.log('-'.repeat(40));
    console.log('1. Start the server: npm run dev');
    console.log('2. Start the frontend: cd client && npm start');
    console.log('3. Login as client@test.com');
    console.log('4. Go to your dashboard and find the approved session');
    console.log('5. Click "Pay Now" to see payment instructions');
    console.log('6. Enter a test M-Pesa code (e.g., TEST123456)');
    console.log('7. Login as admin@test.com');
    console.log('8. Go to Admin Dashboard → Payment Verification');
    console.log('9. Verify or reject the payment');
    
    console.log('\n🔗 API TEST ENDPOINTS');
    console.log('-'.repeat(40));
    console.log(`GET  http://localhost:5000/api/manual-payments/instructions/${testSession._id}`);
    console.log(`POST http://localhost:5000/api/manual-payments/submit-code/${testSession._id}`);
    console.log('GET  http://localhost:5000/api/manual-payments/pending');
    console.log('GET  http://localhost:5000/api/manual-payments/stats');
    
    await mongoose.disconnect();
    console.log('\n✅ Setup complete! Database disconnected.');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setup();
