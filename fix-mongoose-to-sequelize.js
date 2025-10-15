const fs = require('fs');
const path = require('path');

// Read users.js
const usersPath = path.join(__dirname, 'server', 'routes', 'users.js');
let content = fs.readFileSync(usersPath, 'utf8');

console.log('🔧 Fixing Mongoose to Sequelize in users.js...\n');

// Fix bare findById calls
content = content.replace(/await findById\(/g, 'await User.findByPk(');
console.log('✅ Fixed: await findById → await User.findByPk');

// Fix bare findOne calls with Mongoose syntax
content = content.replace(/await findOne\(\{([^}]+)\}\)/g, (match, query) => {
  // Check if it's a simple query that can be converted
  if (query.includes('email:')) {
    return `await User.findOne({ where: {${query}} })`;
  } else if (query.includes('role:')) {
    return `await User.findOne({ where: {${query}} })`;
  } else {
    // Complex query - needs manual review
    return match;
  }
});
console.log('✅ Fixed: await findOne → await User.findOne with where clause');

// Fix findByIdAndUpdate
content = content.replace(/await findByIdAndUpdate\(/g, 'await User.update(');
console.log('✅ Fixed: await findByIdAndUpdate → await User.update');

// Fix .select('-password') to Sequelize syntax
content = content.replace(/\.select\('-password'\)/g, ', { attributes: { exclude: [\'password\'] } }');
console.log('✅ Fixed: .select(\'-password\') → attributes exclude');

// Fix new User() calls
content = content.replace(/new User\(/g, 'await User.create(');
console.log('✅ Fixed: new User() → await User.create()');

// Fix .save() calls - note these need manual review
const saveCount = (content.match(/await user\.save\(\)/g) || []).length;
console.log(`⚠️  Found ${saveCount} instances of 'await user.save()' - these need manual review`);

// Write back
fs.writeFileSync(usersPath, content, 'utf8');
console.log('\n✅ File updated successfully!');
console.log('\n⚠️  IMPORTANT: Review the file for:');
console.log('   - Complex findOne queries');
console.log('   - .save() calls (may need to use user.update())');
console.log('   - Mongoose-specific operators like $gt, $set, $unset');
