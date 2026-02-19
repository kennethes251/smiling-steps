/**
 * Banner Model
 * 
 * Stores promotional banners displayed on the marketing page.
 * Includes date range validation, positioning, and color customization.
 * 
 * Requirements: 6.1, 6.2
 */

const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Banner message is required'],
    trim: true,
    maxlength: [300, 'Message cannot exceed 300 characters']
  },
  link: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty, relative paths, or full URLs
        return !v || /^(\/|https?:\/\/).+/.test(v);
      },
      message: 'Link must be a valid URL or relative path'
    }
  },
  backgroundColor: {
    type: String,
    default: '#663399',
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Background color must be a valid hex color (e.g., #663399)'
    }
  },
  textColor: {
    type: String,
    default: '#FFFFFF',
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Text color must be a valid hex color (e.g., #FFFFFF)'
    }
  },
  position: {
    type: String,
    enum: {
      values: ['top', 'bottom'],
      message: 'Position must be either top or bottom'
    },
    default: 'top'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'End date must be after start date'
    }
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
BannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
BannerSchema.index({ position: 1, isActive: 1 });
BannerSchema.index({ startDate: 1 });
BannerSchema.index({ endDate: 1 });
BannerSchema.index({ createdBy: 1 });

// Virtual to check if banner is currently visible
BannerSchema.virtual('isCurrentlyVisible').get(function() {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

// Ensure virtuals are included in JSON output
BannerSchema.set('toJSON', { virtuals: true });
BannerSchema.set('toObject', { virtuals: true });

// Static method to get currently active banners
BannerSchema.statics.getActiveBanners = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ position: 1, createdAt: -1 });
};

// Static method to get active banners by position
BannerSchema.statics.getActiveBannersByPosition = function(position) {
  const now = new Date();
  return this.find({
    isActive: true,
    position,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ createdAt: -1 });
};

// Static method to get upcoming banners
BannerSchema.statics.getUpcomingBanners = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $gt: now }
  }).sort({ startDate: 1 });
};

// Static method to get expired banners
BannerSchema.statics.getExpiredBanners = function() {
  const now = new Date();
  return this.find({
    endDate: { $lt: now }
  }).sort({ endDate: -1 });
};

// Pre-save validation for date range
BannerSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Pre-update validation for date range
BannerSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.startDate && update.endDate) {
    if (new Date(update.endDate) <= new Date(update.startDate)) {
      next(new Error('End date must be after start date'));
      return;
    }
  }
  next();
});

module.exports = mongoose.model('Banner', BannerSchema);
