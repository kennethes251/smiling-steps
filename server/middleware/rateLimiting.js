/**
 * Rate Limiting Middleware
 * 
 * Implements comprehensive rate limiting for different endpoint types
 * to prevent abuse and ensure system stability
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limit configurations for different endpoint types
 */
const rateLimitConfigs = {
  // Authentication endpoints - balanced limits for security without frustration
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 100 : 30, // 30 attempts in prod (was 10)
    message: {
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
  },
  
  // Email verification - separate limiter to prevent lockouts
  verification: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 verification attempts per 5 minutes
    message: {
      error: 'Too many verification attempts',
      retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  },
  
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 300 : 100, // Higher in dev for dashboard testing
    message: {
      error: 'Too many API requests',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Payment endpoints - very strict
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 payment attempts per hour
    message: {
      error: 'Too many payment attempts',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
  },
  
  // Video call endpoints
  videoCall: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 video call actions per minute
    message: {
      error: 'Too many video call requests',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
      error: 'Too many file uploads',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Admin endpoints - higher limits for dashboard operations
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 500 : 200, // Higher limits for admin dashboard
    message: {
      error: 'Too many admin requests',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Chat room message rate limiting - Requirements 9.6
  // Limit to 10 messages per minute per user to prevent spam
  chatMessage: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 messages per minute per user
    message: {
      error: 'Too many messages sent',
      retryAfter: '1 minute',
      code: 'RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false
  }
};

/**
 * Creates a rate limiter with the specified configuration
 * @param {string} type - The type of rate limiter (auth, api, payment, etc.)
 * @param {object} customConfig - Custom configuration to override defaults
 * @returns {Function} Express middleware function
 */
function createRateLimiter(type, customConfig = {}) {
  const config = rateLimitConfigs[type];
  if (!config) {
    throw new Error(`Unknown rate limiter type: ${type}`);
  }
  
  const finalConfig = {
    ...config,
    ...customConfig,
    // Disable all validations to avoid IPv6 warnings
    validate: false,
    // Custom key generator to handle different scenarios
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      if (req.user?.id) {
        return req.user.id;
      }
      // Use req.ip which express-rate-limit handles properly
      return req.ip || 'unknown';
    },
    
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      const retryAfter = Math.round(config.windowMs / 1000);
      
      // Log rate limit violation
      console.warn(`🚫 Rate limit exceeded: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        type
      });
      
      res.status(429).json({
        error: config.message.error,
        retryAfter: config.message.retryAfter,
        retryAfterSeconds: retryAfter,
        timestamp: new Date().toISOString()
      });
    },
    
    // Skip rate limiting for certain conditions
    skip: (req) => {
      // Skip rate limiting in development if configured
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMITING === 'true') {
        return true;
      }
      
      // Skip for admin users on non-auth endpoints (always enabled for admin dashboard)
      if (type !== 'auth' && req.user?.role === 'admin') {
        return true;
      }
      
      return false;
    }
  };
  
  return rateLimit(finalConfig);
}

/**
 * Pre-configured rate limiters for common use cases
 */
const rateLimiters = {
  auth: createRateLimiter('auth'),
  verification: createRateLimiter('verification'),
  api: createRateLimiter('api'),
  payment: createRateLimiter('payment'),
  videoCall: createRateLimiter('videoCall'),
  upload: createRateLimiter('upload'),
  admin: createRateLimiter('admin'),
  chatMessage: createRateLimiter('chatMessage')
};

/**
 * Middleware to apply appropriate rate limiting based on request path
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 */
function smartRateLimiter(req, res, next) {
  const path = req.path.toLowerCase();
  
  // Determine which rate limiter to apply based on path
  if (path.includes('/email-verification')) {
    return rateLimiters.verification(req, res, next);
  } else if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
    return rateLimiters.auth(req, res, next);
  } else if (path.includes('/mpesa/') || path.includes('/payment')) {
    return rateLimiters.payment(req, res, next);
  } else if (path.includes('/video-call')) {
    return rateLimiters.videoCall(req, res, next);
  } else if (path.includes('/upload')) {
    return rateLimiters.upload(req, res, next);
  } else if (path.includes('/admin/')) {
    return rateLimiters.admin(req, res, next);
  } else if (path.match(/\/chat-rooms\/[^/]+\/messages$/) && req.method === 'POST') {
    // Apply chat message rate limiting for POST to /chat-rooms/:id/messages
    return rateLimiters.chatMessage(req, res, next);
  } else {
    return rateLimiters.api(req, res, next);
  }
}

/**
 * Rate limiting middleware for WebSocket connections
 * @param {number} maxConnections - Maximum connections per IP
 * @param {number} windowMs - Time window in milliseconds
 */
function createWebSocketRateLimiter(maxConnections = 10, windowMs = 60000) {
  const connections = new Map();
  
  return (socket, next) => {
    const clientIP = socket.handshake.address;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of connections.entries()) {
      if (now - data.firstConnection > windowMs) {
        connections.delete(ip);
      }
    }
    
    // Get or create connection data
    let connectionData = connections.get(clientIP);
    if (!connectionData) {
      connectionData = {
        count: 0,
        firstConnection: now
      };
      connections.set(clientIP, connectionData);
    }
    
    // Check if limit exceeded
    if (connectionData.count >= maxConnections) {
      console.warn(`🚫 WebSocket rate limit exceeded for IP: ${clientIP}`);
      return next(new Error('Too many WebSocket connections'));
    }
    
    // Increment count
    connectionData.count++;
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
      if (connectionData.count > 0) {
        connectionData.count--;
      }
    });
    
    next();
  };
}

module.exports = {
  createRateLimiter,
  rateLimiters,
  smartRateLimiter,
  createWebSocketRateLimiter,
  rateLimitConfigs
};