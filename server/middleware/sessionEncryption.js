/**
 * Session Data Encryption Middleware
 * 
 * Ensures all sensitive session data is properly encrypted
 * and validates encryption compliance for video call sessions
 */

const encryptionValidator = require('../utils/encryptionValidator');
const auditLogger = require('../utils/auditLogger');

/**
 * Middleware to validate session encryption before sending response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateSessionEncryption = async (req, res, next) => {
  try {
    // Skip validation for non-session routes
    if (!req.route || !req.route.path.includes('session')) {
      return next();
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to validate encryption before sending
    res.json = async function(data) {
      try {
        // Validate session data if present
        if (data && (data.session || data.sessions || Array.isArray(data))) {
          const sessions = Array.isArray(data) ? data : 
                          data.sessions ? data.sessions : 
                          [data.session || data];
          
          for (const session of sessions) {
            if (session && session._id) {
              const validation = await encryptionValidator.validateSessionEncryptionCompliance(session);
              
              if (!validation.hipaaCompliant) {
                console.warn(`⚠️ Session ${session._id} is not HIPAA compliant:`, validation.warnings);
                
                // Log compliance violation
                await auditLogger.logAction({
                  userId: req.user?.id || 'anonymous',
                  action: 'session_encryption_violation',
                  resource: 'session',
                  resourceId: session._id,
                  details: {
                    violations: validation.warnings,
                    errors: validation.errors,
                    endpoint: req.originalUrl
                  }
                });
              }
            }
          }
        }
        
        // Call original json method
        return originalJson.call(this, data);
      } catch (error) {
        console.error('Session encryption validation error:', error);
        // Don't break the response, just log the error
        return originalJson.call(this, data);
      }
    };
    
    next();
  } catch (error) {
    console.error('Session encryption middleware error:', error);
    next(); // Don't break the request flow
  }
};

/**
 * Middleware to ensure session data is encrypted before database operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const ensureSessionEncryption = async (req, res, next) => {
  try {
    // Check if request contains session data to be saved
    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const sessionData = req.body;
      
      // Validate that sensitive fields will be encrypted
      const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
      const unencryptedSensitiveData = [];
      
      for (const field of sensitiveFields) {
        if (sessionData[field] && typeof sessionData[field] === 'string') {
          // Check if data is already encrypted
          if (!encryptionValidator.isEncrypted(sessionData[field])) {
            unencryptedSensitiveData.push(field);
          }
        }
      }
      
      // Log if sensitive data is being saved unencrypted
      if (unencryptedSensitiveData.length > 0) {
        console.log(`🔒 Sensitive session data will be encrypted: ${unencryptedSensitiveData.join(', ')}`);
        
        // The Session model middleware will handle the actual encryption
        // This is just for logging and validation
        await auditLogger.logAction({
          userId: req.user?.id || 'system',
          action: 'session_data_encryption_pending',
          resource: 'session',
          resourceId: sessionData._id || 'new',
          details: {
            fieldsToEncrypt: unencryptedSensitiveData,
            endpoint: req.originalUrl
          }
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Session encryption ensure middleware error:', error);
    next(); // Don't break the request flow
  }
};

/**
 * Middleware to decrypt session data for API responses (when needed)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const decryptSessionForResponse = (req, res, next) => {
  try {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to decrypt sensitive data if requested
    res.json = function(data) {
      try {
        // Check if decryption is requested via query parameter
        const shouldDecrypt = req.query.decrypt === 'true' && req.user && 
                             (req.user.role === 'admin' || req.user.role === 'psychologist');
        
        if (shouldDecrypt && data && (data.session || data.sessions || Array.isArray(data))) {
          const sessions = Array.isArray(data) ? data : 
                          data.sessions ? data.sessions : 
                          [data.session || data];
          
          for (const session of sessions) {
            if (session && typeof session.getDecryptedData === 'function') {
              const decryptedData = session.getDecryptedData();
              
              // Add decrypted data to response (without overwriting original)
              session.decrypted = decryptedData;
              
              console.log(`🔓 Decrypted session data for authorized user: ${req.user.id}`);
            }
          }
        }
        
        // Call original json method
        return originalJson.call(this, data);
      } catch (error) {
        console.error('Session decryption error:', error);
        // Don't break the response, just log the error
        return originalJson.call(this, data);
      }
    };
    
    next();
  } catch (error) {
    console.error('Session decryption middleware error:', error);
    next(); // Don't break the request flow
  }
};

/**
 * Comprehensive session encryption middleware that combines all validations
 */
const sessionEncryptionMiddleware = [
  ensureSessionEncryption,
  validateSessionEncryption,
  decryptSessionForResponse
];

module.exports = {
  validateSessionEncryption,
  ensureSessionEncryption,
  decryptSessionForResponse,
  sessionEncryptionMiddleware
};