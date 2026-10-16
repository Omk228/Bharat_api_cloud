import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class CinToPanService {
  /**
   * Validate Indian Corporate Identification Number (CIN) format
   * Standard Indian CIN is a 21-character alphanumeric code:
   * e.g., U72200DL2018PTC123456 or L01111UP1990PLC012345
   */
  static isValidCin(cin) {
    if (!cin || typeof cin !== 'string') return false;
    const clean = cin.trim().toUpperCase();
    if (clean.length !== 21) return false;
    return /^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(clean) || /^[A-Z0-9]{21}$/.test(clean);
  }

  /**
   * Normalize CIN to PAN data from upstream gateway
   */
  static normalizeCinData(rawData, cleanCin) {
    if (!rawData) {
      return {
        cin: cleanCin,
        pan: null,
        company_name: '',
        company_status: '',
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData.company || rawData;

    const pan = String(
      payload.pan ||
      payload.pan_number ||
      payload.panNumber ||
      payload.company_pan ||
      payload.tax_id ||
      ''
    ).trim().toUpperCase();

    const companyName = String(
      payload.company_name ||
      payload.legal_name ||
      payload.companyName ||
      payload.name ||
      payload.entity_name ||
      payload.business_name ||
      ''
    ).trim();

    const companyStatus = String(
      payload.company_status ||
      payload.status ||
      payload.entity_status ||
      'Active'
    ).trim();

    const roc = String(
      payload.roc ||
      payload.roc_code ||
      payload.roc_name ||
      payload.registrar_of_companies ||
      ''
    ).trim();

    const registrationNumber = String(
      payload.registration_number ||
      payload.reg_number ||
      payload.reg_no ||
      payload.registrationNumber ||
      ''
    ).trim();

    const category = String(
      payload.category ||
      payload.company_category ||
      payload.companyCategory ||
      ''
    ).trim();

    const companyClass = String(
      payload.class ||
      payload.company_class ||
      payload.companyClass ||
      ''
    ).trim();

    const companyType = String(
      payload.type ||
      payload.company_type ||
      payload.companyType ||
      ''
    ).trim();

    const incorporationDate = String(
      payload.incorporation_date ||
      payload.date_of_incorporation ||
      payload.dateOfIncorporation ||
      payload.registration_date ||
      payload.incorporationDate ||
      ''
    ).trim();

    const registeredAddress = String(
      payload.registered_office_address ||
      payload.registeredAddress ||
      payload.registered_address ||
      payload.address ||
      payload.registeredOfficeAddress ||
      ''
    ).trim();

    const email = String(
      payload.email ||
      payload.email_id ||
      payload.emailId ||
      payload.registered_email ||
      ''
    ).trim().toLowerCase();

    const authorizedCapital = payload.authorized_capital || payload.authorized_capital_inr || payload.authorizedCapital || null;
    const paidUpCapital = payload.paid_up_capital || payload.paid_up_capital_inr || payload.paidUpCapital || null;

    const listingStatus = String(
      payload.listing_status ||
      payload.listingStatus ||
      (cleanCin.startsWith('L') ? 'Listed' : 'Unlisted')
    ).trim();

    return {
      cin: cleanCin,
      pan: pan || null,
      company_name: companyName,
      company_status: companyStatus,
      listing_status: listingStatus,
      roc,
      registration_number: registrationNumber,
      company_category: category,
      company_class: companyClass,
      company_type: companyType,
      incorporation_date: incorporationDate,
      registered_address: registeredAddress,
      email: email || null,
      authorized_capital: authorizedCapital,
      paid_up_capital: paidUpCapital,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for CIN to PAN
   */
  static async verifyCinToPan({ cin, client_ref_num, apiClient, endpoint = '/api/v1/verify/cin-to-pan' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `CIN_${Date.now()}`;

    // 1. Input Validation
    if (!cin || typeof cin !== 'string') {
      throw ApiError.badRequest('Missing required parameter: cin (Corporate Identification Number).');
    }

    const cleanCin = cin.trim().toUpperCase();

    if (!this.isValidCin(cleanCin)) {
      throw ApiError.badRequest('Invalid CIN format. Corporate Identification Number must be a valid 21-character alphanumeric code (e.g., U72200DL2018PTC123456).');
    }

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cachedData = await CacheService.getVerification('cin_to_pan', cleanCin);
    if (cachedData) {
      console.log(`⚡ [CIN TO PAN CACHE] Serving cached record for CIN: ${cleanCin}`);
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
          console.error('Queue dispatch error on cache hit in cin_to_pan:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getCinToPanCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/cin-to-pan-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [CIN TO PAN GATEWAY] Calling Upstream Gateway for CIN: ${cleanCin}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ cin: cleanCin }),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [CIN TO PAN PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
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
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no pan')) {
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
      console.error(`❌ [CIN TO PAN UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizeCinData(upstreamData, cleanCin);
    const hasPan = Boolean(normalizedResult.pan);

    const finalResponse = {
      http_response_code: statusCode,
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? hasPan
          ? `Successfully retrieved PAN (${normalizedResult.pan}) and company details for CIN ${cleanCin}.`
          : `Corporate record retrieved for CIN ${cleanCin}.`
        : (upstreamData?.message || 'Unable to fetch PAN details for CIN.'),
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis/RAM for 24 hours (86,400s)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('cin_to_pan', cleanCin, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [CIN TO PAN] Cache write error:', err.message);
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
        console.error('Queue dispatch error in cin_to_pan:', err.message);
      });
    }

    return finalResponse;
  }
}

export default CinToPanService;
