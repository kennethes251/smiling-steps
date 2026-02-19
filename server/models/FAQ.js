/**
 * FAQ Model
 * 
 * Stores frequently asked questions displayed on the marketing page.
 * Includes category, publication status, and analytics tracking.
 * 
 * Requirements: 4.1, 4.2
 */

const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  scheduledPublishDate: {
    type: Date
  },
  expandCount: {
    type: Number,
    default: 0,
    min: [0, 'Expand count cannot be negative']
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
FAQSchema.index({ isPublished: 1, displayOrder: 1 });
FAQSchema.index({ category: 1, isPublished: 1 });
FAQSchema.index({ expandCount: -1 }); // For analytics - most expanded FAQs
FAQSchema.index({ scheduledPublishDate: 1 }, { sparse: true });
FAQSchema.index({ createdBy: 1 });

// Static method to get published FAQs sorted by display order
FAQSchema.statics.getPublishedFAQs = function() {
  return this.find({ isPublished: true }).sort({ displayOrder: 1 });
};

// Static method to get published FAQs by category
FAQSchema.statics.getPublishedByCategory = function(category) {
  return this.find({ isPublished: true, category }).sort({ displayOrder: 1 });
};

// Static method to get FAQs pending scheduled publication
FAQSchema.statics.getPendingScheduled = function() {
  return this.find({
    isPublished: false,
    scheduledPublishDate: { $lte: new Date() }
  });
};

// Static method to get most expanded FAQs (for analytics)
FAQSchema.statics.getMostExpanded = function(limit = 10) {
  return this.find({ isPublished: true })
    .sort({ expandCount: -1 })
    .limit(limit);
};

// Static method to get distinct categories
FAQSchema.statics.getCategories = function() {
  return this.distinct('category');
};

// Instance method to increment expand count
FAQSchema.methods.incrementExpandCount = function() {
  this.expandCount += 1;
  return this.save();
};

module.exports = mongoose.model('FAQ', FAQSchema);
