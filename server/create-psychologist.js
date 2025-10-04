const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:5000';

// Sample psychologists to create
const samplePsychologists = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@smilingsteps.com',
    password: 'secure123',
    specializations: ['Anxiety Disorders', 'Depression', 'Cognitive Behavioral Therapy'],
    experience: '8 years',
    education: 'PhD in Clinical Psychology, Harvard University',
    bio: 'Specializing in anxiety and depression treatment with a focus on CBT techniques.'
  },
  {
    name: 'Dr. Michael Chen',
    email: 'michael.chen@smilingsteps.com',
    password: 'secure123',
    specializations: ['Family Therapy', 'Couples Counseling', 'Relationship Issues'],
    experience: '12 years',
    education: 'PhD in Family Psychology, Stanford University',
    bio: 'Expert in family dynamics and relationship counseling with over a decade of experience.'
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@smilingsteps.com',
    password: 'secure123',
    specializations: ['Child Psychology', 'Adolescent Therapy', 'ADHD'],
    experience: '6 years',
    education: 'PhD in Child Psychology, UCLA',
    bio: 'Dedicated to helping children and adolescents navigate mental health challenges.'
  }
];

async function createPsychologist(psychologistData) {
  try {
    console.log(`\n🔐 Creating psychologist: ${psychologistData.name}`);
    
    const response = await axios.post(`${SERVER_URL}/api/users/create-psychologist`, psychologistData);
    
    if (response.data.success) {
      console.log(`✅ Successfully created: ${psychologistData.name}`);
      console.log(`   📧 Email: ${psychologistData.email}`);
      console.log(`   🔑 Password: ${psychologistData.password}`);
      console.log(`   🎓 Specializations: ${psychologistData.specializations.join(', ')}`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ Failed to create: ${psychologistData.name}`);
      console.log(`   Error: ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
    
  } catch (error) {
    console.log(`❌ Error creating ${psychologistData.name}:`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.errors) {
      console.log(`   Errors: ${error.response.data.errors.join(', ')}`);
    }
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function createSamplePsychologists() {
  console.log('🎯 Creating Sample Psychologist Accounts');
  console.log('========================================');
  
  const results = [];
  
  for (const psychologist of samplePsychologists) {
    const result = await createPsychologist(psychologist);
    results.push({ name: psychologist.name, ...result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Summary:');
  console.log('===========');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successfully created: ${successful} psychologists`);
  console.log(`❌ Failed to create: ${failed} psychologists`);
  
  if (successful > 0) {
    console.log('\n🔑 Login Credentials:');
    console.log('====================');
    results.filter(r => r.success).forEach(result => {
      const psych = samplePsychologists.find(p => p.name === result.name);
      console.log(`${psych.name}: ${psych.email} / ${psych.password}`);
    });
  }
  
  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🏥 Smiling Steps - Psychologist Account Creator');
  console.log('===============================================');
  
  try {
    if (command === 'sample') {
      await createSamplePsychologists();
    } else {
      console.log('Usage:');
      console.log('  node create-psychologist.js sample   - Create sample psychologists');
      console.log('');
      console.log('Make sure your server is running on http://localhost:5000');
    }
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createPsychologist,
  createSamplePsychologists,
  samplePsychologists
};