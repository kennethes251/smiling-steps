const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Import error monitoring service
let registrationErrorMonitoring;
try {
  const { registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY } = require('../services/registrationErrorMonitoringService');
  registrationErrorMonitoring = { service: registrationErrorMonitoringService, ERROR_CATEGORIES, ERROR_SEVERITY };
} catch (error) {
  console.warn('⚠️ Registration error monitoring service not available in credentials route');
  registrationErrorMonitoring = null;
}

// Import performance monitoring service
let registrationPerformance;
try {
  const { registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES } = require('../services/registrationPerformanceService');
  registrationPerformance = { service: registrationPerformanceService, REGISTRATION_STEPS, USER_TYPES };
} catch (error) {
  console.warn('⚠️ Registration performance service not available in credentials route');
  registrationPerformance = null;
}

// Create credentials directory if it doesn't exist
const credentialsDir = path.join(__dirname, '../uploads/credentials');
if (!fs.existsSync(credentialsDir)) {
  fs.mkdirSync(credentialsDir, { recursive: true });
}

// Configure multer for credential document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, credentialsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with user ID and timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `credential-${req.user.id}-${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

// File filter for document types
const fileFilter = (req, file, cb) => {
  // Allow common document formats
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and image files are allowed for credentials'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
    files: 5 // Maximum 5 files per upload
  }
});

// POST /api/credentials/submit - Submit therapist credentials
router.post('/submit', auth, upload.array('credentialFiles', 5), async (req, res) => {
  try {
    // Check if user is a therapist
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only therapists can submit credentials'
      });
    }

    // Check if user's email is verified
    if (!req.user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email must be verified before submitting credentials'
      });
    }

    // Validate that files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one credential document is required'
      });
    }

    // Parse professional information from request body
    const professionalInfo = req.body.professionalInfo ? 
      JSON.parse(req.body.professionalInfo) : {};

    // Validate required professional information
    const requiredFields = ['licenseNumber', 'specializations', 'experience'];
    const missingFields = requiredFields.filter(field => !professionalInfo[field]);
    
    if (missingFields.length > 0) {
      // Clean up uploaded files if validation fails
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      return res.status(400).json({
        success: false,
        message: `Missing required professional information: ${missingFields.join(', ')}`
      });
    }

    // Find user and update credentials
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize psychologistDetails if it doesn't exist
    if (!user.psychologistDetails) {
      user.psychologistDetails = {};
    }

    // Process uploaded files and add to credentials array
    const newCredentials = req.files.map(file => ({
      type: req.body.credentialTypes ? 
        JSON.parse(req.body.credentialTypes)[req.files.indexOf(file)] || 'license' : 'license',
      documentUrl: `/uploads/credentials/${file.filename}`,
      originalName: file.originalname,
      uploadedAt: new Date(),
      verified: false
    }));

    // Add new credentials to existing ones
    if (!user.psychologistDetails.credentials) {
      user.psychologistDetails.credentials = [];
    }
    user.psychologistDetails.credentials.push(...newCredentials);

    // Update professional information
    user.psychologistDetails.licenseNumber = professionalInfo.licenseNumber;
    user.psychologistDetails.specializations = Array.isArray(professionalInfo.specializations) ? 
      professionalInfo.specializations : [professionalInfo.specializations];
    user.psychologistDetails.experience = professionalInfo.experience;
    
    if (professionalInfo.education) {
      user.psychologistDetails.education = professionalInfo.education;
    }

    // Update account status to pending approval
    user.approvalStatus = 'pending';
    user.psychologistDetails.approvalStatus = 'pending';

    // Save user with new credentials
    await user.save();

    // Track successful credential submission
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackAttempt('credential_submission', true, {
        userId: user._id.toString(),
        credentialsCount: newCredentials.length,
        status: 'pending_approval'
      });
    }

    // Track performance metric for credentials submitted
    if (registrationPerformance) {
      registrationPerformance.service.trackCredentialsSubmitted(
        user._id.toString(),
        user.createdAt
      );
    }

    // TODO: Send notification to administrators for review
    // This would be implemented in Task 12

    res.json({
      success: true,
      message: 'Credentials submitted successfully for review',
      submissionId: user._id.toString(),
      credentialsCount: newCredentials.length,
      status: 'pending_approval'
    });

  } catch (error) {
    console.error('Credential submission error:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.CREDENTIAL_SUBMISSION,
        code: error.code || 'CREDENTIAL_SUBMISSION_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.MEDIUM,
        context: { userId: req.user?.id, role: req.user?.role },
        originalError: error
      });
    }
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 10MB per file allowed.'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during credential submission'
    });
  }
});

// GET /api/credentials/status - Get credential submission status
router.get('/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only therapists can check credential status'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const credentials = user.psychologistDetails?.credentials || [];
    const approvalStatus = user.approvalStatus || 'pending';

    res.json({
      success: true,
      approvalStatus,
      credentialsSubmitted: credentials.length > 0,
      credentials: credentials.map(cred => ({
        type: cred.type,
        originalName: cred.originalName,
        uploadedAt: cred.uploadedAt,
        verified: cred.verified
      })),
      professionalInfo: {
        licenseNumber: user.psychologistDetails?.licenseNumber,
        specializations: user.psychologistDetails?.specializations,
        experience: user.psychologistDetails?.experience,
        education: user.psychologistDetails?.education
      }
    });

  } catch (error) {
    console.error('Credential status check error:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.CREDENTIAL_SUBMISSION,
        code: 'CREDENTIAL_STATUS_CHECK_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.LOW,
        context: { userId: req.user?.id },
        originalError: error
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error checking credential status'
    });
  }
});

// GET /api/credentials/requirements - Get credential submission requirements
router.get('/requirements', auth, (req, res) => {
  try {
    res.json({
      success: true,
      requirements: {
        fileTypes: ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'],
        maxFileSize: '10MB',
        maxFiles: 5,
        requiredDocuments: [
          'Professional License',
          'Educational Certificates',
          'Certifications (if applicable)'
        ],
        requiredInfo: [
          'License Number',
          'Specializations',
          'Years of Experience',
          'Educational Background (optional)'
        ]
      }
    });
  } catch (error) {
    console.error('Requirements fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching requirements'
    });
  }
});

// DELETE /api/credentials/:credentialId - Delete a specific credential (before approval)
router.delete('/:credentialId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only therapists can delete credentials'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already approved (can't delete approved credentials)
    if (user.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete credentials after approval'
      });
    }

    const credentials = user.psychologistDetails?.credentials || [];
    const credentialIndex = credentials.findIndex(cred => 
      cred._id.toString() === req.params.credentialId
    );

    if (credentialIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Credential not found'
      });
    }

    const credential = credentials[credentialIndex];
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', credential.documentUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from credentials array
    credentials.splice(credentialIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Credential deleted successfully'
    });

  } catch (error) {
    console.error('Credential deletion error:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.CREDENTIAL_SUBMISSION,
        code: 'CREDENTIAL_DELETION_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.LOW,
        context: { userId: req.user?.id, credentialId: req.params.credentialId },
        originalError: error
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during credential deletion'
    });
  }
});

// GET /api/credentials/clarifications - Get pending clarification requests
router.get('/clarifications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only therapists can view clarification requests'
      });
    }

    const user = await User.findById(req.user.id).populate('psychologistDetails.clarificationRequests.requestedBy', 'name email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const clarificationRequests = user.psychologistDetails?.clarificationRequests || [];

    res.json({
      success: true,
      clarificationRequests: clarificationRequests.map(req => ({
        id: req._id,
        message: req.message,
        requestedAt: req.requestedAt,
        respondedAt: req.respondedAt,
        response: req.response,
        status: req.status,
        requestedBy: req.requestedBy ? {
          name: req.requestedBy.name,
          email: req.requestedBy.email
        } : null
      }))
    });

  } catch (error) {
    console.error('Clarification requests fetch error:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.APPROVAL_WORKFLOW,
        code: 'CLARIFICATION_FETCH_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.LOW,
        context: { userId: req.user?.id },
        originalError: error
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching clarification requests'
    });
  }
});

// POST /api/credentials/clarifications/:requestId/respond - Respond to clarification request
router.post('/clarifications/:requestId/respond', auth, async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response is required',
        code: 'MISSING_RESPONSE'
      });
    }

    if (req.user.role !== 'psychologist') {
      return res.status(403).json({
        success: false,
        message: 'Only therapists can respond to clarification requests'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const clarificationRequests = user.psychologistDetails?.clarificationRequests || [];
    const requestIndex = clarificationRequests.findIndex(req => 
      req._id.toString() === req.params.requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Clarification request not found'
      });
    }

    const clarificationRequest = clarificationRequests[requestIndex];
    
    if (clarificationRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This clarification request has already been responded to'
      });
    }

    // Update the clarification request
    clarificationRequest.response = response.trim();
    clarificationRequest.respondedAt = new Date();
    clarificationRequest.status = 'responded';

    user.markModified('psychologistDetails');
    await user.save();

    // Send notification to admin about the response
    try {
      const { sendEmail } = require('../utils/notificationService');
      const adminUser = await User.findById(clarificationRequest.requestedBy);
      
      if (adminUser) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4caf50; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Clarification Response Received</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px;">From therapist application review</p>
            </div>

            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear Admin,</p>
              <p><strong>${user.name}</strong> has responded to your clarification request regarding their therapist application.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Original Request</h3>
                <p style="margin: 10px 0; color: #666; white-space: pre-line;">${clarificationRequest.message}</p>
              </div>

              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2e7d32;">Therapist Response</h3>
                <p style="margin: 10px 0; color: #333; white-space: pre-line;">${response.trim()}</p>
              </div>

              <p>Please review the response and continue with the application evaluation process.</p>
              
              <p style="margin-top: 30px;">Best regards,<br>
              <strong>Smiling Steps System</strong></p>
            </div>
          </div>
        `;

        await sendEmail({
          to: adminUser.email,
          subject: `Clarification Response from ${user.name} - Smiling Steps`,
          html: emailHtml
        });
        
        console.log('✅ Clarification response notification sent to admin:', adminUser.email);
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send clarification response notification:', emailError.message);
      // Don't fail the request if email fails
    }
    
    res.json({ 
      success: true,
      message: 'Response submitted successfully',
      clarificationRequest: {
        id: clarificationRequest._id,
        message: clarificationRequest.message,
        response: clarificationRequest.response,
        respondedAt: clarificationRequest.respondedAt,
        status: clarificationRequest.status
      }
    });
  } catch (error) {
    console.error('Error responding to clarification request:', error);
    
    // Track error in monitoring service
    if (registrationErrorMonitoring) {
      registrationErrorMonitoring.service.trackError({
        category: registrationErrorMonitoring.ERROR_CATEGORIES.APPROVAL_WORKFLOW,
        code: 'CLARIFICATION_RESPONSE_FAILED',
        message: error.message,
        severity: registrationErrorMonitoring.ERROR_SEVERITY.MEDIUM,
        context: { userId: req.user?.id, requestId: req.params.requestId },
        originalError: error
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error submitting response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;