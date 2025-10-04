// Simple rate limiter without external dependencies
// Fallback for Railway deployment issues

const loginRateLimiter = (req, res, next) => {
  // Simple pass-through for now - no rate limiting
  // This ensures the server starts successfully
  next();
};

const apiLimiter = (req, res, next) => {
  // Simple pass-through for now - no rate limiting
  next();
};

module.exports = {
  loginRateLimiter,
  apiLimiter
};