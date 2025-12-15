/**
 * M-Pesa Retry Handler
 * Implements exponential backoff, request queuing, and callback retry mechanism
 */

const { shouldAutoRetry, getRetryDelay, logPaymentError } = require('./mpesaErrorMapper');

// Request queue for API unavailability
const requestQueue = [];
let isProcessingQueue = false;
let apiAvailable = true;

// Callback retry tracking
const callbackRetries = new Map(); // checkoutRequestID -> retry count

// Configuration
const MAX_RETRIES = 3;
const MAX_QUEUE_SIZE = 100;
const QUEUE_PROCESS_INTERVAL = 30000; // 30 seconds

/**
 * Execute function with exponential backoff retry
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise} Result of function execution
 */
async function withExponentialBackoff(fn, options = {}) {
  const {
    maxRetries = MAX_RETRIES,
    context = 'API_CALL',
    metadata = {}
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the function
      const result = await fn();
      
      // If successful, mark API as available
      if (!apiAvailable) {
        console.log('✅ M-Pesa API is now available');
        apiAvailable = true;
        processQueue(); // Process any queued requests
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Determine if we should retry
      const errorInfo = {
        type: error.type || 'unknown',
        userMessage: error.message,
        logMessage: error.message
      };
      
      const shouldRetry = shouldAutoRetry(errorInfo);
      
      if (!shouldRetry || attempt === maxRetries) {
        // Don't retry or max retries reached
        logPaymentError(context, errorInfo, {
          ...metadata,
          attempt: attempt + 1,
          maxRetries,
          finalAttempt: true
        });
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = getRetryDelay(errorInfo, attempt);
      
      logPaymentError(context, errorInfo, {
        ...metadata,
        attempt: attempt + 1,
        maxRetries,
        retryingIn: `${delay}ms`
      });
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Queue request for later processing when API is unavailable
 * @param {Function} fn - Async function to execute
 * @param {Object} metadata - Request metadata
 * @returns {Promise} Promise that resolves when request is processed
 */
function queueRequest(fn, metadata = {}) {
  return new Promise((resolve, reject) => {
    // Check queue size
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
      const error = new Error('Request queue is full. Please try again later.');
      logPaymentError('QUEUE_FULL', {
        type: 'queue_full',
        userMessage: error.message,
        logMessage: 'Request queue exceeded maximum size'
      }, metadata);
      reject(error);
      return;
    }
    
    // Add to queue
    requestQueue.push({
      fn,
      metadata,
      resolve,
      reject,
      queuedAt: Date.now()
    });
    
    console.log(`📋 Request queued (${requestQueue.length} in queue):`, metadata);
    
    // Start processing queue if not already processing
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

/**
 * Process queued requests
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  console.log(`🔄 Processing request queue (${requestQueue.length} requests)...`);
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    
    try {
      // Check if request has been in queue too long (5 minutes)
      const queueTime = Date.now() - request.queuedAt;
      if (queueTime > 300000) {
        throw new Error('Request expired in queue');
      }
      
      // Try to execute the request
      const result = await withExponentialBackoff(request.fn, {
        context: 'QUEUED_REQUEST',
        metadata: request.metadata
      });
      
      request.resolve(result);
      console.log('✅ Queued request processed successfully:', request.metadata);
      
    } catch (error) {
      console.error('❌ Queued request failed:', request.metadata, error.message);
      request.reject(error);
    }
    
    // Wait a bit between processing requests to avoid overwhelming the API
    if (requestQueue.length > 0) {
      await sleep(1000);
    }
  }
  
  isProcessingQueue = false;
  console.log('✅ Request queue processing complete');
}

/**
 * Handle API call with automatic queuing on unavailability
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Options
 * @returns {Promise} Result of function execution
 */
async function handleApiCall(fn, options = {}) {
  const { metadata = {}, skipQueue = false } = options;
  
  try {
    // Try to execute with retry
    return await withExponentialBackoff(fn, {
      context: 'API_CALL',
      metadata
    });
    
  } catch (error) {
    // Check if API is unavailable
    if (error.message && (
      error.message.includes('unavailable') ||
      error.message.includes('service') ||
      error.message.includes('503')
    )) {
      apiAvailable = false;
      
      if (skipQueue) {
        throw error;
      }
      
      console.log('⚠️ M-Pesa API unavailable, queuing request:', metadata);
      
      // Queue the request for later
      return await queueRequest(fn, metadata);
    }
    
    // For other errors, just throw
    throw error;
  }
}

/**
 * Track callback retry attempt
 * @param {string} checkoutRequestID - Checkout request ID
 * @returns {number} Current retry count
 */
function trackCallbackRetry(checkoutRequestID) {
  const currentRetries = callbackRetries.get(checkoutRequestID) || 0;
  const newRetries = currentRetries + 1;
  callbackRetries.set(checkoutRequestID, newRetries);
  
  // Clean up old entries (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, value] of callbackRetries.entries()) {
    if (value.timestamp && value.timestamp < oneHourAgo) {
      callbackRetries.delete(key);
    }
  }
  
  return newRetries;
}

/**
 * Check if callback should be retried
 * @param {string} checkoutRequestID - Checkout request ID
 * @returns {boolean} Whether to retry
 */
function shouldRetryCallback(checkoutRequestID) {
  const retries = callbackRetries.get(checkoutRequestID) || 0;
  return retries < MAX_RETRIES;
}

/**
 * Get retry delay for callback with exponential backoff
 * @param {string} checkoutRequestID - Checkout request ID
 * @returns {number} Delay in milliseconds
 */
function getCallbackRetryDelay(checkoutRequestID) {
  const retries = callbackRetries.get(checkoutRequestID) || 0;
  // Exponential backoff: 5s, 10s, 20s
  return Math.min(5000 * Math.pow(2, retries), 20000);
}

/**
 * Schedule callback retry
 * @param {Function} fn - Callback processing function
 * @param {string} checkoutRequestID - Checkout request ID
 * @param {Object} metadata - Metadata for logging
 */
function scheduleCallbackRetry(fn, checkoutRequestID, metadata = {}) {
  if (!shouldRetryCallback(checkoutRequestID)) {
    console.error('❌ Max callback retries reached for:', checkoutRequestID);
    return;
  }
  
  const retryCount = trackCallbackRetry(checkoutRequestID);
  const delay = getCallbackRetryDelay(checkoutRequestID);
  
  console.log(`🔄 Scheduling callback retry ${retryCount}/${MAX_RETRIES} in ${delay}ms:`, metadata);
  
  setTimeout(async () => {
    try {
      await fn();
      console.log('✅ Callback retry successful:', metadata);
      // Clear retry tracking on success
      callbackRetries.delete(checkoutRequestID);
    } catch (error) {
      console.error('❌ Callback retry failed:', metadata, error.message);
      // Schedule another retry if possible
      scheduleCallbackRetry(fn, checkoutRequestID, metadata);
    }
  }, delay);
}

/**
 * Clear callback retry tracking
 * @param {string} checkoutRequestID - Checkout request ID
 */
function clearCallbackRetry(checkoutRequestID) {
  callbackRetries.delete(checkoutRequestID);
}

/**
 * Get queue status
 * @returns {Object} Queue status information
 */
function getQueueStatus() {
  return {
    queueLength: requestQueue.length,
    isProcessing: isProcessingQueue,
    apiAvailable,
    maxQueueSize: MAX_QUEUE_SIZE,
    callbackRetries: callbackRetries.size
  };
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Periodic queue processing (every 30 seconds)
setInterval(() => {
  if (!apiAvailable && requestQueue.length > 0) {
    console.log('🔄 Periodic queue check - attempting to process...');
    processQueue();
  }
}, QUEUE_PROCESS_INTERVAL);

module.exports = {
  withExponentialBackoff,
  queueRequest,
  handleApiCall,
  trackCallbackRetry,
  shouldRetryCallback,
  getCallbackRetryDelay,
  scheduleCallbackRetry,
  clearCallbackRetry,
  getQueueStatus,
  MAX_RETRIES
};
