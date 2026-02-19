/**
 * Authentication Utilities
 * 
 * Provides token generation and verification utilities for testing and internal use.
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user
 * @param {string|ObjectId} userId - The user's ID
 * @param {string} role - Optional role to include in token
 * @returns {string} - JWT token
 */
function generateToken(userId, role = null) {
  const payload = {
    user: {
      id: userId.toString(),
      ...(role && { role })
    }
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '24h' }
  );
}

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {object|null} - Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
  } catch (error) {
    return null;
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 * @param {string} token - The JWT token to decode
 * @returns {object|null} - Decoded token payload or null if invalid
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
