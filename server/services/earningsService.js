/**
 * Earnings Service
 * 
 * Provides earnings calculation and retrieval functions for psychologists.
 * Implements Requirements 7.1, 7.2, 7.3
 * 
 * @module services/earningsService
 */

const mongoose = require('mongoose');

/**
 * Earnings Service Class
 * 
 * Centralizes all earnings calculations for psychologists
 */
class EarningsService {
  
  /**
   * Get the database instance
   * @returns {Db} MongoDB database instance
   */
  getDb() {
    const db = mongoose.connection.db;
    if (!db) {
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection.db;
      }
    }
    return db;
  }
  
  /**
   * Get earnings for a psychologist
   * 
   * @param {string} psychologistId - The psychologist's user ID
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for filtering (optional)
   * @param {Date} options.endDate - End date for filtering (optional)
   * @param {number} options.page - Page number for pagination (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @returns {Promise<Object>} Earnings data with payments and totals
   * Requirements: 7.1, 7.2, 7.3
   */
  async getEarnings(psychologistId, options = {}) {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      
      const {
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options;
      
      // Build match query
      const matchQuery = {
        psychologist: new mongoose.Types.ObjectId(psychologistId),
        paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
      };
      
      // Apply date range filter if provided
      if (startDate || endDate) {
        matchQuery.sessionDate = {};
        if (startDate) {
          matchQuery.sessionDate.$gte = new Date(startDate);
        }
        if (endDate) {
          matchQuery.sessionDate.$lte = new Date(endDate);
        }
      } else {
        // Default to current month - Requirement 7.1
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        matchQuery.sessionDate = {
          $gte: firstDayOfMonth,
          $lte: lastDayOfMonth
        };
      }
      
      // Get total count for pagination
      const totalCount = await db.collection('sessions').countDocuments(matchQuery);
      
      // Calculate skip for pagination
      const skip = (page - 1) * limit;
      
      // Get payments with session and client info - Requirement 7.3
      const payments = await db.collection('sessions').aggregate([
        { $match: matchQuery },
        { $sort: { sessionDate: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'client',
            foreignField: '_id',
            as: 'clientInfo'
          }
        },
        {
          $project: {
            _id: 1,
            sessionDate: 1,
            sessionType: 1,
            status: 1,
            paymentStatus: 1,
            price: 1,
            mpesaAmount: 1,
            mpesaTransactionID: 1,
            paymentVerifiedAt: 1,
            clientName: { $arrayElemAt: ['$clientInfo.name', 0] },
            clientId: '$client'
          }
        }
      ]).toArray();
      
      // Calculate totals - Requirement 7.1
      const totalsAggregation = await db.collection('sessions').aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalEarnings: {
              $sum: { $ifNull: ['$mpesaAmount', { $ifNull: ['$price', 0] }] }
            },
            totalSessions: { $sum: 1 }
          }
        }
      ]).toArray();
      
      const totals = totalsAggregation[0] || { totalEarnings: 0, totalSessions: 0 };
      
      // Get pending payments separately - Requirement 7.5
      const pendingMatchQuery = {
        psychologist: new mongoose.Types.ObjectId(psychologistId),
        paymentStatus: { $in: ['Pending', 'Submitted', 'Processing'] }
      };
      
      // Apply same date filter to pending
      if (matchQuery.sessionDate) {
        pendingMatchQuery.sessionDate = matchQuery.sessionDate;
      }
      
      const pendingAggregation = await db.collection('sessions').aggregate([
        { $match: pendingMatchQuery },
        {
          $group: {
            _id: null,
            pendingAmount: {
              $sum: { $ifNull: ['$mpesaAmount', { $ifNull: ['$price', 0] }] }
            },
            pendingCount: { $sum: 1 }
          }
        }
      ]).toArray();
      
      const pending = pendingAggregation[0] || { pendingAmount: 0, pendingCount: 0 };
      
      return {
        payments: payments.map(p => ({
          id: p._id,
          sessionDate: p.sessionDate,
          sessionType: p.sessionType,
          status: p.status,
          paymentStatus: p.paymentStatus,
          amount: p.mpesaAmount || p.price || 0,
          transactionId: p.mpesaTransactionID || null,
          verifiedAt: p.paymentVerifiedAt || null,
          clientName: p.clientName || 'Unknown Client',
          clientId: p.clientId
        })),
        totals: {
          totalEarnings: totals.totalEarnings,
          totalSessions: totals.totalSessions,
          pendingAmount: pending.pendingAmount,
          pendingCount: pending.pendingCount
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        dateRange: {
          startDate: matchQuery.sessionDate?.$gte || null,
          endDate: matchQuery.sessionDate?.$lte || null
        }
      };
    } catch (error) {
      console.error('Error getting earnings:', error);
      throw error;
    }
  }
  
  /**
   * Get earnings data for CSV export
   * 
   * @param {string} psychologistId - The psychologist's user ID
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for filtering (optional)
   * @param {Date} options.endDate - End date for filtering (optional)
   * @returns {Promise<Array>} Array of payment records for export
   * Requirements: 7.4
   */
  async getEarningsForExport(psychologistId, options = {}) {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      
      const { startDate, endDate } = options;
      
      // Build match query
      const matchQuery = {
        psychologist: new mongoose.Types.ObjectId(psychologistId),
        paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
      };
      
      // Apply date range filter if provided
      if (startDate || endDate) {
        matchQuery.sessionDate = {};
        if (startDate) {
          matchQuery.sessionDate.$gte = new Date(startDate);
        }
        if (endDate) {
          matchQuery.sessionDate.$lte = new Date(endDate);
        }
      }
      
      // Get all payments for export - Requirement 7.4
      const payments = await db.collection('sessions').aggregate([
        { $match: matchQuery },
        { $sort: { sessionDate: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'client',
            foreignField: '_id',
            as: 'clientInfo'
          }
        },
        {
          $project: {
            sessionDate: 1,
            sessionType: 1,
            paymentStatus: 1,
            price: 1,
            mpesaAmount: 1,
            mpesaTransactionID: 1,
            paymentVerifiedAt: 1,
            clientName: { $arrayElemAt: ['$clientInfo.name', 0] }
          }
        }
      ]).toArray();
      
      return payments.map(p => ({
        date: p.sessionDate ? new Date(p.sessionDate).toISOString().split('T')[0] : '',
        clientName: p.clientName || 'Unknown Client',
        sessionType: p.sessionType || '',
        amount: p.mpesaAmount || p.price || 0,
        transactionId: p.mpesaTransactionID || '',
        paymentStatus: p.paymentStatus || '',
        verifiedAt: p.paymentVerifiedAt ? new Date(p.paymentVerifiedAt).toISOString().split('T')[0] : ''
      }));
    } catch (error) {
      console.error('Error getting earnings for export:', error);
      throw error;
    }
  }
}

// Export singleton instance
const earningsService = new EarningsService();

module.exports = {
  EarningsService,
  earningsService
};
