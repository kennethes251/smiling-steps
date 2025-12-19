require('dotenv').config();
const mongoose = require('mongoose');

const fixProductionAdmin = async () => {
  try {
    console.log('🔧 Fixing production admin credentials...');
    
    // Connect to MongoDB (production)
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define User schema (inline to avoid import issues)
    const bcrypt = require('bcryptjs');
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['client', 'psychologist', 'admin'], default: 'client' },
      isVerified: { type: Boolean, default: false },
      accountStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      profileInfo: {
        bio: String,
        profilePicture: String,
        phone: String,
        location: String
      },
      psychologistDetails: {
        specializations: [String],
        experience: String,
        education: String,
        rates: {
          Individual: { amount: Number, duration: Number },
          Couples: { amount: Number, duration: Number },
          Family: { amount: Number, duration: Number },
          Group: { amount: Number, duration: Number }
        },
        paymentInfo: {
          mpesaNumber: String,
          mpesaName: String
        }
      },
      emailVerificationToken: String,
      emailVerificationExpires: Date,
      resetPasswordToken: String,
      resetPasswordExpires: Date
    }, {
      timestamps: true
    });

    // Hash password before saving
    userSchema.pre('save', async function(next) {
      if (!this.isModified('password')) return next();
      this.password = await bcrypt.hash(this.password, 12);
      next();
    });

    const User = mongoose.model('User', userSchema);

    // Remove all existing admin accounts first
    await User.deleteMany({ role: 'admin' });
    console.log('🗑️ Removed existing admin accounts');

    // Create the single admin account
    const adminData = {
      name: 'Smiling Steps Admin',
      email: 'smilingsteps@gmail.com',
      password: '33285322', // Will be hashed by pre-save hook
      role: 'admin',
      isVerified: true,
      accountStatus: 'approved',
      profileInfo: {
        bio: 'System Administrator for Smiling Steps Platform'
      }
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Admin account created successfully!');
    console.log('');
    console.log('🔑 PRODUCTION ADMIN CREDENTIALS:');
    console.log('📧 Email: smilingsteps@gmail.com');
    console.log('🔐 Password: 33285322');
    console.log('');
    console.log('🌐 Login at: https://smiling-steps-frontend.onrender.com/login');
    console.log('');
    console.log('⚠️  These are the ONLY admin credentials that will work in production!');

  } catch (error) {
    console.error('❌ Error fixing admin:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

fixProductionAdmin();