import { ENV } from '../../core/config/env.config.js';
import CacheService from '../../core/cache/cache.service.js';

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
   * Lookup IP Geolocation via APILAYER
   * @param {string} ip - Target IP address or 'check'
   */
  static async lookupIp(ip) {
    const startTime = Date.now();
    let targetIp = String(ip || '').trim();

    // Default to the requested user IP if testing on localhost or empty
    if (!targetIp || this.isLocalOrPrivateIp(targetIp)) {
      targetIp = '182.156.19.94';
    }

    const cacheKey = `apilayer:ip:${targetIp}`;

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

    // 2. Fetch from APILAYER upstream
    const baseUrl = ENV.APILAYER.BASE_URL.replace(/\/+$/, '');
    const apiKey = ENV.APILAYER.API_KEY;
    const upstreamUrl = `${baseUrl}/${targetIp}?access_key=${apiKey}`;

    console.log(`📡 [APILAYER UPSTREAM] Fetching IP Geolocation: ${baseUrl}/${targetIp}`);

    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    console.log(`📥 [APILAYER RESPONSE] Status ${res.status}:`, JSON.stringify(data, null, 2));

    // 3. Cache valid response in Redis for 24 hours
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
