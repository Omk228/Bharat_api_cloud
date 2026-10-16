import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class PanToGstService {
  /**
   * Validate Indian Permanent Account Number (PAN) format
   * 10 alphanumeric characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
   */
  static isValidPan(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const clean = pan.trim().toUpperCase();
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean);
  }

  /**
   * Helper to normalize state codes to state names (if state name not provided)
   */
  static getStateNameByCode(code) {
    const statesMap = {
      '01': 'Jammu and Kashmir',
      '02': 'Himachal Pradesh',
      '03': 'Punjab',
      '04': 'Chandigarh',
      '05': 'Uttarakhand',
      '06': 'Haryana',
      '07': 'Delhi',
      '08': 'Rajasthan',
      '09': 'Uttar Pradesh',
      '10': 'Bihar',
      '11': 'Sikkim',
      '12': 'Arunachal Pradesh',
      '13': 'Nagaland',
      '14': 'Manipur',
      '15': 'Mizoram',
      '16': 'Tripura',
      '17': 'Meghalaya',
      '18': 'Assam',
      '19': 'West Bengal',
      '20': 'Jharkhand',
      '21': 'Odisha',
      '22': 'Chhattisgarh',
      '23': 'Madhya Pradesh',
      '24': 'Gujarat',
      '26': 'Dadra and Nagar Haveli and Daman and Diu',
      '27': 'Maharashtra',
      '28': 'Andhra Pradesh (Old)',
      '29': 'Karnataka',
      '30': 'Goa',
      '31': 'Lakshadweep',
      '32': 'Kerala',
      '33': 'Tamil Nadu',
      '34': 'Puducherry',
      '35': 'Andaman and Nicobar Islands',
      '36': 'Telangana',
      '37': 'Andhra Pradesh',
      '38': 'Ladakh',
      '97': 'Other Territory',
      '99': 'Centre Jurisdiction'
    };
    return statesMap[String(code).padStart(2, '0')] || '';
  }

  /**
   * Normalize GSTIN items from upstream gateway response
   */
  static normalizeGstinRecords(rawData) {
    if (!rawData) return [];

    let candidates = [];
    if (Array.isArray(rawData)) {
      candidates = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      candidates = rawData.data;
    } else if (rawData.gstins && Array.isArray(rawData.gstins)) {
      candidates = rawData.gstins;
    } else if (rawData.gstin_list && Array.isArray(rawData.gstin_list)) {
      candidates = rawData.gstin_list;
    } else if (rawData.result && Array.isArray(rawData.result)) {
      candidates = rawData.result;
    } else if (rawData.result && Array.isArray(rawData.result.gstins)) {
      candidates = rawData.result.gstins;
    } else if (typeof rawData === 'object' && rawData.gstin) {
      candidates = [rawData];
    }

    return candidates.map((item) => {
      if (typeof item === 'string') {
        const cleanGst = item.trim().toUpperCase();
        const stateCode = cleanGst.length >= 2 ? cleanGst.slice(0, 2) : '';
        return {
          gstin: cleanGst,
          legal_name: '',
          trade_name: '',
          status: 'Active',
          state_code: stateCode,
          state: this.getStateNameByCode(stateCode),
          registration_date: null,
          taxpayer_type: null,
        };
      }

      if (typeof item === 'object' && item !== null) {
        const gstin = String(
          item.gstin ||
          item.gstin_number ||
          item.gst_number ||
          item.gstinId ||
          item.gstNumber ||
          item.id ||
          ''
        ).trim().toUpperCase();

        const rawStateCode = String(
          item.state_code ||
          item.stateCode ||
          (gstin.length >= 2 ? gstin.slice(0, 2) : '')
        ).trim();

        const stateName = String(
          item.state ||
          item.state_name ||
          item.stateName ||
          this.getStateNameByCode(rawStateCode)
        ).trim();

        const legalName = String(
          item.legal_name ||
          item.legalName ||
          item.lgnm ||
          item.trade_name ||
          item.tradeName ||
          item.taxpayer_name ||
          ''
        ).trim();

        const tradeName = String(
          item.trade_name ||
          item.tradeName ||
          item.trade_nam ||
          item.business_name ||
          item.businessName ||
          legalName ||
          ''
        ).trim();

        const status = String(
          item.status ||
          item.gstin_status ||
          item.gst_status ||
          item.sts ||
          item.auth_status ||
          'Active'
        ).trim();

        return {
          gstin,
          legal_name: legalName,
          trade_name: tradeName,
          status,
          state_code: rawStateCode,
          state: stateName,
          registration_date: item.registration_date || item.reg_date || item.regDate || item.rgdt || null,
          taxpayer_type: item.taxpayer_type || item.taxpayerType || item.dty || null,
          centre_jurisdiction: item.centre_jurisdiction || item.center_jurisdiction || item.ctj || null,
          state_jurisdiction: item.state_jurisdiction || item.stj || null,
        };
      }

      return null;
    }).filter(record => record && record.gstin);
  }

  /**
   * Verify and fetch all GSTIN numbers linked to a PAN
   *
   * @param {object} params
   * @param {string} params.pan - 10-char PAN
   * @param {string} [params.client_ref_num] - Client reference number
   * @param {object} [params.apiClient] - Authenticated API Client object
   * @param {string} [params.endpoint] - Route endpoint path
   */
  static async verifyPanToGst({
    pan,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/pan-to-gst',
  }) {
    const startTime = Date.now();
    const rawPan = String(pan || '').trim();
    const cleanPan = rawPan.toUpperCase();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `PGST_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Parameter Validation
    if (!rawPan) {
      throw ApiError.badRequest('Missing required parameter: pan is mandatory.');
    }

    if (!this.isValidPan(cleanPan)) {
      throw ApiError.badRequest(
        `Invalid PAN format: "${rawPan}". PAN must be a 10-character alphanumeric code (e.g. ABCDE1234F).`
      );
    }

    // 2. Pricing and Wallet Pre-flight Check
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 3. High-Speed Result Cache Check (<1ms)
    const cachedResult = await CacheService.getVerification('pan_to_gst', cleanPan);
    if (cachedResult && (cachedResult.result || cachedResult.status_message === 'Success')) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [PAN TO GST CACHE HIT] Returned from Cache in ${durationMs}ms: pan=${cleanPan}`);

      const cachedResponse = {
        ...cachedResult,
        http_response_code: 200,
        result_code: 101,
        request_id: requestId,
        client_ref_num: clientRef,
        _cached: true,
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
          console.error('Queue dispatch error on cache hit in pan_to_gst:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getPanToGstCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/gstin-by-pan-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [PAN TO GST GATEWAY] Calling Upstream Gateway for PAN: ${cleanPan}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ pan: cleanPan }),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [PAN TO GST PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      if (upstreamRes.ok && responseJson) {
        upstreamData = responseJson;
        isSuccess = true;
      } else if (responseJson) {
        upstreamData = responseJson;
        // Check if provider indicated low balance or failure
        const errorMsg = responseJson.message || responseJson.error || responseJson.detail || '';
        if (isUpstreamLowBalance(errorMsg)) {
          return formatUpstreamLowBalanceResponse(clientRef, requestId);
        }

        if (responseJson.status === true || responseJson.status_code === 200 || responseJson.success === true) {
          isSuccess = true;
        } else {
          // Check if it's a valid "No GSTIN found for PAN" scenario
          const lowerMsg = errorMsg.toLowerCase();
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no gstin')) {
            isSuccess = true;
            upstreamData = { data: [] };
          } else {
            statusCode = upstreamRes.status || 400;
            resultCode = 102;
          }
        }
      } else {
        throw new Error(`Upstream gateway returned HTTP status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [PAN TO GST UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedGstins = this.normalizeGstinRecords(upstreamData);
    const totalGstins = normalizedGstins.length;

    const normalizedResult = {
      pan: cleanPan,
      total_gstins: totalGstins,
      gstins: normalizedGstins,
    };

    const finalResponse = {
      http_response_code: statusCode,
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? totalGstins > 0
          ? `Successfully retrieved ${totalGstins} GSTIN record(s) registered under PAN ${cleanPan}.`
          : `No active GSTIN records registered against PAN ${cleanPan}.`
        : (upstreamData?.message || 'Unable to fetch GSTIN details for PAN.'),
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis/RAM for 24 hours (86,400s)
    if (isSuccess) {
      CacheService.setVerification('pan_to_gst', cleanPan, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [PAN TO GST] Cache write error:', err.message);
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
        console.error('Queue dispatch error in pan_to_gst:', err.message);
      });
    }

    return finalResponse;
  }
}

export default PanToGstService;
