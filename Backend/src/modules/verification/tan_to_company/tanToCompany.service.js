import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class TanToCompanyService {
  /**
   * Helper to normalize company / deductor entity from TAN
   */
  static extractDeductorDetails(item, cleanTan) {
    if (!item) return null;

    const tan = String(item.tan || item.tan_number || cleanTan || '').trim().toUpperCase();
    const companyName = String(
      item.company_name ||
      item.companyName ||
      item.name ||
      item.deductor_name ||
      item.deductorName ||
      item.entity_name ||
      item.taxpayer_name ||
      ''
    ).trim();

    const category = String(
      item.category ||
      item.deductor_category ||
      item.deductorCategory ||
      item.entity_category ||
      item.company_category ||
      ''
    ).trim();

    const pan = String(
      item.pan ||
      item.pan_number ||
      item.deductor_pan ||
      item.company_pan ||
      ''
    ).trim().toUpperCase();

    // Address extraction
    let address = '';
    if (typeof item.address === 'string' && item.address.trim()) {
      address = item.address.trim();
    } else if (typeof item.registered_address === 'string' && item.registered_address.trim()) {
      address = item.registered_address.trim();
    } else if (typeof item.communication_address === 'string' && item.communication_address.trim()) {
      address = item.communication_address.trim();
    } else if (typeof item.address === 'object' && item.address !== null) {
      const addrObj = item.address;
      address = [
        addrObj.line1 || addrObj.address_line_1 || addrObj.building,
        addrObj.line2 || addrObj.address_line_2 || addrObj.street,
        addrObj.city || addrObj.district,
        addrObj.state,
        addrObj.pincode || addrObj.pin,
      ].filter(Boolean).join(', ');
    }

    const city = String(item.city || item.district || item.address?.city || item.address?.district || '').trim();
    const state = String(item.state || item.state_name || item.address?.state || '').trim();
    const pincode = String(item.pincode || item.pin || item.postal_code || item.address?.pincode || '').trim();
    const email = String(item.email || item.email_id || item.deductor_email || item.address?.email || '').trim();
    const phone = String(item.phone || item.mobile || item.contact_number || item.phone_number || '').trim();

    // AO Details
    const aoCode = String(item.ao_code || item.aoCode || '').trim();
    const aoType = String(item.ao_type || item.aoType || '').trim();
    const rangeCode = String(item.range_code || item.rangeCode || '').trim();
    const areaCode = String(item.area_code || item.areaCode || '').trim();
    const aoNumber = String(item.ao_number || item.aoNumber || '').trim();

    const status = String(
      item.status ||
      item.tan_status ||
      item.verification_status ||
      (companyName ? 'Active' : 'Unknown')
    ).trim();

    return {
      tan: tan || cleanTan,
      company_name: companyName,
      category,
      pan: pan || null,
      address,
      city,
      state,
      pincode,
      email: email || null,
      phone: phone || null,
      ao_code: aoCode || null,
      ao_type: aoType || null,
      range_code: rangeCode || null,
      area_code: areaCode || null,
      ao_number: aoNumber || null,
      status,
      raw_data: item,
    };
  }

  /**
   * Normalize TAN to Company data from upstream gateway
   */
  static normalizeTanToCompanyData(rawData, cleanTan) {
    if (!rawData) {
      return {
        tan: cleanTan,
        verified: false,
        company_name: '',
        category: '',
        pan: null,
        address: '',
        city: '',
        state: '',
        pincode: '',
        email: null,
        phone: null,
        status: 'Not Found',
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData;
    const verified = Boolean(
      payload.verified ??
      rawData.verified ??
      payload.company_name ??
      payload.deductor_name ??
      payload.name
    );

    const deductor = TanToCompanyService.extractDeductorDetails(payload, cleanTan);

    return {
      tan: cleanTan,
      verified: verified || Boolean(deductor?.company_name),
      ...deductor,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for TAN to Company
   */
  static async verifyTanToCompany({ tan, client_ref_num, apiClient, endpoint = '/api/v1/verify/tan-to-company' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `TAN_CO_${Date.now()}`;

    // 1. Input Validation
    if (!tan || typeof tan !== 'string' || !tan.trim()) {
      throw ApiError.badRequest('Missing required parameter: tan (10-character Indian TAN number).');
    }

    const cleanTan = tan.trim().toUpperCase();
    if (!/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(cleanTan)) {
      throw ApiError.badRequest('Invalid TAN format. TAN must be 10 alphanumeric characters (e.g. MUMR09795C: 4 letters, 5 digits, 1 letter).');
    }

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cacheKey = cleanTan.toLowerCase();
    const cachedData = await CacheService.getVerification('tan_to_company', cacheKey);
    if (cachedData) {
      console.log(`⚡ [TAN TO COMPANY CACHE] Serving cached record for: "${cleanTan}"`);
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
          console.error('Queue dispatch error on cache hit in tan_to_company:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getTanToCompanyCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/tan-to-company-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [TAN TO COMPANY GATEWAY] Calling Upstream Gateway for TAN: ${cleanTan}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          tan: cleanTan,
          tan_number: cleanTan,
        }),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [TAN TO COMPANY PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      if (upstreamRes.ok && responseJson) {
        upstreamData = responseJson;
        isSuccess = true;
      } else {
        statusCode = upstreamRes.status;
        resultCode = 102;
        upstreamData = responseJson || { raw: responseText };

        // Check if upstream low balance
        if (isUpstreamLowBalance(statusCode, responseText, responseJson)) {
          console.error(`🚨 [TAN TO COMPANY LOW BALANCE] Upstream returned low balance:`, responseText);
          const durationMs = Date.now() - startTime;
          const lowBalanceResp = formatUpstreamLowBalanceResponse(requestId, clientRef);

          if (apiClient?.user_id) {
            QueueService.addAuditJob({
              userId: apiClient.user_id,
              credentialId: apiClient.credential_id,
              endpoint,
              method: 'POST',
              requestId,
              clientRefNum: clientRef,
              statusCode: 502,
              resultCode: 104,
              durationMs,
              clientIp: apiClient.client_ip,
              cost: 0,
              environment: apiClient.environment || 'production',
              isSuccess: false,
            }).catch(() => {});
          }

          return lowBalanceResp;
        }

        console.error(`❌ [TAN TO COMPANY ERROR] Gateway error status ${statusCode}:`, responseText);
      }
    } catch (networkErr) {
      console.error(`💥 [TAN TO COMPANY NETWORK ERROR] Connection failure:`, networkErr.message);
      statusCode = 502;
      resultCode = 105;
      upstreamData = { error: networkErr.message };
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalize Data
    const normalizedData = TanToCompanyService.normalizeTanToCompanyData(upstreamData, cleanTan);

    // 6. Cache on Success
    if (isSuccess && normalizedData && normalizedData.verified) {
      await CacheService.setVerification('tan_to_company', cacheKey, {
        status: 'success',
        success: true,
        data: normalizedData,
      }, 86400); // 24 hours
    }

    // 7. Audit Logging via Queue
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
        cost: isSuccess ? hitCost : 0,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error in tan_to_company:', err.message);
      });
    }

    // Return unified API response
    return {
      status: isSuccess ? 'success' : 'error',
      success: isSuccess,
      data: normalizedData,
      request_id: requestId,
      client_ref_num: clientRef,
      ...(isSuccess ? {} : { message: upstreamData?.message || 'Failed to retrieve company details for TAN' }),
    };
  }
}

export default TanToCompanyService;
