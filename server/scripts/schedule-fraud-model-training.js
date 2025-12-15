/**
 * Scheduled Fraud Model Training
 * Implements weekly model retraining as per Requirements 17.1
 */

const cron = require('node-cron');
const fraudModelTrainer = require('../services/fraudModelTrainer');
const { AuditLog } = require('../models');

class FraudModelScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the scheduled model training
   * Requirement 17.1: Retrain model weekly using latest 90 days of data
   */
  start() {
    console.log('🤖 Starting fraud model training scheduler...');
    
    // Schedule weekly training every Sunday at 2 AM EAT
    cron.schedule('0 2 * * 0', async () => {
      if (this.isRunning) {
        console.log('⚠️ Model training already in progress, skipping...');
        return;
      }

      this.isRunning = true;
      
      try {
        console.log('🚀 Starting scheduled fraud model retraining...');
        
        await AuditLog.create({
          action: 'FRAUD_MODEL_TRAINING_STARTED',
          userId: 'system',
          details: {
            scheduledTraining: true,
            startTime: new Date()
          }
        });

        await fraudModelTrainer.retrainModel();
        
        await AuditLog.create({
          action: 'FRAUD_MODEL_TRAINING_COMPLETED',
          userId: 'system',
          details: {
            scheduledTraining: true,
            completedTime: new Date()
          }
        });

        console.log('✅ Scheduled fraud model retraining completed');
        
      } catch (error) {
        console.error('❌ Scheduled fraud model retraining failed:', error);
        
        await AuditLog.create({
          action: 'FRAUD_MODEL_TRAINING_FAILED',
          userId: 'system',
          details: {
            scheduledTraining: true,
            error: error.message,
            failedTime: new Date()
          }
        });
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: 'Africa/Nairobi'
    });

    console.log('✅ Fraud model training scheduler started (Sundays at 2 AM EAT)');
  }

  /**
   * Manually trigger model retraining
   */
  async triggerManualTraining() {
    if (this.isRunning) {
      throw new Error('Model training already in progress');
    }

    this.isRunning = true;
    
    try {
      console.log('🚀 Starting manual fraud model retraining...');
      
      await AuditLog.create({
        action: 'FRAUD_MODEL_TRAINING_STARTED',
        userId: 'system',
        details: {
          manualTrigger: true,
          startTime: new Date()
        }
      });

      await fraudModelTrainer.retrainModel();
      
      await AuditLog.create({
        action: 'FRAUD_MODEL_TRAINING_COMPLETED',
        userId: 'system',
        details: {
          manualTrigger: true,
          completedTime: new Date()
        }
      });

      console.log('✅ Manual fraud model retraining completed');
      
    } catch (error) {
      console.error('❌ Manual fraud model retraining failed:', error);
      
      await AuditLog.create({
        action: 'FRAUD_MODEL_TRAINING_FAILED',
        userId: 'system',
        details: {
          manualTrigger: true,
          error: error.message,
          failedTime: new Date()
        }
      });
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new FraudModelScheduler();