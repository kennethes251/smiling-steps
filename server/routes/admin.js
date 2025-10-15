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
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create psychologist with proper structure
    const psychologist = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'psychologist',
      isVerified: true,
      psychologistDetails: {
        specializations: specializations || [],
        experience: experience || '',
        education: education || '',
        bio: bio || ''
      }
    });

    // Remove password from response
    const psychologistData = psychologist.toJSON();
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

    const psychologist = await User.findByPk(id);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ message: 'Psychologist not found' });
    }

    await psychologist.update(updates);
    
    // Remove password from response
    const psychologistData = psychologist.toJSON();
    delete psychologistData.password;

    res.json({
      message: 'Psychologist updated successfully',
      psychologist: psychologistData
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

    const psychologist = await User.findByPk(id);
    if (!psychologist || psychologist.role !== 'psychologist') {
      return res.status(404).json({ message: 'Psychologist not found' });
    }

    await psychologist.destroy();

    res.json({ message: 'Psychologist deleted successfully' });
  } catch (error) {
    console.error('Error deleting psychologist:', error);
    res.status(500).json({ message: 'Error deleting psychologist' });
  }
});

// Blog and Resource Management Routes
// TODO: Implement after Blog and Resource models are converted to Sequelize

// Recent Activity
router.get('/activity', auth, adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { Op } = require('sequelize');
    
    // Get recent users and sessions
    const [recentUsers, recentSessions] = await Promise.all([
      User.findAll({
        where: { role: 'client' },
        attributes: ['id', 'name', 'email', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      global.Session ? global.Session.findAll({
        attributes: ['id', 'sessionType', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      }) : []
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
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
});

module.exports = router;