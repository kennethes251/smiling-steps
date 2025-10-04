// Create psychologists on Render server
const samplePsychologists = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@smilingsteps.com',
    password: 'secure123',
    role: 'psychologist',
    specializations: ['Anxiety Disorders', 'Depression', 'Cognitive Behavioral Therapy'],
    experience: '8 years',
    education: 'PhD in Clinical Psychology, Harvard University',
    bio: 'Specializing in anxiety and depression treatment with a focus on CBT techniques.',
    sessionRate: 120
  },
  {
    name: 'Dr. Michael Chen',
    email: 'michael.chen@smilingsteps.com',
    password: 'secure123',
    role: 'psychologist',
    specializations: ['Couples Therapy', 'Family Counseling', 'Relationship Issues'],
    experience: '6 years',
    education: 'MA in Marriage and Family Therapy, UCLA',
    bio: 'Dedicated to helping couples and families build stronger relationships.',
    sessionRate: 100
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@smilingsteps.com',
    password: 'secure123',
    role: 'psychologist',
    specializations: ['Teen Counseling', 'ADHD', 'Academic Stress'],
    experience: '5 years',
    education: 'PsyD in Child Psychology, Stanford University',
    bio: 'Passionate about helping teenagers navigate challenges and build confidence.',
    sessionRate: 110
  }
];

const createPsychologists = async () => {
  console.log('🧪 Creating psychologists on Render...\n');
  
  for (const psychologist of samplePsychologists) {
    try {
      console.log(`Creating: ${psychologist.name}...`);
      
      const response = await fetch('https://smiling-steps.onrender.com/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(psychologist)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Created: ${psychologist.name}`);
      } else {
        const error = await response.text();
        console.log(`❌ Error creating ${psychologist.name}:`, error);
      }
    } catch (error) {
      console.error(`❌ Network error for ${psychologist.name}:`, error.message);
    }
  }
  
  // Verify creation
  console.log('\n🔍 Verifying psychologists were created...');
  const checkResponse = await fetch('https://smiling-steps.onrender.com/api/public/psychologists');
  if (checkResponse.ok) {
    const psychologists = await checkResponse.json();
    console.log(`✅ Total psychologists in database: ${psychologists.length}`);
  }
};

createPsychologists();