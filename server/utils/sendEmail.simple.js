// Simple email fallback - just logs instead of sending
const sendEmail = async (options) => {
  console.log('📧 Email would be sent:', {
    to: options.email,
    subject: options.subject,
    message: 'Email functionality disabled for deployment'
  });
  
  // Return success to prevent errors
  return Promise.resolve();
};

module.exports = sendEmail;