/**
 * Manual Payment Verification Routes
 * 
 * Simple Till Number + Confirmation Code payment system
 * - Client pays to Till number via M-Pesa
 * - Client enters confirmation code in app
 * - Admin verifies against M-Pesa statement and approves
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const paymentConfig = require('../config/paymentConfig');
const { logSessionStatusChange } = require('../utils/auditLogger');

/**
 * @route   GET /api/manual-payments/instructions/:sessionId
 * @desc    Get payment instructions for a session
 * @access  Private (Client only)
 */
router.get('/instructions/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('psychologist', 'name');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Only the client can get payment instructions
    if (session.client.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    // Session must be approved before payment
    if (!['Approved', 'Payment Submitted'].includes(session.status)) {
      return res.status(400).json({ 
        msg: 'Session must be approved before payment',
        currentStatus: session.status
      });
    }
    
    const amount = session.sessionRate || session.price || paymentConfig.defaultSessionRate;
    const instructions = paymentConfig.getPaymentInstructions(amount, session._id.toString());
    
    res.json({
      success: true,
      sessionId: session._id,
      bookingReference: session.bookingReference,
      psychologistName: session.psychologist?.name,
      sessionDate: session.sessionDate,
      amount,
      paymentInstructions: instructions,
      currentPaymentStatus: session.paymentStatus,
      hasSubmittedCode: !!session.paymentProof?.transactionCode
    });
  } catch (err) {
    console.error('Error getting payment instructions:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

/**
 * @route   POST /api/manual-payments/submit-code/:sessionId
 * @desc    Submit M-Pesa confirmation code for a session
 * @access  Private (Client only)
 */
router.post('/submit-code/:sessionId', auth, async (req, res) => {
  try {
    const { confirmationCode } = req.body;
    
    // Validate confirmation code format
    const validation = paymentConfig.validateConfirmationCode(confirmationCode);
    if (!validation.valid) {
      return res.status(400).json({ msg: validation.error });
    }
    
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Only the client can submit payment code
    if (session.client.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    // Session must be approved
    if (!['Approved', 'Payment Submitted'].includes(session.status)) {
      return res.status(400).json({ 
        msg: 'Session must be approved before submitting payment',
        currentStatus: session.status
      });
    }
    
    // Check if this confirmation code has already been used
    const existingSession = await Session.findOne({
      'paymentProof.transactionCode': validation.code,
      _id: { $ne: session._id }
    });
    
    if (existingSession) {
      return res.status(400).json({ 
        msg: 'This confirmation code has already been used for another session',
        hint: 'Please check your M-Pesa message for the correct code'
      });
    }
    
    const previousStatus = session.status;
    
    // Update session with payment proof
    session.paymentProof = {
      transactionCode: validation.code,
      submittedAt: new Date()
    };
    session.status = 'Payment Submitted';
    session.paymentStatus = 'Submitted';
    session.paymentMethod = 'manual';
    
    await session.save();
    
    // Log the status change
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus: 'Payment Submitted',
        reason: `M-Pesa confirmation code submitted: ${validation.code}`,
        userId: req.user.id,
        userRole: 'client',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log payment submission:', auditError.message);
    }
    
    console.log('💰 Payment code submitted:', {
      sessionId: session._id,
      bookingReference: session.bookingReference,
      confirmationCode: validation.code
    });
    
    res.json({
      success: true,
      msg: 'Payment confirmation code submitted successfully. Admin will verify your payment shortly.',
      session: {
        _id: session._id,
        bookingReference: session.bookingReference,
        status: session.status,
        paymentStatus: session.paymentStatus,
        confirmationCode: validation.code
      }
    });
  } catch (err) {
    console.error('Error submitting payment code:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

/**
 * @route   GET /api/manual-payments/pending
 * @desc    Get all sessions with pending payment verification
 * @access  Private (Admin only)
 */
router.get('/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    const pendingPayments = await Session.find({
      status: 'Payment Submitted',
      paymentStatus: 'Submitted',
      'paymentProof.transactionCode': { $exists: true, $ne: null }
    })
    .populate('client', 'name email phone')
    .populate('psychologist', 'name email')
    .sort({ 'paymentProof.submittedAt': -1 });
    
    res.json({
      success: true,
      count: pendingPayments.length,
      pendingPayments: pendingPayments.map(session => ({
        _id: session._id,
        bookingReference: session.bookingReference,
        client: {
          name: session.client?.name,
          email: session.client?.email,
          phone: session.client?.phone
        },
        psychologist: {
          name: session.psychologist?.name,
          email: session.psychologist?.email
        },
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        amount: session.sessionRate || session.price,
        confirmationCode: session.paymentProof?.transactionCode,
        submittedAt: session.paymentProof?.submittedAt,
        createdAt: session.createdAt
      }))
    });
  } catch (err) {
    console.error('Error fetching pending payments:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

/**
 * @route   POST /api/manual-payments/verify/:sessionId
 * @desc    Verify a payment and confirm the session
 * @access  Private (Admin only)
 */
router.post('/verify/:sessionId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    const { notes } = req.body;
    const session = await Session.findById(req.params.sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name email');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    if (session.status !== 'Payment Submitted') {
      return res.status(400).json({ 
        msg: 'Session is not pending payment verification',
        currentStatus: session.status
      });
    }
    
    const previousStatus = session.status;
    
    // Update session to confirmed
    session.status = 'Confirmed';
    session.paymentStatus = 'Verified';
    session.paymentVerifiedBy = req.user.id;
    session.paymentVerifiedAt = new Date();
    session.paymentAmount = session.sessionRate || session.price;
    
    if (notes) {
      session.paymentProof.verificationNotes = notes;
    }
    
    await session.save();
    
    // Log the verification
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus: 'Confirmed',
        reason: `Payment verified by admin. Code: ${session.paymentProof?.transactionCode}${notes ? '. Notes: ' + notes : ''}`,
        userId: req.user.id,
        userRole: 'admin',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log payment verification:', auditError.message);
    }
    
    // Send confirmation notification to client
    try {
      const { sendPaymentVerificationNotification } = require('../utils/notificationService');
      await sendPaymentVerificationNotification(session, session.client, session.psychologist);
      console.log('✅ Payment verification notification sent to client');
    } catch (notificationError) {
      console.error('⚠️ Failed to send verification notification:', notificationError.message);
    }
    
    console.log('✅ Payment verified:', {
      sessionId: session._id,
      bookingReference: session.bookingReference,
      confirmationCode: session.paymentProof?.transactionCode,
      verifiedBy: user.name
    });
    
    res.json({
      success: true,
      msg: 'Payment verified and session confirmed',
      session: {
        _id: session._id,
        bookingReference: session.bookingReference,
        status: session.status,
        paymentStatus: session.paymentStatus,
        client: session.client?.name,
        psychologist: session.psychologist?.name,
        sessionDate: session.sessionDate
      }
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

/**
 * @route   POST /api/manual-payments/reject/:sessionId
 * @desc    Reject a payment submission
 * @access  Private (Admin only)
 */
router.post('/reject/:sessionId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ msg: 'Rejection reason is required' });
    }
    
    const session = await Session.findById(req.params.sessionId)
      .populate('client', 'name email');
    
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    if (session.status !== 'Payment Submitted') {
      return res.status(400).json({ 
        msg: 'Session is not pending payment verification',
        currentStatus: session.status
      });
    }
    
    const previousStatus = session.status;
    const rejectedCode = session.paymentProof?.transactionCode;
    
    // Reset to Approved status so client can resubmit
    session.status = 'Approved';
    session.paymentStatus = 'Pending';
    session.paymentProof = {
      ...session.paymentProof,
      rejectedCode: rejectedCode,
      rejectedAt: new Date(),
      rejectionReason: reason
    };
    
    await session.save();
    
    // Log the rejection
    try {
      await logSessionStatusChange({
        sessionId: session._id.toString(),
        previousStatus,
        newStatus: 'Approved',
        reason: `Payment rejected. Code: ${rejectedCode}. Reason: ${reason}`,
        userId: req.user.id,
        userRole: 'admin',
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log payment rejection:', auditError.message);
    }
    
    // TODO: Send rejection notification to client with reason
    
    console.log('❌ Payment rejected:', {
      sessionId: session._id,
      bookingReference: session.bookingReference,
      rejectedCode,
      reason,
      rejectedBy: user.name
    });
    
    res.json({
      success: true,
      msg: 'Payment rejected. Client can submit a new confirmation code.',
      session: {
        _id: session._id,
        bookingReference: session.bookingReference,
        status: session.status,
        paymentStatus: session.paymentStatus,
        rejectionReason: reason
      }
    });
  } catch (err) {
    console.error('Error rejecting payment:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

/**
 * @route   GET /api/manual-payments/stats
 * @desc    Get payment verification statistics
 * @access  Private (Admin only)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [
      pendingCount,
      verifiedToday,
      verifiedThisMonth,
      totalVerified,
      totalRevenue
    ] = await Promise.all([
      Session.countDocuments({ 
        status: 'Payment Submitted', 
        paymentStatus: 'Submitted' 
      }),
      Session.countDocuments({ 
        paymentStatus: 'Verified',
        paymentVerifiedAt: { $gte: today }
      }),
      Session.countDocuments({ 
        paymentStatus: 'Verified',
        paymentVerifiedAt: { $gte: thisMonth }
      }),
      Session.countDocuments({ paymentStatus: 'Verified' }),
      Session.aggregate([
        { $match: { paymentStatus: 'Verified' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$paymentAmount', '$sessionRate', '$price'] } } } }
      ])
    ]);
    
    res.json({
      success: true,
      stats: {
        pendingVerification: pendingCount,
        verifiedToday,
        verifiedThisMonth,
        totalVerified,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (err) {
    console.error('Error fetching payment stats:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
