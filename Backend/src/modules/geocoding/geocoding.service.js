import { ENV } from '../../core/config/env.config.js';
import CacheService from '../../core/cache/cache.service.js';

export class GeocodingService {
  /**
   * Reverse Geocode coordinates into address & place details via OpenStreetMap Nominatim
   * @param {number|string} latitude - Latitude (-90 to 90)
   * @param {number|string} longitude - Longitude (-180 to 180)
   * @returns {Promise<Record<string, unknown>>}
   */
  static async reverseGeocode(latitude, longitude) {
    const startTime = Date.now();

    // Default to Delhi (Kartavya Path) if missing
    let lat = latitude !== undefined && latitude !== null && latitude !== ''
      ? parseFloat(latitude)
      : 28.6139;

    let lon = longitude !== undefined && longitude !== null && longitude !== ''
      ? parseFloat(longitude)
      : 77.2090;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      const error = new Error('Invalid latitude: must be a number between -90 and 90');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      const error = new Error('Invalid longitude: must be a number between -180 and 180');
      error.statusCode = 400;
      throw error;
    }

    // Format coordinates to 6 decimal places for cache key consistency
    const latStr = lat.toFixed(6);
    const lonStr = lon.toFixed(6);
    const cacheKey = `${latStr}:${lonStr}`;

    // 1. Check Redis Cache first (<2ms)
    try {
      const cached = await CacheService.getVerification('geocoding', cacheKey);
      if (cached) {
        console.log(`⚡ [GEOCODING CACHE HIT] Returned in ${Date.now() - startTime}ms for Lat=${latStr}, Lon=${lonStr}`);
        return cached;
      }
    } catch {
      // cache miss / redis fallback
    }

    // 2. Query Nominatim Upstream
    const baseUrl = ENV.NOMINATIM.BASE_URL.replace(/\/+$/, '');
    const upstreamUrl = `${baseUrl}/reverse?lat=${latStr}&lon=${lonStr}&format=json`;

    console.log(`📡 [NOMINATIM UPSTREAM] Fetching Reverse Geocoding: ${upstreamUrl}`);

    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'BharatApiCloud/1.0 (contact@bharatapicloud.in)',
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    console.log(`📥 [NOMINATIM RESPONSE] Status ${res.status}:`, JSON.stringify(data, null, 2));

    // 3. Cache valid response in Redis for 24 hours (86400s)
    if (data && !data.error) {
      try {
        await CacheService.setVerification('geocoding', cacheKey, data, 86400);
      } catch {
        // ignore cache write error
      }
    }

    return data;
  }
}

export default GeocodingService;
