import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Rating,
  Fade,
  Grid
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  People as PeopleIcon,
  FamilyRestroom as FamilyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

const BookingPageNew = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [psychologists, setPsychologists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const steps = [
    'Select Psychologist',
    'Choose Session Type',
    'Pick Date & Time',
    'Review & Submit'
  ];

  const sessionTypeConfig = {
    Individual: {
      icon: <PersonIcon sx={{ fontSize: 40 }} />,
      description: 'One-on-one personalized therapy session',
      color: '#1976d2',
      defaultDuration: 60
    },
    Couples: {
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      description: 'Therapy session for couples',
      color: '#d32f2f',
      defaultDuration: 75
    },
    Family: {
      icon: <FamilyIcon sx={{ fontSize: 40 }} />,
      description: 'Family therapy session',
      color: '#388e3c',
      defaultDuration: 90
    },
    Group: {
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      description: 'Group therapy with peers',
      color: '#f57c00',
      defaultDuration: 90
    }
  };

  useEffect(() => {
    fetchPsychologists();
  }, []);

  const fetchPsychologists = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_ENDPOINTS.USERS}/psychologists`);
      if (res.data.success) {
        const enhancedPsychologists = res.data.data.map(psych => ({
          ...psych,
          rating: (Math.random() * 2 + 3).toFixed(1),
          specializations: psych.psychologistDetails?.specializations || psych.specializations || ['General Therapy'],
          experience: psych.psychologistDetails?.experience || psych.experience || '2 years',
          sessions: Math.floor(Math.random() * 500 + 100),
          // Check both top-level rates and psychologistDetails.rates
          rates: psych.rates || psych.psychologistDetails?.rates || {
            Individual: { amount: 2000, duration: 60 },
            Couples: { amount: 3500, duration: 75 },
            Family: { amount: 4500, duration: 90 },
            Group: { amount: 1500, duration: 90 }
          }
        }));
        console.log('✅ Enhanced psychologists:', enhancedPsychologists);
        setPsychologists(enhancedPsychologists);
      } else {
        setError('Failed to load psychologists');
      }
    } catch (err) {
      console.error('Failed to fetch psychologists:', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPsychologist = (psychologist) => {
    setSelectedPsychologist(psychologist);
    setActiveStep(1);
  };

  const handleSelectSessionType = (type) => {
    setSelectedSessionType(type);
    setActiveStep(2);
  };

  const handleDateSelect = (date) => {
    setStartDate(date);
  };

  const handleSubmitBooking = async () => {
    if (!selectedPsychologist || !selectedSessionType || !startDate) {
      setError('Please complete all steps');
      return;
    }

    // Get rate with fallback to default prices
    const rate = selectedPsychologist?.rates?.[selectedSessionType] || {
      amount: sessionTypeConfig[selectedSessionType]?.defaultDuration === 60 ? 2000 : 
              sessionTypeConfig[selectedSessionType]?.defaultDuration === 75 ? 3500 : 
              sessionTypeConfig[selectedSessionType]?.defaultDuration === 90 && selectedSessionType === 'Group' ? 1500 : 4500,
      duration: sessionTypeConfig[selectedSessionType]?.defaultDuration || 60
    };
    
    const bookingData = {
      psychologistId: selectedPsychologist.id || selectedPsychologist._id,
      sessionType: selectedSessionType,
      sessionDate: startDate,
      sessionRate: rate.amount,
      price: rate.amount
    };

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.post(`${API_ENDPOINTS.SESSIONS}/request`, bookingData, config);
      
      if (response.status === 200 || response.status === 201) {
        setBookingSuccess(true);
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    } catch (err) {
      console.error('Booking failed', err);
      setError(err.response?.data?.msg || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleNext = () => {
    if (activeStep === 2 && startDate) {
      setActiveStep(3);
    }
  };

  const getAvailableTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour}:00`);
      if (hour < 17) slots.push(`${hour}:30`);
    }
    return slots;
  };

  if (bookingSuccess) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Fade in timeout={500}>
          <Box>
            <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
            <Typography variant="h3" gutterBottom color="success.main" sx={{ fontWeight: 'bold' }}>
              Booking Request Submitted!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              Your session request has been sent to the therapist for approval.
            </Typography>
            <Paper elevation={2} sx={{ p: 3, maxWidth: 500, mx: 'auto', textAlign: 'left' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                What happens next?
              </Typography>
              <Box component="ol" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    The therapist will review your request
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Once approved, you'll receive payment instructions
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Complete payment and submit required forms
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Your session will be confirmed!
                  </Typography>
                </li>
              </Box>
            </Paper>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Redirecting to dashboard...
            </Typography>
          </Box>
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Book Your Therapy Session
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Follow the steps to schedule your session
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={activeStep === 0}
          variant="outlined"
        >
          Back
        </Button>
        {activeStep === 2 && startDate && (
          <Button
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
            variant="contained"
          >
            Continue to Review
          </Button>
        )}
      </Box>

      {/* Step 1: Psychologist Selection */}
      {activeStep === 0 && (
        <Fade in timeout={500}>
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
              Choose Your Therapist
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={60} />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {psychologists.map((psychologist) => (
                  <Grid item xs={12} md={6} key={psychologist.id || psychologist._id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                        border: selectedPsychologist?.id === psychologist.id ? '3px solid' : 'none',
                        borderColor: 'primary.main'
                      }}
                      onClick={() => handleSelectPsychologist(psychologist)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ width: 70, height: 70, mr: 2, bgcolor: 'primary.main' }}>
                            {psychologist.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              Dr. {psychologist.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Rating value={parseFloat(psychologist.rating)} readOnly size="small" />
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {psychologist.rating} ({psychologist.sessions}+ sessions)
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {psychologist.experience} experience
                        </Typography>

                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Specializations:
                          </Typography>
                          {psychologist.specializations.map((spec, idx) => (
                            <Chip
                              key={idx}
                              label={spec}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                        <Button variant="contained" fullWidth>
                          Select Therapist
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Fade>
      )}

      {/* Step 2: Session Type Selection */}
      {activeStep === 1 && selectedPsychologist && (
        <Fade in timeout={500}>
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 1, fontWeight: 'bold' }}>
              Choose Session Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the type of therapy session with Dr. {selectedPsychologist.name}
            </Typography>
            <Grid container spacing={3}>
              {Object.keys(sessionTypeConfig).map((type) => {
                const config = sessionTypeConfig[type];
                // Safety check for rates - use default if not available
                const rate = selectedPsychologist?.rates?.[type] || {
                  amount: config.defaultDuration === 60 ? 2000 : 
                          config.defaultDuration === 75 ? 3500 : 
                          config.defaultDuration === 90 && type === 'Group' ? 1500 : 4500,
                  duration: config.defaultDuration
                };
                
                return (
                  <Grid item xs={12} sm={6} md={3} key={type}>
                    <Card
                      sx={{
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': { transform: 'translateY(-8px)', boxShadow: 6 },
                        border: selectedSessionType === type ? `3px solid ${config.color}` : 'none'
                      }}
                      onClick={() => handleSelectSessionType(type)}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Box sx={{ color: config.color, mb: 2 }}>
                          {config.icon}
                        </Box>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {type}
                        </Typography>
                        <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                          KSh {rate.amount.toLocaleString()}
                        </Typography>
                        <Chip
                          label={`${rate.duration} minutes`}
                          size="small"
                          sx={{ mb: 2 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {config.description}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{
                            backgroundColor: config.color,
                            '&:hover': { backgroundColor: config.color, opacity: 0.9 }
                          }}
                        >
                          Select
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Fade>
      )}

      {/* Step 3: Date & Time Selection */}
      {activeStep === 2 && selectedSessionType && (
        <Fade in timeout={500}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3, fontWeight: 'bold' }}>
              <ScheduleIcon sx={{ mr: 1 }} />
              Select Date & Time
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Choose Date
                </Typography>
                <Box sx={{
                  '& .react-datepicker': {
                    border: 'none',
                    boxShadow: 2,
                    borderRadius: 2
                  }
                }}>
                  <DatePicker
                    selected={startDate}
                    onChange={handleDateSelect}
                    inline
                    minDate={new Date()}
                    dateFormat="MMMM d, yyyy"
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Available Time Slots
                </Typography>
                <Grid container spacing={1}>
                  {getAvailableTimeSlots().map((time) => (
                    <Grid item xs={6} sm={4} key={time}>
                      <Button
                        variant={startDate?.toTimeString().includes(time) ? "contained" : "outlined"}
                        fullWidth
                        size="small"
                        onClick={() => {
                          const newDate = new Date(startDate);
                          const [hours, minutes] = time.split(':');
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setStartDate(newDate);
                        }}
                        sx={{ mb: 1 }}
                      >
                        {time}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Fade>
      )}

      {/* Step 4: Review & Submit */}
      {activeStep === 3 && (
        <Fade in timeout={500}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3, fontWeight: 'bold' }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              Review Your Booking
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
                    Booking Summary
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Therapist
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      Dr. {selectedPsychologist?.name}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Session Type
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {selectedSessionType} Therapy
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Date & Time
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {startDate?.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} at {startDate?.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {selectedPsychologist?.rates?.[selectedSessionType]?.duration || 
                       sessionTypeConfig[selectedSessionType]?.defaultDuration || 60} minutes
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Session Fee:
                    </Typography>
                    <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                      KSh {(selectedPsychologist?.rates?.[selectedSessionType]?.amount || 
                            (sessionTypeConfig[selectedSessionType]?.defaultDuration === 60 ? 2000 : 
                             sessionTypeConfig[selectedSessionType]?.defaultDuration === 75 ? 3500 : 
                             sessionTypeConfig[selectedSessionType]?.defaultDuration === 90 && selectedSessionType === 'Group' ? 1500 : 4500)).toLocaleString()}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleSubmitBooking}
                    disabled={loading}
                    sx={{
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      mb: 2
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit Booking Request'}
                  </Button>

                  <Alert severity="info">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Next Steps:
                    </Typography>
                    <Typography variant="caption" component="div">
                      1. Therapist will review your request<br />
                      2. You'll receive payment instructions<br />
                      3. Complete payment & forms<br />
                      4. Session confirmed!
                    </Typography>
                  </Alert>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Fade>
      )}
    </Container>
  );
};

export default BookingPageNew;
