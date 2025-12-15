const nodemailer = require('nodemailer');
const AfricasTalking = require('africastalking');

// Initialize Africa's Talking (for SMS)
let smsClient = null;
if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
  const africastalking = AfricasTalking({
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME
  });
  smsClient = africastalking.SMS;
}

// Email transporter
let emailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Send email notification
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email plain text content (optional)
 */
const sendEmail = async (options) => {
  if (!emailTransporter) {
    console.warn('⚠️ Email service not configured. Skipping email notification.');
    return { success: false, reason: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Smiling Steps <noreply@smilingsteps.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent:', { to: options.to, subject: options.subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS notification
 * @param {Object} options - SMS options
 * @param {string|string[]} options.to - Recipient phone number(s)
 * @param {string} options.message - SMS message content
 */
const sendSMS = async (options) => {
  if (!smsClient) {
    console.warn('⚠️ SMS service not configured. Skipping SMS notification.');
    return { success: false, reason: 'SMS service not configured' };
  }

  try {
    const smsOptions = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      message: options.message,
      from: process.env.SMS_SENDER_ID || 'SmilingSteps'
    };

    const result = await smsClient.send(smsOptions);
    console.log('✅ SMS sent:', { to: options.to, result: result.SMSMessageData.Recipients });
    return { success: true, result: result.SMSMessageData };
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send session approval notification with payment instructions
 * @param {Object} session - Session object
 * @param {Object} client - Client user object
 * @param {Object} psychologist - Psychologist user object
 */
const sendSessionApprovalNotification = async (session, client, psychologist) => {
  const sessionDate = new Date(session.sessionDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Session Approved! 🎉</h2>
      <p>Dear ${client.name},</p>
      <p>Great news! Your therapy session has been approved by Dr. ${psychologist.name}.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Session Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Therapist:</strong> Dr. ${psychologist.name}</li>
          <li><strong>Session Type:</strong> ${session.sessionType}</li>
          <li><strong>Date & Time:</strong> ${sessionDate}</li>
          <li><strong>Amount:</strong> KES ${session.price}</li>
        </ul>
      </div>

      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">Payment Instructions</h3>
        <p style="margin: 10px 0;">To confirm your session, please complete payment using M-Pesa:</p>
        <ol style="line-height: 1.8;">
          <li>Log in to your Smiling Steps dashboard</li>
          <li>Go to "My Sessions"</li>
          <li>Click "Pay Now" on your approved session</li>
          <li>Enter your M-Pesa phone number</li>
          <li>Complete the payment on your phone</li>
        </ol>
        <p style="margin: 10px 0;"><strong>Amount to pay:</strong> KES ${session.price}</p>
      </div>

      <p>Once payment is confirmed, your session will be fully confirmed and you'll receive the meeting link.</p>
      
      <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>
      <strong>Smiling Steps Team</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: client.email,
    subject: 'Session Approved - Payment Required | Smiling Steps',
    html: emailHtml
  });
};

/**
 * Send payment confirmation notification
 * @param {Object} session - Session object
 * @param {Object} client - Client user object
 * @param {Object} psychologist - Psychologist user object
 * @param {string} transactionID - M-Pesa transaction ID
 * @param {number} amount - Payment amount
 */
const sendPaymentConfirmationNotification = async (session, client, psychologist, transactionID, amount) => {
  const sessionDate = new Date(session.sessionDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Payment Confirmed! ✅</h2>
      <p>Dear ${client.name},</p>
      <p>Your payment has been successfully received and confirmed. Your therapy session is now fully booked!</p>
      
      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2e7d32;">Transaction Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>M-Pesa Transaction ID:</strong> ${transactionID}</li>
          <li><strong>Amount Paid:</strong> KES ${amount}</li>
          <li><strong>Payment Date:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Session Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Therapist:</strong> Dr. ${psychologist.name}</li>
          <li><strong>Session Type:</strong> ${session.sessionType}</li>
          <li><strong>Date & Time:</strong> ${sessionDate}</li>
        </ul>
      </div>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1565c0;">What's Next?</h3>
        <ul style="line-height: 1.8;">
          <li>You'll receive a reminder 24 hours before your session</li>
          <li>The meeting link will be available in your dashboard</li>
          <li>Please join the session 5 minutes early</li>
        </ul>
      </div>

      <p>We look forward to your session!</p>
      
      <p style="margin-top: 30px;">Best regards,<br>
      <strong>Smiling Steps Team</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        Keep this email for your records. Transaction ID: ${transactionID}
      </p>
    </div>
  `;

  return await sendEmail({
    to: client.email,
    subject: 'Payment Confirmed - Session Booked | Smiling Steps',
    html: emailHtml
  });
};

/**
 * Send therapist notification about payment received
 * @param {Object} session - Session object
 * @param {Object} client - Client user object
 * @param {Object} psychologist - Psychologist user object
 * @param {string} transactionID - M-Pesa transaction ID
 * @param {number} amount - Payment amount
 */
const sendTherapistPaymentNotification = async (session, client, psychologist, transactionID, amount) => {
  const sessionDate = new Date(session.sessionDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Payment Received 💰</h2>
      <p>Dear Dr. ${psychologist.name},</p>
      <p>Payment has been received for your upcoming session. The session is now confirmed.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Session Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Client:</strong> ${client.name}</li>
          <li><strong>Session Type:</strong> ${session.sessionType}</li>
          <li><strong>Date & Time:</strong> ${sessionDate}</li>
          <li><strong>Amount:</strong> KES ${amount}</li>
          <li><strong>Transaction ID:</strong> ${transactionID}</li>
        </ul>
      </div>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1565c0;">Action Required</h3>
        <p>Please ensure you:</p>
        <ul style="line-height: 1.8;">
          <li>Review the client's profile and session notes</li>
          <li>Prepare for the session</li>
          <li>Join the video call on time</li>
        </ul>
      </div>

      <p>The meeting link is available in your dashboard.</p>
      
      <p style="margin-top: 30px;">Best regards,<br>
      <strong>Smiling Steps Team</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated notification. Transaction ID: ${transactionID}
      </p>
    </div>
  `;

  return await sendEmail({
    to: psychologist.email,
    subject: 'Session Payment Received | Smiling Steps',
    html: emailHtml
  });
};

/**
 * Send payment failure notification to client
 * @param {Object} session - Session object
 * @param {Object} client - Client user object
 * @param {string} failureReason - Reason for payment failure
 */
const sendPaymentFailureNotification = async (session, client, failureReason) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f44336;">Payment Failed ❌</h2>
      <p>Dear ${client.name},</p>
      <p>We were unable to process your payment for the therapy session.</p>
      
      <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #c62828;">Failure Reason</h3>
        <p style="margin: 10px 0;"><strong>${failureReason}</strong></p>
      </div>

      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">What to Do Next</h3>
        <ul style="line-height: 1.8;">
          <li>Check your M-Pesa balance</li>
          <li>Ensure you entered the correct PIN</li>
          <li>Try again from your dashboard</li>
          <li>Contact support if the issue persists</li>
        </ul>
      </div>

      <p>Your session is still approved and waiting for payment. You can retry the payment anytime from your dashboard.</p>
      
      <p style="margin-top: 30px;">If you need assistance, please contact our support team.</p>
      
      <p>Best regards,<br>
      <strong>Smiling Steps Team</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: client.email,
    subject: 'Payment Failed - Action Required | Smiling Steps',
    html: emailHtml
  });
};

/**
 * Send session reminder SMS
 * @param {Object} session - Session object
 * @param {Object} user - User object (client or psychologist)
 * @param {string} hoursUntil - Hours until session (e.g., '24' or '1')
 */
const sendSessionReminderSMS = async (session, user, hoursUntil) => {
  if (!user.phone) {
    console.warn(`⚠️ No phone number for user ${user.name}. Skipping SMS reminder.`);
    return { success: false, reason: 'No phone number' };
  }

  const sessionDate = new Date(session.sessionDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const message = hoursUntil === '24' 
    ? `Reminder: You have a therapy session tomorrow at ${sessionDate}. Please be ready 5 minutes early. - Smiling Steps`
    : `Reminder: Your therapy session starts in 1 hour at ${sessionDate}. Join from your dashboard. - Smiling Steps`;

  return await sendSMS({
    to: user.phone,
    message: message
  });
};

/**
 * Send reconciliation discrepancy alert to admin via SMS
 * @param {Object} reconciliationResults - Results from reconciliation
 * @param {string} adminPhone - Admin phone number
 */
const sendReconciliationDiscrepancySMS = async (reconciliationResults, adminPhone) => {
  const { summary } = reconciliationResults;
  
  // Only send if there are discrepancies or unmatched transactions
  if (summary.discrepancies === 0 && summary.unmatched === 0) {
    console.log('✅ No discrepancies found. Skipping SMS alert.');
    return { success: true, reason: 'No discrepancies to report' };
  }

  // Create concise SMS message (160 characters limit consideration)
  const totalIssues = summary.discrepancies + summary.unmatched;
  const message = `🚨 PAYMENT ALERT: ${totalIssues} reconciliation issues detected. ${summary.discrepancies} discrepancies, ${summary.unmatched} unmatched. Total: KES ${summary.totalAmount?.toLocaleString()}. Check admin dashboard immediately. - Smiling Steps`;

  try {
    const result = await sendSMS({
      to: adminPhone,
      message: message
    });

    console.log('✅ Reconciliation discrepancy SMS sent to admin:', adminPhone);
    return result;
  } catch (error) {
    console.error('❌ Failed to send reconciliation SMS alert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send reconciliation discrepancy alert to admin
 * @param {Object} reconciliationResults - Results from reconciliation
 * @param {string} adminEmail - Admin email address
 */
const sendReconciliationDiscrepancyAlert = async (reconciliationResults, adminEmail) => {
  const { summary, results } = reconciliationResults;

  // Only send if there are discrepancies or unmatched transactions
  if (summary.discrepancies === 0 && summary.unmatched === 0) {
    console.log('✅ No discrepancies found. Skipping alert email.');
    return { success: true, reason: 'No discrepancies to report' };
  }

  // Format date range
  const startDate = new Date(summary.dateRange.startDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const endDate = new Date(summary.dateRange.endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Build discrepancy details HTML
  let discrepancyDetailsHtml = '';
  
  if (results.discrepancies && results.discrepancies.length > 0) {
    discrepancyDetailsHtml += '<h3 style="color: #d32f2f; margin-top: 20px;">Critical Discrepancies</h3>';
    discrepancyDetailsHtml += '<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">';
    discrepancyDetailsHtml += '<tr style="background-color: #f5f5f5;">';
    discrepancyDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Session ID</th>';
    discrepancyDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Transaction ID</th>';
    discrepancyDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Amount</th>';
    discrepancyDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Issues</th>';
    discrepancyDetailsHtml += '</tr>';

    results.discrepancies.slice(0, 10).forEach(item => {
      const issuesText = item.issues?.map(i => i.message).join(', ') || 'Unknown';
      discrepancyDetailsHtml += '<tr>';
      discrepancyDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd;">${item.sessionId}</td>`;
      discrepancyDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd;">${item.transactionId || 'N/A'}</td>`;
      discrepancyDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd;">KES ${item.amount || 'N/A'}</td>`;
      discrepancyDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f;">${issuesText}</td>`;
      discrepancyDetailsHtml += '</tr>';
    });

    if (results.discrepancies.length > 10) {
      discrepancyDetailsHtml += '<tr>';
      discrepancyDetailsHtml += `<td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: center; font-style: italic;">... and ${results.discrepancies.length - 10} more discrepancies</td>`;
      discrepancyDetailsHtml += '</tr>';
    }

    discrepancyDetailsHtml += '</table>';
  }

  // Build unmatched transactions HTML
  let unmatchedDetailsHtml = '';
  
  if (results.unmatched && results.unmatched.length > 0) {
    unmatchedDetailsHtml += '<h3 style="color: #f57c00; margin-top: 20px;">Unmatched Transactions</h3>';
    unmatchedDetailsHtml += '<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">';
    unmatchedDetailsHtml += '<tr style="background-color: #f5f5f5;">';
    unmatchedDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Session ID</th>';
    unmatchedDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Transaction ID</th>';
    unmatchedDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Amount</th>';
    unmatchedDetailsHtml += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Issues</th>';
    unmatchedDetailsHtml += '</tr>';

    results.unmatched.slice(0, 10).forEach(item => {
      const issuesText = item.issues?.map(i => i.message).join(', ') || 'Unknown';
      unmatchedDetailsHtml += '<tr>';
      unmatchedDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd;">${item.sessionId}</td>`;
      unmatchedDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd;">${item.transactionId || 'N/A'}</td>`;
      unmatchedDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd;">KES ${item.amount || 'N/A'}</td>`;
      unmatchedDetailsHtml += `<td style="padding: 10px; border: 1px solid #ddd; color: #f57c00;">${issuesText}</td>`;
      unmatchedDetailsHtml += '</tr>';
    });

    if (results.unmatched.length > 10) {
      unmatchedDetailsHtml += '<tr>';
      unmatchedDetailsHtml += `<td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: center; font-style: italic;">... and ${results.unmatched.length - 10} more unmatched transactions</td>`;
      unmatchedDetailsHtml += '</tr>';
    }

    unmatchedDetailsHtml += '</table>';
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background-color: #d32f2f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Payment Reconciliation Alert</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Discrepancies detected in payment reconciliation</p>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear Admin,</p>
        <p>The automated payment reconciliation process has detected discrepancies that require your attention.</p>
        
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #d32f2f; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #d32f2f; font-size: 18px;">Reconciliation Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Date Range:</strong></td>
              <td style="padding: 8px 0;">${startDate} to ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Transactions:</strong></td>
              <td style="padding: 8px 0;">${summary.totalTransactions}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Matched:</strong></td>
              <td style="padding: 8px 0; color: #4CAF50;">${summary.matched}</td>
            </tr>
            <tr style="background-color: #ffcdd2;">
              <td style="padding: 8px 0;"><strong>Discrepancies:</strong></td>
              <td style="padding: 8px 0; color: #d32f2f; font-weight: bold;">${summary.discrepancies}</td>
            </tr>
            <tr style="background-color: #ffe0b2;">
              <td style="padding: 8px 0;"><strong>Unmatched:</strong></td>
              <td style="padding: 8px 0; color: #f57c00; font-weight: bold;">${summary.unmatched}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Pending Verification:</strong></td>
              <td style="padding: 8px 0;">${summary.pendingVerification}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0;">KES ${summary.totalAmount?.toLocaleString() || 0}</td>
            </tr>
          </table>
        </div>

        ${discrepancyDetailsHtml}
        ${unmatchedDetailsHtml}

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1565c0;">Recommended Actions</h3>
          <ol style="line-height: 1.8; margin: 10px 0;">
            <li>Log in to the admin dashboard to review detailed discrepancy reports</li>
            <li>Verify each discrepancy against M-Pesa transaction records</li>
            <li>Contact clients or therapists if necessary to resolve issues</li>
            <li>Update session records to reflect correct payment status</li>
            <li>Document any manual corrections in the audit log</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/admin/reconciliation" 
             style="display: inline-block; background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Full Reconciliation Report
          </a>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          This alert was generated automatically by the payment reconciliation system at ${new Date(summary.timestamp).toLocaleString()}.
        </p>
        
        <p style="font-size: 14px; color: #666;">
          Best regards,<br>
          <strong>Smiling Steps Automated Reconciliation System</strong>
        </p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="font-size: 12px; color: #666; margin: 0;">
          This is an automated alert. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: adminEmail,
      subject: `⚠️ Payment Reconciliation Alert - ${summary.discrepancies + summary.unmatched} Issues Detected`,
      html: emailHtml
    });

    console.log('✅ Reconciliation discrepancy alert sent to admin:', adminEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send reconciliation alert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send real-time reconciliation discrepancy alert to admin
 * @param {Object} reconciliationResult - Real-time reconciliation result
 * @param {string} adminEmail - Admin email address
 */
const sendRealTimeDiscrepancyAlert = async (reconciliationResult, adminEmail) => {
  const { sessionDetails, issues, reconciliationMetadata } = reconciliationResult;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #ff5722; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🚨 Real-Time Payment Alert</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Immediate discrepancy detected</p>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear Admin,</p>
        <p>A payment discrepancy has been detected in real-time and requires immediate attention.</p>
        
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d32f2f;">Session Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Session ID:</strong> ${sessionDetails.id}</li>
            <li><strong>Client:</strong> ${sessionDetails.client}</li>
            <li><strong>Psychologist:</strong> ${sessionDetails.psychologist}</li>
            <li><strong>Amount:</strong> KES ${sessionDetails.amount}</li>
            <li><strong>Transaction ID:</strong> ${sessionDetails.transactionId || 'N/A'}</li>
            <li><strong>Payment Status:</strong> ${sessionDetails.paymentStatus}</li>
          </ul>
        </div>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #e65100;">Detected Issues</h3>
          <ul style="line-height: 1.8;">
            ${issues.map(issue => `<li style="color: #d84315;"><strong>${issue.type}:</strong> ${issue.message}</li>`).join('')}
          </ul>
        </div>

        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">Reconciliation Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Trigger:</strong> ${reconciliationMetadata.trigger}</li>
            <li><strong>Processing Time:</strong> ${reconciliationMetadata.processingTime}ms</li>
            <li><strong>Detected At:</strong> ${new Date(reconciliationMetadata.timestamp).toLocaleString()}</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/admin/sessions/${sessionDetails.id}" 
             style="display: inline-block; background-color: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Review Session Immediately
          </a>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          This alert was generated by the real-time reconciliation system. Please investigate immediately.
        </p>
        
        <p style="font-size: 14px; color: #666;">
          Best regards,<br>
          <strong>Smiling Steps Real-Time Monitoring</strong>
        </p>
      </div>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: adminEmail,
      subject: `🚨 URGENT: Real-Time Payment Discrepancy - Session ${sessionDetails.id}`,
      html: emailHtml
    });

    console.log('✅ Real-time discrepancy alert sent to admin:', adminEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send real-time discrepancy alert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send real-time reconciliation discrepancy SMS alert
 * @param {Object} reconciliationResult - Real-time reconciliation result
 * @param {string} adminPhone - Admin phone number
 */
const sendRealTimeDiscrepancySMS = async (reconciliationResult, adminPhone) => {
  const { sessionDetails, issues } = reconciliationResult;
  
  const issueTypes = issues.map(i => i.type).join(', ');
  const message = `🚨 URGENT PAYMENT ALERT: Discrepancy detected for session ${sessionDetails.id}. Issues: ${issueTypes}. Amount: KES ${sessionDetails.amount}. Check admin dashboard NOW. - Smiling Steps`;

  try {
    const result = await sendSMS({
      to: adminPhone,
      message: message
    });

    console.log('✅ Real-time discrepancy SMS sent to admin:', adminPhone);
    return result;
  } catch (error) {
    console.error('❌ Failed to send real-time discrepancy SMS:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendSMS,
  sendSessionApprovalNotification,
  sendPaymentConfirmationNotification,
  sendTherapistPaymentNotification,
  sendPaymentFailureNotification,
  sendSessionReminderSMS,
  sendReconciliationDiscrepancyAlert,
  sendReconciliationDiscrepancySMS,
  sendRealTimeDiscrepancyAlert,
  sendRealTimeDiscrepancySMS
};
