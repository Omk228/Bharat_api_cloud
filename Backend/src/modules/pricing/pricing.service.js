import { dbPool } from '../../core/config/db.config.js';
import CacheService from '../../core/cache/cache.service.js';
import { API_PRICING } from '../../core/config/pricing.config.js';

/**
 * Normalizes an endpoint path to match database catalog paths
 * Maps various alias routes and path patterns to canonical catalog paths / catalog IDs
 */
const ENDPOINT_CATALOG_MAP = {
  // PAN
  '/srv2/validation/pan': ['api_cat_03', 'api_verify_pan', '/srv2/validation/pan', '/verify/pan'],
  '/verify/pan': ['api_cat_03', 'api_verify_pan', '/srv2/validation/pan', '/verify/pan'],
  '/validation/pan': ['api_cat_03', 'api_verify_pan', '/srv2/validation/pan'],
  '/pan': ['api_cat_03', 'api_verify_pan', '/srv2/validation/pan'],
  'pan': ['api_cat_03', 'api_verify_pan', '/srv2/validation/pan'],

  // PAN Plus
  '/srv2/validation/pan/plus': ['api_verify_pan_plus', '/srv2/validation/pan/plus'],
  '/validation/pan/plus': ['api_verify_pan_plus', '/srv2/validation/pan/plus'],
  '/pan/plus': ['api_verify_pan_plus', '/srv2/validation/pan/plus'],
  '/verify/pan/plus': ['api_verify_pan_plus', '/srv2/validation/pan/plus'],
  'pan_plus': ['api_verify_pan_plus', '/srv2/validation/pan/plus'],

  // Aadhaar
  '/srv3/verification/aadhar': ['api_aadhaar_without_otp', '/srv3/verification/aadhar'],
  '/verify/aadhaar': ['api_aadhaar_without_otp', '/srv3/verification/aadhar'],
  'aadhaar': ['api_aadhaar_without_otp', '/srv3/verification/aadhar'],

  // Bank Penny Less
  '/idfc/beneficiary': ['api_bank_penny_less', '/bank/verify/penny-less', '/idfc/beneficiary'],
  '/bank/verify/penny-less': ['api_bank_penny_less', '/bank/verify/penny-less'],
  '/srv1/beneficiary': ['api_bank_penny_less', '/bank/verify/penny-less'],
  'bank': ['api_bank_penny_less', '/bank/verify/penny-less'],

  // Bank Account Validation
  '/validate_bank_account': ['api_bank_validation', '/api/v1/validate_bank_account'],
  '/api/v1/validate_bank_account': ['api_bank_validation', '/api/v1/validate_bank_account'],
  '/validate-bank-account': ['api_bank_validation', '/api/v1/validate_bank_account'],
  'bank_validation': ['api_bank_validation', '/api/v1/validate_bank_account'],

  // Mobile to Prefill
  '/srv4/credit-report/prefill': ['api_mobile_to_prefill', '/kyc/mobile-prefill', '/srv4/credit-report/prefill'],
  '/kyc/mobile-prefill': ['api_mobile_to_prefill', '/kyc/mobile-prefill'],
  'prefill': ['api_mobile_to_prefill', '/kyc/mobile-prefill'],

  // Mobile Name Finder
  '/srv2/mobile-name-finder': ['api_mobile_name_finder', '/srv2/mobile-name-finder'],
  '/kyc/mobile-name-finder': ['api_mobile_name_finder', '/srv2/mobile-name-finder'],
  'name_finder': ['api_mobile_name_finder', '/srv2/mobile-name-finder'],

  // Mobile UPI
  '/srv2/mobile-upi-lookup/enhanced': ['api_mobile_to_upi', '/srv2/mobile-upi-lookup/enhanced'],
  '/srv2/mobile-upi-lookup': ['api_mobile_to_upi', '/srv2/mobile-upi-lookup/enhanced'],
  '/pay/upi/validate': ['api_mobile_to_upi', 'api_cat_04'],
  'mobile_upi': ['api_mobile_to_upi', '/srv2/mobile-upi-lookup/enhanced'],

  // Domain Age
  '/dosvak/domain-age': ['api_domain_age', '/dosvak/domain-age'],
  '/domain-age': ['api_domain_age', '/dosvak/domain-age'],
  'domain_age': ['api_domain_age', '/dosvak/domain-age'],

  // IFSC
  '/ifsc': ['api_cat_01', 'api_ifsc_lookup', '/bank/ifsc/:code'],
  '/:ifsc': ['api_cat_01', 'api_ifsc_lookup', '/bank/ifsc/:code'],
  '/bank/ifsc': ['api_cat_01', 'api_ifsc_lookup', '/bank/ifsc/:code'],
  'ifsc': ['api_cat_01', 'api_ifsc_lookup', '/bank/ifsc/:code'],

  // UAN Mobile
  '/srv3/uan-mobile': ['api_mobile_to_uan', '/api/v1/srv3/uan-mobile'],
  '/uan-mobile': ['api_mobile_to_uan', '/api/v1/srv3/uan-mobile'],
  '/api/v1/srv3/uan-mobile': ['api_mobile_to_uan', '/api/v1/srv3/uan-mobile'],
  '/uan': ['api_mobile_to_uan', '/api/v1/srv3/uan-mobile'],
  'uan': ['api_mobile_to_uan', '/api/v1/srv3/uan-mobile'],

  // UAN Direct
  '/srv3/uan-direct': ['api_uan_to_employment', '/api/v1/srv3/uan-direct'],
  '/uan-direct': ['api_uan_to_employment', '/api/v1/srv3/uan-direct'],
  '/api/v1/srv3/uan-direct': ['api_uan_to_employment', '/api/v1/srv3/uan-direct'],
  'uan_direct': ['api_uan_to_employment', '/api/v1/srv3/uan-direct'],

  // IP Lookup
  '/check': ['api_requester_ip_lookup', '/check'],
  '/ip': ['api_requester_ip_lookup', '/check'],
  'ip_lookup': ['api_requester_ip_lookup', '/check'],

  // Reverse Geocode
  '/reverse': ['api_reverse_geocoding', '/reverse'],
  '/reverse-geocode': ['api_reverse_geocoding', '/reverse'],
  '/geocode': ['api_reverse_geocoding', '/reverse'],
  'reverse_geocode': ['api_reverse_geocoding', '/reverse'],
};

// UI Service Keys to Catalog IDs
export const SERVICE_KEY_TO_CATALOG_ID = {
  pan: 'api_cat_03',
  pan_plus: 'api_verify_pan_plus',
  aadhaar: 'api_aadhaar_without_otp',
  bank: 'api_bank_penny_less',
  bank_validation: 'api_bank_validation',
  prefill: 'api_mobile_to_prefill',
  name_finder: 'api_mobile_name_finder',
  mobile_upi: 'api_mobile_to_upi',
  domain_age: 'api_domain_age',
  ifsc: 'api_cat_01',
  uan: 'api_mobile_to_uan',
  uan_direct: 'api_uan_to_employment',
  ip_lookup: 'api_requester_ip_lookup',
  reverse_geocode: 'api_reverse_geocoding',
};

export class PricingService {
  /**
   * Get effective price for an endpoint/service and specific user
   * Looks up user_api_pricing table first. If custom_price assigned, returns custom_price.
   * Otherwise falls back to catalog.current_price, then API_PRICING fallback.
   *
   * @param {string} endpoint - API route path or service key (e.g. '/srv2/validation/pan' or 'pan')
   * @param {number|null} [userId=null] - Authenticated user ID
   * @returns {Promise<number>} Effective price in INR
   */
  static async getEffectivePrice(endpoint, userId = null) {
    if (!endpoint) return 2.00;

    const cleanEndpoint = endpoint.trim().toLowerCase();

    // 1. Try Redis cache if available and user is authenticated
    const cacheKey = userId ? `pricing:user:${userId}:${cleanEndpoint}` : `pricing:default:${cleanEndpoint}`;
    try {
      const cached = await CacheService.get(cacheKey);
      if (cached !== null && cached !== undefined && !Number.isNaN(Number(cached))) {
        return parseFloat(cached);
      }
    } catch (err) {
      // cache miss / redis disabled, proceed to DB
    }

    // 2. Resolve possible catalog identifiers
    const lookupIdentifiers = ENDPOINT_CATALOG_MAP[cleanEndpoint] || [cleanEndpoint];

    try {
      // Build search placeholders
      const placeholders = lookupIdentifiers.map(() => '?').join(', ');
      
      let query;
      let params;

      if (userId) {
        // Query catalog joined with user_api_pricing for this user
        query = `
          SELECT 
            c.id AS catalog_id,
            c.endpoint_path,
            c.current_price AS default_price,
            p.custom_price,
            p.is_assigned,
            CASE 
              WHEN p.is_assigned = 1 AND p.custom_price IS NOT NULL THEN p.custom_price
              ELSE c.current_price
            END AS effective_price
          FROM catalog c
          LEFT JOIN user_api_pricing p 
            ON p.catalog_id = c.id 
            AND p.user_id = ?
            AND p.is_assigned = 1
          WHERE c.id IN (${placeholders}) 
             OR c.endpoint_path IN (${placeholders})
          ORDER BY (p.is_assigned = 1 AND p.custom_price IS NOT NULL) DESC
          LIMIT 1;
        `;
        params = [userId, ...lookupIdentifiers, ...lookupIdentifiers];
      } else {
        // Unauthenticated default catalog price
        query = `
          SELECT 
            c.id AS catalog_id,
            c.endpoint_path,
            c.current_price AS default_price,
            c.current_price AS effective_price
          FROM catalog c
          WHERE c.id IN (${placeholders}) 
             OR c.endpoint_path IN (${placeholders})
          LIMIT 1;
        `;
        params = [...lookupIdentifiers, ...lookupIdentifiers];
      }

      const [rows] = await dbPool.query(query, params);

      let price;
      if (rows && rows.length > 0 && rows[0].effective_price != null) {
        price = parseFloat(rows[0].effective_price);
      } else {
        // Fallback to static pricing map
        price = API_PRICING[cleanEndpoint] ?? API_PRICING.default ?? 2.00;
      }

      if (Number.isNaN(price)) {
        price = 2.00;
      }

      // Cache effective price for 60 seconds
      try {
        await CacheService.set(cacheKey, price, 60);
      } catch (err) {}

      return price;
    } catch (dbErr) {
      console.error('⚠️ [PricingService] DB query failed, using static fallback:', dbErr.message);
      return API_PRICING[cleanEndpoint] ?? API_PRICING.default ?? 2.00;
    }
  }

  /**
   * Fetches full pricing map and catalog with effective prices for a user
   *
   * @param {number|null} [userId=null] - User ID
   * @returns {Promise<{ pricing: Record<string, number>, catalog: Array<object> }>}
   */
  static async getUserPricingMap(userId = null) {
    try {
      let query;
      let params = [];

      if (userId) {
        query = `
          SELECT 
            c.id,
            c.service_name,
            c.category,
            c.method,
            c.endpoint_path,
            c.current_price AS default_price,
            p.custom_price,
            p.is_assigned,
            CASE 
              WHEN p.is_assigned = 1 AND p.custom_price IS NOT NULL THEN p.custom_price
              ELSE c.current_price
            END AS effective_price
          FROM catalog c
          LEFT JOIN user_api_pricing p 
            ON p.catalog_id = c.id 
            AND p.user_id = ?
            AND p.is_assigned = 1
          ORDER BY c.service_name ASC;
        `;
        params = [userId];
      } else {
        query = `
          SELECT 
            c.id,
            c.service_name,
            c.category,
            c.method,
            c.endpoint_path,
            c.current_price AS default_price,
            NULL AS custom_price,
            0 AS is_assigned,
            c.current_price AS effective_price
          FROM catalog c
          ORDER BY c.service_name ASC;
        `;
      }

      const [catalogRows] = await dbPool.query(query, params);

      // Build a catalog lookup by ID and endpoint_path
      const catalogMapById = new Map();
      const catalogList = catalogRows.map((row) => {
        const item = {
          id: row.id,
          service_name: row.service_name,
          category: row.category,
          method: row.method,
          endpoint_path: row.endpoint_path,
          default_price: parseFloat(row.default_price || 0),
          custom_price: row.custom_price != null ? parseFloat(row.custom_price) : null,
          is_assigned: Boolean(row.is_assigned),
          effective_price: parseFloat(row.effective_price || row.default_price || 0),
          is_custom: Boolean(row.is_assigned && row.custom_price != null),
        };
        catalogMapById.set(row.id, item);
        return item;
      });

      // Build service key pricing map for Frontend test-api console
      const pricing = {};
      for (const [serviceKey, catalogId] of Object.entries(SERVICE_KEY_TO_CATALOG_ID)) {
        const item = catalogMapById.get(catalogId);
        if (item) {
          pricing[serviceKey] = item.effective_price;
        } else {
          pricing[serviceKey] = API_PRICING[serviceKey] ?? 2.00;
        }
      }

      return {
        pricing,
        catalog: catalogList,
      };
    } catch (error) {
      console.error('❌ [PricingService.getUserPricingMap] Error:', error);
      // Fallback
      const pricing = {};
      for (const key of Object.keys(SERVICE_KEY_TO_CATALOG_ID)) {
        pricing[key] = API_PRICING[key] ?? 2.00;
      }
      return { pricing, catalog: [] };
    }
  }
}

export default PricingService;
