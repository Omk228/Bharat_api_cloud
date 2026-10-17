import crypto from 'node:crypto';
import { credentialResolver } from '../../../core/credentials/credentialResolver.js';
import { upstreamFetch } from '../../../core/utils/httpAgent.js';
import CacheService from '../../../core/cache/cache.service.js';
import QueueService from '../../../core/queue/queue.service.js';
import { getEffectiveApiPrice } from '../../../core/config/pricing.config.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { isUpstreamLowBalance, formatUpstreamLowBalanceResponse } from '../../../core/utils/upstreamHelper.js';

export class VehicleRcService {
  /**
   * Helper to normalize vehicle RC details from raw response
   */
  static extractVehicleDetails(item, cleanVehicleNumber) {
    if (!item) return null;

    const rcNumber = String(
      item.reg_number ||
      item.vehicle_number ||
      item.rc_number ||
      item.reg_no ||
      item.registration_number ||
      cleanVehicleNumber ||
      ''
    ).trim().toUpperCase();

    const ownerName = String(
      item.owner_name ||
      item.ownerName ||
      item.owner ||
      item.registered_owner ||
      item.first_name ||
      item.name ||
      ''
    ).trim();

    const fatherName = String(
      item.father_name ||
      item.fatherName ||
      item.fathers_name ||
      ''
    ).trim();

    const makerModel = String(
      item.maker_model ||
      item.makerModel ||
      (item.maker && item.model ? `${item.maker} ${item.model}` : '') ||
      item.maker ||
      item.model ||
      item.vehicle_model ||
      item.manufacturer ||
      ''
    ).trim();

    const vehicleClass = String(
      item.vehicle_class ||
      item.vehicleClass ||
      item.class ||
      item.vehicle_category ||
      item.category ||
      item.type ||
      ''
    ).trim();

    const fuelType = String(
      item.fuel_type ||
      item.fuelType ||
      item.fuel_descr ||
      item.fuel ||
      ''
    ).trim();

    const regDate = String(
      item.reg_date ||
      item.registration_date ||
      item.registrationDate ||
      item.registered_on ||
      item.issue_date ||
      ''
    ).trim();

    const fitnessUpto = String(
      item.fitness_upto ||
      item.fitnessUpto ||
      item.fitness_validity ||
      item.fitness_date ||
      ''
    ).trim();

    const insuranceUpto = String(
      item.insurance_upto ||
      item.insuranceUpto ||
      item.insurance_validity ||
      item.insurance_expiry ||
      item.insurance_date ||
      ''
    ).trim();

    const insuranceCompany = String(
      item.insurance_company ||
      item.insuranceCompany ||
      item.insurer ||
      item.insurance_name ||
      ''
    ).trim();

    const policyNumber = String(
      item.insurance_policy_number ||
      item.policy_number ||
      item.policyNumber ||
      item.insurance_policy_no ||
      item.policy_no ||
      ''
    ).trim();

    const pucUpto = String(
      item.pollution_upto ||
      item.pollutionUpto ||
      item.pucc_upto ||
      item.puc_validity ||
      item.puc_upto ||
      ''
    ).trim();

    const roadTaxUpto = String(
      item.road_tax_upto ||
      item.roadTaxUpto ||
      item.tax_upto ||
      item.tax_validity ||
      item.tax_paid_upto ||
      ''
    ).trim();

    const isFinanced = item.financed === true;
    const financer = String(
      item.financier ||
      item.financer ||
      item.financer_name ||
      item.hypothecation ||
      (item.financed === false ? 'Unencumbered / None' : '') ||
      (isFinanced ? 'Financed' : '') ||
      ''
    ).trim();

    const rtoName = String(
      item.rto ||
      item.rto_name ||
      item.rtoName ||
      item.registered_at ||
      item.registering_authority ||
      ''
    ).trim();

    const state = String(
      item.state ||
      item.state_name ||
      item.state_code ||
      ''
    ).trim();

    const status = String(
      item.status ||
      item.rc_status ||
      item.vehicle_status ||
      (ownerName || makerModel ? 'ACTIVE' : 'Unknown')
    ).trim().toUpperCase();

    const color = String(item.color || item.vehicle_color || '').trim();
    const cubicCapacity = String(item.cubic_capacity || item.cc || item.engine_capacity || '').trim();
    const seatingCapacity = String(item.seating_capacity || item.seats || item.seat_capacity || '').trim();
    const chassisNumber = String(item.chassis_number || item.chassis_no || item.chassis || '').trim();
    const engineNumber = String(item.engine_number || item.engine_no || item.engine || '').trim();
    const norms = String(item.norm_type || item.norms || item.emission_norms || item.pollution_norms || '').trim();
    const unladenWeight = String(item.unladen_weight || item.weight || '').trim();
    const grossWeight = String(item.gross_vehicle_weight || item.gvw || '').trim();
    const blacklisted = Boolean(item.blacklisted);

    return {
      vehicle_number: rcNumber,
      owner_name: ownerName,
      father_name: fatherName || null,
      maker_model: makerModel,
      vehicle_class: vehicleClass,
      fuel_type: fuelType,
      registration_date: regDate,
      fitness_upto: fitnessUpto,
      insurance_upto: insuranceUpto,
      insurance_company: insuranceCompany,
      policy_number: policyNumber,
      pollution_upto: pucUpto,
      road_tax_upto: roadTaxUpto,
      financer: financer || (isFinanced ? 'Yes' : null),
      is_financed: isFinanced,
      rto_name: rtoName,
      state: state,
      status: status,
      blacklisted,
      color: color || null,
      cubic_capacity: cubicCapacity || null,
      seating_capacity: seatingCapacity || null,
      chassis_number: chassisNumber || null,
      engine_number: engineNumber || null,
      norms: norms || null,
      unladen_weight: unladenWeight || null,
      gross_vehicle_weight: grossWeight || null,
      raw_data: item,
    };
  }

  /**
   * Normalize Vehicle RC data from upstream gateway
   */
  static normalizeVehicleRcData(rawData, cleanVehicleNumber) {
    if (!rawData) {
      return {
        vehicle_number: cleanVehicleNumber,
        verified: false,
        owner_name: '',
        maker_model: '',
        vehicle_class: '',
        fuel_type: '',
        status: 'Not Found',
        raw_data: null,
      };
    }

    const payload = rawData.data || rawData.result || rawData;
    const vehicle = VehicleRcService.extractVehicleDetails(payload, cleanVehicleNumber);

    const verified = Boolean(
      payload.verified ||
      rawData.verified ||
      payload.owner_name ||
      payload.maker ||
      payload.maker_model ||
      payload.reg_number ||
      payload.vehicle_number ||
      vehicle?.owner_name ||
      vehicle?.maker_model
    );

    return {
      vehicle_number: cleanVehicleNumber,
      verified,
      ...vehicle,
      raw_data: payload,
    };
  }

  /**
   * Main verification handler for Vehicle RC
   */
  static async verifyVehicleRc({ vehicle_number, client_ref_num, apiClient, endpoint = '/api/v1/verify/vehicle-rc' }) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;
    const clientRef = client_ref_num || `RC_${Date.now()}`;

    // 1. Input Validation
    if (!vehicle_number || typeof vehicle_number !== 'string' || !vehicle_number.trim()) {
      throw ApiError.badRequest('Missing required parameter: vehicle_number (Vehicle Registration / RC Number).');
    }

    // Clean vehicle number: uppercase and strip out all non-alphanumeric characters (spaces, dashes)
    const cleanVehicleNumber = vehicle_number.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanVehicleNumber.length < 5 || cleanVehicleNumber.length > 15) {
      throw ApiError.badRequest('Invalid vehicle registration number format (e.g. DL01AB1234, MH12DE1432).');
    }

    // 2. Fetch Pricing
    const hitCost = await getEffectiveApiPrice(endpoint, apiClient?.user_id || null);

    // 3. Cache Layer (Check 24-hour verification cache)
    const cacheKey = cleanVehicleNumber.toLowerCase();
    const cachedData = await CacheService.getVerification('vehicle_rc', cacheKey);
    if (cachedData) {
      console.log(`⚡ [VEHICLE RC CACHE] Serving cached record for: "${cleanVehicleNumber}"`);
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
          console.error('Queue dispatch error on cache hit in vehicle_rc:', err.message);
        });
      }

      return cachedResponse;
    }

    // 4. Resolve Upstream Gateway Credentials
    const creds = await credentialResolver.getVehicleRcCredentials();
    const upstreamUrl = creds.baseUrl || 'https://apisathi.in/gw/v1/vehicle-rc-v1/';
    const apiKey = creds.apiKey || 'live_oFRVobuxRsK8UZ6U4zp2gxahjPM4fNe7';

    let upstreamData = null;
    let isSuccess = false;
    let statusCode = 200;
    let resultCode = 101;

    try {
      console.log(`📡 [VEHICLE RC GATEWAY] Calling Upstream Gateway for Vehicle: ${cleanVehicleNumber}`);

      // API Saathi vehicle-rc-v1 expects { rc_number: "..." }
      let upstreamRes = await upstreamFetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          rc_number: cleanVehicleNumber,
        }),
        timeout: creds.timeoutMs || 25000,
      });

      let responseText = await upstreamRes.text();
      let responseJson = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`⚠️ [VEHICLE RC PARSE WARNING] Gateway returned non-JSON: ${responseText.slice(0, 150)}`);
      }

      // If upstream failed with 400/422 and specifically asks for reg_no, fallback retry with reg_no
      if (!upstreamRes.ok && responseText && responseText.toLowerCase().includes('reg_no')) {
        console.log(`🔄 [VEHICLE RC GATEWAY] Retrying with reg_no parameter for ${cleanVehicleNumber}...`);
        try {
          const retryRes = await upstreamFetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              reg_no: cleanVehicleNumber,
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
          console.error(`🚨 [VEHICLE RC LOW BALANCE] Upstream returned low balance:`, responseText);
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

        console.error(`❌ [VEHICLE RC ERROR] Gateway error status ${statusCode}:`, responseText);
      }
    } catch (networkErr) {
      console.error(`💥 [VEHICLE RC NETWORK ERROR] Connection failure:`, networkErr.message);
      statusCode = 502;
      resultCode = 105;
      upstreamData = { error: networkErr.message };
    }

    const durationMs = Date.now() - startTime;

    // 5. Normalize Data
    const normalizedData = VehicleRcService.normalizeVehicleRcData(upstreamData, cleanVehicleNumber);

    // Check if normalized details indicate genuine verification
    if (isSuccess && (!normalizedData.owner_name && !normalizedData.maker_model)) {
      if (upstreamData?.status === false || upstreamData?.message?.toLowerCase().includes('not found')) {
        isSuccess = false;
        statusCode = 404;
        resultCode = 102;
      }
    }

    // 6. Cache on Success
    if (isSuccess && normalizedData && normalizedData.verified) {
      await CacheService.setVerification('vehicle_rc', cacheKey, {
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
        console.error('Queue dispatch error in vehicle_rc:', err.message);
      });
    }

    const errorMsg =
      upstreamData?.message ||
      upstreamData?.detail ||
      upstreamData?.error ||
      upstreamData?.msg ||
      (typeof upstreamData?.raw === 'string' && upstreamData.raw.length < 200 ? upstreamData.raw : null) ||
      (statusCode === 400
        ? 'Invalid vehicle registration number or record not found in VAHAN registry.'
        : 'Failed to verify vehicle RC details');

    // Return unified API response matching all other verification services
    return {
      http_response_code: isSuccess ? 200 : statusCode,
      result_code: isSuccess ? 101 : resultCode,
      request_id: requestId,
      client_ref_num: clientRef,
      status_message: isSuccess ? 'Success' : 'Failed',
      message: isSuccess
        ? (normalizedData.owner_name
            ? `Successfully verified vehicle RC details for ${cleanVehicleNumber}.`
            : `Vehicle RC verification completed for ${cleanVehicleNumber}.`)
        : errorMsg,
      status: isSuccess ? 'success' : 'error',
      success: isSuccess,
      result: normalizedData,
      data: normalizedData,
      raw_data: upstreamData,
    };
  }
}

export default VehicleRcService;
