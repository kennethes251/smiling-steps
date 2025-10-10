const fs = require('fs');
const path = require('path');

// Read the users.js file
const filePath = path.join(__dirname, 'server', 'routes', 'users.js');
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
let lines = content.split('\n');

// Find and remove duplicate crypto imports
let foundCrypto = false;
lines = lines.filter(line => {
  if (line.trim() === "const crypto = require('crypto');") {
    if (foundCrypto) {
      console.log('Removing duplicate crypto import');
      return false; // Remove this duplicate
    } else {
      foundCrypto = true;
      return true; // Keep the first one
    }
  }
  return true;
});

// Write back to file
fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ Fixed duplicate crypto import');