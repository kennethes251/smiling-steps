const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a company name'],
    trim: true,
    unique: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'United States'
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  adminUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  employeeLimit: {
    type: Number,
    default: 50 // Default limit for basic subscription
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for employee count
CompanySchema.virtual('employeeCount').get(function() {
  return this.employees ? this.employees.length : 0;
});

// Query middleware to filter out inactive companies
CompanySchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

module.exports = mongoose.model('Company', CompanySchema);
