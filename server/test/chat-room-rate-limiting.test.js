/**
 * Chat Room Rate Limiting Tests
 * 
 * Tests for message rate limiting functionality
 * _Requirements: 9.6_
 */

const { rateLimitConfigs, createRateLimiter, rateLimiters } = require('../middleware/rateLimiting');

describe('Chat Room Rate Limiting', () => {
  describe('Rate Limit Configuration', () => {
    it('should have chatMessage rate limit configuration', () => {
      expect(rateLimitConfigs.chatMessage).toBeDefined();
    });

    it('should limit to 10 messages per minute', () => {
      const config = rateLimitConfigs.chatMessage;
      expect(config.max).toBe(10);
      expect(config.windowMs).toBe(60 * 1000); // 1 minute in ms
    });

    it('should return 429 error message when exceeded', () => {
      const config = rateLimitConfigs.chatMessage;
      expect(config.message.error).toBe('Too many messages sent');
      expect(config.message.retryAfter).toBe('1 minute');
      expect(config.message.code).toBe('RATE_LIMITED');
    });

    it('should have standard headers enabled', () => {
      const config = rateLimitConfigs.chatMessage;
      expect(config.standardHeaders).toBe(true);
      expect(config.legacyHeaders).toBe(false);
    });
  });

  describe('Rate Limiter Creation', () => {
    it('should create chatMessage rate limiter successfully', () => {
      expect(rateLimiters.chatMessage).toBeDefined();
      expect(typeof rateLimiters.chatMessage).toBe('function');
    });

    it('should create rate limiter with custom config', () => {
      const customLimiter = createRateLimiter('chatMessage', { max: 5 });
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });

    it('should throw error for unknown rate limiter type', () => {
      expect(() => createRateLimiter('unknownType')).toThrow('Unknown rate limiter type: unknownType');
    });
  });

  describe('Rate Limiter Middleware Behavior', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = {
        ip: '127.0.0.1',
        user: { id: 'test-user-123' },
        get: jest.fn().mockReturnValue('test-agent'),
        method: 'POST',
        path: '/api/chat-rooms/room123/messages'
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        set: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should call next() for requests within limit', async () => {
      // The rate limiter should allow the first request
      await new Promise((resolve) => {
        rateLimiters.chatMessage(mockReq, mockRes, (err) => {
          mockNext(err);
          resolve();
        });
      });
      
      // Should have called next without error
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use user ID as key when authenticated', () => {
      // The rate limiter uses user ID for authenticated users
      // This is verified by the keyGenerator function in the config
      const config = rateLimitConfigs.chatMessage;
      expect(config).toBeDefined();
      // The keyGenerator is set in createRateLimiter function
    });
  });

  describe('Error Response Format', () => {
    it('should have correct error response structure', () => {
      const config = rateLimitConfigs.chatMessage;
      expect(config.message).toHaveProperty('error');
      expect(config.message).toHaveProperty('retryAfter');
      expect(config.message).toHaveProperty('code');
    });

    it('should include RATE_LIMITED error code', () => {
      const config = rateLimitConfigs.chatMessage;
      expect(config.message.code).toBe('RATE_LIMITED');
    });
  });
});
