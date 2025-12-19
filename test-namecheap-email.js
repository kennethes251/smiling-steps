const nodemailer = require('nodemailer');
require('dotenv').config();

async function testNamecheapEmail() {
  console.log('🧪 Testing Namecheap Email Configuration...\n');

  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST || '❌ Not set');
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || '❌ Not set');
  console.log('  EMAIL_USER:', process.env.EMAIL_USER || '❌ Not set');
  console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('  FROM_EMAIL:', process.env.FROM_EMAIL || '❌ Not set');
  console.log('');

  // Check if Namecheap configuration is present
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ Missing Namecheap email configuration!');
    console.log('');
    console.log('📝 Please update your .env file with:');
    console.log('EMAIL_HOST="mail.smilingsteps.com"');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_USER="hr@smilingsteps.com"');
    console.log('EMAIL_PASSWORD="your-actual-namecheap-password"');
    console.log('FROM_EMAIL="hr@smilingsteps.com"');
    console.log('FROM_NAME="Smiling Steps"');
    return;
  }

  try {
    // Create transporter with Namecheap settings
    console.log('🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    console.log('🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = {
      from: {
        name: process.env.FROM_NAME || 'Smiling Steps',
        address: process.env.FROM_EMAIL || process.env.EMAIL_USER
      },
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: '🧪 Test Email from Smiling Steps',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #663399;">🌟 Smiling Steps</h1>
          </div>
          
          <h2>Email Configuration Test</h2>
          
          <p>Congratulations! Your Namecheap email configuration is working correctly.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.EMAIL_HOST}</li>
              <li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
              <li><strong>From:</strong> ${process.env.FROM_EMAIL}</li>
              <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>Your email verification system is now ready to send professional emails from your domain!</p>
          
          <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p>This is a test email from your Smiling Steps email verification system.</p>
          </div>
        </div>
      `,
      text: `
Email Configuration Test - Smiling Steps

Congratulations! Your Namecheap email configuration is working correctly.

Configuration Details:
- Host: ${process.env.EMAIL_HOST}
- Port: ${process.env.EMAIL_PORT}
- From: ${process.env.FROM_EMAIL}
- Sent at: ${new Date().toLocaleString()}

Your email verification system is now ready to send professional emails from your domain!
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('');
    console.log('🎉 Namecheap email configuration is working!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Check your inbox at', process.env.EMAIL_USER);
    console.log('2. Restart your server: node server/index-mongodb.js');
    console.log('3. Test user registration with email verification');

  } catch (error) {
    console.log('❌ Email test failed!');
    console.log('');
    console.log('🔍 Error Details:');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    console.log('');
    console.log('🛠️ Troubleshooting Tips:');
    
    if (error.code === 'EAUTH') {
      console.log('  • Check your email password in Namecheap dashboard');
      console.log('  • Ensure hr@smilingsteps.com password is correct');
      console.log('  • Try resetting the email password');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('  • Check if EMAIL_HOST is correct: mail.smilingsteps.com');
      console.log('  • Try alternative port 465 with SSL');
      console.log('  • Check if email service is active in Namecheap');
    } else if (error.code === 'ESOCKET') {
      console.log('  • Network connection issue');
      console.log('  • Check your internet connection');
      console.log('  • Try again in a few minutes');
    } else {
      console.log('  • Check all email settings in .env file');
      console.log('  • Verify Namecheap email service is active');
      console.log('  • Contact Namecheap support if needed');
    }
    
    console.log('');
    console.log('📧 Alternative Configuration to Try:');
    console.log('EMAIL_HOST="mail.smilingsteps.com"');
    console.log('EMAIL_PORT=465');
    console.log('# Then update the transporter to use secure: true');
  }
}

// Run the test
testNamecheapEmail().catch(console.error);