const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

async function checkEmailHostingStatus() {
  console.log('🔍 Checking Email Hosting Status for smilingsteps.com...\n');

  try {
    // Check MX records (mail exchange records)
    console.log('📧 Checking MX Records...');
    const mxRecords = await resolveMx('smilingsteps.com');
    
    if (mxRecords && mxRecords.length > 0) {
      console.log('✅ MX Records Found:');
      mxRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.exchange} (priority: ${record.priority})`);
      });
      
      // Check if it's Namecheap email hosting
      const namecheapMail = mxRecords.some(record => 
        record.exchange.includes('privateemail.com') || 
        record.exchange.includes('namecheap.com') ||
        record.exchange.includes('registrar-servers.com')
      );
      
      if (namecheapMail) {
        console.log('🎉 Detected: Namecheap Private Email hosting!');
        console.log('   This means you DO have email hosting with Namecheap.');
        console.log('   The hr@smilingsteps.com account should exist in your dashboard.');
      } else {
        console.log('⚠️  Detected: Third-party email hosting');
        console.log('   Your email might be hosted elsewhere (Google, Microsoft, etc.)');
      }
    } else {
      console.log('❌ No MX Records Found');
      console.log('   This suggests no email hosting is configured.');
    }

  } catch (error) {
    console.log('❌ Error checking MX records:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // Check TXT records for email-related configurations
    console.log('📝 Checking TXT Records for Email Configuration...');
    const txtRecords = await resolveTxt('smilingsteps.com');
    
    if (txtRecords && txtRecords.length > 0) {
      console.log('✅ TXT Records Found:');
      txtRecords.forEach((record, index) => {
        const recordText = Array.isArray(record) ? record.join('') : record;
        console.log(`  ${index + 1}. ${recordText}`);
        
        // Check for email-related TXT records
        if (recordText.includes('v=spf1')) {
          console.log('     📧 SPF Record (email authentication)');
        }
        if (recordText.includes('v=DMARC1')) {
          console.log('     🔒 DMARC Record (email security)');
        }
      });
    } else {
      console.log('❌ No TXT Records Found');
    }

  } catch (error) {
    console.log('❌ Error checking TXT records:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Provide recommendations based on findings
  console.log('🎯 Recommendations:\n');

  try {
    const mxRecords = await resolveMx('smilingsteps.com');
    
    if (!mxRecords || mxRecords.length === 0) {
      console.log('❌ NO EMAIL HOSTING DETECTED');
      console.log('   You need to set up email hosting first:');
      console.log('   1. Login to Namecheap dashboard');
      console.log('   2. Go to Domain List → smilingsteps.com → Manage');
      console.log('   3. Look for "Add Email Hosting" or "Private Email"');
      console.log('   4. Purchase email hosting service');
      console.log('   5. Create hr@smilingsteps.com account');
      
    } else {
      const namecheapMail = mxRecords.some(record => 
        record.exchange.includes('privateemail.com') || 
        record.exchange.includes('namecheap.com') ||
        record.exchange.includes('registrar-servers.com')
      );
      
      if (namecheapMail) {
        console.log('✅ NAMECHEAP EMAIL HOSTING ACTIVE');
        console.log('   Your email hosting is working! To find the password:');
        console.log('   1. Login to Namecheap dashboard');
        console.log('   2. Go to Domain List → smilingsteps.com → Manage');
        console.log('   3. Click "Email" or "Private Email" tab');
        console.log('   4. Find hr@smilingsteps.com');
        console.log('   5. Click "Change Password" or "Reset Password"');
        console.log('');
        console.log('   📧 Expected SMTP Settings:');
        console.log('   Host: mail.smilingsteps.com');
        console.log('   Port: 587 (STARTTLS) or 465 (SSL)');
        console.log('   Username: hr@smilingsteps.com');
        console.log('   Password: [Set in Namecheap dashboard]');
        
      } else {
        console.log('⚠️  THIRD-PARTY EMAIL HOSTING');
        console.log('   Your email is hosted elsewhere. Check:');
        
        const googleMail = mxRecords.some(record => record.exchange.includes('google'));
        const microsoftMail = mxRecords.some(record => 
          record.exchange.includes('outlook') || record.exchange.includes('microsoft')
        );
        
        if (googleMail) {
          console.log('   📧 Google Workspace detected');
          console.log('   Login to: admin.google.com');
        } else if (microsoftMail) {
          console.log('   📧 Microsoft 365 detected');
          console.log('   Login to: admin.microsoft.com');
        } else {
          console.log('   📧 Other email provider detected');
          console.log('   Check with your email hosting provider');
        }
      }
    }

  } catch (error) {
    console.log('❌ Error providing recommendations:', error.message);
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Use the information above to locate your email settings');
  console.log('2. Get/reset the password for hr@smilingsteps.com');
  console.log('3. Update your .env file with the password');
  console.log('4. Test with: node test-namecheap-email.js');
}

// Run the check
checkEmailHostingStatus().catch(console.error);