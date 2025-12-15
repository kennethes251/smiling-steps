/**
 * M-Pesa Transaction Handler
 * Implements database transaction handling with rollback on failure
 */

const mongoose = require('mongoose');
const { logPaymentError } = require('./mpesaErrorMapper');

/**
 * Execute payment operation with transaction support and rollback
 * @param {Function} operation - Async function to execute within transaction
 * @param {Object} options - Transaction options
 * @returns {Promise} Result of operation
 */
async function withTransaction(operation, options = {}) {
  const {
    context = 'PAYMENT_OPERATION',
    metadata = {},
    notifyOnRollback = true
  } = options;

  // Start a MongoDB session for transaction support
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    session.startTransaction();
    
    console.log('🔄 Starting transaction:', context, metadata);
    
    // Execute the operation within the transaction
    const result = await operation(session);
    
    // Commit transaction if successful
    await session.commitTransaction();
    
    console.log('✅ Transaction committed:', context, metadata);
    
    return result;
    
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    
    console.error('❌ Transaction rolled back:', context, metadata, error.message);
    
    // Log the rollback
    logPaymentError('TRANSACTION_ROLLBACK', {
      type: 'transaction_rollback',
      userMessage: 'Payment processing failed. No changes were made to your account.',
      logMessage: `Transaction rolled back: ${error.message}`
    }, {
      context,
      ...metadata,
      error: error.message
    });
    
    // Notify client if requested
    if (notifyOnRollback && metadata.clientEmail) {
      try {
        await notifyClientOfRollback(metadata);
      } catch (notifyError) {
        console.error('⚠️ Failed to send rollback notification:', notifyError.message);
      }
    }
    
    // Re-throw the error
    throw error;
    
  } finally {
    // End session
    session.endSession();
  }
}

/**
 * Execute payment initiation with transaction support
 * @param {Object} sessionDoc - Session document
 * @param {Object} paymentData - Payment data to update
 * @param {Function} apiCall - M-Pesa API call function
 * @returns {Promise} Payment result
 */
async function initiatePaymentWithTransaction(sessionDoc, paymentData, apiCall) {
  return await withTransaction(async (mongoSession) => {
    // Store original state for potential rollback notification
    const originalState = {
      paymentStatus: sessionDoc.paymentStatus,
      mpesaCheckoutRequestID: sessionDoc.mpesaCheckoutRequestID
    };
    
    try {
      // Call M-Pesa API
      const mpesaResponse = await apiCall();
      
      // Update session with payment data within transaction
      sessionDoc.mpesaCheckoutRequestID = mpesaResponse.CheckoutRequestID;
      sessionDoc.mpesaMerchantRequestID = mpesaResponse.MerchantRequestID;
      sessionDoc.mpesaPhoneNumber = paymentData.phoneNumber;
      sessionDoc.mpesaAmount = paymentData.amount;
      sessionDoc.paymentStatus = 'Processing';
      sessionDoc.paymentInitiatedAt = new Date();
      
      // Add to payment attempts audit trail
      sessionDoc.paymentAttempts.push({
        timestamp: new Date(),
        phoneNumber: paymentData.phoneNumber,
        amount: paymentData.amount,
        checkoutRequestID: mpesaResponse.CheckoutRequestID,
        status: 'initiated'
      });
      
      // Save with transaction session
      await sessionDoc.save({ session: mongoSession });
      
      return mpesaResponse;
      
    } catch (error) {
      // If API call fails, transaction will rollback automatically
      console.error('❌ Payment initiation failed, rolling back:', error.message);
      throw error;
    }
  }, {
    context: 'PAYMENT_INITIATION',
    metadata: {
      sessionId: sessionDoc._id.toString(),
      phoneNumber: paymentData.phoneNumber?.slice(-4),
      amount: paymentData.amount
    },
    notifyOnRollback: true,
    clientEmail: paymentData.clientEmail
  });
}

/**
 * Execute callback processing with transaction support
 * @param {Object} sessionDoc - Session document
 * @param {Object} callbackData - Callback data from M-Pesa
 * @returns {Promise} Processing result
 */
async function processCallbackWithTransaction(sessionDoc, callbackData) {
  return await withTransaction(async (mongoSession) => {
    const { ResultCode, ResultDesc, metadata, CheckoutRequestID } = callbackData;
    
    try {
      if (ResultCode === 0) {
        // Payment successful
        sessionDoc.mpesaTransactionID = metadata.MpesaReceiptNumber;
        sessionDoc.mpesaAmount = metadata.Amount;
        sessionDoc.mpesaPhoneNumber = metadata.PhoneNumber;
        sessionDoc.mpesaResultCode = ResultCode;
        sessionDoc.mpesaResultDesc = ResultDesc;
        sessionDoc.paymentStatus = 'Paid';
        sessionDoc.status = 'Confirmed';
        sessionDoc.paymentMethod = 'mpesa';
        sessionDoc.paymentVerifiedAt = new Date();
        
        // Add to audit trail
        sessionDoc.paymentAttempts.push({
          timestamp: new Date(),
          phoneNumber: metadata.PhoneNumber,
          amount: metadata.Amount,
          checkoutRequestID: CheckoutRequestID,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          status: 'success'
        });
        
      } else {
        // Payment failed
        sessionDoc.paymentStatus = 'Failed';
        sessionDoc.mpesaResultCode = ResultCode;
        sessionDoc.mpesaResultDesc = ResultDesc;
        
        // Add to audit trail
        sessionDoc.paymentAttempts.push({
          timestamp: new Date(),
          phoneNumber: sessionDoc.mpesaPhoneNumber,
          amount: sessionDoc.price,
          checkoutRequestID: CheckoutRequestID,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          status: 'failed'
        });
      }
      
      // Save with transaction session
      await sessionDoc.save({ session: mongoSession });
      
      return { success: true, ResultCode };
      
    } catch (error) {
      console.error('❌ Callback processing failed, rolling back:', error.message);
      throw error;
    }
  }, {
    context: 'CALLBACK_PROCESSING',
    metadata: {
      sessionId: sessionDoc._id.toString(),
      checkoutRequestID: CheckoutRequestID,
      resultCode: ResultCode
    },
    notifyOnRollback: false // Don't notify on callback rollback
  });
}

/**
 * Execute status update with transaction support
 * @param {Object} sessionDoc - Session document
 * @param {Object} statusData - Status update data
 * @returns {Promise} Update result
 */
async function updateStatusWithTransaction(sessionDoc, statusData) {
  return await withTransaction(async (mongoSession) => {
    try {
      // Update session status
      if (statusData.paymentStatus) {
        sessionDoc.paymentStatus = statusData.paymentStatus;
      }
      
      if (statusData.sessionStatus) {
        sessionDoc.status = statusData.sessionStatus;
      }
      
      if (statusData.mpesaResultCode !== undefined) {
        sessionDoc.mpesaResultCode = statusData.mpesaResultCode;
      }
      
      if (statusData.mpesaResultDesc) {
        sessionDoc.mpesaResultDesc = statusData.mpesaResultDesc;
      }
      
      if (statusData.paymentVerifiedAt) {
        sessionDoc.paymentVerifiedAt = statusData.paymentVerifiedAt;
      }
      
      // Save with transaction session
      await sessionDoc.save({ session: mongoSession });
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Status update failed, rolling back:', error.message);
      throw error;
    }
  }, {
    context: 'STATUS_UPDATE',
    metadata: {
      sessionId: sessionDoc._id.toString(),
      paymentStatus: statusData.paymentStatus,
      sessionStatus: statusData.sessionStatus
    },
    notifyOnRollback: false
  });
}

/**
 * Notify client of transaction rollback
 * @param {Object} metadata - Metadata including client information
 */
async function notifyClientOfRollback(metadata) {
  try {
    const sendEmail = require('./sendEmail');
    
    if (!metadata.clientEmail || !metadata.clientName) {
      console.log('⚠️ Missing client information for rollback notification');
      return;
    }
    
    await sendEmail({
      email: metadata.clientEmail,
      subject: 'Payment Processing Issue - Smiling Steps',
      html: `
        <h2>Payment Processing Issue</h2>
        <p>Dear ${metadata.clientName},</p>
        <p>We encountered an issue while processing your payment. No charges were made to your account.</p>
        <p><strong>What happened:</strong> The payment could not be completed due to a technical issue.</p>
        <p><strong>What to do:</strong> Please try again in a few moments. If the problem persists, contact our support team.</p>
        <p>We apologize for any inconvenience.</p>
        <p>Best regards,<br>Smiling Steps Team</p>
      `
    });
    
    console.log('✅ Rollback notification sent to client:', metadata.clientEmail);
    
  } catch (error) {
    console.error('❌ Failed to send rollback notification:', error.message);
    // Don't throw - notification failure shouldn't break the rollback
  }
}

/**
 * Check if database connection supports transactions
 * @returns {boolean} Whether transactions are supported
 */
function supportsTransactions() {
  // MongoDB transactions require replica set
  // For development, we may not have replica set, so we'll handle gracefully
  try {
    const connection = mongoose.connection;
    return connection.readyState === 1; // Connected
  } catch (error) {
    console.warn('⚠️ Could not verify transaction support:', error.message);
    return false;
  }
}

/**
 * Execute operation with transaction if supported, otherwise without
 * @param {Function} operation - Operation to execute
 * @param {Object} options - Options
 * @returns {Promise} Result
 */
async function withTransactionIfSupported(operation, options = {}) {
  if (supportsTransactions()) {
    return await withTransaction(operation, options);
  } else {
    console.warn('⚠️ Transactions not supported, executing without transaction');
    // Execute without transaction session
    return await operation(null);
  }
}

module.exports = {
  withTransaction,
  withTransactionIfSupported,
  initiatePaymentWithTransaction,
  processCallbackWithTransaction,
  updateStatusWithTransaction,
  notifyClientOfRollback,
  supportsTransactions
};
