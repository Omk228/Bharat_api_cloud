import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class MobileIntelligenceService {
  /**
   * Validate Indian Mobile Number (10 digits starting with 6-9, or 12 digits with 91 prefix)
   */
  static isValidMobileNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean) || /^91[6-9]\d{9}$/.test(clean);
  }

  /**
   * Normalize phone number for WhoCalled query (with 91 prefix)
   */
  static normalizePhoneNumber(phone) {
    const clean = String(phone || '').trim().replace(/\D/g, '');
    if (clean.length === 10) {
      return `91${clean}`;
    }
    return clean;
  }

  /**
   * Perform Mobile Intelligence Search
   */
  static async searchMobileIntelligence({
    phone,
    mobile,
    query,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/mobile-intelligence',
  }) {
    const startTime = Date.now();
    const rawInput = String(phone || mobile || query || '').trim();
    const cleanDigits = rawInput.replace(/\D/g, '');
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `MOB_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!rawInput) {
      throw ApiError.badRequest('Missing required parameter: phone (or mobile) is mandatory.');
    }

    if (!this.isValidMobileNumber(cleanDigits)) {
      throw ApiError.badRequest(`Invalid phone number format: "${rawInput}". Please provide a valid 10-digit Indian mobile number.`);
    }

    const normalizedQuery = this.normalizePhoneNumber(cleanDigits);
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check for authenticated API clients
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 1. Check Smart Result Cache first (<1ms)
    const cachedResult = await CacheService.getVerification('mobile_intelligence', normalizedQuery);
    if (cachedResult && cachedResult.status) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [MOBILE INTELLIGENCE CACHE HIT] Returned from Cache in ${durationMs}ms: query=${normalizedQuery}`);

      const cachedResponse = {
        ...cachedResult,
        http_response_code: 200,
        result_code: 101,
        request_id: requestId,
        client_ref_num: clientRef,
      };

      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'POST',
          requestId,
          clientRefNum: clientRef,
          statusCode: 200,
          resultCode: 101,
          durationMs,
          clientIp: apiClient.client_ip,
          cost: hitCost,
          environment: apiClient.environment || 'production',
          isSuccess: true,
        }).catch((err) => {
          console.error('Queue dispatch error on mobile intelligence cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 2. Resolve Upstream Credentials (WhoCalled)
    const creds = await credentialResolver.getMobileIntelligenceCredentials();
    const upstreamBase = creds.baseUrl || 'https://whocalled.ddns.net/api/search';
    const apiKey = creds.apiKey || 'wc_live_90b6ec2ea00cd92da7422dcd9bc306b5';
    const timeoutMs = creds.timeoutMs || 20000;

    let responseJson = null;

    try {
      const separator = upstreamBase.includes('?') ? '&' : '?';
      const targetUrl = `${upstreamBase}${separator}query=${encodeURIComponent(normalizedQuery)}&api_key=${encodeURIComponent(apiKey)}`;

      console.log(`📡 [MOBILE INTELLIGENCE PROXY] Calling WhoCalled Gateway: ${upstreamBase} for ${normalizedQuery}`);

      const upstreamRes = await upstreamFetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BharatAPICloud/1.0',
        },
        timeout: timeoutMs,
      });

      const responseText = await upstreamRes.text();

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [MOBILE INTELLIGENCE PARSE WARNING] Upstream returned non-JSON: ${responseText.slice(0, 200)}`);
        throw new Error(`Upstream returned non-JSON response with HTTP ${upstreamRes.status}`);
      }

      if (responseJson && isUpstreamLowBalance(responseJson)) {
        console.warn('⚠️ [UPSTREAM ALERT] Upstream provider returned low balance error during Mobile Intelligence search.');
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      if (!upstreamRes.ok && responseJson && responseJson.detail) {
        throw new Error(responseJson.detail || `Upstream returned status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [MOBILE INTELLIGENCE UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      const durationMs = Date.now() - startTime;

      const errorResponse = {
        status: 'error',
        status_message: 'failed',
        http_response_code: 502,
        result_code: 102,
        request_id: requestId,
        client_ref_num: clientRef,
        message: upstreamErr.message || 'Upstream mobile intelligence service temporarily unavailable.',
        error: upstreamErr.message,
        data: null,
        result: null,
      };

      if (apiClient?.user_id) {
        QueueService.addAuditJob({
          userId: apiClient.user_id,
          credentialId: apiClient.credential_id,
          endpoint,
          method: 'POST',
          requestId,
          clientRefNum: clientRef,
          statusCode: 502,
          resultCode: 102,
          durationMs,
          clientIp: apiClient.client_ip,
          cost: 0,
          environment: apiClient.environment || 'production',
          isSuccess: false,
        }).catch((err) => {
          console.error('Queue dispatch error on mobile intelligence failure:', err.message);
        });
      }

      return errorResponse;
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = Boolean(responseJson && responseJson.success);
    const results = Array.isArray(responseJson?.results) ? responseJson.results : [];
    const primaryResult = results[0] || null;

    const finalResponse = {
      status: isSuccess ? 'success' : 'failed',
      status_message: isSuccess ? 'completed' : 'no_records_found',
      http_response_code: 200,
      result_code: isSuccess ? 101 : 102,
      request_id: requestId,
      client_ref_num: clientRef,
      data: {
        query: responseJson?.query || normalizedQuery,
        phone: cleanDigits.slice(-10),
        total_records: responseJson?.total ?? results.length,
        time_ms: responseJson?.time_ms || durationMs,
        primary_result: primaryResult,
        results,
      },
      result: {
        query: responseJson?.query || normalizedQuery,
        phone: cleanDigits.slice(-10),
        name: primaryResult?.name || null,
        mobile: primaryResult?.mobile || cleanDigits.slice(-10),
        alt_mobile: primaryResult?.alt || null,
        confidence: primaryResult?.confidence ?? 0,
        match_score: primaryResult?.match_score || null,
        address: primaryResult?.address || null,
        country: primaryResult?.country || 'India (+91)',
        records_count: responseJson?.total ?? results.length,
        records: results,
      },
    };

    if (isSuccess && results.length > 0) {
      CacheService.setVerification('mobile_intelligence', normalizedQuery, finalResponse, 86400).catch((err) => {
        console.warn('Cache write error for mobile intelligence:', err.message);
      });
    }

    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode: isSuccess ? 101 : 102,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: isSuccess ? hitCost : 0,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error on mobile intelligence success:', err.message);
      });
    }

    return finalResponse;
  }
}

export default MobileIntelligenceService;
