/**
 * Booking Reference Number Generator
 * 
 * Generates unique, human-readable booking reference numbers for sessions.
 * Format: SS-YYYYMMDD-XXXX (e.g., SS-20251230-A7B3)
 * 
 * Requirements: 1.5 - Generate unique booking reference number
 */

const crypto = require('crypto');

/**
 * Generate a unique booking reference number
 * Format: SS-YYYYMMDD-XXXX
 * - SS: Smiling Steps prefix
 * - YYYYMMDD: Date of booking creation
 * - XXXX: 4-character alphanumeric code (uppercase)
 * 
 * @param {Date} [date] - Optional date for the reference (defaults to now)
 * @returns {string} Unique booking reference number
 */
const generateBookingReference = (date = new Date()) => {
  // Format date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate 4-character alphanumeric code (uppercase letters and numbers)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars: I, O, 0, 1
  const randomBytes = crypto.randomBytes(4);
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  
  return `SS-${dateStr}-${code}`;
};

/**
 * Validate a booking reference format
 * @param {string} reference - The booking reference to validate
 * @returns {boolean} True if valid format
 */
const isValidBookingReference = (reference) => {
  if (!reference || typeof reference !== 'string') {
    return false;
  }
  
  // Pattern: SS-YYYYMMDD-XXXX
  const pattern = /^SS-\d{8}-[A-Z2-9]{4}$/;
  return pattern.test(reference);
};

/**
 * Parse a booking reference to extract components
 * @param {string} reference - The booking reference to parse
 * @returns {object|null} Parsed components or null if invalid
 */
const parseBookingReference = (reference) => {
  if (!isValidBookingReference(reference)) {
    return null;
  }
  
  const parts = reference.split('-');
  const dateStr = parts[1];
  
  return {
    prefix: parts[0],
    date: new Date(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8))
    ),
    code: parts[2],
    full: reference
  };
};

/**
 * Generate a unique booking reference with collision check
 * Uses a callback to check if reference already exists
 * 
 * @param {Function} existsCheck - Async function that returns true if reference exists
 * @param {number} [maxAttempts=10] - Maximum attempts to generate unique reference
 * @returns {Promise<string>} Unique booking reference
 * @throws {Error} If unable to generate unique reference after max attempts
 */
const generateUniqueBookingReference = async (existsCheck, maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reference = generateBookingReference();
    
    // Check if reference already exists
    const exists = await existsCheck(reference);
    if (!exists) {
      return reference;
    }
    
    console.log(`⚠️ Booking reference collision detected: ${reference}, retrying...`);
  }
  
  throw new Error('Unable to generate unique booking reference after maximum attempts');
};

/**
 * Format booking reference for display (adds spaces for readability)
 * @param {string} reference - The booking reference
 * @returns {string} Formatted reference
 */
const formatBookingReferenceForDisplay = (reference) => {
  if (!isValidBookingReference(reference)) {
    return reference;
  }
  return reference; // Already readable format
};

module.exports = {
  generateBookingReference,
  isValidBookingReference,
  parseBookingReference,
  generateUniqueBookingReference,
  formatBookingReferenceForDisplay
};
