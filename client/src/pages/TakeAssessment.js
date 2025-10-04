import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const TakeAssessment = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fallback assessment data in case navigation state is missing
  const fallbackAssessments = {
    'phq9': {
      id: 'phq9',
      title: 'Depression Assessment (PHQ-9)',
      description: 'Patient Health Questionnaire for depression screening',
      category: 'Depression',
      duration: '5-7 minutes',
      questions: 9,
      color: '#1976d2',
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
    'gad7': {
      id: 'gad7',
      title: 'Anxiety Assessment (GAD-7)',
      description: 'Generalized Anxiety Disorder screening tool',
      category: 'Anxiety Disorders',
      duration: '3-5 minutes',
      questions: 7,
      color: '#f57c00',
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
    'stress': {
      id: 'stress',
      title: 'Stress Level Assessment',
      description: 'Evaluate your current stress levels and coping mechanisms',
      category: 'Stress Management',
      duration: '4-6 minutes',
      questions: 10,
      color: '#d32f2f',
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
    'relationship': {
      id: 'relationship',
      title: 'Relationship Satisfaction Scale',
      description: 'Assess the quality and satisfaction in your relationships',
      category: 'Relationship Issues',
      duration: '6-8 minutes',
      questions: 12,
      color: '#7b1fa2',
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
    'self_esteem': {
      id: 'self_esteem',
      title: 'Self-Esteem Assessment',
      description: 'Evaluate your self-worth and confidence levels',
      category: 'General',
      duration: '4-5 minutes',
      questions: 8,
      color: '#388e3c',
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
  };
  
  const assessmentData = location.state?.assessmentData || fallbackAssessments[id];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  // Scoring scale for most assessments (0-3 scale)
  const responseOptions = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' }
  ];

  // For relationship assessment, use different scale
  const relationshipOptions = [
    { value: 0, label: 'Strongly Disagree' },
    { value: 1, label: 'Disagree' },
    { value: 2, label: 'Neutral' },
    { value: 3, label: 'Agree' },
    { value: 4, label: 'Strongly Agree' }
  ];

  const getCurrentOptions = () => {
    return assessmentData?.id === 'relationship' ? relationshipOptions : responseOptions;
  };

  const handleAnswerChange = (value) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: parseInt(value)
    }));
  };

  const handleNext = () => {
    if (currentQuestion < assessmentData.questions_data.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = () => {
    const totalScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
    const maxScore = assessmentData.questions_data.length * (getCurrentOptions().length - 1);
    const percentage = Math.round((totalScore / maxScore) * 100);

    let interpretation = '';
    let severity = '';
    let recommendations = [];

    // Interpretation based on assessment type
    switch (assessmentData.id) {
      case 'phq9':
        if (totalScore <= 4) {
          severity = 'Minimal';
          interpretation = 'Minimal depression symptoms';
          recommendations = ['Continue healthy lifestyle habits', 'Regular exercise and social connection'];
        } else if (totalScore <= 9) {
          severity = 'Mild';
          interpretation = 'Mild depression symptoms';
          recommendations = ['Consider lifestyle changes', 'Monitor symptoms', 'Consider counseling if symptoms persist'];
        } else if (totalScore <= 14) {
          severity = 'Moderate';
          interpretation = 'Moderate depression symptoms';
          recommendations = ['Recommend professional counseling', 'Consider therapy options', 'Monitor closely'];
        } else {
          severity = 'Severe';
          interpretation = 'Severe depression symptoms';
          recommendations = ['Immediate professional help recommended', 'Consider therapy and medical evaluation', 'Crisis support if needed'];
        }
        break;

      case 'gad7':
        if (totalScore <= 4) {
          severity = 'Minimal';
          interpretation = 'Minimal anxiety symptoms';
          recommendations = ['Continue stress management practices', 'Maintain healthy routines'];
        } else if (totalScore <= 9) {
          severity = 'Mild';
          interpretation = 'Mild anxiety symptoms';
          recommendations = ['Practice relaxation techniques', 'Consider mindfulness or meditation', 'Monitor symptoms'];
        } else if (totalScore <= 14) {
          severity = 'Moderate';
          interpretation = 'Moderate anxiety symptoms';
          recommendations = ['Professional counseling recommended', 'Learn anxiety management techniques', 'Consider therapy'];
        } else {
          severity = 'Severe';
          interpretation = 'Severe anxiety symptoms';
          recommendations = ['Immediate professional help recommended', 'Consider therapy and medical evaluation', 'Crisis support available'];
        }
        break;

      case 'stress':
        if (percentage <= 25) {
          severity = 'Low';
          interpretation = 'Low stress levels - well managed';
          recommendations = ['Continue current coping strategies', 'Maintain work-life balance'];
        } else if (percentage <= 50) {
          severity = 'Moderate';
          interpretation = 'Moderate stress levels';
          recommendations = ['Implement stress reduction techniques', 'Consider time management strategies', 'Regular exercise'];
        } else if (percentage <= 75) {
          severity = 'High';
          interpretation = 'High stress levels';
          recommendations = ['Professional stress management counseling', 'Lifestyle changes needed', 'Consider therapy'];
        } else {
          severity = 'Very High';
          interpretation = 'Very high stress levels';
          recommendations = ['Immediate professional help recommended', 'Stress management therapy', 'Medical evaluation if needed'];
        }
        break;

      case 'relationship':
        if (percentage >= 80) {
          severity = 'Excellent';
          interpretation = 'Very satisfied with relationship';
          recommendations = ['Continue nurturing your relationship', 'Share positive practices with others'];
        } else if (percentage >= 60) {
          severity = 'Good';
          interpretation = 'Generally satisfied with relationship';
          recommendations = ['Focus on areas for improvement', 'Regular relationship check-ins'];
        } else if (percentage >= 40) {
          severity = 'Fair';
          interpretation = 'Some relationship challenges present';
          recommendations = ['Consider couples counseling', 'Improve communication skills', 'Work on identified issues'];
        } else {
          severity = 'Poor';
          interpretation = 'Significant relationship difficulties';
          recommendations = ['Couples therapy strongly recommended', 'Professional relationship counseling', 'Individual therapy may also help'];
        }
        break;

      case 'self_esteem':
        if (percentage >= 75) {
          severity = 'High';
          interpretation = 'Healthy self-esteem levels';
          recommendations = ['Continue positive self-care practices', 'Support others in building confidence'];
        } else if (percentage >= 50) {
          severity = 'Moderate';
          interpretation = 'Moderate self-esteem with room for growth';
          recommendations = ['Practice self-compassion', 'Challenge negative self-talk', 'Consider confidence-building activities'];
        } else {
          severity = 'Low';
          interpretation = 'Low self-esteem concerns';
          recommendations = ['Professional counseling recommended', 'Self-esteem building therapy', 'Cognitive behavioral therapy may help'];
        }
        break;

      default:
        severity = 'Unknown';
        interpretation = 'Assessment completed';
        recommendations = ['Discuss results with a professional'];
    }

    setResults({
      totalScore,
      maxScore,
      percentage,
      severity,
      interpretation,
      recommendations,
      completedAt: new Date()
    });
    setShowResults(true);
  };

  const saveResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const resultData = {
        assessmentId: assessmentData.id,
        assessmentTitle: assessmentData.title,
        answers,
        totalScore: results.totalScore,
        maxScore: results.maxScore,
        percentage: results.percentage,
        severity: results.severity,
        interpretation: results.interpretation,
        recommendations: results.recommendations
      };

      await axios.post(`${API_ENDPOINTS.BASE_URL}/api/assessments/results`, resultData, config);
      navigate('/assessment-results');
    } catch (err) {
      console.error('Failed to save results:', err);
    }
  };

  if (!assessmentData) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="error">
          Assessment data not found. Please return to the assessments page and try again.
        </Alert>
        <Button onClick={() => navigate('/assessments')} sx={{ mt: 2 }}>
          Back to Assessments
        </Button>
      </Container>
    );
  }

  if (showResults) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Assessment Complete!
          </Typography>
          
          <Card sx={{ mt: 3, mb: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {assessmentData.title} Results
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                {results.totalScore}/{results.maxScore}
              </Typography>
              <Typography variant="h6" gutterBottom>
                Severity: {results.severity}
              </Typography>
              <Typography variant="body1" paragraph>
                {results.interpretation}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                Recommendations:
              </Typography>
              <Box component="ul" sx={{ textAlign: 'left', pl: 2 }}>
                {results.recommendations.map((rec, index) => (
                  <Typography component="li" variant="body2" key={index} sx={{ mb: 0.5 }}>
                    {rec}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            These results are for informational purposes only and should be discussed with a qualified mental health professional.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => navigate('/assessments')}>
              Take Another Assessment
            </Button>
            <Button variant="contained" onClick={saveResults}>
              Save Results & Continue
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/assessments')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {assessmentData.title}
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={((currentQuestion + 1) / assessmentData.questions_data.length) * 100}
          sx={{ mb: 2, height: 8, borderRadius: 4 }}
        />
        
        <Typography variant="body2" color="text.secondary">
          Question {currentQuestion + 1} of {assessmentData.questions_data.length}
        </Typography>
      </Paper>

      {/* Question */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Over the last 2 weeks, how often have you been bothered by:
        </Typography>
        
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
          {assessmentData.questions_data[currentQuestion]}
        </Typography>

        <RadioGroup
          value={answers[currentQuestion] || ''}
          onChange={(e) => handleAnswerChange(e.target.value)}
        >
          {getCurrentOptions().map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio />}
              label={option.label}
              sx={{ 
                mb: 1, 
                p: 1, 
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            />
          ))}
        </RadioGroup>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            startIcon={<ArrowBackIcon />}
          >
            Previous
          </Button>
          
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={answers[currentQuestion] === undefined}
            endIcon={currentQuestion === assessmentData.questions_data.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
          >
            {currentQuestion === assessmentData.questions_data.length - 1 ? 'Complete Assessment' : 'Next Question'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TakeAssessment;