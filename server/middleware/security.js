/**
 * Security Middleware
 * 
 * Provides security headers and HTTPS enforcement for the application
 * Enhanced for video call functionality with WebRTC support
 */

/**
 * Security headers middleware
 * Adds security-related HTTP headers to all responses
 */
const securityHeaders = (req, res, next) => {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // Strict-Transport-Security: Enforce HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options: Prevent clickjacking (allow same origin for video calls)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // X-XSS-Protection: Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enhanced Content-Security-Policy for video calls
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob: mediastream:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self'",
    // WebRTC and video call specific connections
    "connect-src 'self' wss: ws: " +
    "https://stun.l.google.com:19302 " +
    "https://stun1.l.google.com:19302 " +
    "https://stun2.l.google.com:19302 " +
    "https://stun3.l.google.com:19302 " +
    "https://stun4.l.google.com:19302 " +
    "https://sandbox.safaricom.co.ke " +
    "https://api.safaricom.co.ke"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', cspPolicy);
  
  // Default Permissions-Policy (restrictive)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), display-capture=(), autoplay=()'
  );

  // Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  next();
};

/**
 * TLS version enforcement middleware
 * Ensures minimum TLS 1.2 is used
 */
const enforceTLS = (req, res, next) => {
  // Check TLS version if available
  if (req.connection.encrypted) {
    const tlsVersion = req.connection.getCipher()?.version;
    
    if (tlsVersion && (tlsVersion === 'TLSv1' || tlsVersion === 'TLSv1.1')) {
      console.error('❌ Rejected connection with outdated TLS version:', tlsVersion);
      return res.status(426).json({ 
        msg: 'Upgrade Required: TLS 1.2 or higher is required' 
      });
    }
  }
  
  next();
};

/**
 * Rate limiting for sensitive endpoints
 * Prevents brute force attacks
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(ip);
      }
    }
    
    // Get or create request data
    let requestData = requests.get(key);
    
    if (!requestData) {
      requestData = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(key, requestData);
    }
    
    // Check if limit exceeded
    if (requestData.count >= max) {
      const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);
      
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
      
      return res.status(429).json({
        msg: 'Too many requests, please try again later',
        retryAfter: retryAfter
      });
    }
    
    // Increment count
    requestData.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - requestData.count);
    res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
    
    next();
  };
};

/**
 * Video call specific CORS configuration
 * Handles WebRTC and Socket.io specific requirements
 */
const videoCallCorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, WebRTC, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://smiling-steps-frontend.onrender.com'
    ];
    
    // Allow WebRTC STUN server origins
    const webrtcOrigins = [
      'https://stun.l.google.com',
      'https://stun1.l.google.com',
      'https://stun2.l.google.com',
      'https://stun3.l.google.com',
      'https://stun4.l.google.com'
    ];
    
    if (allowedOrigins.includes(origin) || webrtcOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 Video call CORS blocked origin:', origin);
      callback(new Error('Not allowed by video call CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-auth-token',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
    'X-Socket-ID',
    'X-WebRTC-Session'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
    'X-Session-ID',
    'X-Call-Status'
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours preflight cache
};

/**
 * WebSocket CORS validation for Socket.io
 */
const validateWebSocketOrigin = (origin) => {
  if (!origin) return true; // Allow requests with no origin
  
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://smiling-steps-frontend.onrender.com'
  ];
  
  return allowedOrigins.includes(origin);
};

module.exports = {
  securityHeaders,
  enforceTLS,
  createRateLimiter,
  videoCallCorsOptions,
  validateWebSocketOrigin
};
