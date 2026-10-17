import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class ItrCheckService {
  /**
   * Validate Indian Permanent Account Number (PAN) format
   * Standard Indian PAN is a 10-character alphanumeric code:
   * e.g., ABCDE1234F
   */
  static isValidPan(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const clean = pan.trim().toUpperCase();
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean);
  }

  /**
   * Helper to extract individual ITR filing record
   */
  static extractFilingRecord(item) {
    if (!item || typeof item !== 'object') return null;

    const assessmentYear = String(
      item.assessment_year ||
      item.assessmentYear ||
      item.ay ||
      item.year ||
      ''
    ).trim();

    const financialYear = String(
      item.financial_year ||
      item.financialYear ||
      item.fy ||
      ''
    ).trim();

    const ackNumber = String(
      item.acknowledgement_number ||
      item.acknowledgment_number ||
      item.acknowledgementNumber ||
      item.ack_no ||
      item.ack_num ||
      item.ackNumber ||
      item.ack_number ||
      ''
    ).trim();

    const filedDate = String(
      item.filed_date ||
      item.filing_date ||
      item.filedDate ||
      item.filingDate ||
      item.date ||
      ''
    ).trim();

    const formFiled = String(
      item.form_filed ||
      item.formFiled ||
      item.form ||
      item.itr_form ||
      item.itrForm ||
      item.return_form ||
      ''
    ).trim();

    const filingType = String(
      item.filing_type ||
      item.filingType ||
      item.type ||
      'Original'
    ).trim();

    const section = String(
      item.section ||
      item.filing_section ||
      item.sec ||
      item.u_s ||
      ''
    ).trim();

    const status = String(
      item.status ||
      item.filing_status ||
      item.status_desc ||
      (ackNumber ? 'Filed' : 'Not Filed')
    ).trim();

    return {
      assessment_year: assessmentYear,
      financial_year: financialYear,
      acknowledgement_number: ackNumber || null,
      filed_date: filedDate || null,
      form_filed: formFiled || null,
      filing_type: filingType || 'Original',
      section: section || null,
      status: status || 'Filed',
      raw_data: item,
    };
  }

  /**
   * Normalize ITR Check data from upstream gateway
   */
  static normalizeItrData(rawData, cleanPan) {
    if (!rawData) {
      return {
        pan: cleanPan,
        name: '',
        has_filings: false,
        total_filings: 0,
        filings: [],
        sec_206ab: null,
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData.itr_details || rawData;

    const pan = String(payload.pan || payload.pan_number || cleanPan).trim().toUpperCase();
    const name = String(
      payload.name ||
      payload.taxpayer_name ||
      payload.tax_payer_name ||
      payload.full_name ||
      payload.legal_name ||
      ''
    ).trim();

    let rawFilings = [];
    if (Array.isArray(payload.filings)) {
      rawFilings = payload.filings;
    } else if (Array.isArray(payload.records)) {
      rawFilings = payload.records;
    } else if (Array.isArray(payload.itr_details)) {
      rawFilings = payload.itr_details;
    } else if (Array.isArray(payload.details)) {
      rawFilings = payload.details;
    } else if (Array.isArray(payload.data)) {
      rawFilings = payload.data;
    } else if (Array.isArray(payload)) {
      rawFilings = payload;
    } else if (typeof payload === 'object' && payload.filing) {
      rawFilings = [payload.filing];
    }

    const filings = rawFilings
      .map((item) => ItrCheckService.extractFilingRecord(item))
      .filter(Boolean);

    const hasFilings = filings.length > 0;
    const sec206ab = payload.sec_206ab || payload.sec_206ab_206cca || payload.compliance_status || null;

    return {
      pan,
      name,
      has_filings: hasFilings,
      total_filings: filings.length,
      filings,
      sec_206ab: sec206ab,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for ITR Filing Check
   */
  static async verifyItrCheck({ pan, assessment_year, client_ref_num, apiClient, endpoint = '/api/v1/verify/itr-check' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `ITR_${Date.now()}`;

    // 1. Input Validation
    if (!pan || typeof pan !== 'string') {
      throw ApiError.badRequest('Missing required parameter: pan (Permanent Account Number).');
    }

    const cleanPan = pan.trim().toUpperCase();

    if (!this.isValidPan(cleanPan)) {
      throw ApiError.badRequest('Invalid PAN format. PAN must be a valid 10-character alphanumeric code (e.g., ABCDE1234F).');
    }

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cacheKey = assessment_year ? `${cleanPan}_${assessment_year.trim()}` : cleanPan;
    const cachedData = await CacheService.getVerification('itr_check', cacheKey);
    if (cachedData) {
      console.log(`⚡ [ITR CHECK CACHE] Serving cached record for PAN: ${cleanPan}`);
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
          console.error('Queue dispatch error on cache hit in itr_check:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getItrCheckCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/itr-check/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [ITR CHECK GATEWAY] Calling Upstream Gateway for PAN: ${cleanPan}`);

      const requestBody = { pan: cleanPan };
      if (assessment_year && typeof assessment_year === 'string' && assessment_year.trim()) {
        requestBody.assessment_year = assessment_year.trim();
      }

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [ITR CHECK PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
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

        if (responseJson.status === true || responseJson.status_code === 200 || responseJson.success === true) {
          isSuccess = true;
        } else {
          const lowerMsg = errorMsg.toLowerCase();
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no itr') || lowerMsg.includes('no filing')) {
            // Definitive "no ITR filing" is a successful billable KYC verification result
            isSuccess = true;
            upstreamData = { data: { pan: cleanPan, filings: [] }, message: responseJson.message || 'No ITR filing records found for the given PAN.' };
          } else {
            statusCode = upstreamRes.status || 400;
            resultCode = 102;
          }
        }
      } else {
        throw new Error(`Upstream gateway returned HTTP status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [ITR CHECK UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizeItrData(upstreamData, cleanPan);

    const finalResponse = {
      http_response_code: statusCode,
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? normalizedResult.has_filings
          ? `Successfully retrieved ${normalizedResult.total_filings} ITR filing record(s) for PAN ${cleanPan}.`
          : `No ITR filing records found for PAN ${cleanPan}.`
        : (upstreamData?.message || 'Unable to fetch ITR details for PAN.'),
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis/RAM for 24 hours (86,400s)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('itr_check', cacheKey, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [ITR CHECK] Cache write error:', err.message);
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
        console.error('Queue dispatch error in itr_check:', err.message);
      });
    }

    return finalResponse;
  }
}

export default ItrCheckService;
