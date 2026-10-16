import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class ContactToGstService {
  /**
   * Helper to clean and validate mobile number
   * Accepts 10-digit Indian mobile numbers or standard international format with 91
   */
  static sanitizeMobile(input) {
    if (!input || typeof input !== 'string') return null;
    let digits = input.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (/^[5-9][0-9]{9}$/.test(digits)) {
      return digits;
    }
    return null;
  }

  /**
   * Helper to validate email format
   */
  static sanitizeEmail(input) {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(clean)) {
      return clean;
    }
    return null;
  }

  /**
   * Helper to normalize state codes to state names
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
      '99': 'Centre Jurisdiction',
    };
    return statesMap[String(code).padStart(2, '0')] || '';
  }

  /**
   * Normalize GSTIN records from varied upstream vendor responses
   */
  static normalizeGstinRecords(rawData) {
    if (!rawData) return [];

    let candidates = [];
    if (Array.isArray(rawData)) {
      candidates = rawData;
    } else if (rawData.matches && Array.isArray(rawData.matches)) {
      candidates = rawData.matches;
    } else if (rawData.data?.matches && Array.isArray(rawData.data.matches)) {
      candidates = rawData.data.matches;
    } else if (rawData.result?.matches && Array.isArray(rawData.result.matches)) {
      candidates = rawData.result.matches;
    } else if (rawData.raw_details?.matches && Array.isArray(rawData.raw_details.matches)) {
      candidates = rawData.raw_details.matches;
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
    } else if (rawData.records && Array.isArray(rawData.records)) {
      candidates = rawData.records;
    } else if (rawData.data && Array.isArray(rawData.data.records)) {
      candidates = rawData.data.records;
    } else if (rawData.data && Array.isArray(rawData.data.gstins)) {
      candidates = rawData.data.gstins;
    } else if (typeof rawData.data === 'object' && rawData.data !== null && rawData.data.gstin) {
      candidates = [rawData.data];
    } else if (typeof rawData.result === 'object' && rawData.result !== null && rawData.result.gstin) {
      candidates = [rawData.result];
    } else if (typeof rawData === 'object' && rawData !== null && rawData.gstin) {
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
          address: null,
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
          item.stcd ||
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

        const taxpayerType = String(
          item.taxpayer_type ||
          item.taxpayerType ||
          item.dty ||
          item.type ||
          ''
        ).trim();

        const registrationDate =
          item.registration_date ||
          item.reg_date ||
          item.regDate ||
          item.rgdt ||
          item.date_of_registration ||
          null;

        const addr = item.address || item.principal_place || item.pradr?.addr || item.pradr || null;
        let addressStr = '';
        if (typeof addr === 'string') {
          addressStr = addr;
        } else if (typeof addr === 'object' && addr !== null) {
          addressStr = [
            addr.bno || addr.building_name || '',
            addr.bnm || addr.building_number || '',
            addr.st || addr.street || '',
            addr.loc || addr.location || '',
            addr.city || addr.district || addr.dst || '',
            addr.state || addr.stcd || '',
            addr.pncd || addr.pincode || addr.pin || '',
          ].filter(Boolean).join(', ');
        }

        return {
          gstin,
          legal_name: legalName,
          trade_name: tradeName,
          status,
          state_code: rawStateCode,
          state: stateName,
          registration_date: registrationDate,
          taxpayer_type: taxpayerType || null,
          address: addressStr || null,
          raw_item: item,
        };
      }

      return null;
    }).filter(Boolean);
  }

  /**
   * Fetch GSTIN details linked to a Mobile or Email
   *
   * @param {object} params
   * @param {string} params.contact - 10-digit mobile number or email address
   * @param {string} [params.client_ref_num] - Client reference number
   * @param {object} [params.apiClient] - Authenticated API Client object
   * @param {string} [params.endpoint] - Route endpoint path
   */
  static async verifyContactToGst({
    contact,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/contact-to-gst',
  }) {
    const startTime = Date.now();
    const rawInput = String(contact || '').trim();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `CTG_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Parameter Validation
    if (!rawInput) {
      throw ApiError.badRequest('Missing required parameter: contact (mobile number or email) is mandatory.');
    }

    const cleanMobile = this.sanitizeMobile(rawInput);
    const cleanEmail = this.sanitizeEmail(rawInput);

    if (!cleanMobile && !cleanEmail) {
      throw ApiError.badRequest(
        `Invalid contact format: "${rawInput}". Please provide a valid 10-digit Indian mobile number or valid email address.`
      );
    }

    const queryValue = cleanMobile || cleanEmail;
    const queryType = cleanMobile ? 'MOBILE' : 'EMAIL';

    // 2. Pricing and Wallet Pre-flight Check
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 3. High-Speed Result Cache Check (<1ms)
    const cachedResult = await CacheService.getVerification('contact_to_gst', queryValue);
    if (cachedResult && (cachedResult.result || cachedResult.status_message === 'Success')) {
      // Re-normalize if cached record has 0 gstins but raw_details has matches
      if (
        cachedResult.result &&
        (!Array.isArray(cachedResult.result.gstins) || cachedResult.result.gstins.length === 0) &&
        cachedResult.result.raw_details
      ) {
        const freshList = this.normalizeGstinRecords(cachedResult.result.raw_details);
        if (freshList.length > 0) {
          cachedResult.result.gstins = freshList;
          cachedResult.result.total_gstins = freshList.length;
          cachedResult.result.primary_record = freshList[0] || null;
          CacheService.setVerification('contact_to_gst', queryValue, cachedResult, 86400).catch(() => {});
        }
      }

      const durationMs = Date.now() - startTime;
      console.log(`⚡ [CONTACT TO GST CACHE HIT] Returned from Cache in ${durationMs}ms: query=${queryValue}`);

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
          console.error('Queue dispatch error on cache hit in contact_to_gst:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getContactToGstCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/contact-to-gst-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [CONTACT TO GST GATEWAY] Calling Upstream Gateway for ${queryType}: ${queryValue}`);

      const upstreamPayload = cleanMobile
        ? { contact: cleanMobile, mobile: cleanMobile }
        : { contact: cleanEmail, email: cleanEmail };

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify(upstreamPayload),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [CONTACT TO GST PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
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
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no gst')) {
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
      console.error(`❌ [CONTACT TO GST UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const gstinRecords = this.normalizeGstinRecords(upstreamData);

    const finalResponse = {
      status_code: statusCode,
      status_message: isSuccess ? 'Success' : 'Failed',
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      result: {
        query: queryValue,
        query_type: queryType,
        total_gstins: gstinRecords.length,
        gstins: gstinRecords,
        primary_record: gstinRecords[0] || null,
        raw_details: upstreamData,
      },
    };

    // 6. Cache Valid Results in Redis / Memory (TTL 24 Hours)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('contact_to_gst', queryValue, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [Cache Error] Failed to cache Contact to GST result:', err.message);
      });
    }

    // 7. Queue Audit Logging and Wallet Billing
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
        console.error('Failed to dispatch audit log for contact_to_gst:', err.message);
      });
    }

    return finalResponse;
  }
}

export default ContactToGstService;
