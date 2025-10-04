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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Rating,
  Fade
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
// import { motion } from 'framer-motion';

const BookingPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [sessionType, setSessionType] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const steps = ['Choose Session Type', 'Select Psychologist', 'Pick Date & Time', 'Confirm Booking'];

  const sessionTypes = [
    {
      type: 'Individual',
      price: 2000,
      icon: <PersonIcon sx={{ fontSize: 40 }} />,
      description: 'One-on-one personalized therapy session',
      features: ['Private consultation', 'Tailored approach', 'Flexible scheduling', '60-minute session'],
      color: '#1976d2'
    },
    {
      type: 'Group',
      price: 5000,
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      description: 'Group therapy with peers and professional guidance',
      features: ['Peer support', 'Shared experiences', 'Cost effective', '90-minute session'],
      color: '#2e7d32'
    }
  ];

  useEffect(() => {
    const fetchPsychologists = async () => {
      if (sessionType) {
        setLoading(true);
        setError('');
        try {
          const res = await axios.get(`${API_ENDPOINTS.USERS}/psychologists`);
          if (res.data.success) {
            // Add mock ratings and specializations for demo
            const enhancedPsychologists = res.data.data.map(psych => ({
              ...psych,
              rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3-5
              specializations: ['Anxiety', 'Depression', 'Stress Management'],
              experience: Math.floor(Math.random() * 10 + 2) + ' years',
              sessions: Math.floor(Math.random() * 500 + 100)
            }));
            setPsychologists(enhancedPsychologists);
          } else {
            setError('Failed to load psychologists. Please try again.');
          }
        } catch (err) {
          console.error('Failed to fetch psychologists:', err);
          setError('Unable to connect to server. Please check your connection.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPsychologists();
  }, [sessionType]);

  const handleSelectSession = (type) => {
    setSessionType(type);
    setSelectedPsychologist(null);
    setPsychologists([]);
    setActiveStep(1);
  };

  const handleSelectPsychologist = (psychologist) => {
    setSelectedPsychologist(psychologist);
    setActiveStep(2);
  };

  const handleDateSelect = (date) => {
    setStartDate(date);
    setActiveStep(3);
  };

  const handleConfirmBooking = async () => {
    if (!selectedPsychologist || !sessionType || !startDate) {
      setError('Please complete all steps before confirming.');
      return;
    }

    const selectedSessionType = sessionTypes.find(s => s.type === sessionType);
    const bookingData = {
      psychologistId: selectedPsychologist._id,
      sessionType,
      sessionDate: startDate,
      price: selectedSessionType.price,
    };

    try {
      setLoading(true);
      const response = await axios.post(`${API_ENDPOINTS.SESSIONS}`, bookingData);
      if (response.status === 200) {
        setBookingSuccess(true);
        setConfirmDialogOpen(false);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err) {
      console.error('Booking failed', err);
      setError('There was an error booking your session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      if (activeStep === 1) {
        setSessionType(null);
        setPsychologists([]);
      } else if (activeStep === 2) {
        setSelectedPsychologist(null);
      }
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
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <div>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Booking Confirmed!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your session has been successfully booked. You'll be redirected to your dashboard shortly.
          </Typography>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Book Your Session
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Take the next step in your mental health journey
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
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

      {/* Back Button */}
      {activeStep > 0 && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
          variant="outlined"
        >
          Back
        </Button>
      )}

      {/* Step 1: Session Type Selection */}
      {activeStep === 0 && (
        <Fade in timeout={500}>
          <Grid container spacing={3}>
            {sessionTypes.map((session, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={session.type}>
                <div>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 6
                      },
                      border: sessionType === session.type ? `3px solid ${session.color}` : 'none'
                    }}
                    onClick={() => handleSelectSession(session.type)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                      <Box sx={{ color: session.color, mb: 2 }}>
                        {session.icon}
                      </Box>
                      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {session.type} Session
                      </Typography>
                      <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                        KSh {session.price.toLocaleString()}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {session.description}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {session.features.map((feature, idx) => (
                          <Chip
                            key={idx}
                            label={feature}
                            size="small"
                            sx={{ m: 0.5 }}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                      <Button
                        variant="contained"
                        size="large"
                        sx={{
                          backgroundColor: session.color,
                          '&:hover': { backgroundColor: session.color, opacity: 0.9 }
                        }}
                      >
                        Select {session.type}
                      </Button>
                    </CardActions>
                  </Card>
                </div>
              </Grid>
            ))}
          </Grid>
        </Fade>
      )}

      {/* Step 2: Psychologist Selection */}
      {activeStep === 1 && (
        <Fade in timeout={500}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonIcon sx={{ mr: 1 }} />
              Choose Your Psychologist
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={60} />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {psychologists.map((psychologist, index) => (
                  <Grid size={{ xs: 12, md: 6 }} key={psychologist._id}>
                    <div>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                          border: selectedPsychologist?._id === psychologist._id ? '2px solid' : 'none',
                          borderColor: 'primary.main'
                        }}
                        onClick={() => handleSelectPsychologist(psychologist)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
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

                          <Box sx={{ mb: 2 }}>
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
                      </Card>
                    </div>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Fade>
      )}

      {/* Step 3: Date & Time Selection */}
      {activeStep === 2 && selectedPsychologist && (
        <Fade in timeout={500}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <ScheduleIcon sx={{ mr: 1 }} />
              Select Date & Time
            </Typography>

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
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

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Available Time Slots
                </Typography>
                <Grid container spacing={1}>
                  {getAvailableTimeSlots().map((time) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={time}>
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

      {/* Step 4: Confirmation */}
      {activeStep === 3 && (
        <Fade in timeout={500}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              Confirm Your Booking
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Booking Summary
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Session Type:
                    </Typography>
                    <Typography variant="body1">
                      {sessionType} Session
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Psychologist:
                    </Typography>
                    <Typography variant="body1">
                      Dr. {selectedPsychologist?.name}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Date & Time:
                    </Typography>
                    <Typography variant="body1">
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

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Total Amount:
                    </Typography>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                      KSh {sessionTypes.find(s => s.type === sessionType)?.price.toLocaleString()}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => setConfirmDialogOpen(true)}
                    sx={{
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      mb: 2
                    }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Confirm Booking'}
                  </Button>

                  <Alert severity="info" sx={{ textAlign: 'left' }}>
                    <Typography variant="body2">
                      You'll receive a confirmation email with session details and payment instructions.
                    </Typography>
                  </Alert>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Fade>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Confirm Your Booking
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to book this session? Once confirmed, you'll receive further instructions via email.
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {sessionType} Session with Dr. {selectedPsychologist?.name}
            </Typography>
            <Typography variant="body2">
              {startDate?.toLocaleDateString()} at {startDate?.toLocaleTimeString()}
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
              KSh {sessionTypes.find(s => s.type === sessionType)?.price.toLocaleString()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmBooking}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookingPage;
