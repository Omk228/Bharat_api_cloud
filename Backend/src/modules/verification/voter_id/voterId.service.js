import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class VoterIdService {
  /**
   * Helper to normalize voter ID details from raw response
   */
  static extractVoterDetails(item, cleanEpicNo) {
    if (!item) return null;

    // Deeply inspect nested API Saathi structures if present (e.g. item.raw.result, item.details, item.result, item.data)
    const deepObj =
      (item.raw && typeof item.raw === 'object' && item.raw.result) ||
      (item.details && typeof item.details === 'object' ? item.details : null) ||
      (item.result && typeof item.result === 'object' ? item.result : null) ||
      (item.data && typeof item.data === 'object' ? item.data : null) ||
      {};

    const pick = (...keys) => {
      // 1. Try deepObj first for non-empty string/number
      for (const k of keys) {
        const val = deepObj[k];
        if (val !== undefined && val !== null) {
          const s = String(val).trim();
          if (s !== '' && s !== 'null' && s !== 'undefined') return s;
        }
      }
      // 2. Try top-level item next
      for (const k of keys) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const s = String(val).trim();
          if (s !== '' && s !== 'null' && s !== 'undefined') return s;
        }
      }
      return '';
    };

    const epicNo = (
      pick('epic_no', 'epicNo', 'epic_number', 'epicNumber', 'voter_id', 'voterId', 'id_number') ||
      cleanEpicNo ||
      ''
    ).toUpperCase();

    const name = pick('name', 'name_fn', 'voter_name', 'voterName', 'applicant_name', 'full_name');
    const nameV1 = pick('name_v1', 'name_fn_v1', 'voter_name_v1');

    const relationName = pick('rln_name', 'relation_name', 'relationName', 'relative_name', 'father_name', 'husband_name');
    const relationNameV1 = pick('rln_name_v1', 'relation_name_v1');

    // For relation type: don't accept generic placeholder 'RELATION' if deep object has specific code like 'H' or 'F'
    let rawRlnType = '';
    for (const k of ['rln_type', 'relation_type', 'relationType']) {
      const v = deepObj[k] || item[k];
      if (v && String(v).trim().toUpperCase() !== 'RELATION') {
        rawRlnType = String(v).trim().toUpperCase();
        break;
      }
    }
    if (!rawRlnType) {
      rawRlnType = pick('rln_type', 'relation_type', 'relationType') ||
        (pick('father_name') ? 'FATHER' : pick('husband_name') ? 'HUSBAND' : 'RELATION');
    }

    const gender = pick('gender', 'sex').toUpperCase();
    const genderV1 = pick('gender_v1');
    const age = pick('age');
    const dob = pick('dob', 'date_of_birth', 'birthYear');

    const state = pick('st_name', 'state', 'state_name');
    const stateV1 = pick('state_v1');
    const stateCode = pick('st_code', 'state_code');

    const district = pick('dist_name', 'district', 'district_name');
    const distNameV1 = pick('dist_name_v1');
    const distNo = pick('dist_no', 'district_no');

    const assemblyConstituency = pick('ac_name', 'assembly_constituency', 'assemblyConstituency', 'ac');
    const assemblyConstituencyV1 = pick('ac_name_v1');
    const assemblyConstituencyNumber = pick('ac_no', 'assembly_constituency_number', 'ac_number');

    const parliamentaryConstituency = pick('pc_name', 'parliamentary_constituency', 'parliamentaryConstituency', 'pc');
    const pcNameV1 = pick('pc_name_v1');
    const parliamentaryConstituencyNumber = pick('pc_no', 'parliamentary_constituency_number', 'pc_number');

    const pollingStation = pick('ps_name', 'polling_station', 'pollingStation', 'polling_booth');
    const psNameV1 = pick('ps_name_v1');
    const pollingStationNumber = pick('ps_no', 'polling_station_no');

    const partNumber = pick('part_no', 'part_number', 'partNumber');
    const partName = pick('part_name', 'partName');
    const partNameV1 = pick('part_name_v1');

    const serialNumber = pick('slno_inpart', 'serial_number', 'serialNumber', 'sl_no');
    const sectionNumber = pick('section_no', 'section_number', 'sectionNumber');

    const psbuildingName = pick('psbuildingName', 'ps_building_name', 'building_name');
    const psBuildingNameL1 = pick('psBuildingNameL1', 'psbuilding_name_l1');
    const buildingAddress = pick('buildingAddress', 'building_address');

    const lastUpdate = pick('last_update', 'lastUpdate');
    const createdDttm = pick('createdDttm', 'created_dttm');
    const eciId = pick('id', 'eci_id');
    const isActive = pick('isActive', 'is_active');

    const status = (pick('status') || (name ? 'VALID' : 'Unknown')).toUpperCase();

    return {
      epic_no: epicNo,
      name,
      name_v1: nameV1 || null,
      relation_name: relationName || null,
      relation_type: rawRlnType || 'RELATION',
      rln_name: relationName || null,
      rln_name_v1: relationNameV1 || null,
      rln_type: rawRlnType || null,
      gender: gender || null,
      gender_v1: genderV1 || null,
      age: age || null,
      dob: dob || null,
      state: state || null,
      st_name: state || null,
      state_v1: stateV1 || null,
      st_code: stateCode || null,
      district: district || null,
      dist_name: district || null,
      dist_name_v1: distNameV1 || null,
      dist_no: distNo || null,
      assembly_constituency: assemblyConstituency || null,
      assembly_constituency_number: assemblyConstituencyNumber || null,
      ac_name: assemblyConstituency || null,
      ac_name_v1: assemblyConstituencyV1 || null,
      ac_no: assemblyConstituencyNumber || null,
      parliamentary_constituency: parliamentaryConstituency || null,
      parliamentary_constituency_number: parliamentaryConstituencyNumber || null,
      pc_name: parliamentaryConstituency || null,
      pc_name_v1: pcNameV1 || null,
      pc_no: parliamentaryConstituencyNumber || null,
      polling_station: pollingStation || null,
      ps_name: pollingStation || null,
      ps_name_v1: psNameV1 || null,
      ps_no: pollingStationNumber || null,
      part_number: partNumber || null,
      part_no: partNumber || null,
      part_name: partName || null,
      part_name_v1: partNameV1 || null,
      serial_number: serialNumber || null,
      slno_inpart: serialNumber || null,
      section_number: sectionNumber || null,
      section_no: sectionNumber || null,
      psbuilding_name: psbuildingName || null,
      psbuildingName: psbuildingName || null,
      psbuilding_name_l1: psBuildingNameL1 || null,
      psBuildingNameL1: psBuildingNameL1 || null,
      building_address: buildingAddress || null,
      buildingAddress: buildingAddress || null,
      last_update: lastUpdate || null,
      created_dttm: createdDttm || null,
      createdDttm: createdDttm || null,
      id: eciId || null,
      is_active: isActive !== '' ? isActive : true,
      status: status || 'VALID',
      raw_data: item,
    };
  }

  /**
   * Normalize Voter ID data from upstream gateway
   */
  static normalizeVoterIdData(rawData, cleanEpicNo) {
    if (!rawData) {
      return {
        epic_no: cleanEpicNo,
        verified: false,
        name: '',
        relation_name: '',
        relation_type: '',
        gender: '',
        status: 'Not Found',
        raw_data: null,
      };
    }

    const payload =
      rawData.result?.result ||
      rawData.raw?.result ||
      rawData.data?.raw_data?.raw?.result ||
      rawData.data?.raw_data?.details ||
      rawData.data?.result ||
      rawData.result ||
      rawData.data ||
      rawData;
    const voter = VoterIdService.extractVoterDetails(payload, cleanEpicNo);

    const verified = Boolean(
      payload.verified ||
      rawData.verified ||
      payload.name ||
      payload.voter_name ||
      payload.epic_no ||
      voter?.name
    );

    return {
      epic_no: cleanEpicNo,
      verified,
      ...voter,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for Voter ID
   */
  static async verifyVoterId({ epic_no, client_ref_num, apiClient, endpoint = '/api/v1/verify/voter-id' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `VOTER_${Date.now()}`;

    // 1. Input Validation
    if (!epic_no || typeof epic_no !== 'string' || !epic_no.trim()) {
      throw ApiError.badRequest('Missing required parameter: epic_no (Voter ID / EPIC Number).');
    }

    // Clean EPIC number: uppercase and strip out all non-alphanumeric characters (spaces, dashes)
    const cleanEpicNo = epic_no.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanEpicNo.length < 5 || cleanEpicNo.length > 20) {
      throw ApiError.badRequest('Invalid Voter ID (EPIC) format. Must be 6 to 16 alphanumeric characters (e.g. ABC1234567, WBS1234567).');
    }

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cacheKey = cleanEpicNo.toLowerCase();
    const cachedData = await CacheService.getVerification('voter_id', cacheKey);
    if (cachedData) {
      console.log(`⚡ [VOTER ID CACHE] Serving cached record for: "${cleanEpicNo}"`);
      const durationMs = Date.now() - startTime;

      // Re-extract from raw_data so newly added fields (rln_name_v1, st_code, dist_no, etc.) are always present
      const rawPayload =
        cachedData.data?.raw_data ||
        cachedData.result?.raw_data ||
        cachedData.raw_data ||
        cachedData.data ||
        cachedData.result;

      let enhancedData = cachedData.data || cachedData.result || {};
      if (rawPayload && typeof rawPayload === 'object') {
        const reExtracted = VoterIdService.extractVoterDetails(rawPayload, cleanEpicNo);
        enhancedData = {
          ...enhancedData,
          ...reExtracted,
          raw_data: rawPayload,
        };
      }

      const cachedResponse = {
        ...cachedData,
        data: enhancedData,
        result: enhancedData,
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
          console.error('Queue dispatch error on cache hit in voter_id:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getVoterIdCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/voter-id-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [VOTER ID GATEWAY] Calling Upstream Gateway for EPIC: ${cleanEpicNo}`);

      // API Saathi voter-id-v1 expects: { epic_no: "..." }
      let upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          epic_no: cleanEpicNo,
        }),
        timeout: creds.timeoutMs || 25000,
      });

      let responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [VOTER ID PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      // If upstream failed with 400/422 and specifically asks for epic_number or voter_id, fallback retry
      if (!upstreamRes.ok && responseText && (responseText.toLowerCase().includes('epic_number') || responseText.toLowerCase().includes('voter_id'))) {
        const altKey = responseText.toLowerCase().includes('epic_number') ? 'epic_number' : 'voter_id';
        console.log(`🔄 [VOTER ID GATEWAY] Retrying with ${altKey} parameter for ${cleanEpicNo}...`);
        try {
          const retryRes = await upstreamFetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              [altKey]: cleanEpicNo,
            }),
            timeout: creds.timeoutMs || 25000,
          });
          const retryText = await retryRes.text();
          let retryJson = null;
          try { retryJson = JSON.parse(retryText); } catch (_) {}
          if (retryRes.ok || retryJson) {
            upstreamRes = retryRes;
            responseText = retryText;
            responseJson = retryJson;
          }
        } catch (_) {}
      }

      if (upstreamRes.ok && responseJson) {
        // Upstream might return HTTP 200 with an error object
        if (responseJson.status === false || responseJson.success === false) {
          isSuccess = false;
          statusCode = 400;
          resultCode = 102;
          upstreamData = responseJson;
        } else {
          upstreamData = responseJson;
          isSuccess = true;
          statusCode = 200;
          resultCode = 101;
        }
      } else {
        statusCode = upstreamRes.status || 400;
        resultCode = 102;
        upstreamData = responseJson || { raw: responseText };

        // Check if upstream low balance
        if (isUpstreamLowBalance(statusCode, responseText, responseJson)) {
          console.error(`🚨 [VOTER ID LOW BALANCE] Upstream returned low balance:`, responseText);
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

        console.error(`❌ [VOTER ID ERROR] Gateway error status ${statusCode}:`, responseText);
      }
    } catch (networkErr) {
      console.error(`💥 [VOTER ID NETWORK ERROR] Connection failure:`, networkErr.message);
      statusCode = 502;
      resultCode = 105;
      upstreamData = { error: networkErr.message };
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalize Data
    const normalizedData = VoterIdService.normalizeVoterIdData(upstreamData, cleanEpicNo);

    // Check if normalized details indicate genuine verification
    if (isSuccess && !normalizedData.name) {
      if (upstreamData?.status === false || upstreamData?.message?.toLowerCase().includes('not found')) {
        isSuccess = false;
        statusCode = 404;
        resultCode = 102;
      }
    }

    // 6. Cache on Success
    if (isSuccess && normalizedData && normalizedData.verified) {
      await CacheService.setVerification('voter_id', cacheKey, {
        http_response_code: 200,
        result_code: 101,
        status: 'success',
        success: true,
        data: normalizedData,
        result: normalizedData,
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
        console.error('Queue dispatch error in voter_id:', err.message);
      });
    }

    const errorMsg =
      upstreamData?.message ||
      upstreamData?.detail ||
      upstreamData?.error ||
      upstreamData?.msg ||
      (typeof upstreamData?.raw === 'string' && upstreamData.raw.length < 200 ? upstreamData.raw : null) ||
      (statusCode === 400
        ? 'Invalid Voter ID (EPIC) number or record not found in Election Commission registry.'
        : 'Failed to verify Voter ID details');

    // Return unified API response matching all other verification services
    return {
      http_response_code: isSuccess ? 200 : statusCode,
      result_code: isSuccess ? 101 : resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? (normalizedData.name
            ? `Successfully verified Voter ID details for ${cleanEpicNo}.`
            : `Voter ID verification completed for ${cleanEpicNo}.`)
        : errorMsg,
      status: isSuccess ? 'success' : 'error',
      success: isSuccess,
      result: normalizedData,
      data: normalizedData,
      raw_data: upstreamData,
    };
  }
}

export default VoterIdService;
