import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Slider,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Chip,
    Grid,
    Alert,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import {
    Mood,
    MoodBad,
    Battery1Bar,
    Battery3Bar,
    BatteryFull,
    Bedtime,
    FitnessCenter,
    Restaurant,
    SelfImprovement,
    CheckCircle
} from '@mui/icons-material';

const CheckInPage = () => {
    const [checkInData, setCheckInData] = useState({
        mood: 5,
        energy: 5,
        sleepHours: 7,
        sleepQuality: 'good',
        stressLevel: 3,
        anxiety: 3,
        gratitude: '',
        activities: [],
        symptoms: [],
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [todayCheckedIn, setTodayCheckedIn] = useState(false);

    const moodLabels = {
        1: 'Very Low',
        2: 'Low',
        3: 'Below Average',
        4: 'Neutral',
        5: 'Average',
        6: 'Good',
        7: 'Very Good',
        8: 'Great',
        9: 'Excellent',
        10: 'Amazing'
    };

    const energyLabels = {
        1: 'Exhausted',
        2: 'Very Tired',
        3: 'Tired',
        4: 'Low Energy',
        5: 'Average',
        6: 'Good Energy',
        7: 'High Energy',
        8: 'Very Energetic',
        9: 'Excellent',
        10: 'Peak Energy'
    };

    const activityOptions = [
        'Exercise', 'Meditation', 'Reading', 'Socializing', 'Work',
        'Hobbies', 'Nature/Outdoors', 'Creative Activities', 'Learning',
        'Relaxation', 'Cooking', 'Music', 'Gaming', 'Cleaning'
    ];

    const symptomOptions = [
        'Headache', 'Fatigue', 'Difficulty Concentrating', 'Irritability',
        'Sadness', 'Worry', 'Physical Pain', 'Digestive Issues',
        'Sleep Problems', 'Appetite Changes', 'Social Withdrawal', 'Restlessness'
    ];

    useEffect(() => {
        checkTodayStatus();
    }, []);

    const checkTodayStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const today = new Date().toISOString().split('T')[0];

            const response = await fetch(`/api/checkins/today`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTodayCheckedIn(data.hasCheckedIn);
            }
        } catch (error) {
            console.error('Error checking today status:', error);
        }
    };

    const handleSliderChange = (field) => (event, newValue) => {
        setCheckInData(prev => ({
            ...prev,
            [field]: newValue
        }));
    };

    const handleRadioChange = (field) => (event) => {
        setCheckInData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleTextChange = (field) => (event) => {
        setCheckInData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleChipToggle = (field, value) => {
        setCheckInData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(item => item !== value)
                : [...prev[field], value]
        }));
    };

    const getMoodIcon = (mood) => {
        if (mood <= 3) return <MoodBad color="error" />;
        if (mood <= 6) return <Mood color="warning" />;
        return <Mood color="success" />;
    };

    const getEnergyIcon = (energy) => {
        if (energy <= 3) return <Battery1Bar color="error" />;
        if (energy <= 6) return <Battery3Bar color="warning" />;
        return <BatteryFull color="success" />;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            const response = await fetch('/api/checkins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...checkInData,
                    date: new Date().toISOString().split('T')[0]
                })
            });

            if (response.ok) {
                setSuccess(true);
                setTodayCheckedIn(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                throw new Error('Failed to submit check-in');
            }
        } catch (error) {
            console.error('Error submitting check-in:', error);
            alert('Failed to submit check-in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (todayCheckedIn) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom>
                        Check-in Complete!
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        You've already completed your daily check-in for today.
                        Come back tomorrow to track your wellness journey.
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => window.location.href = '/progress'}
                    >
                        View Progress
                    </Button>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <SelfImprovement sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom>
                        Daily Wellness Check-in
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Take a moment to reflect on your day and track your wellness
                    </Typography>
                </Box>

                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        Check-in submitted successfully! Keep up the great work.
                    </Alert>
                )}

                <Grid container spacing={4}>
                    {/* Mood Section */}
                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    {getMoodIcon(checkInData.mood)}
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        How is your mood today?
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Current: {moodLabels[checkInData.mood]}
                                </Typography>
                                <Slider
                                    value={checkInData.mood}
                                    onChange={handleSliderChange('mood')}
                                    min={1}
                                    max={10}
                                    marks
                                    valueLabelDisplay="auto"
                                    sx={{ mt: 2 }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Energy Section */}
                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    {getEnergyIcon(checkInData.energy)}
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        What's your energy level?
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Current: {energyLabels[checkInData.energy]}
                                </Typography>
                                <Slider
                                    value={checkInData.energy}
                                    onChange={handleSliderChange('energy')}
                                    min={1}
                                    max={10}
                                    marks
                                    valueLabelDisplay="auto"
                                    sx={{ mt: 2 }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Sleep Section */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Bedtime color="primary" />
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        Sleep
                                    </Typography>
                                </Box>
                                <TextField
                                    label="Hours of sleep"
                                    type="number"
                                    value={checkInData.sleepHours}
                                    onChange={handleTextChange('sleepHours')}
                                    inputProps={{ min: 0, max: 24, step: 0.5 }}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                                <FormControl component="fieldset">
                                    <FormLabel component="legend">Sleep Quality</FormLabel>
                                    <RadioGroup
                                        value={checkInData.sleepQuality}
                                        onChange={handleRadioChange('sleepQuality')}
                                        row
                                    >
                                        <FormControlLabel value="poor" control={<Radio />} label="Poor" />
                                        <FormControlLabel value="fair" control={<Radio />} label="Fair" />
                                        <FormControlLabel value="good" control={<Radio />} label="Good" />
                                        <FormControlLabel value="excellent" control={<Radio />} label="Excellent" />
                                    </RadioGroup>
                                </FormControl>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Stress & Anxiety */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Stress & Anxiety Levels
                                </Typography>

                                <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                                    Stress Level: {checkInData.stressLevel}/5
                                </Typography>
                                <Slider
                                    value={checkInData.stressLevel}
                                    onChange={handleSliderChange('stressLevel')}
                                    min={1}
                                    max={5}
                                    marks
                                    valueLabelDisplay="auto"
                                />

                                <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                                    Anxiety Level: {checkInData.anxiety}/5
                                </Typography>
                                <Slider
                                    value={checkInData.anxiety}
                                    onChange={handleSliderChange('anxiety')}
                                    min={1}
                                    max={5}
                                    marks
                                    valueLabelDisplay="auto"
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                    {/* Activities */}
                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <FitnessCenter color="primary" />
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        Activities Today
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Select all activities you did today
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {activityOptions.map((activity) => (
                                        <Chip
                                            key={activity}
                                            label={activity}
                                            onClick={() => handleChipToggle('activities', activity)}
                                            color={checkInData.activities.includes(activity) ? 'primary' : 'default'}
                                            variant={checkInData.activities.includes(activity) ? 'filled' : 'outlined'}
                                        />
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Symptoms */}
                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Any Symptoms Today?
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Select any symptoms you experienced today
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {symptomOptions.map((symptom) => (
                                        <Chip
                                            key={symptom}
                                            label={symptom}
                                            onClick={() => handleChipToggle('symptoms', symptom)}
                                            color={checkInData.symptoms.includes(symptom) ? 'error' : 'default'}
                                            variant={checkInData.symptoms.includes(symptom) ? 'filled' : 'outlined'}
                                        />
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Gratitude */}
                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Gratitude & Reflection
                                </Typography>
                                <TextField
                                    label="What are you grateful for today?"
                                    multiline
                                    rows={3}
                                    value={checkInData.gratitude}
                                    onChange={handleTextChange('gratitude')}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                    placeholder="Take a moment to reflect on something positive from your day..."
                                />
                                <TextField
                                    label="Additional Notes"
                                    multiline
                                    rows={3}
                                    value={checkInData.notes}
                                    onChange={handleTextChange('notes')}
                                    fullWidth
                                    placeholder="Any other thoughts or observations about your day..."
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Submit Button */}
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ textAlign: 'center', mt: 3 }}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleSubmit}
                                disabled={loading}
                                sx={{ minWidth: 200, py: 1.5 }}
                            >
                                {loading ? (
                                    <>
                                        <CircularProgress size={20} sx={{ mr: 1 }} />
                                        Submitting...
                                    </>
                                ) : (
                                    'Complete Check-in'
                                )}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
};

export default CheckInPage;