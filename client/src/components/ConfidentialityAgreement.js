/**
 * Confidentiality Agreement Component
 * 
 * Displays agreement with scrollable terms, digital signature capture,
 * and acceptance confirmation.
 * 
 * Requirements: 5.2 from Forms & Agreements System
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Checkbox,
  FormControlLabel, CircularProgress, Alert, Divider
} from '@mui/material';
import { CheckCircle, Description } from '@mui/icons-material';
import axios from 'axios';
import API_URL from '../config/api';

const ConfidentialityAgreement = ({ onAccepted, sessionId }) => {
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [typedSignature, setTypedSignature] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  const contentRef = useRef(null);

  useEffect(() => {
    fetchAgreement();
  }, []);

  const fetchAgreement = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/agreements/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAgreement(response.data.agreement);
      
      if (response.data.agreement.alreadySigned) {
        setSuccess(true);
        if (onAccepted) onAccepted(response.data.agreement);
      }
    } catch (err) {
      setError('Failed to load agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!hasScrolledToBottom) {
      setError('Please scroll to the bottom of the agreement to read all terms.');
      return;
    }
    
    if (!typedSignature.trim() || typedSignature.trim().length < 2) {
      setError('Please type your full name as your signature.');
      return;
    }
    
    if (!confirmed) {
      setError('Please confirm that you have read and agree to the terms.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/agreements/accept`, {
        typedSignature: typedSignature.trim(),
        signatureConfirmation: true,
        agreementVersion: agreement.version,
        contentHash: agreement.contentHash
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(true);
      if (onAccepted) onAccepted(response.data.agreement);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit agreement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>Agreement Accepted</Typography>
        <Typography color="text.secondary">
          Thank you for accepting the confidentiality agreement.
          {agreement?.signedAt && ` Signed on ${new Date(agreement.signedAt).toLocaleDateString()}`}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Description color="primary" />
        <Typography variant="h5">Confidentiality Agreement</Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" mb={2}>
        Version {agreement?.version} • Please read carefully and scroll to the bottom
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box
        ref={contentRef}
        onScroll={handleScroll}
        sx={{
          maxHeight: 400, overflow: 'auto', p: 2, mb: 3,
          bgcolor: 'grey.50', borderRadius: 1, border: '1px solid',
          borderColor: 'grey.300', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem'
        }}
      >
        {agreement?.content}
      </Box>
      
      {!hasScrolledToBottom && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please scroll to read the entire agreement before signing.
        </Alert>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth label="Type your full name as signature" value={typedSignature}
          onChange={(e) => setTypedSignature(e.target.value)}
          disabled={!hasScrolledToBottom || submitting}
          sx={{ mb: 2 }}
          helperText="This serves as your digital signature"
        />
        
        <FormControlLabel
          control={
            <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
              disabled={!hasScrolledToBottom || submitting} />
          }
          label="I have read, understood, and agree to the terms of this Confidentiality Agreement"
        />
        
        <Box mt={3}>
          <Button
            type="submit" variant="contained" size="large" fullWidth
            disabled={!hasScrolledToBottom || !typedSignature.trim() || !confirmed || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Accept Agreement'}
          </Button>
        </Box>
        
        <Typography variant="caption" color="text.secondary" display="block" mt={2} textAlign="center">
          Your IP address and timestamp will be recorded for verification purposes.
        </Typography>
      </form>
    </Paper>
  );
};

export default ConfidentialityAgreement;
