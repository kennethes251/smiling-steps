import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  LinearProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon
} from '@mui/icons-material';

const AssessmentsPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Predefined assessment tests based on common psychological evaluations
  const assessmentTests = [
    {
      id: 'phq9',
      title: 'Depression Assessment (PHQ-9)',
      description: 'Patient Health Questionnaire for depression screening',
      category: 'Depression',
      duration: '5-7 minutes',
      questions: 9,
      color: '#1976d2',
      icon: <PsychologyIcon />,
      questions_data: [
        'Little interest or pleasure in doing things',
        'Feeling down, depressed, or hopeless',
        'Trouble falling or staying asleep, or sleeping too much',
        'Feeling tired or having little energy',
        'Poor appetite or overeating',
        'Feeling bad about yourself or that you are a failure',
        'Trouble concentrating on things',
        'Moving or speaking slowly, or being fidgety/restless',
        'Thoughts that you would be better off dead or hurting yourself'
      ]
    },
    {
      id: 'gad7',
      title: 'Anxiety Assessment (GAD-7)',
      description: 'Generalized Anxiety Disorder screening tool',
      category: 'Anxiety Disorders',
      duration: '3-5 minutes',
      questions: 7,
      color: '#f57c00',
      icon: <AssessmentIcon />,
      questions_data: [
        'Feeling nervous, anxious, or on edge',
        'Not being able to stop or control worrying',
        'Worrying too much about different things',
        'Trouble relaxing',
        'Being so restless that it is hard to sit still',
        'Becoming easily annoyed or irritable',
        'Feeling afraid, as if something awful might happen'
      ]
    },
    {
      id: 'stress',
      title: 'Stress Level Assessment',
      description: 'Evaluate your current stress levels and coping mechanisms',
      category: 'Stress Management',
      duration: '4-6 minutes',
      questions: 10,
      color: '#d32f2f',
      icon: <TrendingUpIcon />,
      questions_data: [
        'I feel overwhelmed by my responsibilities',
        'I have trouble sleeping due to stress',
        'I find it difficult to concentrate on tasks',
        'I feel irritable or short-tempered',
        'I experience physical symptoms of stress (headaches, muscle tension)',
        'I worry excessively about future events',
        'I feel like I have no control over my life',
        'I avoid social situations due to stress',
        'I use unhealthy coping mechanisms (overeating, substance use)',
        'I feel emotionally exhausted most days'
      ]
    },
    {
      id: 'relationship',
      title: 'Relationship Satisfaction Scale',
      description: 'Assess the quality and satisfaction in your relationships',
      category: 'Relationship Issues',
      duration: '6-8 minutes',
      questions: 12,
      color: '#7b1fa2',
      icon: <StarIcon />,
      questions_data: [
        'I feel satisfied with my relationship',
        'My partner and I communicate effectively',
        'We resolve conflicts in a healthy way',
        'I feel emotionally supported by my partner',
        'We share similar values and goals',
        'I trust my partner completely',
        'We spend quality time together regularly',
        'Physical intimacy is satisfying for both of us',
        'We support each other\'s individual growth',
        'I feel appreciated and valued in the relationship',
        'We handle financial decisions well together',
        'I see a positive future with my partner'
      ]
    },
    {
      id: 'self_esteem',
      title: 'Self-Esteem Assessment',
      description: 'Evaluate your self-worth and confidence levels',
      category: 'General',
      duration: '4-5 minutes',
      questions: 8,
      color: '#388e3c',
      icon: <CheckCircleIcon />,
      questions_data: [
        'I feel confident in my abilities',
        'I believe I am worthy of love and respect',
        'I accept compliments gracefully',
        'I can handle criticism without feeling devastated',
        'I feel comfortable expressing my opinions',
        'I believe I have valuable qualities to offer',
        'I don\'t constantly compare myself to others',
        'I feel good about my appearance and personality'
      ]
    }
  ];

  useEffect(() => {
    fetchCompletedAssessments();
  }, []);

  const fetchCompletedAssessments = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get('http://localhost:5000/api/assessments/results/me', config);
      setCompletedAssessments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch completed assessments:', err);
    }
  };

  const startAssessment = (assessment) => {
    // Remove React elements before passing through navigation state
    const { icon, ...assessmentDataWithoutIcon } = assessment;
    navigate(`/assessment/${assessment.id}`, { state: { assessmentData: assessmentDataWithoutIcon } });
  };

  const isCompleted = (assessmentId) => {
    return completedAssessments.some(result => result.assessmentId === assessmentId);
  };

  const getCompletionRate = () => {
    return Math.round((completedAssessments.length / assessmentTests.length) * 100);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Mental Health Assessments
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Take scientifically-validated assessments to better understand your mental health
        </Typography>
      </Box>

      {/* Enhanced Progress Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h6" gutterBottom>
              Your Assessment Journey
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You've completed {completedAssessments.length} out of {assessmentTests.length} available assessments
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={getCompletionRate()} 
              sx={{ 
                height: 10, 
                borderRadius: 5,
                bgcolor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': { bgcolor: 'white' }
              }} 
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">
                {completedAssessments.length} completed
              </Typography>
              <Typography variant="body2">
                {assessmentTests.length - completedAssessments.length} remaining
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {getCompletionRate()}%
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Assessment Progress
            </Typography>
            {getCompletionRate() === 100 && (
              <Chip 
                icon={<CheckCircleIcon />} 
                label="All Complete!" 
                color="success" 
                sx={{ mt: 1, mx: 'auto' }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {completedAssessments.length}
            </Typography>
            <Typography variant="body2">
              Completed
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {assessmentTests.length - completedAssessments.length}
            </Typography>
            <Typography variant="body2">
              Remaining
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {assessmentTests.reduce((total, test) => total + test.questions, 0)}
            </Typography>
            <Typography variant="body2">
              Total Questions
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              ~{Math.round(assessmentTests.reduce((total, test) => {
                const avgMinutes = parseInt(test.duration.split('-')[0]);
                return total + avgMinutes;
              }, 0) * (1 - getCompletionRate() / 100))}
            </Typography>
            <Typography variant="body2">
              Minutes Left
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Assessment Cards */}
      <Grid container spacing={3}>
        {assessmentTests.map((assessment) => {
          const completed = isCompleted(assessment.id);
          
          return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={assessment.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  },
                  border: completed ? '2px solid' : 'none',
                  borderColor: 'success.main'
                }}
              >
                {completed && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Completed"
                    color="success"
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      zIndex: 1 
                    }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      bgcolor: assessment.color, 
                      color: 'white',
                      mr: 2
                    }}>
                      {assessment.icon}
                    </Box>
                    <Chip 
                      label={assessment.category} 
                      size="small" 
                      sx={{ bgcolor: assessment.color, color: 'white' }}
                    />
                  </Box>
                  
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {assessment.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {assessment.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      icon={<ScheduleIcon />} 
                      label={assessment.duration} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`${assessment.questions} questions`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </CardContent>
                
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={completed ? "outlined" : "contained"}
                    onClick={() => startAssessment(assessment)}
                    sx={{ 
                      py: 1.5,
                      fontWeight: 'bold',
                      bgcolor: completed ? 'transparent' : assessment.color,
                      '&:hover': {
                        bgcolor: completed ? 'action.hover' : assessment.color,
                        opacity: 0.9
                      }
                    }}
                  >
                    {completed ? 'Retake Assessment' : 'Start Assessment'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Information Section */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          About These Assessments
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Scientifically Validated" 
              secondary="All assessments are based on established psychological screening tools"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Confidential & Secure" 
              secondary="Your responses are encrypted and only shared with your chosen therapist"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Professional Guidance" 
              secondary="Results should be discussed with a qualified mental health professional"
            />
          </ListItem>
        </List>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            These assessments are screening tools and not diagnostic instruments. 
            If you're experiencing a mental health crisis, please contact emergency services or a crisis hotline immediately.
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
};

export default AssessmentsPage;