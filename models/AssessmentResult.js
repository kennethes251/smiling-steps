const mongoose = require('mongoose');

const AssessmentResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  answers: [
    {
      question: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      selectedOption: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      score: {
        type: Number,
        required: true,
      },
    },
  ],
  totalScore: {
    type: Number,
    required: true,
  },
  interpretation: {
    type: String,
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AssessmentResult', AssessmentResultSchema);