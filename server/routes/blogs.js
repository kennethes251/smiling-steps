const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Blog = require('../models/Blog');
const User = require('../models/User');

// Admin middleware (Mongoose)
const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all blogs (admin) - Mongoose
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      blogs: blogs
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// Create blog (admin)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    console.log('📝 Creating blog - req.user:', req.user);
    console.log('📝 Creating blog - req.user.id:', req.user?.id);
    console.log('📝 Creating blog - req.body:', req.body);
    
    const blogData = {
      ...req.body,
      author: req.user.id
    };

    console.log('📝 Blog data to create:', blogData);

    const blog = await Blog.create(blogData);

    res.status(201).json({
      success: true,
      message: 'Blog created successfully!',
      blog: blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: error.message || 'Error creating blog' });
  }
});

// Update blog (admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      blog[key] = req.body[key];
    });
    
    await blog.save();

    res.json({
      success: true,
      message: 'Blog updated successfully',
      blog: blog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Error updating blog' });
  }
});

// Delete blog (admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Error deleting blog' });
  }
});

module.exports = router;
