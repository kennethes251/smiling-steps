/**
 * Test script for Accounting Software Integration
 * 
 * Tests the accounting export functionality and API endpoints
 */

const axios = require('axios');
const moment = require('moment');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smilingsteps.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let authToken = '';

/**
 * Authenticate as admin
 */
async function authenticate() {
  try {
    console.log('🔐 Authenticating as admin...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ Admin authentication successful');
      return true;
    } else {
      console.error('❌ Authentication failed - no token received');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test getting supported accounting formats
 */
async function testGetFormats() {
  try {
    console.log('\n📋 Testing supported formats endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/accounting/formats`, {
      headers: { 'x-auth-token': authToken }
    });
    
    if (response.data.success) {
      console.log('✅ Formats retrieved successfully');
      console.log('📊 Supported formats:', response.data.formats.map(f => f.name).join(', '));
      console.log('🏦 Chart of accounts:', Object.keys(response.data.chartOfAccounts).join(', '));
      return response.data;
    } else {
      console.error('❌ Failed to get formats');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting formats:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test accounting summary
 */
async function testAccountingSummary() {
  try {
    console.log('\n📈 Testing accounting summary endpoint...');
    
    const startDate = moment().startOf('month').format('YYYY-MM-DD');
    const endDate = moment().endOf('month').format('YYYY-MM-DD');
    
    const response = await axios.get(`${BASE_URL}/api/accounting/summary`, {
      headers: { 'x-auth-token': authToken },
      params: { startDate, endDate }
    });
    
    if (response.data.success) {
      console.log('✅ Summary retrieved successfully');
      const summary = response.data.summary;
      console.log(`💰 Total Revenue: KES ${summary.totalRevenue}`);
      console.log(`💳 Processing Fees: KES ${summary.processingFees}`);
      console.log(`💵 Net Revenue: KES ${summary.netRevenue}`);
      console.log(`📊 Total Transactions: ${summary.totalTransactions}`);
      console.log(`📈 Average Transaction: KES ${summary.averageTransactionValue}`);
      return summary;
    } else {
      console.error('❌ Failed to get summary');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting summary:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test journal entries generation
 */
async function testJournalEntries() {
  try {
    console.log('\n📚 Testing journal entries endpoint...');
    
    const startDate = moment().startOf('month').format('YYYY-MM-DD');
    const endDate = moment().endOf('month').format('YYYY-MM-DD');
    
    const response = await axios.get(`${BASE_URL}/api/accounting/journal-entries`, {
      headers: { 'x-auth-token': authToken },
      params: { startDate, endDate }
    });
    
    if (response.data.success) {
      console.log('✅ Journal entries generated successfully');
      const summary = response.data.summary;
      console.log(`📖 Total Entries: ${summary.totalEntries}`);
      console.log(`💰 Total Debits: KES ${summary.totalDebits}`);
      console.log(`💰 Total Credits: KES ${summary.totalCredits}`);
      console.log(`⚖️ Balanced: ${summary.balanced ? 'Yes' : 'No'}`);
      
      if (response.data.journalEntries.length > 0) {
        const firstEntry = response.data.journalEntries[0];
        console.log(`📝 Sample Entry: ${firstEntry.date} - ${firstEntry.description}`);
      }
      
      return response.data;
    } else {
      console.error('❌ Failed to generate journal entries');
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating journal entries:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test export functionality for each format
 */
async function testExports(formats) {
  console.log('\n📤 Testing export functionality...');
  
  const startDate = moment().startOf('month').format('YYYY-MM-DD');
  const endDate = moment().endOf('month').format('YYYY-MM-DD');
  
  for (const format of formats) {
    try {
      console.log(`\n📋 Testing ${format.name} export...`);
      
      const response = await axios.get(`${BASE_URL}/api/accounting/export`, {
        headers: { 'x-auth-token': authToken },
        params: {
          format: format.key,
          startDate,
          endDate,
          includeRefunds: 'false'
        },
        responseType: 'text'
      });
      
      if (response.data && response.data.length > 0) {
        console.log(`✅ ${format.name} export successful`);
        console.log(`📄 Content length: ${response.data.length} characters`);
        
        // Show first few lines of export
        const lines = response.data.split('\n').slice(0, 3);
        console.log('📝 Sample content:');
        lines.forEach((line, index) => {
          if (line.trim()) {
            console.log(`   ${index + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
          }
        });
      } else {
        console.log(`⚠️ ${format.name} export returned empty content`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${format.name} export:`, error.response?.data?.message || error.message);
    }
  }
}

/**
 * Test scheduling functionality
 */
async function testScheduling() {
  try {
    console.log('\n⏰ Testing export scheduling...');
    
    const scheduleData = {
      format: 'generic',
      frequency: 'monthly',
      dayOfMonth: 1,
      email: 'admin@smilingsteps.com',
      enabled: true
    };
    
    const response = await axios.post(`${BASE_URL}/api/accounting/schedule-export`, scheduleData, {
      headers: { 'x-auth-token': authToken }
    });
    
    if (response.data.success) {
      console.log('✅ Export scheduling successful');
      console.log('📅 Schedule created:', response.data.schedule?.id || 'ID not returned');
      return response.data;
    } else {
      console.error('❌ Failed to schedule export');
      return null;
    }
  } catch (error) {
    console.error('❌ Error scheduling export:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🚨 Testing error handling...');
  
  // Test invalid date range
  try {
    await axios.get(`${BASE_URL}/api/accounting/export`, {
      headers: { 'x-auth-token': authToken },
      params: {
        format: 'generic',
        startDate: '2024-12-31',
        endDate: '2024-01-01' // End before start
      }
    });
    console.log('❌ Should have failed with invalid date range');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected invalid date range');
    } else {
      console.log('⚠️ Unexpected error for invalid date range');
    }
  }
  
  // Test missing dates
  try {
    await axios.get(`${BASE_URL}/api/accounting/export`, {
      headers: { 'x-auth-token': authToken },
      params: { format: 'generic' } // Missing dates
    });
    console.log('❌ Should have failed with missing dates');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected missing dates');
    } else {
      console.log('⚠️ Unexpected error for missing dates');
    }
  }
  
  // Test invalid format
  try {
    await axios.get(`${BASE_URL}/api/accounting/export`, {
      headers: { 'x-auth-token': authToken },
      params: {
        format: 'invalid-format',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });
    console.log('✅ Invalid format handled gracefully (defaults to generic)');
  } catch (error) {
    console.log('⚠️ Unexpected error for invalid format');
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting Accounting Integration Tests');
  console.log('=====================================');
  
  // Authenticate
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Test all endpoints
  const formatsData = await testGetFormats();
  await testAccountingSummary();
  await testJournalEntries();
  
  if (formatsData?.formats) {
    await testExports(formatsData.formats);
  }
  
  await testScheduling();
  await testErrorHandling();
  
  console.log('\n🎉 Accounting Integration Tests Complete');
  console.log('=======================================');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  authenticate,
  testGetFormats,
  testAccountingSummary,
  testJournalEntries,
  testExports,
  testScheduling,
  testErrorHandling
};