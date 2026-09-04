import { getRedisClient, getIsRedisConnected } from '../config/redis.config.js';

/**
 * High-Speed In-Memory Cache Store (RAM Fallback with TTL)
 */
class MemoryCacheStore {
  constructor() {
    this.store = new Map();
    // Periodically clean expired keys every 60 seconds
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 900) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  del(key) {
    return this.store.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  size() {
    return this.store.size;
  }
}

const memoryCache = new MemoryCacheStore();

/**
 * Universal Dual-Layer Cache Service (Redis Primary + RAM Fallback)
 */
export class CacheService {
  /**
   * Get value by key from Redis or Memory fallback
   * @param {string} key 
   * @returns {Promise<any>}
   */
  static async get(key) {
    const redis = getRedisClient();
    if (getIsRedisConnected() && redis) {
      try {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data);
      } catch (err) {
        // Fallback to in-memory on redis failure
        return memoryCache.get(key);
      }
    }
    return memoryCache.get(key);
  }

  /**
   * Set value in Cache with TTL (Time To Live in seconds)
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds (Default: 15 minutes)
   */
  static async set(key, value, ttlSeconds = 900) {
    // Always keep in memory for ultra-fast zero-latency lookup
    memoryCache.set(key, value, ttlSeconds);

    const redis = getRedisClient();
    if (getIsRedisConnected() && redis) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        // Ignore redis write error if memory succeeded
      }
    }
  }

  /**
   * Delete key from cache
   * @param {string} key 
   */
  static async del(key) {
    memoryCache.del(key);
    const redis = getRedisClient();
    if (getIsRedisConnected() && redis) {
      try {
        await redis.del(key);
      } catch (err) {}
    }
  }

  /* ------------------- Domain-Specific Caching Helpers ------------------- */

  /**
   * Get cached developer API credentials
   */
  static async getAuth(apiId, apiKey) {
    const key = `auth:creds:${apiId}:${apiKey}`;
    return this.get(key);
  }

  /**
   * Store developer API credentials in Cache (TTL: 15 minutes)
   */
  static async setAuth(apiId, apiKey, credData, ttlSeconds = 900) {
    const key = `auth:creds:${apiId}:${apiKey}`;
    return this.set(key, credData, ttlSeconds);
  }

  /**
   * Invalidate developer API credentials on rotate or revoke
   */
  static async invalidateAuth(apiId, apiKey) {
    const key = `auth:creds:${apiId}:${apiKey}`;
    return this.del(key);
  }

  /**
   * Get cached verification result for ANY service (PAN, Aadhaar, Bank, etc.)
   */
  static async getVerification(serviceType, identifier) {
    const cleanId = String(identifier || '').trim().toUpperCase();
    const key = `verify:${serviceType}:${cleanId}`;
    return this.get(key);
  }

  /**
   * Cache verification result (TTL: 24 Hours for success, 5 Mins for invalid)
   */
  static async setVerification(serviceType, identifier, resultData, ttlSeconds = 86400) {
    const cleanId = String(identifier || '').trim().toUpperCase();
    const key = `verify:${serviceType}:${cleanId}`;
    return this.set(key, resultData, ttlSeconds);
  }

  /**
   * Delete cached verification result
   */
  static async deleteVerification(serviceType, identifier) {
    const cleanId = String(identifier || '').trim().toUpperCase();
    const key = `verify:${serviceType}:${cleanId}`;
    return this.del(key);
  }

  /**
   * Cache Stats and Health
   */
  static getStats() {
    return {
      redisConnected: getIsRedisConnected(),
      memoryKeysCount: memoryCache.size()
    };
  }
}

export default CacheService;
