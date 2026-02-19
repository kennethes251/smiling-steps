/**
 * Admin Statistics Service
 * 
 * Provides aggregation functions for admin dashboard statistics.
 * Implements Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * @module services/adminStatsService
 */

const mongoose = require('mongoose');

/**
 * Admin Stats Service Class
 * 
 * Centralizes all admin dashboard statistics calculations
 * Uses native MongoDB driver for reliability when bufferCommands is disabled
 */
class AdminStatsService {
  
  /**
   * Get the database instance
   * @returns {Db} MongoDB database instance
   */
  getDb() {
    const db = mongoose.connection.db;
    if (!db) {
      // Try to get from connection directly
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection.db;
      }
    }
    return db;
  }
  
  /**
   * Get total count of clients
   * Counts users with role 'client' and active status
   * 
   * @returns {Promise<number>} Total client count
   * Requirements: 1.1
   */
  async getTotalClients() {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      const count = await db.collection('users').countDocuments({ 
        role: 'client',
        status: { $ne: 'deleted' }
      });
      return count;
    } catch (error) {
      console.error('Error getting total clients:', error);
      throw error;
    }
  }
  
  /**
   * Get total count of psychologists
   * Counts users with role 'psychologist' and active status
   * 
   * @returns {Promise<number>} Total psychologist count
   * Requirements: 1.2
   */
  async getTotalPsychologists() {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      const count = await db.collection('users').countDocuments({ 
        role: 'psychologist',
        status: { $ne: 'deleted' }
      });
      return count;
    } catch (error) {
      console.error('Error getting total psychologists:', error);
      throw error;
    }
  }
  
  /**
   * Get session statistics aggregated by status
   * Returns breakdown of sessions by their current status
   * 
   * @returns {Promise<Object>} Session stats by status
   * Requirements: 1.3
   */
  async getSessionStats() {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      
      // Get counts for each status
      const statusCounts = await db.collection('sessions').aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Convert to object format
      const stats = {
        pending: 0,
        approved: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };
      
      // Map status values to our stats object
      const statusMapping = {
        'Pending': 'pending',
        'Pending Approval': 'pending',
        'Approved': 'approved',
        'Payment Submitted': 'approved',
        'Confirmed': 'confirmed',
        'Booked': 'confirmed',
        'In Progress': 'inProgress',
        'Completed': 'completed',
        'Cancelled': 'cancelled',
        'Declined': 'cancelled'
      };
      
      for (const item of statusCounts) {
        const mappedStatus = statusMapping[item._id];
        if (mappedStatus) {
          stats[mappedStatus] += item.count;
        }
        stats.total += item.count;
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }
  
  /**
   * Get payment statistics
   * Returns total payment count and sum of amounts
   * 
   * @returns {Promise<Object>} Payment stats with count and amount
   * Requirements: 1.4
   */
  async getPaymentStats() {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      
      // Get count and sum of paid sessions
      const paymentAggregation = await db.collection('sessions').aggregate([
        {
          $match: {
            paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { 
              $sum: { 
                $ifNull: ['$mpesaAmount', { $ifNull: ['$price', 0] }] 
              } 
            }
          }
        }
      ]).toArray();
      
      const result = paymentAggregation[0] || { count: 0, totalAmount: 0 };
      
      return {
        count: result.count,
        amount: result.totalAmount
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }
  
  /**
   * Get count of pending psychologist approvals
   * Counts psychologists with approvalStatus 'pending'
   * 
   * @returns {Promise<number>} Pending approvals count
   * Requirements: 1.5
   */
  async getPendingApprovals() {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not connected');
      }
      
      const count = await db.collection('users').countDocuments({
        role: 'psychologist',
        status: { $ne: 'deleted' },
        $or: [
          { approvalStatus: 'pending' },
          { 'psychologistDetails.approvalStatus': 'pending' }
        ]
      });
      return count;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }
  
  /**
   * Get all dashboard statistics combined
   * Aggregates all stats into a single response object
   * 
   * @returns {Promise<Object>} Combined dashboard statistics
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async getAllStats() {
    try {
      // Execute all queries in parallel for performance
      const [
        totalClients,
        totalPsychologists,
        sessionStats,
        paymentStats,
        pendingApprovals
      ] = await Promise.all([
        this.getTotalClients(),
        this.getTotalPsychologists(),
        this.getSessionStats(),
        this.getPaymentStats(),
        this.getPendingApprovals()
      ]);
      
      return {
        totalClients,
        totalPsychologists,
        totalSessions: sessionStats,
        totalPayments: paymentStats,
        pendingApprovals
      };
    } catch (error) {
      console.error('Error getting all stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
const adminStatsService = new AdminStatsService();

module.exports = {
  AdminStatsService,
  adminStatsService
};
