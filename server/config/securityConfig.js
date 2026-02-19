/**
 * Security Configuration
 * 
 * Centralized security configuration for headers, CORS, CSP,
 * and other security-related settings
 */

const { getEnvironmentConfig } = require('./environmentValidator');

/**
 * Gets CORS configuration based on environment
 * @param {string} environment - Current environment
 * @returns {object} CORS configuration
 */
function getCorsConfig(environment = process.env.NODE_ENV || 'development') {
  const config = getEnvironmentConfig(environment);
  
  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = config.allowedOrigins;
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
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
      'X-File-Name'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After'
    ],
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 hours preflight cache
  };
}

/**
 * Gets Content Security Policy configuration
 * @param {string} environment - Current environment
 * @returns {object} CSP configuration
 */
function getCSPConfig(environment = process.env.NODE_ENV || 'development') {
  const isDevelopment = environment === 'development';
  
  // Base CSP directives (strict)
  const baseDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"]
  };
  
  // Development-specific relaxations
  if (isDevelopment) {
    baseDirectives.scriptSrc.push("'unsafe-eval'"); // For React dev tools
    baseDirectives.styleSrc.push("'unsafe-inline'"); // For hot reloading
    baseDirectives.connectSrc.push("ws:", "wss:"); // For WebSocket dev server
  }
  
  // Video call specific additions (only when needed)
  const videoCallDirectives = {
    scriptSrc: [...baseDirectives.scriptSrc, "'unsafe-inline'"], // Minimal for WebRTC
    mediaSrc: [...baseDirectives.mediaSrc, "blob:", "mediastream:"],
    connectSrc: [
      ...baseDirectives.connectSrc,
      "wss:", "ws:",
      "https://stun.l.google.com:19302",
      "https://stun1.l.google.com:19302",
      "https://stun2.l.google.com:19302",
      "https://stun3.l.google.com:19302",
      "https://stun4.l.google.com:19302"
    ],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"]
  };
  
  // M-Pesa specific additions
  const mpesaDirectives = {
    connectSrc: [
      ...baseDirectives.connectSrc,
      "https://sandbox.safaricom.co.ke",
      "https://api.safaricom.co.ke"
    ]
  };
  
  return {
    directives: {
      ...baseDirectives,
      // Add video call directives for video call routes
      ...(process.env.ENABLE_VIDEO_CALLS !== 'false' ? videoCallDirectives : {}),
      // Add M-Pesa directives
      connectSrc: [...new Set([...baseDirectives.connectSrc, ...mpesaDirectives.connectSrc])]
    },
    reportOnly: isDevelopment, // Only report violations in development
    reportUri: process.env.CSP_REPORT_URI || undefined
  };
}

/**
 * Gets Helmet configuration
 * @param {string} environment - Current environment
 * @returns {object} Helmet configuration
 */
function getHelmetConfig(environment = process.env.NODE_ENV || 'development') {
  const cspConfig = getCSPConfig(environment);
  
  return {
    contentSecurityPolicy: {
      directives: cspConfig.directives,
      reportOnly: cspConfig.reportOnly
    },
    crossOriginEmbedderPolicy: false, // Disabled for WebRTC compatibility
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: 'sameorigin' }, // Allow same origin for video calls
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: environment === 'production'
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  };
}

/**
 * Gets additional security headers
 * @param {string} environment - Current environment
 * @returns {object} Additional headers
 */
function getAdditionalSecurityHeaders(environment = process.env.NODE_ENV || 'development') {
  const headers = {
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'same-site'
  };
  
  // Production-specific headers
  if (environment === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  return headers;
}

/**
 * Gets Permissions Policy configuration
 * @param {string} path - Request path
 * @returns {string} Permissions policy header value
 */
function getPermissionsPolicy(path = '') {
  // Default restrictive policy
  let policy = 'geolocation=(), microphone=(), camera=(), display-capture=(), autoplay=()';
  
  // Allow camera and microphone for video call routes
  if (path.startsWith('/api/video-calls') || path.includes('video')) {
    policy = 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), autoplay=()';
  }
  
  return policy;
}

/**
 * Security middleware that applies all security headers
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 */
function securityHeadersMiddleware(req, res, next) {
  const environment = process.env.NODE_ENV || 'development';
  
  // Apply additional security headers
  const additionalHeaders = getAdditionalSecurityHeaders(environment);
  Object.entries(additionalHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  // Apply Permissions Policy based on route
  const permissionsPolicy = getPermissionsPolicy(req.path);
  res.setHeader('Permissions-Policy', permissionsPolicy);
  
  // HTTPS enforcement in production
  if (environment === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
}

/**
 * TLS version enforcement middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 */
function tlsEnforcementMiddleware(req, res, next) {
  // Check TLS version if available
  if (req.connection.encrypted) {
    const tlsVersion = req.connection.getCipher()?.version;
    
    if (tlsVersion && (tlsVersion === 'TLSv1' || tlsVersion === 'TLSv1.1')) {
      console.error('❌ Rejected connection with outdated TLS version:', tlsVersion);
      return res.status(426).json({
        error: 'Upgrade Required: TLS 1.2 or higher is required',
        code: 'TLS_VERSION_TOO_OLD'
      });
    }
  }
  
  next();
}

/**
 * Validates WebSocket origin for Socket.io
 * @param {string} origin - Origin to validate
 * @returns {boolean} True if origin is allowed
 */
function validateWebSocketOrigin(origin) {
  if (!origin) return true; // Allow requests with no origin
  
  const environment = process.env.NODE_ENV || 'development';
  const config = getEnvironmentConfig(environment);
  
  return config.allowedOrigins.includes(origin);
}

module.exports = {
  getCorsConfig,
  getCSPConfig,
  getHelmetConfig,
  getAdditionalSecurityHeaders,
  getPermissionsPolicy,
  securityHeadersMiddleware,
  tlsEnforcementMiddleware,
  validateWebSocketOrigin
};