const express = require('express');
const router = express.Router();
// Use global Sequelize User model (initialized in server/index.js)
const Blog = require('../models/Blog');

// @route   GET api/public/blogs
// @desc    Get all published blogs
// @access  Public
router.get('/blogs', async (req, res) => {
  try {
    console.log('📋 Fetching published blogs...');
    const blogs = await Blog.find({ published: true })
      .populate('author', 'name email')
      .sort({ publishedAt: -1 });

    console.log(`✅ Found ${blogs.length} published blogs`);
    res.json({
      success: true,
      blogs: blogs
    });
  } catch (error) {
    console.error('❌ Error fetching public blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// @route   GET api/public/blogs/recent
// @desc    Get recent published blogs (for marketing page)
// @access  Public
router.get('/blogs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    const blogs = await Blog.find({ published: true })
      .populate('author', 'name email')
      .sort({ publishedAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      blogs: blogs
    });
  } catch (error) {
    console.error('Error fetching recent blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// @route   GET api/public/blogs/:slug
// @desc    Get single blog by slug
// @access  Public
router.get('/blogs/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true })
      .populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      blog: blog
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Error fetching blog' });
  }
});

// @route   GET api/public/psychologists
// @desc    Get all psychologists for public listing
// @access  Public
router.get('/psychologists', async (req, res) => {
  try {
    console.log('🔍 Public psychologists route hit');
    const psychologists = await global.User.findAll({
      where: { role: 'psychologist' },
      attributes: ['name', 'email', 'profileInfo', 'psychologistDetails', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log('📊 Found psychologists:', psychologists.length);

    // Enhance psychologists with default data if missing (Mongoose)
    const enhancedPsychologists = psychologists.map((psych, index) => {
      // Mongoose documents can be converted to plain objects
      const psychObj = psych.toObject ? psych.toObject() : psych;
      
      // Generate consistent but varied ratings based on psychologist ID
      const seed = psychObj._id.toString().slice(-2);
      const baseRating = 3.5 + (parseInt(seed, 16) % 20) / 10; // 3.5 to 5.4
      const rating = Math.min(5, Math.max(3.5, baseRating));
      const reviewCount = 50 + (parseInt(seed, 16) % 200); // 50-250 reviews
      
      const profileInfo = psychObj.profileInfo || {};
      const psychDetails = psychObj.psychologistDetails || {};
      
      return {
        id: psychObj._id.toString(),
        name: psychObj.name,
        email: psychObj.email,
        profilePicture: profileInfo.profilePicture,
        bio: profileInfo.bio || `Dr. ${psychObj.name} is a dedicated mental health professional committed to helping clients achieve their therapeutic goals through evidence-based practices and compassionate care.`,
        specializations: psychDetails.specializations && psychDetails.specializations.length > 0 
          ? psychDetails.specializations 
          : ['Anxiety Disorders', 'Depression', 'Stress Management', 'Cognitive Behavioral Therapy'],
        experience: psychDetails.experience || '5+ years',
        education: psychDetails.education || 'Ph.D. in Clinical Psychology',
        // Add rates if not set - match BookingPageNew expected format
        rates: psychDetails.rates || {
          Individual: { amount: 2000 + (index * 500), duration: 60 },
          Couples: { amount: 3500 + (index * 500), duration: 75 },
          Family: { amount: 4500 + (index * 500), duration: 90 },
          Group: { amount: 1500 + (index * 300), duration: 90 }
        },
        rating: {
          average: Math.round(rating * 10) / 10, // Round to 1 decimal
          count: reviewCount
        }
      };
    });

    console.log('✅ Sending enhanced psychologists:', enhancedPsychologists.length);
    res.json(enhancedPsychologists);
  } catch (err) {
    console.error('❌ Error fetching psychologists:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;