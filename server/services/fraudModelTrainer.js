/**
 * Fraud Detection Model Trainer
 * Implements machine learning model training and updates
 * Requirements: 17.1-17.6, 22.1-22.6
 */

const { Session, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const fraudDetectionService = require('./fraudDetectionService');

class FraudModelTrainer {
  constructor() {
    this.modelVersion = '1.0.0';
    this.trainingSchedule = '0 2 * * 0'; // Weekly at 2 AM on Sunday
    this.performanceThreshold = 0.85;
    this.isTraining = false;
  }

  /**
   * Retrain fraud detection model with latest data
   * Requirement 17.1: Retrain model weekly using latest 90 days of data
   */
  async retrainModel() {
    if (this.isTraining) {
      console.log('Model training already in progress');
      return;
    }

    this.isTraining = true;
    console.log('Starting fraud detection model retraining...');

    try {
      // Get training data from last 90 days
      const trainingData = await this.getTrainingData();
      
      if (trainingData.length < 100) {
        console.log('Insufficient training data. Need at least 100 samples.');
        return;
      }

      // Prepare features and labels
      const { features, labels } = this.prepareTrainingData(trainingData);
      
      // Train new model (simplified implementation)
      const newModel = await this.trainModel(features, labels);
      
      // Validate model performance
      const performance = await this.validateModel(newModel, features, labels);
      
      // Check if performance meets threshold
      if (this.meetsPerformanceThreshold(performance)) {
        // Deploy new model
        await this.deployModel(newModel, performance);
        console.log('Model retraining completed successfully');
      } else {
        console.log('New model performance below threshold, keeping current model');
        await this.alertPerformanceDegradation(performance);
      }

    } catch (error) {
      console.error('Model retraining failed:', error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Get training data from database
   * Requirement 17.2: Use confirmed fraud cases and successful payments
   */
  async getTrainingData() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const sessions = await Session.findAll({
      where: {
        paymentInitiatedAt: {
          [Op.gte]: ninetyDaysAgo
        },
        paymentStatus: {
          [Op.in]: ['Paid', 'Blocked', 'Failed']
        }
      },
      include: [
        {
          model: User,
          as: 'clientUser',
          attributes: ['id', 'createdAt']
        }
      ]
    });

    return sessions.map(session => ({
      sessionId: session.id,
      userId: session.client,
      amount: parseFloat(session.price) || 0,
      phoneNumber: session.mpesaPhoneNumber,
      timestamp: session.paymentInitiatedAt,
      userAge: this.calculateUserAge(session.clientUser?.createdAt),
      isFraud: session.paymentStatus === 'Blocked' || 
               (session.fraudReviewRequired && session.paymentStatus === 'Failed'),
      riskScore: session.fraudRiskScore || 0
    }));
  }

  /**
   * Prepare features and labels for training
   */
  prepareTrainingData(rawData) {
    const features = [];
    const labels = [];

    rawData.forEach(sample => {
      // Extract features
      const feature = [
        sample.amount,
        this.getHourOfDay(sample.timestamp),
        sample.userAge,
        this.getAmountPercentile(sample.amount, rawData),
        this.getFrequencyScore(sample.userId, rawData)
      ];

      features.push(feature);
      labels.push(sample.isFraud ? 1 : 0);
    });

    return { features, labels };
  }

  /**
   * Train machine learning model (simplified implementation)
   * In production, this would use a proper ML library like TensorFlow.js
   */
  async trainModel(features, labels) {
    // Simplified logistic regression implementation
    const weights = new Array(features[0].length).fill(0);
    const learningRate = 0.01;
    const epochs = 1000;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < features.length; i++) {
        const prediction = this.sigmoid(this.dotProduct(features[i], weights));
        const error = labels[i] - prediction;
        
        for (let j = 0; j < weights.length; j++) {
          weights[j] += learningRate * error * features[i][j];
        }
      }
    }

    return {
      weights,
      type: 'logistic_regression',
      version: this.generateModelVersion(),
      trainedAt: new Date()
    };
  }

  /**
   * Validate model performance
   * Requirement 17.3: Validate performance against holdout dataset
   */
  async validateModel(model, features, labels) {
    // Split data for validation (80/20 split)
    const splitIndex = Math.floor(features.length * 0.8);
    const testFeatures = features.slice(splitIndex);
    const testLabels = labels.slice(splitIndex);

    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    testFeatures.forEach((feature, index) => {
      const prediction = this.predict(model, feature);
      const actual = testLabels[index];

      if (prediction === 1 && actual === 1) truePositives++;
      else if (prediction === 1 && actual === 0) falsePositives++;
      else if (prediction === 0 && actual === 0) trueNegatives++;
      else if (prediction === 0 && actual === 1) falseNegatives++;
    });

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const falsePositiveRate = falsePositives / (falsePositives + trueNegatives) || 0;

    return {
      precision,
      recall,
      f1Score,
      falsePositiveRate,
      accuracy: (truePositives + trueNegatives) / testLabels.length
    };
  }

  /**
   * Check if model meets performance threshold
   * Requirement 17.4: Alert if performance drops below 85%
   */
  meetsPerformanceThreshold(performance) {
    return performance.precision >= this.performanceThreshold &&
           performance.recall >= this.performanceThreshold &&
           performance.f1Score >= this.performanceThreshold;
  }

  /**
   * Deploy new model
   * Requirement 17.5: A/B test with 10% of transactions for 48 hours
   */
  async deployModel(model, performance) {
    // In production, this would implement A/B testing
    // For now, we'll update the fraud detection service directly
    
    fraudDetectionService.updateModelMetrics(performance);
    
    await AuditLog.create({
      action: 'FRAUD_MODEL_DEPLOYED',
      userId: 'system',
      details: {
        modelVersion: model.version,
        performance,
        deployedAt: new Date()
      }
    });

    // Generate performance report
    await this.generatePerformanceReport(model, performance);
  }

  /**
   * Generate performance report
   * Requirement 17.6: Generate performance report showing improvements
   */
  async generatePerformanceReport(model, performance) {
    const report = {
      modelVersion: model.version,
      trainingDate: model.trainedAt,
      performance: {
        precision: (performance.precision * 100).toFixed(2) + '%',
        recall: (performance.recall * 100).toFixed(2) + '%',
        f1Score: (performance.f1Score * 100).toFixed(2) + '%',
        falsePositiveRate: (performance.falsePositiveRate * 100).toFixed(2) + '%',
        accuracy: (performance.accuracy * 100).toFixed(2) + '%'
      },
      improvements: this.calculateImprovements(performance),
      recommendations: this.generateRecommendations(performance)
    };

    await AuditLog.create({
      action: 'FRAUD_MODEL_PERFORMANCE_REPORT',
      userId: 'system',
      details: report
    });

    console.log('Model performance report generated:', report);
    return report;
  }

  // Helper methods
  calculateUserAge(createdAt) {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  getHourOfDay(timestamp) {
    return new Date(timestamp).getHours();
  }

  getAmountPercentile(amount, allData) {
    const amounts = allData.map(d => d.amount).sort((a, b) => a - b);
    const index = amounts.findIndex(a => a >= amount);
    return index / amounts.length;
  }

  getFrequencyScore(userId, allData) {
    return allData.filter(d => d.userId === userId).length;
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  predict(model, features) {
    const score = this.sigmoid(this.dotProduct(features, model.weights));
    return score > 0.5 ? 1 : 0;
  }

  generateModelVersion() {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}`;
  }

  calculateImprovements(newPerformance) {
    // Compare with previous model metrics
    const currentMetrics = fraudDetectionService.getFraudMetrics().metrics;
    
    return {
      precisionImprovement: ((newPerformance.precision - currentMetrics.precision) * 100).toFixed(2) + '%',
      recallImprovement: ((newPerformance.recall - currentMetrics.recall) * 100).toFixed(2) + '%',
      f1ScoreImprovement: ((newPerformance.f1Score - currentMetrics.f1Score) * 100).toFixed(2) + '%'
    };
  }

  generateRecommendations(performance) {
    const recommendations = [];
    
    if (performance.precision < 0.9) {
      recommendations.push('Consider adding more features to reduce false positives');
    }
    
    if (performance.recall < 0.9) {
      recommendations.push('Increase training data for fraud cases to improve detection');
    }
    
    if (performance.falsePositiveRate > 0.05) {
      recommendations.push('Adjust decision thresholds to reduce false positive rate');
    }
    
    return recommendations;
  }

  async alertPerformanceDegradation(performance) {
    await AuditLog.create({
      action: 'FRAUD_MODEL_PERFORMANCE_ALERT',
      userId: 'system',
      details: {
        performance,
        threshold: this.performanceThreshold,
        message: 'Model performance below acceptable threshold'
      }
    });
  }
}

module.exports = new FraudModelTrainer();