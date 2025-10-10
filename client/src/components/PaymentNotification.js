import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Phone as PhoneIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const PaymentNotification = ({ 
  open, 
  onClose, 
  sessionDetails, 
  psychologistName,
  sessionRate,
  onPaymentSent 
}) => {
  const [copied, setCopied] = useState(false);
  const paymentNumber = '0707439299';

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentSent = () => {
    onPaymentSent();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon color="primary" />
          <Typography variant="h6">Payment Required</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Your session has been approved! Please complete payment to confirm your booking.
        </Alert>

        {/* Session Details */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Session Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Psychologist: <strong>{psychologistName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Date: <strong>{sessionDetails?.sessionDate ? new Date(sessionDetails.sessionDate).toLocaleDateString() : 'TBD'}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type: <strong>{sessionDetails?.sessionType || 'Individual'}</strong>
          </Typography>
        </Box>

        {/* Payment Amount */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
            KES {sessionRate || 0}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Session Fee
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Payment Instructions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Payment Instructions
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.light', 
            color: 'primary.contrastText',
            borderRadius: 2,
            mb: 2
          }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Send payment via M-Pesa to:
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              bgcolor: 'rgba(255,255,255,0.2)',
              p: 1,
              borderRadius: 1
            }}>
              <PhoneIcon />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {paymentNumber}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleCopyNumber}
                sx={{ color: 'inherit' }}
              >
                <CopyIcon />
              </IconButton>
            </Box>
            {copied && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                ✓ Number copied to clipboard
              </Typography>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            1. Go to M-Pesa on your phone<br/>
            2. Select "Send Money"<br/>
            3. Enter the number: <strong>{paymentNumber}</strong><br/>
            4. Enter amount: <strong>KES {sessionRate || 0}</strong><br/>
            5. Complete the transaction<br/>
            6. Click "Payment Sent" below
          </Typography>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Your session will be confirmed once payment is received. 
              Please keep your M-Pesa confirmation message for reference.
            </Typography>
          </Alert>
        </Box>

        {/* Contact Info */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Need help?</strong> Contact us at{' '}
            <a href="mailto:kennethes251@gmail.com" style={{ color: 'inherit' }}>
              kennethes251@gmail.com
            </a>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handlePaymentSent} 
          variant="contained"
          startIcon={<PaymentIcon />}
        >
          Payment Sent
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentNotification;