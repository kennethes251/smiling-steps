/**
 * Query Cache Utility
 * 
 * Implements Requirement 13.4 from teletherapy-booking-enhancement
 * - Implement caching for frequently accessed data
 * - Reduce database load for repeated queries
 * 
 * Uses in-memory LRU cache with TTL support
 * 
 * @module utils/queryCache
 */

/**
 * Simple LRU Cache implementation with TTL support
 */
class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 60000; // 1 minute default
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
    
    this.stats.sets++;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`
    };
  }
}

// Create cache instances for different data types
const caches = {
  sessions: new LRUCache({ maxSize: 200, defaultTTL: 30000 }), // 30 seconds
  users: new LRUCache({ maxSize: 100, defaultTTL: 60000 }), // 1 minute
  availability: new LRUCache({ maxSize: 50, defaultTTL: 120000 }), // 2 minutes
  stats: new LRUCache({ maxSize: 20, defaultTTL: 300000 }) // 5 minutes
};

/**
 * Generate a cache key from query parameters
 * @param {string} prefix - Cache key prefix
 * @param {Object} params - Query parameters
 * @returns {string} - Cache key
 */
function generateCacheKey(prefix, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

/**
 * Cache wrapper for async functions
 * @param {string} cacheType - Type of cache to use
 * @param {string} keyPrefix - Key prefix
 * @param {Function} fn - Async function to cache
 * @param {Object} params - Parameters for cache key
 * @param {number} ttl - Optional TTL override
 * @returns {Promise<*>} - Cached or fresh result
 */
async function withCache(cacheType, keyPrefix, fn, params = {}, ttl = null) {
  const cache = caches[cacheType];
  if (!cache) {
    console.warn(`Unknown cache type: ${cacheType}, executing without cache`);
    return fn();
  }
  
  const cacheKey = generateCacheKey(keyPrefix, params);
  
  // Try to get from cache
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // Execute function and cache result
  const result = await fn();
  cache.set(cacheKey, result, ttl);
  
  return result;
}

/**
 * Invalidate session-related caches
 * @param {string} sessionId - Session ID to invalidate
 * @param {string} clientId - Client ID to invalidate
 * @param {string} psychologistId - Psychologist ID to invalidate
 */
function invalidateSessionCache(sessionId, clientId, psychologistId) {
  // Invalidate specific session
  if (sessionId) {
    caches.sessions.invalidatePattern(new RegExp(`session:${sessionId}`));
  }
  
  // Invalidate client's session lists
  if (clientId) {
    caches.sessions.invalidatePattern(new RegExp(`client:${clientId}`));
  }
  
  // Invalidate psychologist's session lists
  if (psychologistId) {
    caches.sessions.invalidatePattern(new RegExp(`psychologist:${psychologistId}`));
  }
  
  // Invalidate stats cache
  caches.stats.clear();
}

/**
 * Invalidate user-related caches
 * @param {string} userId - User ID to invalidate
 */
function invalidateUserCache(userId) {
  if (userId) {
    caches.users.invalidatePattern(new RegExp(`user:${userId}`));
  }
}

/**
 * Invalidate availability caches
 * @param {string} therapistId - Therapist ID to invalidate
 */
function invalidateAvailabilityCache(therapistId) {
  if (therapistId) {
    caches.availability.invalidatePattern(new RegExp(`availability:${therapistId}`));
  }
}

/**
 * Get all cache statistics
 * @returns {Object} - Stats for all caches
 */
function getAllCacheStats() {
  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
}

/**
 * Clear all caches
 */
function clearAllCaches() {
  for (const cache of Object.values(caches)) {
    cache.clear();
  }
}

module.exports = {
  LRUCache,
  caches,
  generateCacheKey,
  withCache,
  invalidateSessionCache,
  invalidateUserCache,
  invalidateAvailabilityCache,
  getAllCacheStats,
  clearAllCaches
};
