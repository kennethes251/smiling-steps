/**
 * Automatic Issue Resolver
 * Implements intelligent automation to resolve common M-Pesa payment issues
 * without manual intervention
 */

// Session model will be available globally after initialization
const mpesaAPI = require('../config/mpesa');
const { mapResultCode, shouldAutoRetry } = require('./mpesaErrorMapper');
const { handleApiCall } = require('./mpesaRetryHandler');
const { reconcileSession, verifyTransaction } = require('./paymentReconciliation');
const notificationService = require('./notificationService');
const auditLogger = require('./auditLogger');

// Configuration for automatic resolution
const RESOLUTION_CONFIG = {
  // Maximum number of automatic resolution attempts per issue
  MAX_AUTO_RESOLUTION_ATTEMPTS: 3,
  
  // Time windows for different resolution strategies (in milliseconds)
  IMMEDIATE_RESOLUTION_WINDOW: 5 * 60 * 1000, // 5 minutes
  DELAYED_RESOLUTION_WINDOW: 30 * 60 * 1000, // 30 minutes
  EXTENDED_RESOLUTION_WINDOW: 2 * 60 * 60 * 1000, // 2 hours
  
  // Retry intervals for different issue types
  RETRY_INTERVALS: {
    timeout: 2 * 60 * 1000, // 2 minutes
    api_unavailable: 5 * 60 * 1000, // 5 minutes
    system_error: 10 * 60 * 1000, // 10 minutes
    unclear_status: 3 * 60 * 1000, // 3 minutes
    orphaned_payment: 15 * 60 * 1000 // 15 minutes
  }
};

// Track resolution attempts to prevent infinite loops
const resolutionAttempts = new Map(); // sessionId -> { attempts, lastAttempt, issueType }

/**
 * Issue types that can be automatically resolved
 */
const ResolvableIssueTypes = {
  TIMEOUT_RECOVERY: 'timeout_recovery',
  STATUS_VERIFICATION: 'status_verification',
  ORPHANED_PAYMENT: 'orphaned_payment',
  DUPLICATE_CALLBACK: 'duplicate_callback',
  AMOUNT_MISMATCH: 'amount_mismatch',
  STATUS_INCONSISTENCY: 'status_inconsistency',
  FAILED_CALLBACK_RETRY: 'failed_callback_retry',
  API_SYNC_ISSUE: 'api_sync_issue'
};

/**
 * Main automatic issue resolution function
 * @param {string} issueType - Type of issue to resolve
 * @param {Object} context - Context data for the issue
 * @returns {Promise<Object>} Resolution result
 */
async function resolveIssue(issueType, context) {
  const { sessionId } = context;
  
  try {
    // Check if we've exceeded maximum resolution attempts
    if (!canAttemptResolution(sessionId, issueType)) {
      console.log(`⚠️ Maximum resolution attempts reached for session ${sessionId}, issue: ${issueType}`);
      return {
        success: false,
        reason: 'max_attempts_exceeded',
        requiresManualIntervention: true
      };
    }

    // Track this resolution attempt
    trackResolutionAttempt(sessionId, issueType);

    console.log(`🔧 Attempting automatic resolution for ${issueType} on session ${sessionId}`);

    // Route to appropriate resolution strategy
    let result;
    switch (issueType) {
      case ResolvableIssueTypes.TIMEOUT_RECOVERY:
        result = await resolveTimeoutIssue(context);
        break;
      case ResolvableIssueTypes.STATUS_VERIFICATION:
        result = await resolveStatusVerificationIssue(context);
        break;
      case ResolvableIssueTypes.ORPHANED_PAYMENT:
        result = await resolveOrphanedPaymentIssue(context);
        break;
      case ResolvableIssueTypes.DUPLICATE_CALLBACK:
        result = await resolveDuplicateCallbackIssue(context);
        break;
      case ResolvableIssueTypes.AMOUNT_MISMATCH:
        result = await resolveAmountMismatchIssue(context);
        break;
      case ResolvableIssueTypes.STATUS_INCONSISTENCY:
        result = await resolveStatusInconsistencyIssue(context);
        break;
      case ResolvableIssueTypes.FAILED_CALLBACK_RETRY:
        result = await resolveFailedCallbackIssue(context);
        break;
      case ResolvableIssueTypes.API_SYNC_ISSUE:
        result = await resolveApiSyncIssue(context);
        break;
      default:
        result = {
          success: false,
          reason: 'unknown_issue_type',
          requiresManualIntervention: true
        };
    }

    // Log the resolution attempt
    await auditLogger.logPaymentAction({
      action: 'AUTOMATIC_ISSUE_RESOLUTION',
      sessionId,
      issueType,
      result: result.success ? 'SUCCESS' : 'FAILED',
      details: {
        reason: result.reason,
        requiresManualIntervention: result.requiresManualIntervention,
        attemptNumber: getResolutionAttempts(sessionId, issueType)
      }
    });

    // If resolution was successful, clear tracking
    if (result.success) {
      clearResolutionTracking(sessionId, issueType);
      console.log(`✅ Successfully resolved ${issueType} for session ${sessionId}`);
    } else if (result.requiresManualIntervention) {
      // Flag for admin attention
      await flagForManualIntervention(sessionId, issueType, result.reason);
    }

    return result;

  } catch (error) {
    console.error(`❌ Error during automatic resolution of ${issueType}:`, error);
    
    await auditLogger.logPaymentAction({
      action: 'AUTOMATIC_RESOLUTION_ERROR',
      sessionId,
      issueType,
      error: error.message
    });

    return {
      success: false,
      reason: 'resolution_error',
      error: error.message,
      requiresManualIntervention: true
    };
  }
}

/**
 * Resolve payment timeout issues by querying M-Pesa API
 */
async function resolveTimeoutIssue(context) {
  const { sessionId, checkoutRequestID } = context;

  try {
    console.log(`🔍 Resolving timeout issue for session ${sessionId}`);

    // Query M-Pesa API for current status
    const queryResult = await handleApiCall(
      () => mpesaAPI.stkQuery(checkoutRequestID),
      { metadata: { sessionId, action: 'timeout_resolution' } }
    );

    // Update session based on query result
    const session = await Session.findById(sessionId);
    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    const resultCode = parseInt(queryResult.ResultCode);
    const resultDesc = queryResult.ResultDesc;

    // Update session with query results
    session.mpesaResultCode = resultCode;
    session.mpesaResultDesc = resultDesc;

    if (resultCode === 0) {
      // Payment was successful
      session.paymentStatus = 'Paid';
      session.status = 'Confirmed';
      session.paymentVerifiedAt = new Date();
      
      // Extract transaction ID if available
      if (queryResult.CallbackMetadata && queryResult.CallbackMetadata.Item) {
        const transactionItem = queryResult.CallbackMetadata.Item.find(
          item => item.Name === 'MpesaReceiptNumber'
        );
        if (transactionItem) {
          session.mpesaTransactionID = transactionItem.Value;
        }
      }

      await session.save();

      // Send success notifications
      await sendResolutionNotifications(session, 'payment_confirmed');

      return {
        success: true,
        reason: 'payment_confirmed_via_query',
        transactionId: session.mpesaTransactionID
      };

    } else if (resultCode === 1032) {
      // User cancelled - no further action needed
      session.paymentStatus = 'Failed';
      session.paymentFailureReason = 'User cancelled payment';
      await session.save();

      return {
        success: true,
        reason: 'user_cancelled_confirmed'
      };

    } else {
      // Payment failed
      session.paymentStatus = 'Failed';
      session.paymentFailureReason = resultDesc;
      await session.save();

      return {
        success: true,
        reason: 'payment_failure_confirmed',
        failureReason: resultDesc
      };
    }

  } catch (error) {
    console.error('❌ Failed to resolve timeout issue:', error);
    return {
      success: false,
      reason: 'query_failed',
      error: error.message
    };
  }
}

/**
 * Resolve status verification issues
 */
async function resolveStatusVerificationIssue(context) {
  const { sessionId } = context;

  try {
    console.log(`🔍 Resolving status verification issue for session ${sessionId}`);

    // Perform reconciliation check
    const session = await Session.findById(sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    const reconciliationResult = await reconcileSession(session);

    if (reconciliationResult.status === 'matched') {
      // No issues found
      return {
        success: true,
        reason: 'status_verified_correct'
      };
    }

    // Check for specific issues and resolve them
    if (reconciliationResult.issues) {
      for (const issue of reconciliationResult.issues) {
        if (issue.type === 'status_mismatch') {
          // Fix status mismatch
          if (session.mpesaTransactionID && session.paymentStatus !== 'Paid') {
            session.paymentStatus = 'Paid';
            session.status = 'Confirmed';
            await session.save();

            await sendResolutionNotifications(session, 'status_corrected');

            return {
              success: true,
              reason: 'status_mismatch_corrected'
            };
          }
        }
      }
    }

    return {
      success: false,
      reason: 'unresolvable_status_issue',
      requiresManualIntervention: true
    };

  } catch (error) {
    console.error('❌ Failed to resolve status verification issue:', error);
    return {
      success: false,
      reason: 'verification_failed',
      error: error.message
    };
  }
}

/**
 * Resolve orphaned payment issues
 */
async function resolveOrphanedPaymentIssue(context) {
  const { sessionId } = context;

  try {
    console.log(`🔍 Resolving orphaned payment issue for session ${sessionId}`);

    const session = await Session.findById(sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    // Check if session has transaction ID but wrong status
    if (session.mpesaTransactionID && session.paymentStatus !== 'Paid') {
      // Verify the transaction is legitimate
      if (session.mpesaResultCode === 0) {
        // Update status to match transaction
        session.paymentStatus = 'Paid';
        session.status = 'Confirmed';
        session.paymentVerifiedAt = session.paymentVerifiedAt || new Date();
        await session.save();

        await sendResolutionNotifications(session, 'orphaned_payment_resolved');

        return {
          success: true,
          reason: 'orphaned_payment_status_corrected'
        };
      }
    }

    // Check for duplicate transaction IDs
    const duplicates = await Session.find({
      mpesaTransactionID: session.mpesaTransactionID,
      _id: { $ne: session._id }
    });

    if (duplicates.length > 0) {
      // This requires manual intervention
      return {
        success: false,
        reason: 'duplicate_transaction_detected',
        requiresManualIntervention: true,
        duplicateCount: duplicates.length
      };
    }

    return {
      success: false,
      reason: 'orphaned_payment_unresolvable',
      requiresManualIntervention: true
    };

  } catch (error) {
    console.error('❌ Failed to resolve orphaned payment issue:', error);
    return {
      success: false,
      reason: 'resolution_failed',
      error: error.message
    };
  }
}

/**
 * Resolve duplicate callback issues
 */
async function resolveDuplicateCallbackIssue(context) {
  const { sessionId, checkoutRequestID } = context;

  try {
    console.log(`🔍 Resolving duplicate callback issue for session ${sessionId}`);

    // Find all sessions with the same checkout request ID
    const sessions = await Session.find({
      mpesaCheckoutRequestID: checkoutRequestID
    }).sort({ paymentVerifiedAt: 1 });

    if (sessions.length <= 1) {
      return {
        success: true,
        reason: 'no_duplicates_found'
      };
    }

    // Keep the first successfully paid session, mark others as duplicates
    let keptSession = null;
    const duplicateSessions = [];

    for (const session of sessions) {
      if (session.paymentStatus === 'Paid' && session.mpesaTransactionID && !keptSession) {
        keptSession = session;
      } else {
        duplicateSessions.push(session);
      }
    }

    // Update duplicate sessions
    for (const duplicate of duplicateSessions) {
      duplicate.paymentStatus = 'Failed';
      duplicate.paymentFailureReason = 'Duplicate callback - payment processed in another session';
      duplicate.status = 'Approved'; // Reset to approved so user can retry
      await duplicate.save();
    }

    return {
      success: true,
      reason: 'duplicate_callbacks_resolved',
      keptSessionId: keptSession?._id,
      duplicatesResolved: duplicateSessions.length
    };

  } catch (error) {
    console.error('❌ Failed to resolve duplicate callback issue:', error);
    return {
      success: false,
      reason: 'resolution_failed',
      error: error.message
    };
  }
}

/**
 * Resolve amount mismatch issues
 */
async function resolveAmountMismatchIssue(context) {
  const { sessionId } = context;

  try {
    console.log(`🔍 Resolving amount mismatch issue for session ${sessionId}`);

    const session = await Session.findById(sessionId);
    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    // Check if M-Pesa amount differs from session price
    if (session.mpesaAmount && parseFloat(session.mpesaAmount) !== session.price) {
      const difference = Math.abs(parseFloat(session.mpesaAmount) - session.price);
      
      // If difference is small (less than 1 KES), consider it a rounding issue
      if (difference < 1) {
        session.price = parseFloat(session.mpesaAmount);
        await session.save();

        return {
          success: true,
          reason: 'rounding_difference_corrected',
          correctedAmount: session.price
        };
      }

      // For larger differences, flag for manual review
      return {
        success: false,
        reason: 'significant_amount_mismatch',
        requiresManualIntervention: true,
        expectedAmount: session.price,
        actualAmount: session.mpesaAmount,
        difference
      };
    }

    return {
      success: true,
      reason: 'no_amount_mismatch_found'
    };

  } catch (error) {
    console.error('❌ Failed to resolve amount mismatch issue:', error);
    return {
      success: false,
      reason: 'resolution_failed',
      error: error.message
    };
  }
}

/**
 * Resolve status inconsistency issues
 */
async function resolveStatusInconsistencyIssue(context) {
  const { sessionId } = context;

  try {
    console.log(`🔍 Resolving status inconsistency issue for session ${sessionId}`);

    const session = await Session.findById(sessionId);
    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    // Check for common inconsistencies and fix them
    let fixed = false;

    // Case 1: Has transaction ID and success result code but wrong payment status
    if (session.mpesaTransactionID && session.mpesaResultCode === 0 && session.paymentStatus !== 'Paid') {
      session.paymentStatus = 'Paid';
      session.status = 'Confirmed';
      session.paymentVerifiedAt = session.paymentVerifiedAt || new Date();
      fixed = true;
    }

    // Case 2: Payment status is Paid but session status is not Confirmed
    if (session.paymentStatus === 'Paid' && session.status !== 'Confirmed' && session.status !== 'Completed') {
      session.status = 'Confirmed';
      fixed = true;
    }

    // Case 3: Has failure result code but payment status is not Failed
    if (session.mpesaResultCode && session.mpesaResultCode !== 0 && session.paymentStatus === 'Paid') {
      session.paymentStatus = 'Failed';
      session.paymentFailureReason = session.mpesaResultDesc || 'Payment failed';
      session.status = 'Approved'; // Reset to approved for retry
      fixed = true;
    }

    if (fixed) {
      await session.save();
      await sendResolutionNotifications(session, 'status_inconsistency_resolved');

      return {
        success: true,
        reason: 'status_inconsistency_corrected'
      };
    }

    return {
      success: true,
      reason: 'no_inconsistency_found'
    };

  } catch (error) {
    console.error('❌ Failed to resolve status inconsistency issue:', error);
    return {
      success: false,
      reason: 'resolution_failed',
      error: error.message
    };
  }
}

/**
 * Resolve failed callback issues by retrying callback processing
 */
async function resolveFailedCallbackIssue(context) {
  const { sessionId, callbackData } = context;

  try {
    console.log(`🔍 Resolving failed callback issue for session ${sessionId}`);

    // Re-process the callback data
    const session = await Session.findById(sessionId);
    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    // Simulate callback processing
    if (callbackData && callbackData.Body && callbackData.Body.stkCallback) {
      const callback = callbackData.Body.stkCallback;
      const resultCode = callback.ResultCode;
      const resultDesc = callback.ResultDesc;

      session.mpesaResultCode = resultCode;
      session.mpesaResultDesc = resultDesc;

      if (resultCode === 0 && callback.CallbackMetadata) {
        // Extract payment details
        const metadata = callback.CallbackMetadata.Item;
        const transactionId = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
        const amount = metadata.find(item => item.Name === 'Amount')?.Value;
        const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

        session.mpesaTransactionID = transactionId;
        session.mpesaAmount = amount;
        session.mpesaPhoneNumber = phoneNumber;
        session.paymentStatus = 'Paid';
        session.status = 'Confirmed';
        session.paymentVerifiedAt = new Date();

        await session.save();
        await sendResolutionNotifications(session, 'callback_reprocessed_success');

        return {
          success: true,
          reason: 'callback_reprocessed_successfully',
          transactionId
        };
      } else {
        // Payment failed
        session.paymentStatus = 'Failed';
        session.paymentFailureReason = resultDesc;
        await session.save();

        return {
          success: true,
          reason: 'callback_reprocessed_failure_confirmed'
        };
      }
    }

    return {
      success: false,
      reason: 'invalid_callback_data',
      requiresManualIntervention: true
    };

  } catch (error) {
    console.error('❌ Failed to resolve failed callback issue:', error);
    return {
      success: false,
      reason: 'resolution_failed',
      error: error.message
    };
  }
}

/**
 * Resolve API synchronization issues
 */
async function resolveApiSyncIssue(context) {
  const { sessionId } = context;

  try {
    console.log(`🔍 Resolving API sync issue for session ${sessionId}`);

    // Verify transaction with M-Pesa API
    const verificationResult = await verifyTransaction(sessionId);

    if (verificationResult.match) {
      return {
        success: true,
        reason: 'api_sync_verified_correct'
      };
    }

    // If there's a mismatch, update our records to match M-Pesa
    const session = await Session.findById(sessionId);
    if (!session) {
      return { success: false, reason: 'session_not_found' };
    }

    session.mpesaResultCode = verificationResult.mpesaResultCode;
    session.mpesaResultDesc = verificationResult.mpesaResultDesc;

    if (verificationResult.mpesaResultCode === 0) {
      session.paymentStatus = 'Paid';
      session.status = 'Confirmed';
    } else {
      session.paymentStatus = 'Failed';
      session.paymentFailureReason = verificationResult.mpesaResultDesc;
    }

    await session.save();

    return {
      success: true,
      reason: 'api_sync_corrected',
      updatedResultCode: verificationResult.mpesaResultCode
    };

  } catch (error) {
    console.error('❌ Failed to resolve API sync issue:', error);
    return {
      success: false,
      reason: 'verification_failed',
      error: error.message
    };
  }
}

/**
 * Check if we can attempt resolution for a session/issue combination
 */
function canAttemptResolution(sessionId, issueType) {
  const key = `${sessionId}-${issueType}`;
  const attempts = resolutionAttempts.get(key);
  
  if (!attempts) {
    return true;
  }

  return attempts.count < RESOLUTION_CONFIG.MAX_AUTO_RESOLUTION_ATTEMPTS;
}

/**
 * Track a resolution attempt
 */
function trackResolutionAttempt(sessionId, issueType) {
  const key = `${sessionId}-${issueType}`;
  const existing = resolutionAttempts.get(key) || { count: 0, lastAttempt: null };
  
  resolutionAttempts.set(key, {
    count: existing.count + 1,
    lastAttempt: new Date(),
    issueType
  });
}

/**
 * Get number of resolution attempts for a session/issue
 */
function getResolutionAttempts(sessionId, issueType) {
  const key = `${sessionId}-${issueType}`;
  const attempts = resolutionAttempts.get(key);
  return attempts ? attempts.count : 0;
}

/**
 * Clear resolution tracking for successful resolutions
 */
function clearResolutionTracking(sessionId, issueType) {
  const key = `${sessionId}-${issueType}`;
  resolutionAttempts.delete(key);
}

/**
 * Flag session for manual intervention
 */
async function flagForManualIntervention(sessionId, issueType, reason) {
  try {
    console.log(`🚩 Flagging session ${sessionId} for manual intervention: ${issueType} - ${reason}`);

    // Log the flag for admin attention
    await auditLogger.logPaymentAction({
      action: 'FLAGGED_FOR_MANUAL_INTERVENTION',
      sessionId,
      issueType,
      reason,
      timestamp: new Date()
    });

    // Send notification to admin if configured
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await notificationService.sendEmail({
        to: adminEmail,
        subject: `Manual Intervention Required - Session ${sessionId}`,
        html: `
          <h2>Manual Intervention Required</h2>
          <p>Session ${sessionId} requires manual attention.</p>
          <p><strong>Issue Type:</strong> ${issueType}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please review this session in the admin dashboard.</p>
        `
      });
    }

  } catch (error) {
    console.error('❌ Failed to flag session for manual intervention:', error);
  }
}

/**
 * Send notifications after successful resolution
 */
async function sendResolutionNotifications(session, resolutionType) {
  try {
    const client = session.client || await session.populate('client', 'name email');
    const psychologist = session.psychologist || await session.populate('psychologist', 'name email');

    switch (resolutionType) {
      case 'payment_confirmed':
      case 'callback_reprocessed_success':
        if (session.paymentStatus === 'Paid') {
          await notificationService.sendPaymentConfirmationNotification(
            session, client, psychologist, session.mpesaTransactionID, session.price
          );
          await notificationService.sendTherapistPaymentNotification(
            session, client, psychologist, session.mpesaTransactionID, session.price
          );
        }
        break;
      
      case 'status_corrected':
      case 'orphaned_payment_resolved':
      case 'status_inconsistency_resolved':
        // Send a general resolution notification
        if (client && client.email) {
          await notificationService.sendEmail({
            to: client.email,
            subject: 'Payment Issue Resolved - Smiling Steps',
            html: `
              <h2>Payment Issue Resolved</h2>
              <p>Dear ${client.name},</p>
              <p>We've automatically resolved a payment issue with your session. Your session is now confirmed.</p>
              <p>No action is required from you.</p>
              <p>Best regards,<br>Smiling Steps Team</p>
            `
          });
        }
        break;
    }

  } catch (error) {
    console.error('❌ Failed to send resolution notifications:', error);
  }
}

/**
 * Schedule automatic resolution for later
 */
function scheduleResolution(issueType, context, delayMs) {
  console.log(`⏰ Scheduling ${issueType} resolution in ${delayMs}ms for session ${context.sessionId}`);
  
  setTimeout(async () => {
    try {
      await resolveIssue(issueType, context);
    } catch (error) {
      console.error(`❌ Scheduled resolution failed for ${issueType}:`, error);
    }
  }, delayMs);
}

/**
 * Detect and automatically resolve common issues
 */
async function detectAndResolveIssues() {
  try {
    console.log('🔍 Running automatic issue detection and resolution...');

    // Find sessions with potential issues
    const potentialIssues = await Session.find({
      $or: [
        // Timeout issues - processing for too long
        {
          paymentStatus: 'Processing',
          paymentInitiatedAt: {
            $lt: new Date(Date.now() - RESOLUTION_CONFIG.IMMEDIATE_RESOLUTION_WINDOW)
          }
        },
        // Status inconsistencies
        {
          mpesaTransactionID: { $exists: true, $ne: null },
          paymentStatus: { $ne: 'Paid' }
        },
        // Orphaned payments
        {
          mpesaResultCode: 0,
          paymentStatus: { $ne: 'Paid' }
        }
      ]
    });

    console.log(`📊 Found ${potentialIssues.length} sessions with potential issues`);

    const resolutionPromises = [];

    for (const session of potentialIssues) {
      // Determine issue type and resolve
      if (session.paymentStatus === 'Processing' && session.mpesaCheckoutRequestID) {
        resolutionPromises.push(
          resolveIssue(ResolvableIssueTypes.TIMEOUT_RECOVERY, {
            sessionId: session._id,
            checkoutRequestID: session.mpesaCheckoutRequestID
          })
        );
      }

      if (session.mpesaTransactionID && session.paymentStatus !== 'Paid') {
        resolutionPromises.push(
          resolveIssue(ResolvableIssueTypes.ORPHANED_PAYMENT, {
            sessionId: session._id
          })
        );
      }

      if (session.mpesaResultCode === 0 && session.paymentStatus !== 'Paid') {
        resolutionPromises.push(
          resolveIssue(ResolvableIssueTypes.STATUS_INCONSISTENCY, {
            sessionId: session._id
          })
        );
      }
    }

    // Execute all resolutions in parallel
    const results = await Promise.allSettled(resolutionPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`✅ Automatic issue resolution complete: ${successful} resolved, ${failed} failed`);

    return {
      totalIssues: potentialIssues.length,
      resolved: successful,
      failed,
      results
    };

  } catch (error) {
    console.error('❌ Error during automatic issue detection and resolution:', error);
    throw error;
  }
}

/**
 * Clean up old resolution tracking data
 */
function cleanupResolutionTracking() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [key, data] of resolutionAttempts.entries()) {
    if (data.lastAttempt && data.lastAttempt < oneHourAgo) {
      resolutionAttempts.delete(key);
    }
  }
}

// Schedule periodic issue detection and resolution (every 10 minutes)
setInterval(async () => {
  try {
    await detectAndResolveIssues();
    cleanupResolutionTracking();
  } catch (error) {
    console.error('❌ Periodic issue resolution failed:', error);
  }
}, 10 * 60 * 1000);

// Clean up tracking data every hour
setInterval(cleanupResolutionTracking, 60 * 60 * 1000);

module.exports = {
  resolveIssue,
  detectAndResolveIssues,
  scheduleResolution,
  ResolvableIssueTypes,
  RESOLUTION_CONFIG
};