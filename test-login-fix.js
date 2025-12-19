const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'psychologist', 'admin'], default: 'client' },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
});

const User = mongoose.model('User', userSchema);

const testLogin = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Checking existing users...');
    const existingUsers = await User.find({}).select('name email role isVerified');
    console.log('📊 Found users:', existingUsers.length);
    existingUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}, Verified: ${user.isVerified}`);
    });
    
    // Create test user if none exist
    if (existingUsers.length === 0) {
      console.log('👤 Creating test user...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'client',
        isVerified: true, // Skip email verification for testing
        lastLogin: new Date()
      });
      
      await testUser.save();
      console.log('✅ Test user created: test@example.com / password123');
    }
    
    // Test login with existing user
    const testEmail = existingUsers.length > 0 ? existingUsers[0].email : 'test@example.com';
    const testPassword = 'password123';
    
    console.log(`🔐 Testing login with: ${testEmail} / ${testPassword}`);
    
    const user = await User.findOne({ email: testEmail }).select('+password');
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', {
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      hasPassword: !!user.password
    });
    
    // Test password comparison
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('🔑 Password match:', isMatch);
    
    if (isMatch) {
      console.log('✅ Login test successful!');
      console.log('📝 You can now login with:');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword}`);
    } else {
      console.log('❌ Password mismatch - login will fail');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    mongoose.connection.close();
  }
};

testLogin();