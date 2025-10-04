import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Container, Typography, Paper, Box, CircularProgress, Divider, Button, Grid, Chip, List, ListItem, ListItemText } from '@mui/material';

const AssessmentResultDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResultDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'x-auth-token': token,
          },
        };
        const res = await axios.get(`http://localhost:5000/api/assessments/results/${id}`, config);
        setResult(res.data);
      } catch (err) {
        console.error('Failed to fetch assessment result details', err);
        setError('Failed to load the assessment result details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchResultDetail();
    }
  }, [id, user]);

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

  if (error) {
    return (
      <Container>
        <Typography color="error" paragraph>
          {error}
        </Typography>
        <Button component={Link} to="/assessment-results" variant="contained">
          Back to Results
        </Button>
      </Container>
    );
  }

  if (!result) {
    return (
      <Container>
        <Typography variant="h5" color="error">
          Result not found
        </Typography>
        <Button component={Link} to="/assessment-results" variant="contained" sx={{ mt: 2 }}>
          Back to Results
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Button component={Link} to="/assessment-results" variant="outlined">
          Back to Results
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">{result.assessment.title}</Typography>
          <Chip 
            label={result.interpretation} 
            color={getChipColor(result.interpretation)}
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        <Typography variant="body1" paragraph>
          {result.assessment.description}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Completed on: {new Date(result.completedAt).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary" align="right">
              Total Score: {result.totalScore}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Detailed Results
      </Typography>

      <Paper sx={{ p: 3 }}>
        <List>
          {result.answers.map((answer, index) => {
            const question = result.assessment.questions.find(q => q._id === answer.question);
            const selectedOption = question?.options.find(o => o._id === answer.selectedOption);
            
            return (
              <React.Fragment key={answer._id || index}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={<Typography variant="subtitle1">Question {index + 1}: {question?.questionText}</Typography>}
                    secondary={
                      <>
                        <Typography variant="body2" component="span" color="text.primary">
                          Your answer: {selectedOption?.optionText}
                        </Typography>
                        <Typography variant="body2" component="div" color="text.secondary">
                          Score: {answer.score}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < result.answers.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      </Paper>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          What's Next?
        </Typography>
        <Typography variant="body1" paragraph>
          Consider discussing these results with your therapist during your next session.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button component={Link} to="/bookings" variant="contained" color="primary">
            Book a Session
          </Button>
          <Button component={Link} to={`/chat/assessment/${result._id}`} variant="outlined" color="secondary">
            Discuss Results
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default AssessmentResultDetail;