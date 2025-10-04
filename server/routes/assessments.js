const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const AssessmentResult = require('../models/AssessmentResult');
const User = require('../models/User');

// @route   GET api/assessments
// @desc    Get all assessments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const assessments = await Assessment.find().select('-questions.options.score');
    res.json(assessments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/assessments/:id
// @desc    Get assessment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id).select('-questions.options.score');
    
    if (!assessment) {
      return res.status(404).json({ msg: 'Assessment not found' });
    }
    
    res.json(assessment);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Assessment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/assessments
// @desc    Create a new assessment
// @access  Private (Psychologist only)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (user.role !== 'psychologist') {
      return res.status(401).json({ msg: 'Not authorized to create assessments' });
    }
    
    const { title, description, questions } = req.body;
    
    const newAssessment = new Assessment({
      title,
      description,
      questions
    });
    
    const assessment = await newAssessment.save();
    res.json(assessment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/assessments/:id/submit
// @desc    Submit assessment answers
// @access  Private
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    
    if (!assessment) {
      return res.status(404).json({ msg: 'Assessment not found' });
    }
    
    const { answers } = req.body;
    
    // Calculate total score
    let totalScore = 0;
    const processedAnswers = [];
    
    for (const answer of answers) {
      const question = assessment.questions.id(answer.questionId);
      if (!question) {
        return res.status(400).json({ msg: 'Invalid question ID' });
      }
      
      const option = question.options.id(answer.optionId);
      if (!option) {
        return res.status(400).json({ msg: 'Invalid option ID' });
      }
      
      totalScore += option.score;
      
      processedAnswers.push({
        question: answer.questionId,
        selectedOption: answer.optionId,
        score: option.score
      });
    }
    
    // Determine interpretation based on score
    let interpretation = '';
    if (totalScore < 5) {
      interpretation = 'Minimal or no symptoms';
    } else if (totalScore < 10) {
      interpretation = 'Mild symptoms';
    } else if (totalScore < 15) {
      interpretation = 'Moderate symptoms';
    } else {
      interpretation = 'Severe symptoms';
    }
    
    const newResult = new AssessmentResult({
      user: req.user.id,
      assessment: req.params.id,
      answers: processedAnswers,
      totalScore,
      interpretation
    });
    
    const result = await newResult.save();
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/assessments/results/me
// @desc    Get all assessment results for the logged-in user
// @access  Private
router.get('/results/me', auth, async (req, res) => {
  try {
    const results = await AssessmentResult.find({ user: req.user.id })
      .populate('assessment', ['title', 'description'])
      .sort({ completedAt: -1 });
    
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/assessments/results/:id
// @desc    Get a specific assessment result
// @access  Private
router.get('/results/:id', auth, async (req, res) => {
  try {
    const result = await AssessmentResult.findById(req.params.id)
      .populate('assessment', ['title', 'description', 'questions'])
      .populate('user', ['name', 'email']);
    
    if (!result) {
      return res.status(404).json({ msg: 'Result not found' });
    }
    
    // Check if the result belongs to the logged-in user or if the user is a psychologist
    const user = await User.findById(req.user.id).select('-password');
    
    if (result.user._id.toString() !== req.user.id && user.role !== 'psychologist') {
      return res.status(401).json({ msg: 'Not authorized to view this result' });
    }
    
    res.json(result);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Result not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/assessments/results/client/:clientId
// @desc    Get all assessment results for a specific client
// @access  Private (Psychologist only)
router.get('/results/client/:clientId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (user.role !== 'psychologist') {
      return res.status(401).json({ msg: 'Not authorized to view client results' });
    }
    
    const results = await AssessmentResult.find({ user: req.params.clientId })
      .populate('assessment', ['title', 'description'])
      .populate('user', ['name', 'email'])
      .sort({ completedAt: -1 });
    
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;