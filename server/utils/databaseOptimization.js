/**
 * Database Optimization Utility
 * 
 * Implements Requirements 8.5, 13.4 from teletherapy-booking-enhancement
 * - Index session queries by client, therapist, date
 * - Index payment status queries
 * - Index audit log queries by date and user
 * - Verify 2-second query performance
 * 
 * @module utils/databaseOptimization
 */

const mongoose = require('mongoose');

/**
 * Index definitions for all collections
 * These indexes optimize the most common query patterns
 */
const INDEX_DEFINITIONS = {
  sessions: [
    // Primary session lookup indexes
    { fields: { client: 1, sessionDate: -1 }, options: { name: 'idx_client_date' } },
    { fields: { psychologist: 1, sessionDate: -1 }, options: { name: 'idx_psychologist_date' } },
    { fields: { sessionDate: -1 }, options: { name: 'idx_session_date_desc' } },
    
    // Status-based queries
    { fields: { status: 1, sessionDate: -1 }, options: { name: 'idx_status_date' } },
    { fields: { client: 1, status: 1, sessionDate: -1 }, options: { name: 'idx_client_status_date' } },
    { fields: { psychologist: 1, status: 1, sessionDate: -1 }, options: { name: 'idx_psychologist_status_date' } },
    
    // Payment status queries
    { fields: { paymentStatus: 1, sessionDate: -1 }, options: { name: 'idx_payment_status_date' } },
    { fields: { client: 1, paymentStatus: 1 }, options: { name: 'idx_client_payment_status' } },
    { fields: { psychologist: 1, paymentStatus: 1 }, options: { name: 'idx_psychologist_payment_status' } },
    
    // Session type queries
    { fields: { sessionType: 1, sessionDate: -1 }, options: { name: 'idx_session_type_date' } },
    
    // Reminder system queries
    { fields: { reminder24HourSent: 1, sessionDate: 1, status: 1 }, options: { name: 'idx_reminder_24h' } },
    { fields: { reminder1HourSent: 1, sessionDate: 1, status: 1 }, options: { name: 'idx_reminder_1h' } },
    
    // Cancellation and refund queries
    { fields: { refundStatus: 1, cancellationRequestedAt: -1 }, options: { name: 'idx_refund_status_cancel_date' } },
    
    // Rescheduling queries
    { fields: { rescheduleStatus: 1, rescheduleRequestedAt: -1 }, options: { name: 'idx_reschedule_status_date' } },
    
    // Text search index for booking reference
    { fields: { bookingReference: 'text' }, options: { name: 'idx_booking_reference_text' } }
  ],
  
  auditlogs: [
    // Primary audit log queries
    { fields: { timestamp: -1 }, options: { name: 'idx_timestamp_desc' } },
    { fields: { userId: 1, timestamp: -1 }, options: { name: 'idx_user_timestamp' } },
    { fields: { adminId: 1, timestamp: -1 }, options: { name: 'idx_admin_timestamp' } },
    
    // Action type queries
    { fields: { actionType: 1, timestamp: -1 }, options: { name: 'idx_action_type_timestamp' } },
    { fields: { actionType: 1, userId: 1, timestamp: -1 }, options: { name: 'idx_action_user_timestamp' } },
    
    // Session-related audit queries
    { fields: { sessionId: 1, timestamp: -1 }, options: { name: 'idx_session_audit_timestamp' } },
    
    // Target entity queries
    { fields: { targetType: 1, targetId: 1, timestamp: -1 }, options: { name: 'idx_target_timestamp' } },
    
    // Transaction queries
    { fields: { transactionID: 1 }, options: { name: 'idx_transaction_id', sparse: true } },
    
    // Date range queries (compound for efficient range scans)
    { fields: { timestamp: 1, actionType: 1 }, options: { name: 'idx_timestamp_action_asc' } }
  ],
  
  users: [
    // Role-based queries
    { fields: { role: 1, status: 1 }, options: { name: 'idx_role_status' } },
    { fields: { role: 1, approvalStatus: 1 }, options: { name: 'idx_role_approval' } },
    
    // Psychologist queries
    { fields: { role: 1, 'psychologistDetails.approvalStatus': 1 }, options: { name: 'idx_psychologist_approval' } },
    
    // Search queries
    { fields: { name: 'text', email: 'text' }, options: { name: 'idx_user_search_text' } },
    
    // Last login queries
    { fields: { lastLogin: -1 }, options: { name: 'idx_last_login' } }
  ],
  
  intakeforms: [
    // Client and session lookups
    { fields: { client: 1, createdAt: -1 }, options: { name: 'idx_client_created' } },
    { fields: { session: 1 }, options: { name: 'idx_session' } },
    { fields: { isComplete: 1, createdAt: -1 }, options: { name: 'idx_complete_created' } }
  ],
  
  availabilitywindows: [
    // Therapist availability lookups
    { fields: { therapist: 1, isActive: 1, dayOfWeek: 1 }, options: { name: 'idx_therapist_active_day' } },
    { fields: { therapist: 1, isActive: 1, specificDate: 1 }, options: { name: 'idx_therapist_active_date' } },
    { fields: { therapist: 1, windowType: 1, isActive: 1 }, options: { name: 'idx_therapist_type_active' } }
  ],
  
  sessionnotes: [
    // Session notes queries
    { fields: { session: 1, createdAt: -1 }, options: { name: 'idx_session_created' } },
    { fields: { author: 1, createdAt: -1 }, options: { name: 'idx_author_created' } },
    { fields: { session: 1, isLatest: 1 }, options: { name: 'idx_session_latest' } }
  ],
  
  sessionrates: [
    // Rate lookups
    { fields: { therapist: 1, sessionType: 1, effectiveFrom: -1 }, options: { name: 'idx_therapist_type_effective' } },
    { fields: { therapist: 1, isActive: 1 }, options: { name: 'idx_therapist_active' } }
  ]
};

/**
 * Create indexes for a specific collection
 * @param {string} collectionName - Name of the collection
 * @param {Array} indexes - Array of index definitions
 * @returns {Promise<Object>} - Results of index creation
 */
async function createCollectionIndexes(collectionName, indexes) {
  const results = {
    collection: collectionName,
    created: [],
    existing: [],
    errors: []
  };
  
  try {
    const collection = mongoose.connection.collection(collectionName);
    
    // Get existing indexes
    const existingIndexes = await collection.indexes();
    const existingIndexNames = existingIndexes.map(idx => idx.name);
    
    for (const indexDef of indexes) {
      const indexName = indexDef.options?.name || Object.keys(indexDef.fields).join('_');
      
      try {
        // Skip if index already exists
        if (existingIndexNames.includes(indexName)) {
          results.existing.push(indexName);
          continue;
        }
        
        await collection.createIndex(indexDef.fields, indexDef.options || {});
        results.created.push(indexName);
        console.log(`✅ Created index ${indexName} on ${collectionName}`);
      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 85 || error.code === 86) {
          results.existing.push(indexName);
        } else {
          results.errors.push({ index: indexName, error: error.message });
          console.error(`❌ Failed to create index ${indexName} on ${collectionName}:`, error.message);
        }
      }
    }
  } catch (error) {
    results.errors.push({ collection: collectionName, error: error.message });
    console.error(`❌ Failed to process collection ${collectionName}:`, error.message);
  }
  
  return results;
}

/**
 * Create all optimized indexes across all collections
 * @returns {Promise<Object>} - Summary of all index operations
 */
async function createAllIndexes() {
  console.log('🔧 Starting database index optimization...');
  const startTime = Date.now();
  
  const results = {
    success: true,
    collections: {},
    summary: {
      totalCreated: 0,
      totalExisting: 0,
      totalErrors: 0
    }
  };
  
  for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
    const collectionResult = await createCollectionIndexes(collectionName, indexes);
    results.collections[collectionName] = collectionResult;
    
    results.summary.totalCreated += collectionResult.created.length;
    results.summary.totalExisting += collectionResult.existing.length;
    results.summary.totalErrors += collectionResult.errors.length;
  }
  
  results.success = results.summary.totalErrors === 0;
  results.duration = Date.now() - startTime;
  
  console.log(`\n📊 Index optimization complete in ${results.duration}ms`);
  console.log(`   Created: ${results.summary.totalCreated}`);
  console.log(`   Existing: ${results.summary.totalExisting}`);
  console.log(`   Errors: ${results.summary.totalErrors}`);
  
  return results;
}

/**
 * Verify query performance meets the 2-second requirement
 * @param {string} collectionName - Collection to test
 * @param {Object} query - Query to execute
 * @param {Object} options - Query options (sort, limit, etc.)
 * @returns {Promise<Object>} - Performance metrics
 */
async function verifyQueryPerformance(collectionName, query, options = {}) {
  const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds
  
  try {
    const collection = mongoose.connection.collection(collectionName);
    
    const startTime = Date.now();
    
    // Execute query with explain to get execution stats
    let cursor = collection.find(query);
    
    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.limit) cursor = cursor.limit(options.limit);
    if (options.skip) cursor = cursor.skip(options.skip);
    
    const results = await cursor.toArray();
    const executionTime = Date.now() - startTime;
    
    // Get explain plan
    const explainResult = await collection.find(query).explain('executionStats');
    
    return {
      success: executionTime <= PERFORMANCE_THRESHOLD_MS,
      executionTimeMs: executionTime,
      threshold: PERFORMANCE_THRESHOLD_MS,
      documentsReturned: results.length,
      documentsExamined: explainResult.executionStats?.totalDocsExamined || 0,
      indexUsed: explainResult.queryPlanner?.winningPlan?.inputStage?.indexName || 
                 explainResult.queryPlanner?.winningPlan?.stage === 'IXSCAN',
      queryPlan: {
        stage: explainResult.queryPlanner?.winningPlan?.stage,
        indexName: explainResult.queryPlanner?.winningPlan?.inputStage?.indexName
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      threshold: PERFORMANCE_THRESHOLD_MS
    };
  }
}

/**
 * Run performance verification tests on common queries
 * @returns {Promise<Object>} - Performance test results
 */
async function runPerformanceTests() {
  console.log('🧪 Running query performance tests...');
  
  const tests = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  // Test 1: Session queries by client
  tests.push({
    name: 'Sessions by client (sorted by date)',
    collection: 'sessions',
    query: { client: new mongoose.Types.ObjectId() },
    options: { sort: { sessionDate: -1 }, limit: 100 }
  });
  
  // Test 2: Session queries by psychologist
  tests.push({
    name: 'Sessions by psychologist (sorted by date)',
    collection: 'sessions',
    query: { psychologist: new mongoose.Types.ObjectId() },
    options: { sort: { sessionDate: -1 }, limit: 100 }
  });
  
  // Test 3: Sessions by status
  tests.push({
    name: 'Sessions by status',
    collection: 'sessions',
    query: { status: 'Confirmed' },
    options: { sort: { sessionDate: -1 }, limit: 100 }
  });
  
  // Test 4: Payment status queries
  tests.push({
    name: 'Sessions by payment status',
    collection: 'sessions',
    query: { paymentStatus: 'Pending' },
    options: { sort: { sessionDate: -1 }, limit: 100 }
  });
  
  // Test 5: Audit logs by date range (90 days - Requirement 8.5)
  tests.push({
    name: 'Audit logs by date range (90 days)',
    collection: 'auditlogs',
    query: { timestamp: { $gte: ninetyDaysAgo, $lte: now } },
    options: { sort: { timestamp: -1 }, limit: 1000 }
  });
  
  // Test 6: Audit logs by user
  tests.push({
    name: 'Audit logs by user',
    collection: 'auditlogs',
    query: { userId: new mongoose.Types.ObjectId() },
    options: { sort: { timestamp: -1 }, limit: 100 }
  });
  
  // Test 7: Audit logs by action type
  tests.push({
    name: 'Audit logs by action type',
    collection: 'auditlogs',
    query: { actionType: 'SESSION_STATUS_CHANGE' },
    options: { sort: { timestamp: -1 }, limit: 100 }
  });
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  for (const test of tests) {
    const result = await verifyQueryPerformance(test.collection, test.query, test.options);
    result.testName = test.name;
    results.tests.push(result);
    
    if (result.success) {
      results.passed++;
      console.log(`✅ ${test.name}: ${result.executionTimeMs}ms`);
    } else {
      results.failed++;
      console.log(`❌ ${test.name}: ${result.executionTimeMs || 'N/A'}ms (threshold: ${result.threshold}ms)`);
    }
  }
  
  console.log(`\n📊 Performance tests: ${results.passed}/${results.tests.length} passed`);
  
  return results;
}

/**
 * Get index statistics for a collection
 * @param {string} collectionName - Collection name
 * @returns {Promise<Object>} - Index statistics
 */
async function getIndexStats(collectionName) {
  try {
    const collection = mongoose.connection.collection(collectionName);
    const indexes = await collection.indexes();
    const stats = await collection.stats();
    
    return {
      collection: collectionName,
      indexCount: indexes.length,
      indexes: indexes.map(idx => ({
        name: idx.name,
        keys: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false
      })),
      totalIndexSize: stats.totalIndexSize,
      documentCount: stats.count
    };
  } catch (error) {
    return {
      collection: collectionName,
      error: error.message
    };
  }
}

/**
 * Get comprehensive index statistics for all collections
 * @returns {Promise<Object>} - All index statistics
 */
async function getAllIndexStats() {
  const collections = Object.keys(INDEX_DEFINITIONS);
  const stats = {};
  
  for (const collection of collections) {
    stats[collection] = await getIndexStats(collection);
  }
  
  return stats;
}

/**
 * Drop unused or redundant indexes
 * @param {string} collectionName - Collection name
 * @param {Array<string>} indexNames - Names of indexes to drop
 * @returns {Promise<Object>} - Results of drop operations
 */
async function dropIndexes(collectionName, indexNames) {
  const results = {
    dropped: [],
    errors: []
  };
  
  try {
    const collection = mongoose.connection.collection(collectionName);
    
    for (const indexName of indexNames) {
      try {
        // Don't drop the _id index
        if (indexName === '_id_') {
          results.errors.push({ index: indexName, error: 'Cannot drop _id index' });
          continue;
        }
        
        await collection.dropIndex(indexName);
        results.dropped.push(indexName);
        console.log(`🗑️ Dropped index ${indexName} from ${collectionName}`);
      } catch (error) {
        results.errors.push({ index: indexName, error: error.message });
      }
    }
  } catch (error) {
    results.errors.push({ collection: collectionName, error: error.message });
  }
  
  return results;
}

module.exports = {
  INDEX_DEFINITIONS,
  createCollectionIndexes,
  createAllIndexes,
  verifyQueryPerformance,
  runPerformanceTests,
  getIndexStats,
  getAllIndexStats,
  dropIndexes
};
