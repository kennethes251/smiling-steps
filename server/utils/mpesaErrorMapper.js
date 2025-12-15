/**
 * M-Pesa Error Mapper
 * Maps M-Pesa result codes to user-friendly messages
 * Provides error response formatting and logging
 */

// M-Pesa Result Code Mappings
const MPESA_RESULT_CODES = {
  // Success
  0: {
    type: 'success',
    userMessage: 'Payment completed successfully',
    logMessage: 'Payment successful',
    retryable: false
  },
  
  // User Cancellation
  1032: {
    type: 'cancelled',
    userMessage: 'Payment cancelled. You can retry when ready.',
    logMessage: 'User cancelled payment',
    retryable: true,
    showRetry: true
  },
  
  // Insufficient Funds
  1: {
    type: 'insufficient_funds',
    userMessage: 'Insufficient M-Pesa balance. Please top up your account and try again.',
    logMessage: 'Insufficient funds',
    retryable: true,
    showRetry: true
  },
  
  // Invalid Phone Number
  2001: {
    type: 'invalid_phone',
    userMessage: 'Invalid phone number. Please check and try again.',
    logMessage: 'Invalid phone number provided',
    retryable: true,
    showRetry: true
  },
  
  // Timeout
  1037: {
    type: 'timeout',
    userMessage: 'Payment request timed out. Please check your M-Pesa messages and try again if payment was not completed.',
    logMessage: 'Payment request timeout',
    retryable: true,
    showRetry: true
  },
  
  // Wrong PIN
  2006: {
    type: 'wrong_pin',
    userMessage: 'Incorrect M-Pesa PIN entered. Please try again with the correct PIN.',
    logMessage: 'Wrong PIN entered',
    retryable: true,
    showRetry: true
  },
  
  // Account Not Active
  2058: {
    type: 'account_inactive',
    userMessage: 'Your M-Pesa account is not active. Please contact Safaricom.',
    logMessage: 'M-Pesa account not active',
    retryable: false,
    showRetry: false
  },
  
  // Transaction Failed
  1: {
    type: 'transaction_failed',
    userMessage: 'Transaction failed. Please try again or contact support.',
    logMessage: 'Transaction failed',
    retryable: true,
    showRetry: true
  },
  
  // System Error
  1001: {
    type: 'system_error',
    userMessage: 'System error occurred. Please try again in a few moments.',
    logMessage: 'M-Pesa system error',
    retryable: true,
    showRetry: true
  },
  
  // Duplicate Transaction
  1036: {
    type: 'duplicate',
    userMessage: 'Duplicate transaction detected. Please check your M-Pesa messages.',
    logMessage: 'Duplicate transaction attempt',
    retryable: false,
    showRetry: false
  }
};

// API Error Code Mappings
const API_ERROR_CODES = {
  '400.002.02': {
    type: 'invalid_phone',
    userMessage: 'Invalid phone number format. Please use a valid Kenyan mobile number (e.g., 0712345678).',
    logMessage: 'Invalid phone number format in API request'
  },
  
  '500.001.1001': {
    type: 'api_unavailable',
    userMessage: 'M-Pesa service is temporarily unavailable. Please try again in a few moments.',
    logMessage: 'M-Pesa API unavailable'
  },
  
  '401': {
    type: 'auth_failed',
    userMessage: 'Payment service authentication failed. Please contact support.',
    logMessage: 'M-Pesa authentication failed - invalid credentials'
  },
  
  '400': {
    type: 'bad_request',
    userMessage: 'Invalid payment request. Please try again or contact support.',
    logMessage: 'Bad request to M-Pesa API'
  },
  
  '500': {
    type: 'server_error',
    userMessage: 'M-Pesa service error. Please try again later.',
    logMessage: 'M-Pesa server error'
  },
  
  '503': {
    type: 'service_unavailable',
    userMessage: 'M-Pesa service is currently unavailable. Please try again later.',
    logMessage: 'M-Pesa service unavailable'
  }
};

/**
 * Map M-Pesa result code to user-friendly error information
 * @param {number|string} resultCode - M-Pesa result code
 * @returns {Object} Error information with user message, log message, and retry options
 */
function mapResultCode(resultCode) {
  const code = parseInt(resultCode);
  
  // Check if we have a mapping for this code
  if (MPESA_RESULT_CODES[code]) {
    return MPESA_RESULT_CODES[code];
  }
  
  // Default error for unknown codes
  return {
    type: 'unknown_error',
    userMessage: 'Payment could not be completed. Please try again or contact support.',
    logMessage: `Unknown M-Pesa result code: ${resultCode}`,
    retryable: true,
    showRetry: true
  };
}

/**
 * Map API error code to user-friendly error information
 * @param {string} errorCode - M-Pesa API error code
 * @returns {Object} Error information
 */
function mapApiError(errorCode) {
  if (API_ERROR_CODES[errorCode]) {
    return API_ERROR_CODES[errorCode];
  }
  
  // Default API error
  return {
    type: 'api_error',
    userMessage: 'Payment service error. Please try again.',
    logMessage: `Unknown API error code: ${errorCode}`
  };
}

/**
 * Format error response for API endpoints
 * @param {Object} errorInfo - Error information from mapping
 * @param {Object} additionalData - Additional data to include in response
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(errorInfo, additionalData = {}) {
  return {
    success: false,
    error: {
      type: errorInfo.type,
      message: errorInfo.userMessage,
      retryable: errorInfo.retryable || false,
      showRetry: errorInfo.showRetry || false
    },
    ...additionalData
  };
}

/**
 * Log payment error with structured format
 * @param {string} context - Context where error occurred (e.g., 'STK_PUSH', 'CALLBACK')
 * @param {Object} errorInfo - Error information
 * @param {Object} metadata - Additional metadata for logging
 */
function logPaymentError(context, errorInfo, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    errorType: errorInfo.type,
    message: errorInfo.logMessage,
    ...metadata
  };
  
  // Use appropriate log level based on error type
  if (errorInfo.type === 'cancelled' || errorInfo.type === 'timeout') {
    console.log('⚠️ Payment Warning:', JSON.stringify(logEntry, null, 2));
  } else if (errorInfo.type === 'system_error' || errorInfo.type === 'api_unavailable') {
    console.error('🚨 Payment System Error:', JSON.stringify(logEntry, null, 2));
  } else {
    console.error('❌ Payment Error:', JSON.stringify(logEntry, null, 2));
  }
  
  return logEntry;
}

/**
 * Get user-friendly message for callback result
 * @param {number} resultCode - M-Pesa callback result code
 * @param {string} resultDesc - M-Pesa result description
 * @returns {string} User-friendly message
 */
function getCallbackMessage(resultCode, resultDesc) {
  const errorInfo = mapResultCode(resultCode);
  
  // For success, return the result description from M-Pesa
  if (resultCode === 0) {
    return resultDesc || errorInfo.userMessage;
  }
  
  // For errors, return our mapped user-friendly message
  return errorInfo.userMessage;
}

/**
 * Determine if error should trigger automatic retry
 * @param {Object} errorInfo - Error information
 * @returns {boolean} Whether to retry automatically
 */
function shouldAutoRetry(errorInfo) {
  // Auto-retry only for system errors and API unavailability
  return errorInfo.type === 'system_error' || 
         errorInfo.type === 'api_unavailable' ||
         errorInfo.type === 'service_unavailable';
}

/**
 * Get retry delay in milliseconds based on error type
 * @param {Object} errorInfo - Error information
 * @param {number} attemptNumber - Current retry attempt number
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(errorInfo, attemptNumber = 1) {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const baseDelay = 1000;
  
  if (errorInfo.type === 'api_unavailable' || errorInfo.type === 'service_unavailable') {
    // Longer delays for service unavailability
    return Math.min(baseDelay * Math.pow(2, attemptNumber), 30000); // Max 30 seconds
  }
  
  if (errorInfo.type === 'system_error') {
    // Moderate delays for system errors
    return Math.min(baseDelay * Math.pow(2, attemptNumber), 15000); // Max 15 seconds
  }
  
  // Default delay
  return baseDelay * attemptNumber;
}

module.exports = {
  mapResultCode,
  mapApiError,
  formatErrorResponse,
  logPaymentError,
  getCallbackMessage,
  shouldAutoRetry,
  getRetryDelay,
  MPESA_RESULT_CODES,
  API_ERROR_CODES
};
