const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
// Use global Sequelize User model (initialized in server/index.js)

// @route   GET api/auth
// @desc    Get logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Sequelize syntax - findByPk (password excluded by default in attributes)
    const user = await global.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
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
