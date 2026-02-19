/**
 * Payment Configuration
 * 
 * Simple Till Number + Confirmation Code payment system
 * No external API integration required
 */

const paymentConfig = {
  // Till Number for M-Pesa payments
  tillNumber: process.env.MPESA_TILL_NUMBER || '5678901',
  
  // Business name shown to clients
  businessName: process.env.BUSINESS_NAME || 'Smiling Steps',
  
  // M-Pesa Paybill (if using paybill instead of till)
  paybillNumber: process.env.MPESA_PAYBILL_NUMBER || null,
  
  // Account number for paybill (optional)
  accountNumber: process.env.MPESA_ACCOUNT_NUMBER || null,
  
  // Default session rate in KES
  defaultSessionRate: parseInt(process.env.DEFAULT_SESSION_RATE) || 2500,
  
  // Payment instructions template
  getPaymentInstructions: function(amount, sessionId) {
    if (this.paybillNumber) {
      return {
        type: 'paybill',
        paybillNumber: this.paybillNumber,
        accountNumber: this.accountNumber || sessionId,
        amount: amount,
        businessName: this.businessName,
        instructions: `1. Go to M-Pesa on your phone\n2. Select "Lipa na M-Pesa"\n3. Select "Pay Bill"\n4. Enter Business Number: ${this.paybillNumber}\n5. Enter Account Number: ${this.accountNumber || sessionId}\n6. Enter Amount: KSh ${amount}\n7. Enter your M-Pesa PIN\n8. Confirm the transaction\n9. Copy the M-Pesa confirmation code (e.g., RKJ7ABCD12)\n10. Enter the code in the app to confirm your payment`
      };
    }
    
    return {
      type: 'till',
      tillNumber: this.tillNumber,
      amount: amount,
      businessName: this.businessName,
      instructions: `1. Go to M-Pesa on your phone\n2. Select "Lipa na M-Pesa"\n3. Select "Buy Goods and Services"\n4. Enter Till Number: ${this.tillNumber}\n5. Enter Amount: KSh ${amount}\n6. Enter your M-Pesa PIN\n7. Confirm the transaction\n8. Copy the M-Pesa confirmation code (e.g., RKJ7ABCD12)\n9. Enter the code in the app to confirm your payment`
    };
  },
  
  // Validate M-Pesa confirmation code format
  // M-Pesa codes are typically 10 alphanumeric characters starting with a letter
  validateConfirmationCode: function(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Confirmation code is required' };
    }
    
    const cleanCode = code.trim().toUpperCase();
    
    // M-Pesa confirmation codes are typically 10 characters
    // Format: Letter + 9 alphanumeric characters (e.g., RKJ7ABCD12)
    const mpesaCodeRegex = /^[A-Z][A-Z0-9]{9}$/;
    
    if (!mpesaCodeRegex.test(cleanCode)) {
      return { 
        valid: false, 
        error: 'Invalid M-Pesa confirmation code format. Code should be 10 characters (e.g., RKJ7ABCD12)' 
      };
    }
    
    return { valid: true, code: cleanCode };
  }
};

module.exports = paymentConfig;
