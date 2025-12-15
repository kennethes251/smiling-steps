/**
 * Historical Trend Analysis Utility
 * Provides analytics and trend analysis for M-Pesa payment data
 */

const Session = require('../models/Session');
const moment = require('moment');

/**
 * Time period constants
 */
const TimePeriods = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

/**
 * Metric types for analysis
 */
const MetricTypes = {
  TRANSACTION_COUNT: 'transaction_count',
  REVENUE: 'revenue',
  SUCCESS_RATE: 'success_rate',
  AVERAGE_AMOUNT: 'average_amount',
  FAILURE_RATE: 'failure_rate',
  PROCESSING_TIME: 'processing_time'
};

/**
 * Generate date ranges for trend analysis
 */
function generateDateRanges(startDate, endDate, period) {
  const ranges = [];
  const start = moment(startDate);
  const end = moment(endDate);
  
  let current = start.clone();
  
  while (current.isBefore(end)) {
    let periodEnd;
    let label;
    
    switch (period) {
      case TimePeriods.DAILY:
        periodEnd = current.clone().endOf('day');
        label = current.format('YYYY-MM-DD');
        current.add(1, 'day');
        break;
      case TimePeriods.WEEKLY:
        periodEnd = current.clone().endOf('week');
        label = `Week of ${current.format('MMM DD, YYYY')}`;
        current.add(1, 'week');
        break;
      case TimePeriods.MONTHLY:
        periodEnd = current.clone().endOf('month');
        label = current.format('MMM YYYY');
        current.add(1, 'month');
        break;
      case TimePeriods.QUARTERLY:
        periodEnd = current.clone().endOf('quarter');
        label = `Q${current.quarter()} ${current.year()}`;
        current.add(1, 'quarter');
        break;
      case TimePeriods.YEARLY:
        periodEnd = current.clone().endOf('year');
        label = current.format('YYYY');
        current.add(1, 'year');
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }
    
    // Ensure we don't go beyond the end date
    if (periodEnd.isAfter(end)) {
      periodEnd = end.clone();
    }
    
    ranges.push({
      start: current.clone().subtract(1, period === TimePeriods.DAILY ? 'day' : period === TimePeriods.WEEKLY ? 'week' : period === TimePeriods.MONTHLY ? 'month' : period === TimePeriods.QUARTERLY ? 'quarter' : 'year').startOf(period === TimePeriods.DAILY ? 'day' : period === TimePeriods.WEEKLY ? 'week' : period === TimePeriods.MONTHLY ? 'month' : period === TimePeriods.QUARTERLY ? 'quarter' : 'year').toDate(),
      end: periodEnd.toDate(),
      label
    });
  }
  
  return ranges;
}

/**
 * Calculate payment metrics for a specific time period
 */
async function calculatePeriodMetrics(startDate, endDate, filters = {}) {
  try {
    // Build base query
    const baseQuery = {
      paymentInitiatedAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Add optional filters
    if (filters.clientId) baseQuery.client = filters.clientId;
    if (filters.psychologistId) baseQuery.psychologist = filters.psychologistId;
    if (filters.sessionType) baseQuery.sessionType = filters.sessionType;

    // Get all payment attempts in the period
    const allPayments = await Session.find(baseQuery);
    
    // Get successful payments
    const successfulPayments = await Session.find({
      ...baseQuery,
      paymentStatus: 'Paid'
    });

    // Get failed payments
    const failedPayments = await Session.find({
      ...baseQuery,
      paymentStatus: 'Failed'
    });

    // Calculate metrics
    const totalTransactions = allPayments.length;
    const successfulCount = successfulPayments.length;
    const failedCount = failedPayments.length;
    
    const totalRevenue = successfulPayments.reduce((sum, session) => {
      return sum + (session.mpesaAmount || session.price || 0);
    }, 0);

    const averageAmount = successfulCount > 0 ? totalRevenue / successfulCount : 0;
    const successRate = totalTransactions > 0 ? (successfulCount / totalTransactions) * 100 : 0;
    const failureRate = totalTransactions > 0 ? (failedCount / totalTransactions) * 100 : 0;

    // Calculate average processing time for successful payments
    const processingTimes = successfulPayments
      .filter(session => session.paymentInitiatedAt && session.paymentVerifiedAt)
      .map(session => {
        const initiated = new Date(session.paymentInitiatedAt);
        const verified = new Date(session.paymentVerifiedAt);
        return (verified - initiated) / 1000; // Convert to seconds
      });

    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    return {
      period: { startDate, endDate },
      totalTransactions,
      successfulTransactions: successfulCount,
      failedTransactions: failedCount,
      totalRevenue,
      averageAmount,
      successRate,
      failureRate,
      averageProcessingTime,
      uniqueClients: new Set(allPayments.map(p => p.client?.toString())).size,
      uniqueTherapists: new Set(allPayments.map(p => p.psychologist?.toString())).size
    };

  } catch (error) {
    console.error('Error calculating period metrics:', error);
    throw error;
  }
}

/**
 * Generate trend analysis for a specific metric over time
 */
async function generateTrendAnalysis(startDate, endDate, period, metric, filters = {}) {
  try {
    console.log(`📊 Generating ${metric} trend analysis from ${startDate} to ${endDate} by ${period}`);

    // Generate date ranges
    const dateRanges = generateDateRanges(startDate, endDate, period);
    
    // Calculate metrics for each period
    const trendData = await Promise.all(
      dateRanges.map(async (range) => {
        const metrics = await calculatePeriodMetrics(range.start, range.end, filters);
        
        let value;
        switch (metric) {
          case MetricTypes.TRANSACTION_COUNT:
            value = metrics.totalTransactions;
            break;
          case MetricTypes.REVENUE:
            value = metrics.totalRevenue;
            break;
          case MetricTypes.SUCCESS_RATE:
            value = metrics.successRate;
            break;
          case MetricTypes.AVERAGE_AMOUNT:
            value = metrics.averageAmount;
            break;
          case MetricTypes.FAILURE_RATE:
            value = metrics.failureRate;
            break;
          case MetricTypes.PROCESSING_TIME:
            value = metrics.averageProcessingTime;
            break;
          default:
            throw new Error(`Invalid metric type: ${metric}`);
        }

        return {
          period: range.label,
          startDate: range.start,
          endDate: range.end,
          value,
          metrics
        };
      })
    );

    // Calculate trend statistics
    const values = trendData.map(d => d.value);
    const totalValue = values.reduce((sum, val) => sum + val, 0);
    const averageValue = values.length > 0 ? totalValue / values.length : 0;
    
    // Calculate growth rate (comparing first and last periods)
    let growthRate = 0;
    if (values.length >= 2 && values[0] !== 0) {
      growthRate = ((values[values.length - 1] - values[0]) / values[0]) * 100;
    }

    // Find peak and low points
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const maxPeriod = trendData.find(d => d.value === maxValue);
    const minPeriod = trendData.find(d => d.value === minValue);

    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    return {
      metric,
      period,
      dateRange: { startDate, endDate },
      data: trendData,
      statistics: {
        totalValue,
        averageValue,
        growthRate,
        volatility,
        maxValue,
        minValue,
        maxPeriod: maxPeriod?.period,
        minPeriod: minPeriod?.period,
        dataPoints: values.length
      },
      filters,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Error generating trend analysis:', error);
    throw error;
  }
}

/**
 * Generate comprehensive dashboard analytics
 */
async function generateDashboardAnalytics(startDate, endDate, period = TimePeriods.DAILY, filters = {}) {
  try {
    console.log('📈 Generating comprehensive dashboard analytics...');

    // Generate trends for all key metrics
    const [
      transactionTrend,
      revenueTrend,
      successRateTrend,
      averageAmountTrend,
      processingTimeTrend
    ] = await Promise.all([
      generateTrendAnalysis(startDate, endDate, period, MetricTypes.TRANSACTION_COUNT, filters),
      generateTrendAnalysis(startDate, endDate, period, MetricTypes.REVENUE, filters),
      generateTrendAnalysis(startDate, endDate, period, MetricTypes.SUCCESS_RATE, filters),
      generateTrendAnalysis(startDate, endDate, period, MetricTypes.AVERAGE_AMOUNT, filters),
      generateTrendAnalysis(startDate, endDate, period, MetricTypes.PROCESSING_TIME, filters)
    ]);

    // Calculate overall summary metrics
    const overallMetrics = await calculatePeriodMetrics(startDate, endDate, filters);

    // Generate insights and recommendations
    const insights = generateInsights({
      transactionTrend,
      revenueTrend,
      successRateTrend,
      averageAmountTrend,
      processingTimeTrend,
      overallMetrics
    });

    return {
      dateRange: { startDate, endDate },
      period,
      filters,
      overallMetrics,
      trends: {
        transactions: transactionTrend,
        revenue: revenueTrend,
        successRate: successRateTrend,
        averageAmount: averageAmountTrend,
        processingTime: processingTimeTrend
      },
      insights,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Error generating dashboard analytics:', error);
    throw error;
  }
}

/**
 * Generate insights and recommendations based on trend data
 */
function generateInsights(data) {
  const insights = [];
  const recommendations = [];

  // Transaction volume insights
  if (data.transactionTrend.statistics.growthRate > 20) {
    insights.push({
      type: 'positive',
      category: 'volume',
      message: `Transaction volume has grown by ${data.transactionTrend.statistics.growthRate.toFixed(1)}% over the period`,
      impact: 'high'
    });
  } else if (data.transactionTrend.statistics.growthRate < -10) {
    insights.push({
      type: 'warning',
      category: 'volume',
      message: `Transaction volume has declined by ${Math.abs(data.transactionTrend.statistics.growthRate).toFixed(1)}% over the period`,
      impact: 'high'
    });
    recommendations.push({
      category: 'volume',
      message: 'Consider investigating factors causing transaction volume decline',
      priority: 'high'
    });
  }

  // Success rate insights
  if (data.successRateTrend.statistics.averageValue < 90) {
    insights.push({
      type: 'warning',
      category: 'success_rate',
      message: `Average success rate is ${data.successRateTrend.statistics.averageValue.toFixed(1)}%, below the 95% target`,
      impact: 'high'
    });
    recommendations.push({
      category: 'success_rate',
      message: 'Review failed payment patterns and improve error handling',
      priority: 'high'
    });
  }

  // Processing time insights
  if (data.processingTimeTrend.statistics.averageValue > 60) {
    insights.push({
      type: 'warning',
      category: 'performance',
      message: `Average processing time is ${data.processingTimeTrend.statistics.averageValue.toFixed(1)} seconds, above the 60-second target`,
      impact: 'medium'
    });
    recommendations.push({
      category: 'performance',
      message: 'Optimize payment processing pipeline to reduce transaction times',
      priority: 'medium'
    });
  }

  // Revenue insights
  if (data.revenueTrend.statistics.growthRate > 15) {
    insights.push({
      type: 'positive',
      category: 'revenue',
      message: `Revenue has grown by ${data.revenueTrend.statistics.growthRate.toFixed(1)}% over the period`,
      impact: 'high'
    });
  }

  // Volatility insights
  if (data.transactionTrend.statistics.volatility > data.transactionTrend.statistics.averageValue * 0.5) {
    insights.push({
      type: 'info',
      category: 'volatility',
      message: 'High volatility detected in transaction patterns',
      impact: 'medium'
    });
    recommendations.push({
      category: 'volatility',
      message: 'Analyze seasonal patterns and implement predictive capacity planning',
      priority: 'low'
    });
  }

  return {
    insights,
    recommendations,
    summary: {
      totalInsights: insights.length,
      highImpactInsights: insights.filter(i => i.impact === 'high').length,
      totalRecommendations: recommendations.length,
      highPriorityRecommendations: recommendations.filter(r => r.priority === 'high').length
    }
  };
}

/**
 * Generate comparative analysis between two time periods
 */
async function generateComparativeAnalysis(period1Start, period1End, period2Start, period2End, filters = {}) {
  try {
    console.log('🔄 Generating comparative analysis...');

    const [period1Metrics, period2Metrics] = await Promise.all([
      calculatePeriodMetrics(period1Start, period1End, filters),
      calculatePeriodMetrics(period2Start, period2End, filters)
    ]);

    // Calculate percentage changes
    const changes = {
      totalTransactions: calculatePercentageChange(period1Metrics.totalTransactions, period2Metrics.totalTransactions),
      successfulTransactions: calculatePercentageChange(period1Metrics.successfulTransactions, period2Metrics.successfulTransactions),
      totalRevenue: calculatePercentageChange(period1Metrics.totalRevenue, period2Metrics.totalRevenue),
      averageAmount: calculatePercentageChange(period1Metrics.averageAmount, period2Metrics.averageAmount),
      successRate: calculatePercentageChange(period1Metrics.successRate, period2Metrics.successRate),
      averageProcessingTime: calculatePercentageChange(period1Metrics.averageProcessingTime, period2Metrics.averageProcessingTime)
    };

    return {
      period1: {
        dateRange: { startDate: period1Start, endDate: period1End },
        metrics: period1Metrics
      },
      period2: {
        dateRange: { startDate: period2Start, endDate: period2End },
        metrics: period2Metrics
      },
      changes,
      filters,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Error generating comparative analysis:', error);
    throw error;
  }
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) {
    return newValue > 0 ? 100 : 0;
  }
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Export trend data to CSV format
 */
function exportTrendDataToCSV(trendAnalysis) {
  const { metric, data, statistics } = trendAnalysis;
  
  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // CSV header
  const headers = [
    'Period',
    'Start Date',
    'End Date',
    metric.charAt(0).toUpperCase() + metric.slice(1).replace('_', ' '),
    'Total Transactions',
    'Successful Transactions',
    'Failed Transactions',
    'Total Revenue (KES)',
    'Success Rate (%)',
    'Average Processing Time (s)'
  ];

  // CSV rows
  const rows = data.map(item => [
    escapeCSV(item.period),
    escapeCSV(new Date(item.startDate).toISOString().split('T')[0]),
    escapeCSV(new Date(item.endDate).toISOString().split('T')[0]),
    escapeCSV(item.value.toFixed(2)),
    escapeCSV(item.metrics.totalTransactions),
    escapeCSV(item.metrics.successfulTransactions),
    escapeCSV(item.metrics.failedTransactions),
    escapeCSV(item.metrics.totalRevenue.toFixed(2)),
    escapeCSV(item.metrics.successRate.toFixed(2)),
    escapeCSV(item.metrics.averageProcessingTime.toFixed(2))
  ]);

  // Add summary section
  const summaryRows = [
    ['TREND ANALYSIS SUMMARY'],
    ['Metric', metric],
    ['Date Range', `${new Date(trendAnalysis.dateRange.startDate).toISOString().split('T')[0]} to ${new Date(trendAnalysis.dateRange.endDate).toISOString().split('T')[0]}`],
    ['Period', trendAnalysis.period],
    ['Total Value', statistics.totalValue.toFixed(2)],
    ['Average Value', statistics.averageValue.toFixed(2)],
    ['Growth Rate (%)', statistics.growthRate.toFixed(2)],
    ['Max Value', statistics.maxValue.toFixed(2)],
    ['Min Value', statistics.minValue.toFixed(2)],
    ['Volatility', statistics.volatility.toFixed(2)],
    ['Data Points', statistics.dataPoints],
    ['Generated At', new Date().toISOString()],
    [''], // Empty row separator
    ['DETAILED DATA']
  ];

  // Combine into CSV
  const csvContent = [
    ...summaryRows.map(row => row.map(escapeCSV).join(',')),
    '', // Empty row
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

module.exports = {
  TimePeriods,
  MetricTypes,
  generateTrendAnalysis,
  generateDashboardAnalytics,
  generateComparativeAnalysis,
  calculatePeriodMetrics,
  exportTrendDataToCSV,
  generateInsights
};