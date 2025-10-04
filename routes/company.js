const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Get company information
router.get('/my-company', auth, async (req, res) => {
  try {
    // Return basic company info for Smiling Steps
    const companyInfo = {
      name: 'Smiling Steps',
      description: 'Compassionate addiction counseling and mental health services',
      address: '123 Healing Way, Recovery City, RC 12345',
      phone: '(555) 123-HEAL',
      email: 'info@smilingsteps.com',
      website: 'https://smilingsteps.com',
      services: [
        'Individual Therapy',
        'Couples Therapy', 
        'Family Therapy',
        'Group Therapy',
        'Addiction Counseling',
        'Mental Health Support'
      ],
      founded: '2020',
      mission: 'Guiding individuals and families toward healing and recovery with compassion and expertise.'
    };

    res.json(companyInfo);
  } catch (error) {
    console.error('Error fetching company info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;