const express = require('express');
const router = express.Router();
const CheckIn = require('../models/CheckIn');
const { auth } = require('../middleware/auth');

// Create a new check-in
router.post('/', auth, async (req, res) => {
    try {
        const {
            date,
            mood,
            energy,
            sleepHours,
            sleepQuality,
            stressLevel,
            anxiety,
            activities,
            symptoms,
            gratitude,
            notes
        } = req.body;

        // Validate required fields
        if (!date || !mood || !energy || !sleepHours || !sleepQuality || !stressLevel || !anxiety) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user already has a check-in for this date
        const existingCheckIn = await CheckIn.findOne({
            userId: req.user.id,
            date: date
        });

        if (existingCheckIn) {
            return res.status(400).json({ message: 'Check-in already exists for this date' });
        }

        // Create new check-in
        const checkIn = new CheckIn({
            userId: req.user.id,
            date,
            mood,
            energy,
            sleepHours,
            sleepQuality,
            stressLevel,
            anxiety,
            activities: activities || [],
            symptoms: symptoms || [],
            gratitude: gratitude || '',
            notes: notes || ''
        });

        await checkIn.save();

        res.status(201).json({
            message: 'Check-in created successfully',
            checkIn
        });
    } catch (error) {
        console.error('Error creating check-in:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get today's check-in status
router.get('/today', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const checkIn = await CheckIn.findOne({
            userId: req.user.id,
            date: today
        });

        res.json({
            hasCheckedIn: !!checkIn,
            checkIn: checkIn || null
        });
    } catch (error) {
        console.error('Error checking today status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's check-in history
router.get('/history', auth, async (req, res) => {
    try {
        const { limit = 30, offset = 0 } = req.query;

        const checkIns = await CheckIn.find({ userId: req.user.id })
            .sort({ date: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        const total = await CheckIn.countDocuments({ userId: req.user.id });

        res.json({
            checkIns,
            total,
            hasMore: (parseInt(offset) + parseInt(limit)) < total
        });
    } catch (error) {
        console.error('Error fetching check-in history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get check-ins for a specific date range
router.get('/range', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const checkIns = await CheckIn.find({
            userId: req.user.id,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: 1 });

        res.json({ checkIns });
    } catch (error) {
        console.error('Error fetching check-ins by range:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get wellness statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        const startDateStr = startDate.toISOString().split('T')[0];

        const checkIns = await CheckIn.find({
            userId: req.user.id,
            date: { $gte: startDateStr }
        }).sort({ date: 1 });

        if (checkIns.length === 0) {
            return res.json({
                totalCheckIns: 0,
                averages: null,
                trends: null
            });
        }

        // Calculate averages
        const averages = {
            mood: checkIns.reduce((sum, c) => sum + c.mood, 0) / checkIns.length,
            energy: checkIns.reduce((sum, c) => sum + c.energy, 0) / checkIns.length,
            sleepHours: checkIns.reduce((sum, c) => sum + c.sleepHours, 0) / checkIns.length,
            stressLevel: checkIns.reduce((sum, c) => sum + c.stressLevel, 0) / checkIns.length,
            anxiety: checkIns.reduce((sum, c) => sum + c.anxiety, 0) / checkIns.length
        };

        // Calculate trends (last 7 days vs previous 7 days)
        const recent = checkIns.slice(-7);
        const previous = checkIns.slice(-14, -7);

        let trends = null;
        if (previous.length > 0 && recent.length > 0) {
            const recentAvg = {
                mood: recent.reduce((sum, c) => sum + c.mood, 0) / recent.length,
                energy: recent.reduce((sum, c) => sum + c.energy, 0) / recent.length,
                stressLevel: recent.reduce((sum, c) => sum + c.stressLevel, 0) / recent.length,
                anxiety: recent.reduce((sum, c) => sum + c.anxiety, 0) / recent.length
            };

            const previousAvg = {
                mood: previous.reduce((sum, c) => sum + c.mood, 0) / previous.length,
                energy: previous.reduce((sum, c) => sum + c.energy, 0) / previous.length,
                stressLevel: previous.reduce((sum, c) => sum + c.stressLevel, 0) / previous.length,
                anxiety: previous.reduce((sum, c) => sum + c.anxiety, 0) / previous.length
            };

            trends = {
                mood: recentAvg.mood - previousAvg.mood,
                energy: recentAvg.energy - previousAvg.energy,
                stressLevel: recentAvg.stressLevel - previousAvg.stressLevel,
                anxiety: recentAvg.anxiety - previousAvg.anxiety
            };
        }

        // Most common activities and symptoms
        const allActivities = checkIns.flatMap(c => c.activities);
        const allSymptoms = checkIns.flatMap(c => c.symptoms);

        const activityCounts = {};
        const symptomCounts = {};

        allActivities.forEach(activity => {
            activityCounts[activity] = (activityCounts[activity] || 0) + 1;
        });

        allSymptoms.forEach(symptom => {
            symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });

        const topActivities = Object.entries(activityCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([activity, count]) => ({ activity, count }));

        const topSymptoms = Object.entries(symptomCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([symptom, count]) => ({ symptom, count }));

        res.json({
            totalCheckIns: checkIns.length,
            averages,
            trends,
            topActivities,
            topSymptoms,
            checkInStreak: calculateStreak(checkIns)
        });
    } catch (error) {
        console.error('Error fetching wellness stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to calculate check-in streak
function calculateStreak(checkIns) {
    if (checkIns.length === 0) return 0;

    const sortedDates = checkIns.map(c => c.date).sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    let streak = 0;
    let currentDate = new Date(today);

    for (const dateStr of sortedDates) {
        const checkInDate = currentDate.toISOString().split('T')[0];

        if (dateStr === checkInDate) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// Update a check-in (only for today)
router.put('/today', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const checkIn = await CheckIn.findOneAndUpdate(
            { userId: req.user.id, date: today },
            { ...req.body },
            { new: true, runValidators: true }
        );

        if (!checkIn) {
            return res.status(404).json({ message: 'No check-in found for today' });
        }

        res.json({
            message: 'Check-in updated successfully',
            checkIn
        });
    } catch (error) {
        console.error('Error updating check-in:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;