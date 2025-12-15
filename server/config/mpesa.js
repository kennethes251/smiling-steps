const axios = require('axios');
const { mapApiError, logPaymentError } = require('../utils/mpesaErrorMapper');
const { handleApiCall } = require('../utils/mpesaRetryHandler');
const encryption = require('../utils/encryption');

class MpesaAPI {
  constructor() {
    // Load environment variables
    // Note: In production, these should be encrypted at rest in a secure vault
    // For now, we ensure they're loaded securely from environment
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    // Validate required configuration
    if (!this.consumerKey || !this.consumerSecret || !this.businessShortCode || !this.passkey) {
      throw new Error('Missing required M-Pesa configuration. Please check environment variables.');
    }
    
    // Set up base URL for sandbox/production
    this.baseURL = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    // Token caching
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  // Generate OAuth token with caching (50-minute expiry)
  async getAccessToken() {
    // Check if we have a valid cached token
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiry && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    // Use retry handler for token generation
    return await handleApiCall(async () => {
      try {
        // Generate new token
        const auth = Buffer.from(
          `${this.consumerKey}:${this.consumerSecret}`
        ).toString('base64');

        const response = await axios.get(
          `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
          {
            headers: {
              Authorization: `Basic ${auth}`
            }
          }
        );

        // Cache the token with 50-minute expiry (3000 seconds)
        this.cachedToken = response.data.access_token;
        this.tokenExpiry = now + (50 * 60 * 1000); // 50 minutes in milliseconds

        return this.cachedToken;
      } catch (error) {
        // Map and log authentication errors
        const errorCode = error.response?.status?.toString() || 'unknown';
        const errorInfo = mapApiError(errorCode);
        
        logPaymentError('AUTH', errorInfo, {
          statusCode: error.response?.status,
          errorData: error.response?.data,
          message: error.message
        });
        
        const err = new Error(errorInfo.userMessage);
        err.type = errorInfo.type;
        throw err;
      }
    }, {
      metadata: { operation: 'getAccessToken' }
    });
  }

  // Format phone number to M-Pesa format (254XXXXXXXXX)
  formatPhoneNumber(phone) {
    // Remove any whitespace and special characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Remove + prefix if present
    cleaned = cleaned.replace(/^\+/, '');
    
    // Handle 07XX format → 2547XX conversion
    if (cleaned.startsWith('07')) {
      return '254' + cleaned.substring(1);
    }
    
    // Handle 01XX format → 2541XX conversion
    if (cleaned.startsWith('01')) {
      return '254' + cleaned.substring(1);
    }
    
    // Handle already formatted 254XXX numbers
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // If none of the above, assume it needs 254 prefix
    return '254' + cleaned;
  }

  // Generate password for API authentication
  generatePassword(timestamp) {
    const password = Buffer.from(
      `${this.businessShortCode}${this.passkey}${timestamp}`
    ).toString('base64');
    return password;
  }

  // Get timestamp in M-Pesa format (YYYYMMDDHHmmss)
  getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Initiate STK Push
  async stkPush(phoneNumber, amount, accountReference, transactionDesc) {
    // Use retry handler for STK Push
    return await handleApiCall(async () => {
      try {
        // Get access token
        const accessToken = await this.getAccessToken();
        
        // Format timestamp in M-Pesa format
        const timestamp = this.getTimestamp();
        
        // Generate password for API authentication
        const password = this.generatePassword(timestamp);

        // Format phone number using formatPhoneNumber method
        const formattedPhone = this.formatPhoneNumber(phoneNumber);

        // Build STK Push request payload
        const payload = {
          BusinessShortCode: this.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(amount),
          PartyA: formattedPhone,
          PartyB: this.businessShortCode,
          PhoneNumber: formattedPhone,
          CallBackURL: this.callbackURL,
          AccountReference: accountReference,
          TransactionDesc: transactionDesc || 'Smiling Steps Therapy'
        };

        // Send STK Push request
        const response = await axios.post(
          `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Handle API response
        if (response.data.ResponseCode === '0') {
          return {
            success: true,
            CheckoutRequestID: response.data.CheckoutRequestID,
            MerchantRequestID: response.data.MerchantRequestID,
            ResponseDescription: response.data.ResponseDescription,
            CustomerMessage: response.data.CustomerMessage
          };
        } else {
          throw new Error(response.data.ResponseDescription || 'STK Push failed');
        }
      } catch (error) {
        // Map and log STK Push errors
        const errorCode = error.response?.data?.errorCode || error.response?.status?.toString();
        const errorInfo = errorCode ? mapApiError(errorCode) : {
          type: 'network_error',
          userMessage: 'Network error. Please check your connection and try again.',
          logMessage: 'Network error during STK Push'
        };
        
        logPaymentError('STK_PUSH', errorInfo, {
          errorCode,
          statusCode: error.response?.status,
          errorData: error.response?.data,
          message: error.message,
          phoneNumber: phoneNumber?.slice(-4), // Log only last 4 digits
          amount
        });
        
        const err = new Error(errorInfo.userMessage);
        err.type = errorInfo.type;
        throw err;
      }
    }, {
      metadata: { 
        operation: 'stkPush',
        phoneNumber: phoneNumber?.slice(-4),
        amount
      }
    });
  }

  // Query STK Push status
  async stkQuery(checkoutRequestID) {
    // Use retry handler for status query
    return await handleApiCall(async () => {
      try {
        // Get access token
        const accessToken = await this.getAccessToken();
        
        // Format timestamp
        const timestamp = this.getTimestamp();
        
        // Generate password
        const password = this.generatePassword(timestamp);

        // Build status query request
        const payload = {
          BusinessShortCode: this.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestID
        };

        // Send query request
        const response = await axios.post(
          `${this.baseURL}/mpesa/stkpushquery/v1/query`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Parse status response
        const data = response.data;
        
        return {
          ResponseCode: data.ResponseCode,
          ResponseDescription: data.ResponseDescription,
          MerchantRequestID: data.MerchantRequestID,
          CheckoutRequestID: data.CheckoutRequestID,
          ResultCode: data.ResultCode,
          ResultDesc: data.ResultDesc
        };
      } catch (error) {
        // Map and log query errors
        const errorCode = error.response?.status?.toString() || 'unknown';
        const errorInfo = mapApiError(errorCode);
        
        logPaymentError('STK_QUERY', errorInfo, {
          statusCode: error.response?.status,
          errorData: error.response?.data,
          message: error.message,
          checkoutRequestID
        });
        
        const err = new Error(errorInfo.userMessage);
        err.type = errorInfo.type;
        throw err;
      }
    }, {
      metadata: { 
        operation: 'stkQuery',
        checkoutRequestID
      }
    });
  }
}

module.exports = new MpesaAPI();
