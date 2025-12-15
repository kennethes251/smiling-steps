/**
 * M-Pesa Payment Integration - Unit Tests
 * 
 * Tests for:
 * - MpesaAPI methods
 * - Payment validation logic
 * - Error handling functions
 * - Phone number formatting
 */

const MpesaAPI = require('../config/mpesa');
const { 
  mapResultCode, 
  mapApiError, 
  formatErrorResponse, 
  getCallbackMessage,
  shouldAutoRetry,
  getRetryDelay
} = require('../utils/mpesaErrorMapper');

// Mock axios for API calls
jest.mock('axios');
const axios = require('axios');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    MPESA_CONSUMER_KEY: 'test_consumer_key',
    MPESA_CONSUMER_SECRET: 'test_consumer_secret',
    MPESA_BUSINESS_SHORT_CODE: '174379',
    MPESA_PASSKEY: 'test_passkey',
    MPESA_CALLBACK_URL: 'https://test.com/callback',
    MPESA_ENVIRONMENT: 'sandbox'
  };
  
  // Clear axios mocks
  axios.get.mockClear();
  axios.post.mockClear();
  
  // Clear MpesaAPI token cache
  if (MpesaAPI.cachedToken) {
    MpesaAPI.cachedToken = null;
    MpesaAPI.tokenExpiry = null;
  }
});

afterAll(() => {
  process.env = originalEnv;
});

describe('MpesaAPI Class', () => {
  
  describe('Constructor and Configuration', () => {
    it('should initialize with correct configuration', () => {
      expect(MpesaAPI.consumerKey).toBe('test_consumer_key');
      expect(MpesaAPI.consumerSecret).toBe('test_consumer_secret');
      expect(MpesaAPI.businessShortCode).toBe('174379');
      expect(MpesaAPI.passkey).toBe('test_passkey');
      expect(MpesaAPI.environment).toBe('sandbox');
      expect(MpesaAPI.baseURL).toBe('https://sandbox.safaricom.co.ke');
    });

    it('should throw error for missing configuration', () => {
      delete process.env.MPESA_CONSUMER_KEY;
      
      expect(() => {
        // Force re-instantiation by requiring fresh module
        jest.resetModul