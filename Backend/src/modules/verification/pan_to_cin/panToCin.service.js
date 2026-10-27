import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class PanToCinService {
  /**
   * Validate Indian Permanent Account Number (PAN) format
   * Standard Indian PAN is a 10-character alphanumeric code:
   * e.g., AAACB1234A or ABCDE1234F
   */
  static isValidPan(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const clean = pan.trim().toUpperCase();
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean);
  }

  /**
   * Helper to extract individual company entity
   */
  static extractCompanyEntity(item, cleanPan) {
    if (!item || typeof item !== 'object') {
      if (typeof item === 'string') {
        const cleanCin = item.trim().toUpperCase();
        return {
          cin: cleanCin,
          pan: cleanPan,
          company_name: '',
          company_status: 'Active',
          listing_status: cleanCin.startsWith('L') ? 'Listed' : 'Unlisted',
          roc: '',
          registration_number: '',
          company_category: '',
          company_class: '',
          company_type: '',
          incorporation_date: '',
          registered_address: '',
          email: null,
          authorized_capital: null,
          paid_up_capital: null,
          raw_data: item,
        };
      }
      return null;
    }

    const cin = String(
      item.cin ||
      item.cin_number ||
      item.cinNumber ||
      item.company_cin ||
      item.llpin ||
      item.registration_number ||
      ''
    ).trim().toUpperCase();

    const companyName = String(
      item.company_name ||
      item.legal_name ||
      item.companyName ||
      item.name ||
      item.entity_name ||
      item.business_name ||
      ''
    ).trim();

    if (!cin && !companyName) {
      return null;
    }

    const companyStatus = String(
      item.company_status ||
      item.status ||
      item.entity_status ||
      'Active'
    ).trim();

    const roc = String(
      item.roc ||
      item.roc_code ||
      item.roc_name ||
      item.registrar_of_companies ||
      ''
    ).trim();

    const registrationNumber = String(
      item.registration_number ||
      item.reg_number ||
      item.reg_no ||
      item.registrationNumber ||
      ''
    ).trim();

    const category = String(
      item.category ||
      item.company_category ||
      item.companyCategory ||
      ''
    ).trim();

    const companyClass = String(
      item.class ||
      item.company_class ||
      item.companyClass ||
      ''
    ).trim();

    const companyType = String(
      item.type ||
      item.company_type ||
      item.companyType ||
      ''
    ).trim();

    const incorporationDate = String(
      item.incorporation_date ||
      item.date_of_incorporation ||
      item.dateOfIncorporation ||
      item.registration_date ||
      item.incorporationDate ||
      ''
    ).trim();

    const registeredAddress = String(
      item.registered_office_address ||
      item.registeredAddress ||
      item.registered_address ||
      item.address ||
      item.registeredOfficeAddress ||
      ''
    ).trim();

    const email = String(
      item.email ||
      item.email_id ||
      item.emailId ||
      item.registered_email ||
      ''
    ).trim().toLowerCase();

    const authorizedCapital = item.authorized_capital || item.authorized_capital_inr || item.authorizedCapital || null;
    const paidUpCapital = item.paid_up_capital || item.paid_up_capital_inr || item.paidUpCapital || null;

    const listingStatus = String(
      item.listing_status ||
      item.listingStatus ||
      (cin.startsWith('L') ? 'Listed' : 'Unlisted')
    ).trim();

    return {
      cin: cin || null,
      pan: cleanPan,
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
      raw_data: item,
    };
  }

  /**
   * Normalize PAN to CIN data from upstream gateway
   */
  static normalizePanToCinData(rawData, cleanPan) {
    if (!rawData) {
      return {
        pan: cleanPan,
        cin: null,
        company_name: '',
        company_status: '',
        total_companies: 0,
        companies: [],
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData.company || rawData;

    let companyList = [];
    if (Array.isArray(payload)) {
      companyList = payload;
    } else if (payload.companies && Array.isArray(payload.companies)) {
      companyList = payload.companies;
    } else if (payload.cin_list && Array.isArray(payload.cin_list)) {
      companyList = payload.cin_list;
    } else if (payload.cins && Array.isArray(payload.cins)) {
      companyList = payload.cins;
    } else if (payload.data && Array.isArray(payload.data)) {
      companyList = payload.data;
    } else if (typeof payload === 'object') {
      companyList = [payload];
    }

    const normalizedCompanies = companyList
      .map((comp) => PanToCinService.extractCompanyEntity(comp, cleanPan))
      .filter(Boolean);

    const primary =
      normalizedCompanies[0] ||
      PanToCinService.extractCompanyEntity(payload, cleanPan) || {
        cin: null,
        pan: cleanPan,
        company_name: '',
        company_status: '',
        listing_status: 'Unlisted',
        roc: '',
        registration_number: '',
        company_category: '',
        company_class: '',
        company_type: '',
        incorporation_date: '',
        registered_address: '',
        email: null,
        authorized_capital: null,
        paid_up_capital: null,
        raw_data: payload,
      };

    return {
      ...primary,
      pan: cleanPan,
      total_companies: normalizedCompanies.length,
      companies: normalizedCompanies,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for PAN to CIN
   */
  static async verifyPanToCin({ pan, client_ref_num, apiClient, endpoint = '/api/v1/verify/pan-to-cin' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `PCIN_${Date.now()}`;

    // 1. Input Validation
    if (!pan || typeof pan !== 'string') {
      throw ApiError.badRequest('Missing required parameter: pan (Permanent Account Number).');
    }

    const cleanPan = pan.trim().toUpperCase();

    if (!this.isValidPan(cleanPan)) {
      throw ApiError.badRequest('Invalid PAN format. PAN must be a valid 10-character alphanumeric code (e.g., AAACB1234A).');
    }

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cachedData = await CacheService.getVerification('pan_to_cin', cleanPan);
    if (cachedData) {
      console.log(`⚡ [PAN TO CIN CACHE] Serving cached record for PAN: ${cleanPan}`);
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
          console.error('Queue dispatch error on cache hit in pan_to_cin:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getPanToCinCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/pan-to-cin-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [PAN TO CIN GATEWAY] Calling Upstream Gateway for PAN: ${cleanPan}`);

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
        console.warn(`⚠️ [PAN TO CIN PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      if (upstreamRes.ok && responseJson) {
        upstreamData = responseJson;
        const errorMsg = responseJson.message || responseJson.error || responseJson.detail || '';
        if (isUpstreamLowBalance(errorMsg)) {
          return formatUpstreamLowBalanceResponse(clientRef, requestId);
        }

        const lowerMsg = String(errorMsg).toLowerCase();
        if (
          responseJson.verified === false ||
          responseJson.result_code === 103 ||
          lowerMsg.includes('no record') ||
          lowerMsg.includes('not found') ||
          lowerMsg.includes('no cin')
        ) {
          isSuccess = true;
          resultCode = 103;
        } else {
          isSuccess = true;
          resultCode = 101;
        }
      } else if (responseJson) {
        upstreamData = responseJson;
        const errorMsg =
          responseJson.message ||
          responseJson.error?.message ||
          (typeof responseJson.error === 'string' ? responseJson.error : '') ||
          responseJson.detail ||
          '';
        if (isUpstreamLowBalance(errorMsg)) {
          return formatUpstreamLowBalanceResponse(clientRef, requestId);
        }

        const lowerMsg = String(errorMsg).toLowerCase();
        if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('no cin')) {
          isSuccess = true;
          resultCode = 103;
        } else {
          statusCode = upstreamRes.status || 400;
          resultCode = 102;
        }
      } else {
        throw new Error(`Upstream gateway returned HTTP status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [PAN TO CIN UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizePanToCinData(upstreamData, cleanPan);
    const hasCin = Boolean(normalizedResult.cin || (normalizedResult.companies && normalizedResult.companies.length > 0));
    const isNoRecord = resultCode === 103 || (!hasCin && isSuccess);

    const errorMessage =
      upstreamData?.message ||
      upstreamData?.error?.message ||
      (typeof upstreamData?.error === 'string' ? upstreamData.error : '') ||
      'Unable to fetch CIN details for PAN.';

    const finalResponse = {
      http_response_code: statusCode,
      result_code: isNoRecord ? 103 : (isSuccess ? 101 : 102),
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isNoRecord ? 'No Record Found' : (isSuccess ? 'Success' : 'Failed'),
      message: isSuccess
        ? hasCin
          ? `Successfully retrieved CIN (${normalizedResult.cin || 'Multiple CINs'}) and company details for PAN ${cleanPan}.`
          : (upstreamData?.message || `No corporate records or CIN found for PAN ${cleanPan}.`)
        : errorMessage,
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis/RAM for 24 hours (86,400s)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('pan_to_cin', cleanPan, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [PAN TO CIN] Cache write error:', err.message);
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
        console.error('Queue dispatch error in pan_to_cin:', err.message);
      });
    }

    return finalResponse;
  }
}

export default PanToCinService;
