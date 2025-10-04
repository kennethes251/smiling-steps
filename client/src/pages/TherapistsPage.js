import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Box,
  Button,
  Chip,
  Rating,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  School as EducationIcon,
  Work as ExperienceIcon,
  Psychology as SpecialtyIcon,
  Close as CloseIcon,
  CalendarToday as BookIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const TherapistsPage = () => {
  const [therapists, setTherapists] = useState([]);
  const [filteredTherapists, setFilteredTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTherapists();
  }, []);

  useEffect(() => {
    filterTherapists();
    // Calculate specialties when therapists change
    if (Array.isArray(therapists) && therapists.length > 0) {
      const specialties = [];
      therapists.forEach(therapist => {
        if (therapist.specializations && Array.isArray(therapist.specializations)) {
          specialties.push(...therapist.specializations);
        }
      });
      setAllSpecialties([...new Set(specialties)]);
    }
  }, [searchTerm, specialtyFilter, therapists]);

  const fetchTherapists = async () => {
    try {
      console.log('🔍 Fetching therapists from API...');
      const response = await axios.get(process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api/public/psychologists` : 'http://localhost:5000/api/public/psychologists');
      console.log('✅ API Response:', response.data);
      console.log('📊 Number of therapists:', response.data?.length || 0);
      setTherapists(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching therapists:', error);
      setTherapists([]); // Ensure it's always an array
      setLoading(false);
    }
  };

  const filterTherapists = () => {
    if (!Array.isArray(therapists)) {
      setFilteredTherapists([]);
      return;
    }

    let filtered = therapists;

    if (searchTerm) {
      filtered = filtered.filter(therapist =>
        therapist.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapist.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapist.specializations?.some(spec => 
          spec.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (specialtyFilter) {
      filtered = filtered.filter(therapist =>
        therapist.specializations?.includes(specialtyFilter)
      );
    }

    setFilteredTherapists(filtered);
  };

  const getProfileImageUrl = (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture.startsWith('http') 
      ? profilePicture 
      : `http://localhost:5000${profilePicture}`;
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleViewDetails = (therapist) => {
    setSelectedTherapist(therapist);
    setDetailsOpen(true);
  };

  const handleBookSession = (therapist) => {
    navigate('/booking', { state: { selectedPsychologist: therapist } });
  };



  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>Loading therapists...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #663399 0%, #9C27B0 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Find Your Therapist
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Connect with licensed professionals who understand your journey
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by name, specialty, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Specialty</InputLabel>
              <Select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                label="Filter by Specialty"
              >
                <MenuItem value="">All Specialties</MenuItem>
                {allSpecialties.map(specialty => (
                  <MenuItem key={specialty} value={specialty}>
                    {specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredTherapists.length} therapist{filteredTherapists.length !== 1 ? 's' : ''} found
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Therapists Grid */}
      <Grid container spacing={3}>
        {filteredTherapists.map((therapist) => (
          <Grid item xs={12} md={6} lg={4} key={therapist._id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}>
              {/* Profile Section */}
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={getProfileImageUrl(therapist.profilePicture)}
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      mr: 2,
                      border: '2px solid',
                      borderColor: 'primary.main'
                    }}
                  >
                    {getInitials(therapist.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Dr. {therapist.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Licensed Psychologist
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Rating value={therapist.rating?.average || 4.5} precision={0.1} size="small" readOnly />
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        ({therapist.rating?.average || 4.5}) • {therapist.rating?.count || 127} reviews
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Bio */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {therapist.bio ? 
                    (therapist.bio.length > 120 ? 
                      `${therapist.bio.substring(0, 120)}...` : 
                      therapist.bio
                    ) : 
                    'Dedicated to helping clients achieve mental wellness and personal growth.'
                  }
                </Typography>

                {/* Specializations */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Specializations:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(therapist.specializations || ['Anxiety', 'Depression']).slice(0, 3).map((spec, index) => (
                      <Chip 
                        key={index} 
                        label={spec} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {(therapist.specializations || []).length > 3 && (
                      <Chip 
                        label={`+${(therapist.specializations || []).length - 3} more`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Experience & Rates */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ExperienceIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {therapist.experience || '5+'} years experience
                  </Typography>
                </Box>
                
                {/* Session Rates */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Session Rates:
                  </Typography>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    Individual: ${((therapist.rates?.individual || 2000) / 100).toFixed(0)} • 
                    Couples: ${((therapist.rates?.couples || 3500) / 100).toFixed(0)}
                  </Typography>
                </Box>
              </CardContent>

              {/* Action Buttons */}
              <Box sx={{ p: 2, pt: 0 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => handleViewDetails(therapist)}
                    >
                      View Details
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      startIcon={<BookIcon />}
                      onClick={() => handleBookSession(therapist)}
                    >
                      Book Session
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* No Results */}
      {filteredTherapists.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No therapists found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or browse all available therapists.
          </Typography>
        </Box>
      )}

      {/* Therapist Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        {selectedTherapist && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'linear-gradient(135deg, #663399 0%, #9C27B0 100%)',
              color: 'white'
            }}>
              <Typography variant="h6">Dr. {selectedTherapist.name}</Typography>
              <IconButton
                onClick={() => setDetailsOpen(false)}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              {/* Profile Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src={getProfileImageUrl(selectedTherapist.profilePicture)}
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mr: 3,
                    border: '3px solid',
                    borderColor: 'primary.main'
                  }}
                >
                  {getInitials(selectedTherapist.name)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    Dr. {selectedTherapist.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Licensed Psychologist
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Rating value={selectedTherapist.rating?.average || 4.5} precision={0.1} readOnly />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {selectedTherapist.rating?.average || 4.5} ({selectedTherapist.rating?.count || 127} reviews)
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Bio */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>About</Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedTherapist.bio || 
                    'Dr. ' + selectedTherapist.name + ' is a dedicated mental health professional committed to helping clients achieve their therapeutic goals through evidence-based practices and compassionate care.'
                  }
                </Typography>
              </Box>

              {/* Specializations */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <SpecialtyIcon sx={{ mr: 1 }} />
                  Specializations
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(selectedTherapist.specializations || ['Anxiety Disorders', 'Depression', 'Trauma Therapy']).map((spec, index) => (
                    <Chip key={index} label={spec} color="primary" variant="outlined" />
                  ))}
                </Box>
              </Box>

              {/* Session Rates */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Session Rates
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.main">
                        ${((selectedTherapist.rates?.individual || 2000) / 100).toFixed(0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Individual
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.main">
                        ${((selectedTherapist.rates?.couples || 3500) / 100).toFixed(0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Couples
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.main">
                        ${((selectedTherapist.rates?.family || 4000) / 100).toFixed(0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Family
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.main">
                        ${((selectedTherapist.rates?.group || 1500) / 100).toFixed(0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Group
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Education & Experience */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <EducationIcon sx={{ mr: 1 }} />
                    Education
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTherapist.education || 'Ph.D. in Clinical Psychology\nMaster\'s in Counseling Psychology'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <ExperienceIcon sx={{ mr: 1 }} />
                    Experience
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTherapist.experience || '5+'} years of clinical experience
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              <Button 
                variant="contained" 
                startIcon={<BookIcon />}
                onClick={() => {
                  setDetailsOpen(false);
                  handleBookSession(selectedTherapist);
                }}
              >
                Book Session with Dr. {selectedTherapist.name}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default TherapistsPage;