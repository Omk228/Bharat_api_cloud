import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class TanLookupService {
  /**
   * Helper to extract individual TAN match record
   */
  static extractMatchRecord(item) {
    if (!item) return null;

    let tanList = [];
    if (Array.isArray(item.tan_number)) {
      tanList = item.tan_number.map((t) => String(t).trim().toUpperCase()).filter(Boolean);
    } else if (typeof item.tan_number === 'string' && item.tan_number.trim()) {
      tanList = [item.tan_number.trim().toUpperCase()];
    } else if (Array.isArray(item.tan)) {
      tanList = item.tan.map((t) => String(t).trim().toUpperCase()).filter(Boolean);
    } else if (typeof item.tan === 'string' && item.tan.trim()) {
      tanList = [item.tan.trim().toUpperCase()];
    } else if (typeof item === 'string' && item.trim()) {
      tanList = [item.trim().toUpperCase()];
    }

    const matchScore = item.name_match_score ?? item.match_score ?? item.score ?? null;

    return {
      tan_numbers: tanList,
      primary_tan: tanList[0] || null,
      name_match_score: matchScore,
      raw_data: item,
    };
  }

  /**
   * Normalize TAN Lookup data from upstream gateway
   */
  static normalizeTanLookupData(rawData, cleanCompanyName) {
    if (!rawData) {
      return {
        company_name: cleanCompanyName,
        verified: false,
        total_matches: 0,
        matches: [],
        all_tans: [],
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData;
    const verified = Boolean(payload.verified ?? rawData.verified ?? (payload.matches && payload.matches.length > 0));

    let rawMatches = [];
    if (Array.isArray(payload.matches)) {
      rawMatches = payload.matches;
    } else if (Array.isArray(payload.results)) {
      rawMatches = payload.results;
    } else if (Array.isArray(payload.data)) {
      rawMatches = payload.data;
    } else if (Array.isArray(payload)) {
      rawMatches = payload;
    } else if (typeof payload === 'object' && (payload.tan_number || payload.tan)) {
      rawMatches = [payload];
    }

    const matches = rawMatches
      .map((m) => TanLookupService.extractMatchRecord(m))
      .filter(Boolean);

    // Extract all unique TAN numbers
    const allTansSet = new Set();
    matches.forEach((m) => {
      m.tan_numbers.forEach((t) => allTansSet.add(t));
    });
    const allTans = Array.from(allTansSet);

    return {
      company_name: cleanCompanyName,
      verified: verified || matches.length > 0,
      total_matches: matches.length,
      matches,
      all_tans: allTans,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for TAN Lookup
   */
  static async lookupTan({ company_name, client_ref_num, apiClient, endpoint = '/api/v1/verify/tan-lookup' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `TAN_${Date.now()}`;

    // 1. Input Validation
    if (!company_name || typeof company_name !== 'string' || !company_name.trim()) {
      throw ApiError.badRequest('Missing required parameter: company_name (Company / Deductor Name).');
    }

    const cleanCompanyName = company_name.trim();

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cacheKey = cleanCompanyName.toLowerCase();
    const cachedData = await CacheService.getVerification('tan_lookup', cacheKey);
    if (cachedData) {
      console.log(`⚡ [TAN LOOKUP CACHE] Serving cached record for: "${cleanCompanyName}"`);
      const durationMs = Date.now() - startTime;

      const cachedResponse = {
        ...cachedData,
        request_id: requestId,
        client_ref_num: clientRef,
        cached: true,
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
          console.error('Queue dispatch error on cache hit in tan_lookup:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getTanLookupCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/tan-lookup-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [TAN LOOKUP GATEWAY] Calling Upstream Gateway for: "${cleanCompanyName}"`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ company_name: cleanCompanyName }),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [TAN LOOKUP PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      if (upstreamRes.ok && responseJson) {
        upstreamData = responseJson;
        isSuccess = true;
      } else if (responseJson) {
        upstreamData = responseJson;
        const errorMsg = responseJson.message || responseJson.error || responseJson.detail || '';
        if (isUpstreamLowBalance(errorMsg)) {
          return formatUpstreamLowBalanceResponse(clientRef, requestId);
        }

        if (responseJson.verified === true || responseJson.status === true || responseJson.status_code === 200 || responseJson.success === true) {
          isSuccess = true;
        } else {
          const lowerMsg = errorMsg.toLowerCase();
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no match') || lowerMsg.includes('no tan')) {
            // Definitive "no TAN matches found" is a valid successful billable response
            isSuccess = true;
            upstreamData = { verified: false, matches: [] };
          } else {
            statusCode = upstreamRes.status || 400;
            resultCode = 102;
          }
        }
      } else {
        throw new Error(`Upstream gateway returned HTTP status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [TAN LOOKUP UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizeTanLookupData(upstreamData, cleanCompanyName);
    const hasMatches = normalizedResult.all_tans.length > 0;

    const finalResponse = {
      http_response_code: statusCode,
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? hasMatches
          ? `Successfully found ${normalizedResult.all_tans.length} TAN match(es) for "${cleanCompanyName}".`
          : `No matching TAN records found for "${cleanCompanyName}".`
        : (upstreamData?.message || 'Unable to fetch TAN details for company.'),
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis/RAM for 24 hours (86,400s)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('tan_lookup', cacheKey, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [TAN LOOKUP] Cache write error:', err.message);
      });
    }

    // 7. Enqueue API Audit & Wallet Settlement Job
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode,
        resultCode,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: hitCost,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error in tan_lookup:', err.message);
      });
    }

    return finalResponse;
  }
}

export default TanLookupService;
