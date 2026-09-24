import crypto from 'node:crypto';
import { ENV } from '../../core/config/env.config.js';
import CacheService from '../../core/cache/cache.service.js';
import { QueueService } from '../../core/queue/queue.service.js';

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
   * Fetch Geolocation from high-availability backup providers and format to IPStack schema
   */
  static async fetchFallbackIp(targetIp) {
    // 1. Primary Live Fallback: ip-api.com
    try {
      const res = await fetch(
        `http://ip-api.com/json/${targetIp}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'success') {
          const countryCode = (data.countryCode || 'IN').toLowerCase();
          return {
            ip: data.query || targetIp,
            type: (data.query || targetIp).includes(':') ? 'ipv6' : 'ipv4',
            continent_code: 'AS',
            continent_name: 'Asia',
            country_code: data.countryCode || 'IN',
            country_name: data.country || 'India',
            region_code: data.region || '',
            region_name: data.regionName || '',
            city: data.city || '',
            zip: data.zip || '',
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            msa: null,
            dma: null,
            radius: null,
            ip_routing_type: 'fixed',
            connection_type: 'tx',
            location: {
              geoname_id: null,
              capital: '',
              languages: [
                { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
                { code: 'en', name: 'English', native: 'English' },
              ],
              country_flag: `https://assets.ipstack.com/flags/${countryCode}.svg`,
              country_flag_emoji: '',
              country_flag_emoji_unicode: '',
              calling_code: '',
              is_eu: false,
            },
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ [APILAYER FALLBACK 1] ip-api error:', err.message);
    }

    // 2. Secondary Live Fallback: freeipapi.com
    try {
      const res = await fetch(`https://freeipapi.com/api/json/${targetIp}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ipAddress) {
          const countryCode = (data.countryCode || 'IN').toLowerCase();
          return {
            ip: data.ipAddress || targetIp,
            type: data.ipVersion === 6 ? 'ipv6' : 'ipv4',
            continent_code: data.continentCode || 'AS',
            continent_name: data.continent || 'Asia',
            country_code: data.countryCode || 'IN',
            country_name: data.countryName || 'India',
            region_code: data.regionCode || '',
            region_name: data.regionName || '',
            city: data.cityName || '',
            zip: data.zipCode || '',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            msa: null,
            dma: null,
            radius: null,
            ip_routing_type: 'fixed',
            connection_type: 'tx',
            location: {
              capital: data.capital || '',
              languages: [
                { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
                { code: 'en', name: 'English', native: 'English' },
              ],
              country_flag: `https://assets.ipstack.com/flags/${countryCode}.svg`,
              country_flag_emoji: '',
              country_flag_emoji_unicode: '',
              calling_code: String(data.phoneCodes?.[0] || ''),
              is_eu: false,
            },
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ [APILAYER FALLBACK 2] freeipapi error:', err.message);
    }

    // No hardcoded mock fallback: throw real upstream error
    const error = new Error(`Unable to resolve IP geolocation for ${targetIp}: Upstream providers unavailable`);
    error.statusCode = 502;
    throw error;
  }

  /**
   * Lookup IP Geolocation via APILAYER / IPStack with 99-request Key Rotation & Live Fallback
   * @param {string} ip - Target IP address or 'check'
   * @param {object|null} apiClient - Authenticated API Client from middleware
   * @param {string} endpoint - Invoked route endpoint path
   */
  static async lookupIp(ip, apiClient = null, endpoint = '/check') {
    const startTime = Date.now();
    let targetIp = String(ip || '').trim();

    if (!targetIp) {
      const error = new Error('Target IP address is required (e.g. 103.234.186.75 or 8.8.8.8)');
      error.statusCode = 400;
      throw error;
    }

    // 1. Check Redis Cache first (<2ms)
    try {
      const cached = await CacheService.getVerification('apilayer', targetIp);
      if (cached) {
        const durationMs = Date.now() - startTime;
        console.log(`⚡ [APILAYER CACHE HIT] Returned from Cache in ${durationMs}ms for IP=${targetIp}`);

        // Record Audit & Deduct Wallet if authenticated client
        if (apiClient?.user_id) {
          const hitCost = typeof apiClient.effective_price === 'number' ? apiClient.effective_price : 0.18;
          const requestId = `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          QueueService.addAuditJob({
            userId: apiClient.user_id,
            credentialId: apiClient.credential_id,
            endpoint: endpoint || '/check',
            method: 'GET',
            requestId,
            clientRefNum: null,
            statusCode: 200,
            resultCode: 101,
            durationMs,
            clientIp: apiClient.client_ip || targetIp,
            cost: hitCost,
            environment: apiClient.environment || 'production',
            isSuccess: true,
          }).catch((err) => console.error('⚠️ [APILAYER AUDIT JOB ERROR]:', err.message));
        }

        return cached;
      }
    } catch {
      // cache miss / redis fallback
    }

    // 2. Determine active key via 99-request rotation rule
    const baseUrl = (ENV.APILAYER.BASE_URL || 'http://api.ipstack.com').replace(/\/+$/, '');
    const activeKeyInfo = await this.getActiveApiKey();

    console.log(
      `🔑 [APILAYER KEY ROTATION] Active: ${activeKeyInfo.label} (${activeKeyInfo.key?.slice(0, 6)}...${activeKeyInfo.key?.slice(-4)}) | Request ${activeKeyInfo.currentKeyHits}/${activeKeyInfo.threshold} (Total Requests: ${activeKeyInfo.totalHits})`
    );

    let data = null;

    try {
      let upstreamUrl = `${baseUrl}/${targetIp}?access_key=${activeKeyInfo.key}`;
      console.log(`📡 [APILAYER UPSTREAM] Fetching IP Geolocation: ${baseUrl}/${targetIp} using ${activeKeyInfo.label}`);

      let res = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      });

      data = await res.json();

      // 3. Auto-Failover: If active key hits usage limit / rate limit, switch to next key
      if (data?.error && (data.error.code === 104 || data.error.type === 'usage_limit_reached' || res.status === 429)) {
        const fallbackKeyInfo = this.getNextApiKey(activeKeyInfo.index);
        console.warn(
          `⚠️ [APILAYER FAILOVER] ${activeKeyInfo.label} limit reached (${data.error.info || 'Usage limit'}). Switching immediately to ${fallbackKeyInfo.label} (${fallbackKeyInfo.key?.slice(0, 6)}...)...`
        );

        upstreamUrl = `${baseUrl}/${targetIp}?access_key=${fallbackKeyInfo.key}`;
        res = await fetch(upstreamUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(4000),
        });
        data = await res.json();
      }
    } catch (fetchErr) {
      console.warn(`⚠️ [APILAYER ERROR] IPStack upstream request failed: ${fetchErr.message}`);
    }

    // 4. If all IPStack keys fail or have exceeded quota (Code 104 / Rate Limit), use Resilient Fallback
    if (!data || data.error || !data.ip) {
      console.warn(
        `🛡️ [APILAYER BACKUP ACTIVE] Upstream IPStack quota exhausted (${data?.error?.info || 'Quota limit'}). Using Resilient Live Geolocation Engine.`
      );
      data = await this.fetchFallbackIp(targetIp);
    } else {
      console.log(`📥 [APILAYER RESPONSE] Upstream succeeded:`, JSON.stringify(data, null, 2));
    }

    // 5. Increment hit counter
    await this.incrementHitCount();

    // 6. Cache valid response in Redis for 24 hours
    if (data && data.ip && !data.error) {
      try {
        await CacheService.setVerification('apilayer', targetIp, data, 86400);
      } catch {
        // ignore cache write error
      }
    }

    // 7. Audit Logging & Wallet Settlement
    const durationMs = Date.now() - startTime;
    if (apiClient?.user_id) {
      const hitCost = typeof apiClient.effective_price === 'number' ? apiClient.effective_price : 0.18;
      const requestId = `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint: endpoint || '/check',
        method: 'GET',
        requestId,
        clientRefNum: null,
        statusCode: 200,
        resultCode: 101,
        durationMs,
        clientIp: apiClient.client_ip || targetIp,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess: true,
      }).catch((err) => console.error('⚠️ [APILAYER AUDIT JOB ERROR]:', err.message));
    }

    return data;
  }
}

export default ApiLayerService;
