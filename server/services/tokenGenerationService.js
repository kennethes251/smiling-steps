const crypto = require('crypto');
const User = require('../models/User');

/**
 * Cryptographically Secure Token Generation Service
 * 
 * This service provides secure token generation for email verification
 * with the following security features:
 * - Cryptographically secure random generation (32 bytes)
 * - 24-hour expiration
 * - Secure token storage (hashed)
 * - Automatic cleanup of expired tokens
 */
class TokenGenerationService {
  constructor() {
    this.TOKEN_LENGTH = 32; // 32 bytes as specified in requirements
    this.TOKEN_EXPIRY_HOURS = 24; // 24 hours as specified in requirements
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // Run cleanup every hour
    
    // Start automatic cleanup process
    this.startAutomaticCleanup();
  }

  /**
   * Generate a cryptographically secure verification token
   * Uses crypto.randomBytes for secure random generation
   * @returns {string} Plain text token (64 hex characters from 32 bytes)
   */
  generateSecureToken() {
    try {
      // Generate 32 cryptographically secure random bytes
      const tokenBytes = crypto.randomBytes(this.TOKEN_LENGTH);
      
      // Convert to hexadecimal string (64 characters)
      const token = tokenBytes.toString('hex');
      
      console.log('🔐 Generated secure token:', {
        byteLength: this.TOKEN_LENGTH,
        hexLength: token.length,
        tokenPrefix: token.substring(0, 8) + '...'
      });
      
      return token;
    } catch (error) {
      console.error('❌ Failed to generate secure token:', error);
      throw new Error('Failed to generate secure verification token');
    }
  }

  /**
   * Hash a token for secure storage using SHA-256
   * @param {string} token - Plain text token
   * @returns {string} Hashed token (64 hex characters)
   */
  hashToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided for hashing');
    }

    try {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      
      console.log('🔐 Token hashed successfully:', {
        originalLength: token.length,
        hashLength: hash.length,
        hashPrefix: hash.substring(0, 8) + '...'
      });
      
      return hash;
    } catch (error) {
      console.error('❌ Failed to hash token:', error);
      throw new Error('Failed to hash verification token');
    }
  }

  /**
   * Calculate token expiration time (24 hours from now)
   * @returns {Date} Expiration date
   */
  calculateExpirationTime() {
    const expirationTime = new Date(Date.now() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000));
    
    console.log('⏰ Token expiration calculated:', {
      expiresAt: expirationTime.toISOString(),
      hoursFromNow: this.TOKEN_EXPIRY_HOURS
    });
    
    return expirationTime;
  }

  /**
   * Generate and store verification token for a user
   * @param {string} userId - User ID
   * @returns {Promise<{token: string, expiresAt: Date}>} Plain text token and expiration
   */
  async createVerificationToken(userId) {
    if (!userId) {
      throw new Error('User ID is required to create verification token');
    }

    try {
      // Generate cryptographically secure token
      const plainToken = this.generateSecureToken();
      
      // Hash token for secure storage
      const hashedToken = this.hashToken(plainToken);
      
      // Calculate expiration time
      const expiresAt = this.calculateExpirationTime();

      // Update user with hashed token and expiration
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          verificationToken: hashedToken,
          verificationTokenExpires: expiresAt
        },
        { new: true, select: 'email name role' }
      );

      if (!updatedUser) {
        throw new Error('User not found');
      }

      console.log('✅ Verification token created successfully:', {
        userId: userId,
        userEmail: updatedUser.email,
        tokenLength: plainToken.length,
        expiresAt: expiresAt.toISOString()
      });

      return {
        token: plainToken, // Return plain token for email
        expiresAt: expiresAt,
        user: updatedUser
      };
    } catch (error) {
      console.error('❌ Failed to create verification token:', error);
      throw new Error(`Failed to create verification token: ${error.message}`);
    }
  }

  /**
   * Validate a verification token
   * @param {string} plainToken - Plain text token from email
   * @returns {Promise<{valid: boolean, user?: Object, reason?: string}>}
   */
  async validateToken(plainToken) {
    if (!plainToken || typeof plainToken !== 'string') {
      return {
        valid: false,
        reason: 'Invalid token format'
      };
    }

    try {
      // Hash the provided token
      const hashedToken = this.hashToken(plainToken);
      
      // Find user with matching token that hasn't expired
      const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        // Check if token exists but is expired
        const expiredUser = await User.findOne({
          verificationToken: hashedToken
        });

        if (expiredUser) {
          console.log('⚠️ Token validation failed: Token expired', {
            tokenPrefix: plainToken.substring(0, 8) + '...',
            userEmail: expiredUser.email
          });
          
          return {
            valid: false,
            reason: 'TOKEN_EXPIRED',
            user: expiredUser
          };
        }

        console.log('⚠️ Token validation failed: Invalid token', {
          tokenPrefix: plainToken.substring(0, 8) + '...'
        });
        
        return {
          valid: false,
          reason: 'INVALID_TOKEN'
        };
      }

      console.log('✅ Token validation successful:', {
        userId: user._id,
        userEmail: user.email,
        tokenPrefix: plainToken.substring(0, 8) + '...'
      });

      return {
        valid: true,
        user: user
      };
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return {
        valid: false,
        reason: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Clear verification token from user (after successful verification)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async clearVerificationToken(userId) {
    try {
      const result = await User.findByIdAndUpdate(
        userId,
        {
          $unset: {
            verificationToken: 1,
            verificationTokenExpires: 1
          }
        }
      );

      if (result) {
        console.log('✅ Verification token cleared:', {
          userId: userId
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to clear verification token:', error);
      return false;
    }
  }

  /**
   * Clean up expired verification tokens
   * This method removes expired tokens from the database
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    try {
      const result = await User.updateMany(
        { 
          verificationTokenExpires: { $lt: Date.now() }
        },
        { 
          $unset: { 
            verificationToken: 1, 
            verificationTokenExpires: 1 
          } 
        }
      );

      const cleanedCount = result.modifiedCount || 0;
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired verification tokens`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Start automatic cleanup process for expired tokens
   * Runs every hour to clean up expired tokens
   */
  startAutomaticCleanup() {
    console.log('🔄 Starting automatic token cleanup process');
    
    // Run cleanup immediately
    this.cleanupExpiredTokens();
    
    // Set up recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop automatic cleanup process
   */
  stopAutomaticCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped automatic token cleanup process');
    }
  }

  /**
   * Get token statistics for monitoring
   * @returns {Promise<Object>} Token statistics
   */
  async getTokenStatistics() {
    try {
      const totalTokens = await User.countDocuments({
        verificationToken: { $exists: true }
      });

      const expiredTokens = await User.countDocuments({
        verificationToken: { $exists: true },
        verificationTokenExpires: { $lt: Date.now() }
      });

      const activeTokens = totalTokens - expiredTokens;

      return {
        totalTokens,
        activeTokens,
        expiredTokens,
        cleanupNeeded: expiredTokens > 0
      };
    } catch (error) {
      console.error('❌ Error getting token statistics:', error);
      return {
        totalTokens: 0,
        activeTokens: 0,
        expiredTokens: 0,
        cleanupNeeded: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new TokenGenerationService();