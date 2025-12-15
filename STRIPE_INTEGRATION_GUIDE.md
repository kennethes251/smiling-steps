# 💳 Stripe Payment Integration Guide
## Complete Setup for Your Therapy Booking Platform

---

## 📋 Your App Details

Based on your current system:
- **Payment Amount**: Variable (KSh 1,500 - 4,500 based on session type)
- **Currency**: KES (Kenyan Shilling)
- **Product/Service**: Therapy Sessions (Individual, Couples, Family, Group)
- **Payment Type**: One-time payments per session
- **Current Flow**: Manual M-Pesa with proof submission

---

## 🎯 Integration Overview

We'll integrate Stripe to:
1. Accept card payments directly in your booking flow
2. Automatically confirm sessions upon successful payment
3. Eliminate manual payment verification
4. Support international clients

---

## 📝 STEP 1: Create Stripe Account & Get API Keys

### 1.1 Sign Up for Stripe
1. Go to https://dashboard.stripe.com/register
2. Create account with your email
3. Complete business verification (can start in test mode immediately)

### 1.2 Get Your API Keys
1. Navigate to **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`) - Used in frontend
   - **Secret key** (starts with `sk_test_...`) - Used in backend

### 1.3 Add Keys to Your Environment

Add to your `.env` file:
```env
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Webhook Secret (we'll get this later)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

⚠️ **IMPORTANT**: Never commit `.env` to Git! It's already in your `.gitignore`.

---

## 📦 STEP 2: Install Stripe Dependencies

Run these commands in your project root:

```bash
# Backend dependencies
npm install stripe

# Frontend dependencies
cd client
npm install @stripe/stripe-js @stripe/react-stripe-js
cd ..
```

---

## 🔧 STEP 3: Backend Implementation

### 3.1 Create Stripe Configuration File

Create `server/config/stripe.js`:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
```

### 3.2 Create Payment Routes

Create `server/routes/payments.js`:
```javascript
const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const { auth } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');

// @route   POST api/payments/create-payment-intent
// @desc    Create a Stripe Payment Intent for a session
// @access  Private (Client only)
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Get session details
    const session = await Session.findById(sessionId)
      .populate('psychologist', 'name email')
      .populate('client', 'name email');

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // Verify the user is the client for this session
    if (session.client._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check if session is in correct status
    if (session.status !== 'Approved') {
      return res.status(400).json({ 
        msg: 'Session must be approved before payment' 
      });
    }

    // Convert KES to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(session.price * 100);

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'kes',
      metadata: {
        sessionId: session._id.toString(),
        clientId: session.client._id.toString(),
        psychologistId: session.psychologist._id.toString(),
        sessionType: session.sessionType,
        sessionDate: session.sessionDate.toISOString()
      },
      description: `${session.sessionType} Therapy Session with Dr. ${session.psychologist.name}`,
      receipt_email: session.client.email
    });

    // Store payment intent ID in session
    session.stripePaymentIntentId = paymentIntent.id;
    await session.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: session.price,
      currency: 'KES'
    });

  } catch (err) {
    console.error('Payment Intent Error:', err);
    res.status(500).json({ 
      msg: 'Failed to create payment intent',
      error: err.message 
    });
  }
});

// @route   POST api/payments/confirm-payment
// @desc    Confirm payment and update session status
// @access  Private
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { sessionId, paymentIntentId } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        msg: 'Payment not completed',
        status: paymentIntent.status 
      });
    }

    // Update session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    session.status = 'Confirmed';
    session.paymentStatus = 'Paid';
    session.stripePaymentIntentId = paymentIntentId;
    session.paymentVerifiedAt = new Date();
    session.paymentMethod = 'stripe';

    await session.save();

    // TODO: Send confirmation email to client and psychologist

    res.json({
      success: true,
      msg: 'Payment confirmed! Your session is booked.',
      session
    });

  } catch (err) {
    console.error('Payment Confirmation Error:', err);
    res.status(500).json({ 
      msg: 'Failed to confirm payment',
      error: err.message 
    });
  }
});

// @route   POST api/payments/webhook
// @desc    Handle Stripe webhook events
// @access  Public (but verified by Stripe signature)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✅ Payment succeeded:', paymentIntent.id);
      
      // Update session status
      const session = await Session.findOne({ 
        stripePaymentIntentId: paymentIntent.id 
      });
      
      if (session) {
        session.status = 'Confirmed';
        session.paymentStatus = 'Paid';
        session.paymentVerifiedAt = new Date();
        await session.save();
        console.log('Session confirmed:', session._id);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Payment failed:', failedPayment.id);
      // TODO: Notify client of failed payment
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// @route   GET api/payments/session/:sessionId
// @desc    Get payment status for a session
// @access  Private
router.get('/session/:sessionId', auth, async (req, res) => {
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

    res.json({
      paymentStatus: session.paymentStatus,
      paymentMethod: session.paymentMethod,
      amount: session.price,
      stripePaymentIntentId: session.stripePaymentIntentId
    });

  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
```

### 3.3 Update Session Model

Add these fields to `server/models/Session.js`:
```javascript
// Add to SessionSchema
stripePaymentIntentId: {
  type: String,
  trim: true
},
paymentMethod: {
  type: String,
  enum: ['mpesa', 'stripe', 'cash'],
  default: 'mpesa'
},
```

### 3.4 Register Payment Routes

In `server/index-mongodb.js`, add:
```javascript
// Add with other route imports
const paymentRoutes = require('./routes/payments');

// Add with other route registrations
app.use('/api/payments', paymentRoutes);
```

---

## 🎨 STEP 4: Frontend Implementation

### 4.1 Create Stripe Context

Create `client/src/context/StripeContext.js`:
```javascript
import React, { createContext, useContext } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const StripeContext = createContext();

export const StripeProvider = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export const useStripe = () => useContext(StripeContext);
```

### 4.2 Create Payment Component

Create `client/src/components/StripePaymentForm.js`:
```javascript
import React, { useState, useEffect } from 'react';
import {
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const StripePaymentForm = ({ sessionId, amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Create Payment Intent when component mounts
    createPaymentIntent();
  }, [sessionId]);

  const createPaymentIntent = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.post(
        `${API_ENDPOINTS.PAYMENTS}/create-payment-intent`,
        { sessionId },
        config
      );

      setClientSecret(response.data.clientSecret);
    } catch (err) {
      console.error('Failed to create payment intent:', err);
      setError(err.response?.data?.msg || 'Failed to initialize payment');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        if (onError) onError(stripeError);
        setLoading(false);
        return;
      }

      // Payment successful, confirm with backend
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.post(
        `${API_ENDPOINTS.PAYMENTS}/confirm-payment`,
        {
          sessionId,
          paymentIntentId: paymentIntent.id
        },
        config
      );

      if (onSuccess) onSuccess(paymentIntent);

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.msg || 'Payment failed');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CreditCardIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Pay with Card
        </Typography>
      </Box>

      <Typography variant="h4" color="primary" sx={{ mb: 3, fontWeight: 'bold' }}>
        KSh {amount.toLocaleString()}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            p: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            mb: 3,
            backgroundColor: '#f9f9f9'
          }}
        >
          <CardElement options={cardElementOptions} />
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={!stripe || loading || !clientSecret}
          sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `Pay KSh ${amount.toLocaleString()}`
          )}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
          🔒 Secure payment powered by Stripe
        </Typography>
      </form>
    </Paper>
  );
};

export default StripePaymentForm;
```

### 4.3 Create Payment Page

Create `client/src/pages/PaymentPage.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import StripePaymentForm from '../components/StripePaymentForm';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const PaymentPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.get(
        `${API_ENDPOINTS.SESSIONS}/${sessionId}`,
        config
      );

      setSession(response.data);
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    console.log('Payment successful:', paymentIntent);
    navigate(`/payment-success/${sessionId}`);
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error || !session) {
    return (
      <Container sx={{ mt: 8 }}>
        <Alert severity="error">{error || 'Session not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Complete Your Payment
      </Typography>

      <Grid container spacing={3}>
        {/* Session Details */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Session Details
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Therapist
              </Typography>
              <Typography variant="body1">
                Dr. {session.psychologist?.name}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Session Type
              </Typography>
              <Typography variant="body1">
                {session.sessionType} Therapy
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Date & Time
              </Typography>
              <Typography variant="body1">
                {new Date(session.sessionDate).toLocaleString()}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Total Amount:
              </Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                KSh {session.price.toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Payment Form */}
        <Grid item xs={12} md={6}>
          <Elements stripe={stripePromise}>
            <StripePaymentForm
              sessionId={sessionId}
              amount={session.price}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PaymentPage;
```

### 4.4 Add Environment Variable

Create/update `client/.env`:
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 4.5 Update API Endpoints

In `client/src/config/api.js`, add:
```javascript
export const API_ENDPOINTS = {
  // ... existing endpoints
  PAYMENTS: `${API_BASE_URL}/api/payments`,
};
```

---

## 🔗 STEP 5: Integrate into Booking Flow

Update `client/src/pages/BookingPageNew.js` to redirect to payment after approval:

```javascript
// After therapist approves session, redirect client to payment
const handlePayNow = (sessionId) => {
  navigate(`/payment/${sessionId}`);
};
```

Add route in `client/src/App.js`:
```javascript
import PaymentPage from './pages/PaymentPage';

// In your routes
<Route path="/payment/:sessionId" element={<PaymentPage />} />
```

---

## 🎣 STEP 6: Set Up Webhooks

### 6.1 Install Stripe CLI (for testing)
```bash
# Windows (using Scoop)
scoop install stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### 6.2 Test Webhooks Locally
```bash
# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:5000/api/payments/webhook
```

This will give you a webhook signing secret starting with `whsec_...`
Add it to your `.env` file.

### 6.3 Production Webhooks
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your production URL: `https://your-domain.com/api/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the signing secret and add to production environment variables

---

## 🧪 STEP 7: Testing

### Test Cards (Use in Test Mode)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Testing Flow
1. Start your server: `npm start`
2. Start webhook forwarding: `stripe listen --forward-to localhost:5000/api/payments/webhook`
3. Book a session
4. Wait for therapist approval
5. Go to payment page
6. Use test card `4242 4242 4242 4242`
7. Verify session status changes to "Confirmed"

---

## 🚀 STEP 8: Go Live

### 8.1 Switch to Live Mode
1. Complete Stripe account verification
2. Get live API keys from Stripe Dashboard
3. Update environment variables with live keys:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
   ```

### 8.2 Production Checklist
- [ ] Live API keys configured
- [ ] Webhook endpoint set up in production
- [ ] SSL certificate installed (HTTPS required)
- [ ] Error logging configured
- [ ] Email notifications set up
- [ ] Test with real card (small amount)

---

## 🔒 Security Best Practices

1. **Never expose secret keys** - Keep them server-side only
2. **Use HTTPS** - Required for PCI compliance
3. **Validate on server** - Never trust client-side data
4. **Use webhooks** - Don't rely solely on client confirmation
5. **Log everything** - Track all payment attempts
6. **Handle errors gracefully** - Provide clear user feedback

---

## 💡 Common Issues & Solutions

### Issue: "No such payment_intent"
**Solution**: Ensure you're creating the payment intent before trying to confirm it.

### Issue: "Invalid API Key"
**Solution**: Check that your `.env` file is loaded and keys are correct.

### Issue: Webhook signature verification failed
**Solution**: Make sure you're using the correct webhook secret for your environment.

### Issue: Payment succeeds but session not updated
**Solution**: Check webhook is properly configured and receiving events.

---

## 📊 Monitoring Payments

View all payments in Stripe Dashboard:
- **Payments** → See all transactions
- **Logs** → Debug API calls
- **Events** → Track webhook deliveries

---

## 🎉 You're Done!

Your therapy booking platform now accepts card payments through Stripe!

**Next Steps**:
1. Test thoroughly in test mode
2. Set up email notifications
3. Add refund functionality
4. Consider adding subscription plans for regular clients

Need help? Check:
- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
