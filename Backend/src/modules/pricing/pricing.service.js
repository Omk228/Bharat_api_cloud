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

  // DigiLocker Digital KYC
  '/srv2/validation/digilocker-digital-kyc': ['api_digilocker_digital_kyc', '/srv2/validation/digilocker-digital-kyc'],
  '/digilocker-digital-kyc': ['api_digilocker_digital_kyc', '/srv2/validation/digilocker-digital-kyc'],
  '/digilocker/generate-token': ['api_digilocker_digital_kyc', '/srv2/validation/digilocker-digital-kyc'],
  'digilocker': ['api_digilocker_digital_kyc', '/srv2/validation/digilocker-digital-kyc'],
  'digilocker_digital_kyc': ['api_digilocker_digital_kyc', '/srv2/validation/digilocker-digital-kyc'],

  // IP Lookup
  '/check': ['api_requester_ip_lookup', '/check'],
  '/ip': ['api_requester_ip_lookup', '/check'],
  'ip_lookup': ['api_requester_ip_lookup', '/check'],

  // Reverse Geocode
  '/reverse': ['api_reverse_geocoding', '/reverse'],
  '/reverse-geocode': ['api_reverse_geocoding', '/reverse'],
  '/geocode': ['api_reverse_geocoding', '/reverse'],
  'reverse_geocode': ['api_reverse_geocoding', '/reverse'],

  // TransUnion CIBIL Hybrid
  '/srv5/transunion-Score-Hybrid': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],
  '/api/v1/srv5/transunion-Score-Hybrid': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],
  '/transunion-Score-Hybrid': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],
  '/reports/cibil': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],
  '/api/v1/reports/cibil': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],
  'transunion': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],
  'cibil': ['api_transunion_cibil_v5', '/srv5/transunion-Score-Hybrid'],

  // Statement Analyzer
  '/statement-analyzer': ['api_bank_statement', '/bank/statement/analyse'],
  '/srv2/statement-analyzer': ['api_bank_statement', '/bank/statement/analyse'],
  '/statement-upload': ['api_bank_statement', '/bank/statement/analyse'],
  '/srv2/statement-upload': ['api_bank_statement', '/bank/statement/analyse'],
  '/bank/statement/analyse': ['api_bank_statement', '/bank/statement/analyse'],
  'statement_analyzer': ['api_bank_statement', '/bank/statement/analyse'],
};

// UI Service Keys to Catalog IDs
export const SERVICE_KEY_TO_CATALOG_ID = {
  pan: 'api_cat_03',
  pan_plus: 'api_verify_pan_plus',
  aadhaar: 'api_aadhaar_without_otp',
  digilocker: 'api_digilocker_digital_kyc',
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
  mobile_to_bank: 'api_mobile_to_bank_advance',
  transunion: 'api_transunion_cibil_v5',
};

export const GST_RATE = 0.18;

export class PricingService {
  /**
   * Get effective price for an endpoint/service and specific user
   * Looks up user_api_pricing table first. If custom_price assigned, returns custom_price + 18% GST.
   * Otherwise falls back to catalog.current_price + 18% GST, then API_PRICING fallback + 18% GST.
   *
   * @param {string} endpoint - API route path or service key (e.g. '/srv2/validation/pan' or 'pan')
   * @param {number|null} [userId=null] - Authenticated user ID
   * @returns {Promise<number>} Effective price in INR (Base Price + 18% GST)
   */
  static async getEffectivePrice(endpoint, userId = null) {
    if (!endpoint) return 2.36;

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

      let basePrice;
      if (rows && rows.length > 0 && rows[0].effective_price != null) {
        basePrice = parseFloat(rows[0].effective_price);
      } else {
        // Fallback to static pricing map
        basePrice = API_PRICING[cleanEndpoint] ?? API_PRICING.default ?? 2.00;
      }

      if (Number.isNaN(basePrice)) {
        basePrice = 2.00;
      }

      // Add 18% GST (e.g. ₹1.00 -> ₹1.18, ₹2.00 -> ₹2.36, ₹5.00 -> ₹5.90, ₹75.00 -> ₹88.50)
      const priceWithGst = parseFloat((basePrice * (1 + GST_RATE)).toFixed(2));

      // Cache effective price for 60 seconds
      try {
        await CacheService.set(cacheKey, priceWithGst, 60);
      } catch (err) {}

      return priceWithGst;
    } catch (dbErr) {
      console.error('⚠️ [PricingService] DB query failed, using static fallback:', dbErr.message);
      const fallbackBase = API_PRICING[cleanEndpoint] ?? API_PRICING.default ?? 2.00;
      return parseFloat((fallbackBase * (1 + GST_RATE)).toFixed(2));
    }
  }

  /**
   * Checks whether a user is allowed to access and execute an API endpoint.
   * - If an Admin set `user_api_pricing.is_assigned = 0`, access is REVOKED for this user.
   * - If `catalog.status = 'Disabled'`, access is BLOCKED globally.
   *
   * @param {string} endpoint - API route path or service key (e.g. '/srv2/validation/pan')
   * @param {number|null} [userId=null] - Authenticated user ID
   * @returns {Promise<{ isAllowed: boolean, reason?: string, catalogId?: string }>}
   */
  static async checkApiAccess(endpoint, userId = null) {
    if (!endpoint) return { isAllowed: true };

    const cleanEndpoint = endpoint.trim().toLowerCase().split('?')[0];

    // Determine lookup identifiers
    const lookupIdentifiers = [cleanEndpoint];
    const strippedEndpoint = cleanEndpoint.replace(/^\/api\/v1/, '');
    if (strippedEndpoint && strippedEndpoint !== cleanEndpoint) {
      lookupIdentifiers.push(strippedEndpoint);
    }
    const aliases = ENDPOINT_CATALOG_MAP[cleanEndpoint] || ENDPOINT_CATALOG_MAP[strippedEndpoint];
    if (aliases) {
      lookupIdentifiers.push(...aliases);
    }

    // 1. Try cache if user is authenticated
    const cacheKey = userId ? `access:user:${userId}:${cleanEndpoint}` : `access:default:${cleanEndpoint}`;
    try {
      const cached = await CacheService.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    } catch (err) {}

    try {
      const placeholders = lookupIdentifiers.map(() => '?').join(', ');

      let query;
      let params;

      if (userId) {
        query = `
          SELECT 
            c.id AS catalog_id,
            c.service_name,
            c.status AS catalog_status,
            p.is_assigned
          FROM catalog c
          LEFT JOIN user_api_pricing p 
            ON p.catalog_id = c.id 
            AND p.user_id = ?
          WHERE c.id IN (${placeholders}) 
             OR c.endpoint_path IN (${placeholders})
          ORDER BY p.id DESC
          LIMIT 1;
        `;
        params = [userId, ...lookupIdentifiers, ...lookupIdentifiers];
      } else {
        query = `
          SELECT 
            c.id AS catalog_id,
            c.service_name,
            c.status AS catalog_status,
            1 AS is_assigned
          FROM catalog c
          WHERE c.id IN (${placeholders}) 
             OR c.endpoint_path IN (${placeholders})
          LIMIT 1;
        `;
        params = [...lookupIdentifiers, ...lookupIdentifiers];
      }

      const [rows] = await dbPool.query(query, params);

      let result = { isAllowed: true };

      if (rows && rows.length > 0) {
        const row = rows[0];
        if (row.catalog_status === 'Disabled') {
          result = {
            isAllowed: false,
            reason: `The service '${row.service_name || cleanEndpoint}' is currently disabled for maintenance.`,
            catalogId: row.catalog_id
          };
        } else if (userId && row.is_assigned !== 1) {
          // If is_assigned is 0 or NULL (new user), access is restricted until assigned by Admin
          result = {
            isAllowed: false,
            reason: `Access Denied: This API has not been assigned to your account by the Administrator yet. Please contact the administrator to enable access.`,
            notAssigned: true,
            catalogId: row.catalog_id
          };
        } else {
          result = {
            isAllowed: true,
            catalogId: row.catalog_id
          };
        }
      } else if (userId) {
        // Unmapped or uncataloged endpoint for authenticated user - require assignment
        result = {
          isAllowed: false,
          reason: `Access Denied: This API has not been assigned to your account by the Administrator yet. Please contact the administrator to enable access.`,
          notAssigned: true
        };
      }

      // Cache for 60 seconds
      try {
        await CacheService.set(cacheKey, JSON.stringify(result), 60);
      } catch (err) {}

      return result;
    } catch (error) {
      console.error('⚠️ [PricingService.checkApiAccess] DB error:', error.message);
      return { isAllowed: false, reason: 'Database error verifying API assignment. Please try again.' };
    }
  }

  /**
   * Fetches full pricing map and catalog with effective prices and assignment status for a user
   *
   * @param {number|null} [userId=null] - User ID
   * @returns {Promise<{ pricing: Record<string, number>, assigned: Record<string, boolean>, revoked: string[], catalog: Array<object> }>}
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
            c.status AS catalog_status,
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
            c.status AS catalog_status,
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
        // API is only assigned if is_assigned === 1 (explicitly assigned by admin)
        const isAssigned = userId ? (row.is_assigned === 1 && row.catalog_status !== 'Disabled') : false;
        const basePrice = parseFloat(row.effective_price || row.default_price || 0);
        const effectiveWithGst = parseFloat((basePrice * (1 + GST_RATE)).toFixed(2));
        const item = {
          id: row.id,
          service_name: row.service_name,
          category: row.category,
          method: row.method,
          endpoint_path: row.endpoint_path,
          catalog_status: row.catalog_status,
          default_price: parseFloat(row.default_price || 0),
          custom_price: row.custom_price != null ? parseFloat(row.custom_price) : null,
          base_price: basePrice,
          is_assigned: Boolean(isAssigned),
          effective_price: effectiveWithGst,
          is_custom: Boolean(row.is_assigned === 1 && row.custom_price != null),
        };
        catalogMapById.set(row.id, item);
        return item;
      });

      // Build service key pricing & access maps for Frontend console
      const pricing = {};
      const assigned = {};
      const revoked = [];

      for (const [serviceKey, catalogId] of Object.entries(SERVICE_KEY_TO_CATALOG_ID)) {
        const item = catalogMapById.get(catalogId);
        if (item) {
          pricing[serviceKey] = item.effective_price;
          assigned[serviceKey] = item.is_assigned;
          if (!item.is_assigned) {
            revoked.push(serviceKey);
          }
        } else {
          pricing[serviceKey] = API_PRICING[serviceKey] ?? 2.00;
          assigned[serviceKey] = false;
          revoked.push(serviceKey);
        }
      }

      return {
        pricing,
        assigned,
        revoked,
        catalog: catalogList,
      };
    } catch (error) {
      console.error('❌ [PricingService.getUserPricingMap] Error:', error);
      // Fallback
      const pricing = {};
      const assigned = {};
      const revoked = [];
      for (const key of Object.keys(SERVICE_KEY_TO_CATALOG_ID)) {
        pricing[key] = API_PRICING[key] ?? 2.00;
        assigned[key] = false;
        revoked.push(key);
      }
      return { pricing, assigned, revoked, catalog: [] };
    }
  }

  /**
   * Admin: Assign or unassign an API to a user, with optional custom pricing
   */
  static async assignApi({ userId, catalogId, customPrice = null, isAssigned = 1 }) {
    if (!userId || !catalogId) {
      throw new Error('userId and catalogId are required.');
    }

    const assignedVal = isAssigned ? 1 : 0;
    const priceVal = customPrice !== null && customPrice !== undefined && customPrice !== '' ? parseFloat(customPrice) : null;

    const query = `
      INSERT INTO user_api_pricing (user_id, catalog_id, custom_price, is_assigned, updated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        custom_price = VALUES(custom_price),
        is_assigned = VALUES(is_assigned),
        updated_at = NOW();
    `;

    await dbPool.query(query, [userId, catalogId, priceVal, assignedVal]);

    // Clear caches for this user
    try {
      await CacheService.flushAll?.();
    } catch (e) {}

    return { success: true, userId, catalogId, isAssigned: Boolean(assignedVal), customPrice: priceVal };
  }

  /**
   * Admin: Bulk assign/unassign multiple APIs to a user
   */
  static async bulkAssign({ userId, assignments }) {
    if (!userId || !Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('userId and non-empty assignments array are required.');
    }

    for (const item of assignments) {
      if (item.catalogId || item.catalog_id) {
        const catalogId = item.catalogId || item.catalog_id;
        const isAssigned = item.isAssigned !== undefined ? item.isAssigned : (item.is_assigned !== undefined ? item.is_assigned : 1);
        const customPrice = item.customPrice !== undefined ? item.customPrice : item.custom_price;
        await this.assignApi({ userId, catalogId, customPrice, isAssigned });
      }
    }

    return { success: true, count: assignments.length };
  }
}

export default PricingService;
