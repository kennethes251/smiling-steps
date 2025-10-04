// Check what data exists in the database
const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database for existing data...\n');
    
    // Check psychologists
    console.log('1️⃣ Checking psychologists...');
    const psychResponse = await fetch('https://smiling-steps.onrender.com/api/public/psychologists');
    console.log('Psychologists API Status:', psychResponse.status);
    
    if (psychResponse.ok) {
      const psychologists = await psychResponse.json();
      console.log(`✅ Found ${psychologists.length} psychologists`);
      psychologists.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.name} - ${p.email} - Specializations: ${p.specializations?.join(', ') || 'None'}`);
      });
    } else {
      console.log('❌ Error fetching psychologists:', await psychResponse.text());
    }
    
    // Check all users
    console.log('\n2️⃣ Checking all users endpoint...');
    const usersResponse = await fetch('https://smiling-steps.onrender.com/api/users');
    console.log('Users API Status:', usersResponse.status);
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log(`✅ Found ${users.length} total users`);
      const clients = users.filter(u => u.role === 'client');
      const psychologists = users.filter(u => u.role === 'psychologist');
      console.log(`  - Clients: ${clients.length}`);
      console.log(`  - Psychologists: ${psychologists.length}`);
    } else {
      console.log('❌ Error fetching users:', await usersResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

checkDatabase();