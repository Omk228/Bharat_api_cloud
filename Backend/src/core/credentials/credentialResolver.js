import { dbPool } from '../config/db.config.js';
import { ENV } from '../config/env.config.js';

class CredentialResolver {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 30000; // 30 seconds cache
    this.lastFetchedAt = 0;
  }

  /**
   * Invalidate in-memory cache to force immediate DB reload on next call
   */
  invalidateCache() {
    this.cache.clear();
    this.lastFetchedAt = 0;
  }

  /**
   * Load all upstream credentials from MySQL into cache
   */
  async loadAllCredentials() {
    const now = Date.now();
    if (this.cache.size > 0 && now - this.lastFetchedAt < this.cacheTtlMs) {
      return;
    }

    try {
      const [rows] = await dbPool.query('SELECT * FROM upstream_credentials WHERE is_active = 1');
      this.cache.clear();
      for (const row of rows || []) {
        let extra = {};
        try {
          extra = typeof row.extra_headers === 'string' ? JSON.parse(row.extra_headers) : (row.extra_headers || {});
        } catch (e) {}

        this.cache.set(row.id, {
          id: row.id,
          providerName: row.provider_name,
          category: row.category,
          baseUrl: row.base_url,
          apiId: row.api_id || '',
          apiKey: row.api_key || '',
          tokenId: row.token_id || '',
          extraHeaders: extra,
          environment: row.environment,
          updatedAt: row.updated_at,
        });
      }
      this.lastFetchedAt = now;
    } catch (err) {
      console.warn('[CredentialResolver] Warning loading upstream credentials from DB:', err.message);
    }
  }

  /**
   * Get upstream credentials for IDSPay (used for PAN, Statement Analyzer, Aadhaar, Bank, Mobile to Bank, UPI, etc.)
   */
  async getIdspayCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('idspay_master');

    return {
      baseUrl: cred?.baseUrl || ENV.IDSPAY.PROD_BASE_URL,
      apiId: cred?.apiId || ENV.IDSPAY.PROD_API_ID,
      apiKey: cred?.apiKey || ENV.IDSPAY.PROD_API_KEY,
      tokenId: cred?.tokenId || ENV.IDSPAY.PROD_TOKEN_ID,
    };
  }

  /**
   * Get upstream credentials for IDFY Gateway
   */
  async getIdfyCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('idfy_master');

    return {
      baseUrl: cred?.baseUrl || ENV.IDFY.BASE_URL,
      accountId: cred?.apiId || cred?.extraHeaders?.account_id || ENV.IDFY.ACCOUNT_ID,
      apiKey: cred?.apiKey || ENV.IDFY.API_KEY,
    };
  }

  /**
   * Get upstream credentials for APILayer IP Lookup
   */
  async getApilayerCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('apilayer_master');

    const primaryKey = cred?.apiKey || ENV.APILAYER.API_KEY;
    const secondaryKey = cred?.tokenId || cred?.extraHeaders?.secondary_key || ENV.APILAYER.API_KEY_2;

    return {
      baseUrl: cred?.baseUrl || ENV.APILAYER.BASE_URL,
      apiKey: primaryKey,
      apiKey2: secondaryKey,
      keys: [primaryKey, secondaryKey].filter(Boolean),
    };
  }

  /**
   * Get upstream credentials for ApyHub
   */
  async getApyhubCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('apyhub_master');

    return {
      baseUrl: cred?.baseUrl || ENV.APYHUB.BASE_URL,
      apiToken: cred?.apiKey || ENV.APYHUB.API_TOKEN,
    };
  }

  /**
   * Get upstream credentials for Razorpay Public IFSC
   */
  async getRazorpayCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('razorpay_master');

    return {
      baseUrl: cred?.baseUrl || ENV.RAZORPAY_IFSC.BASE_URL,
    };
  }

  /**
   * Get upstream credentials for Work Email / Corporate Email Verifier (Standard)
   */
  async getWorkEmailCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('work_email_master');

    return {
      baseUrl: cred?.baseUrl || ENV.WORK_EMAIL.BASE_URL,
      clientId: cred?.apiId || ENV.WORK_EMAIL.CLIENT_ID,
      apiKey: cred?.apiKey || ENV.WORK_EMAIL.API_KEY,
    };
  }

  /**
   * Get upstream credentials for Work Email Verifier Plus (WAY2API)
   */
  async getWorkEmailPlusCredentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('way2api_email_master') || this.cache.get('work_email_plus_master');

    return {
      baseUrl: cred?.baseUrl || ENV.WORK_EMAIL_PLUS.BASE_URL,
      apiKey: cred?.apiKey || ENV.WORK_EMAIL_PLUS.API_KEY,
    };
  }

  /**
   * Get upstream credentials for Bank Account Validation V2 (WAY2API)
   */
  async getBankValidationV2Credentials() {
    await this.loadAllCredentials();
    const cred = this.cache.get('way2api_bank_master') || this.cache.get('bank_v2_master') || this.cache.get('way2api_email_master');

    return {
      baseUrl: cred?.baseUrl || ENV.BANK_VALIDATION_V2.BASE_URL,
      apiKey: cred?.apiKey || ENV.BANK_VALIDATION_V2.API_KEY,
    };
  }

  /**
   * Generic get by provider ID
   */
  async getProviderCredentials(providerId) {
    await this.loadAllCredentials();
    return this.cache.get(providerId) || null;
  }
}

export const credentialResolver = new CredentialResolver();
export default credentialResolver;
