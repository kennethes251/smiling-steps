const fs = require('fs');
const path = require('path');

// Read the users.js file
const filePath = path.join(__dirname, 'server', 'routes', 'users.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all JWT expiration times from 1h to 24h
content = content.replace(/{ expiresIn: '1h' }/g, "{ expiresIn: '24h' }");

// Write back to file
fs.writeFileSync(filePath, content);
console.log('✅ Updated JWT expiration from 1h to 24h');