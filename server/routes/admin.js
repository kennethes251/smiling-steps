const express = require('express');
const bcrypt = require('bcryptjs');
// Use global Sequelize User model (initialized in server/index.js)
const Session = require('../models/Session');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to check admin access
const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard Statistics - Mongoose
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalPsychologists = await User.countDocuments({ role: 'psychologist' });
    const totalSessions = await Session.countDocuments();
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClients = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo },
      role: 'client'
    });

    const completedSessions = await Session.countDocuments({ status: 'Completed' });

    res.json({
      totalClients,
      totalPsychologists,
      totalSessions,
      completedSessions,
      recent: {
        newClients: recentClients
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Get all psychologists - Mongoose
router.get('/psychologists', auth, adminAuth, async (req, res) => {
  try {
    const psychologists = await User.find({ role: 'psychologist' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ psychologists });
  } catch (error) {
    console.error('Error fetching psychologists:', error);
    res.status(500).json({ message: 'Error fetching psychologists' });
  }
});

// Get all clients - Mongoose
router.get('/clients', auth, adminAuth, async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients' });
  }
});

// Create psychologist (auto-approved) - Mongoose
router.post('/psychologists', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, password, specializations, experience, education, bio } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create new psychologist with auto-approval
    const newPsychologist = new User({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: 'psychologist',
      isVerified: true,
      psychologistDetails: {
        specializations: specializations || [],
        experience: experience || '',
        education: education || '',
        bio: bio || '',
        approvalStatus: 'approved', // Auto-approve admin-created accounts
        isActive: true // Account is active by default
      }
    });
    
    await newPsychologist.save();
    
    res.json({ 
      success: true,
      message: 'Psychologist account created and approved',
      psychologist: {
        id: newPsychologist._id,
        name: newPsychologist.name,
        email: newPsychologist.email,
        role: newPsychologist.role
      }
    });
  } catch (error) {
    console.error('Error creating psychologist:', error);
    res.status(500).json({ message: 'Error creating psychologist account' });
  }
});

// Approve psychologist - Mongoose
router.put('/psychologists/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const psychologist = await User.findById(req.params.id);
    
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ message: 'Psychologist not found' });
    }
    
    // Approve and activate
    if (!psychologist.psychologistDetails) {
      psychologist.psychologistDetails = {};
    }
    psychologist.psychologistDetails.approvalStatus = 'approved';
    psychologist.psychologistDetails.isActive = true;
    psychologist.markModified('psychologistDetails');
    await psychologist.save();
    
    res.json({ 
      success: true,
      message: 'Psychologist approved successfully',
      psychologist 
    });
  } catch (error) {
    console.error('Error approving psychologist:', error);
    res.status(500).json({ message: 'Error approving psychologist' });
  }
});

// Reject psychologist - Mongoose
router.put('/psychologists/:id/reject', auth, adminAuth, async (req, res) => {
  try {
    const psychologist = await User.findById(req.params.id);
    
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ message: 'Psychologist not found' });
    }
    
    // Reject application
    if (!psychologist.psychologistDetails) {
      psychologist.psychologistDetails = {};
    }
    psychologist.psychologistDetails.approvalStatus = 'rejected';
    psychologist.psychologistDetails.isActive = false;
    psychologist.markModified('psychologistDetails');
    await psychologist.save();
    
    res.json({ 
      success: true,
      message: 'Psychologist application rejected',
      psychologist 
    });
  } catch (error) {
    console.error('Error rejecting psychologist:', error);
    res.status(500).json({ message: 'Error rejecting psychologist' });
  }
});

// Enable/Disable psychologist account - Mongoose
router.put('/psychologists/:id/toggle-status', auth, adminAuth, async (req, res) => {
  try {
    const psychologist = await User.findById(req.params.id);
    
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ message: 'Psychologist not found' });
    }
    
    // Toggle active status
    if (!psychologist.psychologistDetails) {
      psychologist.psychologistDetails = {};
    }
    const newStatus = !psychologist.psychologistDetails.isActive;
    psychologist.psychologistDetails.isActive = newStatus;
    psychologist.markModified('psychologistDetails');
    await psychologist.save();
    
    res.json({ 
      success: true,
      message: `Psychologist account ${newStatus ? 'enabled' : 'disabled'}`,
      isActive: newStatus,
      psychologist 
    });
  } catch (error) {
    console.error('Error toggling psychologist status:', error);
    res.status(500).json({ message: 'Error updating psychologist status' });
  }
});

// Delete user account (psychologist or client) - Mongoose
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }
    
    const userName = user.name;
    const userRole = user.role;
    
    // Delete the user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true,
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} account for ${userName} has been permanently deleted`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user account' });
  }
});

// ============================================
// PAYMENT MANAGEMENT ENDPOINTS
// ============================================

// @route   GET api/admin/payments
// @desc    Get all M-Pesa transactions with search, filter, and pagination
// @access  Private (Admin only)
router.get('/payments', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      paymentMethod: 'mpesa',
      mpesaTransactionID: { $exists: true, $ne: null }
    };

    // Add status filter
    if (status) {
      query.paymentStatus = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      query.paymentVerifiedAt = {};
      if (startDate) {
        query.paymentVerifiedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentVerifiedAt.$lte = end;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get transactions with populated client and psychologist data
    let transactions = await Session.find(query)
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Apply search filter after population (search in client/therapist names, transaction ID)
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(t => 
        t.client?.name?.toLowerCase().includes(searchLower) ||
        t.client?.email?.toLowerCase().includes(searchLower) ||
        t.psychologist?.name?.toLowerCase().includes(searchLower) ||
        t.psychologist?.email?.toLowerCase().includes(searchLower) ||
        t.mpesaTransactionID?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count for pagination
    const total = await Session.countDocuments(query);

    // Format response
    const formattedTransactions = transactions.map(t => ({
      id: t._id,
      transactionID: t.mpesaTransactionID,
      checkoutRequestID: t.mpesaCheckoutRequestID,
      amount: t.mpesaAmount || t.price,
      phoneNumber: t.mpesaPhoneNumber,
      client: {
        id: t.client?._id,
        name: t.client?.name,
        email: t.client?.email
      },
      therapist: {
        id: t.psychologist?._id,
        name: t.psychologist?.name,
        email: t.psychologist?.email
      },
      sessionType: t.sessionType,
      sessionDate: t.sessionDate,
      paymentStatus: t.paymentStatus,
      paymentInitiatedAt: t.paymentInitiatedAt,
      paymentVerifiedAt: t.paymentVerifiedAt,
      resultCode: t.mpesaResultCode,
      resultDesc: t.mpesaResultDesc,
      createdAt: t.createdAt
    }));

    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching payment transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET api/admin/payments/stats
// @desc    Get payment statistics for dashboard
// @access  Private (Admin only)
router.get('/payments/stats', auth, adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paymentVerifiedAt = {};
      if (startDate) {
        dateFilter.paymentVerifiedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.paymentVerifiedAt.$lte = end;
      }
    }

    // Get payment statistics
    const [
      totalTransactions,
      successfulPayments,
      failedPayments,
      processingPayments,
      totalRevenue
    ] = await Promise.all([
      Session.countDocuments({ 
        paymentMethod: 'mpesa',
        mpesaTransactionID: { $exists: true, $ne: null },
        ...dateFilter
      }),
      Session.countDocuments({ 
        paymentMethod: 'mpesa',
        paymentStatus: 'Paid',
        ...dateFilter
      }),
      Session.countDocuments({ 
        paymentMethod: 'mpesa',
        paymentStatus: 'Failed',
        ...dateFilter
      }),
      Session.countDocuments({ 
        paymentMethod: 'mpesa',
        paymentStatus: 'Processing',
        ...dateFilter
      }),
      Session.aggregate([
        {
          $match: {
            paymentMethod: 'mpesa',
            paymentStatus: 'Paid',
            mpesaAmount: { $exists: true },
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$mpesaAmount' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalTransactions,
        successfulPayments,
        failedPayments,
        processingPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        successRate: totalTransactions > 0 
          ? ((successfulPayments / totalTransactions) * 100).toFixed(2)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching payment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET api/admin/payments/:id
// @desc    Get detailed payment information
// @access  Private (Admin only)
router.get('/payments/:id', auth, adminAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone')
      .lean();

    if (!session) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment transaction not found' 
      });
    }

    // Format detailed response
    const paymentDetails = {
      id: session._id,
      transactionID: session.mpesaTransactionID,
      checkoutRequestID: session.mpesaCheckoutRequestID,
      merchantRequestID: session.mpesaMerchantRequestID,
      amount: session.mpesaAmount || session.price,
      phoneNumber: session.mpesaPhoneNumber,
      client: {
        id: session.client?._id,
        name: session.client?.name,
        email: session.client?.email,
        phone: session.client?.phone
      },
      therapist: {
        id: session.psychologist?._id,
        name: session.psychologist?.name,
        email: session.psychologist?.email,
        phone: session.psychologist?.phone
      },
      session: {
        type: session.sessionType,
        date: session.sessionDate,
        status: session.status
      },
      payment: {
        method: session.paymentMethod,
        status: session.paymentStatus,
        initiatedAt: session.paymentInitiatedAt,
        verifiedAt: session.paymentVerifiedAt,
        resultCode: session.mpesaResultCode,
        resultDesc: session.mpesaResultDesc
      },
      attempts: session.paymentAttempts || [],
      createdAt: session.createdAt
    };

    res.json({
      success: true,
      payment: paymentDetails
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
