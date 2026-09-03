import { ENV } from '../../core/config/env.config.js';
import CacheService from '../../core/cache/cache.service.js';

// In-memory RAM counter fallback (persists in process memory)
let memoryHitCount = 0;
const REDIS_KEY_HIT_COUNT = 'apilayer:rotation:hit_count';

export class ApiLayerService {
  /**
   * Check if IP is localhost or private loopback
   */
  static isLocalOrPrivateIp(ip) {
    if (!ip) return true;
    const clean = String(ip).trim().toLowerCase();
    return (
      clean === '::1' ||
      clean === '127.0.0.1' ||
      clean === 'localhost' ||
      clean === '::ffff:127.0.0.1' ||
      clean.startsWith('10.') ||
      clean.startsWith('192.168.') ||
      clean.startsWith('172.16.')
    );
  }

  /**
   * Get total request hit count from Redis or Memory
   */
  static async getHitCount() {
    try {
      const val = await CacheService.get(REDIS_KEY_HIT_COUNT);
      if (val !== null && val !== undefined) {
        return parseInt(val, 10) || 0;
      }
    } catch {
      // Redis error, fallback to memory
    }
    return memoryHitCount;
  }

  /**
   * Increment request hit count in Redis and Memory
   */
  static async incrementHitCount() {
    memoryHitCount++;
    try {
      const current = await this.getHitCount();
      const updated = current + 1;
      await CacheService.set(REDIS_KEY_HIT_COUNT, updated, 86400 * 30); // 30 days retention
      return updated;
    } catch {
      return memoryHitCount;
    }
  }

  /**
   * Get Active API Key based on 99-request rotation rule
   * - Hits 0 to 98 (first 99 requests): Key A
   * - Hits 99 to 197 (next 99 requests): Key B
   * - Cycles smoothly every 99 requests across configured keys
   */
  static async getActiveApiKey() {
    const keys =
      ENV.APILAYER.KEYS && ENV.APILAYER.KEYS.length > 0
        ? ENV.APILAYER.KEYS
        : [ENV.APILAYER.API_KEY, ENV.APILAYER.API_KEY_2].filter(Boolean);

    if (keys.length <= 1) {
      return { key: keys[0], index: 0, currentKeyHits: 1, threshold: 99, totalHits: 0, label: 'Key A' };
    }

    const threshold = ENV.APILAYER.ROTATION_THRESHOLD || 99;
    const totalHits = await this.getHitCount();

    const keyIndex = Math.floor(totalHits / threshold) % keys.length;
    const currentKeyHits = (totalHits % threshold) + 1; // 1 to 99
    const label = keyIndex === 0 ? 'Key A' : 'Key B';

    return {
      key: keys[keyIndex],
      index: keyIndex,
      currentKeyHits,
      threshold,
      totalHits,
      label,
    };
  }

  /**
   * Get the alternate key for failover
   */
  static getNextApiKey(currentIndex) {
    const keys =
      ENV.APILAYER.KEYS && ENV.APILAYER.KEYS.length > 0
        ? ENV.APILAYER.KEYS
        : [ENV.APILAYER.API_KEY, ENV.APILAYER.API_KEY_2].filter(Boolean);

    const nextIndex = (currentIndex + 1) % keys.length;
    return {
      key: keys[nextIndex],
      index: nextIndex,
      label: nextIndex === 0 ? 'Key A' : 'Key B',
    };
  }

  /**
   * Lookup IP Geolocation via APILAYER with 99-request Key Rotation
   * @param {string} ip - Target IP address or 'check'
   */
  static async lookupIp(ip) {
    const startTime = Date.now();
    let targetIp = String(ip || '').trim();

    // Default to the requested user IP if testing on localhost or empty
    if (!targetIp || this.isLocalOrPrivateIp(targetIp)) {
      targetIp = '182.156.19.94';
    }

    // 1. Check Redis Cache first (<2ms)
    try {
      const cached = await CacheService.getVerification('apilayer', targetIp);
      if (cached) {
        console.log(`⚡ [APILAYER CACHE HIT] Returned from Cache in ${Date.now() - startTime}ms for IP=${targetIp}`);
        return cached;
      }
    } catch {
      // cache miss / redis fallback
    }

    // 2. Determine active key via 99-request rotation rule
    const baseUrl = ENV.APILAYER.BASE_URL.replace(/\/+$/, '');
    const activeKeyInfo = await this.getActiveApiKey();

    console.log(
      `🔑 [APILAYER KEY ROTATION] Active: ${activeKeyInfo.label} (${activeKeyInfo.key.slice(0, 6)}...${activeKeyInfo.key.slice(-4)}) | Request ${activeKeyInfo.currentKeyHits}/${activeKeyInfo.threshold} (Total Requests: ${activeKeyInfo.totalHits})`
    );

    let upstreamUrl = `${baseUrl}/${targetIp}?access_key=${activeKeyInfo.key}`;
    console.log(`📡 [APILAYER UPSTREAM] Fetching IP Geolocation: ${baseUrl}/${targetIp} using ${activeKeyInfo.label}`);

    let res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    let data = await res.json();

    // 3. Auto-Failover: If active key hits usage limit / rate limit, switch to next key
    if (data?.error && (data.error.code === 104 || data.error.type === 'usage_limit_reached' || res.status === 429)) {
      const fallbackKeyInfo = this.getNextApiKey(activeKeyInfo.index);
      console.warn(
        `⚠️ [APILAYER FAILOVER] ${activeKeyInfo.label} limit reached (${data.error.info || 'Usage limit'}). Switching immediately to ${fallbackKeyInfo.label} (${fallbackKeyInfo.key.slice(0, 6)}...)...`
      );

      upstreamUrl = `${baseUrl}/${targetIp}?access_key=${fallbackKeyInfo.key}`;
      res = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      data = await res.json();
    }

    console.log(`📥 [APILAYER RESPONSE] Status ${res.status}:`, JSON.stringify(data, null, 2));

    // 4. Increment hit counter upon successful upstream request
    await this.incrementHitCount();

    // 5. Cache valid response in Redis for 24 hours
    if (data && data.ip && !data.error) {
      try {
        await CacheService.setVerification('apilayer', targetIp, data, 86400);
      } catch {
        // ignore cache write error
      }
    }

    return data;
  }
}

export default ApiLayerService;
