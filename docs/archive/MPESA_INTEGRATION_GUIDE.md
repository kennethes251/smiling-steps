# 📱 M-Pesa STK Push Integration Guide
## Automated Mobile Payment for Your Therapy Booking Platform

---

## 📋 Project Details

**Web App Name**: Smiling Steps - Mental Health Platform  
**Technology Stack**: 
- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: React + Material-UI
- Current Server: `server/index-mongodb.js`

**Target User Base**: Kenyan clients booking therapy sessions  
**Payment Amounts**: KSh 1,500 - 4,500 (based on session type)

**Desired Workflow**:
1. Client books session → Therapist approves
2. Client receives M-Pesa STK push prompt on phone
3. Client enters M-Pesa PIN to complete payment
4. System automatically confirms session
5. Both parties receive confirmation

---

## 🎯 What We're Building

**M-Pesa STK Push (Lipa Na M-Pesa Online)** - The customer receives a payment prompt on their phone, enters their PIN, and payment is processed automatically.

**Benefits**:
- No manual screenshot uploads
- Instant payment verification
- Better user experience
- Reduced fraud
- Automatic reconciliation

---

## 📚 Prerequisites

### 1. Safaricom Daraja Account
- Register at: https://developer.safaricom.co.ke
- Create an app to get credentials
- Choose "Lipa Na M-Pesa Online" product

### 2. Required Credentials
You'll need these from Daraja:
- **Consumer Key** (like a username)
- **Consumer Secret** (like a password)
- **Business Short Code** (your M-Pesa till/paybill number)
- **Passkey** (for STK push)
- **Callback URL** (your server endpoint)

---

## 🔧 STEP 1: Install Dependencies

```bash
npm install mpesa-api axios
```

This package simplifies M-Pesa integration with proper error handling.

---

## 🔐 STEP 2: Set Up Environment Variables

Add to your `.env` file:

```env
# M-Pesa Daraja API Credentials (Sandbox/Test)
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# For Production
# MPESA_ENVIRONMENT=production
# MPESA_BUSINESS_SHORT_CODE=your_actual_paybill
```

⚠️ **Security**: Never commit `.env` to Git!

---

## 🏗️ STEP 3: Create M-Pesa Configuration

Create `server/config/mpesa.js`:

```javascript
const axios = require('axios');

class MpesaAPI {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    // API URLs
    this.baseURL = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  // Generate OAuth token
  async getAccessToken() {
    try {
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

      return response.data.access_token;
    } catch (error) {
      console.error('M-Pesa Auth Error:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  // Generate password for STK push
  generatePassword() {
    const timestamp = this.getTimestamp();
    const password = Buffer.from(
      `${this.businessShortCode}${this.passkey}${timestamp}`
    ).toString('base64');
    return { password, timestamp };
  }

  // Get timestamp in format YYYYMMDDHHmmss
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
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      // Format phone number (remove + and ensure 254 prefix)
      const formattedPhone = phoneNumber.replace(/\+/g, '').replace(/^0/, '254');

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Must be integer
        PartyA: formattedPhone, // Customer phone
        PartyB: this.businessShortCode, // Your business
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: accountReference, // e.g., "SESSION123"
        TransactionDesc: transactionDesc || 'Therapy Session Payment'
      };

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

      return response.data;
    } catch (error) {
      console.error('STK Push Error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment'
      );
    }
  }

  // Query STK Push status
  async stkQuery(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

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

      return response.data;
    } catch (error) {
      console.error('STK Query Error:', error.response?.data || error.message);
      throw new Error('Failed to query payment status');
    }
  }
}

module.exports = new MpesaAPI();
```

---

## 🛣️ STEP 4: Create M-Pesa Routes

Create `server/routes/mpesa.js`:

```javascript
const express = require('express');
const router = express.Router();
const mpesaAPI = require('../config/mpesa');
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');

// @route   POST api/mpesa/initiate
// @desc    Initiate M-Pesa STK Push for session payment
// @access  Private (Client only)
router.post('/initiate', auth, async (req, res) => {
  try {
    const { sessionId, phoneNumber } = req.body;

    // Validate phone number
    if (!phoneNumber || !/^(254|0)[17]\d{8}$/.test(phoneNumber.replace(/\+/g, ''))) {
      return res.status(400).json({ 
        msg: 'Invalid phone number. Use format: 0712345678 or 254712345678' 
      });
    }

    // Get session details
    const session = await Session.findById(sessionId)
      .populate('client', 'name email')
      .populate('psychologist', 'name');

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Verify user is the client
    if (session.client._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check session status
    if (session.status !== 'Approved') {
      return res.status(400).json({ 
        msg: 'Session must be approved before payment'    
   });
    }

    // Check if already paid
    if (session.paymentStatus === 'Paid') {
      return res.status(400).json({ msg: 'Session already paid' });
    }

    // Initiate STK Push
    const accountReference = `SESSION-${session._id.toString().slice(-8)}`;
    const transactionDesc = `${session.sessionType} Therapy with Dr. ${session.psychologist.name}`;

    const mpesaResponse = await mpesaAPI.stkPush(
      phoneNumber,
      session.price,
      accountReference,
      transactionDesc
    );

    // Save M-Pesa details to session
    session.mpesaCheckoutRequestID = mpesaResponse.CheckoutRequestID;
    session.mpesaMerchantRequestID = mpesaResponse.MerchantRequestID;
    session.mpesaPhoneNumber = phoneNumber;
    session.paymentStatus = 'Processing';
    await session.save();

    console.log('✅ M-Pesa STK Push initiated:', {
      sessionId: session._id,
      checkoutRequestID: mpesaResponse.CheckoutRequestID,
      amount: session.price
    });

    res.json({
      success: true,
      msg: 'Payment prompt sent to your phone. Please enter your M-Pesa PIN.',
      checkoutRequestID: mpesaResponse.CheckoutRequestID,
      merchantRequestID: mpesaResponse.MerchantRequestID
    });

  } catch (error) {
    console.error('M-Pesa Initiation Error:', error);
    res.status(500).json({ 
      msg: error.message || 'Failed to initiate payment',
      error: error.toString()
    });
  }
});

// @route   POST api/mpesa/callback
// @desc    M-Pesa callback endpoint (called by Safaricom)
// @access  Public (but should validate source)
router.post('/callback', async (req, res) => {
  console.log('📱 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

  try {
    const { Body } = req.body;
    const { stkCallback } = Body;

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    // Find session by CheckoutRequestID
    const session = await Session.findOne({ 
      mpesaCheckoutRequestID: CheckoutRequestID 
    });

    if (!session) {
      console.error('❌ Session not found for CheckoutRequestID:', CheckoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Payment successful
    if (ResultCode === 0) {
      // Extract payment details from metadata
      const metadata = {};
      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach(item => {
          metadata[item.Name] = item.Value;
        });
      }

      // Update session
      session.status = 'Confirmed';
      session.paymentStatus = 'Paid';
      session.paymentMethod = 'mpesa';
      session.mpesaTransactionID = metadata.MpesaReceiptNumber;
      session.mpesaAmount = metadata.Amount;
      session.mpesaPhoneNumber = metadata.PhoneNumber;
      session.paymentVerifiedAt = new Date();
      session.mpesaResultCode = ResultCode;
      session.mpesaResultDesc = ResultDesc;

      await session.save();

      console.log('✅ Payment Successful:', {
        sessionId: session._id,
        transactionID: metadata.MpesaReceiptNumber,
        amount: metadata.Amount
      });

      // TODO: Send confirmation SMS/Email to client and psychologist

    } else {
      // Payment failed or cancelled
      session.paymentStatus = 'Failed';
      session.mpesaResultCode = ResultCode;
      session.mpesaResultDesc = ResultDesc;
      await session.save();

      console.log('❌ Payment Failed:', {
        sessionId: session._id,
        resultCode: ResultCode,
        resultDesc: ResultDesc
      });

      // TODO: Notify client of failed payment
    }

    // Always respond with success to Safaricom
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  } catch (error) {
    console.error('Callback Processing Error:', error);
    // Still respond with success to avoid retries
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// @route   GET api/mpesa/status/:sessionId
// @desc    Check payment status for a session
// @access  Private
router.get('/status/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Check authorization
    if (session.client.toString() !== req.user.id && 
        session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // If payment is processing, query M-Pesa
    if (session.paymentStatus === 'Processing' && session.mpesaCheckoutRequestID) {
      try {
        const queryResult = await mpesaAPI.stkQuery(session.mpesaCheckoutRequestID);
        
        // Update based on query result
        if (queryResult.ResultCode === '0') {
          session.paymentStatus = 'Paid';
          session.status = 'Confirmed';
          await session.save();
        } else if (queryResult.ResultCode !== '1032') { // 1032 = still processing
          session.paymentStatus = 'Failed';
          await session.save();
        }
      } catch (queryError) {
        console.error('Status query error:', queryError);
      }
    }

    res.json({
      paymentStatus: session.paymentStatus,
      paymentMethod: session.paymentMethod,
      amount: session.price,
      mpesaTransactionID: session.mpesaTransactionID,
      mpesaResultDesc: session.mpesaResultDesc
    });

  } catch (error) {
    console.error('Status Check Error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/mpesa/test-connection
// @desc    Test M-Pesa API connection
// @access  Private (Admin only)
router.post('/test-connection', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }

    const token = await mpesaAPI.getAccessToken();
    
    res.json({
      success: true,
      msg: 'M-Pesa API connection successful',
      environment: process.env.MPESA_ENVIRONMENT,
      tokenReceived: !!token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: 'M-Pesa API connection failed',
      error: error.message
    });
  }
});

module.exports = router;
```

---

## 📊 STEP 5: Update Session Model

Add M-Pesa fields to `server/models/Session.js`:

```javascript
// Add these fields to your SessionSchema

// M-Pesa payment fields
mpesaCheckoutRequestID: {
  type: String,
  trim: true
},
mpesaMerchantRequestID: {
  type: String,
  trim: true
},
mpesaTransactionID: {
  type: String,
  trim: true
},
mpesaAmount: {
  type: Number
},
mpesaPhoneNumber: {
  type: String,
  trim: true
},
mpesaResultCode: {
  type: Number
},
mpesaResultDesc: {
  type: String,
  trim: true
},
paymentMethod: {
  type: String,
  enum: ['mpesa', 'stripe', 'cash', 'manual'],
  default: 'mpesa'
}
```

---

## 🔌 STEP 6: Register M-Pesa Routes

In `server/index-mongodb.js`, add:

```javascript
// Add with other route imports
const mpesaRoutes = require('./routes/mpesa');

// Add with other route registrations
app.use('/api/mpesa', mpesaRoutes);

// IMPORTANT: For M-Pesa callback, you need raw body
// Add this BEFORE other middleware
app.use('/api/mpesa/callback', express.raw({ type: 'application/json' }));
```

---

## 🎨 STEP 7: Frontend Implementation

### 7.1 Update API Endpoints

In `client/src/config/api.js`:

```javascript
export const API_ENDPOINTS = {
  // ... existing endpoints
  MPESA: `${API_BASE_URL}/api/mpesa`,
};
```

### 7.2 Create M-Pesa Payment Component

Create `client/src/components/MpesaPayment.js`:

```javascript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  PhoneAndroid as PhoneIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const MpesaPayment = ({ sessionId, amount, onSuccess, onError }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, failed
  const [checkoutRequestID, setCheckoutRequestID] = useState('');

  const steps = ['Enter Phone', 'Confirm on Phone', 'Payment Complete'];
  const [activeStep, setActiveStep] = useState(0);

  // Poll payment status
  useEffect(() => {
    if (paymentStatus === 'processing' && checkoutRequestID) {
      const interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { 'x-auth-token': token } };
          
          const response = await axios.get(
            `${API_ENDPOINTS.MPESA}/status/${sessionId}`,
            config
          );

          if (response.data.paymentStatus === 'Paid') {
            setPaymentStatus('success');
            setActiveStep(2);
            clearInterval(interval);
            if (onSuccess) onSuccess(response.data);
          } else if (response.data.paymentStatus === 'Failed') {
            setPaymentStatus('failed');
            setError('Payment was cancelled or failed');
            clearInterval(interval);
            if (onError) onError(new Error('Payment failed'));
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 3000); // Check every 3 seconds

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(interval), 120000);

      return () => clearInterval(interval);
    }
  }, [paymentStatus, checkoutRequestID, sessionId, onSuccess, onError]);

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const response = await axios.post(
        `${API_ENDPOINTS.MPESA}/initiate`,
        { sessionId, phoneNumber },
        config
      );

      setCheckoutRequestID(response.data.checkoutRequestID);
      setPaymentStatus('processing');
      setActiveStep(1);

    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.msg || 'Failed to initiate payment');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as user types
    if (cleaned.startsWith('254')) {
      return cleaned.slice(0, 12);
    } else if (cleaned.startsWith('0')) {
      return cleaned.slice(0, 10);
    }
    return cleaned.slice(0, 10);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PhoneIcon sx={{ mr: 1, color: 'success.main', fontSize: 32 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Pay with M-Pesa
        </Typography>
      </Box>

      <Typography variant="h4" color="success.main" sx={{ mb: 3, fontWeight: 'bold' }}>
        KSh {amount.toLocaleString()}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
          {error}
        </Alert>
      )}

      {paymentStatus === 'idle' && (
        <form onSubmit={handleInitiatePayment}>
          <TextField
            fullWidth
            label="M-Pesa Phone Number"
            placeholder="0712345678 or 254712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            required
            sx={{ mb: 3 }}
            helperText="Enter the phone number registered with M-Pesa"
            InputProps={{
              startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || phoneNumber.length < 10}
            sx={{ 
              py: 1.5, 
              fontSize: '1.1rem', 
              fontWeight: 'bold',
              backgroundColor: 'success.main',
              '&:hover': { backgroundColor: 'success.dark' }
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Pay KSh ${amount.toLocaleString()}`
            )}
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            🔒 Secure payment via Safaricom M-Pesa
          </Typography>
        </form>
      )}

      {paymentStatus === 'processing' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={60} sx={{ color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Check Your Phone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            An M-Pesa payment prompt has been sent to <strong>{phoneNumber}</strong>
          </Typography>
          <Alert severity="info" sx={{ textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Next Steps:
            </Typography>
            <Typography variant="caption" component="div">
              1. Check your phone for M-Pesa prompt<br />
              2. Enter your M-Pesa PIN<br />
              3. Confirm the payment<br />
              4. Wait for confirmation (this page will update automatically)
            </Typography>
          </Alert>
          <Button
            variant="outlined"
            onClick={() => {
              setPaymentStatus('idle');
              setActiveStep(0);
              setError('');
            }}
            sx={{ mt: 2 }}
          >
            Cancel & Try Again
          </Button>
        </Box>
      )}

      {paymentStatus === 'success' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main' }}>
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your therapy session has been confirmed.
          </Typography>
        </Box>
      )}

      {paymentStatus === 'failed' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'error.main' }}>
            Payment Failed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error || 'The payment was not completed'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setPaymentStatus('idle');
              setActiveStep(0);
              setError('');
              setPhoneNumber('');
            }}
            sx={{ backgroundColor: 'success.main' }}
          >
            Try Again
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default MpesaPayment;
```

---

