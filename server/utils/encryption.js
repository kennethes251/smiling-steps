const crypto = require('crypto');

/**
 * Encryption Utility for Sensitive Data
 * 
 * Provides AES-256-GCM encryption for sensitive data like M-Pesa credentials
 * Uses environment-based encryption key for security
 */

class Encryption {
  constructor() {
    // Load encryption key from environment
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!this.encryptionKey) {
      console.warn('⚠️ ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)');
      // Generate a default key for development (NOT SECURE)
      this.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
    
    // Ensure key is 32 bytes (256 bits) for AES-256
    this.keyBuffer = Buffer.from(this.encryptionKey.slice(0, 64), 'hex');
    
    // Algorithm: AES-256-GCM (Galois/Counter Mode for authenticated encryption)
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - The data to encrypt
   * @returns {string} - Encrypted data in format: iv:authTag:ciphertext (hex encoded)
   */
  encrypt(plaintext) {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty data');
    }

    try {
      // Generate random initialization vector (IV)
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag for integrity verification
      const authTag = cipher.getAuthTag();
      
      // Return format: iv:authTag:ciphertext (all hex encoded)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('❌ Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted data
   * @param {string} encryptedData - Encrypted data in format: iv:authTag:ciphertext
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty data');
    }

    try {
      // Parse encrypted data
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error.message);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Mask sensitive data for logging (show only last N characters)
   * @param {string} data - The data to mask
   * @param {number} visibleChars - Number of characters to show at the end (default: 4)
   * @returns {string} - Masked data
   */
  mask(data, visibleChars = 4) {
    if (!data) {
      return '';
    }
    
    if (data.length <= visibleChars) {
      return '*'.repeat(data.length);
    }
    
    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);
    
    return masked + visible;
  }

  /**
   * Mask phone number for logging (show only last 4 digits)
   * @param {string} phoneNumber - The phone number to mask
   * @returns {string} - Masked phone number (e.g., "254****5678")
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return '';
    }
    
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (cleaned.length <= 4) {
      return '*'.repeat(cleaned.length);
    }
    
    // Show country code and last 4 digits
    const countryCode = cleaned.slice(0, 3); // e.g., "254"
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 7);
    
    return `${countryCode}${masked}${lastFour}`;
  }

  /**
   * Hash data using SHA-256 (one-way, for verification)
   * @param {string} data - The data to hash
   * @returns {string} - SHA-256 hash (hex encoded)
   */
  hash(data) {
    if (!data) {
      throw new Error('Cannot hash empty data');
    }
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   * @param {number} bytes - Number of random bytes (default: 32)
   * @returns {string} - Random token (hex encoded)
   */
  generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }
}

module.exports = new Encryption();
