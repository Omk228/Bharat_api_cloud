import { PanToGstService } from './panToGst.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const PanToGstController = {
  /**
   * Fetch all GSTIN numbers linked to a PAN
   * Supported routes:
   * - POST /api/v1/verify/pan-to-gst
   * - POST /verify/pan-to-gst
   * - POST /api/v1/pan-to-gst
   * - POST /pan-to-gst
   */
  verifyPanToGst: asyncHandler(async (req, res) => {
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

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/pan-to-gst';

    const result = await PanToGstService.verifyPanToGst({
      pan,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default PanToGstController;
