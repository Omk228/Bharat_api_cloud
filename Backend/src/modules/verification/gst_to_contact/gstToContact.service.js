import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class GstToContactService {
  /**
   * Validate Indian Goods and Services Tax Identification Number (GSTIN)
   * 15 characters: 2 state digits + 10 PAN chars + 1 entity num/char + 1 'Z' + 1 check digit/char
   */
  static isValidGstin(gstin) {
    if (!gstin || typeof gstin !== 'string') return false;
    const clean = gstin.trim().toUpperCase();
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
  }

  /**
   * Extract and normalize contact records from varied upstream vendor responses
   */
  static normalizeContactData(rawData, cleanGstin) {
    if (!rawData) {
      return {
        gstin: cleanGstin,
        legal_name: '',
        trade_name: '',
        primary_mobile: '',
        primary_email: '',
        mobiles: [],
        emails: [],
        authorized_signatories: [],
        address: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData;

    // Legal & trade names
    const legalName = String(
      payload.legal_name ||
      payload.legalName ||
      payload.lgnm ||
      payload.name ||
      payload.trade_name ||
      ''
    ).trim();

    const tradeName = String(
      payload.trade_name ||
      payload.tradeName ||
      payload.txn ||
      payload.business_name ||
      legalName ||
      ''
    ).trim();

    // Mobiles and Emails gathering
    const mobilesSet = new Set();
    const emailsSet = new Set();

    if (payload.mobile) mobilesSet.add(String(payload.mobile).trim());
    if (payload.mobile_number) mobilesSet.add(String(payload.mobile_number).trim());
    if (payload.mobile_no) mobilesSet.add(String(payload.mobile_no).trim());
    if (payload.phone) mobilesSet.add(String(payload.phone).trim());
    if (payload.contact_number) mobilesSet.add(String(payload.contact_number).trim());

    if (payload.email) emailsSet.add(String(payload.email).trim().toLowerCase());
    if (payload.email_id) emailsSet.add(String(payload.email_id).trim().toLowerCase());
    if (payload.emailId) emailsSet.add(String(payload.emailId).trim().toLowerCase());

    if (Array.isArray(payload.mobiles)) {
      payload.mobiles.forEach((m) => m && mobilesSet.add(String(m).trim()));
    }
    if (Array.isArray(payload.mobile_numbers)) {
      payload.mobile_numbers.forEach((m) => m && mobilesSet.add(String(m).trim()));
    }
    if (Array.isArray(payload.emails)) {
      payload.emails.forEach((e) => e && emailsSet.add(String(e).trim().toLowerCase()));
    }

    // Authorized Signatories / Promoters
    const rawSignatories = 
      payload.authorized_signatories || 
      payload.signatories || 
      payload.promoters || 
      payload.signatory_details || 
      payload.contacts || 
      [];

    const authorizedSignatories = (Array.isArray(rawSignatories) ? rawSignatories : []).map((s) => {
      if (typeof s === 'string') {
        return { name: s, designation: '', mobile: '', email: '' };
      }
      const sMobile = String(s.mobile || s.mobile_number || s.phone || '').trim();
      const sEmail = String(s.email || s.email_id || '').trim().toLowerCase();
      if (sMobile) mobilesSet.add(sMobile);
      if (sEmail) emailsSet.add(sEmail);

      return {
        name: String(s.name || s.signatory_name || s.promoter_name || '').trim(),
        designation: String(s.designation || s.desg || '').trim(),
        mobile: sMobile,
        email: sEmail,
        status: String(s.status || 'Active').trim(),
      };
    }).filter(s => s.name || s.mobile || s.email);

    const mobilesList = Array.from(mobilesSet).filter(Boolean);
    const emailsList = Array.from(emailsSet).filter(Boolean);

    // Address normalization
    const addr = payload.address || payload.principal_place || payload.pradr?.addr || payload.pradr || {};
    let addressObj = null;
    if (typeof addr === 'object' && Object.keys(addr).length > 0) {
      const fullAddr = [
        addr.bno || addr.building_name || addr.door_no || '',
        addr.bnm || addr.building_number || '',
        addr.st || addr.street || '',
        addr.loc || addr.location || '',
        addr.city || addr.district || addr.dst || '',
        addr.state || addr.stcd || '',
        addr.pncd || addr.pincode || addr.pin || ''
      ].filter(Boolean).join(', ');

      addressObj = {
        building_name: String(addr.bno || addr.building_name || addr.bnm || '').trim(),
        street: String(addr.st || addr.street || '').trim(),
        location: String(addr.loc || addr.location || '').trim(),
        city: String(addr.city || addr.district || addr.dst || '').trim(),
        state: String(addr.state || addr.stcd || '').trim(),
        pincode: String(addr.pncd || addr.pincode || addr.pin || '').trim(),
        full_address: fullAddr || (typeof addr === 'string' ? addr : ''),
      };
    } else if (typeof addr === 'string' && addr.trim()) {
      addressObj = {
        building_name: '',
        street: '',
        location: '',
        city: '',
        state: '',
        pincode: '',
        full_address: addr.trim(),
      };
    }

    return {
      gstin: cleanGstin,
      legal_name: legalName,
      trade_name: tradeName,
      status: String(payload.status || payload.gstin_status || 'Active').trim(),
      taxpayer_type: String(payload.taxpayer_type || payload.taxpayerType || payload.dty || '').trim(),
      registration_date: payload.registration_date || payload.reg_date || payload.rgdt || null,
      primary_mobile: mobilesList[0] || '',
      primary_email: emailsList[0] || '',
      mobiles: mobilesList,
      emails: emailsList,
      authorized_signatories: authorizedSignatories,
      address: addressObj,
      raw_details: payload,
    };
  }

  /**
   * Fetch Contact Details from GSTIN
   *
   * @param {object} params
   * @param {string} params.gstin - 15-char GSTIN
   * @param {string} [params.client_ref_num] - Client reference number
   * @param {object} [params.apiClient] - Authenticated API Client object
   * @param {string} [params.endpoint] - Route endpoint path
   */
  static async verifyGstToContact({
    gstin,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/gst-to-contact',
  }) {
    const startTime = Date.now();
    const rawGstin = String(gstin || '').trim();
    const cleanGstin = rawGstin.toUpperCase();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `GCTC_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Parameter Validation
    if (!rawGstin) {
      throw ApiError.badRequest('Missing required parameter: gstin is mandatory.');
    }

    if (!this.isValidGstin(cleanGstin)) {
      throw ApiError.badRequest(
        `Invalid GSTIN format: "${rawGstin}". GSTIN must be a 15-character alphanumeric code (e.g. 07AAAAA0000A1Z5).`
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
    const cachedResult = await CacheService.getVerification('gst_to_contact', cleanGstin);
    if (cachedResult && (cachedResult.result || cachedResult.status_message === 'Success')) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [GST TO CONTACT CACHE HIT] Returned from Cache in ${durationMs}ms: gstin=${cleanGstin}`);

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
          console.error('Queue dispatch error on cache hit in gst_to_contact:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getGstToContactCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/gstin-to-contact-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [GST TO CONTACT GATEWAY] Calling Upstream Gateway for GSTIN: ${cleanGstin}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ gstin: cleanGstin }),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [GST TO CONTACT PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
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
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no contact')) {
            isSuccess = true;
            upstreamData = { data: null };
          } else {
            statusCode = upstreamRes.status || 400;
            resultCode = 102;
          }
        }
      } else {
        throw new Error(`Upstream gateway returned HTTP status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [GST TO CONTACT UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizeContactData(upstreamData, cleanGstin);

    const finalResponse = {
      status_code: statusCode,
      status_message: isSuccess ? 'Success' : 'Failed',
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis / Memory (TTL 24 Hours)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('gst_to_contact', cleanGstin, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [Cache Error] Failed to cache GST to Contact result:', err.message);
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
        console.error('Failed to dispatch audit log for gst_to_contact:', err.message);
      });
    }

    return finalResponse;
  }
}

export default GstToContactService;
