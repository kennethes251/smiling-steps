/**
 * ContentAnalytics Model
 * 
 * Stores analytics events for marketing page content.
 * Tracks views, clicks, expansions, and shares for various content types.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const mongoose = require('mongoose');

const ContentAnalyticsSchema = new mongoose.Schema({
  contentType: {
    type: String,
    required: [true, 'Content type is required'],
    enum: {
      values: ['testimonial', 'service', 'faq', 'banner', 'post', 'hero', 'social_link', 'page'],
      message: 'Content type must be one of: testimonial, service, faq, banner, post, hero, social_link, page'
    }
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    // Not required for page-level events
    required: function() {
      return this.contentType !== 'page';
    }
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: {
      values: ['view', 'click', 'expand', 'share', 'impression'],
      message: 'Event type must be one of: view, click, expand, share, impression'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  referrer: {
    type: String,
    trim: true
  },
  // Additional metadata for specific event types
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: false // We use our own timestamp field
});

// ============================================
// INDEXES for efficient analytics querying
// Requirements: 8.1, 8.2, 8.3, 8.4
// ============================================

// Primary timestamp index for date range queries
ContentAnalyticsSchema.index({ timestamp: -1 }, { name: 'idx_timestamp_desc' });
ContentAnalyticsSchema.index({ timestamp: 1 }, { name: 'idx_timestamp_asc' });

// Content type queries
ContentAnalyticsSchema.index({ contentType: 1, timestamp: -1 }, { name: 'idx_content_type_timestamp' });

// Event type queries
ContentAnalyticsSchema.index({ eventType: 1, timestamp: -1 }, { name: 'idx_event_type_timestamp' });

// Content-specific queries
ContentAnalyticsSchema.index({ contentType: 1, contentId: 1, timestamp: -1 }, { name: 'idx_content_id_timestamp' });

// Combined queries for analytics dashboard
ContentAnalyticsSchema.index({ contentType: 1, eventType: 1, timestamp: -1 }, { name: 'idx_type_event_timestamp' });

// Session-based queries
ContentAnalyticsSchema.index({ sessionId: 1, timestamp: -1 }, { name: 'idx_session_timestamp', sparse: true });

// ============================================
// STATIC METHODS for analytics queries
// ============================================

// Get page views for a date range
ContentAnalyticsSchema.statics.getPageViews = function(startDate, endDate) {
  return this.countDocuments({
    contentType: 'page',
    eventType: 'view',
    timestamp: { $gte: startDate, $lte: endDate }
  });
};

// Get unique visitors for a date range
ContentAnalyticsSchema.statics.getUniqueVisitors = function(startDate, endDate) {
  return this.distinct('sessionId', {
    contentType: 'page',
    eventType: 'view',
    timestamp: { $gte: startDate, $lte: endDate }
  }).then(sessions => sessions.length);
};

// Get content engagement metrics
ContentAnalyticsSchema.statics.getContentEngagement = function(contentType, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        contentType,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { contentId: '$contentId', eventType: '$eventType' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.contentId',
        events: {
          $push: {
            eventType: '$_id.eventType',
            count: '$count'
          }
        }
      }
    }
  ]);
};

// Get testimonial view counts
ContentAnalyticsSchema.statics.getTestimonialViews = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        contentType: 'testimonial',
        eventType: 'view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$contentId',
        viewCount: { $sum: 1 }
      }
    },
    { $sort: { viewCount: -1 } }
  ]);
};

// Get service click-through rates
ContentAnalyticsSchema.statics.getServiceClickRates = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        contentType: 'service',
        eventType: { $in: ['view', 'click'] },
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { contentId: '$contentId', eventType: '$eventType' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.contentId',
        views: {
          $sum: { $cond: [{ $eq: ['$_id.eventType', 'view'] }, '$count', 0] }
        },
        clicks: {
          $sum: { $cond: [{ $eq: ['$_id.eventType', 'click'] }, '$count', 0] }
        }
      }
    },
    {
      $project: {
        _id: 1,
        views: 1,
        clicks: 1,
        clickRate: {
          $cond: [
            { $eq: ['$views', 0] },
            0,
            { $multiply: [{ $divide: ['$clicks', '$views'] }, 100] }
          ]
        }
      }
    },
    { $sort: { clickRate: -1 } }
  ]);
};

// Get FAQ expansion counts
ContentAnalyticsSchema.statics.getFAQExpansions = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        contentType: 'faq',
        eventType: 'expand',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$contentId',
        expandCount: { $sum: 1 }
      }
    },
    { $sort: { expandCount: -1 } }
  ]);
};

// Record an analytics event
ContentAnalyticsSchema.statics.recordEvent = function(eventData) {
  return this.create({
    ...eventData,
    timestamp: eventData.timestamp || new Date()
  });
};

// Get summary statistics for a date range
ContentAnalyticsSchema.statics.getSummaryStats = async function(startDate, endDate) {
  const [pageViews, uniqueVisitors, eventCounts] = await Promise.all([
    this.getPageViews(startDate, endDate),
    this.getUniqueVisitors(startDate, endDate),
    this.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { contentType: '$contentType', eventType: '$eventType' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    pageViews,
    uniqueVisitors,
    eventCounts
  };
};

module.exports = mongoose.model('ContentAnalytics', ContentAnalyticsSchema);
