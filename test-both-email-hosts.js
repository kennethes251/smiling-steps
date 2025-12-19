const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration(hostConfig) {
  console.log(`\n🧪 Testing ${hostConfig.name}...`);
  console.log(`   Host: ${hostConfig.host}`);
  console.log(`   Port: ${hostConfig.port}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: hostConfig.host,
      port: hostConfig.port,
      secure: hostConfig.port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    await transporter.verify();
    console.log(`   ✅ ${hostConfig.name} SMTP connection successful!`);
    return { success: true, config: hostConfig };
    
  } catch (error) {
    console.log(`   ❌ ${hostConfig.name} failed: ${error.message}`);
    return { success: false, config: hostConfig, error: error.message };
  }
}

async function testBothHosts() {
  console.log('🔍 Testing Both Email Host Configurations...\n');
  
  // Check if we have the required credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ Missing EMAIL_USER or EMAIL_PASSWORD in .env file');
    return;
  }
  
  console.log('📧 Email Account:', process.env.EMAIL_USER);
  console.log('🔐 Password:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
  
  const configurations = [
    {
      name: 'GoDaddy/Secureserver (Based on DNS)',
      host: 'smtpout.secureserver.net',
      port: 465
    },
    {
      name: 'GoDaddy Alternative',
      host: 'smtp.secureserver.net', 
      port: 465
    },
    {
      name: 'Namecheap Private Email',
      host: 'mail.smilingsteps.com',
      port: 587
    },
    {
      name: 'Namecheap Alternative',
      host: 'mail.smilingsteps.com',
      port: 465
    }
  ];
  
  const results = [];
  
  for (const config of configurations) {
    const result = await testEmailConfiguration(config);
    results.push(result);
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ WORKING CONFIGURATIONS:');
    successful.forEach(result => {
      console.log(`   🎉 ${result.config.name}`);
      console.log(`      Host: ${result.config.host}`);
      console.log(`      Port: ${result.config.port}`);
      console.log('');
    });
    
    console.log('🔧 RECOMMENDED .env SETTINGS:');
    const best = successful[0];
    console.log(`EMAIL_HOST="${best.config.host}"`);
    console.log(`EMAIL_PORT=${best.config.port}`);
    console.log(`EMAIL_USER="${process.env.EMAIL_USER}"`);
    console.log(`EMAIL_PASSWORD="${process.env.EMAIL_PASSWORD}"`);
    
  } else {
    console.log('\n❌ NO WORKING CONFIGURATIONS FOUND');
    console.log('\n🔍 POSSIBLE ISSUES:');
    console.log('   • Incorrect password');
    console.log('   • Email account doesn\'t exist');
    console.log('   • Account is locked or suspended');
    console.log('   • Different email hosting provider');
    
    console.log('\n🛠️ TROUBLESHOOTING STEPS:');
    console.log('   1. Try logging into webmail:');
    console.log('      - GoDaddy: https://email.secureserver.net/');
    console.log('      - Namecheap: https://privateemail.com/');
    console.log('   2. Reset password in the correct dashboard');
    console.log('   3. Contact support for email hosting provider');
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED CONFIGURATIONS:');
    failed.forEach(result => {
      console.log(`   • ${result.config.name}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (successful.length > 0) {
    console.log('   1. Update your .env file with the working configuration above');
    console.log('   2. Restart your server');
    console.log('   3. Test user registration with email verification');
  } else {
    console.log('   1. Verify email account exists and password is correct');
    console.log('   2. Try webmail login to confirm credentials');
    console.log('   3. Contact email hosting provider support');
  }
}

// Run the test
testBothHosts().catch(console.error);