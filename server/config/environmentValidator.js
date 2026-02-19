/**
 * Environment Configuration Validator
 * 
 * Validates required environment variables at startup to prevent
 * production issues from missing configuration
 */

const requiredEnvVars = {
  development: [
    'MONGODB_URI',
    'JWT_SECRET',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ],
  production: [
    'MONGODB_URI',
    'JWT_SECRET',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'ALLOWED_ORIGINS',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_CALLBACK_URL'
  ],
  staging: [
    'MONGODB_URI',
    'JWT_SECRET',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'ALLOWED_ORIGINS'
  ]
};

const sensitiveVars = [
  'JWT_SECRET',
  'EMAIL_PASSWORD',
  'MONGODB_URI',
  'MPESA_CONSUMER_SECRET'
];

/**
 * Validates environment variables for the current environment
 * @param {string} environment - The current environment (development, production, staging)
 * @throws {Error} If required variables are missing or invalid
 */
function validateEnvironment(environment = process.env.NODE_ENV || 'development') {
  console.log(`🔍 Validating environment configuration for: ${environment}`);
  
  const required = requiredEnvVars[environment] || requiredEnvVars.development;
  const missing = [];
  const warnings = [];
  
  // Check for missing required variables
  required.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else if (value === 'your_jwt_secret_key_here' || value === 'YOUR_SECRET_HERE') {
      warnings.push(`${varName} is using a default/placeholder value`);
    }
  });
  
  // Check for production-specific validations
  if (environment === 'production') {
    // Validate JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for production');
    }
    
    // Validate M-Pesa callback URL
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (callbackUrl && callbackUrl.includes('localhost')) {
      missing.push('MPESA_CALLBACK_URL must not use localhost in production');
    }
    
    // Validate allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins && allowedOrigins.includes('localhost')) {
      warnings.push('ALLOWED_ORIGINS contains localhost URLs in production');
    }
  }
  
  // Report results
  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('');
    console.error('📋 REQUIRED ACTIONS:');
    console.error('1. Set missing environment variables in your deployment platform');
    console.error('2. For local development, update your .env file');
    console.error('3. For production, use secure secret management');
    console.error('');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Environment configuration warnings:');
    warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('');
  }
  
  console.log('✅ Environment validation passed');
  
  // Log configuration summary (without sensitive values)
  logConfigurationSummary(environment);
}

/**
 * Logs a summary of the current configuration without exposing sensitive values
 */
function logConfigurationSummary(environment) {
  const config = {
    environment,
    database: process.env.MONGODB_URI ? 'MongoDB (configured)' : 'Not configured',
    email: process.env.EMAIL_USER ? `${process.env.EMAIL_USER} (configured)` : 'Not configured',
    mpesa: process.env.MPESA_CONSUMER_KEY ? 'Configured' : 'Not configured',
    cors: process.env.ALLOWED_ORIGINS ? 'Custom origins' : 'Default origins',
    port: process.env.PORT || 5000
  };
  
  console.log('📊 Configuration Summary:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');
}

/**
 * Validates a specific environment variable
 * @param {string} varName - Name of the environment variable
 * @param {object} options - Validation options
 * @returns {boolean} True if valid
 */
function validateEnvVar(varName, options = {}) {
  const value = process.env[varName];
  const { required = false, minLength = 0, pattern = null } = options;
  
  if (required && (!value || value.trim() === '')) {
    return false;
  }
  
  if (value && minLength > 0 && value.length < minLength) {
    return false;
  }
  
  if (value && pattern && !pattern.test(value)) {
    return false;
  }
  
  return true;
}

/**
 * Gets environment-specific configuration
 * @param {string} environment - The environment name
 * @returns {object} Configuration object
 */
function getEnvironmentConfig(environment = process.env.NODE_ENV || 'development') {
  const baseConfig = {
    environment,
    port: parseInt(process.env.PORT) || 5000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '24h'
  };
  
  // Environment-specific configurations
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
        logLevel: 'info',
        enableDebugLogs: false,
        rateLimitStrict: true
      };
      
    case 'staging':
      return {
        ...baseConfig,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://staging.smiling-steps.com'],
        logLevel: 'debug',
        enableDebugLogs: true,
        rateLimitStrict: true
      };
      
    default: // development
      return {
        ...baseConfig,
        allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
        logLevel: 'debug',
        enableDebugLogs: true,
        rateLimitStrict: false
      };
  }
}

module.exports = {
  validateEnvironment,
  validateEnvVar,
  getEnvironmentConfig,
  requiredEnvVars
};