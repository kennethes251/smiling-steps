/**
 * Example usage of MpesaPayment component
 * 
 * This file demonstrates how to integrate the MpesaPayment component
 * into your application for processing M-Pesa payments.
 */

import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import MpesaPayment from './MpesaPayment';

const MpesaPaymentExample = () => {
  // Example session data
  const sessionId = 'session_123';
  const amount = 2500; // KSh 2,500
  
  const sessionDetails = {
    therapistName: 'Dr. Jane Smith',
    sessionType: 'Individual Therapy',
    scheduledDate: new Date('2025-12-15T10:00:00')
  };

  const handlePaymentSuccess = (data) => {
    console.log('Payment successful!', data);
    // Navigate to success page or update UI
    // Example: navigate('/booking/success');
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    // Show error notification or handle error
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Complete Your Payment
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <MpesaPayment
          sessionId={sessionId}
          amount={amount}
          sessionDetails={sessionDetails}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </Box>
    </Container>
  );
};

export default MpesaPaymentExample;

/**
 * Integration Notes:
 * 
 * 1. Props:
 *    - sessionId (required): The ID of the session being paid for
 *    - amount (required): The payment amount in KSh
 *    - sessionDetails (optional): Object with therapistName, sessionType, scheduledDate
 *    - onSuccess (optional): Callback function called when payment succeeds
 *    - onError (optional): Callback function called when payment fails
 * 
 * 2. Phone Number Validation:
 *    - Accepts formats: 0712345678, 0112345678, 254712345678, 254112345678
 *    - Real-time validation with error messages
 *    - Auto-formatting as user types
 * 
 * 3. Payment Flow:
 *    - User enters phone number
 *    - Clicks "Pay" button
 *    - STK Push sent to phone
 *    - Component polls for status every 3 seconds
 *    - Shows success/failure/timeout after completion
 * 
 * 4. Error Handling:
 *    - Invalid phone number format
 *    - Payment cancellation
 *    - Insufficient funds
 *    - Network timeout (2 minutes)
 *    - API errors
 * 
 * 5. Success State:
 *    - Displays M-Pesa transaction ID
 *    - Calls onSuccess callback
 *    - Shows confirmation message
 */
