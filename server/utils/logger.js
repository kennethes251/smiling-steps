/**
 * Structured Logger
 * 
 * Provides structured logging with different levels, transports,
 * and proper formatting for production environments
 */

const winston = require('winston');
const path = require('path');

/**
 * Log levels with priorities
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

/**
 * Colors for console output
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

/**
 * Custom format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

/**
 * Custom format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create logger instance
 */
function createLogger() {
  const environment = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');
  
  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  
  const transports = [];
  
  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat
    })
  );
  
  // File transports (only in production or when explicitly enabled)
  if (environment === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );
    
    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10,
        tailable: true
      })
    );
    
    // HTTP requests log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'http.log'),
        level: 'http',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );
  }
  
  const logger = winston.createLogger({
    levels: LOG_LEVELS,
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    defaultMeta: {
      service: 'teletherapy-api',
      environment,
      version: process.env.APP_VERSION || '1.0.0',
      nodeVersion: process.version
    },
    transports,
    exitOnError: false
  });
  
  // Add colors to winston
  winston.addColors(LOG_COLORS);
  
  return logger;
}

// Create the logger instance
const logger = createLogger();

/**
 * HTTP request logging middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 */
function httpLogger(req, res, next) {
  const start = Date.now();
  
  // Skip logging for health checks and static files
  if (req.path === '/health' || req.path.startsWith('/uploads/')) {
    return next();
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      contentLength: res.get('Content-Length'),
      referrer: req.get('Referrer')
    };
    
    // Log at different levels based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
}

/**
 * Database operation logger
 * @param {string} operation - Database operation name
 * @param {object} details - Operation details
 * @param {number} duration - Operation duration in ms
 */
function logDatabaseOperation(operation, details = {}, duration = null) {
  const logData = {
    operation,
    ...details,
    duration: duration ? `${duration}ms` : undefined
  };
  
  logger.debug('Database Operation', logData);
}

/**
 * Security event logger
 * @param {string} event - Security event type
 * @param {object} details - Event details
 * @param {string} severity - Event severity (low, medium, high, critical)
 */
function logSecurityEvent(event, details = {}, severity = 'medium') {
  const logData = {
    securityEvent: event,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  switch (severity) {
    case 'critical':
      logger.error('Security Event - CRITICAL', logData);
      break;
    case 'high':
      logger.error('Security Event - HIGH', logData);
      break;
    case 'medium':
      logger.warn('Security Event - MEDIUM', logData);
      break;
    default:
      logger.info('Security Event - LOW', logData);
  }
}

/**
 * Performance logger
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {object} metadata - Additional metadata
 */
function logPerformance(operation, duration, metadata = {}) {
  const logData = {
    performance: operation,
    duration: `${duration}ms`,
    ...metadata
  };
  
  // Log as warning if operation is slow
  if (duration > 1000) {
    logger.warn('Slow Operation', logData);
  } else {
    logger.debug('Performance', logData);
  }
}

/**
 * Business logic logger
 * @param {string} event - Business event
 * @param {object} details - Event details
 */
function logBusinessEvent(event, details = {}) {
  logger.info('Business Event', {
    businessEvent: event,
    ...details
  });
}

/**
 * Sanitizes sensitive data from logs
 * @param {object} data - Data to sanitize
 * @returns {object} Sanitized data
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'jwt', 'cookie', 'session', 'credential', 'auth'
  ];
  
  const sanitized = { ...data };
  
  function sanitizeObject(obj) {
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    });
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Creates a child logger with additional context
 * @param {object} context - Additional context to include in all logs
 * @returns {object} Child logger
 */
function createChildLogger(context) {
  return logger.child(sanitizeLogData(context));
}

/**
 * Graceful shutdown for logger
 */
function closeLogger() {
  return new Promise((resolve) => {
    logger.end(() => {
      resolve();
    });
  });
}

// Export logger and utilities
module.exports = {
  logger,
  httpLogger,
  logDatabaseOperation,
  logSecurityEvent,
  logPerformance,
  logBusinessEvent,
  sanitizeLogData,
  createChildLogger,
  closeLogger,
  LOG_LEVELS
};