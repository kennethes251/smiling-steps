/**
 * M-Pesa Credentials Setup Helper
 * 
 * This script helps you safely add M-Pesa credentials to your .env file
 * Run with: node setup-mpesa-credentials.js
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 M-Pesa Credentials Setup\n');
console.log('='.repeat(60));
console.log('\nThis will help you add M-Pesa credentials to your .env file');
console.log('\n📋 Before starting, make sure you have:');
console.log('   1. Registered at https://developer.safaricom.co.ke');
console.log('   2. Created an app with "Lipa Na M-Pesa Online" API');
console.log('   3. Your credentials ready\n');
console.log('='.repeat(60));

const credentials = {};

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function collectCredentials() {
  console.log('\n📝 Enter your M-Pesa Daraja credentials:\n');

  credentials.MPESA_CONSUMER_KEY = await askQuestion('Consumer Key: ');
  credentials.MPESA_CONSUMER_SECRET = await askQuestion('Consumer Secret: ');
  credentials.MPESA_BUSINESS_SHORT_CODE = await askQuestion('Business Short Code (default 174379 for sandbox): ') || '174379';
  credentials.MPESA_PASSKEY = await askQuestion('Passkey: ');
  
  console.log('\n🌐 Callback URL Configuration:\n');
  console.log('For local testing with ngrok:');
  console.log('   Example: https://abc123.ngrok.io/api/mpesa/callback\n');
  console.log('For production:');
  console.log('   Example: https://smiling-steps.onrender.com/api/mpesa/callback\n');
  
  credentials.MPESA_CALLBACK_URL = await askQuestion('Callback URL: ');
  
  console.log('\n🔧 Environment:\n');
  console.log('   1. sandbox (for testing - no real money)');
  console.log('   2. production (for live payments)\n');
  
  const envChoice = await askQuestion('Choose environment (1 or 2): ');
  credentials.MPESA_ENVIRONMENT = envChoice === '2' ? 'production' : 'sandbox';

  return credentials;
}

function updateEnvFile(credentials) {
  try {
    // Read existing .env file
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    // Check if M-Pesa section already exists
    const mpesaSection = '\n# M-Pesa Daraja API Credentials';
    
    if (envContent.includes(mpesaSection)) {
      // Update existing M-Pesa credentials
      const lines = envContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.startsWith('MPESA_CONSUMER_KEY=')) {
          return `MPESA_CONSUMER_KEY="${credentials.MPESA_CONSUMER_KEY}"`;
        } else if (line.startsWith('MPESA_CONSUMER_SECRET=')) {
          return `MPESA_CONSUMER_SECRET="${credentials.MPESA_CONSUMER_SECRET}"`;
        } else if (line.startsWith('MPESA_BUSINESS_SHORT_CODE=')) {
          return `MPESA_BUSINESS_SHORT_CODE="${credentials.MPESA_BUSINESS_SHORT_CODE}"`;
        } else if (line.startsWith('MPESA_PASSKEY=')) {
          return `MPESA_PASSKEY="${credentials.MPESA_PASSKEY}"`;
        } else if (line.startsWith('MPESA_CALLBACK_URL=')) {
          return `MPESA_CALLBACK_URL="${credentials.MPESA_CALLBACK_URL}"`;
        } else if (line.startsWith('MPESA_ENVIRONMENT=')) {
          return `MPESA_ENVIRONMENT="${credentials.MPESA_ENVIRONMENT}"`;
        }
        return line;
      });
      envContent = updatedLines.join('\n');
    } else {
      // Add new M-Pesa section
      const mpesaConfig = `
# M-Pesa Daraja API Credentials (${credentials.MPESA_ENVIRONMENT})
MPESA_CONSUMER_KEY="${credentials.MPESA_CONSUMER_KEY}"
MPESA_CONSUMER_SECRET="${credentials.MPESA_CONSUMER_SECRET}"
MPESA_BUSINESS_SHORT_CODE="${credentials.MPESA_BUSINESS_SHORT_CODE}"
MPESA_PASSKEY="${credentials.MPESA_PASSKEY}"
MPESA_CALLBACK_URL="${credentials.MPESA_CALLBACK_URL}"
MPESA_ENVIRONMENT="${credentials.MPESA_ENVIRONMENT}"
`;
      envContent += mpesaConfig;
    }

    // Write back to .env
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ Success! Your .env file has been updated with M-Pesa credentials\n');
    return true;
  } catch (error) {
    console.error('\n❌ Error updating .env file:', error.message);
    return false;
  }
}

function displaySummary(credentials) {
  console.log('='.repeat(60));
  console.log('\n📋 Configuration Summary:\n');
  console.log(`Environment: ${credentials.MPESA_ENVIRONMENT.toUpperCase()}`);
  console.log(`Short Code: ${credentials.MPESA_BUSINESS_SHORT_CODE}`);
  console.log(`Consumer Key: ${credentials.MPESA_CONSUMER_KEY.substring(0, 10)}...`);
  console.log(`Callback URL: ${credentials.MPESA_CALLBACK_URL}`);
  console.log('\n='.repeat(60));
  console.log('\n🚀 Next Steps:\n');
  console.log('1. Restart your server: npm start');
  console.log('2. Test the connection (as admin):');
  console.log('   POST http://localhost:5000/api/mpesa/test-connection');
  console.log('\n3. For local testing with ngrok:');
  console.log('   - Install: npm install -g ngrok');
  console.log('   - Run: ngrok http 5000');
  console.log('   - Update MPESA_CALLBACK_URL with ngrok URL\n');
  console.log('4. Register your callback URL in Daraja portal');
  console.log('\n📚 Documentation:');
  console.log('   - Check MPESA_IMPLEMENTATION_COMPLETE.md for full guide');
  console.log('   - Test with: node test-mpesa-integration.js\n');
  console.log('='.repeat(60));
}

async function main() {
  try {
    const creds = await collectCredentials();
    
    console.log('\n🔍 Review your credentials:\n');
    console.log(`Consumer Key: ${creds.MPESA_CONSUMER_KEY.substring(0, 10)}...`);
    console.log(`Short Code: ${creds.MPESA_BUSINESS_SHORT_CODE}`);
    console.log(`Environment: ${creds.MPESA_ENVIRONMENT}`);
    console.log(`Callback URL: ${creds.MPESA_CALLBACK_URL}\n`);
    
    const confirm = await askQuestion('Save these credentials to .env? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
      const success = updateEnvFile(creds);
      if (success) {
        displaySummary(creds);
      }
    } else {
      console.log('\n❌ Setup cancelled. No changes made to .env file.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the setup
main();
