/**
 * Video Call Error Handling Utilities
 * Provides user-friendly error messages and recovery suggestions
 */

// Error categories for better organization
export const ERROR_CATEGORIES = {
  PERMISSION: 'permission',
  CONNECTION: 'connection',
  AUTHENTICATION: 'authentication',
  SESSION: 'session',
  MEDIA: 'media',
  NETWORK: 'network',
  BROWSER: 'browser',
  SYSTEM: 'system'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Comprehensive error message mappings
export const ERROR_MESSAGES = {
  // Permission Errors
  'NotAllowedError': {
    category: ERROR_CATEGORIES.PERMISSION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Camera and Microphone Access Required',
    message: 'Please allow access to your camera and microphone to join the video call.',
    userMessage: 'We need permission to use your camera and microphone for the video session.',
    solutions: [
      'Click the camera icon in your browser\'s address bar',
      'Select "Allow" for camera and microphone permissions',
      'Refresh the page and try again',
      'Check if another application is using your camera'
    ],
    technicalDetails: 'Browser denied media device access',
    recoverable: true,
    showRetry: true
  },
  
  'NotFoundError': {
    category: ERROR_CATEGORIES.MEDIA,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Camera or Microphone Not Found',
    message: 'No camera or microphone was detected on your device.',
    userMessage: 'We couldn\'t find a camera or microphone connected to your device.',
    solutions: [
      'Check that your camera and microphone are properly connected',
      'Try unplugging and reconnecting your devices',
      'Restart your browser',
      'Check your device settings to ensure the camera/microphone is enabled'
    ],
    technicalDetails: 'No media input devices available',
    recoverable: true,
    showRetry: true
  },
  
  'NotReadableError': {
    category: ERROR_CATEGORIES.MEDIA,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Camera or Microphone Unavailable',
    message: 'Your camera or microphone is being used by another application.',
    userMessage: 'Another application is currently using your camera or microphone.',
    solutions: [
      'Close other video calling applications (Zoom, Teams, Skype, etc.)',
      'Close other browser tabs that might be using your camera',
      'Restart your browser',
      'Restart your computer if the issue persists'
    ],
    technicalDetails: 'Media device is already in use or hardware error',
    recoverable: true,
    showRetry: true
  },
  
  'OverconstrainedError': {
    category: ERROR_CATEGORIES.MEDIA,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Camera Settings Not Supported',
    message: 'Your camera doesn\'t support the required video quality settings.',
    userMessage: 'Your camera doesn\'t support the video quality we\'re trying to use.',
    solutions: [
      'We\'ll automatically try with lower quality settings',
      'Update your camera drivers',
      'Try using a different camera if available'
    ],
    technicalDetails: 'Camera constraints cannot be satisfied',
    recoverable: true,
    showRetry: true
  },
  
  // Connection Errors
  'connection-failed': {
    category: ERROR_CATEGORIES.CONNECTION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Connection Failed',
    message: 'Unable to establish a connection with the other participant.',
    userMessage: 'We\'re having trouble connecting you to the video call.',
    solutions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN if you\'re using one',
      'Try switching to a different network (mobile hotspot)',
      'Contact support if the problem continues'
    ],
    technicalDetails: 'WebRTC peer connection failed',
    recoverable: true,
    showRetry: true
  },
  
  'signaling-error': {
    category: ERROR_CATEGORIES.CONNECTION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Signaling Server Error',
    message: 'Lost connection to the call coordination server.',
    userMessage: 'We\'re having trouble coordinating your call connection.',
    solutions: [
      'Check your internet connection',
      'Refresh the page to reconnect',
      'Try again in a few moments',
      'Contact support if this continues'
    ],
    technicalDetails: 'Socket.io signaling server connection failed',
    recoverable: true,
    showRetry: true
  },
  
  // Authentication Errors
  'unauthorized': {
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.CRITICAL,
    title: 'Access Denied',
    message: 'You don\'t have permission to join this video call.',
    userMessage: 'You\'re not authorized to join this video session.',
    solutions: [
      'Make sure you\'re logged in with the correct account',
      'Verify this is your scheduled session',
      'Contact support if you believe this is an error'
    ],
    technicalDetails: 'User not authorized for this session',
    recoverable: false,
    showRetry: false
  },
  
  'session-not-found': {
    category: ERROR_CATEGORIES.SESSION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Session Not Found',
    message: 'The video call session could not be found.',
    userMessage: 'We couldn\'t find the video session you\'re trying to join.',
    solutions: [
      'Check that you\'re using the correct session link',
      'Verify the session hasn\'t been cancelled',
      'Contact your therapist or support for assistance'
    ],
    technicalDetails: 'Session ID not found in database',
    recoverable: false,
    showRetry: false
  },
  
  'payment-not-confirmed': {
    category: ERROR_CATEGORIES.SESSION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Payment Required',
    message: 'Payment must be confirmed before joining the video call.',
    userMessage: 'Your session payment needs to be confirmed before you can join.',
    solutions: [
      'Complete your payment in the dashboard',
      'Wait for payment confirmation (this may take a few minutes)',
      'Contact support if payment was already made'
    ],
    technicalDetails: 'Session payment status not confirmed',
    recoverable: true,
    showRetry: false
  },
  
  'session-cancelled': {
    category: ERROR_CATEGORIES.SESSION,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Session Cancelled',
    message: 'This session has been cancelled and cannot be joined.',
    userMessage: 'This therapy session has been cancelled.',
    solutions: [
      'Check your dashboard for rescheduled sessions',
      'Contact your therapist to reschedule',
      'Book a new session if needed'
    ],
    technicalDetails: 'Session status is cancelled',
    recoverable: false,
    showRetry: false
  },
  
  'session-too-early': {
    category: ERROR_CATEGORIES.SESSION,
    severity: ERROR_SEVERITY.LOW,
    title: 'Session Not Ready',
    message: 'You can join the call 15 minutes before your scheduled time.',
    userMessage: 'Your session isn\'t ready to join yet.',
    solutions: [
      'Wait until 15 minutes before your scheduled session time',
      'Check the session time in your dashboard',
      'Set a reminder to join closer to the session time'
    ],
    technicalDetails: 'Session join window not open yet',
    recoverable: true,
    showRetry: true
  },
  
  'session-expired': {
    category: ERROR_CATEGORIES.SESSION,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Session Expired',
    message: 'This session ended more than 2 hours ago and can no longer be joined.',
    userMessage: 'This session has expired and can no longer be joined.',
    solutions: [
      'Contact your therapist if you missed the session',
      'Book a new session for future appointments',
      'Check your dashboard for upcoming sessions'
    ],
    technicalDetails: 'Session is outside the 2-hour join window',
    recoverable: false,
    showRetry: false
  },
  
  // Network Errors
  'network-error': {
    category: ERROR_CATEGORIES.NETWORK,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Network Connection Issue',
    message: 'Poor network connection is affecting the video call quality.',
    userMessage: 'Your internet connection seems unstable.',
    solutions: [
      'Move closer to your WiFi router',
      'Close other applications using internet',
      'Switch to a wired connection if possible',
      'Try turning off video to improve audio quality',
      'Consider rescheduling if connection doesn\'t improve'
    ],
    technicalDetails: 'Network connectivity issues detected',
    recoverable: true,
    showRetry: true
  },
  
  // Browser Compatibility
  'browser-not-supported': {
    category: ERROR_CATEGORIES.BROWSER,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Browser Not Supported',
    message: 'Your browser doesn\'t support video calling features.',
    userMessage: 'Your current browser doesn\'t support video calls.',
    solutions: [
      'Use Chrome, Firefox, Safari, or Edge (latest versions)',
      'Update your browser to the latest version',
      'Enable JavaScript if it\'s disabled',
      'Try using a different device'
    ],
    technicalDetails: 'WebRTC not supported in current browser',
    recoverable: true,
    showRetry: false
  },
  
  // Screen Sharing Errors
  'screen-share-denied': {
    category: ERROR_CATEGORIES.PERMISSION,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Screen Sharing Permission Denied',
    message: 'Screen sharing permission was denied.',
    userMessage: 'You chose not to share your screen.',
    solutions: [
      'Click the screen share button again to try',
      'Select "Allow" when prompted for screen sharing',
      'Make sure you select the correct screen or window'
    ],
    technicalDetails: 'getDisplayMedia permission denied',
    recoverable: true,
    showRetry: true
  },
  
  'screen-share-error': {
    category: ERROR_CATEGORIES.MEDIA,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Screen Sharing Failed',
    message: 'Unable to start screen sharing.',
    userMessage: 'We couldn\'t start screen sharing.',
    solutions: [
      'Try again in a moment',
      'Make sure no other applications are sharing your screen',
      'Restart your browser if the issue persists'
    ],
    technicalDetails: 'getDisplayMedia API error',
    recoverable: true,
    showRetry: true
  },
  
  // System Errors
  'system-error': {
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.HIGH,
    title: 'System Error',
    message: 'An unexpected error occurred. Please try again.',
    userMessage: 'Something went wrong on our end.',
    solutions: [
      'Refresh the page and try again',
      'Clear your browser cache and cookies',
      'Try again in a few minutes',
      'Contact support if the problem continues'
    ],
    technicalDetails: 'Unhandled system error',
    recoverable: true,
    showRetry: true
  }
};

/**
 * Get user-friendly error information based on error type or message
 */
export const getErrorInfo = (error) => {
  // Handle different error input types
  let errorKey = null;
  let originalError = error;
  
  if (typeof error === 'string') {
    errorKey = error;
  } else if (error?.name) {
    errorKey = error.name;
  } else if (error?.message) {
    // Try to match common error message patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      errorKey = 'NotAllowedError';
    } else if (message.includes('not found') || message.includes('session not found')) {
      errorKey = 'session-not-found';
    } else if (message.includes('unauthorized')) {
      errorKey = 'unauthorized';
    } else if (message.includes('payment')) {
      errorKey = 'payment-not-confirmed';
    } else if (message.includes('cancelled')) {
      errorKey = 'session-cancelled';
    } else if (message.includes('connection') || message.includes('network')) {
      errorKey = 'connection-failed';
    } else if (message.includes('signaling')) {
      errorKey = 'signaling-error';
    } else if (message.includes('screen')) {
      errorKey = 'screen-share-error';
    } else {
      errorKey = 'system-error';
    }
  } else {
    errorKey = 'system-error';
  }
  
  // Get error info or fallback to system error
  const errorInfo = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES['system-error'];
  
  return {
    ...errorInfo,
    originalError,
    errorKey,
    timestamp: new Date().toISOString()
  };
};

/**
 * Format error for display in UI components
 */
export const formatErrorForDisplay = (error) => {
  const errorInfo = getErrorInfo(error);
  
  return {
    title: errorInfo.title,
    message: errorInfo.userMessage || errorInfo.message,
    severity: errorInfo.severity,
    category: errorInfo.category,
    solutions: errorInfo.solutions,
    recoverable: errorInfo.recoverable,
    showRetry: errorInfo.showRetry,
    technicalDetails: errorInfo.technicalDetails
  };
};

/**
 * Get appropriate retry delay based on error type
 */
export const getRetryDelay = (errorInfo) => {
  switch (errorInfo.category) {
    case ERROR_CATEGORIES.PERMISSION:
      return 0; // No delay for permission errors
    case ERROR_CATEGORIES.CONNECTION:
      return 3000; // 3 seconds for connection errors
    case ERROR_CATEGORIES.NETWORK:
      return 5000; // 5 seconds for network errors
    case ERROR_CATEGORIES.SYSTEM:
      return 2000; // 2 seconds for system errors
    default:
      return 1000; // 1 second default
  }
};

/**
 * Check if error should trigger automatic retry
 */
export const shouldAutoRetry = (errorInfo, retryCount = 0) => {
  const maxRetries = 3;
  
  if (retryCount >= maxRetries) {
    return false;
  }
  
  // Only auto-retry certain types of errors
  const autoRetryCategories = [
    ERROR_CATEGORIES.CONNECTION,
    ERROR_CATEGORIES.NETWORK,
    ERROR_CATEGORIES.SYSTEM
  ];
  
  return autoRetryCategories.includes(errorInfo.category) && errorInfo.recoverable;
};

/**
 * Generate error report for support/debugging
 */
export const generateErrorReport = (error, context = {}) => {
  const errorInfo = getErrorInfo(error);
  
  return {
    timestamp: new Date().toISOString(),
    errorKey: errorInfo.errorKey,
    category: errorInfo.category,
    severity: errorInfo.severity,
    userAgent: navigator.userAgent,
    url: window.location.href,
    context,
    technicalDetails: errorInfo.technicalDetails,
    originalError: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    }
  };
};

/**
 * Log error for analytics/monitoring
 */
export const logError = (error, context = {}) => {
  const errorReport = generateErrorReport(error, context);
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Video Call Error');
    console.error('Error Info:', errorReport);
    console.error('Original Error:', error);
    console.groupEnd();
  }
  
  // In production, you might want to send to an error tracking service
  // Example: Sentry, LogRocket, etc.
  
  return errorReport;
};

export default {
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_MESSAGES,
  getErrorInfo,
  formatErrorForDisplay,
  getRetryDelay,
  shouldAutoRetry,
  generateErrorReport,
  logError
};