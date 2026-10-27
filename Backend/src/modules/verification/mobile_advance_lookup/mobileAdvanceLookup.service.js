import crypto from 'node:crypto';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { PrefillVerificationService } from '../prefill/prefill.service.js';
import { MobileIntelligenceService } from '../mobile_intelligence/mobileIntelligence.service.js';
import { MobileAdvanceLookupPdfService } from './mobileAdvanceLookupPdf.service.js';

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
   * Helper to extract clean 10-digit Indian mobile numbers from an Intelligence response
   */
  static extractAlternateNumbers(intelRes, excludePhone) {
    if (!intelRes) return [];
    const data = intelRes?.data || {};
    const result = intelRes?.result || {};
    const primary = data?.primary_result || result || {};
    const records = Array.isArray(data?.results) ? data.results : (Array.isArray(result?.records) ? result.records : []);

    const altSources = [
      result?.alt,
      result?.alt_mobile,
      primary?.alt,
      primary?.mobile,
      ...records.map((r) => r?.alt),
      ...records.map((r) => r?.mobile),
    ].filter(Boolean).join(', ');

    return Array.from(new Set(
      altSources
        .split(/[,\s/|]+/)
        .map((n) => n.replace(/\D/g, '').slice(-10))
        .filter((n) => /^[6-9]\d{9}$/.test(n) && n !== excludePhone)
    ));
  }

  /**
   * Multi-Level Recursive Alternate Discovery (Depth 1 to 3 with Cycle/Duplicate Prevention)
   * Stopping conditions:
   * 1. Max Depth = 3 (Leaves analyzed without further recursion)
   * 2. Visited / Loop detection (Same number returned in alternate branches halts immediately)
   * 3. No alternates found
   */
  static async discoverAlternateNetwork({
    rootPhone,
    rootAlternates = [],
    endpoint = '/api/v1/verify/mobile-advance-lookup',
    maxDepth = 3,
    maxBranchesPerLevel = 6,
  }) {
    const visited = new Set([rootPhone]);
    const network = {
      root_phone: rootPhone,
      max_depth: maxDepth,
      unique_numbers_count: 1,
      loops_prevented_count: 0,
      levels: {
        level_1: [],
        level_2: [],
        level_3: [],
      },
    };

    // Helper for resilient individual mobile intelligence query
    const fetchNodeIntelligence = async (phoneToQuery, parentPhone) => {
      try {
        const intelRes = await MobileIntelligenceService.searchMobileIntelligence({
          phone: phoneToQuery,
          client_ref_num: `ADV_ALT_${phoneToQuery.slice(-4)}`,
          apiClient: null, // Zero internal charge
          endpoint,
        });

        const data = intelRes?.data || {};
        const result = intelRes?.result || {};
        const primary = data?.primary_result || result || {};
        const records = Array.isArray(data?.results) ? data.results : (Array.isArray(result?.records) ? result.records : []);

        const callerName = result?.name || primary?.name || records[0]?.name || null;
        const operator = primary?.operator || records[0]?.operator || records[0]?.carrier || null;
        const circle = primary?.circle || records[0]?.circle || records[0]?.location || null;
        const fatherName = primary?.fname || result?.fname || null;
        const address = primary?.address || result?.address || records[0]?.address || null;
        const confidence = result?.confidence || primary?.confidence || (records[0] ? 85 : 0);

        const childAlternates = MobileAdvanceLookupService.extractAlternateNumbers(intelRes, phoneToQuery);

        return {
          phone: phoneToQuery,
          parent_phone: parentPhone,
          caller_name: callerName,
          operator,
          circle,
          father_name: fatherName,
          address,
          confidence,
          alternate_numbers: childAlternates,
          loop_detected: false,
          is_duplicate: false,
        };
      } catch (err) {
        console.warn(`⚠️ [ADVANCE NETWORK] Failed to query intelligence for alternate ${phoneToQuery}:`, err.message);
        return {
          phone: phoneToQuery,
          parent_phone: parentPhone,
          caller_name: null,
          operator: null,
          circle: null,
          father_name: null,
          address: null,
          confidence: 0,
          alternate_numbers: [],
          loop_detected: false,
          is_duplicate: false,
          error: err.message,
        };
      }
    };

    // --- LEVEL 1: Direct Alternates from Root ---
    const level1Candidates = (rootAlternates || []).slice(0, maxBranchesPerLevel);
    const level1FetchPromises = [];

    for (const phone of level1Candidates) {
      if (visited.has(phone)) {
        network.loops_prevented_count += 1;
        network.levels.level_1.push({
          phone,
          parent_phone: rootPhone,
          loop_detected: true,
          is_duplicate: true,
          caller_name: null,
          alternate_numbers: [],
        });
      } else {
        visited.add(phone);
        level1FetchPromises.push(fetchNodeIntelligence(phone, rootPhone));
      }
    }

    const level1Settled = await Promise.allSettled(level1FetchPromises);
    for (const res of level1Settled) {
      if (res.status === 'fulfilled' && res.value) {
        network.levels.level_1.push(res.value);
      }
    }

    // --- LEVEL 2: Secondary Alternates from Level 1 ---
    const level2Candidates = [];
    for (const l1Node of network.levels.level_1) {
      if (l1Node.loop_detected) continue;
      const childAlts = l1Node.alternate_numbers || [];
      for (const alt of childAlts) {
        level2Candidates.push({ phone: alt, parentPhone: l1Node.phone });
      }
    }

    const limitedLevel2 = level2Candidates.slice(0, maxBranchesPerLevel);
    const level2FetchPromises = [];

    for (const item of limitedLevel2) {
      if (visited.has(item.phone)) {
        network.loops_prevented_count += 1;
        network.levels.level_2.push({
          phone: item.phone,
          parent_phone: item.parentPhone,
          loop_detected: true,
          is_duplicate: true,
          caller_name: null,
          alternate_numbers: [],
        });
      } else {
        visited.add(item.phone);
        level2FetchPromises.push(fetchNodeIntelligence(item.phone, item.parentPhone));
      }
    }

    const level2Settled = await Promise.allSettled(level2FetchPromises);
    for (const res of level2Settled) {
      if (res.status === 'fulfilled' && res.value) {
        network.levels.level_2.push(res.value);
      }
    }

    // --- LEVEL 3: Tertiary Alternates from Level 2 (STOP CONDITION: DEPTH 3 REACHED) ---
    const level3Candidates = [];
    for (const l2Node of network.levels.level_2) {
      if (l2Node.loop_detected) continue;
      const childAlts = l2Node.alternate_numbers || [];
      for (const alt of childAlts) {
        level3Candidates.push({ phone: alt, parentPhone: l2Node.phone });
      }
    }

    const limitedLevel3 = level3Candidates.slice(0, maxBranchesPerLevel);
    const level3FetchPromises = [];

    for (const item of limitedLevel3) {
      if (visited.has(item.phone)) {
        network.loops_prevented_count += 1;
        network.levels.level_3.push({
          phone: item.phone,
          parent_phone: item.parentPhone,
          loop_detected: true,
          is_duplicate: true,
          caller_name: null,
          alternate_numbers: [],
        });
      } else {
        visited.add(item.phone);
        level3FetchPromises.push(fetchNodeIntelligence(item.phone, item.parentPhone));
      }
    }

    const level3Settled = await Promise.allSettled(level3FetchPromises);
    for (const res of level3Settled) {
      if (res.status === 'fulfilled' && res.value) {
        const node = res.value;
        // Strictly enforce max depth 3: do NOT traverse any further
        node.depth_limit_reached = true;
        network.levels.level_3.push(node);
      }
    }

    network.unique_numbers_count = visited.size;
    return network;
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

      if (cachedResult.data?.pdf_base64 || cachedResult.pdf_base64) {
        cachedResponse._pdfBuffer = Buffer.from(cachedResult.data?.pdf_base64 || cachedResult.pdf_base64, 'base64');
      }

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

    // 3. Multi-Level Recursive Alternate Discovery (Depth 1 to 3 with Loop/Cycle Prevention)
    console.log(`🌐 [MOBILE ADVANCE] Initiating recursive alternate discovery up to Depth 3 for ${cleanPhone}...`);
    const networkGraph = await this.discoverAlternateNetwork({
      rootPhone: cleanPhone,
      rootAlternates: alternateNumbers,
      endpoint,
      maxDepth: 3,
    });
    console.log(`✅ [MOBILE ADVANCE] Network mapped: ${networkGraph.unique_numbers_count} unique contacts, ${networkGraph.loops_prevented_count} loops prevented.`);

    // 4. High-Fidelity PDF Report Generation
    let pdfBuffer = null;
    let pdfBase64 = null;
    try {
      pdfBuffer = await MobileAdvanceLookupPdfService.generatePdf({
        phone: cleanPhone,
        status: isSuccess ? 'success' : 'failed',
        request_id: requestId,
        client_ref_num: clientRef,
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
        },
        network_graph: networkGraph,
        summary: {
          phone: cleanPhone,
          identity_verified: isPrefillSuccess,
          telecom_intelligence_found: isIntelSuccess,
          total_telecom_records: intelData?.total_records || intelRecords.length,
          alternate_numbers_found: alternateNumbers.length,
        },
      });

      if (pdfBuffer && pdfBuffer.length > 0) {
        pdfBase64 = pdfBuffer.toString('base64');
      }
    } catch (pdfErr) {
      console.warn('⚠️ [MOBILE ADVANCE] PDF Generation error (continuing API):', pdfErr.message);
    }

    // Aggregate all unique alternate numbers discovered across all levels (excluding root target)
    const allDiscoveredAlternates = Array.from(new Set([
      ...alternateNumbers,
      ...(networkGraph?.levels?.level_1?.map((n) => n.phone) || []),
      ...(networkGraph?.levels?.level_2?.map((n) => n.phone) || []),
      ...(networkGraph?.levels?.level_3?.map((n) => n.phone) || []),
    ])).filter((n) => n && n !== cleanPhone);

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
        alternate_numbers_found: allDiscoveredAlternates.length,
        direct_alternate_numbers_found: alternateNumbers.length,
        network_depth_scanned: 3,
        total_network_numbers_discovered: networkGraph?.unique_numbers_count || (1 + allDiscoveredAlternates.length),
        loops_prevented: networkGraph?.loops_prevented_count || 0,
        pdf_generated: Boolean(pdfBase64),
        execution_time_ms: durationMs,
      },
      data: {
        phone: cleanPhone,
        unified_profile: {
          name: unifiedName,
          phone: cleanPhone,
          alternate_numbers: allDiscoveredAlternates,
          direct_alternate_numbers: alternateNumbers,
          all_network_numbers: allDiscoveredAlternates,
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
        network_graph: networkGraph,
        alternate_tree: networkGraph?.levels || { level_1: [], level_2: [], level_3: [] },
        pdf_report: {
          format: 'pdf',
          filename: `mobile_advance_report_${cleanPhone}.pdf`,
          base64: pdfBase64,
        },
        pdf_base64: pdfBase64,
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
        alternate_numbers: allDiscoveredAlternates,
        direct_alternate_numbers: alternateNumbers,
        all_network_numbers: allDiscoveredAlternates,
        registered_id: registeredId,
        addresses: unifiedAddresses,
        operator: telecomOperator,
        circle: telecomCircle,
        telecom_records: intelRecords,
        network_graph: networkGraph,
        pdf_base64: pdfBase64,
      },
      _pdfBuffer: pdfBuffer,
    };

    // Cache successful composite result in Redis for 24 hours (excluding raw _pdfBuffer)
    if (isSuccess) {
      const cachePayload = { ...finalResponse };
      delete cachePayload._pdfBuffer;
      CacheService.setVerification('mobile_advance_lookup', cacheKey, cachePayload, 86400).catch((err) => {
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
