/**
 * Content Management Routes
 * 
 * Provides API endpoints for managing marketing page content including:
 * - Social media links
 * - Testimonials
 * - Services
 * - FAQs
 * - Hero content
 * - Banners
 * 
 * Requirements: 1.1-1.5 (Social Links), 2.1-2.5 (Testimonials), 3.1-3.5 (Services),
 *               4.1-4.5 (FAQs), 5.1-5.5 (Hero), 6.1-6.5 (Banners)
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const SocialLink = require('../models/SocialLink');
const Testimonial = require('../models/Testimonial');
const { logAuditEvent } = require('../utils/auditLogger');

// Admin authentication middleware
const adminAuth = requireRole('admin');

// ============================================
// SOCIAL LINKS MANAGEMENT ENDPOINTS
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
// ============================================

/**
 * @route   GET /api/admin/content/social-links
 * @desc    Get all social links sorted by displayOrder
 * @access  Private (Admin only)
 * Requirements: 1.1
 */
router.get('/social-links', auth, adminAuth, async (req, res) => {
  try {
    const socialLinks = await SocialLink.find()
      .sort({ displayOrder: 1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    res.json({
      success: true,
      socialLinks,
      total: socialLinks.length
    });
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Error fetching social links'
    });
  }
});


/**
 * @route   POST /api/admin/content/social-links
 * @desc    Create a new social link
 * @access  Private (Admin only)
 * Requirements: 1.2
 */
router.post('/social-links', auth, adminAuth, async (req, res) => {
  try {
    const { platform, url, displayOrder, isActive } = req.body;

    // Validate required fields
    if (!platform || !url) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Platform and URL are required'
      });
    }

    // Check for duplicate platform
    const existingLink = await SocialLink.findOne({ platform: platform.toLowerCase() });
    if (existingLink) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_PLATFORM',
        message: `A social link for ${platform} already exists`
      });
    }

    // Validate URL format for platform
    if (!SocialLink.isValidUrlForPlatform(platform.toLowerCase(), url)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_URL',
        message: `Invalid URL format for ${platform}`
      });
    }

    // Create new social link
    const socialLink = new SocialLink({
      platform: platform.toLowerCase(),
      url,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });

    await socialLink.save();

    // Log to audit trail
    await logAuditEvent({
      action: 'SOCIAL_LINK_CREATED',
      userId: req.user.id,
      details: {
        socialLinkId: socialLink._id,
        platform: socialLink.platform,
        url: socialLink.url,
        isActive: socialLink.isActive
      }
    });

    res.status(201).json({
      success: true,
      message: 'Social link created successfully',
      socialLink
    });
  } catch (error) {
    console.error('Error creating social link:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Error creating social link'
    });
  }
});


/**
 * @route   PUT /api/admin/content/social-links/:id
 * @desc    Update a social link
 * @access  Private (Admin only)
 * Requirements: 1.3
 */
router.put('/social-links/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, displayOrder, isActive } = req.body;

    // Find existing social link
    const socialLink = await SocialLink.findById(id);
    if (!socialLink) {
      return res.status(404).json({
        success: false,
        error: 'CONTENT_NOT_FOUND',
        message: 'Social link not found'
      });
    }

    // Store old values for audit log
    const oldValues = {
      url: socialLink.url,
      displayOrder: socialLink.displayOrder,
      isActive: socialLink.isActive
    };

    // Validate URL format if URL is being updated
    if (url && url !== socialLink.url) {
      if (!SocialLink.isValidUrlForPlatform(socialLink.platform, url)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_URL',
          message: `Invalid URL format for ${socialLink.platform}`
        });
      }
      socialLink.url = url;
    }

    // Update other fields if provided
    if (displayOrder !== undefined) {
      socialLink.displayOrder = displayOrder;
    }
    if (isActive !== undefined) {
      socialLink.isActive = isActive;
    }

    socialLink.updatedBy = req.user.id;
    await socialLink.save();

    // Log to audit trail
    await logAuditEvent({
      action: 'SOCIAL_LINK_UPDATED',
      userId: req.user.id,
      details: {
        socialLinkId: socialLink._id,
        platform: socialLink.platform,
        oldValues,
        newValues: {
          url: socialLink.url,
          displayOrder: socialLink.displayOrder,
          isActive: socialLink.isActive
        }
      }
    });

    res.json({
      success: true,
      message: 'Social link updated successfully',
      socialLink
    });
  } catch (error) {
    console.error('Error updating social link:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Error updating social link'
    });
  }
});


/**
 * @route   PUT /api/admin/content/social-links/:id/toggle
 * @desc    Toggle social link active status
 * @access  Private (Admin only)
 * Requirements: 1.4
 */
router.put('/social-links/:id/toggle', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing social link
    const socialLink = await SocialLink.findById(id);
    if (!socialLink) {
      return res.status(404).json({
        success: false,
        error: 'CONTENT_NOT_FOUND',
        message: 'Social link not found'
      });
    }

    // Store old value for audit log
    const previousStatus = socialLink.isActive;

    // Toggle the active status
    socialLink.isActive = !socialLink.isActive;
    socialLink.updatedBy = req.user.id;
    await socialLink.save();

    // Log to audit trail
    await logAuditEvent({
      action: 'SOCIAL_LINK_TOGGLED',
      userId: req.user.id,
      details: {
        socialLinkId: socialLink._id,
        platform: socialLink.platform,
        previousStatus,
        newStatus: socialLink.isActive
      }
    });

    res.json({
      success: true,
      message: `Social link ${socialLink.isActive ? 'activated' : 'deactivated'} successfully`,
      socialLink
    });
  } catch (error) {
    console.error('Error toggling social link:', error);
    res.status(500).json({
      success: false,
      error: 'TOGGLE_ERROR',
      message: 'Error toggling social link status'
    });
  }
});


/**
 * @route   DELETE /api/admin/content/social-links/:id
 * @desc    Delete a social link
 * @access  Private (Admin only)
 * Requirements: 1.5
 */
router.delete('/social-links/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing social link
    const socialLink = await SocialLink.findById(id);
    if (!socialLink) {
      return res.status(404).json({
        success: false,
        error: 'CONTENT_NOT_FOUND',
        message: 'Social link not found'
      });
    }

    // Store values for audit log before deletion
    const deletedValues = {
      platform: socialLink.platform,
      url: socialLink.url,
      displayOrder: socialLink.displayOrder,
      isActive: socialLink.isActive
    };

    // Delete the social link
    await SocialLink.findByIdAndDelete(id);

    // Log to audit trail
    await logAuditEvent({
      action: 'SOCIAL_LINK_DELETED',
      userId: req.user.id,
      details: {
        socialLinkId: id,
        deletedValues
      }
    });

    res.json({
      success: true,
      message: 'Social link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting social link:', error);
    res.status(500).json({
      success: false,
      error: 'DELETE_ERROR',
      message: 'Error deleting social link'
    });
  }
});

// ============================================
// TESTIMONIALS MANAGEMENT ENDPOINTS
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
// ============================================

/**
 * @route   GET /api/admin/content/testimonials
 * @desc    Get all testimonials sorted by displayOrder
 * @access  Private (Admin only)
 * Requirements: 2.1
 */
router.get('/testimonials', auth, adminAuth, async (req, res) => {
  try {
    const testimonials = await Testimonial.find()
      .sort({ displayOrder: 1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    res.json({
      success: true,
      testimonials,
      total: testimonials.length
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Error fetching testimonials'
    });
  }
});


/**
 * @route   POST /api/admin/content/testimonials
 * @desc    Create a new testimonial
 * @access  Private (Admin only)
 * Requirements: 2.2
 */
router.post('/testimonials', auth, adminAuth, async (req, res) => {
  try {
    const { clientName, clientRole, content, rating, avatarUrl, displayOrder, isPublished, scheduledPublishDate } = req.body;

    // Validate required fields
    if (!clientName || !content || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Client name, content, and rating are required'
      });
    }

    // Validate rating (1-5)
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RATING',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Validate content length (max 500 chars)
    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'CONTENT_TOO_LONG',
        message: 'Content cannot exceed 500 characters'
      });
    }

    // Create new testimonial
    const testimonial = new Testimonial({
      clientName,
      clientRole,
      content,
      rating: ratingNum,
      avatarUrl,
      displayOrder: displayOrder || 0,
      isPublished: isPublished || false,
      scheduledPublishDate,
      createdBy: req.user.id
    });

    await testimonial.save();

    // Log to audit trail
    await logAuditEvent({
      action: 'TESTIMONIAL_CREATED',
      userId: req.user.id,
      details: {
        testimonialId: testimonial._id,
        clientName: testimonial.clientName,
        rating: testimonial.rating,
        isPublished: testimonial.isPublished
      }
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial created successfully',
      testimonial
    });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Error creating testimonial'
    });
  }
});


/**
 * @route   PUT /api/admin/content/testimonials/:id
 * @desc    Update a testimonial
 * @access  Private (Admin only)
 * Requirements: 2.3
 */
router.put('/testimonials/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientRole, content, rating, avatarUrl, displayOrder, isPublished, scheduledPublishDate } = req.body;

    // Find existing testimonial
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        error: 'CONTENT_NOT_FOUND',
        message: 'Testimonial not found'
      });
    }

    // Store old values for audit log
    const oldValues = {
      clientName: testimonial.clientName,
      clientRole: testimonial.clientRole,
      content: testimonial.content,
      rating: testimonial.rating,
      avatarUrl: testimonial.avatarUrl,
      displayOrder: testimonial.displayOrder,
      isPublished: testimonial.isPublished
    };

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingNum = parseInt(rating, 10);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5'
        });
      }
      testimonial.rating = ratingNum;
    }

    // Validate content length if provided
    if (content !== undefined) {
      if (content.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'CONTENT_TOO_LONG',
          message: 'Content cannot exceed 500 characters'
        });
      }
      testimonial.content = content;
    }

    // Update other fields if provided
    if (clientName !== undefined) testimonial.clientName = clientName;
    if (clientRole !== undefined) testimonial.clientRole = clientRole;
    if (avatarUrl !== undefined) testimonial.avatarUrl = avatarUrl;
    if (displayOrder !== undefined) testimonial.displayOrder = displayOrder;
    if (isPublished !== undefined) testimonial.isPublished = isPublished;
    if (scheduledPublishDate !== undefined) testimonial.scheduledPublishDate = scheduledPublishDate;

    testimonial.updatedBy = req.user.id;
    await testimonial.save();

    // Log to audit trail
    await logAuditEvent({
      action: 'TESTIMONIAL_UPDATED',
      userId: req.user.id,
      details: {
        testimonialId: testimonial._id,
        oldValues,
        newValues: {
          clientName: testimonial.clientName,
          clientRole: testimonial.clientRole,
          content: testimonial.content,
          rating: testimonial.rating,
          avatarUrl: testimonial.avatarUrl,
          displayOrder: testimonial.displayOrder,
          isPublished: testimonial.isPublished
        }
      }
    });

    res.json({
      success: true,
      message: 'Testimonial updated successfully',
      testimonial
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Error updating testimonial'
    });
  }
});


/**
 * @route   PUT /api/admin/content/testimonials/:id/toggle
 * @desc    Toggle testimonial publication status
 * @access  Private (Admin only)
 * Requirements: 2.4
 */
router.put('/testimonials/:id/toggle', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing testimonial
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        error: 'CONTENT_NOT_FOUND',
        message: 'Testimonial not found'
      });
    }

    // Store old value for audit log
    const previousStatus = testimonial.isPublished;

    // Toggle the publication status
    testimonial.isPublished = !testimonial.isPublished;
    testimonial.updatedBy = req.user.id;
    await testimonial.save();

    // Log to audit trail
    await logAuditEvent({
      action: 'TESTIMONIAL_TOGGLED',
      userId: req.user.id,
      details: {
        testimonialId: testimonial._id,
        clientName: testimonial.clientName,
        previousStatus,
        newStatus: testimonial.isPublished
      }
    });

    res.json({
      success: true,
      message: `Testimonial ${testimonial.isPublished ? 'published' : 'unpublished'} successfully`,
      testimonial
    });
  } catch (error) {
    console.error('Error toggling testimonial:', error);
    res.status(500).json({
      success: false,
      error: 'TOGGLE_ERROR',
      message: 'Error toggling testimonial status'
    });
  }
});


/**
 * @route   PUT /api/admin/content/testimonials/reorder
 * @desc    Reorder testimonials by updating displayOrder
 * @access  Private (Admin only)
 * Requirements: 2.5
 */
router.put('/testimonials/reorder', auth, adminAuth, async (req, res) => {
  try {
    const { orderedIds } = req.body;

    // Validate input
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'orderedIds must be a non-empty array of testimonial IDs'
      });
    }

    // Store old order for audit log
    const existingTestimonials = await Testimonial.find({ _id: { $in: orderedIds } })
      .select('_id clientName displayOrder')
      .lean();

    const oldOrder = existingTestimonials.reduce((acc, t) => {
      acc[t._id.toString()] = t.displayOrder;
      return acc;
    }, {});

    // Update displayOrder for each testimonial
    const updatePromises = orderedIds.map((id, index) => 
      Testimonial.findByIdAndUpdate(
        id,
        { displayOrder: index, updatedBy: req.user.id },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    // Log to audit trail
    await logAuditEvent({
      action: 'TESTIMONIALS_REORDERED',
      userId: req.user.id,
      details: {
        orderedIds,
        oldOrder,
        newOrder: orderedIds.reduce((acc, id, index) => {
          acc[id] = index;
          return acc;
        }, {})
      }
    });

    // Fetch updated testimonials
    const testimonials = await Testimonial.find()
      .sort({ displayOrder: 1 })
      .lean();

    res.json({
      success: true,
      message: 'Testimonials reordered successfully',
      testimonials
    });
  } catch (error) {
    console.error('Error reordering testimonials:', error);
    res.status(500).json({
      success: false,
      error: 'REORDER_ERROR',
      message: 'Error reordering testimonials'
    });
  }
});


/**
 * @route   DELETE /api/admin/content/testimonials/:id
 * @desc    Delete a testimonial
 * @access  Private (Admin only)
 * Requirements: 2.3 (implied - full CRUD)
 */
router.delete('/testimonials/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing testimonial
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        error: 'CONTENT_NOT_FOUND',
        message: 'Testimonial not found'
      });
    }

    // Store values for audit log before deletion
    const deletedValues = {
      clientName: testimonial.clientName,
      clientRole: testimonial.clientRole,
      content: testimonial.content,
      rating: testimonial.rating,
      displayOrder: testimonial.displayOrder,
      isPublished: testimonial.isPublished
    };

    // Delete the testimonial
    await Testimonial.findByIdAndDelete(id);

    // Log to audit trail
    await logAuditEvent({
      action: 'TESTIMONIAL_DELETED',
      userId: req.user.id,
      details: {
        testimonialId: id,
        deletedValues
      }
    });

    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      error: 'DELETE_ERROR',
      message: 'Error deleting testimonial'
    });
  }
});


module.exports = router;
