/**
 * HeroContent Model
 * 
 * Stores hero section content for the marketing page.
 * Includes title, subtitle, tagline, CTA buttons, and slideshow images.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

const mongoose = require('mongoose');

// CTA Button sub-schema
const CTAButtonSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Button text is required'],
    trim: true,
    maxlength: [50, 'Button text cannot exceed 50 characters']
  },
  link: {
    type: String,
    required: [true, 'Button link is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Allow relative paths or full URLs
        return /^(\/|https?:\/\/).+/.test(v);
      },
      message: 'Link must be a valid URL or relative path'
    }
  },
  style: {
    type: String,
    enum: {
      values: ['primary', 'secondary', 'outlined'],
      message: 'Style must be one of: primary, secondary, outlined'
    },
    default: 'primary'
  }
}, { _id: true });

// Hero Image sub-schema
const HeroImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  alt: {
    type: String,
    trim: true,
    maxlength: [200, 'Alt text cannot exceed 200 characters'],
    default: 'Hero image'
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  }
}, { _id: true });

const HeroContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Hero title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [300, 'Subtitle cannot exceed 300 characters']
  },
  tagline: {
    type: String,
    trim: true,
    maxlength: [150, 'Tagline cannot exceed 150 characters']
  },
  ctaButtons: {
    type: [CTAButtonSchema],
    validate: {
      validator: function(v) {
        return v.length <= 3; // Maximum 3 CTA buttons
      },
      message: 'Cannot have more than 3 CTA buttons'
    },
    default: []
  },
  images: {
    type: [HeroImageSchema],
    validate: {
      validator: function(v) {
        return v.length <= 10; // Maximum 10 slideshow images
      },
      message: 'Cannot have more than 10 hero images'
    },
    default: []
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one hero content document exists (singleton pattern)
HeroContentSchema.statics.getOrCreate = async function() {
  let heroContent = await this.findOne();
  if (!heroContent) {
    heroContent = await this.create({
      title: 'Welcome to Smiling Steps',
      subtitle: 'Your journey to mental wellness starts here',
      tagline: 'Professional teletherapy services',
      ctaButtons: [
        { text: 'Get Started', link: '/register', style: 'primary' },
        { text: 'Learn More', link: '/about', style: 'outlined' }
      ],
      images: []
    });
  }
  return heroContent;
};

// Static method to update hero content (upsert)
HeroContentSchema.statics.updateContent = async function(data, userId) {
  const heroContent = await this.findOneAndUpdate(
    {},
    { ...data, updatedBy: userId },
    { new: true, upsert: true, runValidators: true }
  );
  return heroContent;
};

// Instance method to add image
HeroContentSchema.methods.addImage = function(imageData) {
  // Set display order to be last
  const maxOrder = this.images.reduce((max, img) => Math.max(max, img.displayOrder), -1);
  imageData.displayOrder = maxOrder + 1;
  this.images.push(imageData);
  return this.save();
};

// Instance method to remove image
HeroContentSchema.methods.removeImage = function(imageId) {
  this.images = this.images.filter(img => img._id.toString() !== imageId.toString());
  return this.save();
};

// Instance method to reorder images
HeroContentSchema.methods.reorderImages = function(imageIds) {
  const imageMap = new Map(this.images.map(img => [img._id.toString(), img]));
  this.images = imageIds.map((id, index) => {
    const img = imageMap.get(id.toString());
    if (img) {
      img.displayOrder = index;
    }
    return img;
  }).filter(Boolean);
  return this.save();
};

module.exports = mongoose.model('HeroContent', HeroContentSchema);
