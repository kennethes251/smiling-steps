/**
 * Notification Templates for Cancellation and Rescheduling
 * 
 * Provides email and SMS templates for:
 * - Cancellation confirmation
 * - Reschedule request
 * - Reschedule approval
 * - Refund processed
 * 
 * Requirements: 9.5 from Cancellation & Rescheduling
 */

const CLIENT_URL = process.env.CLIENT_URL || 'https://smilingsteps.com';

/**
 * Format date for display
 */
const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format currency
 */
const formatCurrency = (amount) => {
  return `KES ${Number(amount).toLocaleString()}`;
};

// ============================================
// CANCELLATION TEMPLATES
// ============================================

/**
 * Cancellation confirmation email for client
 */
const cancellationConfirmationClientEmail = (data) => {
  const {
    clientName,
    therapistName,
    sessionDate,
    sessionType,
    cancellationReason,
    refundAmount,
    refundPercentage,
    refundStatus,
    policy,
    sessionId
  } = data;

  const refundSection = refundAmount > 0 ? `
    <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2e7d32;">💰 Refund Information</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 5px 0;"><strong>Refund Amount:</strong> ${formatCurrency(refundAmount)}</li>
        <li style="padding: 5px 0;"><strong>Refund Percentage:</strong> ${refundPercentage}%</li>
        <li style="padding: 5px 0;"><strong>Status:</strong> ${refundStatus === 'pending' ? 'Processing' : refundStatus}</li>
        <li style="padding: 5px 0;"><strong>Policy Applied:</strong> ${policy}</li>
      </ul>
      <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
        Your refund will be processed within 3-5 business days and credited to your M-Pesa account.
      </p>
    </div>
  ` : `
    <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #e65100;">ℹ️ Refund Policy</h3>
      <p style="margin: 0;">${policy}</p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
        Based on our cancellation policy, no refund is applicable for this cancellation.
      </p>
    </div>
  `;

  return {
    subject: 'Session Cancellation Confirmed | Smiling Steps',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f44336; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Session Cancelled</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>Your therapy session has been cancelled as requested. We're sorry to see you go, but we understand that circumstances change.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Cancelled Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Session ID:</strong> ${sessionId}</li>
              <li style="padding: 5px 0;"><strong>Therapist:</strong> Dr. ${therapistName}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${sessionType}</li>
              <li style="padding: 5px 0;"><strong>Original Date:</strong> ${formatDate(sessionDate)}</li>
              <li style="padding: 5px 0;"><strong>Cancellation Reason:</strong> ${cancellationReason.replace(/_/g, ' ')}</li>
            </ul>
          </div>

          ${refundSection}

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">📆 Ready to Rebook?</h3>
            <p style="margin: 0;">When you're ready to schedule another session, we're here for you.</p>
            <div style="text-align: center; margin-top: 15px;">
              <a href="${CLIENT_URL}/booking" 
                 style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Book New Session
              </a>
            </div>
          </div>

          <p style="margin-top: 30px;">If you have any questions about your cancellation or refund, please don't hesitate to contact us.</p>
          
          <p>Take care,<br><strong>Smiling Steps Team</strong></p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  };
};

/**
 * Cancellation notification email for therapist
 */
const cancellationNotificationTherapistEmail = (data) => {
  const {
    therapistName,
    clientName,
    sessionDate,
    sessionType,
    cancellationReason,
    cancelledBy,
    sessionId
  } = data;

  return {
    subject: `Session Cancelled - ${clientName} | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Session Cancelled</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear Dr. ${therapistName},</p>
          <p>A session has been cancelled. Here are the details:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Cancelled Session</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Session ID:</strong> ${sessionId}</li>
              <li style="padding: 5px 0;"><strong>Client:</strong> ${clientName}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${sessionType}</li>
              <li style="padding: 5px 0;"><strong>Original Date:</strong> ${formatDate(sessionDate)}</li>
              <li style="padding: 5px 0;"><strong>Cancelled By:</strong> ${cancelledBy}</li>
              <li style="padding: 5px 0;"><strong>Reason:</strong> ${cancellationReason.replace(/_/g, ' ')}</li>
            </ul>
          </div>

          <p>This time slot is now available for other bookings.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Dashboard
            </a>
          </div>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * Cancellation SMS for client
 */
const cancellationConfirmationClientSMS = (data) => {
  const { sessionDate, refundAmount, refundStatus } = data;
  const dateStr = new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  if (refundAmount > 0) {
    return `Smiling Steps: Your session on ${dateStr} has been cancelled. Refund of ${formatCurrency(refundAmount)} is ${refundStatus}. Questions? Contact support.`;
  }
  return `Smiling Steps: Your session on ${dateStr} has been cancelled. Per our policy, no refund applies. Book again anytime at ${CLIENT_URL}`;
};

// ============================================
// RESCHEDULE TEMPLATES
// ============================================

/**
 * Reschedule request email for therapist (pending approval)
 */
const rescheduleRequestTherapistEmail = (data) => {
  const {
    therapistName,
    clientName,
    originalDate,
    requestedNewDate,
    rescheduleReason,
    rescheduleNotes,
    sessionId,
    hoursUntilSession
  } = data;

  return {
    subject: `Reschedule Request - ${clientName} | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⏰ Reschedule Request</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Action Required</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear Dr. ${therapistName},</p>
          <p>Your client <strong>${clientName}</strong> has requested to reschedule their session.</p>
          
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #e65100;">⚠️ Approval Required</h3>
            <p style="margin: 0;">This request was made with less than 24 hours notice (${Math.round(hoursUntilSession)} hours before session) and requires your approval.</p>
          </div>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Schedule Change</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Current Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formatDate(originalDate)}</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Requested New Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${formatDate(requestedNewDate)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${rescheduleReason.replace(/_/g, ' ')}</td>
              </tr>
              ${rescheduleNotes ? `
              <tr>
                <td style="padding: 10px;"><strong>Notes:</strong></td>
                <td style="padding: 10px;">${rescheduleNotes}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 5px;">
              Approve Request
            </a>
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 5px;">
              Decline Request
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">Please respond to this request as soon as possible so your client can plan accordingly.</p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * Reschedule request confirmation email for client
 */
const rescheduleRequestClientEmail = (data) => {
  const {
    clientName,
    therapistName,
    originalDate,
    requestedNewDate,
    requiresApproval
  } = data;

  const statusMessage = requiresApproval 
    ? `<div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #e65100;">⏳ Awaiting Approval</h3>
        <p style="margin: 0;">Your reschedule request has been submitted and is awaiting approval from Dr. ${therapistName}. You will be notified once they respond.</p>
      </div>`
    : `<div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2e7d32;">✅ Auto-Approved</h3>
        <p style="margin: 0;">Your reschedule request has been automatically approved since you provided more than 24 hours notice.</p>
      </div>`;

  return {
    subject: requiresApproval ? 'Reschedule Request Submitted | Smiling Steps' : 'Session Rescheduled | Smiling Steps',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${requiresApproval ? '#ff9800' : '#4caf50'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${requiresApproval ? 'Reschedule Request Submitted' : 'Session Rescheduled'}</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>${requiresApproval ? 'Your reschedule request has been submitted.' : 'Your session has been successfully rescheduled.'}</p>
          
          ${statusMessage}

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Schedule Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Therapist:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Dr. ${therapistName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Original Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-decoration: line-through; color: #999;">${formatDate(originalDate)}</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 10px;"><strong>New Date:</strong></td>
                <td style="padding: 10px;"><strong>${formatDate(requestedNewDate)}</strong></td>
              </tr>
            </table>
          </div>

          <p>Please update your calendar accordingly.</p>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View My Sessions
            </a>
          </div>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * Reschedule approval email for client
 */
const rescheduleApprovalClientEmail = (data) => {
  const {
    clientName,
    therapistName,
    originalDate,
    newDate,
    sessionType,
    sessionId
  } = data;

  return {
    subject: 'Session Rescheduled - Confirmed | Smiling Steps',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4caf50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Reschedule Approved</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>Great news! Your reschedule request has been approved by Dr. ${therapistName}.</p>
          
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">📅 Updated Session Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Therapist:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Dr. ${therapistName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session Type:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionType}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Original Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-decoration: line-through; color: #999;">${formatDate(originalDate)}</td>
              </tr>
              <tr style="background-color: #c8e6c9;">
                <td style="padding: 10px;"><strong>New Date:</strong></td>
                <td style="padding: 10px;"><strong>${formatDate(newDate)}</strong></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">📝 Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Update your calendar with the new date</li>
              <li>You'll receive a reminder 24 hours before your session</li>
              <li>The meeting link will be available in your dashboard</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View My Sessions
            </a>
          </div>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  };
};

/**
 * Reschedule approval notification for therapist
 */
const rescheduleApprovalTherapistEmail = (data) => {
  const {
    therapistName,
    clientName,
    originalDate,
    newDate,
    sessionType,
    sessionId
  } = data;

  return {
    subject: `Session Rescheduled - ${clientName} | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4caf50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📅 Session Rescheduled</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear Dr. ${therapistName},</p>
          <p>The session with <strong>${clientName}</strong> has been successfully rescheduled.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Updated Schedule</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Client:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${clientName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session Type:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionType}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Original Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-decoration: line-through; color: #999;">${formatDate(originalDate)}</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 10px;"><strong>New Date:</strong></td>
                <td style="padding: 10px;"><strong>${formatDate(newDate)}</strong></td>
              </tr>
            </table>
          </div>

          <p>Your calendar has been updated accordingly.</p>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Dashboard
            </a>
          </div>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * Reschedule rejection email for client
 */
const rescheduleRejectionClientEmail = (data) => {
  const {
    clientName,
    therapistName,
    originalDate,
    requestedNewDate,
    rejectionReason,
    sessionId
  } = data;

  return {
    subject: 'Reschedule Request Declined | Smiling Steps',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f44336; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Reschedule Request Declined</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>Unfortunately, your reschedule request has been declined by Dr. ${therapistName}.</p>
          
          <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c62828;">📋 Request Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Original Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formatDate(originalDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Requested New Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formatDate(requestedNewDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Reason:</strong></td>
                <td style="padding: 10px;">${rejectionReason}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #e65100;">ℹ️ What This Means</h3>
            <p style="margin: 0;">Your session remains scheduled for the original date: <strong>${formatDate(originalDate)}</strong></p>
            <p style="margin: 10px 0 0 0;">If you cannot attend, you may consider cancelling the session. Please review our cancellation policy for refund eligibility.</p>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 5px;">
              View My Sessions
            </a>
            <a href="${CLIENT_URL}/booking" 
               style="display: inline-block; background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 5px;">
              Book New Session
            </a>
          </div>

          <p>If you have questions, please contact our support team.</p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * Refund processed email for client
 */
const refundProcessedEmail = (data) => {
  const {
    clientName,
    therapistName,
    sessionDate,
    refundAmount,
    refundPercentage,
    transactionId,
    originalPaymentAmount,
    cancellationReason,
    sessionId
  } = data;

  return {
    subject: 'Refund Processed | Smiling Steps',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4caf50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">💰 Refund Processed</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>Your refund has been successfully processed and sent to your M-Pesa account.</p>
          
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">💳 Refund Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Refund Amount:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #2e7d32; font-weight: bold;">${formatCurrency(refundAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Refund Percentage:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${refundPercentage}%</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Original Payment:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formatCurrency(originalPaymentAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Transaction ID:</strong></td>
                <td style="padding: 10px;">${transactionId}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Cancelled Session</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${sessionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Therapist:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Dr. ${therapistName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Session Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formatDate(sessionDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Cancellation Reason:</strong></td>
                <td style="padding: 10px;">${cancellationReason.replace(/_/g, ' ')}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">📆 Ready to Rebook?</h3>
            <p style="margin: 0;">When you're ready to schedule another session, we're here for you.</p>
            <div style="text-align: center; margin-top: 15px;">
              <a href="${CLIENT_URL}/booking" 
                 style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Book New Session
              </a>
            </div>
          </div>

          <p style="font-size: 14px; color: #666;">Please keep this email for your records. The refund should reflect in your M-Pesa account within 24 hours.</p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            Transaction ID: ${transactionId} | This is an automated message.
          </p>
        </div>
      </div>
    `
  };
};

// ============================================
// SMS TEMPLATES
// ============================================

/**
 * Reschedule request SMS for therapist
 */
const rescheduleRequestTherapistSMS = (data) => {
  const { clientName, originalDate, requestedNewDate } = data;
  const origDateStr = new Date(originalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const newDateStr = new Date(requestedNewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `Smiling Steps: ${clientName} requests to reschedule from ${origDateStr} to ${newDateStr}. Please approve/decline in your dashboard.`;
};

/**
 * Reschedule approval SMS for client
 */
const rescheduleApprovalClientSMS = (data) => {
  const { newDate, therapistName } = data;
  const dateStr = new Date(newDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `Smiling Steps: Your reschedule request was approved! New session with Dr. ${therapistName} on ${dateStr}. Update your calendar.`;
};

/**
 * Reschedule rejection SMS for client
 */
const rescheduleRejectionClientSMS = (data) => {
  const { originalDate } = data;
  const dateStr = new Date(originalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `Smiling Steps: Your reschedule request was declined. Your session remains on ${dateStr}. Check email for details.`;
};

/**
 * Refund processed SMS for client
 */
const refundProcessedSMS = (data) => {
  const { refundAmount, transactionId } = data;
  
  return `Smiling Steps: Refund of ${formatCurrency(refundAmount)} processed to your M-Pesa. Ref: ${transactionId}. Allow 24hrs to reflect.`;
};

/**
 * Cancellation notification SMS for therapist
 */
const cancellationNotificationTherapistSMS = (data) => {
  const { clientName, sessionDate } = data;
  const dateStr = new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `Smiling Steps: Session with ${clientName} on ${dateStr} has been cancelled. Time slot is now available.`;
};

// ============================================
// SESSION REMINDER TEMPLATES
// Requirements: 15.1, 15.2
// ============================================

/**
 * 24-hour reminder email for client
 */
const sessionReminder24HourClientEmail = (data) => {
  const {
    clientName,
    therapistName,
    sessionDate,
    sessionType
  } = data;

  return {
    subject: `Reminder: Session Tomorrow | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔔 Session Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Your session is tomorrow!</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>This is a friendly reminder that you have a therapy session scheduled for tomorrow.</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">📅 Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${formatDate(sessionDate)}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${sessionType}</li>
              <li style="padding: 5px 0;"><strong>Therapist:</strong> Dr. ${therapistName}</li>
            </ul>
          </div>

          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #e65100;">📝 Preparation Tips</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Find a quiet, private space</li>
              <li>Test your camera and microphone</li>
              <li>Ensure stable internet connection</li>
              <li>Join 5 minutes early</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Session Details
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">You'll receive another reminder 1 hour before your session with the meeting link.</p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * 1-hour reminder email for client with meeting link
 */
const sessionReminder1HourClientEmail = (data) => {
  const {
    clientName,
    therapistName,
    sessionDate,
    sessionType,
    meetingLink
  } = data;

  const fullMeetingUrl = meetingLink ? 
    `${CLIENT_URL}/video-call/${meetingLink}` :
    `${CLIENT_URL}/dashboard`;

  return {
    subject: `Starting Soon: Session in 1 Hour | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⏰ Session Starting Soon!</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Your session begins in 1 hour</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear ${clientName},</p>
          <p>Your therapy session is starting in approximately 1 hour. Please prepare to join.</p>
          
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">📅 Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${formatDate(sessionDate)}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${sessionType}</li>
              <li style="padding: 5px 0;"><strong>Therapist:</strong> Dr. ${therapistName}</li>
            </ul>
          </div>

          <div style="background-color: #4caf50; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: white;">🎥 Join Your Session</h3>
            <a href="${fullMeetingUrl}" 
               style="display: inline-block; background-color: white; color: #4caf50; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 18px; margin-top: 10px;">
              Join Video Call
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Having technical issues? Visit our <a href="${CLIENT_URL}/help">Help Center</a>.
          </p>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * 24-hour reminder SMS for client
 */
const sessionReminder24HourClientSMS = (data) => {
  const { sessionDate, therapistName } = data;
  const dateStr = new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `Smiling Steps: Reminder - Your session with Dr. ${therapistName} is tomorrow at ${dateStr}. Be ready 5 mins early!`;
};

/**
 * 1-hour reminder SMS for client with meeting link
 */
const sessionReminder1HourClientSMS = (data) => {
  const { sessionDate, meetingLink } = data;
  const dateStr = new Date(sessionDate).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' });
  const shortUrl = meetingLink ? `${CLIENT_URL}/vc/${meetingLink.substring(0, 8)}` : `${CLIENT_URL}/dashboard`;
  
  return `Smiling Steps: Your session starts in 1 HOUR at ${dateStr}. Join now: ${shortUrl}`;
};

/**
 * 24-hour reminder email for therapist
 */
const sessionReminder24HourTherapistEmail = (data) => {
  const {
    therapistName,
    clientName,
    sessionDate,
    sessionType
  } = data;

  return {
    subject: `Reminder: Session Tomorrow with ${clientName} | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔔 Session Reminder</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear Dr. ${therapistName},</p>
          <p>You have a therapy session scheduled for tomorrow.</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">📅 Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${formatDate(sessionDate)}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${sessionType}</li>
              <li style="padding: 5px 0;"><strong>Client:</strong> ${clientName}</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${CLIENT_URL}/dashboard" 
               style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Client Details
            </a>
          </div>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * 1-hour reminder email for therapist
 */
const sessionReminder1HourTherapistEmail = (data) => {
  const {
    therapistName,
    clientName,
    sessionDate,
    sessionType,
    meetingLink
  } = data;

  const fullMeetingUrl = meetingLink ? 
    `${CLIENT_URL}/video-call/${meetingLink}` :
    `${CLIENT_URL}/dashboard`;

  return {
    subject: `Starting Soon: Session with ${clientName} in 1 Hour | Smiling Steps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⏰ Session Starting Soon!</h1>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Dear Dr. ${therapistName},</p>
          <p>Your session with ${clientName} starts in approximately 1 hour.</p>
          
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">📅 Session Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${formatDate(sessionDate)}</li>
              <li style="padding: 5px 0;"><strong>Session Type:</strong> ${sessionType}</li>
              <li style="padding: 5px 0;"><strong>Client:</strong> ${clientName}</li>
            </ul>
          </div>

          <div style="background-color: #4caf50; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: white;">🎥 Start Session</h3>
            <a href="${fullMeetingUrl}" 
               style="display: inline-block; background-color: white; color: #4caf50; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 18px; margin-top: 10px;">
              Join Video Call
            </a>
          </div>

          <p>Best regards,<br><strong>Smiling Steps Team</strong></p>
        </div>
      </div>
    `
  };
};

/**
 * 24-hour reminder SMS for therapist
 */
const sessionReminder24HourTherapistSMS = (data) => {
  const { sessionDate, clientName } = data;
  const dateStr = new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `Smiling Steps: Reminder - Session with ${clientName} tomorrow at ${dateStr}. Review client notes in your dashboard.`;
};

/**
 * 1-hour reminder SMS for therapist
 */
const sessionReminder1HourTherapistSMS = (data) => {
  const { clientName, meetingLink } = data;
  const shortUrl = meetingLink ? `${CLIENT_URL}/vc/${meetingLink.substring(0, 8)}` : `${CLIENT_URL}/dashboard`;
  
  return `Smiling Steps: Session with ${clientName} in 1 HOUR. Join: ${shortUrl}`;
};

// ============================================
// MODULE EXPORTS
// ============================================

module.exports = {
  // Helper functions
  formatDate,
  formatCurrency,
  
  // Cancellation email templates
  cancellationConfirmationClientEmail,
  cancellationNotificationTherapistEmail,
  
  // Cancellation SMS templates
  cancellationConfirmationClientSMS,
  cancellationNotificationTherapistSMS,
  
  // Reschedule email templates
  rescheduleRequestTherapistEmail,
  rescheduleRequestClientEmail,
  rescheduleApprovalClientEmail,
  rescheduleApprovalTherapistEmail,
  rescheduleRejectionClientEmail,
  
  // Reschedule SMS templates
  rescheduleRequestTherapistSMS,
  rescheduleApprovalClientSMS,
  rescheduleRejectionClientSMS,
  
  // Refund templates
  refundProcessedEmail,
  refundProcessedSMS,
  
  // Session reminder templates (Requirements: 15.1, 15.2)
  sessionReminder24HourClientEmail,
  sessionReminder1HourClientEmail,
  sessionReminder24HourClientSMS,
  sessionReminder1HourClientSMS,
  sessionReminder24HourTherapistEmail,
  sessionReminder1HourTherapistEmail,
  sessionReminder24HourTherapistSMS,
  sessionReminder1HourTherapistSMS
};
