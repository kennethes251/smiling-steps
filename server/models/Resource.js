const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Worksheet', 'Guide', 'Video', 'Audio', 'Assessment', 'Article', 'Tool', 'Template']
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  filePath: {
    type: String // Local file path for uploaded resources
  },
  fileSize: {
    type: Number // File size in bytes
  },
  mimeType: {
    type: String
  },
  downloadable: {
    type: Boolean,
    default: false
  },
  requiresAuth: {
    type: Boolean,
    default: true
  },
  accessLevel: {
    type: String,
    enum: ['public', 'client', 'psychologist', 'admin'],
    default: 'client'
  },
  tags: [{
    type: String,
    trim: true
  }],
  active: {
    type: Boolean,
    default: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  thumbnail: {
    type: String // Thumbnail image URL
  },
  duration: {
    type: Number // Duration in seconds for video/audio
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  }
}, {
  timestamps: true
});

// Indexes for better performance
ResourceSchema.index({ type: 1 });
ResourceSchema.index({ category: 1 });
ResourceSchema.index({ active: 1 });
ResourceSchema.index({ accessLevel: 1 });
ResourceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Resource', ResourceSchema);