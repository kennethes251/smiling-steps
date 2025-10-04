// Create sample therapists for the platform
const sampleTherapists = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@smilingsteps.com',
    password: 'therapist123',
    role: 'psychologist',
    specializations: ['Anxiety', 'Depression', 'Trauma'],
    bio: 'Experienced therapist specializing in cognitive behavioral therapy and trauma recovery.',
    education: 'PhD in Clinical Psychology, Harvard University',
    experience: '8 years of clinical practice',
    sessionRate: 120
  },
  {
    name: 'Dr. Michael Chen',
    email: 'michael.chen@smilingsteps.com', 
    password: 'therapist123',
    role: 'psychologist',
    specializations: ['Couples Therapy', 'Family Counseling', 'Communication'],
    bio: 'Dedicated to helping couples and families build stronger relationships.',
    education: 'MA in Marriage and Family Therapy, UCLA',
    experience: '6 years of practice',
    sessionRate: 100
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@smilingsteps.com',
    password: 'therapist123', 
    role: 'psychologist',
    specializations: ['Teen Counseling', 'ADHD', 'Academic Stress'],
    bio: 'Passionate about helping teenagers navigate challenges and build confidence.',
    education: 'PsyD in Child Psychology, Stanford University',
    experience: '5 years specializing in adolescent therapy',
    sessionRate: 110
  }
];

const createTherapists = async () => {
  console.log('🧪 Creating sample therapists...');
  
  for (const therapist of sampleTherapists) {
    try {
      const response = await fetch('https://smiling-steps.onrender.com/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(therapist)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Created therapist: ${therapist.name}`);
      } else {
        const error = await response.text();
        console.log(`❌ Error creating ${therapist.name}:`, error);
      }
    } catch (error) {
      console.error(`❌ Network error for ${therapist.name}:`, error.message);
    }
  }
};

createTherapists();