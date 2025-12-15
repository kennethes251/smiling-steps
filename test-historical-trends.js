/**
 * Test Historical Trends Analysis
 * Tests the trend analysis functionality for M-Pesa payments
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'https://smiling-steps.onrender.com';
const ADMIN_EMAIL = 'admin@smilingsteps.co.ke';
const ADMIN_PASSWORD = 'admin123';

let adminToken = null;

/**
 * Authenticate as admin
 */
async function authenticateAdmin() {
  try {
    console.log('🔐 Authenticating as admin...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    adminToken = response.data.token;
    console.log('✅ Admin authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test trend configuration endpoint
 */
async function testTrendConfig() {
  try {
    console.log('\n📋 Testing trend configuration...');
    
    const response = await axios.get(`${BASE_URL}/api/trends/config`, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Trend configuration retrieved successfully');
    console.log('Available time periods:', response.data.config.timePeriods);
    console.log('Available metrics:', response.data.config.metricTypes);
    
    return response.data.config;
  } catch (error) {
    console.error('❌ Failed to get trend configuration:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test dashboard analytics endpoint
 */
async function testDashboardAnalytics() {
  try {
    console.log('\n📊 Testing dashboard analytics...');
    
    // Get last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(`${BASE_URL}/api/trends/analytics`, {
      headers: { 'x-auth-token': adminToken },
      params: {
        startDate,
        endDate,
        period: 'daily'
      }
    });

    console.log('✅ Dashboard analytics retrieved successfully');
    console.log('Date range:', `${startDate} to ${endDate}`);
    console.log('Overall metrics:', {
      totalTransactions: response.data.analytics.overallMetrics.totalTransactions,
      totalRevenue: response.data.analytics.overallMetrics.totalRevenue,
      successRate: response.data.analytics.overallMetrics.successRate.toFixed(2) + '%',
      averageProcessingTime: response.data.analytics.overallMetrics.averageProcessingTime.toFixed(2) + 's'
    });
    
    if (response.data.analytics.insights) {
      console.log('Insights generated:', response.data.analytics.insights.summary);
    }
    
    return response.data.analytics;
  } catch (error) {
    console.error('❌ Failed to get dashboard analytics:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test specific metric trend analysis
 */
async function testMetricTrend(metric) {
  try {
    console.log(`\n📈 Testing ${metric} trend analysis...`);
    
    // Get last 7 days for detailed view
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(`${BASE_URL}/api/trends/metric/${metric}`, {
      headers: { 'x-auth-token': adminToken },
      params: {
        startDate,
        endDate,
        period: 'daily'
      }
    });

    console.log(`✅ ${metric} trend analysis retrieved successfully`);
    console.log('Statistics:', {
      averageValue: response.data.trendAnalysis.statistics.averageValue.toFixed(2),
      growthRate: response.data.trendAnalysis.statistics.growthRate.toFixed(2) + '%',
      maxValue: response.data.trendAnalysis.statistics.maxValue.toFixed(2),
      minValue: response.data.trendAnalysis.statistics.minValue.toFixed(2),
      dataPoints: response.data.trendAnalysis.statistics.dataPoints
    });
    
    return response.data.trendAnalysis;
  } catch (error) {
    console.error(`❌ Failed to get ${metric} trend analysis:`, error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test comparative analysis
 */
async function testComparativeAnalysis() {
  try {
    console.log('\n🔄 Testing comparative analysis...');
    
    // Compare last week vs previous week
    const period2End = new Date().toISOString().split('T')[0];
    const period2Start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const period1End = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const period1Start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(`${BASE_URL}/api/trends/compare`, {
      headers: { 'x-auth-token': adminToken },
      params: {
        period1Start,
        period1End,
        period2Start,
        period2End
      }
    });

    console.log('✅ Comparative analysis retrieved successfully');
    console.log('Period 1 (Previous Week):', {
      transactions: response.data.comparison.period1.metrics.totalTransactions,
      revenue: response.data.comparison.period1.metrics.totalRevenue.toFixed(2)
    });
    console.log('Period 2 (Last Week):', {
      transactions: response.data.comparison.period2.metrics.totalTransactions,
      revenue: response.data.comparison.period2.metrics.totalRevenue.toFixed(2)
    });
    console.log('Changes:', {
      transactions: response.data.comparison.changes.totalTransactions.toFixed(2) + '%',
      revenue: response.data.comparison.changes.totalRevenue.toFixed(2) + '%'
    });
    
    return response.data.comparison;
  } catch (error) {
    console.error('❌ Failed to get comparative analysis:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test CSV export functionality
 */
async function testCSVExport(metric) {
  try {
    console.log(`\n📄 Testing CSV export for ${metric}...`);
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(`${BASE_URL}/api/trends/export/${metric}`, {
      headers: { 'x-auth-token': adminToken },
      params: {
        startDate,
        endDate,
        period: 'daily'
      },
      responseType: 'text'
    });

    console.log(`✅ CSV export for ${metric} successful`);
    console.log('CSV preview (first 200 chars):', response.data.substring(0, 200) + '...');
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to export CSV for ${metric}:`, error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  try {
    console.log('\n🚨 Testing error handling...');
    
    // Test invalid date range
    try {
      await axios.get(`${BASE_URL}/api/trends/analytics`, {
        headers: { 'x-auth-token': adminToken },
        params: {
          startDate: '2024-12-15',
          endDate: '2024-12-10', // End before start
          period: 'daily'
        }
      });
      console.log('❌ Should have failed with invalid date range');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid date range');
      } else {
        console.log('❌ Unexpected error for invalid date range:', error.message);
      }
    }
    
    // Test invalid metric
    try {
      await axios.get(`${BASE_URL}/api/trends/metric/invalid_metric`, {
        headers: { 'x-auth-token': adminToken },
        params: {
          startDate: '2024-12-01',
          endDate: '2024-12-15',
          period: 'daily'
        }
      });
      console.log('❌ Should have failed with invalid metric');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid metric');
      } else {
        console.log('❌ Unexpected error for invalid metric:', error.message);
      }
    }
    
    // Test unauthorized access
    try {
      await axios.get(`${BASE_URL}/api/trends/analytics`, {
        headers: { 'x-auth-token': 'invalid_token' },
        params: {
          startDate: '2024-12-01',
          endDate: '2024-12-15',
          period: 'daily'
        }
      });
      console.log('❌ Should have failed with unauthorized access');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ Correctly rejected unauthorized access');
      } else {
        console.log('❌ Unexpected error for unauthorized access:', error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing error handling:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting Historical Trends Analysis Tests\n');
  console.log('='.repeat(50));
  
  // Authenticate
  const authSuccess = await authenticateAdmin();
  if (!authSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Test configuration
  const config = await testTrendConfig();
  if (!config) {
    console.log('\n❌ Cannot proceed without configuration');
    return;
  }
  
  // Test dashboard analytics
  const analytics = await testDashboardAnalytics();
  
  // Test individual metric trends
  const metrics = ['transaction_count', 'revenue', 'success_rate', 'processing_time'];
  for (const metric of metrics) {
    await testMetricTrend(metric);
  }
  
  // Test comparative analysis
  await testComparativeAnalysis();
  
  // Test CSV exports
  for (const metric of metrics.slice(0, 2)) { // Test first 2 metrics
    await testCSVExport(metric);
  }
  
  // Test error handling
  await testErrorHandling();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Historical Trends Analysis Tests Complete!');
  
  if (analytics) {
    console.log('\n📊 Summary:');
    console.log(`- Total transactions analyzed: ${analytics.overallMetrics.totalTransactions}`);
    console.log(`- Total revenue: KES ${analytics.overallMetrics.totalRevenue.toLocaleString()}`);
    console.log(`- Success rate: ${analytics.overallMetrics.successRate.toFixed(2)}%`);
    console.log(`- Insights generated: ${analytics.insights?.summary?.totalInsights || 0}`);
    console.log(`- Recommendations: ${analytics.insights?.summary?.totalRecommendations || 0}`);
  }
}

// Run tests
runTests().catch(console.error);