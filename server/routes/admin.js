const express = require('express');
const bcrypt = require('bcryptjs');
const User = global.User; // Use global Sequelize User model
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to check admin access
const adminAuth = async (req, res, next) => {
  try {
    console.log('🔍 Admin auth check - User ID:', req.user?.id);
    const user = await User.findByPk(req.user.id);
    console.log('👤 Found user:', { id: user?.id, email: user?.email, role: user?.role });
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      console.log('❌ User is not admin, role:', user.role);
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    console.log('✅ Admin access granted');
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard Statistics
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const Session = global.Session;
    
    // Count users
    const totalClients = await User.count({ where: { role: 'client' } });
    const totalPsychologists = await User.count({ where: { role: 'psychologist' } });
    const totalSessions = Session ? await Session.count() : 0;
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClients = await User.count({ 
      where: { 
        createdAt: { [Op.gte]: thirtyDaysAgo },
        role: 'client'
      }
    });

    const completedSessions = Session ? await Session.count({ 
      where: { status: 'Completed' }
    }) : 0;

    res.json({
      totalClients,
      totalPsychologists,
      totalSessions,
      totalBlogs: 0, // Will be available after Blog model conversion
      totalResources: 0, // Will be available after Resource model conversion
      completedSessions,
      recent: {
        newClients: recentClients,
        newSessions: 0,
        newBlogs: 0
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Get all psychologists
router.get('/psychologists', auth, adminAuth, async (req, res) => {
  try {
    const psychologists = await User.findAll({
      where: { role: 'psychologist' },
      attributes: ['id', 'name', 'email', 'isVerified', 'psychologistDetails', 'profileInfo', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: psychologists.length,
      psychologists
    });
  } catch (error) {
    console.error('Error fetching psychologists:', error);
    res.status(500).json({ message: 'Error fetching psychologists' });
  }
});

// Get all clients
router.get('/clients', auth, adminAuth, async (req, res) => {
  try {
    const clients = await User.findAll({
      where: { role: 'client' },
      attributes: ['id', 'name', 'email', 'isVerified', 'createdAt', 'lastLogin'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: clients.length,
      clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients' });
  }
});

// Create Psychologist
router.post('/psychologists', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, password, specializations, experience, education, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create psychologist
    const psychologist = new User({
      name,
      email,
      password: hashedPassword,
      role: 'psychologist',
      specializations: specializations || [],
      experience,
      education,
      bio,
      isVerified: true // Auto-verify admin-created accounts
    });

    await psychologist.save();

    // Remove password from response
    const psychologistData = psychologist.toObject();
    delete psychologistData.password;

    res.status(201).json({
      message: 'Psychologist created successfully',
      psychologist: psychologistData
    });
  } catch (error) {
    console.error('Error creating psychologist:', error);
    res.status(500).json({ message: 'Error creating psychologist' });
  }
});

// Get All Psychologists
router.get('/psychologists', auth, adminAuth, async (req, res) => {
  console.log('📋 GET /api/admin/psychologists - Route hit');
  try {
    const psychologists = await User.find({ role: 'psychologist' })
      .select('-password')
      .sort({ createdAt: -1 });

    console.log('✅ Found psychologists:', psychologists.length);
    res.json(psychologists);
  } catch (error) {
    console.error('❌ Error fetching psychologists:', error);
    res.status(500).json({ message: 'Error fetching psychologists' });
  }
});

// Update Psychologist
router.put('/psychologists/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove password from updates if empty
    if (updates.password === '') {
      delete updates.password;
    } else if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedPsychologist = await User.findOneAndUpdate(
      { _id: id, role: 'psychologist' },
      updates,
      { new: true, select: '-password' }
    );

    if (!updatedPsychologist) {
      return res.status(404).json({ message: 'Psychologist not found' });
    }

    res.json({
      message: 'Psychologist updated successfully',
      psychologist: updatedPsychologist
    });
  } catch (error) {
    console.error('Error updating psychologist:', error);
    res.status(500).json({ message: 'Error updating psychologist' });
  }
});

// Delete Psychologist
router.delete('/psychologists/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPsychologist = await User.findOneAndDelete({
      _id: id,
      role: 'psychologist'
    });

    if (!deletedPsychologist) {
      return res.status(404).json({ message: 'Psychologist not found' });
    }

    res.json({ message: 'Psychologist deleted successfully' });
  } catch (error) {
    console.error('Error deleting psychologist:', error);
    res.status(500).json({ message: 'Error deleting psychologist' });
  }
});

// Blog Management Routes

// Create Blog Post
router.post('/blogs', auth, adminAuth, async (req, res) => {
  try {
    const blogData = {
      ...req.body,
      author: req.user.id
    };

    const blog = new Blog(blogData);
    await blog.save();
    
    res.status(201).json({
      message: 'Blog post created successfully',
      blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Error creating blog post' });
  }
});

// Get All Blogs
router.get('/blogs', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, published } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (category) query.category = category;
    if (published !== undefined) query.published = published === 'true';

    const [blogs, count] = await Promise.all([
      Blog.find(query)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Blog.countDocuments(query)
    ]);

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalBlogs: count
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// Update Blog Post
router.put('/blogs/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json({
      message: 'Blog post updated successfully',
      blog: updatedBlog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Error updating blog post' });
  }
});

// Delete Blog Post
router.delete('/blogs/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Error deleting blog post' });
  }
});

// Resource Management Routes

// Create Resource
router.post('/resources', auth, adminAuth, async (req, res) => {
  try {
    const resourceData = {
      ...req.body,
      createdBy: req.user.id
    };

    const resource = new Resource(resourceData);
    await resource.save();
    
    res.status(201).json({
      message: 'Resource created successfully',
      resource
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ message: 'Error creating resource' });
  }
});

// Get All Resources
router.get('/resources', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, active } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (active !== undefined) query.active = active === 'true';

    const [resources, count] = await Promise.all([
      Resource.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Resource.countDocuments(query)
    ]);

    res.json({
      resources,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalResources: count
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Error fetching resources' });
  }
});

// Update Resource
router.put('/resources/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedResource = await Resource.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedResource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json({
      message: 'Resource updated successfully',
      resource: updatedResource
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ message: 'Error updating resource' });
  }
});

// Delete Resource
router.delete('/resources/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedResource = await Resource.findByIdAndDelete(id);

    if (!deletedResource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Error deleting resource' });
  }
});

// Recent Activity
router.get('/activity', auth, adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Get recent users, sessions, and blogs
    const [recentUsers, recentSessions, recentBlogs] = await Promise.all([
      User.find({ role: 'client' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Session.find()
        .select('sessionType status createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Blog.find()
        .select('title published createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Combine and sort all activities
    const activities = [
      ...recentUsers.map(user => ({
        type: 'user_registration',
        description: `New user registered: ${user.name}`,
        timestamp: user.createdAt,
        data: user
      })),
      ...recentSessions.map(session => ({
        type: 'session_created',
        description: `New ${session.sessionType} session created`,
        timestamp: session.createdAt,
        data: session
      })),
      ...recentBlogs.map(blog => ({
        type: 'blog_created',
        description: `Blog post ${blog.published ? 'published' : 'created'}: ${blog.title}`,
        timestamp: blog.createdAt,
        data: blog
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
});

module.exports = router;