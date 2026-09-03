/**
 * Central API Pricing Configuration
 * Configurable price in INR (₹) per API endpoint.
 * When the admin panel is connected, this can be synced dynamically.
 */
export const API_PRICING = {
  '/srv2/validation/pan': 2.00,
  '/srv3/verification/aadhar': 2.00,
  '/idfc/beneficiary': 2.00,
  '/srv4/credit-report/prefill': 2.00,
  '/srv2/mobile-name-finder': 5.00,
  '/kyc/mobile-name-finder': 5.00,
  '/srv3/uan-mobile': 5.00,
  '/uan-mobile': 5.00,
  '/validate_bank_account': 2.00,
  default: 2.00,
};

/**
 * Returns the configured price for a given endpoint
 * @param {string} endpoint - API route path
 * @returns {number} Price in INR
 */
export const getApiPrice = (endpoint) => {
  if (!endpoint) return API_PRICING.default;
  const cleanEndpoint = endpoint.trim().toLowerCase();
  return API_PRICING[cleanEndpoint] ?? API_PRICING.default;
};

export default {
  API_PRICING,
  getApiPrice,
};
