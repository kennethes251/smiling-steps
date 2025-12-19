const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailSetup() {
  console.log('🧪 Testing Gmail Configuration...\n');

  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log('  EMAIL_USER:', process.env.EMAIL_USER || '❌ Not set');
  console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('  FROM_EMAIL:', process.env.FROM_EMAIL || '❌ Not set');
  console.log('  FROM_NAME:', process.env.FROM_NAME || '❌ Not set');
  console.log('');

  // Check if Gmail configuration is present
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ Missing Gmail configuration!');
    console.log('');
    console.log('📝 Please update your .env file with:');
    console.log('EMAIL_USER="kennethes251@gmail.com"');
    console.log('EMAIL_PASSWORD="your-16-character-app-password"');
    return;
  }

  if (process.env.EMAIL_PASSWORD === 'your-gmail-app-password-here') {
    console.log('❌ Please replace the placeholder password!');
    console.log('');
    console.log('🔐 Steps to get Gmail App Password:');
    console.log('1. Go to: https://myaccount.google.com/apppasswords');
    console.log('2. Enable 2-Factor Authentication if needed');
    console.log('3. Generate app password for "Mail"');
    console.log('4. Copy the 16-character password');
    console.log('5. Update EMAIL_PASSWORD in .env file');
    return;
  }

  try {
    // Create Gmail transporter
    console.log('🔧 Creating Gmail transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Test connection
    console.log('🔍 Testing Gmail SMTP connection...');
    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!');

    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = {
      from: {
        name: process.env.FROM_NAME || 'Smiling Steps',
        address: process.env.FROM_EMAIL || process.env.EMAIL_USER
      },
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: '🧪 Gmail Test - Smiling Steps Email System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #663399;">🌟 Smiling Steps</h1>
          </div>
          
          <h2>Gmail Configuration Test Successful!</h2>
          
          <p>Congratulations! Your Gmail email configuration is working perfectly.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Email Service:</strong> Gmail</li>
              <li><strong>From Address:</strong> ${process.env.FROM_EMAIL}</li>
              <li><strong>From Name:</strong> ${process.env.FROM_NAME}</li>
              <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>Your email verification system is now ready to send professional emails!</p>
          
          <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p>This is a test email from your Smiling Steps email verification system.</p>
          </div>
        </div>
      `,
      text: `
Gmail Configuration Test - Smiling Steps

Congratulations! Your Gmail email configuration is working perfectly.

Configuration Details:
- Email Service: Gmail
- From Address: ${process.env.FROM_EMAIL}
- From Name: ${process.env.FROM_NAME}
- Sent at: ${new Date().toLocaleString()}

Your email verification system is now ready to send professional emails!
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('');
    console.log('🎉 Gmail configuration is working perfectly!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Check your Gmail inbox for the test email');
    console.log('2. Restart your server: node server/index-mongodb.js');
    console.log('3. Test user registration with email verification');
    console.log('4. Users will receive emails from "Smiling Steps <hr@smilingsteps.com>"');

  } catch (error) {
    console.log('❌ Gmail test failed!');
    console.log('');
    console.log('🔍 Error Details:');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    console.log('');
    console.log('🛠️ Troubleshooting Tips:');
    
    if (error.code === 'EAUTH') {
      console.log('  • Check your Gmail app password is correct');
      console.log('  • Ensure 2-Factor Authentication is enabled');
      console.log('  • Try generating a new app password');
      console.log('  • Wait 5 minutes after enabling 2FA');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('  • Check your internet connection');
      console.log('  • Try again in a few minutes');
      console.log('  • Check if Gmail is accessible');
    } else {
      console.log('  • Verify all email settings in .env file');
      console.log('  • Ensure EMAIL_USER is kennethes251@gmail.com');
      console.log('  • Ensure EMAIL_PASSWORD is the 16-character app password');
    }
    
    console.log('');
    console.log('🔐 App Password Reminder:');
    console.log('  • Go to: https://myaccount.google.com/apppasswords');
    console.log('  • Generate new app password for "Mail"');
    console.log('  • Copy the 16-character password exactly');
    console.log('  • Update EMAIL_PASSWORD in .env file');
  }
}

// Run the test
testGmailSetup().catch(console.error);