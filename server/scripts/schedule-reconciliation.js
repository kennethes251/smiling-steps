/**
 * Scheduled Payment Reconciliation Script
 * Runs daily at 11 PM EAT to reconcile payments
 */

const cron = require('node-cron');
const { performDailyReconciliation } = require('../utils/paymentReconciliation');

/**
 * Schedule daily reconciliation at 11 PM EAT (8 PM UTC)
 * Cron format: minute hour day month weekday
 */
function scheduleReconciliation() {
  // Run at 11 PM EAT (20:00 UTC) every day
  const cronExpression = '0 20 * * *';

  console.log('📅 Scheduling daily payment reconciliation at 11 PM EAT...');

  const task = cron.schedule(cronExpression, async () => {
    console.log('🕐 Starting scheduled reconciliation...');
    
    try {
      const results = await performDailyReconciliation();
      
      console.log('✅ Scheduled reconciliation completed:', {
        matched: results.summary.matched,
        discrepancies: results.summary.discrepancies,
        unmatched: results.summary.unmatched
      });

      // Send alert if there are issues
      if (results.summary.discrepancies > 0 || results.summary.unmatched > 0) {
        console.warn('⚠️ Reconciliation issues detected - admin review required');
        // TODO: Send email/SMS alert to admin
      }

    } catch (error) {
      console.error('❌ Scheduled reconciliation failed:', error);
      // TODO: Send error alert to admin
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Nairobi'
  });

  console.log('✅ Reconciliation scheduler started');

  return task;
}

/**
 * Run reconciliation immediately (for testing)
 */
async function runNow() {
  console.log('🚀 Running reconciliation immediately...');
  
  try {
    const results = await performDailyReconciliation();
    console.log('✅ Reconciliation completed:', results.summary);
    return results;
  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    throw error;
  }
}

// If run directly, execute immediately
if (require.main === module) {
  runNow()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = {
  scheduleReconciliation,
  runNow
};
