require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 Testing Real Email Configuration\n');

// Check environment variables
console.log('📋 Current Email Configuration:');
console.log('  EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '[SET]' : 'Not set');
console.log('  FROM_EMAIL:', process.env.FROM_EMAIL || 'Not set');
console.log('  CLIENT_URL:', process.env.CLIENT_URL || 'Not set');
console.log('');

// Test email sending
async function testEmail() {
  try {
    // Check if we should use mock or real emails
    if (!process.env.EMAIL_USER || 
        process.env.EMAIL_USER === 'your-gmail@gmail.com' ||
        process.env.EMAIL_PASSWORD === 'your-gmail-app-password') {
      console.log('⚠️  Using MOCK emails - update EMAIL_USER and EMAIL_PASSWORD in .env');
      console.log('');
      console.log('To enable Gmail:');
      console.log('1. Get Gmail app password: https://myaccount.google.com/apppasswords');
      console.log('2. Update .env:');
      console.log('   EMAIL_USER="your-gmail@gmail.com"');
      console.log('   EMAIL_PASSWORD="your-16-char-app-password"');
      return;
    }

    console.log('✅ Real email credentials detected - testing connection...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Test connection
    await transporter.verify();
    console.log('✅ Email connection successful!');
    
    // Send test email
    const testEmail = process.env.EMAIL_USER; // Send to yourself
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Test Email from Smiling Steps',
      html: `
        <h2>🎉 Email Verification System Test</h2>
        <p>This is a test email from your Smiling Steps application.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Check your inbox:', testEmail);
    console.log('📨 Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('');
    console.log('💡 Common issues:');
    console.log('  - Invalid Gmail app password');
    console.log('  - 2-Factor Authentication not enabled');
    console.log('  - Incorrect email address');
    console.log('');
    console.log('🔧 To fix:');
    console.log('  1. Enable 2FA on Gmail');
    console.log('  2. Generate app password: https://myaccount.google.com/apppasswords');
    console.log('  3. Update EMAIL_PASSWORD in .env with the 16-character app password');
  }
}

testEmail();