const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const { auth } = require('../middleware/auth');
const { requireRole, ErrorCodes } = require('../middleware/roleAuth');
const { adminStatsService } = require('../services/adminStatsService');
const securityMonitoringService = require('../services/securityMonitoringService');
const breachAlertingService = require('../services/breachAlertingService');

const router = express.Router();

// Import error monitoring service for approval workflow tracking
let registrationErrorMonitoring;
try {
  const { registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY } = require('../services/registrationErrorMonitoringService');
  registrationErrorMonitoring = { service: registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY };
} catch (error) {
  console.warn('⚠️ Registration error monitoring service not available in admin routes');
  registrationErrorMonitoring = null;
}

// Import performance monitoring service for approval workflow tracking
let registrationPerformance;
try {
  const { registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES } = require('../services/registrationPerformanceService');
  registrationPerformance = { service: registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES };
} catch (error) {
  console.warn('⚠️ Registration performance service not available in admin routes');
  registrationPerformance = null;
}

/**
 * Helper function to monitor admin access and trigger breach detection
 */
async function monitorAdminAccess(userId, action, accessedData, ipAddress, userAgent) {
  try {
    const monitoringResult = await securityMonitoringService.runSecurityMonitoring({
      actionType: 'phi_access',
      userId,
      userRole: 'admin',
      accessType: 'admin_access',
      dataType: accessedData,
      ipAddress,
      userAgent
    });
    
    // Trigger breach alerting if detected
    if (monitoringResult.breachDetected) {
      await breachAlertingService.processSecurityBreach({
        alerts: monitoringResult.alerts,
        recommendations: monitoringResult.recommendations,
        context: {
          actionType: 'phi_access',
          userId,
          userRole: 'admin',
          action,
          accessedData,
          ipAddress,
          reason: 'suspicious_admin_activity'
        }
      });
    }
    
    return monitoringResult;
  } catch (error) {
    console.error('❌ Error monitoring admin access:', error);
    return { breachDetected: false, alerts: [], recommendations: [] };
  }
}

// Simple in-memory cache for stats (60 second TTL)
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
const statsCache = {
  data: null,
  timestamp: null,
  TTL: 60 * 1000 // 60 seconds in milliseconds
};

/**
 * Check if cache is valid
 * @returns {boolean} True if cache is valid and not expired
 */
const isCacheValid = () => {
  if (!statsCache.data || !statsCache.timestamp) {
    return false;
  }
  const now = Date.now();
  return (now - statsCache.timestamp) < statsCache.TTL;
};

/**
 * Update cache with new data
 * @param {Object} data - Stats data to cache
 */
const updateCache = (data) => {
  statsCache.data = data;
  statsCache.timestamp = Date.now();
};

// Log that admin routes are loading with User model
console.log('📦 Admin routes loading - User model:', typeof User, User ? '✅ Loaded' : '❌ Not loaded');

// Use the new requireRole middleware for admin authentication
// Requirements: 8.1, 8.2
const adminAuth = requireRole('admin');

// Legacy adminAuth middleware kept for backward compatibility (deprecated)
// Use requireRole('admin') instead
const adminAuthLegacy = async (req, res, next) => {
  try {
    console.log('🔐 AdminAuth middleware - req.user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.log('❌ AdminAuth - No user ID in request');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(req.user.id);
    console.log('🔍 AdminAuth - Found user:', user ? user.email : 'null', 'Role:', user?.role);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Dashboard Statistics - Using AdminStatsService with caching
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    // Monitor admin access to statistics
    await monitorAdminAccess(
      req.user.id,
      'Viewed admin dashboard statistics',
      'dashboard_statistics',
      req.ip,
      req.get('User-Agent')
    );
    
    // Check if we have valid cached data
    if (isCacheValid()) {
      console.log('📊 Returning cached stats');
      return res.json({
        ...statsCache.data,
        cached: true,
        cacheAge: Math.floor((Date.now() - statsCache.timestamp) / 1000)
      });
    }
    
    // Fetch fresh stats from service
    console.log('📊 Fetching fresh stats from service');
    const stats = await adminStatsService.getAllStats();
    
    // Update cache
    updateCache(stats);
    
    res.json({
      ...stats,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
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

// ============================================
// PSYCHOLOGIST APPROVAL WORKFLOW ENDPOINTS
// Requirements: 3.2, 3.3, 3.4, 3.5
// ============================================

// @route   GET api/admin/psychologists/pending
// @desc    Get all psychologists with pending approval status
// @access  Private (Admin only)
// Requirements: 3.2, 3.3
router.get('/psychologists/pending', auth, adminAuth, async (req, res) => {
  try {
    // Find psychologists with pending approval status
    // Check both top-level approvalStatus and psychologistDetails.approvalStatus
    const pendingPsychologists = await User.find({
      role: 'psychologist',
      $or: [
        { approvalStatus: 'pending' },
        { 'psychologistDetails.approvalStatus': 'pending' }
      ],
      status: { $ne: 'deleted' }
    })
    .select('-password -verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires')
    .sort({ createdAt: -1 })
    .lean();

    // Format response with profile information and credentials
    const formattedPsychologists = pendingPsychologists.map(psychologist => ({
      id: psychologist._id,
      name: psychologist.name,
      email: psychologist.email,
      phone: psychologist.phone,
      profilePicture: psychologist.profilePicture,
      bio: psychologist.bio || psychologist.psychologistDetails?.bio,
      approvalStatus: psychologist.approvalStatus || psychologist.psychologistDetails?.approvalStatus || 'pending',
      isVerified: psychologist.isVerified,
      createdAt: psychologist.createdAt,
      // Profile information
      profile: {
        specializations: psychologist.psychologistDetails?.specializations || [],
        experience: psychologist.psychologistDetails?.experience,
        education: psychologist.psychologistDetails?.education || psychologist.education,
        languages: psychologist.psychologistDetails?.languages || [],
        therapyTypes: psychologist.psychologistDetails?.therapyTypes || [],
        age: psychologist.psychologistDetails?.age,
        licenseUrl: psychologist.psychologistDetails?.licenseUrl,
        profilePictureUrl: psychologist.psychologistDetails?.profilePictureUrl
      },
      // Credentials
      credentials: psychologist.psychologistDetails?.credentials || [],
      // Session rates
      sessionRates: psychologist.psychologistDetails?.rates || psychologist.sessionRates || {
        individual: 2000,
        couples: 3500,
        family: 4000,
        group: 1500
      }
    }));

    res.json({
      success: true,
      psychologists: formattedPsychologists,
      total: formattedPsychologists.length
    });

  } catch (error) {
    console.error('Error fetching pending psychologists:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending psychologists',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Approve psychologist - Enhanced with audit logging and email notification
// @route   PUT api/admin/psychologists/:id/approve
// @desc    Approve a pending psychologist application
// @access  Private (Admin only)
// Requirements: 3.4
router.put('/psychologists/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const psychologist = await User.findById(req.params.id);
    
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ 
        success: false,
        message: 'Psychologist not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if already approved
    const currentStatus = psychologist.approvalStatus || psychologist.psychologistDetails?.approvalStatus;
    if (currentStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Psychologist is already approved',
        code: 'ALREADY_APPROVED'
      });
    }

    // Store previous status for audit log
    const previousStatus = currentStatus || 'pending';

    // Update approval status
    psychologist.approvalStatus = 'approved';
    psychologist.approvedAt = new Date();
    psychologist.approvedBy = req.user.id;
    
    // Also update psychologistDetails for backward compatibility
    if (!psychologist.psychologistDetails) {
      psychologist.psychologistDetails = {};
    }
    psychologist.psychologistDetails.approvalStatus = 'approved';
    psychologist.psychologistDetails.isActive = true;
    psychologist.markModified('psychologistDetails');
    
    await psychologist.save();

    // Log approval to audit log
    await createAuditLog('PSYCHOLOGIST_APPROVAL', {
      adminId: req.user.id,
      userId: psychologist._id,
      targetType: 'User',
      targetId: psychologist._id,
      previousValue: { approvalStatus: previousStatus },
      newValue: { approvalStatus: 'approved', approvedAt: psychologist.approvedAt },
      action: `Psychologist ${psychologist.name} approved by admin`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send approval notification email
    try {
      const { sendEmail } = require('../utils/notificationService');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Your application has been approved</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>Dear Dr. ${psychologist.name},</p>
            <p>We are pleased to inform you that your application to join Smiling Steps as a therapist has been <strong>approved</strong>!</p>
            
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2e7d32;">What's Next?</h3>
              <ul style="line-height: 1.8;">
                <li>Your profile is now visible to clients</li>
                <li>You can start receiving booking requests</li>
                <li>Set up your availability schedule in your dashboard</li>
                <li>Complete your profile to attract more clients</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/login" 
                 style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Go to Your Dashboard
              </a>
            </div>

            <p>Welcome to the Smiling Steps family! We're excited to have you on board.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>Smiling Steps Team</strong></p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: psychologist.email,
        subject: '🎉 Your Application Has Been Approved - Smiling Steps',
        html: emailHtml
      });
      
      console.log('✅ Approval notification email sent to:', psychologist.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send approval email:', emailError.message);
      // Don't fail the request if email fails
    }
    
    // Track successful approval
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackAttempt('psychologist_approval', true, {
        psychologistId: psychologist._id.toString(),
        adminId: req.user.id,
        previousStatus: previousStatus
      });
    }
    
    // Track performance metric for approval decision
    if (registrationPerformance) {
      // Find when credentials were submitted (use psychologistDetails.credentials timestamp or createdAt)
      const credentialsSubmittedAt = psychologist.psychologistDetails?.credentials?.[0]?.uploadedAt 
        || psychologist.createdAt;
      registrationPerformance.service.trackApprovalDecision(
        psychologist._id.toString(),
        credentialsSubmittedAt,
        'approved'
      );
    }
    
    res.json({ 
      success: true,
      message: 'Psychologist approved successfully',
      psychologist: {
        id: psychologist._id,
        name: psychologist.name,
        email: psychologist.email,
        approvalStatus: psychologist.approvalStatus,
        approvedAt: psychologist.approvedAt,
        approvedBy: psychologist.approvedBy
      }
    });
  } catch (error) {
    console.error('Error approving psychologist:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.APPROVAL_WORKFLOW,
        code: 'PSYCHOLOGIST_APPROVAL_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.HIGH,
        context: { psychologistId: req.params.id, adminId: req.user?.id },
        originalError: error
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error approving psychologist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reject psychologist - Enhanced with rejection reason, audit logging and email notification
// @route   PUT api/admin/psychologists/:id/reject
// @desc    Reject a pending psychologist application
// @access  Private (Admin only)
// Requirements: 3.5
router.put('/psychologists/:id/reject', auth, adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const psychologist = await User.findById(req.params.id);
    
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ 
        success: false,
        message: 'Psychologist not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if already rejected
    const currentStatus = psychologist.approvalStatus || psychologist.psychologistDetails?.approvalStatus;
    if (currentStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Psychologist application is already rejected',
        code: 'ALREADY_REJECTED'
      });
    }

    // Store previous status for audit log
    const previousStatus = currentStatus || 'pending';

    // Update rejection status
    psychologist.approvalStatus = 'rejected';
    psychologist.approvalReason = reason || 'Application did not meet our requirements';
    
    // Also update psychologistDetails for backward compatibility
    if (!psychologist.psychologistDetails) {
      psychologist.psychologistDetails = {};
    }
    psychologist.psychologistDetails.approvalStatus = 'rejected';
    psychologist.psychologistDetails.isActive = false;
    psychologist.markModified('psychologistDetails');
    
    await psychologist.save();

    // Log rejection to audit log
    await createAuditLog('PSYCHOLOGIST_REJECTION', {
      adminId: req.user.id,
      userId: psychologist._id,
      targetType: 'User',
      targetId: psychologist._id,
      previousValue: { approvalStatus: previousStatus },
      newValue: { approvalStatus: 'rejected', rejectionReason: psychologist.approvalReason },
      action: `Psychologist ${psychologist.name} application rejected by admin`,
      reason: psychologist.approvalReason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send rejection notification email with reason
    try {
      const { sendEmail } = require('../utils/notificationService');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f44336; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Application Update</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Regarding your therapist application</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>Dear ${psychologist.name},</p>
            <p>Thank you for your interest in joining Smiling Steps as a therapist. After careful review of your application, we regret to inform you that we are unable to approve your application at this time.</p>
            
            <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #c62828;">Reason for Decision</h3>
              <p style="margin: 10px 0; color: #333;">${psychologist.approvalReason}</p>
            </div>

            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1565c0;">What You Can Do</h3>
              <ul style="line-height: 1.8;">
                <li>Review the feedback provided above</li>
                <li>Update your credentials or documentation if needed</li>
                <li>You may reapply after addressing the concerns</li>
                <li>Contact our support team if you have questions</li>
              </ul>
            </div>

            <p>We appreciate your understanding and wish you the best in your professional endeavors.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>Smiling Steps Team</strong></p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              If you believe this decision was made in error, please contact support@smilingsteps.com
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: psychologist.email,
        subject: 'Application Update - Smiling Steps',
        html: emailHtml
      });
      
      console.log('✅ Rejection notification email sent to:', psychologist.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send rejection email:', emailError.message);
      // Don't fail the request if email fails
    }
    
    // Track successful rejection
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackAttempt('psychologist_rejection', true, {
        psychologistId: psychologist._id.toString(),
        adminId: req.user.id,
        previousStatus: previousStatus,
        reason: psychologist.approvalReason
      });
    }
    
    res.json({ 
      success: true,
      message: 'Psychologist application rejected',
      psychologist: {
        id: psychologist._id,
        name: psychologist.name,
        email: psychologist.email,
        approvalStatus: psychologist.approvalStatus,
        approvalReason: psychologist.approvalReason
      }
    });
  } catch (error) {
    console.error('Error rejecting psychologist:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.APPROVAL_WORKFLOW,
        code: 'PSYCHOLOGIST_REJECTION_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.HIGH,
        context: { psychologistId: req.params.id, adminId: req.user?.id },
        originalError: error
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error rejecting psychologist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Request clarification from therapist - Requirement 6.5
router.post('/psychologists/:id/request-clarification', auth, adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Clarification message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    const psychologist = await User.findById(req.params.id);
    
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ 
        success: false,
        message: 'Psychologist not found',
        code: 'NOT_FOUND'
      });
    }

    // Initialize psychologistDetails if not exists
    if (!psychologist.psychologistDetails) {
      psychologist.psychologistDetails = {};
    }
    
    // Initialize clarificationRequests array if not exists
    if (!psychologist.psychologistDetails.clarificationRequests) {
      psychologist.psychologistDetails.clarificationRequests = [];
    }

    // Add clarification request
    const clarificationRequest = {
      requestedBy: req.user.id,
      message: message.trim(),
      requestedAt: new Date(),
      status: 'pending'
    };

    psychologist.psychologistDetails.clarificationRequests.push(clarificationRequest);
    psychologist.markModified('psychologistDetails');
    await psychologist.save();

    // Log clarification request to audit log
    await createAuditLog('CLARIFICATION_REQUEST', {
      adminId: req.user.id,
      userId: psychologist._id,
      targetType: 'User',
      targetId: psychologist._id,
      action: `Clarification requested from psychologist ${psychologist.name}`,
      details: { message: message.trim() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send clarification request email
    try {
      const { sendEmail } = require('../utils/notificationService');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Additional Information Requested</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Regarding your therapist application</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>Dear ${psychologist.name},</p>
            <p>Thank you for your application to join Smiling Steps as a therapist. Our review team needs some additional information to complete the evaluation of your application.</p>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #e65100;">Information Requested</h3>
              <p style="margin: 10px 0; color: #333; white-space: pre-line;">${message.trim()}</p>
            </div>

            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1565c0;">Next Steps</h3>
              <ul style="line-height: 1.8;">
                <li>Please log into your account to respond to this request</li>
                <li>Provide the requested information or documentation</li>
                <li>Our team will review your response promptly</li>
                <li>Contact support if you have any questions</li>
              </ul>
            </div>

            <p>We appreciate your cooperation and look forward to your response.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>Smiling Steps Review Team</strong></p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              Please respond within 7 days to avoid delays in processing your application.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: psychologist.email,
        subject: 'Additional Information Requested - Smiling Steps Application',
        html: emailHtml
      });
      
      console.log('✅ Clarification request email sent to:', psychologist.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send clarification request email:', emailError.message);
      // Don't fail the request if email fails
    }
    
    res.json({ 
      success: true,
      message: 'Clarification request sent successfully',
      clarificationRequest: {
        id: clarificationRequest._id,
        message: clarificationRequest.message,
        requestedAt: clarificationRequest.requestedAt,
        status: clarificationRequest.status
      }
    });
  } catch (error) {
    console.error('Error requesting clarification:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.APPROVAL_WORKFLOW,
        code: 'CLARIFICATION_REQUEST_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.MEDIUM,
        context: { psychologistId: req.params.id, adminId: req.user?.id },
        originalError: error
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error sending clarification request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// ============================================
// USER MANAGEMENT ENDPOINTS
// Requirements: 2.1, 2.2, 2.4, 2.5, 2.6
// ============================================

// Import AuditLog for logging user management actions
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// Helper function to generate audit log hash
const generateLogHash = (logEntry, previousHash = null) => {
  const logString = JSON.stringify(logEntry);
  const dataToHash = previousHash ? `${previousHash}${logString}` : logString;
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
};

// Helper function to create audit log entry
const createAuditLog = async (actionType, data) => {
  try {
    const logEntry = {
      timestamp: new Date(),
      actionType,
      ...data
    };
    const hash = generateLogHash(logEntry);
    await AuditLog.create({
      ...logEntry,
      logHash: hash,
      previousHash: null
    });
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
  }
};

// @route   GET api/admin/users
// @desc    Get all users with pagination and search
// @access  Private (Admin only)
// Requirements: 2.1, 2.2
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = ''
    } = req.query;

    // Build query - exclude deleted users by default
    const query = { status: { $ne: 'deleted' } };

    // Add role filter
    if (role && ['client', 'psychologist', 'admin'].includes(role)) {
      query.role = role;
    }

    // Add status filter
    if (status && ['active', 'inactive'].includes(status)) {
      query.status = status;
    }

    // Add search filter (search across name and email)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || 'active',
      approvalStatus: user.approvalStatus,
      isVerified: user.isVerified,
      phone: user.phone,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      psychologistDetails: user.role === 'psychologist' ? {
        specializations: user.psychologistDetails?.specializations,
        experience: user.psychologistDetails?.experience,
        approvalStatus: user.psychologistDetails?.approvalStatus,
        isActive: user.psychologistDetails?.isActive
      } : undefined
    }));

    res.json({
      success: true,
      users: formattedUsers,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum)
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT api/admin/users/:id/status
// @desc    Update user status (active/inactive)
// @access  Private (Admin only)
// Requirements: 2.4, 2.5
router.put('/users/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    // Validate status
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    // Prevent modifying admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify admin account status',
        code: 'FORBIDDEN'
      });
    }

    // Prevent changing status of deleted users
    if (user.status === 'deleted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of deleted user',
        code: 'VALIDATION_ERROR'
      });
    }

    // Store previous status for audit log
    const previousStatus = user.status;

    // Update status
    user.status = status;
    await user.save();

    // Log status change to audit log
    await createAuditLog('USER_STATUS_CHANGE', {
      adminId: req.user.id,
      userId: user._id,
      targetType: 'User',
      targetId: user._id,
      previousValue: { status: previousStatus },
      newValue: { status: status },
      previousStatus: previousStatus,
      newStatus: status,
      action: `User status changed from ${previousStatus} to ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Soft delete user with anonymization
// @access  Private (Admin only)
// Requirements: 2.6
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin accounts',
        code: 'FORBIDDEN'
      });
    }

    // Prevent deleting already deleted users
    if (user.status === 'deleted') {
      return res.status(400).json({
        success: false,
        message: 'User is already deleted',
        code: 'VALIDATION_ERROR'
      });
    }

    // Store original data for audit log
    const originalData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role
    };

    // Perform soft delete with anonymization
    await user.softDeleteAndAnonymize();

    // Log deletion to audit log
    await createAuditLog('USER_DELETE', {
      adminId: req.user.id,
      userId: user._id,
      targetType: 'User',
      targetId: user._id,
      previousValue: originalData,
      newValue: {
        name: 'Deleted User',
        email: `deleted_${user._id}@anonymized.local`,
        phone: null,
        status: 'deleted'
      },
      action: `User account soft deleted and anonymized`,
      reason: req.body.reason || 'Admin initiated deletion',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `${originalData.role.charAt(0).toUpperCase() + originalData.role.slice(1)} account has been deleted and anonymized`
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// PAYMENT MANAGEMENT ENDPOINTS
// ============================================

// @route   GET api/admin/payments
// @desc    Get all M-Pesa transactions with search, filter, and pagination
// @access  Private (Admin only)
// Requirements: 10.1, 10.2
router.get('/payments', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      startDate = '',
      endDate = '',
      clientId = '',
      therapistId = '',
      transactionId = '',
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

    // Add client filter
    if (clientId) {
      query.client = clientId;
    }

    // Add therapist filter
    if (therapistId) {
      query.psychologist = therapistId;
    }

    // Add transaction ID filter (exact match)
    if (transactionId) {
      query.mpesaTransactionID = transactionId;
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
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone')
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

    // Format response with session and user details
    const formattedTransactions = transactions.map(t => ({
      id: t._id,
      transactionID: t.mpesaTransactionID,
      checkoutRequestID: t.mpesaCheckoutRequestID,
      amount: t.mpesaAmount || t.price,
      phoneNumber: t.mpesaPhoneNumber,
      client: {
        id: t.client?._id,
        name: t.client?.name,
        email: t.client?.email,
        phone: t.client?.phone
      },
      therapist: {
        id: t.psychologist?._id,
        name: t.psychologist?.name,
        email: t.psychologist?.email,
        phone: t.psychologist?.phone
      },
      session: {
        id: t._id,
        type: t.sessionType,
        date: t.sessionDate,
        status: t.status
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

// @route   GET api/admin/payments/export
// @desc    Export payments as CSV for accounting
// @access  Private (Admin only)
// Requirements: 10.4
router.get('/payments/export', auth, adminAuth, async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      startDate = '',
      endDate = '',
      clientId = '',
      therapistId = ''
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

    // Add client filter
    if (clientId) {
      query.client = clientId;
    }

    // Add therapist filter
    if (therapistId) {
      query.psychologist = therapistId;
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

    // Get all transactions matching the query (no pagination for export)
    let transactions = await Session.find(query)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone')
      .sort({ paymentVerifiedAt: -1, createdAt: -1 })
      .lean();

    // Apply search filter after population
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

    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Transaction ID',
      'Checkout Request ID',
      'Client Name',
      'Client Email',
      'Client Phone',
      'Therapist Name',
      'Therapist Email',
      'Session Type',
      'Session Date',
      'Amount (KES)',
      'Phone Number',
      'Payment Status',
      'Result Code',
      'Result Description',
      'Payment Initiated At',
      'Payment Verified At'
    ];

    const csvRows = transactions.map(t => [
      t.paymentVerifiedAt ? new Date(t.paymentVerifiedAt).toISOString() : new Date(t.createdAt).toISOString(),
      t.mpesaTransactionID || '',
      t.mpesaCheckoutRequestID || '',
      t.client?.name || '',
      t.client?.email || '',
      t.client?.phone || '',
      t.psychologist?.name || '',
      t.psychologist?.email || '',
      t.sessionType || '',
      t.sessionDate ? new Date(t.sessionDate).toISOString() : '',
      t.mpesaAmount || t.price || 0,
      t.mpesaPhoneNumber || '',
      t.paymentStatus || '',
      t.mpesaResultCode !== undefined ? t.mpesaResultCode : '',
      t.mpesaResultDesc || '',
      t.paymentInitiatedAt ? new Date(t.paymentInitiatedAt).toISOString() : '',
      t.paymentVerifiedAt ? new Date(t.paymentVerifiedAt).toISOString() : ''
    ]);

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV string
    const csvContent = [
      csvHeaders.map(escapeCSV).join(','),
      ...csvRows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Set response headers for CSV download
    const filename = `mpesa-payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    // Log export action to audit log
    await createAuditLog('PAYMENT_EXPORT', {
      adminId: req.user.id,
      targetType: 'Payment',
      action: `Admin exported ${transactions.length} payment records to CSV`,
      filters: { search, status, startDate, endDate, clientId, therapistId },
      recordCount: transactions.length,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting payments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error exporting payment transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// ADMIN SESSION BOOKING ENDPOINTS
// Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
// ============================================

// @route   POST api/admin/sessions/book
// @desc    Create a booking on behalf of a client
// @access  Private (Admin only)
// Requirements: 15.1, 15.2, 15.3, 15.6
router.post('/sessions/book', auth, adminAuth, async (req, res) => {
  try {
    const { clientId, psychologistId, dateTime, sessionType, paymentStatus, reason } = req.body;

    // Validate required fields
    if (!clientId || !psychologistId || !dateTime || !sessionType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, psychologistId, dateTime, sessionType',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate session type
    const validSessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
    if (!validSessionTypes.includes(sessionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid session type. Must be one of: ${validSessionTypes.join(', ')}`,
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'waived'];
    const adminPaymentStatus = paymentStatus && validPaymentStatuses.includes(paymentStatus) 
      ? paymentStatus 
      : 'pending';

    // Find and validate client
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
        code: 'NOT_FOUND'
      });
    }

    if (client.status === 'deleted' || client.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Cannot book session for inactive or deleted client',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find and validate psychologist
    const psychologist = await User.findById(psychologistId);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({
        success: false,
        message: 'Psychologist not found',
        code: 'NOT_FOUND'
      });
    }

    // Check psychologist approval status
    const approvalStatus = psychologist.approvalStatus || psychologist.psychologistDetails?.approvalStatus;
    if (approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot book session with unapproved psychologist',
        code: 'VALIDATION_ERROR'
      });
    }

    // Parse and validate date/time
    const sessionDate = new Date(dateTime);
    if (isNaN(sessionDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if date is in the past
    if (sessionDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book session in the past',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check for blocked dates
    if (psychologist.blockedDates && psychologist.blockedDates.length > 0) {
      const sessionDateStr = sessionDate.toISOString().split('T')[0];
      const isBlocked = psychologist.blockedDates.some(blockedDate => {
        const blockedDateStr = new Date(blockedDate).toISOString().split('T')[0];
        return blockedDateStr === sessionDateStr;
      });

      if (isBlocked) {
        return res.status(409).json({
          success: false,
          message: 'Psychologist has blocked this date',
          code: 'CONFLICT'
        });
      }
    }

    // Check for existing bookings at the same time slot (prevent double-booking)
    // Session duration is typically 1 hour, so check for overlapping sessions
    const sessionStart = new Date(sessionDate);
    const sessionEnd = new Date(sessionDate.getTime() + 60 * 60 * 1000); // 1 hour later

    const existingSession = await Session.findOne({
      psychologist: psychologistId,
      sessionDate: {
        $gte: new Date(sessionStart.getTime() - 60 * 60 * 1000), // 1 hour before
        $lt: sessionEnd
      },
      status: { $nin: ['Cancelled', 'Declined'] }
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is already booked. Please choose a different time.',
        code: 'CONFLICT'
      });
    }

    // Get session rate from psychologist
    const sessionRates = psychologist.sessionRates || psychologist.psychologistDetails?.rates || {
      Individual: 2000,
      Couples: 3500,
      Family: 4000,
      Group: 1500
    };
    const price = sessionRates[sessionType] || sessionRates.Individual || 2000;

    // Create the session with admin booking fields
    const session = new Session({
      client: clientId,
      psychologist: psychologistId,
      sessionType,
      sessionDate,
      price,
      status: adminPaymentStatus === 'paid' ? 'Confirmed' : 'Approved',
      paymentStatus: adminPaymentStatus === 'paid' ? 'Paid' : 'Pending',
      // Admin booking specific fields
      createdByAdmin: true,
      adminId: req.user.id,
      adminBookingReason: reason || 'Admin-created booking',
      adminPaymentStatus: adminPaymentStatus
    });

    await session.save();

    // Log action to audit trail
    await createAuditLog('ADMIN_BOOKING', {
      adminId: req.user.id,
      targetType: 'Session',
      targetId: session._id,
      action: 'Admin created booking on behalf of client',
      newValue: {
        sessionId: session._id,
        clientId,
        psychologistId,
        sessionType,
        sessionDate,
        price,
        adminPaymentStatus,
        reason: reason || 'Admin-created booking'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send notifications to client and psychologist
    try {
      await sendAdminBookingNotifications(session, client, psychologist, req.user);
    } catch (notificationError) {
      console.error('⚠️ Failed to send booking notifications:', notificationError.message);
      // Don't fail the request if notifications fail
    }

    // Populate the response
    const populatedSession = await Session.findById(session._id)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone')
      .populate('adminId', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Session booked successfully',
      session: {
        id: populatedSession._id,
        client: populatedSession.client,
        psychologist: populatedSession.psychologist,
        sessionType: populatedSession.sessionType,
        sessionDate: populatedSession.sessionDate,
        price: populatedSession.price,
        status: populatedSession.status,
        paymentStatus: populatedSession.paymentStatus,
        createdByAdmin: populatedSession.createdByAdmin,
        adminId: populatedSession.adminId,
        adminBookingReason: populatedSession.adminBookingReason,
        adminPaymentStatus: populatedSession.adminPaymentStatus,
        meetingLink: populatedSession.meetingLink,
        createdAt: populatedSession.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating admin booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET api/admin/sessions/admin-created
// @desc    Get all sessions created by admins
// @access  Private (Admin only)
// Requirements: 15.7
router.get('/sessions/admin-created', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate = '',
      endDate = '',
      adminId = ''
    } = req.query;

    // Build query for admin-created sessions
    const query = { createdByAdmin: true };

    // Add admin filter
    if (adminId) {
      query.adminId = adminId;
    }

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get sessions with populated data
    const sessions = await Session.find(query)
      .populate('client', 'name email phone')
      .populate('psychologist', 'name email phone')
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Session.countDocuments(query);

    // Format response
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      client: {
        id: session.client?._id,
        name: session.client?.name,
        email: session.client?.email,
        phone: session.client?.phone
      },
      psychologist: {
        id: session.psychologist?._id,
        name: session.psychologist?.name,
        email: session.psychologist?.email,
        phone: session.psychologist?.phone
      },
      sessionType: session.sessionType,
      sessionDate: session.sessionDate,
      price: session.price,
      status: session.status,
      paymentStatus: session.paymentStatus,
      // Admin booking specific fields
      createdByAdmin: session.createdByAdmin,
      admin: {
        id: session.adminId?._id,
        name: session.adminId?.name,
        email: session.adminId?.email
      },
      adminBookingReason: session.adminBookingReason,
      adminPaymentStatus: session.adminPaymentStatus,
      meetingLink: session.meetingLink,
      createdAt: session.createdAt
    }));

    res.json({
      success: true,
      sessions: formattedSessions,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching admin-created sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin-created sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to send admin booking notifications
// Requirements: 15.5
async function sendAdminBookingNotifications(session, client, psychologist, admin) {
  const { sendEmail } = require('../utils/notificationService');
  
  const sessionDateFormatted = new Date(session.sessionDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Email to client
  const clientEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📅 Session Booked for You</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">A therapy session has been scheduled on your behalf</p>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${client.name},</p>
        <p>A therapy session has been booked for you by our administrative team.</p>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1565c0;">Session Details</h3>
          <ul style="line-height: 1.8; list-style: none; padding: 0;">
            <li><strong>Therapist:</strong> Dr. ${psychologist.name}</li>
            <li><strong>Date & Time:</strong> ${sessionDateFormatted}</li>
            <li><strong>Session Type:</strong> ${session.sessionType}</li>
            <li><strong>Price:</strong> KES ${session.price}</li>
            <li><strong>Payment Status:</strong> ${session.adminPaymentStatus === 'paid' ? 'Paid' : session.adminPaymentStatus === 'waived' ? 'Waived' : 'Pending'}</li>
          </ul>
        </div>

        ${session.adminPaymentStatus === 'pending' ? `
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
          <p style="margin: 0; color: #e65100;"><strong>⚠️ Payment Required:</strong> Please complete payment before your session.</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/dashboard" 
             style="display: inline-block; background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Dashboard
          </a>
        </div>

        <p>If you have any questions about this booking, please contact our support team.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        <strong>Smiling Steps Team</strong></p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="font-size: 12px; color: #666; margin: 0;">
          This booking was created by our administrative team. Contact support@smilingsteps.com for questions.
        </p>
      </div>
    </div>
  `;

  // Email to psychologist
  const psychologistEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📅 New Session Scheduled</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">An admin has booked a session for you</p>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear Dr. ${psychologist.name},</p>
        <p>A new therapy session has been scheduled for you by our administrative team.</p>
        
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">Session Details</h3>
          <ul style="line-height: 1.8; list-style: none; padding: 0;">
            <li><strong>Client:</strong> ${client.name}</li>
            <li><strong>Date & Time:</strong> ${sessionDateFormatted}</li>
            <li><strong>Session Type:</strong> ${session.sessionType}</li>
            <li><strong>Price:</strong> KES ${session.price}</li>
            <li><strong>Payment Status:</strong> ${session.adminPaymentStatus === 'paid' ? 'Paid' : session.adminPaymentStatus === 'waived' ? 'Waived' : 'Pending'}</li>
          </ul>
        </div>

        ${session.adminBookingReason ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Admin Note:</strong> ${session.adminBookingReason}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'https://smilingsteps.com'}/dashboard" 
             style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Dashboard
          </a>
        </div>

        <p>If you have any questions about this booking, please contact our admin team.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        <strong>Smiling Steps Team</strong></p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="font-size: 12px; color: #666; margin: 0;">
          This booking was created by admin: ${admin.name || admin.email}
        </p>
      </div>
    </div>
  `;

  // Send emails
  await Promise.all([
    sendEmail({
      to: client.email,
      subject: '📅 Session Booked for You - Smiling Steps',
      html: clientEmailHtml
    }),
    sendEmail({
      to: psychologist.email,
      subject: '📅 New Session Scheduled - Smiling Steps',
      html: psychologistEmailHtml
    })
  ]);

  console.log('✅ Admin booking notifications sent to client and psychologist');
}

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
