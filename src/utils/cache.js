/**
 * Simple in-memory cache implementation
 */
class Cache {
  constructor(ttl = 3600) {
    this.cache = new Map();
    this.ttl = ttl * 1000; // Convert to milliseconds
  }

  /**
   * Set a value in cache
   * @param {string} key
   * @param {*} value
   * @param {number} customTtl - Custom TTL in seconds
   */
  set(key, value, customTtl = null) {
    const expiresAt = Date.now() + (customTtl ? customTtl * 1000 : this.ttl);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete a key from cache
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clean up expired items
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
const config = require("../config");
const cache = new Cache(config.cache.ttl);

// Run cleanup every 5 minutes
setInterval(
  () => {
    cache.cleanup();
  },
  5 * 60 * 1000,
);

module.exports = cache;
