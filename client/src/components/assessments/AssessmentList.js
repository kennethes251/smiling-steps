import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, CircularProgress, Box } from '@mui/material';

const AssessmentList = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/assessments');
        setAssessments(res.data);
      } catch (err) {
        console.error('Failed to fetch assessments', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Mental Health Assessments
      </Typography>
      <Typography variant="body1" paragraph>
        These assessments can help you understand your mental health better. Your results are confidential and can be discussed with your therapist.
      </Typography>

      {assessments.length === 0 ? (
        <Typography>No assessments available at the moment.</Typography>
      ) : (
        <Grid container spacing={3}>
          {assessments.map((assessment) => (
            <Grid item xs={12} md={6} key={assessment._id}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="div">
                    {assessment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {assessment.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    component={Link} 
                    to={`/assessments/${assessment._id}`} 
                    variant="contained" 
                    size="small"
                  >
                    Take Assessment
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default AssessmentList;