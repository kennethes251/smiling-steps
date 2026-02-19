const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const User = require('../models/User'); // Use Mongoose User model

// @route   GET api/auth
// @desc    Get logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Mongoose syntax - findById with select to exclude password
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Return user data with consistent format
    // For psychologists, check both top-level and nested approvalStatus
    const approvalStatus = user.role === 'psychologist'
      ? (user.approvalStatus || user.psychologistDetails?.approvalStatus || 'pending')
      : 'not_applicable';
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      approvalStatus: approvalStatus,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('Auth route error:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching user data' 
    });
  }
});

// @route   POST api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }
    
    // Generate new token
    const payload = {
      user: {
        id: user._id,
        role: user.role
      }
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    // For psychologists, include approvalStatus
    const approvalStatus = user.role === 'psychologist'
      ? (user.approvalStatus || user.psychologistDetails?.approvalStatus || 'pending')
      : 'not_applicable';
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        approvalStatus: approvalStatus
      }
    });
  } catch (err) {
    console.error('Token refresh error:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error while refreshing token' 
    });
  }
});

// @route   GET api/auth/validate
// @desc    Validate current token (lightweight check)
// @access  Private
router.get('/validate', auth, async (req, res) => {
  try {
    // Token is valid if we reach here (auth middleware passed)
    res.json({
      success: true,
      valid: true,
      userId: req.user.id,
      role: req.user.role
    });
  } catch (err) {
    res.status(401).json({ 
      success: false,
      valid: false,
      message: 'Token validation failed' 
    });
  }
});

module.exports = router;
