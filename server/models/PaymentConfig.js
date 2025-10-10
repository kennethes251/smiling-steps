const mongoose = require('mongoose');

const PaymentConfigSchema = new mongoose.Schema({
  // M-Pesa Configuration
  mpesaPaybill: {
    type: String,
    required: true,
    default: '123456' // Default paybill number
  },
  mpesaAccountNumber: {
    type: String,
    required: true,
    default: 'SMILING-STEPS' // Default account number
  },
  
  // Payment instructions
  paymentInstructions: {
    type: String,
    default: 'Go to M-Pesa > Lipa na M-Pesa > Paybill > Enter Business Number and Account Number > Enter Amount > Enter PIN'
  },
  
  // Currency
  currency: {
    type: String,
    default: 'KES',
    enum: ['KES', 'USD', 'EUR', 'GBP']
  },
  
  // Admin settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Single document - only one payment config
  _id: {
    type: String,
    default: 'payment-config'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentConfig', PaymentConfigSchema);