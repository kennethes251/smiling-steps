const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
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

module.exports = router;
