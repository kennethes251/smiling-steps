import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Chip,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Tabs,
  Tab
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  CalendarToday as CalendarIcon,
  EmojiEvents as GoalsIcon,
  Mood as MoodIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Insights as InsightsIcon,
  Star as StarIcon
} from '@mui/icons-material';

const ProgressPage = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [moodEntries, setMoodEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [moodDialogOpen, setMoodDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: '', targetDate: '' });
  const [newMood, setNewMood] = useState({ rating: 5, notes: '', energy: 5, anxiety: 3, sleep: 5 });

  // Mock data for demonstration
  const mockAssessmentData = [
    { date: '2024-01-15', phq9: 12, gad7: 8, stress: 65 },
    { date: '2024-02-15', phq9: 10, gad7: 6, stress: 55 },
    { date: '2024-03-15', phq9: 8, gad7: 5, stress: 45 },
    { date: '2024-04-15', phq9: 6, gad7: 4, stress: 35 }
  ];

  const mockMoodData = [
    { date: '2024-04-01', mood: 6, energy: 7, anxiety: 4, sleep: 6 },
    { date: '2024-04-02', mood: 7, energy: 8, anxiety: 3, sleep: 7 },
    { date: '2024-04-03', mood: 5, energy: 6, anxiety: 5, sleep: 5 },
    { date: '2024-04-04', mood: 8, energy: 9, anxiety: 2, sleep: 8 },
    { date: '2024-04-05', mood: 7, energy: 7, anxiety: 3, sleep: 7 }
  ];

  const mockGoals = [
    { id: 1, title: 'Practice Daily Meditation', description: '10 minutes of mindfulness daily', category: 'Mindfulness', progress: 75, targetDate: '2024-05-01', completed: false },
    { id: 2, title: 'Improve Sleep Schedule', description: 'Sleep by 10 PM, wake at 6 AM', category: 'Sleep', progress: 60, targetDate: '2024-04-30', completed: false },
    { id: 3, title: 'Complete CBT Exercises', description: 'Weekly cognitive behavioral therapy homework', category: 'Therapy', progress: 90, targetDate: '2024-04-25', completed: false },
    { id: 4, title: 'Social Connection', description: 'Meet with friends twice per week', category: 'Social', progress: 100, targetDate: '2024-04-20', completed: true }
  ];

  const mockSessions = [
    { id: 1, date: '2024-04-01', psychologist: 'Dr. Sarah Johnson', type: 'Individual', status: 'Completed', rating: 5 },
    { id: 2, date: '2024-04-08', psychologist: 'Dr. Sarah Johnson', type: 'Individual', status: 'Completed', rating: 4 },
    { id: 3, date: '2024-04-15', psychologist: 'Dr. Sarah Johnson', type: 'Individual', status: 'Upcoming', rating: null },
    { id: 4, date: '2024-04-22', psychologist: 'Dr. Sarah Johnson', type: 'Individual', status: 'Scheduled', rating: null }
  ];

  useEffect(() => {
    // In a real app, fetch data from API
    setAssessmentHistory(mockAssessmentData);
    setMoodEntries(mockMoodData);
    setGoals(mockGoals);
    setSessionHistory(mockSessions);
    setLoading(false);
  }, []);

  const handleAddGoal = () => {
    const goal = {
      id: goals.length + 1,
      ...newGoal,
      progress: 0,
      completed: false
    };
    setGoals([...goals, goal]);
    setNewGoal({ title: '', description: '', category: '', targetDate: '' });
    setGoalDialogOpen(false);
  };

  const handleAddMood = () => {
    const mood = {
      date: new Date().toISOString().split('T')[0],
      mood: newMood.rating,
      energy: newMood.energy,
      anxiety: newMood.anxiety,
      sleep: newMood.sleep,
      notes: newMood.notes
    };
    setMoodEntries([...moodEntries, mood]);
    setNewMood({ rating: 5, notes: '', energy: 5, anxiety: 3, sleep: 5 });
    setMoodDialogOpen(false);
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'warning';
    return 'error';
  };

  const calculateOverallProgress = () => {
    const completedGoals = goals.filter(g => g.completed).length;
    const totalGoals = goals.length;
    return totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  };

  const getAverageAssessmentImprovement = () => {
    if (assessmentHistory.length < 2) return 0;
    const first = assessmentHistory[0];
    const last = assessmentHistory[assessmentHistory.length - 1];
    const phq9Improvement = ((first.phq9 - last.phq9) / first.phq9) * 100;
    const gad7Improvement = ((first.gad7 - last.gad7) / first.gad7) * 100;
    return Math.round((phq9Improvement + gad7Improvement) / 2);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading your progress...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Your Mental Health Journey
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Track your progress, celebrate achievements, and stay motivated
        </Typography>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {getAverageAssessmentImprovement()}%
            </Typography>
            <Typography variant="body2">
              Overall Improvement
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <GoalsIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {goals.filter(g => g.completed).length}/{goals.length}
            </Typography>
            <Typography variant="body2">
              Goals Achieved
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
            <ScheduleIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {sessionHistory.filter(s => s.status === 'Completed').length}
            </Typography>
            <Typography variant="body2">
              Sessions Completed
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <MoodIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {moodEntries.length > 0 ? (moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length).toFixed(1) : 'N/A'}
            </Typography>
            <Typography variant="body2">
              Average Mood
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different sections */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<TimelineIcon />} label="Assessment Progress" />
          <Tab icon={<MoodIcon />} label="Mood Tracking" />
          <Tab icon={<GoalsIcon />} label="Goals & Milestones" />
          <Tab icon={<ScheduleIcon />} label="Session History" />
          <Tab icon={<InsightsIcon />} label="Insights" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Assessment Scores Over Time
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {assessmentHistory.map((entry, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.date).toLocaleDateString()}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ color: '#1976d2' }}>
                          Depression: {entry.phq9}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(entry.phq9 / 27) * 100} 
                          sx={{ my: 0.5, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#1976d2' } }}
                        />
                        <Typography variant="body2" sx={{ color: '#f57c00' }}>
                          Anxiety: {entry.gad7}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(entry.gad7 / 21) * 100} 
                          sx={{ my: 0.5, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#f57c00' } }}
                        />
                        <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                          Stress: {entry.stress}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={entry.stress} 
                          sx={{ my: 0.5, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#d32f2f' } }}
                        />
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Alert severity="success" sx={{ mt: 2 }}>
                Great progress! Your depression and anxiety scores have been steadily improving over the past few months.
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Daily Mood Tracking
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setMoodDialogOpen(true)}
                >
                  Log Today's Mood
                </Button>
              </Box>
              <Grid container spacing={2}>
                {moodEntries.map((entry, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {new Date(entry.date).toLocaleDateString()}
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#4caf50' }}>
                          Mood: {entry.mood}/10
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(entry.mood / 10) * 100} 
                          sx={{ bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                        />
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#2196f3' }}>
                          Energy: {entry.energy}/10
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(entry.energy / 10) * 100} 
                          sx={{ bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#2196f3' } }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#ff9800' }}>
                          Anxiety: {entry.anxiety}/10
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(entry.anxiety / 10) * 100} 
                          sx={{ bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#ff9800' } }}
                        />
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Mood Entries
              </Typography>
              <List>
                {moodEntries.slice(-5).reverse().map((entry, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <MoodIcon color={entry.mood >= 7 ? 'success' : entry.mood >= 5 ? 'warning' : 'error'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Mood: ${entry.mood}/10`}
                      secondary={entry.date}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Personal Goals & Milestones
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setGoalDialogOpen(true)}
              >
                Add New Goal
              </Button>
            </Box>
          </Grid>
          {goals.map((goal) => (
            <Grid size={{ xs: 12, md: 6 }} key={goal.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {goal.title}
                    </Typography>
                    {goal.completed && <CheckCircleIcon color="success" />}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {goal.description}
                  </Typography>
                  <Chip label={goal.category} size="small" sx={{ mb: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2">{goal.progress}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={goal.progress}
                      color={getProgressColor(goal.progress)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Therapy Session History
              </Typography>
              <List>
                {sessionHistory.map((session) => (
                  <div key={session.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: session.status === 'Completed' ? 'success.main' : 'primary.main' }}>
                          <PsychologyIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={`Session with ${session.psychologist}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {new Date(session.date).toLocaleDateString()} - {session.type} Therapy
                            </Typography>
                            <Chip
                              label={session.status}
                              size="small"
                              color={session.status === 'Completed' ? 'success' : 'primary'}
                              sx={{ mt: 0.5 }}
                            />
                            {session.rating && (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Rating value={session.rating} readOnly size="small" />
                                <Typography variant="caption" sx={{ ml: 1 }}>
                                  Session Rating
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </div>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Progress Insights
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUpIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Consistent Improvement"
                    secondary="Your assessment scores show steady improvement over the past 3 months"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <MoodIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Mood Stability"
                    secondary="Your mood tracking shows increased emotional stability"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <GoalsIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Goal Achievement"
                    secondary="You're on track to complete 75% of your goals this month"
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Keep up the great work!
                </Typography>
                <Typography variant="body2">
                  Your progress shows consistent improvement. Consider adding mindfulness exercises to your routine.
                </Typography>
              </Alert>
              <Alert severity="success">
                <Typography variant="subtitle2" gutterBottom>
                  Milestone Achievement
                </Typography>
                <Typography variant="body2">
                  You've completed 4 therapy sessions this month - excellent consistency!
                </Typography>
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Goal</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Goal Title"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={newGoal.category}
              onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
            >
              <MenuItem value="Mindfulness">Mindfulness</MenuItem>
              <MenuItem value="Sleep">Sleep</MenuItem>
              <MenuItem value="Exercise">Exercise</MenuItem>
              <MenuItem value="Social">Social</MenuItem>
              <MenuItem value="Therapy">Therapy</MenuItem>
              <MenuItem value="Self-Care">Self-Care</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Target Date"
            type="date"
            value={newGoal.targetDate}
            onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddGoal} variant="contained">Add Goal</Button>
        </DialogActions>
      </Dialog>

      {/* Add Mood Dialog */}
      <Dialog open={moodDialogOpen} onClose={() => setMoodDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Today's Mood</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 2 }}>
            <Typography gutterBottom>Overall Mood (1-10)</Typography>
            <Rating
              value={newMood.rating}
              onChange={(e, value) => setNewMood({ ...newMood, rating: value })}
              max={10}
              size="large"
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Energy Level (1-10)</Typography>
            <Rating
              value={newMood.energy}
              onChange={(e, value) => setNewMood({ ...newMood, energy: value })}
              max={10}
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Anxiety Level (1-10)</Typography>
            <Rating
              value={newMood.anxiety}
              onChange={(e, value) => setNewMood({ ...newMood, anxiety: value })}
              max={10}
            />
          </Box>
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={newMood.notes}
            onChange={(e) => setNewMood({ ...newMood, notes: e.target.value })}
            placeholder="How are you feeling today? Any specific thoughts or events?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoodDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMood} variant="contained">Save Entry</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProgressPage;