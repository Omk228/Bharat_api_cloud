import { CinToPanService } from './cinToPan.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const CinToPanController = {
  /**
   * Fetch PAN and corporate MCA details associated with a CIN
   * Supported routes:
   * - POST /api/v1/verify/cin-to-pan
   * - POST /verify/cin-to-pan
   * - POST /api/v1/cin-to-pan
   * - POST /cin-to-pan
   */
  verifyCinToPan: asyncHandler(async (req, res) => {
    const cin =
      req.body?.cin ||
      req.body?.cin_number ||
      req.body?.cinNumber ||
      req.query?.cin ||
      req.query?.cin_number ||
      req.body?.data?.cin ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/cin-to-pan';

    const result = await CinToPanService.verifyCinToPan({
      cin,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default CinToPanController;
