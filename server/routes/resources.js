const express = require('express');
const Resource = require('../models/Resource');
const { auth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/uploadResource');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Optional auth middleware - attaches user if token exists, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

// Middleware to check admin access
const adminAuth = async (req, res, next) => {
  try {
    const User = require('../models/User');
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

// IMPORTANT: Public routes must come BEFORE parameterized routes like /:id
// Get public resources (no auth required)
router.get('/public/list', async (req, res) => {
  try {
    console.log('📋 Fetching public resources...');
    // Show all active resources on the public page
    // Users can view them, but may need to login to download
    const resources = await Resource.find({
      active: true
    })
      .select('-createdBy')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${resources.length} active resources`);
    res.json({ 
      success: true,
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('❌ Error fetching public resources:', error);
    res.status(500).json({ message: 'Error fetching resources' });
  }
});

// Upload new resource with PDF file (admin only)
router.post('/upload', auth, adminAuth, upload.single('file'), handleUploadError, async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    // Extract metadata from request body
    const {
      title,
      description,
      type,
      category,
      tags,
      difficulty,
      requiresAuth,
      accessLevel
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !category) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, type, and category'
      });
    }

    // Parse tags if it's a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(tag => tag.trim());
    }

    // Create resource in database
    const newResource = await Resource.create({
      title,
      description,
      type,
      category,
      tags: parsedTags || [],
      difficulty,
      requiresAuth: requiresAuth === 'true' || requiresAuth === true,
      accessLevel: accessLevel || 'client',
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
      downloadable: true,
      active: true,
      createdBy: req.user.id
    });

    console.log('✅ Resource created:', newResource._id);

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully',
      resource: newResource
    });
  } catch (error) {
    console.error('❌ Error uploading resource:', error);
    // Delete uploaded file if database operation fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading resource',
      error: error.message
    });
  }
});

// Get all resources (admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const resources = await Resource.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Error fetching resources' });
  }
});

// Get single resource
router.get('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Increment view count
    resource.views += 1;
    await resource.save();

    res.json({ success: true, resource });
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ message: 'Error fetching resource' });
  }
});

// Create new resource (admin)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      url,
      downloadable,
      requiresAuth,
      accessLevel,
      tags,
      thumbnail,
      duration,
      difficulty
    } = req.body;

    const newResource = new Resource({
      title,
      description,
      type,
      category,
      url,
      downloadable,
      requiresAuth,
      accessLevel,
      tags,
      thumbnail,
      duration,
      difficulty,
      createdBy: req.user.id
    });

    await newResource.save();

    res.json({
      success: true,
      message: 'Resource created successfully',
      resource: newResource
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ 
      message: 'Error creating resource',
      error: error.message 
    });
  }
});

// Update resource (admin) - with optional file replacement
router.put('/:id', auth, adminAuth, upload.single('file'), handleUploadError, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const {
      title,
      description,
      type,
      category,
      url,
      downloadable,
      requiresAuth,
      accessLevel,
      tags,
      active,
      thumbnail,
      duration,
      difficulty
    } = req.body;

    // Update fields
    if (title !== undefined) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (type !== undefined) resource.type = type;
    if (category !== undefined) resource.category = category;
    if (url !== undefined) resource.url = url;
    if (downloadable !== undefined) resource.downloadable = downloadable;
    if (requiresAuth !== undefined) resource.requiresAuth = requiresAuth;
    if (accessLevel !== undefined) resource.accessLevel = accessLevel;
    if (tags !== undefined) {
      // Parse tags if it's a string
      resource.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }
    if (active !== undefined) resource.active = active;
    if (thumbnail !== undefined) resource.thumbnail = thumbnail;
    if (duration !== undefined) resource.duration = duration;
    if (difficulty !== undefined) resource.difficulty = difficulty;

    // If a new file was uploaded, replace the old one
    if (req.file) {
      // Delete old file if it exists
      if (resource.filePath && fs.existsSync(resource.filePath)) {
        try {
          fs.unlinkSync(resource.filePath);
          console.log('🗑️ Deleted old file:', resource.filePath);
        } catch (unlinkError) {
          console.error('Error deleting old file:', unlinkError);
        }
      }

      // Update with new file info
      resource.filePath = req.file.path;
      resource.fileName = req.file.originalname;
      resource.fileSize = req.file.size;
      resource.mimeType = req.file.mimetype;
      resource.lastModified = new Date();
      console.log('📄 Updated with new file:', req.file.originalname);
    }

    await resource.save();

    res.json({
      success: true,
      message: 'Resource updated successfully',
      resource
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    // Delete uploaded file if update fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ 
      message: 'Error updating resource',
      error: error.message 
    });
  }
});

// Delete resource (admin) - also removes file from filesystem
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Delete the physical file if it exists
    if (resource.filePath && fs.existsSync(resource.filePath)) {
      try {
        fs.unlinkSync(resource.filePath);
        console.log('🗑️ Deleted file from filesystem:', resource.filePath);
      } catch (unlinkError) {
        console.error('⚠️ Error deleting file (continuing with DB deletion):', unlinkError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await Resource.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Error deleting resource' });
  }
});

// Download resource file
router.get('/:id/download', optionalAuth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if resource requires authentication
    if (resource.requiresAuth && !req.user) {
      return res.status(401).json({ 
        message: 'Authentication required to download this resource',
        requiresAuth: true
      });
    }

    // Check if file exists
    if (!resource.filePath || !fs.existsSync(resource.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Increment download count
    resource.downloads += 1;
    await resource.save();

    // Set headers for file download
    res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resource.fileName}"`);
    res.setHeader('Content-Length', resource.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(resource.filePath);
    fileStream.pipe(res);

    console.log('📥 File downloaded:', resource.fileName);
  } catch (error) {
    console.error('Error downloading resource:', error);
    res.status(500).json({ message: 'Error downloading resource' });
  }
});

// View/preview resource file (inline display)
router.get('/:id/view', optionalAuth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if resource requires authentication
    if (resource.requiresAuth && !req.user) {
      return res.status(401).json({ 
        message: 'Authentication required to view this resource',
        requiresAuth: true
      });
    }

    // Check if file exists
    if (!resource.filePath || !fs.existsSync(resource.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Increment view count
    resource.views += 1;
    await resource.save();

    // Set headers for inline display
    res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resource.fileName}"`);
    res.setHeader('Content-Length', resource.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(resource.filePath);
    fileStream.pipe(res);

    console.log('👁️ File viewed:', resource.fileName);
  } catch (error) {
    console.error('Error viewing resource:', error);
    res.status(500).json({ message: 'Error viewing resource' });
  }
});

// Legacy endpoint - increment download count (kept for backward compatibility)
router.post('/:id/download', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    resource.downloads += 1;
    await resource.save();

    res.json({
      success: true,
      message: 'Download recorded'
    });
  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({ message: 'Error recording download' });
  }
});

module.exports = router;
