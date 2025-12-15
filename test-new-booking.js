/**
 * Quick test to verify the new booking system is working
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testBookingSystem() {
  try {
    console.log('🧪 Testing New Booking System...\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('✅ Connected\n');

    const User = require('./server/models/User');
    const Session = require('./server/models/Session');

    // Check for psychologists
    console.log('👨‍⚕️ Checking psychologists...');
    const psychologists = await User.find({ role: 'psychologist' });
    console.log(`   Found ${psychologists.length} psychologist(s)`);
    
    if (psychologists.length > 0) {
      const psych = psychologists[0];
      console.log(`   Example: ${psych.name}`);
      console.log(`   Rates: ${psych.psychologistDetails?.rates ? 'Configured ✅' : 'Not configured ❌'}`);
      console.log(`   Payment Info: ${psych.psychologistDetails?.paymentInfo ? 'Configured ✅' : 'Not configured ❌'}`);
    } else {
      console.log('   ⚠️  No psychologists found. Create one first!');
    }
    console.log('');

    // Check for clients
    console.log('👤 Checking clients...');
    const clients = await User.find({ role: 'client' });
    console.log(`   Found ${clients.length} client(s)\n`);

    // Check sessions
    console.log('📅 Checking sessions...');
    const sessions = await Session.find({});
    console.log(`   Total sessions: ${sessions.length}`);
    
    if (sessions.length > 0) {
      const statusCounts = {};
      sessions.forEach(s => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      });
      console.log('   Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
      });
    }
    console.log('');

    // Check for new status types
    console.log('🔍 Checking for new booking flow statuses...');
    const newStatuses = [
      'Pending Approval',
      'Approved',
      'Payment Submitted',
      'Confirmed'
    ];
    
    for (const status of newStatuses) {
      const count = await Session.countDocuments({ status });
      const icon = count > 0 ? '✅' : '⚪';
      console.log(`   ${icon} ${status}: ${count}`);
    }
    console.log('');

    // Summary
    console.log('📊 SUMMARY');
    console.log('─────────────────────────────────────');
    console.log(`Psychologists: ${psychologists.length}`);
    console.log(`Clients: ${clients.length}`);
    console.log(`Sessions: ${sessions.length}`);
    console.log('');
    
    if (psychologists.length === 0) {
      console.log('⚠️  ACTION NEEDED: Create psychologist accounts');
    }
    
    if (clients.length === 0) {
      console.log('⚠️  ACTION NEEDED: Create client accounts for testing');
    }
    
    const configuredPsychs = psychologists.filter(p => 
      p.psychologistDetails?.rates && p.psychologistDetails?.paymentInfo
    );
    
    if (configuredPsychs.length < psychologists.length) {
      console.log('⚠️  ACTION NEEDED: Run migration script to configure psychologist rates');
      console.log('   Command: node update-booking-system.js');
    }
    
    if (psychologists.length > 0 && clients.length > 0 && configuredPsychs.length === psychologists.length) {
      console.log('✅ System ready for testing!');
      console.log('');
      console.log('🎯 Next steps:');
      console.log('   1. Login as a client');
      console.log('   2. Go to /bookings');
      console.log('   3. Test the new booking flow');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Test complete');
  }
}

testBookingSystem();
