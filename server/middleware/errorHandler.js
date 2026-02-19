/**
 * Global Error Handler Middleware
 * 
 * Provides centralized error handling for the entire application
 * with proper logging, error classification, and response formatting
 */

/**
 * Custom error classes for better error handling
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Determines error severity based on status code and error type
 * @param {Error} error - The error object
 * @returns {string} Severity level
 */
function getErrorSeverity(error) {
  if (error.statusCode >= 500) return ERROR_SEVERITY.CRITICAL;
  if (error.statusCode >= 400) return ERROR_SEVERITY.MEDIUM;
  if (error.code === 'RATE_LIMIT_ERROR') return ERROR_SEVERITY.LOW;
  return ERROR_SEVERITY.MEDIUM;
}

/**
 * Formats error for logging
 * @param {Error} error - The error object
 * @param {object} req - Express request object
 * @returns {object} Formatted error object
 */
function formatErrorForLogging(error, req) {
  return {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
    severity: getErrorSeverity(error),
    stack: error.stack,
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined
    }
  };
}

/**
 * Sanitizes request body for logging (removes sensitive data)
 * @param {object} body - Request body
 * @returns {object} Sanitized body
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Formats error response for client
 * @param {Error} error - The error object
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {object} Client error response
 */
function formatErrorResponse(error, isDevelopment = false) {
  const response = {
    error: {
      message: error.isOperational ? error.message : 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  };
  
  // Add additional details in development
  if (isDevelopment) {
    response.error.stack = error.stack;
    response.error.statusCode = error.statusCode;
  }
  
  // Add field information for validation errors
  if (error instanceof ValidationError && error.field) {
    response.error.field = error.field;
  }
  
  return response;
}

/**
 * Main error handling middleware
 * @param {Error} err - The error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 */
function globalErrorHandler(err, req, res, next) {
  // Ensure error has required properties
  if (!err.statusCode) err.statusCode = 500;
  if (!err.code) err.code = 'INTERNAL_ERROR';
  
  // Format error for logging
  const logError = formatErrorForLogging(err, req);
  
  // Log error based on severity
  const severity = getErrorSeverity(err);
  switch (severity) {
    case ERROR_SEVERITY.CRITICAL:
      console.error('🚨 CRITICAL ERROR:', logError);
      break;
    case ERROR_SEVERITY.HIGH:
      console.error('❌ HIGH SEVERITY ERROR:', logError);
      break;
    case ERROR_SEVERITY.MEDIUM:
      console.warn('⚠️ MEDIUM SEVERITY ERROR:', logError);
      break;
    case ERROR_SEVERITY.LOW:
      console.info('ℹ️ LOW SEVERITY ERROR:', logError);
      break;
  }
  
  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Format response for client
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = formatErrorResponse(err, isDevelopment);
  
  // Send error response
  res.status(err.statusCode).json(errorResponse);
}

/**
 * Handles unhandled promise rejections
 * @param {Error} err - The error object
 */
function handleUnhandledRejection(err) {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Graceful shutdown
  console.error('🔄 Shutting down server due to unhandled promise rejection...');
  process.exit(1);
}

/**
 * Handles uncaught exceptions
 * @param {Error} err - The error object
 */
function handleUncaughtException(err) {
  console.error('🚨 UNCAUGHT EXCEPTION:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Graceful shutdown
  console.error('🔄 Shutting down server due to uncaught exception...');
  process.exit(1);
}

/**
 * Async wrapper for route handlers to catch async errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
  
  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    console.log('📡 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });
  
  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('📡 SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
}

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Error handling functions
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  setupGlobalErrorHandlers,
  
  // Utility functions
  formatErrorForLogging,
  formatErrorResponse,
  getErrorSeverity,
  ERROR_SEVERITY
};