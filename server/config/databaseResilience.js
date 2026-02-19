/**
 * Database Resilience Configuration
 * 
 * Provides robust database connection management with retry logic,
 * connection pooling, and proper error handling
 */

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

/**
 * Database connection configuration
 */
const DB_CONFIG = {
  // Connection pool settings
  maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
  
  // Timeout settings
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long a send or receive on a socket can take
  connectTimeoutMS: 10000, // How long to wait for initial connection
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Write concern
  w: 'majority',
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000
};

/**
 * Database connection class with retry logic
 */
class DatabaseConnection {
  constructor() {
    this.retryAttempts = 0;
    this.maxRetries = parseInt(process.env.DB_MAX_RETRIES) || 5;
    this.retryDelay = parseInt(process.env.DB_RETRY_DELAY) || 1000; // Start with 1 second
    this.isConnected = false;
    this.isConnecting = false;
  }
  
  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    if (this.isConnected) {
      logger.debug('Database already connected');
      return mongoose.connection;
    }
    
    if (this.isConnecting) {
      logger.debug('Database connection already in progress');
      return new Promise((resolve, reject) => {
        mongoose.connection.once('connected', () => resolve(mongoose.connection));
        mongoose.connection.once('error', reject);
      });
    }
    
    this.isConnecting = true;
    
    try {
      const MONGODB_URI = process.env.MONGODB_URI;
      
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is required');
      }
      
      logger.info('Attempting to connect to MongoDB...', {
        attempt: this.retryAttempts + 1,
        maxRetries: this.maxRetries,
        poolSize: DB_CONFIG.maxPoolSize
      });
      
      // Disable mongoose buffering (correct way for newer versions)
      mongoose.set('bufferCommands', false);
      
      await mongoose.connect(MONGODB_URI, DB_CONFIG);
      
      this.isConnected = true;
      this.isConnecting = false;
      this.retryAttempts = 0;
      
      logger.info('✅ MongoDB connected successfully', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      });
      
      return mongoose.connection;
      
    } catch (error) {
      this.isConnecting = false;
      
      logger.error('❌ MongoDB connection failed', {
        error: error.message,
        attempt: this.retryAttempts + 1,
        maxRetries: this.maxRetries
      });
      
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1); // Exponential backoff
        
        logger.info(`🔄 Retrying database connection in ${delay}ms`, {
          attempt: this.retryAttempts,
          maxRetries: this.maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect();
      } else {
        logger.error('🚨 Max database connection retries exceeded');
        throw new Error(`Database connection failed after ${this.maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  /**
   * Setup event handlers for connection monitoring
   */
  setupEventHandlers() {
    const connection = mongoose.connection;
    
    connection.on('connected', () => {
      this.isConnected = true;
      logger.info('📡 MongoDB connected');
    });
    
    connection.on('error', (error) => {
      this.isConnected = false;
      logger.error('❌ MongoDB connection error', { error: error.message });
    });
    
    connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('📡 MongoDB disconnected');
      
      // Attempt to reconnect if not intentionally disconnected
      if (!this.isConnecting) {
        logger.info('🔄 Attempting to reconnect to MongoDB...');
        setTimeout(() => {
          this.connect().catch(error => {
            logger.error('❌ Reconnection failed', { error: error.message });
          });
        }, 5000);
      }
    });
    
    connection.on('reconnected', () => {
      this.isConnected = true;
      logger.info('✅ MongoDB reconnected');
    });
    
    connection.on('close', () => {
      this.isConnected = false;
      logger.info('📡 MongoDB connection closed');
    });
    
    // Monitor connection pool
    connection.on('fullsetup', () => {
      logger.debug('📊 MongoDB replica set fully connected');
    });
    
    connection.on('all', () => {
      logger.debug('📊 MongoDB all servers connected');
    });
  }
  
  /**
   * Get connection health status
   * @returns {object} Health status
   */
  async getHealthStatus() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          readyState: mongoose.connection.readyState,
          message: 'Database not connected'
        };
      }
      
      // Ping the database
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name,
        responseTime: `${responseTime}ms`,
        poolSize: {
          current: mongoose.connection.db.serverConfig?.s?.pool?.totalConnectionCount || 'unknown',
          max: DB_CONFIG.maxPoolSize
        }
      };
    } catch (error) {
      return {
        status: 'error',
        readyState: mongoose.connection.readyState,
        message: error.message
      };
    }
  }
  
  /**
   * Gracefully close the database connection
   */
  async close() {
    if (this.isConnected) {
      logger.info('🔄 Closing MongoDB connection...');
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('✅ MongoDB connection closed');
    }
  }
}

/**
 * Database operation wrapper with error handling and logging
 */
class DatabaseOperationWrapper {
  /**
   * Execute a database operation with error handling and logging
   * @param {string} operationName - Name of the operation
   * @param {Function} operation - The database operation function
   * @param {object} context - Additional context for logging
   * @returns {Promise} Operation result
   */
  static async execute(operationName, operation, context = {}) {
    const startTime = Date.now();
    
    try {
      logger.debug(`🔄 Starting database operation: ${operationName}`, context);
      
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.debug(`✅ Database operation completed: ${operationName}`, {
        ...context,
        duration: `${duration}ms`,
        success: true
      });
      
      // Log slow operations
      if (duration > 1000) {
        logger.warn(`🐌 Slow database operation: ${operationName}`, {
          ...context,
          duration: `${duration}ms`
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`❌ Database operation failed: ${operationName}`, {
        ...context,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
}

/**
 * Create and configure database connection
 */
const dbConnection = new DatabaseConnection();

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  try {
    // Setup event handlers first
    dbConnection.setupEventHandlers();
    
    // Connect to database
    await dbConnection.connect();
    
    return mongoose.connection;
  } catch (error) {
    logger.error('🚨 Failed to initialize database', { error: error.message });
    throw error;
  }
}

/**
 * Middleware to check database connection health
 */
function databaseHealthMiddleware(req, res, next) {
  if (!dbConnection.isConnected) {
    return res.status(503).json({
      error: 'Database unavailable',
      code: 'DATABASE_UNAVAILABLE',
      timestamp: new Date().toISOString()
    });
  }
  next();
}

module.exports = {
  DatabaseConnection,
  DatabaseOperationWrapper,
  dbConnection,
  initializeDatabase,
  databaseHealthMiddleware,
  DB_CONFIG
};