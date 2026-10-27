import crypto from 'node:crypto';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { PrefillVerificationService } from '../prefill/prefill.service.js';
import { MobileIntelligenceService } from '../mobile_intelligence/mobileIntelligence.service.js';

export class MobileAdvanceLookupService {
  /**
   * Validate Indian Mobile Number (10 digits starting with 6-9, or 12 digits with 91 prefix)
   */
  static isValidMobileNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean) || /^91[6-9]\d{9}$/.test(clean);
  }

  /**
   * Normalize 10-digit mobile number
   */
  static extract10DigitPhone(phone) {
    const clean = String(phone || '').trim().replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      return clean.slice(2);
    }
    return clean.slice(-10);
  }

  /**
   * Execute Unified Mobile Advance Lookup (Composite of Prefill & Intelligence)
   * 
   * CRITICAL BILLING RULE:
   * Internal calls to Prefill and Mobile Intelligence MUST be invoked with `apiClient: null`
   * so that no internal duplicate billing/deductions occur.
   * Billing is performed exactly ONCE for this Advance service via QueueService.addAuditJob.
   */
  static async lookupMobileAdvance({
    phone,
    mobile,
    mobile_number,
    first_name,
    last_name,
    client_ref_num,
    apiClient,
    endpoint = '/api/v1/verify/mobile-advance-lookup',
  }) {
    const startTime = Date.now();
    const rawInput = String(phone || mobile || mobile_number || '').trim();
    const cleanDigits = rawInput.replace(/\D/g, '');
    const cleanPhone = this.extract10DigitPhone(cleanDigits);

    const firstName = String(first_name || '').trim();
    const lastName = String(last_name || '').trim();

    const requestId = `req_adv_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `ADV_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!rawInput) {
      throw ApiError.badRequest('Missing required parameter: phone (or mobile_number) is mandatory.');
    }

    if (!firstName) {
      throw ApiError.badRequest('Missing required parameter: first_name (or name) is mandatory for Mobile Advance Lookup.');
    }

    if (!this.isValidMobileNumber(cleanDigits)) {
      throw ApiError.badRequest(`Invalid phone number format: "${rawInput}". Please provide a valid 10-digit Indian mobile number.`);
    }

    // Resolve effective hit cost (Base ₹15.00 + 18% GST = ₹17.70)
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 0. Pre-flight wallet balance check for authenticated API clients
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    const cacheKey = `${cleanPhone}_${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

    // 1. Check Unified Result Cache (<2ms)
    const cachedResult = await CacheService.getVerification('mobile_advance_lookup', cacheKey);
    if (cachedResult && cachedResult.status) {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [MOBILE ADVANCE CACHE HIT] Returned from Cache in ${durationMs}ms: phone=${cleanPhone}`);

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
          console.error('Queue dispatch error on mobile advance cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 2. Parallel Triggering of Internal Prefill and Mobile Intelligence
    // Passing apiClient: null ensures zero internal wallet deduction / zero audit duplicates
    console.log(`📡 [MOBILE ADVANCE] Dispatching parallel sub-queries for ${cleanPhone}...`);

    const [prefillSettled, intelligenceSettled] = await Promise.allSettled([
      PrefillVerificationService.verifyMobilePrefill({
        mobile_number: cleanPhone,
        first_name: firstName,
        last_name: lastName,
        client_ref_num: clientRef,
        apiClient: null, // Zero internal charge
      }),
      MobileIntelligenceService.searchMobileIntelligence({
        phone: cleanPhone,
        client_ref_num: clientRef,
        apiClient: null, // Zero internal charge
        endpoint,
      }),
    ]);

    let prefillRes = prefillSettled.status === 'fulfilled' ? prefillSettled.value : null;
    const intelligenceRes = intelligenceSettled.status === 'fulfilled' ? intelligenceSettled.value : null;

    if (prefillSettled.status === 'rejected') {
      console.warn('⚠️ [MOBILE ADVANCE] Prefill sub-query error:', prefillSettled.reason?.message || prefillSettled.reason);
    }
    if (intelligenceSettled.status === 'rejected') {
      console.warn('⚠️ [MOBILE ADVANCE] Intelligence sub-query error:', intelligenceSettled.reason?.message || intelligenceSettled.reason);
    }

    // Extract Intelligence Data first
    const intelData = intelligenceRes?.data || {};
    const intelResult = intelligenceRes?.result || {};
    const intelPrimary = intelData?.primary_result || intelResult || {};
    const intelRecords = Array.isArray(intelData?.results) ? intelData.results : (Array.isArray(intelResult?.records) ? intelResult.records : []);
    const isIntelSuccess = Boolean(
      intelligenceRes?.status === 'success' ||
      intelligenceRes?.result_code === 101 ||
      intelRecords.length > 0 ||
      intelResult?.name
    );

    // Extract all Alternate Mobile Numbers (excluding primary phone)
    const altSources = [
      intelResult?.alt,
      intelResult?.alt_mobile,
      intelPrimary?.alt,
      intelPrimary?.mobile,
      ...intelRecords.map(r => r?.alt),
      ...intelRecords.map(r => r?.mobile),
    ].filter(Boolean).join(', ');

    const alternateNumbers = Array.from(new Set(
      altSources
        .split(/[,\s/|]+/)
        .map(n => n.replace(/\D/g, '').slice(-10))
        .filter(n => /^[6-9]\d{9}$/.test(n) && n !== cleanPhone)
    ));

    const callerIdentity = intelResult?.name || intelPrimary?.name || null;
    const relationName = intelPrimary?.fname || intelResult?.fname || null;
    const registeredId = intelPrimary?.id || intelResult?.id || null;
    const telecomOperator = intelPrimary?.operator || intelRecords[0]?.operator || intelRecords[0]?.carrier || null;
    const telecomCircle = intelPrimary?.circle || intelRecords[0]?.circle || intelRecords[0]?.location || null;

    // Extract Prefill Data
    let prefillResult =
      prefillRes?.result ||
      prefillRes?.data?.result ||
      (prefillRes?.data?.pan || prefillRes?.data?.name ? prefillRes.data : null);

    let isPrefillSuccess = Boolean(
      prefillRes?.status === 'success' ||
      prefillRes?.result_code === 101 ||
      prefillResult?.name ||
      prefillResult?.pan
    );

    // Smart Fallback: If prefill returned no profile with user-entered name, but telecom intelligence found a caller identity,
    // retry prefill with the telecom caller name!
    if (!isPrefillSuccess && callerIdentity && callerIdentity.toLowerCase() !== firstName.toLowerCase()) {
      const parts = callerIdentity.trim().split(/\s+/);
      const autoFirstName = parts[0];
      const autoLastName = parts.slice(1).join(' ') || autoFirstName;
      if (autoFirstName) {
        try {
          console.log(`🔄 [MOBILE ADVANCE] Retrying Prefill with discovered caller identity: "${autoFirstName} ${autoLastName}"`);
          const retryPrefill = await PrefillVerificationService.verifyMobilePrefill({
            mobile_number: cleanPhone,
            first_name: autoFirstName,
            last_name: autoLastName,
            client_ref_num: clientRef,
            apiClient: null,
          });
          const retryResult =
            retryPrefill?.result ||
            retryPrefill?.data?.result ||
            (retryPrefill?.data?.pan || retryPrefill?.data?.name ? retryPrefill.data : null);

          if (retryResult?.name || retryResult?.pan) {
            prefillRes = retryPrefill;
            prefillResult = retryResult;
            isPrefillSuccess = true;
            console.log('✅ [MOBILE ADVANCE] Discovered caller identity successfully matched KYC Prefill profile!');
          }
        } catch (retryErr) {
          console.warn('⚠️ [MOBILE ADVANCE] Caller retry prefill error:', retryErr.message);
        }
      }
    }

    const isSuccess = isPrefillSuccess || isIntelSuccess;
    const durationMs = Date.now() - startTime;

    // Synthesize Unified Profile
    const unifiedName =
      prefillResult?.name ||
      prefillResult?.fullname ||
      callerIdentity ||
      intelRecords[0]?.name ||
      (firstName ? `${firstName} ${lastName}`.trim() : null);

    const unifiedPan = prefillResult?.pan || null;
    const unifiedDob = prefillResult?.dob || null;
    const unifiedGender = prefillResult?.gender || null;
    const unifiedEmail = prefillResult?.email || null;
    const unifiedAddresses = Array.isArray(prefillResult?.address) && prefillResult.address.length > 0
      ? prefillResult.address
      : (intelPrimary?.address || intelResult?.address ? [{ first_line_of_address: intelPrimary?.address || intelResult?.address }] : []);

    const finalResponse = {
      status: isSuccess ? 'success' : 'failed',
      status_message: isSuccess ? 'completed' : 'no_records_found',
      http_response_code: 200,
      result_code: isSuccess ? 101 : 102,
      request_id: requestId,
      client_ref_num: clientRef,
      service: 'mobile_advance_lookup',
      summary: {
        phone: cleanPhone,
        identity_verified: isPrefillSuccess,
        telecom_intelligence_found: isIntelSuccess,
        total_telecom_records: intelData?.total_records || intelRecords.length,
        alternate_numbers_found: alternateNumbers.length,
        execution_time_ms: durationMs,
      },
      data: {
        phone: cleanPhone,
        unified_profile: {
          name: unifiedName,
          phone: cleanPhone,
          alternate_numbers: alternateNumbers,
          pan: unifiedPan,
          dob: unifiedDob,
          gender: unifiedGender,
          email: unifiedEmail,
          father_name: relationName,
          registered_id: registeredId,
          addresses: unifiedAddresses,
          telecom_circle: telecomCircle,
          telecom_operator: telecomOperator,
          confidence_score: intelResult?.confidence || intelRecords[0]?.confidence || (isPrefillSuccess ? 95 : 0),
          kyc_found: isPrefillSuccess,
          telecom_found: isIntelSuccess,
        },
        prefill: {
          status: isPrefillSuccess ? 'success' : 'not_found',
          name: prefillResult?.name || null,
          pan: unifiedPan,
          dob: unifiedDob,
          gender: unifiedGender,
          record: prefillResult,
          addresses: Array.isArray(prefillResult?.address) ? prefillResult.address : [],
        },
        intelligence: {
          status: isIntelSuccess ? 'success' : 'not_found',
          caller_name: callerIdentity,
          father_name: relationName,
          registered_id: registeredId,
          alternate_numbers: alternateNumbers,
          operator: telecomOperator,
          circle: telecomCircle,
          primary: intelResult,
          records: intelRecords,
        },
      },
      result: {
        phone: cleanPhone,
        name: unifiedName,
        pan: unifiedPan,
        dob: unifiedDob,
        gender: unifiedGender,
        email: unifiedEmail,
        father_name: relationName,
        alternate_numbers: alternateNumbers,
        registered_id: registeredId,
        addresses: unifiedAddresses,
        operator: telecomOperator,
        circle: telecomCircle,
        telecom_records: intelRecords,
      },
    };

    // Cache successful composite result in Redis for 24 hours
    if (isSuccess) {
      CacheService.setVerification('mobile_advance_lookup', cacheKey, finalResponse, 86400).catch((err) => {
        console.warn('Cache write error for mobile advance lookup:', err.message);
      });
    }

    // 3. Single Wallet Deduction & Audit Entry for Mobile Advance Lookup
    if (apiClient?.user_id) {
      QueueService.addAuditJob({
        userId: apiClient.user_id,
        credentialId: apiClient.credential_id,
        endpoint,
        method: 'POST',
        requestId,
        clientRefNum: clientRef,
        statusCode: 200,
        resultCode: isSuccess ? 101 : 102,
        durationMs,
        clientIp: apiClient.client_ip,
        cost: isSuccess ? hitCost : 0.00,
        environment: apiClient.environment || 'production',
        isSuccess,
      }).catch((err) => {
        console.error('Queue dispatch error on mobile advance completion:', err.message);
      });
    }

    return finalResponse;
  }
}

export default MobileAdvanceLookupService;
