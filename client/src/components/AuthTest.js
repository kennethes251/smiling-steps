import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import axios from 'axios';

const AuthTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [testUser] = useState({
    name: 'Frontend Test User',
    email: `frontend.test.${Date.now()}@example.com`,
    password: 'password123',
    role: 'client',
    skipVerification: true
  });

  const testRegistration = async () => {
    setLoading(true);
    setResult('Testing registration...');
    
    try {
      console.log('🧪 Frontend: Testing registration with:', testUser);
      
      const response = await axios.post(
        'https://smiling-steps.onrender.com/api/users/register',
        testUser,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Frontend: Registration response:', response.data);
      
      setResult(`✅ Registration Success!
Status: ${response.status}
Message: ${response.data.message}
Has Token: ${!!response.data.token}
Requires Verification: ${response.data.requiresVerification}
User Verified: ${response.data.user?.isVerified}`);
      
    } catch (error) {
      console.error('❌ Frontend: Registration error:', error);
      setResult(`❌ Registration Failed!
Status: ${error.response?.status}
Message: ${error.response?.data?.message || error.message}
Errors: ${JSON.stringify(error.response?.data?.errors || [])}`);
    }
    
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...');
    
    try {
      console.log('🔐 Frontend: Testing login with:', {
        email: testUser.email,
        password: testUser.password
      });
      
      const response = await axios.post(
        'https://smiling-steps.onrender.com/api/users/login',
        {
          email: testUser.email,
          password: testUser.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Frontend: Login response:', response.data);
      
      setResult(`✅ Login Success!
Status: ${response.status}
Has Token: ${!!response.data.token}
User: ${response.data.user?.name} (${response.data.user?.email})`);
      
    } catch (error) {
      console.error('❌ Frontend: Login error:', error);
      setResult(`❌ Login Failed!
Status: ${error.response?.status}
Message: ${error.response?.data?.message || error.message}
URL: ${error.config?.url}`);
    }
    
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        🧪 Frontend Authentication Test
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Test User: {testUser.email}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={testRegistration}
          disabled={loading}
        >
          Test Registration
        </Button>
        <Button 
          variant="outlined" 
          onClick={testLogin}
          disabled={loading}
        >
          Test Login
        </Button>
      </Box>
      
      {result && (
        <Alert severity={result.includes('✅') ? 'success' : 'error'}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {result}
          </pre>
        </Alert>
      )}
    </Box>
  );
};

export default AuthTest;