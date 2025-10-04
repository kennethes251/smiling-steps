const rateLimit = require('express-rate-limit');
const { RateLimiterMongo } = require('rate-limiter-flexible');
const mongoose = require('mongoose');

// In-memory rate limiting for development
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit for development
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// MongoDB-based rate limiting for production
const mongoConn = mongoose.connection;

const mongoRateLimiter = new RateLimiterMongo({
  storeClient: mongoConn,
  points: 5, // 5 requests
  duration: 15 * 60, // per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes if limit is reached
  keyPrefix: 'login_fail' // Key prefix in MongoDB
});

const mongoRateLimiterMiddleware = (req, res, next) => {
  const key = req.ip;
  
  mongoRateLimiter.consume(key, 1) // consume 1 point per request
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
      });
    });
};

// Use MongoDB rate limiter in production, in-memory in development
const loginRateLimiter = process.env.NODE_ENV === 'production' 
  ? mongoRateLimiterMiddleware 
  : loginLimiter;

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginRateLimiter,
  apiLimiter
};
