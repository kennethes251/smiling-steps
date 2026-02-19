#!/usr/bin/env node

/**
 * Database Optimization Script
 * 
 * Creates optimized indexes and verifies query performance
 * Run with: node server/scripts/optimize-database.js
 * 
 * Requirements: 8.5, 13.4
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { 
  createAllIndexes, 
  runPerformanceTests, 
  getAllIndexStats 
} = require('../utils/databaseOptimization');

async function main() {
  console.log('🚀 Database Optimization Script');
  console.log('================================\n');
  
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';
  
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Create indexes
    console.log('📋 Step 1: Creating optimized indexes...');
    console.log('----------------------------------------');
    const indexResults = await createAllIndexes();
    console.log('\n');
    
    // Step 2: Get index statistics
    console.log('📊 Step 2: Index Statistics');
    console.log('---------------------------');
    const stats = await getAllIndexStats();
    
    for (const [collection, collectionStats] of Object.entries(stats)) {
      if (collectionStats.error) {
        console.log(`  ${collection}: Error - ${collectionStats.error}`);
      } else {
        console.log(`  ${collection}:`);
        console.log(`    - Documents: ${collectionStats.documentCount || 0}`);
        console.log(`    - Indexes: ${collectionStats.indexCount}`);
        console.log(`    - Index Size: ${formatBytes(collectionStats.totalIndexSize || 0)}`);
      }
    }
    console.log('\n');
    
    // Step 3: Run performance tests
    console.log('🧪 Step 3: Performance Verification');
    console.log('------------------------------------');
    const perfResults = await runPerformanceTests();
    console.log('\n');
    
    // Summary
    console.log('📈 Summary');
    console.log('----------');
    console.log(`  Indexes Created: ${indexResults.summary.totalCreated}`);
    console.log(`  Indexes Existing: ${indexResults.summary.totalExisting}`);
    console.log(`  Index Errors: ${indexResults.summary.totalErrors}`);
    console.log(`  Performance Tests Passed: ${perfResults.passed}/${perfResults.tests.length}`);
    console.log(`  Overall Status: ${indexResults.success && perfResults.failed === 0 ? '✅ SUCCESS' : '⚠️ NEEDS ATTENTION'}`);
    
    // Detailed performance results
    if (perfResults.tests.some(t => !t.success)) {
      console.log('\n⚠️ Performance Issues Detected:');
      for (const test of perfResults.tests.filter(t => !t.success)) {
        console.log(`  - ${test.testName}: ${test.executionTimeMs || 'N/A'}ms (threshold: ${test.threshold}ms)`);
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the script
main().catch(console.error);
