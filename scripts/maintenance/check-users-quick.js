const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./server/models/User');
  const users = await User.find({}).select('name email role isVerified');
  console.log('Users in database:');
  users.forEach(u => {
    console.log('- ' + u.email + ' (' + u.role + ') - verified: ' + u.isVerified);
  });
  await mongoose.disconnect();
}
checkUsers().catch(console.error);
