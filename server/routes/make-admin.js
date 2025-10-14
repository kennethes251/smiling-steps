const express = require('express');
const router = express.Router();
const User = global.User;

// Temporary endpoint to make a user admin
// DELETE THIS AFTER USE!
router.post('/make-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    // Simple security check
    if (secretKey !== 'smilingsteps2024') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }

    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'admin';
    user.isVerified = true;
    await user.save();

    res.json({ 
      success: true,
      message: 'User upgraded to admin successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;