require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deployProductionFix = async () => {
  try {
    console.log('🚀 Deploying production fixes...');
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production MongoDB');

    // Load models
    const User = require('./server/models/User');
    const Blog = require('./server/models/Blog');
    
    console.log('✅ Models loaded');

    // 1. Fix Admin Account
    console.log('🔧 Setting up admin account...');
    
    // Remove existing admins
    await User.deleteMany({ role: 'admin' });
    
    // Create single admin
    const admin = new User({
      name: 'Smiling Steps Admin',
      email: 'smilingsteps@gmail.com',
      password: '33285322',
      role: 'admin',
      isVerified: true,
      accountStatus: 'approved',
      profileInfo: {
        bio: 'System Administrator'
      }
    });
    
    await admin.save();
    console.log('✅ Admin account created');

    // 2. Create sample psychologists if none exist
    const psychologistCount = await User.countDocuments({ role: 'psychologist' });
    if (psychologistCount === 0) {
      console.log('👨‍⚕️ Creating sample psychologists...');
      
      const psychologists = [
        {
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@smilingsteps.com',
          password: 'psychologist123',
          role: 'psychologist',
          isVerified: true,
          accountStatus: 'approved',
          profileInfo: {
            bio: 'Licensed clinical psychologist specializing in anxiety and depression treatment.',
            profilePicture: null
          },
          psychologistDetails: {
            specializations: ['Anxiety Disorders', 'Depression', 'Cognitive Behavioral Therapy'],
            experience: '8 years',
            education: 'Ph.D. in Clinical Psychology, University of Nairobi',
            rates: {
              Individual: { amount: 3000, duration: 60 },
              Couples: { amount: 4500, duration: 75 },
              Family: { amount: 5500, duration: 90 },
              Group: { amount: 2000, duration: 90 }
            },
            paymentInfo: {
              mpesaNumber: '0712345678',
              mpesaName: 'Dr. Sarah Johnson'
            }
          }
        },
        {
          name: 'Dr. Michael Ochieng',
          email: 'michael.ochieng@smilingsteps.com',
          password: 'psychologist123',
          role: 'psychologist',
          isVerified: true,
          accountStatus: 'approved',
          profileInfo: {
            bio: 'Experienced therapist focusing on trauma recovery and family counseling.',
            profilePicture: null
          },
          psychologistDetails: {
            specializations: ['Trauma Recovery', 'Family Therapy', 'PTSD Treatment'],
            experience: '12 years',
            education: 'M.A. in Counseling Psychology, Kenyatta University',
            rates: {
              Individual: { amount: 2500, duration: 60 },
              Couples: { amount: 4000, duration: 75 },
              Family: { amount: 5000, duration: 90 },
              Group: { amount: 1800, duration: 90 }
            },
            paymentInfo: {
              mpesaNumber: '0723456789',
              mpesaName: 'Dr. Michael Ochieng'
            }
          }
        }
      ];

      for (const psychData of psychologists) {
        const psych = new User(psychData);
        await psych.save();
      }
      
      console.log('✅ Sample psychologists created');
    }

    // 3. Create sample blog if none exist
    const blogCount = await Blog.countDocuments();
    if (blogCount === 0) {
      console.log('📝 Creating sample blog...');
      
      const sampleBlog = new Blog({
        title: 'Welcome to Smiling Steps',
        slug: 'welcome-to-smiling-steps',
        content: 'Welcome to Smiling Steps, your trusted partner in mental health and wellness. Our platform connects you with licensed therapists and counselors who are committed to helping you achieve your mental health goals.',
        excerpt: 'Welcome to Smiling Steps - your trusted partner in mental health and wellness.',
        author: admin._id,
        published: true,
        publishedAt: new Date(),
        tags: ['welcome', 'mental health', 'therapy'],
        views: 0
      });
      
      await sampleBlog.save();
      console.log('✅ Sample blog created');
    }

    console.log('');
    console.log('🎉 PRODUCTION DEPLOYMENT COMPLETE!');
    console.log('');
    console.log('🔑 ADMIN CREDENTIALS:');
    console.log('📧 Email: smilingsteps@gmail.com');
    console.log('🔐 Password: 33285322');
    console.log('');
    console.log('🌐 Access your app at:');
    console.log('Frontend: https://smiling-steps-frontend.onrender.com');
    console.log('Backend: https://smiling-steps.onrender.com');
    console.log('');
    console.log('✅ All systems ready!');

  } catch (error) {
    console.error('❌ Deployment error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

deployProductionFix();