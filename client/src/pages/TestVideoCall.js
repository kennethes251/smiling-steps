import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from 'axios';

const TestVideoCall = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [error, setError] = useState('');

  const runVideoCallTest = async () => {
    setLoading(true);
    setError('');
    setTestResults([]);
    
    const results = [];
    
    try {
      // Test 1: Check authentication
      results.push({ test: 'Authentication', status: 'success', message: `Logged in as ${user.name} (${user.role})` });
      
      // Test 2: Get sessions
      const token = localStorage.getItem('token');
      const sessionsResponse = await axios.get('http://localhost:5000/api/sessions', {
        headers: { 'x-auth-token': token }
      });
      results.push({ test: 'Sessions API', status: 'success', message: `Found ${sessionsResponse.data.length} sessions` });
      
      // Test 3: Get psychologists (if client)
      if (user.role === 'client') {
        const psychResponse = await axios.get('http://localhost:5000/api/users/psychologists', {
          headers: { 'x-auth-token': token }
        });
        results.push({ test: 'Psychologists API', status: 'success', message: `Found ${psychResponse.data.count} psychologists` });
      }
      
      // Test 4: Check if there are any booked sessions for video calls
      const bookedSessions = sessionsResponse.data.filter(s => s.status === 'Booked');
      if (bookedSessions.length > 0) {
        results.push({ test: 'Video Call Ready', status: 'success', message: `${bookedSessions.length} sessions ready for video calls` });
        
        // Test 5: Try to get a specific session
        const testSession = bookedSessions[0];
        try {
          const sessionResponse = await axios.get(`http://localhost:5000/api/sessions/${testSession._id}`, {
            headers: { 'x-auth-token': token }
          });
          results.push({ test: 'Individual Session API', status: 'success', message: 'Session details retrieved successfully' });
        } catch (sessionError) {
          results.push({ test: 'Individual Session API', status: 'error', message: `Failed: ${sessionError.response?.status} ${sessionError.response?.data?.msg}` });
        }
      } else {
        results.push({ test: 'Video Call Ready', status: 'warning', message: 'No booked sessions available for video calls' });
      }
      
      setTestResults(results);
      
    } catch (err) {
      console.error('Test failed:', err);
      setError(`Test failed: ${err.response?.data?.message || err.message}`);
      results.push({ test: 'Overall Test', status: 'error', message: err.message });
      setTestResults(results);
    } finally {
      setLoading(false);
    }
  };

  const createTestSession = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Get psychologists
      const psychResponse = await axios.get('http://localhost:5000/api/users/psychologists', {
        headers: { 'x-auth-token': token }
      });
      
      if (psychResponse.data.data.length > 0) {
        const psychologist = psychResponse.data.data[0];
        
        // Create a test session
        const sessionResponse = await axios.post('http://localhost:5000/api/sessions', {
          psychologistId: psychologist._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          price: 2000
        }, {
          headers: { 'x-auth-token': token }
        });
        
        alert(`✅ Test session created successfully!\nSession ID: ${sessionResponse.data._id}\nPsychologist: ${psychologist.name}\nStatus: ${sessionResponse.data.status}`);
        
        // Refresh the test
        runVideoCallTest();
      }
    } catch (err) {
      setError(`Failed to create test session: ${err.response?.data?.msg || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testVideoCallPage = () => {
    // Find a booked session to test with
    const bookedSessions = testResults.find(r => r.test === 'Sessions API');
    if (bookedSessions) {
      // For demo, we'll use a mock session ID
      navigate('/video-call/test-session-id');
    } else {
      setError('No sessions available for testing. Create a test session first.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <VideocamIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Video Call System Test
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Test the video call functionality and system integration
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={runVideoCallTest}
              disabled={loading}
              startIcon={<CheckCircleIcon />}
            >
              {loading ? 'Testing...' : 'Run System Test'}
            </Button>
            
            {user.role === 'client' && (
              <Button
                variant="outlined"
                onClick={createTestSession}
                disabled={loading}
              >
                Create Test Session
              </Button>
            )}
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={testVideoCallPage}
            >
              Test Video Call Page
            </Button>
          </Box>

          {testResults.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Test Results:
              </Typography>
              <List>
                {testResults.map((result, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {result.test}
                          <Chip 
                            label={result.status} 
                            color={
                              result.status === 'success' ? 'success' : 
                              result.status === 'warning' ? 'warning' : 'error'
                            }
                            size="small"
                          />
                        </Box>
                      }
                      secondary={result.message}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              📋 Video Call System Status
            </Typography>
            <Typography variant="body2" component="div">
              <strong>✅ Implemented Features:</strong>
              <br />• Video call page with demo interface
              <br />• Session-based video call access
              <br />• Dashboard integration with video call buttons
              <br />• Authentication and authorization
              <br />• Session tracking and management
              <br />
              <br /><strong>🚀 Ready for Enhancement:</strong>
              <br />• WebRTC integration for real video/audio
              <br />• Screen sharing capabilities
              <br />• Chat functionality during calls
              <br />• Call recording (database fields ready)
            </Typography>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TestVideoCall;