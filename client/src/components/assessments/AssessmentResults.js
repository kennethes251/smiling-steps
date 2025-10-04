import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Container, Typography, Paper, List, ListItem, ListItemText, Divider, Button, CircularProgress, Box, Chip, Grid } from '@mui/material';

const AssessmentResults = () => {
  const { user } = useContext(AuthContext);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'x-auth-token': token,
          },
        };
        const res = await axios.get('http://localhost:5000/api/assessments/results/me', config);
        setResults(res.data);
      } catch (err) {
        console.error('Failed to fetch assessment results', err);
        setError('Failed to load your assessment results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchResults();
    }
  }, [user]);

  const getChipColor = (interpretation) => {
    if (interpretation.includes('Minimal')) return 'success';
    if (interpretation.includes('Mild')) return 'info';
    if (interpretation.includes('Moderate')) return 'warning';
    if (interpretation.includes('Severe')) return 'error';
    return 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Assessment Results
        </Typography>
        <Button component={Link} to="/assessments" variant="contained" color="primary">
          Take New Assessment
        </Button>
      </Box>

      {error && (
        <Typography color="error" paragraph>
          {error}
        </Typography>
      )}

      {results.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            You haven't completed any assessments yet.
          </Typography>
          <Button component={Link} to="/assessments" variant="contained" color="primary" sx={{ mt: 2 }}>
            Take Your First Assessment
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {results.map((result) => (
            <Grid item xs={12} key={result._id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{result.assessment.title}</Typography>
                  <Chip 
                    label={result.interpretation} 
                    color={getChipColor(result.interpretation)}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Completed on: {new Date(result.completedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" align="right">
                      Score: {result.totalScore}
                    </Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button 
                    component={Link} 
                    to={`/assessment-results/${result._id}`} 
                    variant="outlined" 
                    size="small"
                  >
                    View Details
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default AssessmentResults;