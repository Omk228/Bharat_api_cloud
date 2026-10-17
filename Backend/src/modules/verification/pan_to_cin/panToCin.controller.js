import { PanToCinService } from './panToCin.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const PanToCinController = {
  /**
   * Fetch Corporate Identification Number (CIN) and corporate MCA details associated with a PAN
   * Supported routes:
   * - POST /api/v1/verify/pan-to-cin
   * - POST /verify/pan-to-cin
   * - POST /api/v1/pan-to-cin
   * - POST /pan-to-cin
   */
  verifyPanToCin: asyncHandler(async (req, res) => {
    const pan =
      req.body?.pan ||
      req.body?.pan_number ||
      req.body?.panNumber ||
      req.query?.pan ||
      req.query?.pan_number ||
      req.body?.data?.pan ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/pan-to-cin';

    const result = await PanToCinService.verifyPanToCin({
      pan,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default PanToCinController;
