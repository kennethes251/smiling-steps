import {
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_MESSAGES,
  getErrorInfo,
  formatErrorForDisplay,
  getRetryDelay,
  shouldAutoRetry,
  generateErrorReport,
  logError
} from './videoCallErrors';

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.group = jest.fn();
  console.error = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Mock navigator and window
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  writable: true
});

Object.defineProperty(window, 'location', {
  value: { href: 'https://example.com/video-call' },
  writable: true
});

describe('videoCallErrors utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ERROR_CATEGORIES', () => {
    test('contains all expected categories', () => {
      expect(ERROR_CATEGORIES.PERMISSION).toBe('permission');
      expect(ERROR_CATEGORIES.CONNECTION).toBe('connection');
      expect(ERROR_CATEGORIES.AUTHENTICATION).toBe('authentication');
      expect(ERROR_CATEGORIES.SESSION).toBe('session');
      expect(ERROR_CATEGORIES.MEDIA).toBe('media');
      expect(ERROR_CATEGORIES.NETWORK).toBe('network');
      expect(ERROR_CATEGORIES.BROWSER).toBe('browser');
      expect(ERROR_CATEGORIES.SYSTEM).toBe('system');
    });
  });

  describe('ERROR_SEVERITY', () => {
    test('contains all severity levels', () => {
      expect(ERROR_SEVERITY.LOW).toBe('low');
      expect(ERROR_SEVERITY.MEDIUM).toBe('medium');
      expect(ERROR_SEVERITY.HIGH).toBe('high');
      expect(ERROR_SEVERITY.CRITICAL).toBe('critical');
    });
  });

  describe('getErrorInfo', () => {
    test('handles NotAllowedError correctly', () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.PERMISSION);
      expect(errorInfo.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(errorInfo.title).toBe('Camera and Microphone Access Required');
      expect(errorInfo.recoverable).toBe(true);
      expect(errorInfo.showRetry).toBe(true);
    });

    test('handles NotFoundError correctly', () => {
      const error = new Error('Device not found');
      error.name = 'NotFoundError';
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.MEDIA);
      expect(errorInfo.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(errorInfo.title).toBe('Camera or Microphone Not Found');
    });

    test('handles string error keys', () => {
      const errorInfo = getErrorInfo('connection-failed');
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.CONNECTION);
      expect(errorInfo.title).toBe('Connection Failed');
    });

    test('handles error objects with message patterns', () => {
      const error = new Error('unauthorized access');
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);
    });

    test('falls back to system error for unknown errors', () => {
      const error = new Error('Unknown error');
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.SYSTEM);
      expect(errorInfo.title).toBe('System Error');
    });

    test('includes timestamp and original error', () => {
      const error = new Error('Test error');
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.timestamp).toBeDefined();
      expect(errorInfo.originalError).toBe(error);
      expect(errorInfo.errorKey).toBe('system-error');
    });
  });

  describe('formatErrorForDisplay', () => {
    test('formats error for UI display', () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted.title).toBe('Camera and Microphone Access Required');
      expect(formatted.message).toBe('We need permission to use your camera and microphone for the video session.');
      expect(formatted.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(formatted.solutions).toBeInstanceOf(Array);
      expect(formatted.solutions.length).toBeGreaterThan(0);
    });

    test('includes technical details', () => {
      const error = new Error('Connection failed');
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted.technicalDetails).toBeDefined();
    });
  });

  describe('getRetryDelay', () => {
    test('returns correct delay for permission errors', () => {
      const errorInfo = { category: ERROR_CATEGORIES.PERMISSION };
      
      const delay = getRetryDelay(errorInfo);
      
      expect(delay).toBe(0);
    });

    test('returns correct delay for connection errors', () => {
      const errorInfo = { category: ERROR_CATEGORIES.CONNECTION };
      
      const delay = getRetryDelay(errorInfo);
      
      expect(delay).toBe(3000);
    });

    test('returns correct delay for network errors', () => {
      const errorInfo = { category: ERROR_CATEGORIES.NETWORK };
      
      const delay = getRetryDelay(errorInfo);
      
      expect(delay).toBe(5000);
    });

    test('returns default delay for unknown categories', () => {
      const errorInfo = { category: 'unknown' };
      
      const delay = getRetryDelay(errorInfo);
      
      expect(delay).toBe(1000);
    });
  });

  describe('shouldAutoRetry', () => {
    test('allows retry for recoverable connection errors', () => {
      const errorInfo = {
        category: ERROR_CATEGORIES.CONNECTION,
        recoverable: true
      };
      
      const shouldRetry = shouldAutoRetry(errorInfo, 0);
      
      expect(shouldRetry).toBe(true);
    });

    test('prevents retry after max attempts', () => {
      const errorInfo = {
        category: ERROR_CATEGORIES.CONNECTION,
        recoverable: true
      };
      
      const shouldRetry = shouldAutoRetry(errorInfo, 3);
      
      expect(shouldRetry).toBe(false);
    });

    test('prevents retry for non-recoverable errors', () => {
      const errorInfo = {
        category: ERROR_CATEGORIES.AUTHENTICATION,
        recoverable: false
      };
      
      const shouldRetry = shouldAutoRetry(errorInfo, 0);
      
      expect(shouldRetry).toBe(false);
    });

    test('prevents retry for non-auto-retry categories', () => {
      const errorInfo = {
        category: ERROR_CATEGORIES.PERMISSION,
        recoverable: true
      };
      
      const shouldRetry = shouldAutoRetry(errorInfo, 0);
      
      expect(shouldRetry).toBe(false);
    });
  });

  describe('generateErrorReport', () => {
    test('generates comprehensive error report', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const context = { sessionId: 'test-session' };
      
      const report = generateErrorReport(error, context);
      
      expect(report.timestamp).toBeDefined();
      expect(report.errorKey).toBe('system-error');
      expect(report.category).toBe(ERROR_CATEGORIES.SYSTEM);
      expect(report.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(report.userAgent).toBe(navigator.userAgent);
      expect(report.url).toBe(window.location.href);
      expect(report.context).toBe(context);
      expect(report.originalError.name).toBe('Error');
      expect(report.originalError.message).toBe('Test error');
      expect(report.originalError.stack).toBe('Error stack trace');
    });

    test('handles missing context', () => {
      const error = new Error('Test error');
      
      const report = generateErrorReport(error);
      
      expect(report.context).toEqual({});
    });
  });

  describe('logError', () => {
    test('logs error in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      const context = { sessionId: 'test-session' };
      
      const report = logError(error, context);
      
      expect(console.group).toHaveBeenCalledWith('🚨 Video Call Error');
      expect(console.error).toHaveBeenCalledWith('Error Info:', expect.any(Object));
      expect(console.error).toHaveBeenCalledWith('Original Error:', error);
      expect(console.groupEnd).toHaveBeenCalled();
      expect(report).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('does not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      
      const report = logError(error);
      
      expect(console.group).not.toHaveBeenCalled();
      expect(report).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('ERROR_MESSAGES coverage', () => {
    test('all error messages have required fields', () => {
      Object.entries(ERROR_MESSAGES).forEach(([key, errorConfig]) => {
        expect(errorConfig.category).toBeDefined();
        expect(errorConfig.severity).toBeDefined();
        expect(errorConfig.title).toBeDefined();
        expect(errorConfig.message).toBeDefined();
        expect(errorConfig.solutions).toBeInstanceOf(Array);
        expect(typeof errorConfig.recoverable).toBe('boolean');
        expect(typeof errorConfig.showRetry).toBe('boolean');
      });
    });

    test('session errors have appropriate configuration', () => {
      const sessionErrors = [
        'session-not-found',
        'payment-not-confirmed',
        'session-cancelled',
        'session-too-early',
        'session-expired'
      ];

      sessionErrors.forEach(errorKey => {
        const errorConfig = ERROR_MESSAGES[errorKey];
        expect(errorConfig.category).toBe(ERROR_CATEGORIES.SESSION);
      });
    });

    test('permission errors have appropriate configuration', () => {
      const permissionErrors = ['NotAllowedError', 'screen-share-denied'];

      permissionErrors.forEach(errorKey => {
        const errorConfig = ERROR_MESSAGES[errorKey];
        expect(errorConfig.category).toBe(ERROR_CATEGORIES.PERMISSION);
      });
    });

    test('media errors have appropriate configuration', () => {
      const mediaErrors = ['NotFoundError', 'NotReadableError', 'OverconstrainedError'];

      mediaErrors.forEach(errorKey => {
        const errorConfig = ERROR_MESSAGES[errorKey];
        expect(errorConfig.category).toBe(ERROR_CATEGORIES.MEDIA);
      });
    });
  });

  describe('error message patterns', () => {
    test('detects permission errors from message', () => {
      const error = new Error('permission denied by user');
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.PERMISSION);
    });

    test('detects connection errors from message', () => {
      const error = new Error('network connection failed');
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.CONNECTION);
    });

    test('detects session errors from message', () => {
      const error = new Error('session not found in database');
      
      const errorInfo = getErrorInfo(error);
      
      expect(errorInfo.category).toBe(ERROR_CATEGORIES.SESSION);
    });
  });
});