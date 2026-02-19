/**
 * Optimized Query Utilities
 * 
 * Implements Requirement 13.4 from teletherapy-booking-enhancement
 * - Optimize session list queries
 * - Add pagination for large result sets
 * - Implement caching for frequently accessed data
 * 
 * @module utils/optimizedQueries
 */

const mongoose = require('mongoose');
const { withCache, invalidateSessionCache } = require('./queryCache');

/**
 * Pagination options with defaults
 * @typedef {Object} PaginationOptions
 * @property {number} page - Page number (1-based)
 * @property {number} limit - Items per page
 * @property {string} sortBy - Field to sort by
 * @property {string} sortOrder - 'asc' or 'desc'
 */

/**
 * Default pagination settings
 */
const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
  sortBy: 'sessionDate',
  sortOrder: 'desc'
};

/**
 * Parse and validate pagination parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} - Validated pagination options
 */
function parsePaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || DEFAULT_PAGINATION.page);
  const requestedLimit = parseInt(query.limit) || DEFAULT_PAGINATION.limit;
  const limit = Math.min(requestedLimit, DEFAULT_PAGINATION.maxLimit);
  const offset = (page - 1) * limit;
  
  const sortBy = query.sortBy || DEFAULT_PAGINATION.sortBy;
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  
  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
    sort: { [sortBy]: sortOrder }
  };
}

/**
 * Build pagination response metadata
 * @param {number} total - Total document count
 * @param {Object} pagination - Pagination options
 * @returns {Object} - Pagination metadata
 */
function buildPaginationMeta(total, pagination) {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPrevPage: pagination.page > 1,
    nextPage: pagination.page < totalPages ? pagination.page + 1 : null,
    prevPage: pagination.page > 1 ? pagination.page - 1 : null
  };
}

/**
 * Optimized session query for client
 * Uses indexes and projection for performance
 * 
 * @param {string} clientId - Client user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Sessions with pagination
 */
async function getClientSessions(clientId, options = {}) {
  const Session = mongoose.model('Session');
  const pagination = parsePaginationParams(options);
  
  // Build query with filters
  const query = { client: new mongoose.Types.ObjectId(clientId) };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }
  
  if (options.startDate || options.endDate) {
    query.sessionDate = {};
    if (options.startDate) {
      query.sessionDate.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.sessionDate.$lte = new Date(options.endDate);
    }
  }
  
  // Use lean() for better performance when we don't need Mongoose documents
  const [sessions, total] = await Promise.all([
    Session.find(query)
      .select('_id bookingReference sessionType sessionDate status paymentStatus price psychologist meetingLink createdAt')
      .populate('psychologist', 'name email profilePicture')
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean(),
    Session.countDocuments(query)
  ]);
  
  return {
    sessions,
    pagination: buildPaginationMeta(total, pagination)
  };
}

/**
 * Optimized session query for psychologist
 * Uses indexes and projection for performance
 * 
 * @param {string} psychologistId - Psychologist user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Sessions with pagination
 */
async function getPsychologistSessions(psychologistId, options = {}) {
  const Session = mongoose.model('Session');
  const pagination = parsePaginationParams(options);
  
  // Build query with filters
  const query = { psychologist: new mongoose.Types.ObjectId(psychologistId) };
  
  if (options.status) {
    if (Array.isArray(options.status)) {
      query.status = { $in: options.status };
    } else {
      query.status = options.status;
    }
  }
  
  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }
  
  if (options.clientId) {
    query.client = new mongoose.Types.ObjectId(options.clientId);
  }
  
  if (options.startDate || options.endDate) {
    query.sessionDate = {};
    if (options.startDate) {
      query.sessionDate.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.sessionDate.$lte = new Date(options.endDate);
    }
  }
  
  // Use lean() for better performance
  const [sessions, total] = await Promise.all([
    Session.find(query)
      .select('_id bookingReference sessionType sessionDate status paymentStatus price client meetingLink videoCallStarted videoCallEnded callDuration createdAt')
      .populate('client', 'name email phone profilePicture')
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean(),
    Session.countDocuments(query)
  ]);
  
  return {
    sessions,
    pagination: buildPaginationMeta(total, pagination)
  };
}

/**
 * Optimized session query for admin
 * Uses indexes and projection for performance
 * 
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Sessions with pagination
 */
async function getAdminSessions(options = {}) {
  const Session = mongoose.model('Session');
  const pagination = parsePaginationParams(options);
  
  // Build query with filters
  const query = {};
  
  if (options.status) {
    if (Array.isArray(options.status)) {
      query.status = { $in: options.status };
    } else {
      query.status = options.status;
    }
  }
  
  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }
  
  if (options.clientId) {
    query.client = new mongoose.Types.ObjectId(options.clientId);
  }
  
  if (options.psychologistId) {
    query.psychologist = new mongoose.Types.ObjectId(options.psychologistId);
  }
  
  if (options.startDate || options.endDate) {
    query.sessionDate = {};
    if (options.startDate) {
      query.sessionDate.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.sessionDate.$lte = new Date(options.endDate);
    }
  }
  
  // Use lean() for better performance
  const [sessions, total] = await Promise.all([
    Session.find(query)
      .select('_id bookingReference sessionType sessionDate status paymentStatus price client psychologist createdAt')
      .populate('client', 'name email')
      .populate('psychologist', 'name email')
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean(),
    Session.countDocuments(query)
  ]);
  
  return {
    sessions,
    pagination: buildPaginationMeta(total, pagination)
  };
}

/**
 * Get sessions with caching
 * @param {string} role - User role (client, psychologist, admin)
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Cached or fresh sessions
 */
async function getSessionsWithCache(role, userId, options = {}) {
  const cacheKey = {
    role,
    userId,
    ...options
  };
  
  const cacheTTL = 30000; // 30 seconds
  
  return withCache('sessions', `${role}:${userId}`, async () => {
    switch (role) {
      case 'client':
        return getClientSessions(userId, options);
      case 'psychologist':
        return getPsychologistSessions(userId, options);
      case 'admin':
        return getAdminSessions(options);
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }, cacheKey, cacheTTL);
}

/**
 * Optimized audit log query with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Audit logs with pagination
 */
async function getAuditLogs(options = {}) {
  const AuditLog = mongoose.model('AuditLog');
  const pagination = parsePaginationParams({
    ...options,
    sortBy: options.sortBy || 'timestamp',
    sortOrder: options.sortOrder || 'desc'
  });
  
  // Build query
  const query = {};
  
  if (options.userId) {
    query.userId = new mongoose.Types.ObjectId(options.userId);
  }
  
  if (options.actionType) {
    query.actionType = options.actionType;
  }
  
  if (options.sessionId) {
    query.sessionId = new mongoose.Types.ObjectId(options.sessionId);
  }
  
  // Date range filter (Requirement 8.5 - 90 day retention)
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.timestamp.$lte = new Date(options.endDate);
    }
  } else {
    // Default to last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    query.timestamp = { $gte: ninetyDaysAgo };
  }
  
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .select('_id timestamp actionType action userId adminId sessionId targetType targetId ipAddress')
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);
  
  return {
    logs,
    pagination: buildPaginationMeta(total, pagination)
  };
}

/**
 * Get upcoming sessions for reminders (optimized query)
 * Uses compound index on reminder flags and session date
 * 
 * @param {number} hoursAhead - Hours to look ahead
 * @param {string} reminderType - '24h' or '1h'
 * @returns {Promise<Array>} - Sessions needing reminders
 */
async function getSessionsNeedingReminders(hoursAhead, reminderType) {
  const Session = mongoose.model('Session');
  
  const now = new Date();
  const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  const query = {
    sessionDate: {
      $gte: now,
      $lte: targetTime
    },
    status: { $in: ['Confirmed', 'Booked', 'Approved'] }
  };
  
  // Add reminder flag filter based on type
  if (reminderType === '24h') {
    query.reminder24HourSent = { $ne: true };
  } else if (reminderType === '1h') {
    query.reminder1HourSent = { $ne: true };
  }
  
  return Session.find(query)
    .select('_id client psychologist sessionDate sessionType meetingLink bookingReference')
    .populate('client', 'name email phone')
    .populate('psychologist', 'name email')
    .lean();
}

/**
 * Get session statistics (cached)
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<Object>} - Session statistics
 */
async function getSessionStats(userId, role) {
  const Session = mongoose.model('Session');
  
  return withCache('stats', `sessionStats:${role}:${userId}`, async () => {
    const matchQuery = {};
    
    if (role === 'client') {
      matchQuery.client = new mongoose.Types.ObjectId(userId);
    } else if (role === 'psychologist') {
      matchQuery.psychologist = new mongoose.Types.ObjectId(userId);
    }
    
    const stats = await Session.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          upcoming: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['Confirmed', 'Booked', 'Approved', 'Payment Submitted']] },
                    { $gte: ['$sessionDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          cancelled: {
            $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Declined']] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Verified'] },
                { $ifNull: ['$price', 0] },
                0
              ]
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      total: 0,
      completed: 0,
      upcoming: 0,
      cancelled: 0,
      totalRevenue: 0
    };
  }, { userId, role }, 300000); // 5 minute cache
}

module.exports = {
  DEFAULT_PAGINATION,
  parsePaginationParams,
  buildPaginationMeta,
  getClientSessions,
  getPsychologistSessions,
  getAdminSessions,
  getSessionsWithCache,
  getAuditLogs,
  getSessionsNeedingReminders,
  getSessionStats,
  invalidateSessionCache
};
