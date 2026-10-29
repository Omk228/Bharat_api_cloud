import crypto from 'node:crypto';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { TransunionVerificationService } from '../transunion/transunion.service.js';
import { extractTransUnionFromApiResponse } from '../transunion/transunion-pdf.generator.js';
import { MobileIntelligenceService } from '../mobile_intelligence/mobileIntelligence.service.js';
import { MobileSmartPdfService } from './mobileSmartPdf.service.js';
import { ENV } from '../../../core/config/env.config.js';

// In-memory fallback map for high-speed PDF report retrieval
const localMobileSmartStore = new Map();

export class MobileSmartService {
  /**
   * Validate Indian Mobile Number (10 digits starting with 6-9, or 12 digits with 91 prefix)
   */
  static isValidMobileNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean) || /^91[6-9]\d{9}$/.test(clean);
  }

  /**
   * Validate 10-character Indian PAN
   */
  static isValidPan(pan) {
    if (!pan || typeof pan !== 'string') return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan.trim());
  }

  /**
   * Store generated report in memory and Redis cache
   */
  static async saveReport(token, reportData) {
    localMobileSmartStore.set(token, { data: reportData, expiresAt: Date.now() + 86400000 });
    try {
      await CacheService.setVerification('mobile_smart_rep', token, reportData, 86400);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Retrieve report by token
   */
  static async getReport(token) {
    const mem = localMobileSmartStore.get(token);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }
    try {
      const cached = await CacheService.getVerification('mobile_smart_rep', token);
      if (cached) return cached;
    } catch (e) {
      // ignore
    }
    return mem?.data || null;
  }

  /**
   * Helper to extract clean 10-digit Indian mobile numbers and contact details from an Intelligence response
   */
  static extractAlternateDetails(intelRes, sourcePhone, excludeSet = new Set()) {
    if (!intelRes) return [];
    const data = intelRes?.data || {};
    const result = intelRes?.result || {};
    const primary = data?.primary_result || result || {};
    const records = Array.isArray(data?.results) ? data.results : (Array.isArray(result?.records) ? result.records : []);

    const discoveredMap = new Map();

    const processCandidate = (rawNum, candName, candAddress) => {
      if (!rawNum) return;
      const cleanList = String(rawNum)
        .split(/[,\s/|]+/)
        .map((n) => n.replace(/\D/g, '').slice(-10))
        .filter((n) => /^[6-9]\d{9}$/.test(n));

      for (const num of cleanList) {
        if (num === sourcePhone || excludeSet.has(num)) continue;
        if (!discoveredMap.has(num)) {
          discoveredMap.set(num, {
            phone: num,
            name: candName || null,
            address: candAddress || null,
            alternate_of: sourcePhone,
          });
        } else {
          const existing = discoveredMap.get(num);
          if (!existing.name && candName) existing.name = candName;
          if (!existing.address && candAddress) existing.address = candAddress;
        }
      }
    };

    processCandidate(primary?.alt, primary?.name, primary?.address);
    processCandidate(primary?.mobile, primary?.name, primary?.address);
    processCandidate(result?.alt, result?.name, result?.address);
    processCandidate(result?.alt_mobile, result?.name, result?.address);

    for (const rec of records) {
      processCandidate(rec?.alt, rec?.name, rec?.address);
      processCandidate(rec?.mobile, rec?.name, rec?.address);
    }

    return Array.from(discoveredMap.values());
  }

  /**
   * Backward-compatible helper to extract flat array of clean 10-digit Indian mobile numbers
   */
  static extractAlternateNumbers(intelRes, excludePhone) {
    const details = this.extractAlternateDetails(intelRes, excludePhone);
    return details.map((d) => d.phone);
  }

  /**
   * Mobile Smart Verification Orchestrator
   * 1. Runs TransUnion Verification
   * 2. Extracts Active & Closed Loans
   * 3. Extracts all CIBIL phone numbers
   * 4. Queries Mobile Intelligence for every CIBIL number to find alternate numbers
   * 5. Generates high-fidelity, unbranded PDF report
   */
  static async verifyMobileSmart({
    forename,
    surname,
    first_name,
    last_name,
    name,
    phone,
    mobile,
    phone_number,
    pan,
    pan_id,
    gender,
    dob,
    date_of_birth,
    client_ref_num,
    apiClient,
    baseUrl = ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com',
    endpoint = '/api/v1/verify/mobile-smart',
  }) {
    const startTime = Date.now();

    // 1. Parameter Normalization
    let cleanForename = String(forename || first_name || '').trim();
    let cleanSurname = String(surname || last_name || '').trim();

    if (!cleanForename && name) {
      const parts = String(name).trim().split(/\s+/);
      cleanForename = parts[0] || '';
      cleanSurname = parts.slice(1).join(' ') || 'Kumar';
    }
    if (!cleanSurname) {
      cleanSurname = 'Kumar';
    }

    const rawPhone = String(phone || mobile || phone_number || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    const rawPan = String(pan || pan_id || '').trim().toUpperCase();
    const cleanPan = rawPan;

    const cleanGender = String(gender || 'Male').trim();
    const cleanDob = String(dob || date_of_birth || '').trim();

    const clientRef = client_ref_num || `MS_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const requestId = `req_${crypto.randomUUID()}`;

    // Validation
    if (!cleanForename) {
      throw ApiError.badRequest('Missing required parameter: forename (or first_name) is mandatory.');
    }
    if (!cleanPhone || !this.isValidMobileNumber(cleanPhone)) {
      throw ApiError.badRequest(`Invalid phone number format: "${rawPhone}". Please provide a valid 10-digit Indian mobile number.`);
    }
    if (!cleanPan || !this.isValidPan(cleanPan)) {
      throw ApiError.badRequest(`Invalid PAN format: "${rawPan}". Please provide a valid 10-character PAN.`);
    }

    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id);

    // 2. Pre-flight wallet balance check for authenticated API clients
    if (apiClient?.user_id && apiClient.wallet_balance < hitCost) {
      throw ApiError.paymentRequired(
        `Insufficient wallet balance (₹${hitCost.toFixed(2)} required, current balance: ₹${apiClient.wallet_balance.toFixed(2)}). Please recharge your wallet.`
      );
    }

    // 3. Cache lookup
    const cacheKey = `v2_${cleanPhone}_${cleanPan}`;
    const cachedResult = await CacheService.getVerification('mobile_smart_v2', cacheKey);
    if (cachedResult && cachedResult.status === 'success') {
      const durationMs = Date.now() - startTime;
      console.log(`⚡ [MOBILE SMART CACHE HIT] Returned from Cache in ${durationMs}ms: phone=${cleanPhone}, pan=${cleanPan}`);

      const cachedResponse = {
        ...cachedResult,
        http_response_code: 200,
        result_code: 101,
        request_id: requestId,
        client_ref_num: clientRef,
      };

      if (cachedResult.data?.pdf_report?.base64) {
        cachedResponse._pdfBuffer = Buffer.from(cachedResult.data.pdf_report.base64, 'base64');
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
          console.error('Queue dispatch error on mobile smart cache hit:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. STEP A: Run TransUnion Verification
    console.log(`🔍 [MOBILE SMART] Step 1: Running TransUnion verification for PAN=${cleanPan}, Phone=${cleanPhone}`);
    let tuResult = null;
    let tuError = null;

    try {
      tuResult = await TransunionVerificationService.verifyTransunionScoreHybrid({
        forename: cleanForename,
        surname: cleanSurname,
        phone_number: cleanPhone,
        gender: cleanGender,
        pan_id: cleanPan,
        date_of_birth: cleanDob,
        client_ref_num: clientRef,
        apiClient: null, // Zero internal charge / zero duplicate audit
        baseUrl,
      });
    } catch (err) {
      console.error('⚠️ [MOBILE SMART] TransUnion internal execution failed:', err.message);
      tuError = err.message;
    }

    // Check if TransUnion succeeded
    const isTuOk = Boolean(
      tuResult && (
        tuResult.result_code === 101 ||
        tuResult.http_response_code === 200 ||
        tuResult.status?.code === 200 ||
        tuResult.data?.status === 'success' ||
        tuResult._reportData
      )
    );

    if (!isTuOk) {
      const errMsg = tuError || tuResult?.message || tuResult?.status?.message || 'TransUnion CIBIL verification failed to retrieve records.';
      return {
        status: 'failed',
        status_message: 'cibil_verification_failed',
        http_response_code: 422,
        result_code: 102,
        request_id: requestId,
        client_ref_num: clientRef,
        message: errMsg,
        error: errMsg,
      };
    }

    // Extract CIBIL report data
    let reportDataToParse = tuResult._reportData || tuResult.data || tuResult;
    if (!reportDataToParse.steps && tuResult._reportToken) {
      const fetched = await TransunionVerificationService.getReport(tuResult._reportToken);
      if (fetched) reportDataToParse = fetched;
    }

    const extractedCibil = extractTransUnionFromApiResponse(reportDataToParse);
    const tradelinesFull = extractedCibil.tradelinesFull || [];
    const cibilAddresses = Array.isArray(extractedCibil.addresses) ? extractedCibil.addresses : [];

    // Filter Active vs Closed Loans
    const activeLoans = tradelinesFull.filter((t) => t.status === 'ACTIVE');
    const closedLoans = tradelinesFull.filter((t) => t.status === 'CLOSED');

    // Extract all unique 10-digit CIBIL phone numbers
    const cibilPhonesSet = new Set();
    // Include primary input phone
    if (/^[6-9]\d{9}$/.test(cleanPhone)) {
      cibilPhonesSet.add(cleanPhone);
    }
    // Include all telephones found in CIBIL report
    (extractedCibil.telephones || []).forEach((t) => {
      const cleanNum = String(t.number || '').trim().replace(/\D/g, '').slice(-10);
      if (/^[6-9]\d{9}$/.test(cleanNum)) {
        cibilPhonesSet.add(cleanNum);
      }
    });

    const cibilPhoneList = Array.from(cibilPhonesSet);
    console.log(`📱 [MOBILE SMART] Step 2: Found ${cibilPhoneList.length} CIBIL phone numbers: ${cibilPhoneList.join(', ')}`);

    // 5. STEP B: Run Multi-Hop Mobile Intelligence Discovery
    // Level 1: Find direct alternate numbers for each CIBIL phone number
    console.log(`🔎 [MOBILE SMART] Step 3: Querying Mobile Intelligence (Level 1: Direct Alternates) for ${cibilPhoneList.length} phones...`);

    const cibilContacts = await Promise.all(
      cibilPhoneList.map(async (ph) => {
        try {
          const intelRes = await MobileIntelligenceService.searchMobileIntelligence({
            phone: ph,
            apiClient: null, // Zero internal charge / zero duplicate audit
          });

          // Level 1 alternates for this CIBIL phone (excluding all CIBIL phones to avoid cycles)
          const level1Alternates = MobileSmartService.extractAlternateDetails(intelRes, ph, cibilPhonesSet);
          const contactName = intelRes?.data?.primary_result?.name || intelRes?.result?.name || null;

          return {
            phone: ph,
            is_primary: ph === cleanPhone,
            name: contactName,
            status: intelRes?.status === 'success' ? 'success' : 'no_records',
            level_1_alternates: level1Alternates,
          };
        } catch (err) {
          console.warn(`⚠️ [MOBILE SMART] Level 1 intelligence query failed for ${ph}:`, err.message);
          return {
            phone: ph,
            is_primary: ph === cleanPhone,
            name: null,
            status: 'error',
            level_1_alternates: [],
          };
        }
      })
    );

    // Build set of all discovered Level 1 numbers across all contacts
    const allL1Phones = new Set();
    cibilContacts.forEach((c) => {
      c.level_1_alternates.forEach((alt1) => allL1Phones.add(alt1.phone));
    });

    console.log(`🔎 [MOBILE SMART] Step 4: Discovered ${allL1Phones.size} Level 1 alternates. Querying Level 2 (Alternate of Alternate)...`);

    // Level 2 queries: Query each unique Level 1 phone to find ITS alternate numbers ("alternate ka bhi alternate")
    const l2QueryMap = new Map();
    const uniqueL1Array = Array.from(allL1Phones);

    await Promise.all(
      uniqueL1Array.map(async (alt1Phone) => {
        try {
          const l2Res = await MobileIntelligenceService.searchMobileIntelligence({
            phone: alt1Phone,
            apiClient: null,
          });
          l2QueryMap.set(alt1Phone, l2Res);
        } catch (err) {
          console.warn(`⚠️ [MOBILE SMART] Level 2 intelligence query failed for ${alt1Phone}:`, err.message);
          l2QueryMap.set(alt1Phone, null);
        }
      })
    );

    // Populate each Level 1 alternate with its Level 2 secondary alternates
    let totalDirectAlternates = 0;
    let totalSecondaryAlternates = 0;
    const allDiscoveredSet = new Set(cibilPhoneList);
    const globalLevel1Set = new Set();
    const globalLevel2Set = new Set();

    cibilContacts.forEach((contact) => {
      const contactDirectList = [];
      const contactSecondaryList = [];

      contact.level_1_alternates.forEach((alt1) => {
        allDiscoveredSet.add(alt1.phone);
        globalLevel1Set.add(alt1.phone);
        contactDirectList.push(alt1.phone);

        const l2Res = l2QueryMap.get(alt1.phone);
        if (l2Res) {
          // If alt1 didn't have a name, populate from its own primary lookup
          const alt1PrimaryName = l2Res?.data?.primary_result?.name || l2Res?.result?.name;
          if (!alt1.name && alt1PrimaryName) {
            alt1.name = alt1PrimaryName;
          }

          // Exclude the CIBIL phone and alt1 itself so we don't loop back
          const excludeSetForAlt2 = new Set([...cibilPhonesSet, alt1.phone]);
          const secondaryList = MobileSmartService.extractAlternateDetails(l2Res, alt1.phone, excludeSetForAlt2);

          alt1.secondary_alternates = secondaryList;
          alt1.secondary_count = secondaryList.length;

          secondaryList.forEach((alt2) => {
            allDiscoveredSet.add(alt2.phone);
            globalLevel2Set.add(alt2.phone);
            contactSecondaryList.push(alt2);
          });
        } else {
          alt1.secondary_alternates = [];
          alt1.secondary_count = 0;
        }
      });

      // Maintain backward-compatible fields as well as new rich hierarchical fields
      contact.alternate_numbers = contactDirectList;
      contact.alternate_count = contactDirectList.length;
      contact.direct_alternate_count = contactDirectList.length;
      contact.secondary_alternates = contactSecondaryList;
      contact.secondary_alternate_count = contactSecondaryList.length;
      contact.total_alternate_count = contactDirectList.length + contactSecondaryList.length;

      totalDirectAlternates += contact.direct_alternate_count;
      totalSecondaryAlternates += contact.secondary_alternate_count;
    });

    const totalAlternatesDiscovered = totalDirectAlternates + totalSecondaryAlternates;
    console.log(`✅ [MOBILE SMART] Multi-Hop Discovery Complete: ${totalDirectAlternates} Direct (L1) + ${totalSecondaryAlternates} Secondary (L2) = ${totalAlternatesDiscovered} Total Alternates`);

    // 6. STEP C: Generate High-Fidelity Mobile Smart PDF Report
    const reportToken = `ms_${crypto.randomBytes(10).toString('hex')}`;
    const reportUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/reports/mobile-smart/${reportToken}.pdf`;

    const compositeReportData = {
      request_id: requestId,
      client_ref_num: clientRef,
      status: 'success',
      phone: cleanPhone,
      primary_phone: cleanPhone,
      summary: {
        name: `${cleanForename} ${cleanSurname}`.trim(),
        primary_phone: cleanPhone,
        pan: cleanPan,
        cibil_score: extractedCibil.cibilScore || null,
        active_loans_count: activeLoans.length,
        closed_loans_count: closedLoans.length,
        total_loans_count: tradelinesFull.length,
        cibil_numbers_count: cibilContacts.length,
        direct_alternates_count: totalDirectAlternates,
        secondary_alternates_count: totalSecondaryAlternates,
        total_alternates_discovered: totalAlternatesDiscovered,
      },
      addresses: cibilAddresses,
      cibil_addresses: cibilAddresses,
      data: {
        borrower: {
          name: extractedCibil.borrower?.name || `${cleanForename} ${cleanSurname}`.trim(),
          pan: cleanPan,
          primary_phone: cleanPhone,
          gender: cleanGender,
          dob: cleanDob || extractedCibil.borrower?.dob || null,
          cibil_score: extractedCibil.cibilScore || null,
          addresses: cibilAddresses,
          address: cibilAddresses[0]?.address || null,
        },
        addresses: cibilAddresses,
        cibil_addresses: cibilAddresses,
        loans_summary: {
          total_accounts: tradelinesFull.length,
          active_loans_count: activeLoans.length,
          closed_loans_count: closedLoans.length,
          total_sanctioned: extractedCibil.totalSanctioned || 0,
          total_current_balance: extractedCibil.totalCurrentBalance || 0,
          total_overdue: extractedCibil.totalOverdue || 0,
          active_loans: activeLoans,
          closed_loans: closedLoans,
        },
        cibil_contacts: cibilContacts,
        all_discovered_numbers: Array.from(allDiscoveredSet),
        level_1_alternates: Array.from(globalLevel1Set),
        level_2_alternates: Array.from(globalLevel2Set),
      },
    };

    let pdfBuffer = null;
    let pdfBase64 = null;

    try {
      pdfBuffer = await MobileSmartPdfService.generatePdf(compositeReportData);
      if (pdfBuffer && pdfBuffer.length > 0) {
        pdfBase64 = pdfBuffer.toString('base64');
      }
    } catch (pdfErr) {
      console.warn('⚠️ [MOBILE SMART] PDF Generation error:', pdfErr.message);
    }

    // Save report data for standalone retrieval
    await this.saveReport(reportToken, {
      ...compositeReportData,
      _pdfBase64: pdfBase64,
    });

    const durationMs = Date.now() - startTime;

    // 7. Synthesize Final Composite Response
    const finalResponse = {
      status: 'success',
      status_message: 'completed',
      http_response_code: 200,
      result_code: 101,
      request_id: requestId,
      client_ref_num: clientRef,
      summary: compositeReportData.summary,
      data: {
        ...compositeReportData.data,
        pdf_report: {
          format: 'pdf',
          filename: `mobile_smart_report_${cleanPhone}.pdf`,
          base64: pdfBase64,
          download_url: reportUrl,
        },
        report_url: reportUrl,
      },
      _pdfBuffer: pdfBuffer,
    };

    // 8. Cache response for 24 hours
    const cachePayload = { ...finalResponse };
    delete cachePayload._pdfBuffer;
    CacheService.setVerification('mobile_smart_v2', cacheKey, cachePayload, 86400).catch((err) => {
      console.warn('Cache write error for mobile smart:', err.message);
    });

    // 9. Deduct wallet & dispatch audit job for authenticated client
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
        console.error('Queue dispatch error for mobile smart audit:', err.message);
      });
    }

    return finalResponse;
  }
}

export default MobileSmartService;
