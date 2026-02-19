/**
 * Reminder Scheduler Service
 * 
 * Comprehensive automated reminder system for therapy sessions.
 * 
 * Features:
 * - 24-hour session reminders (email + SMS)
 * - 1-hour session reminders with meeting link (email + SMS)
 * - Reminder tracking on Session model
 * - Retry logic with exponential backoff
 * - Respects user opt-out preferences
 * - Admin alerts for persistent failures
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 6.4, 6.5
 */

const cron = require('node-cron');
const Session = require('../models/Session');
const User = require('../models/User');
const { sendEmail, sendSMS } = require('../utils/notificationService');
const { logAuditEvent } = require('../utils/auditLogger');

// Configuration
const REMINDER_CONFIG = {
  // Time windows for reminders (in hours)
  REMINDER_24H_WINDOW_START: 23,
  REMINDER_24H_WINDOW_END: 25,
  REMINDER_1H_WINDOW_START: 0.75, // 45 minutes
  REMINDER_1H_WINDOW_END: 1.25,   // 75 minutes
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAYS: [60000, 300000, 900000], // 1 min, 5 min, 15 min
  
  // Cron schedules
  CRON_24H_CHECK: '0 * * * *',      // Every hour at :00
  CRON_1H_CHECK: '*/15 * * * *',    // Every 15 minutes
  
  // Timezone
  TIMEZONE: 'Africa/Nairobi'
};

// Track active jobs
let activeJobs = {
  job24Hour: null,
  job1Hour: null
};

// Track retry queues
const retryQueue = new Map();

/**
 * Format session date for display
 */
const formatSessionDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: REMINDER_CONFIG.TIMEZONE
  });
};

/**
 * Format short date for SMS
 */
const formatShortDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: REMINDER_CONFIG.TIMEZONE
  });
};

/**
 * Check if user has opted out of reminders
 * Requirements: 15.5
 */
const hasOptedOutOfReminders = (user) => {
  if (!user) return true;
  
  // Check notification preferences
  if (user.notifications && user.notifications.sessionReminders === false) {
    return true;
  }
  
  // Legacy field check
  if (user.reminderNotifications === false) {
    return true;
  }
  
  return false;
};

/**
 * Check if current time is within user's quiet hours
 */
const isWithinQuietHours = (user) => {
  if (!user || !user.notifications) return false;
  
  const { quietHoursStart, quietHoursEnd } = user.notifications;
  if (!quietHoursStart || !quietHoursEnd) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
};


/**
 * Generate 24-hour reminder email content
 * Requirements: 15.1
 */
const generate24HourReminderEmail = (session, user, isTherapist = false) => {
  const sessionDate = formatSessionDate(session.sessionDate);
  const otherPartyName = isTherapist 
    ? session.client?.name || 'Client'
    : `Dr. ${session.psychologist?.name || 'Therapist'}`;
  
  const greeting = isTherapist ? `Dr. ${user.name}` : user.name;
  const roleText = isTherapist ? 'client' : 'therapist';
  
  return {
    subject: `Reminder: Session Tomorrow at ${formatShortDate(session.sessionDate)} | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔔 Session Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Your session is tomorrow!</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${greeting},</p>
          <p>This is a friendly reminder that you have a therapy session scheduled for tomorrow.</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">📅 Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${sessionDate}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${session.sessionType}</li>
              <li style="padding: 5px 0;"><strong>Your ${roleText}:</strong> ${otherPartyName}</li>
              <li style="padding: 5px 0;"><strong>Duration:</strong> 50 minutes</li>
            </ul>
          </div>

          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #e65100;">📝 Preparation Tips</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Find a quiet, private space for your session</li>
              <li>Test your camera and microphone beforehand</li>
              <li>Ensure stable internet connection</li>
              <li>Join 5 minutes early to settle in</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/dashboard" 
               style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Session Details
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">You'll receive another reminder 1 hour before your session with the meeting link.</p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            Need to reschedule? Visit your dashboard or contact support.
          </p>
        </div>
      </div>
    `
  };
};

/**
 * Generate 1-hour reminder email content with meeting link
 * Requirements: 15.2
 */
const generate1HourReminderEmail = (session, user, isTherapist = false) => {
  const sessionDate = formatSessionDate(session.sessionDate);
  const otherPartyName = isTherapist 
    ? session.client?.name || 'Client'
    : `Dr. ${session.psychologist?.name || 'Therapist'}`;
  
  const greeting = isTherapist ? `Dr. ${user.name}` : user.name;
  const roleText = isTherapist ? 'client' : 'therapist';
  
  // Get decrypted meeting link
  const meetingLink = session.getDecryptedMeetingLink ? 
    session.getDecryptedMeetingLink() : 
    session.meetingLink;
  
  const fullMeetingUrl = meetingLink ? 
    `${process.env.CLIENT_URL || 'https://smilingsteps.com'}/video-call/${meetingLink}` :
    `${process.env.CLIENT_URL || 'https://smilingsteps.com'}/dashboard`;

  return {
    subject: `Starting Soon: Session in 1 Hour | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⏰ Session Starting Soon!</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Your session begins in 1 hour</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${greeting},</p>
          <p>Your therapy session is starting in approximately 1 hour. Please prepare to join.</p>
          
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">📅 Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${sessionDate}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${session.sessionType}</li>
              <li style="padding: 5px 0;"><strong>Your ${roleText}:</strong> ${otherPartyName}</li>
            </ul>
          </div>

          <div style="background-color: #4caf50; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: white;">🎥 Join Your Session</h3>
            <a href="${fullMeetingUrl}" 
               style="display: inline-block; background-color: white; color: #4caf50; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 18px; margin-top: 10px;">
              Join Video Call
            </a>
            <p style="color: white; margin: 15px 0 0 0; font-size: 14px;">
              Click the button above when you're ready to join
            </p>
          </div>

          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #e65100;">⚡ Quick Checklist</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>✅ Camera and microphone ready</li>
              <li>✅ Quiet, private space</li>
              <li>✅ Stable internet connection</li>
              <li>✅ Join 5 minutes early</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #666;">
            Having technical issues? Visit our <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/help">Help Center</a> or contact support.
          </p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            This is an automated reminder. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  };
};

/**
 * Generate 24-hour reminder SMS
 * Requirements: 15.1
 */
const generate24HourReminderSMS = (session, user, isTherapist = false) => {
  const dateStr = formatShortDate(session.sessionDate);
  const otherParty = isTherapist 
    ? session.client?.name || 'your client'
    : `Dr. ${session.psychologist?.name || 'your therapist'}`;
  
  return `Smiling Steps: Reminder - You have a ${session.sessionType} session tomorrow at ${dateStr} with ${otherParty}. Be ready 5 mins early!`;
};

/**
 * Generate 1-hour reminder SMS with meeting link
 * Requirements: 15.2
 */
const generate1HourReminderSMS = (session, user, isTherapist = false) => {
  const dateStr = formatShortDate(session.sessionDate);
  const meetingLink = session.getDecryptedMeetingLink ? 
    session.getDecryptedMeetingLink() : 
    session.meetingLink;
  
  const shortUrl = meetingLink ? 
    `${process.env.CLIENT_URL || 'smilingsteps.com'}/vc/${meetingLink.substring(0, 8)}` :
    `${process.env.CLIENT_URL || 'smilingsteps.com'}/dashboard`;
  
  return `Smiling Steps: Your session starts in 1 HOUR at ${dateStr}. Join now: ${shortUrl}`;
};


/**
 * Send reminder with retry logic
 * Requirements: 15.4
 */
const sendReminderWithRetry = async (sendFunction, options, sessionId, reminderType, attempt = 0) => {
  try {
    const result = await sendFunction(options);
    
    if (result.success) {
      console.log(`✅ ${reminderType} reminder sent successfully for session ${sessionId}`);
      return { success: true, result };
    }
    
    // If failed but not due to configuration issues, retry
    if (result.reason !== 'Email service not configured' && 
        result.reason !== 'SMS service not configured' &&
        attempt < REMINDER_CONFIG.MAX_RETRY_ATTEMPTS) {
      return scheduleRetry(sendFunction, options, sessionId, reminderType, attempt);
    }
    
    return { success: false, error: result.reason || result.error };
  } catch (error) {
    console.error(`❌ Error sending ${reminderType} reminder for session ${sessionId}:`, error.message);
    
    if (attempt < REMINDER_CONFIG.MAX_RETRY_ATTEMPTS) {
      return scheduleRetry(sendFunction, options, sessionId, reminderType, attempt);
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Schedule a retry with exponential backoff
 * Requirements: 15.4
 */
const scheduleRetry = (sendFunction, options, sessionId, reminderType, attempt) => {
  const delay = REMINDER_CONFIG.RETRY_DELAYS[attempt] || REMINDER_CONFIG.RETRY_DELAYS[REMINDER_CONFIG.RETRY_DELAYS.length - 1];
  const retryKey = `${sessionId}-${reminderType}-${attempt + 1}`;
  
  console.log(`🔄 Scheduling retry ${attempt + 1}/${REMINDER_CONFIG.MAX_RETRY_ATTEMPTS} for ${reminderType} reminder (session ${sessionId}) in ${delay/1000}s`);
  
  const timeoutId = setTimeout(async () => {
    retryQueue.delete(retryKey);
    await sendReminderWithRetry(sendFunction, options, sessionId, reminderType, attempt + 1);
  }, delay);
  
  retryQueue.set(retryKey, timeoutId);
  
  return { success: false, scheduled: true, retryAttempt: attempt + 1 };
};

/**
 * Send reminder to a user (email + SMS)
 */
const sendReminderToUser = async (session, user, reminderType, isTherapist = false) => {
  const results = {
    email: { success: false, skipped: false },
    sms: { success: false, skipped: false }
  };
  
  // Check opt-out preference
  if (hasOptedOutOfReminders(user)) {
    console.log(`⏭️ User ${user.name} has opted out of reminders`);
    results.email.skipped = true;
    results.sms.skipped = true;
    return results;
  }
  
  // Check quiet hours (only for SMS)
  const inQuietHours = isWithinQuietHours(user);
  
  // Generate content based on reminder type
  let emailContent, smsContent;
  if (reminderType === '24hour') {
    emailContent = generate24HourReminderEmail(session, user, isTherapist);
    smsContent = generate24HourReminderSMS(session, user, isTherapist);
  } else {
    emailContent = generate1HourReminderEmail(session, user, isTherapist);
    smsContent = generate1HourReminderSMS(session, user, isTherapist);
  }
  
  // Send email (if user has email notifications enabled)
  if (user.email && (user.notifications?.email !== false && user.emailNotifications !== false)) {
    const emailResult = await sendReminderWithRetry(
      sendEmail,
      { to: user.email, ...emailContent },
      session._id.toString(),
      `${reminderType}-email`
    );
    results.email = emailResult;
  } else {
    results.email.skipped = true;
  }
  
  // Send SMS (if user has phone and SMS enabled, and not in quiet hours)
  if (user.phone && (user.notifications?.sms !== false && user.smsNotifications !== false)) {
    if (inQuietHours) {
      console.log(`🌙 Skipping SMS for ${user.name} - within quiet hours`);
      results.sms.skipped = true;
      results.sms.reason = 'quiet_hours';
    } else {
      const smsResult = await sendReminderWithRetry(
        sendSMS,
        { to: user.phone, message: smsContent },
        session._id.toString(),
        `${reminderType}-sms`
      );
      results.sms = smsResult;
    }
  } else {
    results.sms.skipped = true;
    results.sms.reason = user.phone ? 'sms_disabled' : 'no_phone';
  }
  
  return results;
};

/**
 * Log reminder delivery status
 * Requirements: 15.3
 */
const logReminderDelivery = async (session, reminderType, clientResults, therapistResults) => {
  try {
    await logAuditEvent({
      action: `REMINDER_${reminderType.toUpperCase()}_SENT`,
      userId: session.client?._id || session.client,
      targetId: session._id,
      targetType: 'Session',
      details: {
        sessionId: session._id.toString(),
        reminderType,
        clientEmail: clientResults?.email?.success || false,
        clientSMS: clientResults?.sms?.success || false,
        therapistEmail: therapistResults?.email?.success || false,
        therapistSMS: therapistResults?.sms?.success || false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log reminder delivery:', error.message);
  }
};

/**
 * Alert admin about persistent reminder failures
 * Requirements: 15.4
 */
const alertAdminOnPersistentFailure = async (session, reminderType, failures) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@smilingsteps.com';
    
    await sendEmail({
      to: adminEmail,
      subject: `⚠️ Reminder Delivery Failure - Session ${session._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f44336; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">⚠️ Reminder Delivery Failed</h1>
          </div>
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>A ${reminderType} reminder failed to deliver after ${REMINDER_CONFIG.MAX_RETRY_ATTEMPTS} attempts.</p>
            <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Session ID:</strong> ${session._id}</p>
              <p><strong>Session Date:</strong> ${formatSessionDate(session.sessionDate)}</p>
              <p><strong>Client:</strong> ${session.client?.name || 'Unknown'}</p>
              <p><strong>Therapist:</strong> ${session.psychologist?.name || 'Unknown'}</p>
              <p><strong>Failures:</strong></p>
              <ul>
                ${failures.map(f => `<li>${f.type}: ${f.error}</li>`).join('')}
              </ul>
            </div>
            <p>Please manually contact the affected parties.</p>
          </div>
        </div>
      `
    });
    
    console.log(`📧 Admin alerted about reminder failure for session ${session._id}`);
  } catch (error) {
    console.error('Failed to alert admin:', error.message);
  }
};


/**
 * Check and send 24-hour reminders
 * Requirements: 15.1, 6.4
 */
const check24HourReminders = async () => {
  try {
    console.log('🔔 Checking for 24-hour session reminders...');
    
    const now = new Date();
    const windowStart = new Date(now.getTime() + REMINDER_CONFIG.REMINDER_24H_WINDOW_START * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + REMINDER_CONFIG.REMINDER_24H_WINDOW_END * 60 * 60 * 1000);
    
    // Find sessions that need 24-hour reminders
    const sessions = await Session.find({
      sessionDate: {
        $gte: windowStart,
        $lte: windowEnd
      },
      status: { $in: ['Confirmed', 'Booked'] },
      paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] },
      reminder24HourSent: { $ne: true }
    })
    .populate('client', 'name email phone notifications emailNotifications smsNotifications reminderNotifications')
    .populate('psychologist', 'name email phone notifications emailNotifications smsNotifications reminderNotifications');
    
    console.log(`📋 Found ${sessions.length} sessions needing 24-hour reminders`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const session of sessions) {
      try {
        const failures = [];
        
        // Send to client
        let clientResults = null;
        if (session.client) {
          clientResults = await sendReminderToUser(session, session.client, '24hour', false);
          
          if (!clientResults.email.success && !clientResults.email.skipped) {
            failures.push({ type: 'client_email', error: clientResults.email.error });
          }
          if (!clientResults.sms.success && !clientResults.sms.skipped) {
            failures.push({ type: 'client_sms', error: clientResults.sms.error || clientResults.sms.reason });
          }
        }
        
        // Send to therapist
        let therapistResults = null;
        if (session.psychologist) {
          therapistResults = await sendReminderToUser(session, session.psychologist, '24hour', true);
          
          if (!therapistResults.email.success && !therapistResults.email.skipped) {
            failures.push({ type: 'therapist_email', error: therapistResults.email.error });
          }
          if (!therapistResults.sms.success && !therapistResults.sms.skipped) {
            failures.push({ type: 'therapist_sms', error: therapistResults.sms.error || therapistResults.sms.reason });
          }
        }
        
        // Mark reminder as sent
        session.reminder24HourSent = true;
        session.reminder24HourSentAt = new Date();
        await session.save();
        
        // Log delivery
        await logReminderDelivery(session, '24hour', clientResults, therapistResults);
        
        // Check for persistent failures
        if (failures.length > 0 && failures.every(f => f.error)) {
          await alertAdminOnPersistentFailure(session, '24hour', failures);
          failureCount++;
        } else {
          successCount++;
        }
        
        console.log(`✅ 24-hour reminder processed for session ${session._id}`);
        
      } catch (error) {
        console.error(`❌ Failed to process 24-hour reminder for session ${session._id}:`, error.message);
        failureCount++;
      }
    }
    
    console.log(`✅ 24-hour reminder check complete: ${successCount} success, ${failureCount} failures`);
    
    return { processed: sessions.length, success: successCount, failures: failureCount };
    
  } catch (error) {
    console.error('❌ Error in 24-hour reminder check:', error);
    throw error;
  }
};

/**
 * Check and send 1-hour reminders
 * Requirements: 15.2, 6.5
 */
const check1HourReminders = async () => {
  try {
    console.log('🔔 Checking for 1-hour session reminders...');
    
    const now = new Date();
    const windowStart = new Date(now.getTime() + REMINDER_CONFIG.REMINDER_1H_WINDOW_START * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + REMINDER_CONFIG.REMINDER_1H_WINDOW_END * 60 * 60 * 1000);
    
    // Find sessions that need 1-hour reminders
    const sessions = await Session.find({
      sessionDate: {
        $gte: windowStart,
        $lte: windowEnd
      },
      status: { $in: ['Confirmed', 'Booked'] },
      paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] },
      reminder1HourSent: { $ne: true }
    })
    .populate('client', 'name email phone notifications emailNotifications smsNotifications reminderNotifications')
    .populate('psychologist', 'name email phone notifications emailNotifications smsNotifications reminderNotifications');
    
    console.log(`📋 Found ${sessions.length} sessions needing 1-hour reminders`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const session of sessions) {
      try {
        const failures = [];
        
        // Send to client
        let clientResults = null;
        if (session.client) {
          clientResults = await sendReminderToUser(session, session.client, '1hour', false);
          
          if (!clientResults.email.success && !clientResults.email.skipped) {
            failures.push({ type: 'client_email', error: clientResults.email.error });
          }
          if (!clientResults.sms.success && !clientResults.sms.skipped) {
            failures.push({ type: 'client_sms', error: clientResults.sms.error || clientResults.sms.reason });
          }
        }
        
        // Send to therapist
        let therapistResults = null;
        if (session.psychologist) {
          therapistResults = await sendReminderToUser(session, session.psychologist, '1hour', true);
          
          if (!therapistResults.email.success && !therapistResults.email.skipped) {
            failures.push({ type: 'therapist_email', error: therapistResults.email.error });
          }
          if (!therapistResults.sms.success && !therapistResults.sms.skipped) {
            failures.push({ type: 'therapist_sms', error: therapistResults.sms.error || therapistResults.sms.reason });
          }
        }
        
        // Mark reminder as sent
        session.reminder1HourSent = true;
        session.reminder1HourSentAt = new Date();
        await session.save();
        
        // Log delivery
        await logReminderDelivery(session, '1hour', clientResults, therapistResults);
        
        // Check for persistent failures
        if (failures.length > 0 && failures.every(f => f.error)) {
          await alertAdminOnPersistentFailure(session, '1hour', failures);
          failureCount++;
        } else {
          successCount++;
        }
        
        console.log(`✅ 1-hour reminder processed for session ${session._id}`);
        
      } catch (error) {
        console.error(`❌ Failed to process 1-hour reminder for session ${session._id}:`, error.message);
        failureCount++;
      }
    }
    
    console.log(`✅ 1-hour reminder check complete: ${successCount} success, ${failureCount} failures`);
    
    return { processed: sessions.length, success: successCount, failures: failureCount };
    
  } catch (error) {
    console.error('❌ Error in 1-hour reminder check:', error);
    throw error;
  }
};

/**
 * Start all reminder cron jobs
 */
const startReminderJobs = () => {
  console.log('🚀 Starting automated reminder scheduler...');
  
  // Stop any existing jobs
  stopReminderJobs();
  
  // 24-hour reminder check - every hour at :00
  activeJobs.job24Hour = cron.schedule(REMINDER_CONFIG.CRON_24H_CHECK, () => {
    check24HourReminders().catch(err => console.error('24-hour reminder job error:', err));
  }, {
    scheduled: true,
    timezone: REMINDER_CONFIG.TIMEZONE
  });
  
  // 1-hour reminder check - every 15 minutes
  activeJobs.job1Hour = cron.schedule(REMINDER_CONFIG.CRON_1H_CHECK, () => {
    check1HourReminders().catch(err => console.error('1-hour reminder job error:', err));
  }, {
    scheduled: true,
    timezone: REMINDER_CONFIG.TIMEZONE
  });
  
  console.log('✅ Reminder scheduler started');
  console.log(`   - 24-hour reminders: ${REMINDER_CONFIG.CRON_24H_CHECK} (${REMINDER_CONFIG.TIMEZONE})`);
  console.log(`   - 1-hour reminders: ${REMINDER_CONFIG.CRON_1H_CHECK} (${REMINDER_CONFIG.TIMEZONE})`);
  
  // Run initial checks after a short delay
  setTimeout(() => {
    console.log('🔄 Running initial reminder checks...');
    check24HourReminders().catch(err => console.error('Initial 24-hour check error:', err));
    check1HourReminders().catch(err => console.error('Initial 1-hour check error:', err));
  }, 5000);
  
  return activeJobs;
};

/**
 * Stop all reminder jobs
 */
const stopReminderJobs = () => {
  if (activeJobs.job24Hour) {
    activeJobs.job24Hour.stop();
    activeJobs.job24Hour = null;
  }
  if (activeJobs.job1Hour) {
    activeJobs.job1Hour.stop();
    activeJobs.job1Hour = null;
  }
  
  // Clear retry queue
  for (const [key, timeoutId] of retryQueue) {
    clearTimeout(timeoutId);
  }
  retryQueue.clear();
  
  console.log('⏹️ Reminder scheduler stopped');
};

/**
 * Get reminder scheduler status
 */
const getReminderStatus = () => {
  return {
    running: !!(activeJobs.job24Hour || activeJobs.job1Hour),
    jobs: {
      job24Hour: !!activeJobs.job24Hour,
      job1Hour: !!activeJobs.job1Hour
    },
    pendingRetries: retryQueue.size,
    config: {
      timezone: REMINDER_CONFIG.TIMEZONE,
      cron24Hour: REMINDER_CONFIG.CRON_24H_CHECK,
      cron1Hour: REMINDER_CONFIG.CRON_1H_CHECK,
      maxRetries: REMINDER_CONFIG.MAX_RETRY_ATTEMPTS
    }
  };
};

/**
 * Manually trigger reminder check (for testing/admin)
 */
const triggerReminderCheck = async (type = 'both') => {
  const results = {};
  
  if (type === '24hour' || type === 'both') {
    results.reminder24Hour = await check24HourReminders();
  }
  
  if (type === '1hour' || type === 'both') {
    results.reminder1Hour = await check1HourReminders();
  }
  
  return results;
};

module.exports = {
  // Main functions
  startReminderJobs,
  stopReminderJobs,
  getReminderStatus,
  triggerReminderCheck,
  
  // Individual checks (for testing)
  check24HourReminders,
  check1HourReminders,
  
  // Helper functions (for testing)
  hasOptedOutOfReminders,
  isWithinQuietHours,
  sendReminderToUser,
  
  // Content generators (for testing)
  generate24HourReminderEmail,
  generate1HourReminderEmail,
  generate24HourReminderSMS,
  generate1HourReminderSMS,
  
  // Configuration
  REMINDER_CONFIG
};
