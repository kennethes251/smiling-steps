const express = require('express');
const router = express.Router();
const mpesaAPI = require('../config/mpesa');
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const { 
  formatErrorResponse, 
  logPaymentError,
  mapResultCode,
  getCallbackMessage
} = require('../utils/mpesaErrorMapper');
const {
  scheduleCallbackRetry,
  clearCallbackRetry
} = require('../utils/mpesaRetryHandler');
const {
  initiatePaymentWithTransaction,
  processCallbackWithTransaction,
  updateStatusWithTransaction
} = require('../utils/mpesaTransactionHandler');
const webhookSignature = require('../utils/webhookSignature');
const encryption = require('../utils/encryption');
const auditLogger = require('../utils/auditLogger');
const automaticIssueResolver = require('../utils/automaticIssueResolver');
const realTimeReconciliationService = require('../services/realTimeReconciliation');
const fraudDetectionService = require('../services/fraudDetectionService');

// @route   POST api/mpesa/initiate
// @desc    Initiate M-Pesa STK Push for session payment
// @access  Private (Client only)
router.post('/initiate', auth, async (req, res) => {
  try {
    const { sessionId, phoneNumber } = req.body;

    // Validate request body
    if (!sessionId) {
      return res.status(400).json({ msg: 'Session ID is required' });
    }

    if (!phoneNumber) {
      return res.status(400).json({ msg: 'Phone number is required' });
    }

    // Validate phone number format
    if (!/^(254|0)[17]\d{8}$/.test(phoneNumber.replace(/[\s\+\-\(\)]/g, ''))) {
      return res.status(400).json({ 
        msg: 'Invalid phone number. Use format: 0712345678 or 254712345678' 
      });
    }

    // Get session details
    const session = await Session.findById(sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Verify session ownership - user must be the client
    if (session.client._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to pay for this session' });
    }

    // Check session status is "Approved"
    if (session.status !== 'Approved') {
      return res.status(400).json({ 
        msg: 'Session must be approved by therapist before payment',
        currentStatus: session.status
      });
    }

    // Prevent duplicate payments
    if (session.paymentStatus === 'Paid') {
      return res.status(400).json({ 
        msg: 'Session already paid',
        transactionID: session.mpesaTransactionID
      });
    }

    // Prevent duplicate processing
    if (session.paymentStatus === 'Processing' && session.mpesaCheckoutRequestID) {
      return res.status(400).json({ 
        msg: 'Payment already in progress. Please check your phone or wait a moment.',
        checkoutRequestID: session.mpesaCheckoutRequestID
      });
    }

    // Format phone number
    const formattedPhone = mpesaAPI.formatPhoneNumber(phoneNumber);

    // Fraud Detection Analysis
    // Requirement 16.1: Analyze transaction within 2 seconds and assign risk score
    const fraudAnalysis = await fraudDetectionService.analyzeTransaction({
      userId: req.user.id,
      sessionId: session._id.toString(),
      amount: parseFloat(session.price),
      phoneNumber: formattedPhone,
      deviceFingerprint: req.headers['x-device-fingerprint'],
      ipAddress: req.ip,
      sessionType: session.sessionType,
      timestamp: new Date()
    });

    // Handle fraud detection decisions
    if (fraudAnalysis.decision === 'BLOCK') {
      // Requirement 16.3: Automatically block high-risk transactions
      console.log('🚫 Payment blocked by fraud detection:', {
        sessionId: session._id,
        riskScore: fraudAnalysis.riskScore,
        reasons: fraudAnalysis.reasons
      });

      return res.status(403).json({
        success: false,
        msg: 'Transaction blocked for security reasons',
        error: 'This transaction has been flagged as potentially fraudulent. Please contact support for assistance.',
        supportContact: 'support@smilingsteps.co.ke',
        riskScore: fraudAnalysis.riskScore,
        blocked: true
      });
    }

    if (fraudAnalysis.decision === 'REVIEW') {
      // Requirement 16.2: Flag for manual review before processing
      console.log('⚠️ Payment flagged for review:', {
        sessionId: session._id,
        riskScore: fraudAnalysis.riskScore,
        reasons: fraudAnalysis.reasons
      });

      // Update session with fraud review flag
      session.fraudReviewRequired = true;
      session.fraudRiskScore = fraudAnalysis.riskScore;
      session.fraudReasons = fraudAnalysis.reasons;
      await session.save();

      return res.status(202).json({
        success: false,
        msg: 'Payment requires manual review',
        error: 'This transaction has been flagged for security review. Our team will review it shortly.',
        requiresReview: true,
        riskScore: fraudAnalysis.riskScore,
        estimatedReviewTime: '15-30 minutes'
      });
    }

    // Log fraud analysis result
    console.log('✅ Fraud analysis passed:', {
      sessionId: session._id,
      riskScore: fraudAnalysis.riskScore,
      decision: fraudAnalysis.decision,
      processingTime: fraudAnalysis.processingTime
    });

    // Prepare payment data
    const paymentData = {
      phoneNumber: formattedPhone,
      amount: session.price,
      clientEmail: session.client.email,
      clientName: session.client.name
    };

    // Initiate STK Push with transaction support
    const accountReference = `SESSION-${session._id.toString().slice(-8)}`;
    const transactionDesc = `${session.sessionType} Therapy with Dr. ${session.psychologist.name}`;

    const mpesaResponse = await initiatePaymentWithTransaction(
      session,
      paymentData,
      async () => {
        return await mpesaAPI.stkPush(
          formattedPhone,
          session.price,
          accountReference,
          transactionDesc
        );
      }
    );

    console.log('✅ M-Pesa STK Push initiated:', {
      sessionId: session._id,
      checkoutRequestID: mpesaResponse.CheckoutRequestID,
      amount: session.price,
      phone: encryption.maskPhoneNumber(formattedPhone) // Mask phone number for privacy
    });

    // Log payment initiation for audit trail
    auditLogger.logPaymentInitiation({
      userId: req.user.id,
      sessionId: session._id.toString(),
      amount: session.price,
      phoneNumber: formattedPhone,
      checkoutRequestID: mpesaResponse.CheckoutRequestID,
      merchantRequestID: mpesaResponse.MerchantRequestID
    });

    // Trigger real-time reconciliation for payment initiation
    realTimeReconciliationService.onPaymentInitiation(session._id.toString());

    // Return success response
    res.json({
      success: true,
      msg: 'Payment prompt sent to your phone. Please enter your M-Pesa PIN.',
      checkoutRequestID: mpesaResponse.CheckoutRequestID,
      merchantRequestID: mpesaResponse.MerchantRequestID,
      amount: session.price
    });

  } catch (error) {
    // Determine error type and format response
    let errorInfo = {
      type: 'initiation_error',
      userMessage: error.message || 'Failed to initiate payment. Please try again.',
      logMessage: error.message
    };
    
    // Log the error
    logPaymentError('PAYMENT_INITIATION', errorInfo, {
      sessionId: req.body.sessionId,
      userId: req.user.id,
      phoneNumber: encryption.maskPhoneNumber(req.body.phoneNumber), // Mask phone number
      error: error.message
    });
    
    // Format and send error response
    const response = formatErrorResponse(errorInfo, {
      sessionId: req.body.sessionId
    });
    
    res.status(500).json({ 
      ...response,
      // Include detailed error in development
      ...(process.env.NODE_ENV === 'development' && { debugError: error.message })
    });
  }
});

// @route   POST api/mpesa/callback
// @desc    M-Pesa callback endpoint (called by Safaricom)
// @access  Public (but validates source via signature)
router.post('/callback', async (req, res) => {
  console.log('📱 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

  // Verify webhook signature before processing
  const isValidSignature = webhookSignature.verifyRequest(req);
  
  if (!isValidSignature && process.env.NODE_ENV === 'production') {
    console.error('❌ Invalid webhook signature - rejecting callback');
    return res.status(401).json({ 
      ResultCode: 1, 
      ResultDesc: 'Invalid signature' 
    });
  }

  // Define callback processing function for retry mechanism
  const processCallback = async () => {
    try {
    // Webhook signature verified - proceed with callback processing
    
    // Parse M-Pesa callback payload
    const { Body } = req.body;
    
    if (!Body || !Body.stkCallback) {
      console.error('❌ Invalid callback structure');
      return res.json({ ResultCode: 1, ResultDesc: 'Invalid callback structure' });
    }

    const { stkCallback } = Body;

    // Extract CheckoutRequestID
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    if (!CheckoutRequestID) {
      console.error('❌ Missing CheckoutRequestID in callback');
      return res.json({ ResultCode: 1, ResultDesc: 'Missing CheckoutRequestID' });
    }

    // Find session by CheckoutRequestID
    const session = await Session.findOne({ 
      mpesaCheckoutRequestID: CheckoutRequestID 
    }).populate('client', 'name email')
      .populate('psychologist', 'name email');

    if (!session) {
      console.error('❌ Session not found for CheckoutRequestID:', CheckoutRequestID);
      // Still acknowledge to M-Pesa to prevent retries
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Check for duplicate callback
    const existingAttempt = session.paymentAttempts.find(
      attempt => attempt.checkoutRequestID === CheckoutRequestID && 
                 attempt.status === 'success'
    );
    
    if (existingAttempt && session.paymentStatus === 'Paid') {
      console.log('⚠️ Duplicate callback detected, ignoring:', CheckoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Parse result code and metadata
    const metadata = {};
    if (CallbackMetadata && CallbackMetadata.Item) {
      CallbackMetadata.Item.forEach(item => {
        metadata[item.Name] = item.Value;
      });
    }

    // Get user-friendly message
    const userMessage = getCallbackMessage(ResultCode, ResultDesc);

    // Log payment callback for audit trail
    auditLogger.logPaymentCallback({
      sessionId: session._id.toString(),
      checkoutRequestID: CheckoutRequestID,
      resultCode: ResultCode,
      resultDesc: userMessage,
      transactionID: metadata.MpesaReceiptNumber || null,
      amount: metadata.Amount || session.price,
      phoneNumber: metadata.PhoneNumber || session.mpesaPhoneNumber
    });

    // Store previous status for audit logging
    const previousPaymentStatus = session.paymentStatus;

    // Process callback with transaction support
    await processCallbackWithTransaction(session, {
      ResultCode,
      ResultDesc: userMessage,
      metadata,
      CheckoutRequestID
    });

    // Log status change for audit trail
    auditLogger.logPaymentStatusChange({
      sessionId: session._id.toString(),
      previousStatus: previousPaymentStatus,
      newStatus: session.paymentStatus,
      reason: `M-Pesa callback: ${userMessage}`,
      transactionID: metadata.MpesaReceiptNumber || null,
      resultCode: ResultCode
    });

    // Clear any retry tracking on success
    clearCallbackRetry(CheckoutRequestID);

    // Trigger real-time reconciliation for payment callback
    realTimeReconciliationService.onPaymentCallback(session._id.toString(), req.body);

    // Trigger automatic issue detection and resolution after callback processing
    setTimeout(async () => {
      try {
        // Check for potential issues that might have been created or resolved
        if (ResultCode !== 0) {
          // Payment failed - check if we can automatically resolve
          await automaticIssueResolver.resolveIssue(
            automaticIssueResolver.ResolvableIssueTypes.FAILED_CALLBACK_RETRY,
            {
              sessionId: session._id,
              callbackData: req.body
            }
          );
        } else {
          // Payment succeeded - check for any inconsistencies
          await automaticIssueResolver.resolveIssue(
            automaticIssueResolver.ResolvableIssueTypes.STATUS_VERIFICATION,
            {
              sessionId: session._id
            }
          );
        }
      } catch (resolverError) {
        console.error('⚠️ Automatic issue resolution failed:', resolverError);
        // Don't fail the callback if issue resolution fails
      }
    }, 1000); // Delay to ensure callback processing is complete

    if (ResultCode === 0) {
      console.log('✅ Payment Successful:', {
        sessionId: session._id,
        transactionID: metadata.MpesaReceiptNumber,
        amount: metadata.Amount,
        phone: encryption.maskPhoneNumber(metadata.PhoneNumber) // Mask phone number
      });

      // Send notifications to client and therapist
      try {
        const { 
          sendPaymentConfirmationNotification,
          sendTherapistPaymentNotification 
        } = require('../utils/notificationService');
        
        // Send confirmation email to client
        await sendPaymentConfirmationNotification(
          session,
          session.client,
          session.psychologist,
          metadata.MpesaReceiptNumber,
          metadata.Amount
        );
        console.log('✅ Confirmation email sent to client');

        // Send notification to therapist
        await sendTherapistPaymentNotification(
          session,
          session.client,
          session.psychologist,
          metadata.MpesaReceiptNumber,
          metadata.Amount
        );
        console.log('✅ Notification email sent to therapist');

      } catch (emailError) {
        console.error('⚠️ Failed to send notification emails:', emailError.message);
        // Don't fail the callback if email fails
      }

    } else {
      // Payment failed or cancelled - map error code
      const errorInfo = mapResultCode(ResultCode);

      // Log with error mapper
      logPaymentError('CALLBACK_FAILURE', errorInfo, {
        sessionId: session._id,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        checkoutRequestID: CheckoutRequestID
      });

      // Log payment failure for audit trail
      auditLogger.logPaymentFailure({
        sessionId: session._id.toString(),
        userId: session.client._id.toString(),
        reason: userMessage,
        resultCode: ResultCode,
        checkoutRequestID: CheckoutRequestID
      });

      // Send failure notification to client
      try {
        const { sendPaymentFailureNotification } = require('../utils/notificationService');
        
        await sendPaymentFailureNotification(
          session,
          session.client,
          userMessage
        );
        console.log('✅ Failure notification sent to client');

      } catch (emailError) {
        console.error('⚠️ Failed to send failure notification:', emailError.message);
      }
    }

      return { success: true };
    } catch (error) {
      console.error('❌ Callback Processing Error:', error);
      throw error;
    }
  };

  try {
    // Try to process the callback
    await processCallback();
    
    // Return acknowledgment to M-Pesa
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  } catch (error) {
    console.error('❌ Callback Processing Error:', error);
    
    // Extract CheckoutRequestID for retry tracking
    const checkoutRequestID = req.body?.Body?.stkCallback?.CheckoutRequestID;
    
    if (checkoutRequestID) {
      // Schedule retry with exponential backoff
      scheduleCallbackRetry(
        processCallback,
        checkoutRequestID,
        { checkoutRequestID, error: error.message }
      );
    }
    
    // Always acknowledge to M-Pesa to prevent their automatic retries
    // We handle retries ourselves with exponential backoff
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// @route   GET api/mpesa/status/:sessionId
// @desc    Check payment status for a session
// @access  Private
router.get('/status/:sessionId', auth, async (req, res) => {
  try {
    // Validate session ownership
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Verify user is either the client or psychologist
    if (session.client.toString() !== req.user.id && 
        session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this session' });
    }

    // Retrieve session from database
    let statusUpdated = false;

    // If status unclear (still processing after some time), query M-Pesa API
    if (session.paymentStatus === 'Processing' && session.mpesaCheckoutRequestID) {
      const processingTime = Date.now() - new Date(session.paymentInitiatedAt).getTime();
      
      // Query M-Pesa if processing for more than 30 seconds
      if (processingTime > 30000) {
        try {
          console.log('🔍 Querying M-Pesa for unclear status:', session.mpesaCheckoutRequestID);
          
          // Log payment query for audit trail
          auditLogger.logPaymentQuery({
            sessionId: session._id.toString(),
            checkoutRequestID: session.mpesaCheckoutRequestID,
            reason: `Status unclear after ${Math.round(processingTime / 1000)} seconds`
          });
          
          const queryResult = await mpesaAPI.stkQuery(session.mpesaCheckoutRequestID);
          
          // Store previous status for audit logging
          const previousPaymentStatus = session.paymentStatus;
          
          // ResultCode '0' means payment successful
          if (queryResult.ResultCode === '0') {
            await updateStatusWithTransaction(session, {
              paymentStatus: 'Paid',
              sessionStatus: 'Confirmed',
              mpesaResultCode: 0,
              mpesaResultDesc: queryResult.ResultDesc,
              paymentVerifiedAt: new Date()
            });
            statusUpdated = true;
            
            console.log('✅ Status query confirmed payment:', session._id);
            
            // Log status change for audit trail
            auditLogger.logPaymentStatusChange({
              sessionId: session._id.toString(),
              previousStatus: previousPaymentStatus,
              newStatus: 'Paid',
              reason: 'Status query confirmed payment',
              resultCode: 0
            });

            // Trigger real-time reconciliation for status update
            realTimeReconciliationService.onStatusQuery(session._id.toString());
          } 
          // ResultCode '1032' means request is still pending
          else if (queryResult.ResultCode !== '1032') {
            // Any other code means payment failed
            await updateStatusWithTransaction(session, {
              paymentStatus: 'Failed',
              mpesaResultCode: parseInt(queryResult.ResultCode),
              mpesaResultDesc: queryResult.ResultDesc
            });
            statusUpdated = true;
            
            console.log('❌ Status query confirmed failure:', session._id, queryResult.ResultCode);
            
            // Log status change for audit trail
            auditLogger.logPaymentStatusChange({
              sessionId: session._id.toString(),
              previousStatus: previousPaymentStatus,
              newStatus: 'Failed',
              reason: 'Status query confirmed failure',
              resultCode: parseInt(queryResult.ResultCode)
            });

            // Trigger real-time reconciliation for status update
            realTimeReconciliationService.onStatusQuery(session._id.toString());
          }  
          
        } catch (queryError) {
          console.error('⚠️ Status query error:', queryError.message);
          // Don't fail the request if query fails, just return current status
        }
      }
    }

    // Return payment status
    res.json({
      paymentStatus: session.paymentStatus,
      paymentMethod: session.paymentMethod,
      amount: session.price,
      mpesaTransactionID: session.mpesaTransactionID,
      mpesaResultDesc: session.mpesaResultDesc,
      mpesaResultCode: session.mpesaResultCode,
      sessionStatus: session.status,
      statusUpdated: statusUpdated
    });

  } catch (error) {
    console.error('❌ Status Check Error:', error);
    res.status(500).json({ 
      msg: 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST api/mpesa/test-connection
// @desc    Test M-Pesa API connection and verify credentials
// @access  Private (Admin only)
router.post('/test-connection', auth, async (req, res) => {
  try {
    // Add admin authentication middleware check
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }

    console.log('🔧 Testing M-Pesa API connection...');

    // Test OAuth token generation
    const startTime = Date.now();
    const token = await mpesaAPI.getAccessToken();
    const responseTime = Date.now() - startTime;

    // Verify API connectivity
    const isConnected = !!token && token.length > 0;

    if (isConnected) {
      console.log('✅ M-Pesa API connection successful');
      
      // Log admin access for audit trail
      auditLogger.logAdminAccess({
        adminId: req.user.id,
        action: 'Test M-Pesa API connection',
        accessedData: 'M-Pesa API credentials and configuration',
        ipAddress: req.ip || req.connection.remoteAddress
      });
      
      // Return connection status
      res.json({
        success: true,
        msg: 'M-Pesa API connection successful',
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
        tokenReceived: true,
        tokenLength: token.length,
        responseTime: `${responseTime}ms`,
        businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
        callbackURL: process.env.MPESA_CALLBACK_URL,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Token generation failed');
    }

  } catch (error) {
    console.error('❌ M-Pesa API connection test failed:', error.message);
    
    res.status(500).json({
      success: false,
      msg: 'M-Pesa API connection failed',
      error: error.message,
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
