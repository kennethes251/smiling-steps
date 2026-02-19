/**
 * SocialLink Model
 * 
 * Stores social media links displayed on the marketing page.
 * Supports Facebook, Twitter, Instagram, LinkedIn, YouTube, and TikTok.
 * 
 * Requirements: 1.1, 1.2
 */

const mongoose = require('mongoose');

// URL validation patterns for each platform
const platformUrlPatterns = {
  facebook: /^https?:\/\/(www\.)?facebook\.com\/.+/i,
  twitter: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/.+/i,
  linkedin: /^https?:\/\/(www\.)?linkedin\.com\/.+/i,
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*/i,
  tiktok: /^https?:\/\/(www\.)?tiktok\.com\/.+/i
};

const SocialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: [true, 'Platform is required'],
    enum: {
      values: ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok'],
      message: 'Platform must be one of: facebook, twitter, instagram, linkedin, youtube, tiktok'
    },
    lowercase: true
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic URL format validation
        if (!/^https?:\/\/.+/.test(v)) {
          return false;
        }
        // Platform-specific URL validation
        const pattern = platformUrlPatterns[this.platform];
        return pattern ? pattern.test(v) : true;
      },
      message: props => `Invalid URL format for ${props.instance?.platform || 'platform'}`
    }
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
SocialLinkSchema.index({ platform: 1 }, { unique: true }); // One link per platform
SocialLinkSchema.index({ isActive: 1, displayOrder: 1 });
SocialLinkSchema.index({ createdBy: 1 });

// Static method to get active links sorted by display order
SocialLinkSchema.statics.getActiveLinks = function() {
  return this.find({ isActive: true }).sort({ displayOrder: 1 });
};

// Static method to validate URL for platform
SocialLinkSchema.statics.isValidUrlForPlatform = function(platform, url) {
  const pattern = platformUrlPatterns[platform];
  if (!pattern) return false;
  return pattern.test(url);
};

module.exports = mongoose.model('SocialLink', SocialLinkSchema);
