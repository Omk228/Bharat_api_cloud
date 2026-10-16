import { GstToContactService } from './gstToContact.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const GstToContactController = {
  /**
   * Fetch contact details from GSTIN
   * Supported routes:
   * - POST /api/v1/verify/gst-to-contact
   * - POST /verify/gst-to-contact
   * - POST /api/v1/gst-to-contact
   * - POST /gst-to-contact
   */
  verifyGstToContact: asyncHandler(async (req, res) => {
    const gstin =
      req.body?.gstin ||
      req.body?.gst ||
      req.body?.gst_number ||
      req.body?.gstin_number ||
      req.body?.gstNumber ||
      req.query?.gstin ||
      req.query?.gst ||
      req.body?.data?.gstin ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/gst-to-contact';

    const result = await GstToContactService.verifyGstToContact({
      gstin,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default GstToContactController;
