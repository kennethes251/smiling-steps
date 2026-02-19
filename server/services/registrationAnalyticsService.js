/**
 * Registration Analytics Service
 * 
 * Provides comprehensive analytics for the registration system:
 * - Verification success rates
 * - Registration completion rates
 * - User drop-off analysis
 * - Performance optimization insights
 * - Trend analysis
 * 
 * @module services/registrationAnalyticsService
 */

const { logger, logBusinessEvent } = require('../utils/logger');
const User = require('../models/User');

class RegistrationAnalyticsService {
  constructor() {
    // Cache for analytics data
    this.analyticsCache = {
      lastUpdated: null,
      data: null
    };
    
    // Cache TTL (5 minutes)
    this.cacheTTL = 5 * 60 * 1000;

    logger.info('Registration analytics service initialized');
  }

  /**
   * Get verification success rates
   * @param {Object} options - Query options
   * @returns {Object} Verification rate analytics
   */
  async getVerificationSuccessRates(options = {}) {
    const { startDate, endDate, groupBy = 'day' } = options;
    
    try {
      const query = { role: { $in: ['client', 'psychologist'] } };
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get total registered users
      const totalUsers = await User.countDocuments(query);
      
      // Get verified users
      const verifiedQuery = { ...query, $or: [{ isVerified: true }, { isEmailVerified: true }] };
      const verifiedUsers = await User.countDocuments(verifiedQuery);
      
      // Get unverified users
      const unverifiedUsers = totalUsers - verifiedUsers;
      
      // Calculate rates
      const verificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;
      
      // Get breakdown by role
      const clientQuery = { ...query, role: 'client' };
      const therapistQuery = { ...query, role: 'psychologist' };
      
      const totalClients = await User.countDocuments(clientQuery);
      const verifiedClients = await User.countDocuments({ ...clientQuery, $or: [{ isVerified: true }, { isEmailVerified: true }] });
      
      const totalTherapists = await User.countDocuments(therapistQuery);
      const verifiedTherapists = await User.countDocuments({ ...therapistQuery, $or: [{ isVerified: true }, { isEmailVerified: true }] });

      return {
        overall: {
          total: totalUsers,
          verified: verifiedUsers,
          unverified: unverifiedUsers,
          verificationRate: `${verificationRate.toFixed(2)}%`
        },
        byRole: {
          client: {
            total: totalClients,
            verified: verifiedClients,
            rate: totalClients > 0 ? `${((verifiedClients / totalClients) * 100).toFixed(2)}%` : '0%'
          },
          therapist: {
            total: totalTherapists,
            verified: verifiedTherapists,
            rate: totalTherapists > 0 ? `${((verifiedTherapists / totalTherapists) * 100).toFixed(2)}%` : '0%'
          }
        },
        timeRange: {
          startDate: startDate || 'all time',
          endDate: endDate || 'now'
        }
      };
    } catch (error) {
      logger.error('Failed to get verification success rates', { error: error.message });
      throw error;
    }
  }

  /**
   * Get registration completion rates
   * @param {Object} options - Query options
   * @returns {Object} Registration completion analytics
   */
  async getRegistrationCompletionRates(options = {}) {
    const { startDate, endDate } = options;
    
    try {
      const query = {};
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get all users
      const totalUsers = await User.countDocuments(query);
      
      // Get users by account status
      const statusCounts = await User.aggregate([
        { $match: query },
        { $group: { _id: '$accountStatus', count: { $sum: 1 } } }
      ]);

      const statusMap = {};
      statusCounts.forEach(s => {
        statusMap[s._id || 'unknown'] = s.count;
      });

      // Calculate completion stages
      const registered = totalUsers;
      const emailVerified = await User.countDocuments({ 
        ...query, 
        $or: [{ isVerified: true }, { isEmailVerified: true }] 
      });
      
      // For therapists, check approval status
      const therapistQuery = { ...query, role: 'psychologist' };
      const totalTherapists = await User.countDocuments(therapistQuery);
      const approvedTherapists = await User.countDocuments({ 
        ...therapistQuery, 
        $or: [
          { approvalStatus: 'approved' },
          { 'psychologistDetails.approvalStatus': 'approved' }
        ]
      });
      const pendingTherapists = await User.countDocuments({ 
        ...therapistQuery, 
        $or: [
          { approvalStatus: 'pending' },
          { 'psychologistDetails.approvalStatus': 'pending' }
        ]
      });

      return {
        overall: {
          totalRegistrations: registered,
          emailVerified,
          emailVerificationRate: registered > 0 ? `${((emailVerified / registered) * 100).toFixed(2)}%` : '0%'
        },
        therapistWorkflow: {
          total: totalTherapists,
          approved: approvedTherapists,
          pending: pendingTherapists,
          approvalRate: totalTherapists > 0 ? `${((approvedTherapists / totalTherapists) * 100).toFixed(2)}%` : '0%'
        },
        accountStatusBreakdown: statusMap,
        timeRange: {
          startDate: startDate || 'all time',
          endDate: endDate || 'now'
        }
      };
    } catch (error) {
      logger.error('Failed to get registration completion rates', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user drop-off analysis
   * @param {Object} options - Query options
   * @returns {Object} Drop-off analysis
   */
  async getUserDropOffAnalysis(options = {}) {
    const { startDate, endDate } = options;
    
    try {
      const query = {};
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get counts at each stage
      const totalRegistered = await User.countDocuments(query);
      
      // Users who never verified email
      const neverVerified = await User.countDocuments({
        ...query,
        isVerified: { $ne: true },
        isEmailVerified: { $ne: true }
      });

      // Therapists who verified but never submitted credentials
      const verifiedNoCredentials = await User.countDocuments({
        ...query,
        role: 'psychologist',
        $or: [{ isVerified: true }, { isEmailVerified: true }],
        'psychologistDetails.credentials': { $size: 0 }
      });

      // Therapists pending approval for more than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const longPendingTherapists = await User.countDocuments({
        ...query,
        role: 'psychologist',
        $or: [
          { approvalStatus: 'pending' },
          { 'psychologistDetails.approvalStatus': 'pending' }
        ],
        createdAt: { $lt: sevenDaysAgo }
      });

      // Users who registered but never logged in
      const neverLoggedIn = await User.countDocuments({
        ...query,
        lastLogin: null
      });

      // Calculate drop-off rates
      const dropOffAnalysis = {
        stages: {
          registration: {
            count: totalRegistered,
            dropOff: 0,
            dropOffRate: '0%'
          },
          emailVerification: {
            count: totalRegistered - neverVerified,
            dropOff: neverVerified,
            dropOffRate: totalRegistered > 0 ? `${((neverVerified / totalRegistered) * 100).toFixed(2)}%` : '0%'
          }
        },
        insights: [],
        recommendations: []
      };

      // Add insights
      if (neverVerified > 0) {
        const neverVerifiedRate = (neverVerified / totalRegistered) * 100;
        if (neverVerifiedRate > 30) {
          dropOffAnalysis.insights.push({
            severity: 'high',
            message: `${neverVerifiedRate.toFixed(1)}% of users never verified their email`,
            metric: 'email_verification_dropoff'
          });
          dropOffAnalysis.recommendations.push('Review email deliverability and verification email content');
          dropOffAnalysis.recommendations.push('Consider sending reminder emails to unverified users');
        }
      }

      if (neverLoggedIn > 0) {
        const neverLoggedInRate = (neverLoggedIn / totalRegistered) * 100;
        if (neverLoggedInRate > 20) {
          dropOffAnalysis.insights.push({
            severity: 'medium',
            message: `${neverLoggedInRate.toFixed(1)}% of users never logged in after registration`,
            metric: 'first_login_dropoff'
          });
          dropOffAnalysis.recommendations.push('Send welcome emails with clear next steps');
        }
      }

      if (longPendingTherapists > 0) {
        dropOffAnalysis.insights.push({
          severity: 'medium',
          message: `${longPendingTherapists} therapists have been pending approval for more than 7 days`,
          metric: 'approval_delay'
        });
        dropOffAnalysis.recommendations.push('Review and expedite therapist approval process');
      }

      dropOffAnalysis.summary = {
        neverVerified,
        neverLoggedIn,
        verifiedNoCredentials,
        longPendingTherapists
      };

      return dropOffAnalysis;
    } catch (error) {
      logger.error('Failed to get drop-off analysis', { error: error.message });
      throw error;
    }
  }

  /**
   * Get registration trends over time
   * @param {Object} options - Query options
   * @returns {Object} Registration trends
   */
  async getRegistrationTrends(options = {}) {
    const { days = 30, groupBy = 'day' } = options;
    
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Aggregate registrations by day
      const registrationTrends = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            total: { $sum: 1 },
            clients: {
              $sum: { $cond: [{ $eq: ['$role', 'client'] }, 1, 0] }
            },
            therapists: {
              $sum: { $cond: [{ $eq: ['$role', 'psychologist'] }, 1, 0] }
            },
            verified: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ['$isVerified', true] }, { $eq: ['$isEmailVerified', true] }] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Format the data
      const formattedTrends = registrationTrends.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        total: item.total,
        clients: item.clients,
        therapists: item.therapists,
        verified: item.verified,
        verificationRate: item.total > 0 ? `${((item.verified / item.total) * 100).toFixed(1)}%` : '0%'
      }));

      // Calculate summary statistics
      const totalRegistrations = formattedTrends.reduce((sum, d) => sum + d.total, 0);
      const avgPerDay = formattedTrends.length > 0 ? totalRegistrations / formattedTrends.length : 0;
      
      // Find peak day
      const peakDay = formattedTrends.reduce((max, d) => d.total > max.total ? d : max, { total: 0 });

      return {
        period: `Last ${days} days`,
        trends: formattedTrends,
        summary: {
          totalRegistrations,
          averagePerDay: avgPerDay.toFixed(2),
          peakDay: peakDay.date || 'N/A',
          peakDayCount: peakDay.total
        }
      };
    } catch (error) {
      logger.error('Failed to get registration trends', { error: error.message });
      throw error;
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   * @returns {Object} Dashboard data
   */
  async getDashboardData() {
    try {
      // Check cache
      if (this.analyticsCache.data && 
          this.analyticsCache.lastUpdated && 
          Date.now() - this.analyticsCache.lastUpdated < this.cacheTTL) {
        return this.analyticsCache.data;
      }

      // Gather all analytics
      const [
        verificationRates,
        completionRates,
        dropOffAnalysis,
        trends
      ] = await Promise.all([
        this.getVerificationSuccessRates(),
        this.getRegistrationCompletionRates(),
        this.getUserDropOffAnalysis(),
        this.getRegistrationTrends({ days: 30 })
      ]);

      const dashboardData = {
        generatedAt: new Date(),
        verificationRates,
        completionRates,
        dropOffAnalysis,
        trends,
        healthScore: this.calculateHealthScore(verificationRates, completionRates, dropOffAnalysis)
      };

      // Update cache
      this.analyticsCache = {
        lastUpdated: Date.now(),
        data: dashboardData
      };

      return dashboardData;
    } catch (error) {
      logger.error('Failed to get dashboard data', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate overall health score for registration system
   * @param {Object} verificationRates - Verification rate data
   * @param {Object} completionRates - Completion rate data
   * @param {Object} dropOffAnalysis - Drop-off analysis data
   * @returns {Object} Health score
   */
  calculateHealthScore(verificationRates, completionRates, dropOffAnalysis) {
    let score = 100;
    const factors = [];

    // Verification rate factor (40% weight)
    const verificationRate = parseFloat(verificationRates.overall.verificationRate);
    if (verificationRate < 50) {
      score -= 40;
      factors.push({ factor: 'Low verification rate', impact: -40 });
    } else if (verificationRate < 70) {
      score -= 20;
      factors.push({ factor: 'Moderate verification rate', impact: -20 });
    } else if (verificationRate < 85) {
      score -= 10;
      factors.push({ factor: 'Good verification rate', impact: -10 });
    }

    // Drop-off factor (30% weight)
    const highSeverityInsights = dropOffAnalysis.insights.filter(i => i.severity === 'high').length;
    const mediumSeverityInsights = dropOffAnalysis.insights.filter(i => i.severity === 'medium').length;
    
    if (highSeverityInsights > 0) {
      score -= 15 * highSeverityInsights;
      factors.push({ factor: `${highSeverityInsights} high severity issues`, impact: -15 * highSeverityInsights });
    }
    if (mediumSeverityInsights > 0) {
      score -= 5 * mediumSeverityInsights;
      factors.push({ factor: `${mediumSeverityInsights} medium severity issues`, impact: -5 * mediumSeverityInsights });
    }

    // Therapist approval rate factor (30% weight)
    const approvalRate = parseFloat(completionRates.therapistWorkflow.approvalRate);
    if (completionRates.therapistWorkflow.total > 0) {
      if (approvalRate < 30) {
        score -= 20;
        factors.push({ factor: 'Low therapist approval rate', impact: -20 });
      } else if (approvalRate < 60) {
        score -= 10;
        factors.push({ factor: 'Moderate therapist approval rate', impact: -10 });
      }
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    let status = 'excellent';
    if (score < 50) status = 'critical';
    else if (score < 70) status = 'needs_attention';
    else if (score < 85) status = 'good';

    return {
      score,
      status,
      factors,
      recommendations: dropOffAnalysis.recommendations
    };
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.analyticsCache = {
      lastUpdated: null,
      data: null
    };
    logger.info('Registration analytics cache cleared');
  }
}

// Create singleton instance
const registrationAnalyticsService = new RegistrationAnalyticsService();

module.exports = registrationAnalyticsService;
