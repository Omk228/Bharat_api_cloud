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
  '/srv3/mobile-to-bank/advance': 2.00,
  '/mobile-to-bank/advance': 2.00,
  '/validate_bank_account': 2.00,
  '/dosvak/domain-age': 2.00,
  '/domain-age': 2.00,
  '/srv2/digital-kyc/aadhar/auto-verificationspecial': 2.00,
  '/srv2/digital-kyc/aadhar/auto-verification': 2.00,
  '/digital-kyc/aadhar/auto-verificationspecial': 2.00,
  '/srv2/validation/digilocker-digital-kyc': 2.00,
  '/digilocker-digital-kyc': 2.00,
  '/digilocker/generate-token': 2.00,
  '/srv2/statement-upload': 5.00,
  '/srv2/statement-analyzer': 5.00,
  '/statement-upload': 5.00,
  '/statement-analyzer': 5.00,
  '/ifsc': 1.00,
  '/:ifsc': 1.00,
  '/bank/ifsc': 1.00,
  '/check': 0.15,
  '/ip/check': 0.15,
  '/ip/lookup': 0.15,
  '/reverse': 0.20,
  '/reverse-geocode': 0.20,
  '/geocode': 0.20,
  '/srv5/transunion-Score-Hybrid': 15.00,
  '/transunion-Score-Hybrid': 15.00,
  '/crif/Credit-ScoreV4': 25.00,
  '/crif/credit-scorev4': 25.00,
  '/credit-scorev4': 25.00,
  '/api/v1/crif/Credit-ScoreV4': 25.00,
  '/api/v1/verify/work-email': 2.00,
  '/verify/work-email': 2.00,
  '/api/v1/work-email/verify': 2.00,
  '/work-email/verify': 2.00,
  '/api/v1/corporate-email/verify': 2.00,
  '/corporate-email/verify': 2.00,
  '/api/v1/corp-email/verify': 2.00,
  '/corp-email/verify': 2.00,
  '/api/v1/email/verify': 2.00,
  '/email/verify': 2.00,
  '/api/v1/verify/work-email-plus': 2.00,
  '/verify/work-email-plus': 2.00,
  '/api/v1/work-email-plus/verify': 2.00,
  '/work-email-plus/verify': 2.00,
  '/api/v1/verify/work-email/plus': 2.00,
  '/verify/work-email/plus': 2.00,
  '/api/v1/email-verifier-plus': 2.00,
  '/email-verifier-plus': 2.00,
  'work_email_plus': 2.00,
  '/api/v1/bank/account-validation': 2.00,
  '/api/v1/bank/account_validation': 2.00,
  '/bank/account_validation': 2.00,
  '/bank/account-validation': 2.00,
  '/api/v1/verify/bank-v2': 2.00,
  '/verify/bank-v2': 2.00,
  'bank_v2': 2.00,
  '/api/v1/verify/operator-circle': 2.00,
  '/verify/operator-circle': 2.00,
  '/api/v1/verify/mobile-operator': 2.00,
  '/verify/mobile-operator': 2.00,
  '/api/v1/operator-circle/check': 2.00,
  '/operator-circle/check': 2.00,
  '/api/v1/mobile-operator/check': 2.00,
  '/mobile-operator/check': 2.00,
  'mobile_operator': 2.00,
  'mobile_operator_check': 2.00,
  'operator_circle': 2.00,
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

