/**
 * Update Booking System - Migration Script
 * 
 * This script updates existing sessions and psychologist profiles
 * to work with the new booking flow
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Session = require('./server/models/Session');
const User = require('./server/models/User');

async function updateBookingSystem() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('✅ Connected to database');

    // Update existing sessions with new status
    console.log('\n📝 Updating existing sessions...');
    const sessions = await Session.find({});
    
    for (const session of sessions) {
      let updated = false;
      
      // Map old status to new status
      if (session.status === 'Pending') {
        session.status = 'Pending Approval';
        updated = true;
      } else if (session.status === 'Booked') {
        session.status = 'Confirmed';
        updated = true;
      }
      
      // Add sessionRate if missing
      if (!session.sessionRate && session.price) {
        session.sessionRate = session.price;
        updated = true;
      }
      
      // Initialize payment status if missing
      if (!session.paymentStatus) {
        if (session.status === 'Confirmed' || session.status === 'Completed') {
          session.paymentStatus = 'Verified';
        } else {
          session.paymentStatus = 'Pending';
        }
        updated = true;
      }
      
      if (updated) {
        await session.save();
        console.log(`  ✓ Updated session ${session._id}`);
      }
    }
    
    console.log(`✅ Updated ${sessions.length} sessions`);

    // Update psychologist profiles with default rates
    console.log('\n👨‍⚕️ Updating psychologist profiles...');
    const psychologists = await User.find({ role: 'psychologist' });
    
    for (const psych of psychologists) {
      let updated = false;
      
      // Add default rates if missing
      if (!psych.psychologistDetails?.rates) {
        psych.psychologistDetails = psych.psychologistDetails || {};
        psych.psychologistDetails.rates = {
          Individual: { amount: 2000, duration: 60 },
          Couples: { amount: 3500, duration: 75 },
          Family: { amount: 4500, duration: 90 },
          Group: { amount: 1500, duration: 90 }
        };
        updated = true;
      }
      
      // Add default payment info if missing
      if (!psych.psychologistDetails?.paymentInfo) {
        psych.psychologistDetails = psych.psychologistDetails || {};
        psych.psychologistDetails.paymentInfo = {
          mpesaNumber: '0707439299',
          mpesaName: psych.name
        };
        updated = true;
      }
      
      // Add default specializations if missing
      if (!psych.psychologistDetails?.specializations) {
        psych.psychologistDetails = psych.psychologistDetails || {};
        psych.psychologistDetails.specializations = [
          'General Therapy',
          'Anxiety',
          'Depression'
        ];
        updated = true;
      }
      
      // Add default experience if missing
      if (!psych.psychologistDetails?.experience) {
        psych.psychologistDetails = psych.psychologistDetails || {};
        psych.psychologistDetails.experience = '5 years';
        updated = true;
      }
      
      if (updated) {
        await psych.save();
        console.log(`  ✓ Updated psychologist ${psych.name}`);
      }
    }
    
    console.log(`✅ Updated ${psychologists.length} psychologist profiles`);

    console.log('\n🎉 Booking system update complete!');
    console.log('\nNext steps:');
    console.log('1. Update App.js to use BookingPageNew');
    console.log('2. Test the new booking flow');
    console.log('3. Update therapist dashboard to show pending approvals');
    console.log('4. Implement email notifications (Phase 2)');
    
  } catch (error) {
    console.error('❌ Error updating booking system:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the update
updateBookingSystem();
