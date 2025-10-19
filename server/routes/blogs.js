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
    const Blog = global.Blog;
    const User = global.User;
    
    const blogs = await Blog.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

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
    const Blog = global.Blog;
    
    const blogData = {
      ...req.body,
      authorId: req.user.id
    };

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
    const Blog = global.Blog;
    const blog = await Blog.findByPk(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    await blog.update(req.body);

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
    const Blog = global.Blog;
    const blog = await Blog.findByPk(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    await blog.destroy();

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
