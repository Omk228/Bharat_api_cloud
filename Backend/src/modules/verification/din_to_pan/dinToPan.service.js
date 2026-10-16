import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class DinToPanService {
  /**
   * Validate Indian Director Identification Number (DIN) format
   * Standard Indian DIN is an 8-digit numeric identifier issued by MCA
   * e.g., "00000001", "07123456"
   */
  static isValidDin(din) {
    if (!din) return false;
    const clean = String(din).trim();
    return /^[0-9]{8}$/.test(clean);
  }

  /**
   * Sanitize DIN input (pad with leading zeros if 6-7 digits, or trim)
   */
  static sanitizeDin(din) {
    if (!din) return '';
    const digitsOnly = String(din).trim().replace(/\D/g, '');
    if (digitsOnly.length >= 6 && digitsOnly.length < 8) {
      return digitsOnly.padStart(8, '0');
    }
    return digitsOnly;
  }

  /**
   * Normalize DIN to PAN data from upstream gateway
   */
  static normalizeDinData(rawData, cleanDin) {
    if (!rawData) {
      return {
        din: cleanDin,
        pan: null,
        director_name: '',
        din_status: 'Not Found',
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData.director || rawData;

    // Director PAN
    const pan = String(
      payload.pan ||
      payload.pan_number ||
      payload.panNumber ||
      payload.director_pan ||
      payload.tax_id ||
      payload.income_tax_pan ||
      ''
    ).trim().toUpperCase();

    // Director Name
    const directorName = String(
      payload.director_name ||
      payload.name ||
      payload.full_name ||
      payload.fullName ||
      payload.legal_name ||
      payload.directorName ||
      ''
    ).trim();

    // Father Name
    const fatherName = String(
      payload.father_name ||
      payload.fatherName ||
      payload.fathers_name ||
      payload.guardian_name ||
      ''
    ).trim();

    // Date of Birth
    const dob = String(
      payload.dob ||
      payload.date_of_birth ||
      payload.dateOfBirth ||
      payload.birth_date ||
      ''
    ).trim();

    // Gender
    const gender = String(
      payload.gender ||
      payload.sex ||
      ''
    ).trim();

    // Nationality
    const nationality = String(
      payload.nationality ||
      payload.country ||
      'Indian'
    ).trim();

    // DIN Status (Approved, Active, Deactivated, Lapsed, Surrendered, Disqualified)
    const dinStatus = String(
      payload.din_status ||
      payload.status ||
      payload.director_status ||
      'Active'
    ).trim();

    // Disqualification flag
    const isDisqualified = Boolean(
      payload.disqualified === true ||
      payload.is_disqualified === true ||
      String(payload.disqualified || '').toLowerCase() === 'yes' ||
      String(payload.disqualification_status || '').toLowerCase().includes('disqualified')
    );

    // DIN Allotment Date
    const allotmentDate = String(
      payload.allotment_date ||
      payload.din_allotment_date ||
      payload.date_of_allotment ||
      payload.allotmentDate ||
      ''
    ).trim();

    // Contact info if present
    const email = String(
      payload.email ||
      payload.email_id ||
      payload.emailId ||
      ''
    ).trim().toLowerCase();

    const mobile = String(
      payload.mobile ||
      payload.mobile_number ||
      payload.phone ||
      payload.contact ||
      ''
    ).trim();

    // Address
    const address = String(
      payload.address ||
      payload.residential_address ||
      payload.permanent_address ||
      ''
    ).trim();

    // Directorships / Companies associated with this DIN
    let directorships = [];
    const rawDirectorships = payload.directorships || payload.companies || payload.associated_companies || payload.entities || [];
    if (Array.isArray(rawDirectorships)) {
      directorships = rawDirectorships.map((comp) => ({
        cin: comp.cin || comp.company_cin || comp.registration_number || '',
        company_name: comp.company_name || comp.name || comp.entity_name || '',
        designation: comp.designation || comp.role || comp.position || 'Director',
        appointment_date: comp.appointment_date || comp.date_of_appointment || comp.appointed_on || '',
        cessation_date: comp.cessation_date || comp.date_of_cessation || null,
        status: comp.status || comp.company_status || 'Active',
      }));
    }

    return {
      din: cleanDin,
      pan: pan || null,
      director_name: directorName,
      father_name: fatherName,
      dob: dob || null,
      gender: gender || null,
      nationality: nationality || 'Indian',
      din_status: dinStatus,
      is_disqualified: isDisqualified,
      allotment_date: allotmentDate || null,
      email: email || null,
      mobile: mobile || null,
      address: address || null,
      directorships_count: directorships.length,
      directorships,
      raw_details: payload,
    };
  }

  /**
   * Main verification handler for DIN to PAN
   */
  static async verifyDinToPan({ din, client_ref_num, apiClient, endpoint = '/api/v1/verify/din-to-pan' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `DIN_${Date.now()}`;

    // 1. Input Validation
    if (!din) {
      throw ApiError.badRequest('Missing required parameter: din (Director Identification Number).');
    }

    const cleanDin = this.sanitizeDin(din);

    if (!this.isValidDin(cleanDin)) {
      throw ApiError.badRequest(
        `Invalid DIN format: "${din}". Director Identification Number must be an 8-digit numeric identifier (e.g. 00000001, 01234567).`
      );
    }

    // 2. Fetch Effective API Price & User Wallet Check
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 3. Cache Layer Check (24 hours TTL)
    const cachedData = await CacheService.getVerification('din_to_pan', cleanDin);
    if (cachedData) {
      console.log(`⚡ [DIN TO PAN CACHE] Serving cached record for DIN: ${cleanDin}`);
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
          console.error('Queue dispatch error on cache hit in din_to_pan:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getDinToPanCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/din-to-pan-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [DIN TO PAN GATEWAY] Calling Upstream Gateway for DIN: ${cleanDin}`);

      const upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ din: cleanDin }),
        timeout: creds.timeoutMs || 25000,
      });

      const responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [DIN TO PAN PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
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
      console.error(`❌ [DIN TO PAN UPSTREAM ERROR]:`, upstreamErr.message);

      if (isUpstreamLowBalance(upstreamErr.message)) {
        return formatUpstreamLowBalanceResponse(clientRef, requestId);
      }

      throw ApiError.gatewayTimeout('Upstream verification gateway is currently taking longer than expected. Please retry.');
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalization
    const normalizedResult = this.normalizeDinData(upstreamData, cleanDin);
    const hasPan = Boolean(normalizedResult.pan);

    const finalResponse = {
      http_response_code: statusCode,
      result_code: resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? hasPan
          ? `Successfully retrieved Director PAN (${normalizedResult.pan}) and details for DIN ${cleanDin}.`
          : `Director profile retrieved for DIN ${cleanDin}.`
        : (upstreamData?.message || 'Unable to fetch PAN details for Director DIN.'),
      result: normalizedResult,
    };

    // 6. Cache Valid Results in Redis/RAM for 24 hours (86,400s)
    if (isSuccess && resultCode === 101) {
      CacheService.setVerification('din_to_pan', cleanDin, finalResponse, 86400).catch((err) => {
        console.warn('⚠️ [DIN TO PAN] Cache write error:', err.message);
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
        console.error('Queue dispatch error in din_to_pan:', err.message);
      });
    }

    return finalResponse;
  }
}

export default DinToPanService;
