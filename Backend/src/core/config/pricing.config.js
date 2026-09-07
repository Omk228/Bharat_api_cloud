/**
 * Central API Pricing Configuration
 * Configurable price in INR (₹) per API endpoint.
 * When the admin panel is connected, this can be synced dynamically.
 */
export const API_PRICING = {
  '/srv2/validation/pan': 2.00,
  '/srv2/validation/pan/plus': 2.00,
  '/pan/plus': 2.00,
  '/srv3/verification/aadhar': 2.00,
  '/idfc/beneficiary': 2.00,
  '/srv4/credit-report/prefill': 2.00,
  '/srv2/mobile-name-finder': 5.00,
  '/kyc/mobile-name-finder': 5.00,
  '/srv3/uan-mobile': 5.00,
  '/uan-mobile': 5.00,
  '/srv3/uan-direct': 5.00,
  '/uan-direct': 5.00,
  '/srv2/mobile-upi-lookup/enhanced': 2.00,
  '/srv2/mobile-upi-lookup': 2.00,
  '/validate_bank_account': 2.00,
  '/dosvak/domain-age': 2.00,
  '/domain-age': 2.00,
  '/srv2/digital-kyc/aadhar/auto-verificationspecial': 2.00,
  '/srv2/digital-kyc/aadhar/auto-verification': 2.00,
  '/digital-kyc/aadhar/auto-verificationspecial': 2.00,
  '/srv2/validation/digilocker-digital-kyc': 2.00,
  '/digilocker-digital-kyc': 2.00,
  '/digilocker/generate-token': 2.00,
  '/ifsc': 1.00,
  '/:ifsc': 1.00,
  '/bank/ifsc': 1.00,
  default: 2.00,
};

/**
 * Returns the configured price for a given endpoint (synchronous legacy fallback)
 * @param {string} endpoint - API route path
 * @returns {number} Price in INR
 */
export const getApiPrice = (endpoint) => {
  if (!endpoint) return API_PRICING.default;
  const cleanEndpoint = endpoint.trim().toLowerCase();
  return API_PRICING[cleanEndpoint] ?? API_PRICING.default;
};

/**
 * Returns dynamic effective price for an endpoint and user (checks MySQL catalog & user_api_pricing)
 * @param {string} endpoint - API route path or service key
 * @param {number|null} [userId=null] - User ID
 * @returns {Promise<number>} Price in INR
 */
export const getEffectiveApiPrice = async (endpoint, userId = null) => {
  try {
    const { PricingService } = await import('../../modules/pricing/pricing.service.js');
    return await PricingService.getEffectivePrice(endpoint, userId);
  } catch (err) {
    return getApiPrice(endpoint);
  }
};

export default {
  API_PRICING,
  getApiPrice,
  getEffectiveApiPrice,
};

