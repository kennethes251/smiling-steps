const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const User = global.User; // Use global Sequelize User model

const router = express.Router();

// Create uploads directories if they don't exist
const profilesDir = path.join(__dirname, '../uploads/profiles');
const blogsDir = path.join(__dirname, '../uploads/blogs');

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}
if (!fs.existsSync(blogsDir)) {
  fs.mkdirSync(blogsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload profile picture
router.post('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Update user's profile picture in database
    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({ profilePicture: profilePictureUrl });

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePictureUrl
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

// Delete profile picture
router.delete('/profile-picture', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.profilePicture) {
      // Delete file from filesystem
      const filePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from database
      await user.update({ profilePicture: null });
    }

    res.json({ message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Profile picture delete error:', error);
    res.status(500).json({ message: 'Server error during deletion' });
  }
});

// Configure multer for blog images
const blogStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, blogsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `blog-${uniqueSuffix}${extension}`);
  }
});

const blogUpload = multer({
  storage: blogStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload blog featured image
router.post('/blog-image', auth, blogUpload.single('blogImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/blogs/${req.file.filename}`;

    res.json({
      message: 'Blog image uploaded successfully',
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

module.exports = router;