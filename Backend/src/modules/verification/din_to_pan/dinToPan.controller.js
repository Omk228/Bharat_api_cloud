import { DinToPanService } from './dinToPan.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const DinToPanController = {
  /**
   * Fetch PAN and Director details associated with a DIN (Director Identification Number)
   * Supported routes:
   * - POST /api/v1/verify/din-to-pan
   * - POST /verify/din-to-pan
   * - POST /api/v1/din-to-pan
   * - POST /din-to-pan
   */
  verifyDinToPan: asyncHandler(async (req, res) => {
    const din =
      req.body?.din ||
      req.body?.din_number ||
      req.body?.dinNumber ||
      req.body?.director_id ||
      req.body?.director_din ||
      req.query?.din ||
      req.query?.din_number ||
      req.body?.data?.din ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/din-to-pan';

    const result = await DinToPanService.verifyDinToPan({
      din,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || result.status_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default DinToPanController;
