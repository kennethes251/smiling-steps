require('dotenv').config({ path: '../.env' });
const { Sequelize, DataTypes } = require('sequelize');

const createUsers = async () => {
  try {
    // Connect to PostgreSQL
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });

    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Load User model
    const User = require('./models/User')(sequelize, DataTypes);
    await sequelize.sync();

    // Create Admin
    const adminEmail = 'admin@smilingsteps.com';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (!existingAdmin) {
      const admin = await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
        isVerified: true
      });
      console.log('✅ Admin created:', admin.email);
    } else {
      console.log('ℹ️  Admin already exists');
    }

    // Create Psychologists
    const psychologists = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isVerified: true,
        psychologistDetails: {
          specializations: ['Anxiety', 'Depression', 'CBT'],
          experience: '10+ years',
          education: 'Ph.D. in Clinical Psychology',
          approvalStatus: 'approved',
          rates: {
            individual: 2500,
            couples: 4000,
            family: 4500,
            group: 1800
          }
        },
        profileInfo: {
          bio: 'Dr. Sarah Johnson specializes in cognitive behavioral therapy and has over 10 years of experience helping clients overcome anxiety and depression.'
        }
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isVerified: true,
        psychologistDetails: {
          specializations: ['Trauma', 'PTSD', 'EMDR'],
          experience: '8+ years',
          education: 'Ph.D. in Clinical Psychology',
          approvalStatus: 'approved',
          rates: {
            individual: 3000,
            couples: 4500,
            family: 5000,
            group: 2000
          }
        },
        profileInfo: {
          bio: 'Dr. Michael Chen is an expert in trauma therapy and EMDR, helping clients heal from traumatic experiences.'
        }
      },
      {
        name: 'Dr. Emily Rodriguez',
        email: 'emily@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isVerified: true,
        psychologistDetails: {
          specializations: ['Family Therapy', 'Couples Counseling', 'Relationship Issues'],
          experience: '12+ years',
          education: 'Ph.D. in Marriage and Family Therapy',
          approvalStatus: 'approved',
          rates: {
            individual: 2800,
            couples: 4200,
            family: 4800,
            group: 1900
          }
        },
        profileInfo: {
          bio: 'Dr. Emily Rodriguez specializes in family and couples therapy, helping relationships thrive through evidence-based interventions.'
        }
      }
    ];

    for (const psychData of psychologists) {
      const existing = await User.findOne({ where: { email: psychData.email } });
      if (!existing) {
        const psych = await User.create(psychData);
        console.log('✅ Psychologist created:', psych.email);
      } else {
        console.log('ℹ️  Psychologist already exists:', psychData.email);
      }
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Login Credentials:');
    console.log('Admin: admin@smilingsteps.com / admin123');
    console.log('Psychologist 1: sarah@smilingsteps.com / psych123');
    console.log('Psychologist 2: michael@smilingsteps.com / psych123');
    console.log('Psychologist 3: emily@smilingsteps.com / psych123');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createUsers();