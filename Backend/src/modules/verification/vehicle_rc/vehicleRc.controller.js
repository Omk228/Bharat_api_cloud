import { VehicleRcService } from './vehicleRc.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const VehicleRcController = {
  /**
   * Verify Vehicle Registration Certificate (RC) details
   * Supported routes:
   * - POST /api/v1/verify/vehicle-rc
   * - POST /verify/vehicle-rc
   * - POST /api/v1/vehicle-rc
   * - POST /vehicle-rc
   */
  verifyVehicleRc: asyncHandler(async (req, res) => {
    const vehicle_number =
      req.body?.vehicle_number ||
      req.body?.rc_number ||
      req.body?.vehicle_num ||
      req.body?.reg_no ||
      req.body?.registration_number ||
      req.body?.number ||
      req.query?.vehicle_number ||
      req.query?.rc_number ||
      req.query?.reg_no ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/vehicle-rc';

    const result = await VehicleRcService.verifyVehicleRc({
      vehicle_number,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default VehicleRcController;
