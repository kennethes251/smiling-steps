import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Container, Typography, Paper, Box, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Button, CircularProgress, Stepper, Step, StepLabel, Alert } from '@mui/material';

const AssessmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/assessments/${id}`);
        setAssessment(res.data);
        // Initialize answers array with empty values
        setAnswers(new Array(res.data.questions.length).fill(''));
      } catch (err) {
        console.error('Failed to fetch assessment', err);
        setError('Failed to load the assessment. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id]);

  const handleNext = () => {
    if (currentAnswer === '') {
      setError('Please select an answer before proceeding.');
      return;
    }
    
    setError(null);
    const newAnswers = [...answers];
    newAnswers[activeStep] = currentAnswer;
    setAnswers(newAnswers);
    
    if (activeStep < assessment.questions.length - 1) {
      setActiveStep(activeStep + 1);
      setCurrentAnswer(answers[activeStep + 1] || '');
    } else {
      handleSubmit(newAnswers);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setCurrentAnswer(answers[activeStep - 1]);
    }
  };

  const handleAnswerChange = (event) => {
    setCurrentAnswer(event.target.value);
  };

  const handleSubmit = async (finalAnswers) => {
    if (!user) {
      setError('You must be logged in to submit an assessment.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token,
        },
      };

      // Format answers for submission
      const formattedAnswers = assessment.questions.map((question, index) => ({
        questionId: question._id,
        optionId: finalAnswers[index],
      }));

      await axios.post(
        `http://localhost:5000/api/assessments/${id}/submit`,
        { answers: formattedAnswers },
        config
      );

      // Redirect to results page
      navigate('/assessment-results');
    } catch (err) {
      console.error('Failed to submit assessment', err);
      setError('Failed to submit your answers. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Container>
        <Typography variant="h5" color="error">
          Assessment not found
        </Typography>
      </Container>
    );
  }

  const currentQuestion = assessment.questions[activeStep];

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        {assessment.title}
      </Typography>
      <Typography variant="body1" paragraph>
        {assessment.description}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {assessment.questions.map((_, index) => (
          <Step key={index}>
            <StepLabel>Question {index + 1}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {currentQuestion.questionText}
        </Typography>

        <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
          <FormLabel component="legend">Select your answer:</FormLabel>
          <RadioGroup
            aria-label="question"
            name="question"
            value={currentAnswer}
            onChange={handleAnswerChange}
          >
            {currentQuestion.options.map((option) => (
              <FormControlLabel
                key={option._id}
                value={option._id}
                control={<Radio />}
                label={option.optionText}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || submitting}
            variant="outlined"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={submitting}
          >
            {activeStep === assessment.questions.length - 1 ? 'Submit' : 'Next'}
            {submitting && <CircularProgress size={24} sx={{ ml: 1 }} />}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AssessmentDetail;