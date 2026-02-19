const fs = require('fs');
const path = require('path');

console.log('📧 Gmail SMTP Setup Helper\n');

console.log('To enable real email sending with Gmail:');
console.log('');
console.log('1. 🔐 Get Gmail App Password:');
console.log('   - Go to: https://myaccount.google.com/security');
console.log('   - Enable 2-Step Verification (if not already enabled)');
console.log('   - Go to: App passwords');
console.log('   - Select "Mail" and generate a 16-character password');
console.log('');
console.log('2. 📝 Update your .env file with:');
console.log('   EMAIL_USER="your-gmail@gmail.com"');
console.log('   EMAIL_PASSWORD="your-16-char-app-password"');
console.log('');
console.log('3. 🔄 Restart the server');
console.log('');
console.log('4. 🧪 Test by registering with a real email address');
console.log('');

// Check current .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('📋 Current .env email configuration:');
  const emailLines = envContent.split('\n').filter(line => 
    line.includes('EMAIL_') || line.includes('FROM_EMAIL') || line.includes('CLIENT_URL')
  );
  
  if (emailLines.length > 0) {
    emailLines.forEach(line => {
      if (line.includes('PASSWORD')) {
        // Hide password for security
        const [key] = line.split('=');
        console.log(`   ${key}="[HIDDEN]"`);
      } else {
        console.log(`   ${line}`);
      }
    });
  } else {
    console.log('   No email configuration found in .env');
  }
  
  console.log('');
  
  // Check if using mock emails
  if (envContent.includes('EMAIL_USER="your-email@gmail.com"') || 
      !envContent.includes('EMAIL_USER=')) {
    console.log('⚠️  Currently using MOCK emails (logged to console)');
    console.log('   Update EMAIL_USER and EMAIL_PASSWORD to enable real emails');
  } else {
    console.log('✅ Email credentials configured - should send real emails');
  }
} else {
  console.log('❌ .env file not found');
}

console.log('');
console.log('🚀 After updating .env, restart server with:');
console.log('   node server/index-mongodb.js');
console.log('');
console.log('📧 The system will automatically detect real credentials and switch from mock to real emails!');