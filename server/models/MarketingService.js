/**
 * MarketingService Model
 * 
 * Stores services displayed on the marketing page.
 * Includes icon selection, color theme, and features list.
 * 
 * Requirements: 3.1, 3.2
 */

const mongoose = require('mongoose');

// Common MUI icon names for validation
const validMuiIcons = [
  // Healthcare/Medical
  'Psychology', 'Healing', 'LocalHospital', 'MedicalServices', 'HealthAndSafety',
  'Favorite', 'FavoriteBorder', 'MonitorHeart', 'Spa', 'SelfImprovement',
  // People/Family
  'People', 'Person', 'Groups', 'Family', 'ChildCare', 'EscalatorWarning',
  'Diversity1', 'Diversity2', 'Diversity3', 'Handshake', 'VolunteerActivism',
  // Communication
  'Chat', 'Forum', 'Message', 'QuestionAnswer', 'SupportAgent', 'ContactSupport',
  'Call', 'VideoCall', 'Videocam', 'PhoneInTalk', 'RecordVoiceOver',
  // Education/Learning
  'School', 'MenuBook', 'AutoStories', 'LibraryBooks', 'Article', 'Description',
  'Assignment', 'Quiz', 'Lightbulb', 'TipsAndUpdates', 'EmojiObjects',
  // Time/Schedule
  'Schedule', 'Event', 'CalendarMonth', 'AccessTime', 'Timer', 'History',
  // Security/Trust
  'Security', 'Shield', 'VerifiedUser', 'Lock', 'Privacy', 'GppGood',
  // General
  'Star', 'CheckCircle', 'ThumbUp', 'Recommend', 'Verified', 'WorkspacePremium',
  'EmojiEmotions', 'SentimentSatisfied', 'Mood', 'Balance', 'Accessibility',
  // Custom/Other - allow flexibility
  'Help', 'Info', 'Settings', 'Build', 'Extension', 'Widgets'
];

const MarketingServiceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: {
    type: String,
    required: [true, 'Icon is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Allow any icon name that looks valid (PascalCase)
        return /^[A-Z][a-zA-Z0-9]*$/.test(v);
      },
      message: 'Icon must be a valid MUI icon name in PascalCase format'
    }
  },
  colorTheme: {
    type: String,
    default: '#663399',
    validate: {
      validator: function(v) {
        // Validate hex color format
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color theme must be a valid hex color (e.g., #663399)'
    }
  },
  features: [{
    type: String,
    trim: true,
    maxlength: [200, 'Feature cannot exceed 200 characters']
  }],
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
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
MarketingServiceSchema.index({ isActive: 1, displayOrder: 1 });
MarketingServiceSchema.index({ scheduledPublishDate: 1 }, { sparse: true });
MarketingServiceSchema.index({ createdBy: 1 });

// Static method to get active services sorted by display order
MarketingServiceSchema.statics.getActiveServices = function() {
  return this.find({ isActive: true }).sort({ displayOrder: 1 });
};

// Static method to get services pending scheduled publication
MarketingServiceSchema.statics.getPendingScheduled = function() {
  return this.find({
    isActive: false,
    scheduledPublishDate: { $lte: new Date() }
  });
};

// Static method to get valid MUI icon names
MarketingServiceSchema.statics.getValidIcons = function() {
  return validMuiIcons;
};

module.exports = mongoose.model('MarketingService', MarketingServiceSchema);
