/**
 * Platform Statistics Service
 * 
 * Calculates and caches real platform statistics from the database
 * for use in social proof elements on marketing pages.
 * 
 * Features:
 * - Real-time data from database
 * - Cached for performance (24-hour TTL)
 * - Fallback to static values if database unavailable
 * - Automatic updates via scheduled job
 */

const User = require('../models/User');
const Session = require('../models/Session');
const Feedback = require('../models/Feedback');

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let statsCache = null;
let lastUpdated = null;

// Fallback static values (used if database is unavailable)
const FALLBACK_STATS = {
  happyClients: {
    value: '500+',
    label: 'Happy Clients',
    description: 'Individuals supported on their healing journey',
    icon: '😊',
    actual: 500
  },
  licensedTherapists: {
    value: '50+',
    label: 'Licensed Therapists',
    description: 'Verified mental health professionals',
    icon: '👨‍⚕️',
    actual: 50
  },
  satisfactionRate: {
    value: '95%',
    label: 'Satisfaction Rate',
    description: 'Client satisfaction with our services',
    icon: '⭐',
    actual: 95
  },
  supportAvailable: {
    value: '24/7',
    label: 'Support Available',
    description: 'Round-the-clock platform access',
    icon: '🕐',
    actual: 24
  }
};

/**
 * Calculate platform statistics from database
 * 
 * @returns {Promise<Object>} Platform statistics
 */
async function calculateStats() {
  try {
    // Count active clients (verified and not deleted)
    const clientCount = await User.countDocuments({
      role: 'client',
      isVerified: true,
      isActive: { $ne: false }
    });

    // Count approved psychologists
    const psychologistCount = await User.countDocuments({
      role: 'psychologist',
      approvalStatus: 'approved',
      isActive: { $ne: false }
    });

    // Calculate satisfaction rate from feedback
    const feedbackStats = await Feedback.aggregate([
      {
        $match: {
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      }
    ]);

    // Calculate satisfaction percentage (assuming 5-star scale)
    let satisfactionRate = 95; // Default fallback
    if (feedbackStats.length > 0 && feedbackStats[0].totalFeedback > 0) {
      satisfactionRate = Math.round((feedbackStats[0].averageRating / 5) * 100);
    }

    // Count completed sessions for additional context
    const completedSessions = await Session.countDocuments({
      status: 'completed'
    });

    // Format statistics
    const stats = {
      happyClients: {
        value: formatNumber(clientCount),
        label: 'Happy Clients',
        description: 'Individuals supported on their healing journey',
        icon: '😊',
        actual: clientCount
      },
      licensedTherapists: {
        value: formatNumber(psychologistCount),
        label: 'Licensed Therapists',
        description: 'Verified mental health professionals',
        icon: '👨‍⚕️',
        actual: psychologistCount
      },
      satisfactionRate: {
        value: `${satisfactionRate}%`,
        label: 'Satisfaction Rate',
        description: 'Client satisfaction with our services',
        icon: '⭐',
        actual: satisfactionRate
      },
      supportAvailable: {
        value: '24/7',
        label: 'Support Available',
        description: 'Round-the-clock platform access',
        icon: '🕐',
        actual: 24
      },
      // Additional metadata
      metadata: {
        completedSessions,
        lastUpdated: new Date(),
        source: 'database'
      }
    };

    return stats;
  } catch (error) {
    console.error('Error calculating platform stats:', error);
    throw error;
  }
}

/**
 * Format number for display
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
  if (num === 0) return '0';
  if (num < 10) return `${num}`;
  if (num < 100) return `${num}+`;
  if (num < 1000) return `${Math.floor(num / 10) * 10}+`;
  if (num < 10000) return `${(num / 1000).toFixed(1)}K+`;
  return `${Math.floor(num / 1000)}K+`;
}

/**
 * Get platform statistics (with caching)
 * 
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Object>} Platform statistics
 */
async function getStats(forceRefresh = false) {
  try {
    // Check if cache is valid
    const now = Date.now();
    const cacheValid = statsCache && lastUpdated && (now - lastUpdated < CACHE_TTL);

    if (!forceRefresh && cacheValid) {
      return {
        ...statsCache,
        metadata: {
          ...statsCache.metadata,
          cached: true,
          cacheAge: Math.floor((now - lastUpdated) / 1000 / 60) // minutes
        }
      };
    }

    // Calculate fresh stats
    const stats = await calculateStats();

    // Update cache
    statsCache = stats;
    lastUpdated = now;

    return stats;
  } catch (error) {
    console.error('Error getting platform stats, using fallback:', error);
    
    // Return fallback stats with error indicator
    return {
      ...FALLBACK_STATS,
      metadata: {
        lastUpdated: new Date(),
        source: 'fallback',
        error: error.message
      }
    };
  }
}

/**
 * Refresh statistics cache
 * 
 * This function should be called periodically (e.g., daily via cron job)
 * 
 * @returns {Promise<Object>} Updated statistics
 */
async function refreshCache() {
  console.log('Refreshing platform statistics cache...');
  try {
    const stats = await getStats(true);
    console.log('Platform statistics cache refreshed successfully');
    return stats;
  } catch (error) {
    console.error('Error refreshing platform statistics cache:', error);
    throw error;
  }
}

/**
 * Get cache status
 * 
 * @returns {Object} Cache status information
 */
function getCacheStatus() {
  const now = Date.now();
  return {
    cached: !!statsCache,
    lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
    cacheAge: lastUpdated ? Math.floor((now - lastUpdated) / 1000 / 60) : null, // minutes
    ttl: CACHE_TTL / 1000 / 60, // minutes
    expiresIn: lastUpdated ? Math.max(0, Math.floor((CACHE_TTL - (now - lastUpdated)) / 1000 / 60)) : 0 // minutes
  };
}

/**
 * Clear statistics cache
 * 
 * Useful for testing or manual cache invalidation
 */
function clearCache() {
  statsCache = null;
  lastUpdated = null;
  console.log('Platform statistics cache cleared');
}

module.exports = {
  getStats,
  refreshCache,
  getCacheStatus,
  clearCache,
  calculateStats // Exported for testing
};
