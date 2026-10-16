import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class GstAuthenticatedAdvanceService {
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
   * Helper to map 2-digit GST state code to State Name
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
      '25': 'Daman and Diu',
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
      '37': 'Andhra Pradesh (New)',
      '38': 'Ladakh',
      '97': 'Other Territory',
      '99': 'Centre Jurisdiction',
    };
    return statesMap[code] || null;
  }

  /**
   * Format address object / string into a clean printable address
   */
  static formatAddress(addrObj) {
    if (!addrObj) return null;
    if (typeof addrObj === 'string') return addrObj.trim();

    if (typeof addrObj === 'object') {
      // Check standard GST address schema (bno, bnm, st, loc, dst, city, stcd, pncd)
      const bno = addrObj.bno || addrObj.building_number || addrObj.door_number || '';
      const bnm = addrObj.bnm || addrObj.building_name || addrObj.premises_name || '';
      const flno = addrObj.flno || addrObj.floor_number || '';
      const st = addrObj.st || addrObj.street || addrObj.street_name || '';
      const loc = addrObj.loc || addrObj.locality || addrObj.area || '';
      const city = addrObj.city || addrObj.town || '';
      const dst = addrObj.dst || addrObj.district || '';
      const state = addrObj.stcd || addrObj.state || '';
      const pncd = addrObj.pncd || addrObj.pincode || addrObj.zip || '';

      const parts = [
        [bno, flno, bnm].filter(Boolean).join(', '),
        st,
        loc,
        city,
        dst,
        state,
        pncd ? `PIN - ${pncd}` : '',
      ].filter((p) => Boolean(p && String(p).trim().length > 0));

      return parts.join(', ') || null;
    }

    return null;
  }

  /**
   * Normalize GST Authenticated Advance details from upstream response
   */
  static normalizeGstAdvanceData(rawData, cleanGstin) {
    if (!rawData) {
      return {
        gstin: cleanGstin,
        legal_name: '',
        trade_name: '',
        status: 'Active',
        taxpayer_type: 'Regular',
        constitution_of_business: '',
        registration_date: '',
        cancellation_date: null,
        pan: cleanGstin.length === 15 ? cleanGstin.slice(2, 12) : '',
        state_code: cleanGstin.slice(0, 2),
        state: this.getStateNameByCode(cleanGstin.slice(0, 2)) || '',
        center_jurisdiction: '',
        state_jurisdiction: '',
        principal_place_of_business: null,
        additional_places_of_business: [],
        nature_of_business_activities: [],
        authorized_signatories: [],
        raw_details: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData.taxpayer_details || rawData;

    // Legal Name & Trade Name
    const legalName = String(
      payload.legal_name ||
      payload.legalName ||
      payload.lgnm ||
      payload.business_name ||
      payload.trade_name ||
      payload.tradeNam ||
      ''
    ).trim();

    const tradeName = String(
      payload.trade_name ||
      payload.tradeNam ||
      payload.txn ||
      payload.business_name ||
      legalName ||
      ''
    ).trim();

    // Registration Status (Active, Cancelled, Suspended, Inactive)
    const rawStatus = String(
      payload.status ||
      payload.sts ||
      payload.gstin_status ||
      payload.registration_status ||
      'Active'
    ).trim();

    let status = 'Active';
    const lowerStatus = rawStatus.toLowerCase();
    if (lowerStatus.includes('cancel')) {
      status = 'Cancelled';
    } else if (lowerStatus.includes('suspend')) {
      status = 'Suspended';
    } else if (lowerStatus.includes('inact') || lowerStatus.includes('deact')) {
      status = 'Inactive';
    } else if (lowerStatus.includes('act')) {
      status = 'Active';
    } else {
      status = rawStatus;
    }

    // Taxpayer Type (Regular, Composition, Casual, SEZ, etc.)
    const taxpayerType = String(
      payload.taxpayer_type ||
      payload.dty ||
      payload.taxpayerType ||
      payload.dealer_type ||
      'Regular'
    ).trim();

    // Constitution of Business
    const constitutionOfBusiness = String(
      payload.constitution_of_business ||
      payload.ctb ||
      payload.constitution ||
      payload.business_type ||
      ''
    ).trim();

    // Registration Date & Cancellation Date
    const registrationDate = String(
      payload.registration_date ||
      payload.rgdt ||
      payload.date_of_registration ||
      ''
    ).trim();

    const cancellationDate = payload.cancellation_date || payload.cxdt || payload.date_of_cancellation || null;

    // Extract PAN
    const pan = String(
      payload.pan ||
      payload.pan_number ||
      (cleanGstin.length === 15 ? cleanGstin.slice(2, 12) : '')
    ).trim().toUpperCase();

    // State code & name
    const stateCode = String(
      payload.state_code ||
      payload.stcd ||
      cleanGstin.slice(0, 2)
    ).trim();

    const state = payload.state || this.getStateNameByCode(stateCode) || '';

    // Jurisdictions
    const centerJurisdiction = String(
      payload.center_jurisdiction ||
      payload.centre_jurisdiction ||
      payload.ctj ||
      payload.central_jurisdiction ||
      ''
    ).trim();

    const stateJurisdiction = String(
      payload.state_jurisdiction ||
      payload.stj ||
      ''
    ).trim();

    // Principal Place of Business Address
    const rawPradr = payload.principal_place_of_business || payload.pradr || payload.address || null;
    const formattedPradr = this.formatAddress(rawPradr?.addr || rawPradr);

    const principalPlace = {
      address: formattedPradr,
      building_name: rawPradr?.addr?.bnm || rawPradr?.bnm || rawPradr?.building_name || '',
      building_number: rawPradr?.addr?.bno || rawPradr?.bno || rawPradr?.building_number || '',
      floor_number: rawPradr?.addr?.flno || rawPradr?.flno || '',
      street: rawPradr?.addr?.st || rawPradr?.st || rawPradr?.street || '',
      locality: rawPradr?.addr?.loc || rawPradr?.loc || rawPradr?.locality || '',
      district: rawPradr?.addr?.dst || rawPradr?.dst || rawPradr?.district || '',
      city: rawPradr?.addr?.city || rawPradr?.city || '',
      state: rawPradr?.addr?.stcd || rawPradr?.stcd || state,
      pincode: rawPradr?.addr?.pncd || rawPradr?.pncd || rawPradr?.pincode || '',
      nature_of_premises: rawPradr?.ntr || rawPradr?.nature_of_premises || '',
    };

    // Additional Places of Business (Branches)
    const rawAdadr = Array.isArray(payload.additional_places_of_business)
      ? payload.additional_places_of_business
      : Array.isArray(payload.adadr)
      ? payload.adadr
      : [];

    const additionalPlaces = rawAdadr.map((item) => ({
      address: this.formatAddress(item?.addr || item),
      nature_of_premises: item?.ntr || item?.nature_of_premises || '',
    })).filter((item) => Boolean(item.address));

    // Nature of Business Activities
    const rawNba = payload.nature_of_business_activities || payload.nba || payload.business_activities || [];
    let natureOfBusinessActivities = [];
    if (Array.isArray(rawNba)) {
      natureOfBusinessActivities = rawNba.map((act) => (typeof act === 'string' ? act.trim() : act?.activity || String(act))).filter(Boolean);
    } else if (typeof rawNba === 'string') {
      natureOfBusinessActivities = rawNba.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Authorized Signatories / Promoters
    const rawSignatories = Array.isArray(payload.authorized_signatories)
      ? payload.authorized_signatories
      : Array.isArray(payload.signatories)
      ? payload.signatories
      : Array.isArray(payload.promoters)
      ? payload.promoters
      : [];

    const authorizedSignatories = rawSignatories.map((sig) => {
      if (typeof sig === 'string') return { name: sig.trim(), designation: 'Authorized Signatory' };
      return {
        name: sig.name || sig.full_name || sig.signatory_name || '—',
        designation: sig.designation || sig.role || 'Authorized Signatory',
        pan: sig.pan || sig.signatory_pan || null,
        mobile: sig.mobile || sig.mobile_number || null,
        email: sig.email || null,
      };
    });

    return {
      gstin: cleanGstin,
      legal_name: legalName,
      trade_name: tradeName,
      status,
      taxpayer_type: taxpayerType,
      constitution_of_business: constitutionOfBusiness,
      registration_date: registrationDate,
      cancellation_date: cancellationDate,
      pan,
      state_code: stateCode,
      state,
      center_jurisdiction: centerJurisdiction,
      state_jurisdiction: stateJurisdiction,
      principal_place_of_business: principalPlace,
      additional_places_of_business: additionalPlaces,
      nature_of_business_activities: natureOfBusinessActivities,
      authorized_signatories: authorizedSignatories,
      raw_details: rawData,
    };
  }

  /**
   * Main verification entrypoint for GST Authenticated Advance
   */
  static async verifyGstAdvance({ gstin, clientRefNum, apiClient }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = clientRefNum || `GST_ADV_${Date.now()}`;
    const endpoint = '/api/v1/verify/gst-authenticated-advance';

    // 1. Validate Input
    if (!gstin || typeof gstin !== 'string') {
      throw ApiError.badRequest('GSTIN is required');
    }

    const cleanGstin = gstin.trim().toUpperCase();
    if (!this.isValidGstin(cleanGstin)) {
      throw ApiError.badRequest('Invalid GSTIN format. GSTIN must be a 15-character valid Indian Tax Identification (e.g. 07AAAAA0000A1Z5).');
    }

    // 2. Billing & Wallet Balance Check
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 3. High-Speed Result Cache Check (<1ms)
    const cachedResult = await CacheService.getVerification('gst_authenticated_advance', cleanGstin);
    if (cachedResult && (cachedResult.result || cachedResult.status_message === 'Success')) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [GST AUTHENTICATED ADVANCE CACHE HIT] Returned from Cache in ${durationMs}ms: gstin=${cleanGstin}`);

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
          console.error('Queue dispatch error on cache hit in gst_authenticated_advance:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getGstAuthenticatedAdvanceCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/gstin-verify-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [GST AUTHENTICATED ADVANCE GATEWAY] Calling Upstream Gateway for GSTIN: ${cleanGstin}`);

      const upstreamPayload = {
        gstin: cleanGstin,
        ...(clientRef ? { client_ref_num: clientRef } : {}),
      };

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
        console.warn(`⚠️ [GST AUTHENTICATED ADVANCE PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
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
          if (lowerMsg.includes('no record') || lowerMsg.includes('not found') || lowerMsg.includes('invalid gstin')) {
            statusCode = 404;
            resultCode = 102;
          } else {
            statusCode = upstreamRes.status || 400;
            resultCode = 102;
          }
        }
      } else {
        throw new Error(`Upstream gateway returned HTTP status ${upstreamRes.status}`);
      }
    } catch (upstreamErr) {
      console.error(`❌ [GST AUTHENTICATED ADVANCE UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream GST verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizeGstAdvanceData(upstreamData, cleanGstin);

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
      CacheService.setVerification('gst_authenticated_advance', cleanGstin, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [Cache Error] Failed to cache GST Authenticated Advance result:', err.message);
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
        console.error('Failed to dispatch audit log for gst_authenticated_advance:', err.message);
      });
    }

    return finalResponse;
  }
}

export default GstAuthenticatedAdvanceService;
