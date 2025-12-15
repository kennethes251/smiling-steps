/**
 * Test script for notification system
 * Tests email notifications and SMS reminders
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');

// Import notification service
const {
  sendSessionApprovalNotification,
  sendPaymentConfirmationNotification,
  sendTherapistPaymentNotification,
  sendPaymentFailureNotification,
  sendSessionReminderSMS
} = require('./server/utils/notificationService');

// Import reminder service
const {
  check24HourReminders,
  check1HourReminders
} = require('./server/services/sessionReminderService');

const Session = require('./server/models/Session');
const User = require('./server/models/User');

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Notification System\n');
    console.log('=' .repeat(60));

    // Connect to database
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get test users
    const client = await User.findOne({ role: 'client' });
    const psychologist = await User.findOne({ role: 'psychologist' });

    if (!client || !psychologist) {
      console.log('❌ No test users found. Please create a client and psychologist first.');
      process.exit(1);
    }

    console.log('👥 Test Users:');
    console.log(`   Client: ${client.name} (${client.email})`);
    console.log(`   Psychologist: ${psychologist.name} (${psychologist.email})\n`);

    // Create a test session
    console.log('📝 Creating test session...');
    const testSession = new Session({
      client: client._id,
      psychologist: psychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      price: 2500,
      status: 'Approved',
      paymentStatus: 'Pending'
    });
    await testSession.save();
    console.log(`✅ Test session created: ${testSession._id}\n`);

    // Test 1: Session Approval Notification
    console.log('=' .repeat(60));
    console.log('TEST 1: Session Approval Notification');
    console.log('=' .repeat(60));
    try {
      const result = await sendSessionApprovalNotification(testSession, client, psychologist);
      if (result.success) {
        console.log('✅ Session approval email sent successfully');
      } else {
        console.log(`⚠️ Email not sent: ${result.reason || result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Payment Confirmation Notification
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Payment Confirmation Notification');
    console.log('=' .repeat(60));
    try {
      const result = await sendPaymentConfirmationNotification(
        testSession,
        client,
        psychologist,
        'TEST123456789',
        2500
      );
      if (result.success) {
        console.log('✅ Payment confirmation email sent successfully');
      } else {
        console.log(`⚠️ Email not sent: ${result.reason || result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Therapist Payment Notification
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Therapist Payment Notification');
    console.log('=' .repeat(60));
    try {
      const result = await sendTherapistPaymentNotification(
        testSession,
        client,
        psychologist,
        'TEST123456789',
        2500
      );
      if (result.success) {
        console.log('✅ Therapist notification email sent successfully');
      } else {
        console.log(`⚠️ Email not sent: ${result.reason || result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Payment Failure Notification
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Payment Failure Notification');
    console.log('=' .repeat(60));
    try {
      const result = await sendPaymentFailureNotification(
        testSession,
        client,
        'Insufficient funds in M-Pesa account'
      );
      if (result.success) {
        console.log('✅ Payment failure email sent successfully');
      } else {
        console.log(`⚠️ Email not sent: ${result.reason || result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: SMS Reminders (if configured)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: SMS Reminders');
    console.log('=' .repeat(60));
    
    if (client.phone) {
      try {
        const result24h = await sendSessionReminderSMS(testSession, client, '24');
        if (result24h.success) {
          console.log('✅ 24-hour SMS reminder sent successfully');
        } else {
          console.log(`⚠️ 24-hour SMS not sent: ${result24h.reason || result24h.error}`);
        }

        const result1h = await sendSessionReminderSMS(testSession, client, '1');
        if (result1h.success) {
          console.log('✅ 1-hour SMS reminder sent successfully');
        } else {
          console.log(`⚠️ 1-hour SMS not sent: ${result1h.reason || result1h.error}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    } else {
      console.log('⚠️ Client has no phone number. Skipping SMS tests.');
    }

    // Test 6: Reminder Job Functions
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Reminder Job Functions');
    console.log('=' .repeat(60));
    
    // Update test session to be 24 hours away and paid
    testSession.sessionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    testSession.status = 'Confirmed';
    testSession.paymentStatus = 'Paid';
    await testSession.save();
    
    console.log('Running 24-hour reminder check...');
    await check24HourReminders();
    
    // Update test session to be 1 hour away
    testSession.sessionDate = new Date(Date.now() + 60 * 60 * 1000);
    testSession.reminder24HourSent = true; // Mark as already sent
    await testSession.save();
    
    console.log('\nRunning 1-hour reminder check...');
    await check1HourReminders();

    // Cleanup
    console.log('\n' + '='.repeat(60));
    console.log('🧹 Cleaning up test data...');
    await Session.findByIdAndDelete(testSession._id);
    console.log('✅ Test session deleted');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('=' .repeat(60));
    console.log('\n📋 Summary:');
    console.log('   - Email notifications: Check your inbox');
    console.log('   - SMS notifications: Check if SMS service is configured');
    console.log('   - Reminder jobs: Check console output above');
    console.log('\n💡 Configuration:');
    console.log(`   - Email configured: ${process.env.EMAIL_HOST ? 'Yes' : 'No'}`);
    console.log(`   - SMS configured: ${process.env.AFRICASTALKING_API_KEY ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run tests
testNotificationSystem();
