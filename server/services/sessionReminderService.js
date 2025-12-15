const cron = require('node-cron');
const Session = require('../models/Session');
const User = require('../models/User');
const { sendSessionReminderSMS } = require('../utils/notificationService');

/**
 * Check for sessions that need 24-hour reminders
 * Runs every hour
 */
const check24HourReminders = async () => {
  try {
    console.log('🔔 Checking for 24-hour session reminders...');

    // Find sessions that are 23-25 hours away and confirmed (paid)
    const now = new Date();
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const sessions = await Session.find({
      sessionDate: {
        $gte: twentyThreeHoursFromNow,
        $lte: twentyFiveHoursFromNow
      },
      status: { $in: ['Confirmed', 'Booked'] },
      paymentStatus: 'Paid',
      reminder24HourSent: { $ne: true } // Only send once
    })
    .populate('client', 'name email phone')
    .populate('psychologist', 'name email phone');

    console.log(`📋 Found ${sessions.length} sessions needing 24-hour reminders`);

    for (const session of sessions) {
      try {
        // Send SMS to client
        if (session.client && session.client.phone) {
          await sendSessionReminderSMS(session, session.client, '24');
          console.log(`✅ 24-hour reminder sent to client: ${session.client.name}`);
        }

        // Mark reminder as sent
        session.reminder24HourSent = true;
        session.reminder24HourSentAt = new Date();
        await session.save();

      } catch (error) {
        console.error(`❌ Failed to send 24-hour reminder for session ${session._id}:`, error.message);
      }
    }

    console.log('✅ 24-hour reminder check complete');
  } catch (error) {
    console.error('❌ Error in 24-hour reminder check:', error);
  }
};

/**
 * Check for sessions that need 1-hour reminders
 * Runs every 15 minutes
 */
const check1HourReminders = async () => {
  try {
    console.log('🔔 Checking for 1-hour session reminders...');

    // Find sessions that are 45-75 minutes away and confirmed (paid)
    const now = new Date();
    const fortyFiveMinutesFromNow = new Date(now.getTime() + 45 * 60 * 1000);
    const seventyFiveMinutesFromNow = new Date(now.getTime() + 75 * 60 * 1000);

    const sessions = await Session.find({
      sessionDate: {
        $gte: fortyFiveMinutesFromNow,
        $lte: seventyFiveMinutesFromNow
      },
      status: { $in: ['Confirmed', 'Booked'] },
      paymentStatus: 'Paid',
      reminder1HourSent: { $ne: true } // Only send once
    })
    .populate('client', 'name email phone')
    .populate('psychologist', 'name email phone');

    console.log(`📋 Found ${sessions.length} sessions needing 1-hour reminders`);

    for (const session of sessions) {
      try {
        // Send SMS to both client and therapist
        if (session.client && session.client.phone) {
          await sendSessionReminderSMS(session, session.client, '1');
          console.log(`✅ 1-hour reminder sent to client: ${session.client.name}`);
        }

        if (session.psychologist && session.psychologist.phone) {
          await sendSessionReminderSMS(session, session.psychologist, '1');
          console.log(`✅ 1-hour reminder sent to therapist: ${session.psychologist.name}`);
        }

        // Mark reminder as sent
        session.reminder1HourSent = true;
        session.reminder1HourSentAt = new Date();
        await session.save();

      } catch (error) {
        console.error(`❌ Failed to send 1-hour reminder for session ${session._id}:`, error.message);
      }
    }

    console.log('✅ 1-hour reminder check complete');
  } catch (error) {
    console.error('❌ Error in 1-hour reminder check:', error);
  }
};

/**
 * Initialize and start all reminder cron jobs
 */
const startReminderJobs = () => {
  console.log('🚀 Starting session reminder jobs...');

  // Run 24-hour reminder check every hour at minute 0
  // Cron format: minute hour day month weekday
  const job24Hour = cron.schedule('0 * * * *', () => {
    check24HourReminders();
  }, {
    scheduled: true,
    timezone: "Africa/Nairobi" // East Africa Time (EAT)
  });

  // Run 1-hour reminder check every 15 minutes
  const job1Hour = cron.schedule('*/15 * * * *', () => {
    check1HourReminders();
  }, {
    scheduled: true,
    timezone: "Africa/Nairobi" // East Africa Time (EAT)
  });

  console.log('✅ Session reminder jobs started');
  console.log('   - 24-hour reminders: Every hour at :00');
  console.log('   - 1-hour reminders: Every 15 minutes');

  // Run initial checks immediately on startup
  setTimeout(() => {
    console.log('🔄 Running initial reminder checks...');
    check24HourReminders();
    check1HourReminders();
  }, 5000); // Wait 5 seconds after startup

  return {
    job24Hour,
    job1Hour,
    check24HourReminders,
    check1HourReminders
  };
};

/**
 * Stop all reminder jobs (useful for testing or shutdown)
 */
const stopReminderJobs = (jobs) => {
  if (jobs && jobs.job24Hour) {
    jobs.job24Hour.stop();
  }
  if (jobs && jobs.job1Hour) {
    jobs.job1Hour.stop();
  }
  console.log('⏹️ Session reminder jobs stopped');
};

module.exports = {
  startReminderJobs,
  stopReminderJobs,
  check24HourReminders,
  check1HourReminders
};
