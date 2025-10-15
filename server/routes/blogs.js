const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Note: Blog model will be initialized when we add it to server/index.js
// For now, we'll create placeholder routes

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    const User = global.User;
    const user = await User.findByPk(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all blogs (admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    // Placeholder - will work once Blog model is added
    res.json({
      success: true,
      blogs: [],
      message: 'Blog model not yet initialized. Add Blog-sequelize.js to server/index.js'
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// Create blog (admin)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const blogData = {
      ...req.body,
      authorId: req.user.id
    };

    // Placeholder response
    res.status(201).json({
      success: true,
      message: 'Blog model not yet initialized. To enable: Add Blog-sequelize.js to server/index.js',
      blog: blogData
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Error creating blog' });
  }
});

// Update blog (admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Blog update will work once Blog model is initialized'
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Error updating blog' });
  }
});

// Delete blog (admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Blog deleted (placeholder)'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Error deleting blog' });
  }
});

// Get single blog by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Blog retrieval will work once Blog model is initialized'
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Error fetching blog' });
  }
});

module.exports = router;
