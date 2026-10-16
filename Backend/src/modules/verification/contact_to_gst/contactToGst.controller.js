import { ContactToGstService } from './contactToGst.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const ContactToGstController = {
  /**
   * Fetch GST details linked to a Mobile Number or Email
   * Supported routes:
   * - POST /api/v1/verify/contact-to-gst
   * - POST /verify/contact-to-gst
   * - POST /api/v1/contact-to-gst
   * - POST /contact-to-gst
   */
  verifyContactToGst: asyncHandler(async (req, res) => {
    const contact =
      req.body?.contact ||
      req.body?.mobile ||
      req.body?.email ||
      req.body?.phone ||
      req.body?.contact_number ||
      req.body?.mobile_number ||
      req.query?.contact ||
      req.query?.mobile ||
      req.query?.email ||
      req.body?.data?.contact ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/contact-to-gst';

    const result = await ContactToGstService.verifyContactToGst({
      contact,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;
    return res.status(httpCode).json(result);
  }),
};

export default ContactToGstController;
