import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';

const BookingPageSimple = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionType, setSessionType] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const steps = ['Choose Session Type', 'Select Psychologist', 'Pick Date & Time', 'Confirm Booking'];

  // Handle pre-selected psychologist from therapists page
  useEffect(() => {
    if (location.state?.selectedPsychologist) {
      setSelectedPsychologist(location.state.selectedPsychologist);
      setCurrentStep(0); // Start with session type selection
    }
  }, [location.state]);

  // Dynamic session types based on selected psychologist's rates
  const getSessionTypes = () => {
    const baseRates = selectedPsychologist?.rates || {
      individual: 2000,
      couples: 3500,
      family: 4000,
      group: 1500
    };

    return [
      {
        type: 'Individual',
        price: baseRates.individual,
        description: 'One-on-one personalized therapy session'
      },
      {
        type: 'Couples',
        price: baseRates.couples,
        description: 'Relationship counseling for couples'
      },
      {
        type: 'Family',
        price: baseRates.family,
        description: 'Family therapy sessions for healing and communication'
      },
      {
        type: 'Group',
        price: baseRates.group,
        description: 'Group therapy with peers and professional guidance'
      }
    ];
  };

  const sessionTypes = getSessionTypes();

  const handleSelectSession = (type) => {
    setSessionType(type);
    setCurrentStep(1);
    fetchPsychologists();
  };

  const handleSelectPsychologist = (psychologist) => {
    setSelectedPsychologist(psychologist);
    setCurrentStep(2);
  };

  const handleDateTimeConfirm = () => {
    if (!selectedTime) {
      setError('Please select a time slot');
      return;
    }
    setCurrentStep(3);
    setError('');
  };

  const getAvailableTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const handleBookSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token
        }
      };

      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const sessionDateTime = new Date(selectedDate);
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const selectedSessionType = sessionTypes.find(s => s.type === sessionType);
      const bookingData = {
        psychologistId: selectedPsychologist._id,
        sessionType,
        sessionDate: sessionDateTime,
        price: selectedSessionType.price,
      };

      console.log('📤 Sending booking data:', bookingData);
      console.log('🔑 Auth config:', config);

      const response = await axios.post('http://localhost:5000/api/sessions', bookingData, config);
      
      if (response.status === 200) {
        setConfirmDialogOpen(false);
        alert(`✅ Booking Request Sent!\n\nYour ${sessionType} session request with Dr. ${selectedPsychologist.name} has been sent for approval.\n\nScheduled for: ${sessionDateTime.toLocaleDateString()} at ${selectedTime}\n\nThe psychologist will review your request and confirm availability.`);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Booking failed', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 403) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.msg || 'Invalid booking data. Please check your selection.');
      } else {
        setError(`Booking failed: ${err.response?.data?.msg || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 1) {
        setSessionType(null);
        setPsychologists([]);
      } else if (currentStep === 2) {
        setSelectedPsychologist(null);
      } else if (currentStep === 3) {
        setSelectedTime('');
      }
    }
  };

  const fetchPsychologists = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api/public/psychologists` : 'http://localhost:5000/api/public/psychologists');
      // The public endpoint returns data directly (not wrapped in success object)
      const psychologists = res.data || [];
      
      // Use the enhanced data that comes from the public endpoint
      setPsychologists(psychologists);
      
      if (psychologists.length === 0) {
        setError(`No psychologists currently available. Please try again later.`);
      }
    } catch (err) {
      console.error('Failed to fetch psychologists:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view available psychologists.');
      } else {
        setError('Unable to connect to server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

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
        <Stepper activeStep={currentStep} alternativeLabel>
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

      {/* Back Button */}
      {currentStep > 0 && (
        <Button variant="outlined" onClick={handleBack} sx={{ mb: 2 }}>
          ← Back
        </Button>
      )}

      {/* Step 1: Session Type Selection */}
      {currentStep === 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Choose Session Type
          </Typography>
          <Grid container spacing={3}>
            {sessionTypes.map((session) => (
              <Grid size={{ xs: 12, md: 6 }} key={session.type}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleSelectSession(session.type)}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {session.type} Session
                    </Typography>
                    <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                      KSh {session.price.toLocaleString()}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      {session.description}
                    </Typography>
                    <Button variant="contained" size="large" sx={{ mt: 2 }}>
                      Select {session.type}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Step 2: Psychologist Selection */}
      {currentStep === 1 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Choose Your Psychologist for {sessionType} Session
          </Typography>

          {/* Pre-selected Psychologist from Therapists Page */}
          {location.state?.selectedPsychologist && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                You selected Dr. {location.state.selectedPsychologist.name} from our therapists directory
              </Alert>
              <Card 
                sx={{ 
                  border: '2px solid',
                  borderColor: 'primary.main',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: 4 
                  }
                }}
                onClick={() => handleSelectPsychologist(location.state.selectedPsychologist)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ 
                      width: 60, 
                      height: 60, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      mr: 2 
                    }}>
                      {location.state.selectedPsychologist.name.split(' ').map(n => n[0]).join('')}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Dr. {location.state.selectedPsychologist.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Licensed Psychologist
                      </Typography>
                      {location.state.selectedPsychologist.specializations && (
                        <Typography variant="caption" color="text.secondary">
                          Specializes in: {location.state.selectedPsychologist.specializations.slice(0, 2).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Button variant="contained" fullWidth>
                    Continue with Dr. {location.state.selectedPsychologist.name}
                  </Button>
                </CardContent>
              </Card>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Or choose a different psychologist below:
              </Typography>
            </Box>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={60} />
              <Typography sx={{ ml: 2 }}>Loading psychologists...</Typography>
            </Box>
          ) : psychologists.length > 0 ? (
            <Grid container spacing={3}>
              {psychologists.map((psychologist) => (
                <Grid size={{ xs: 12, md: 6 }} key={psychologist._id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        transform: 'translateY(-4px)', 
                        boxShadow: 4 
                      }
                    }}
                    onClick={() => handleSelectPsychologist(psychologist)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ 
                          width: 50, 
                          height: 50, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          mr: 2 
                        }}>
                          {psychologist.name.split(' ').map(n => n[0]).join('')}
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Dr. {psychologist.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Licensed Psychologist
                          </Typography>
                        </Box>
                      </Box>
                      
                      {psychologist.bio && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {psychologist.bio.length > 80 ? 
                            `${psychologist.bio.substring(0, 80)}...` : 
                            psychologist.bio
                          }
                        </Typography>
                      )}
                      
                      {psychologist.specializations && psychologist.specializations.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                          Specializes in: {psychologist.specializations.slice(0, 2).join(', ')}
                          {psychologist.specializations.length > 2 && ` +${psychologist.specializations.length - 2} more`}
                        </Typography>
                      )}
                      
                      <Button variant="outlined" fullWidth sx={{ mt: 1 }}>
                        Select Dr. {psychologist.name}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              No psychologists available at the moment. Please try again later.
            </Alert>
          )}
        </Paper>
      )}

      {/* Step 3: Date & Time Selection */}
      {currentStep === 2 && selectedPsychologist && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Select Date & Time with Dr. {selectedPsychologist.name}
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
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
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
                      variant={selectedTime === time ? "contained" : "outlined"}
                      fullWidth
                      size="small"
                      onClick={() => setSelectedTime(time)}
                      sx={{ mb: 1 }}
                    >
                      {time}
                    </Button>
                  </Grid>
                ))}
              </Grid>
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleDateTimeConfirm}
                disabled={!selectedTime}
                sx={{ mt: 3 }}
              >
                Continue to Confirmation
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 3 && (
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Confirm Your Booking Request
          </Typography>
          
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Booking Summary
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Session Type:
              </Typography>
              <Typography variant="body1">{sessionType} Session</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Psychologist:
              </Typography>
              <Typography variant="body1">Dr. {selectedPsychologist?.name}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Requested Date & Time:
              </Typography>
              <Typography variant="body1">
                {selectedDate?.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} at {selectedTime}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Price:
              </Typography>
              <Typography variant="h6" color="primary">
                KSh {sessionTypes.find(s => s.type === sessionType)?.price.toLocaleString()}
              </Typography>
            </Box>
          </Card>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Your booking request will be sent to Dr. {selectedPsychologist?.name} for approval. 
              They will confirm availability for your requested time slot.
            </Typography>
          </Alert>
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => setConfirmDialogOpen(true)}
            disabled={loading}
            sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Booking Request'}
          </Button>
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Confirm Booking Request
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to send this booking request to Dr. {selectedPsychologist?.name}?
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {sessionType} Session
            </Typography>
            <Typography variant="body2">
              {selectedDate?.toLocaleDateString()} at {selectedTime}
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
            onClick={handleBookSession}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookingPageSimple;