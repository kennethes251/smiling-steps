/**
 * Testimonial Model
 * 
 * Stores client testimonials displayed on the marketing page.
 * Includes rating, publication status, and display ordering.
 * 
 * Requirements: 2.1, 2.2
 */

const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Client name cannot exceed 100 characters']
  },
  clientRole: {
    type: String,
    trim: true,
    maxlength: [100, 'Client role cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Testimonial content is required'],
    trim: true,
    maxlength: [500, 'Content cannot exceed 500 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  avatarUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL for avatar'
    }
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
TestimonialSchema.index({ isPublished: 1, displayOrder: 1 });
TestimonialSchema.index({ rating: -1 });
TestimonialSchema.index({ scheduledPublishDate: 1 }, { sparse: true });
TestimonialSchema.index({ createdBy: 1 });

// Static method to get published testimonials sorted by display order
TestimonialSchema.statics.getPublishedTestimonials = function() {
  return this.find({ isPublished: true }).sort({ displayOrder: 1 });
};

// Static method to get testimonials pending scheduled publication
TestimonialSchema.statics.getPendingScheduled = function() {
  return this.find({
    isPublished: false,
    scheduledPublishDate: { $lte: new Date() }
  });
};

module.exports = mongoose.model('Testimonial', TestimonialSchema);
