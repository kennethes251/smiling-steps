const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User'); // Use Mongoose User model

// @route   GET api/auth
// @desc    Get logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Mongoose syntax - findById and select to exclude password
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Auth route error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
