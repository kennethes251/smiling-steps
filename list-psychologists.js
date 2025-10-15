const axios = require('axios');

const API_URL = 'https://smiling-steps.onrender.com';

async function listPsychologists() {
  console.log('👨‍⚕️ Listing All Psychologists\n');
  
  try {
    // Get public psychologists list
    const response = await axios.get(`${API_URL}/api/public/psychologists`);
    
    const psychologists = response.data;
    
    if (psychologists.length === 0) {
      console.log('❌ No psychologists found in database');
      console.log('\n💡 You need to create psychologist accounts first!');
      console.log('   Go to: /admin/create-psychologist');
      console.log('   Or use the "Create Sample Psychologists" button');
    } else {
      console.log(`✅ Found ${psychologists.length} psychologist(s):\n`);
      
      psychologists.forEach((psych, index) => {
        console.log(`${index + 1}. ${psych.name}`);
        console.log(`   Email: ${psych.email}`);
        console.log(`   Specializations: ${psych.psychologistDetails?.specializations?.join(', ') || 'N/A'}`);
        console.log(`   Verified: ${psych.isVerified ? 'Yes' : 'No'}`);
        console.log('');
      });
      
      console.log('💡 To login as a psychologist, use one of the emails above');
      console.log('   with the password you set when creating the account.');
    }
    
  } catch (error) {
    console.log('❌ Error fetching psychologists');
    console.log('Error:', error.response?.data || error.message);
  }
}

listPsychologists();
