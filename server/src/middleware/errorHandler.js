/**
 * Centralized Error Handler Middleware
 * 
 * All errors flow through here for consistent handling.
 * Emits events for monitoring and logging.
 * 
 * @stable
 * @verified 2024-12-27
 * @module middleware/errorHandler
 */

const { eventBus, SYSTEM_EVENTS } = require('../events/eventBus');

/**
 * Custom application error class
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

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Unauthorized error class
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Global error handler middleware
 */
function globalErrorHandler(err, req, res, next) {
  const correlationId = req.correlationId || 'unknown';
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let errors = err.errors || null;

  // Log error
  console.error(`[ERROR] ${correlationId}:`, {
    code,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Emit error event for monitoring
  eventBus.emitEvent(SYSTEM_EVENTS.ERROR, {
    correlationId,
    code,
    message,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle specific error types
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'Resource already exists';
  }

  // Send response
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(errors && { errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    correlationId
  };

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper - catches async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */