import { MobileAdvanceLookupService } from './mobileAdvanceLookup.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export const MobileAdvanceLookupController = {
  /**
   * Search Mobile Advance Lookup (Composite of Prefill & Intelligence)
   * Supported routes:
   * - POST /api/v1/verify/mobile-advance-lookup
   * - POST /verify/mobile-advance-lookup
   * - GET  /api/v1/verify/mobile-advance-lookup
   * - POST /srv2/mobile-advance-lookup
   * - POST /mobile-advance-lookup
   */
  searchMobileAdvanceLookup: asyncHandler(async (req, res) => {
    const phone =
      req.body?.phone ||
      req.body?.mobile ||
      req.body?.phoneNumber ||
      req.body?.mobile_number ||
      req.body?.query ||
      req.query?.phone ||
      req.query?.mobile ||
      req.query?.phoneNumber ||
      req.query?.mobile_number ||
      req.query?.query ||
      req.body?.data?.phone ||
      req.body?.data?.mobile_number ||
      '';

    const first_name =
      req.body?.first_name ||
      req.body?.firstName ||
      req.query?.first_name ||
      req.query?.firstName ||
      req.body?.data?.first_name ||
      '';

    const last_name =
      req.body?.last_name ||
      req.body?.lastName ||
      req.query?.last_name ||
      req.query?.lastName ||
      req.body?.data?.last_name ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      null;

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'Missing required parameter: phone (or mobile_number) is mandatory.',
        status_message: 'Invalid request',
      });
    }

    if (!first_name || !String(first_name).trim()) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'Missing required parameter: first_name (or name) is mandatory for Mobile Advance Lookup.',
        status_message: 'Invalid request',
      });
    }

    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/mobile-advance-lookup';

    const result = await MobileAdvanceLookupService.lookupMobileAdvance({
      phone,
      first_name,
      last_name,
      client_ref_num,
      apiClient: req.apiClient,
      endpoint,
    });

    const httpCode = result.http_response_code || 200;

    // Direct PDF download support (via query param ?format=pdf, ?download=pdf or header Accept: application/pdf)
    const wantsPdf =
      req.query?.format === 'pdf' ||
      req.query?.download === 'pdf' ||
      req.query?.download_pdf === 'true' ||
      req.body?.format === 'pdf' ||
      req.headers?.accept === 'application/pdf';

    if (wantsPdf && result._pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="mobile_advance_report_${result.summary?.phone || 'report'}.pdf"`
      );
      return res.status(200).send(result._pdfBuffer);
    }

    // Strip internal binary buffer reference so JSON response remains clean
    delete result._pdfBuffer;

    return res.status(httpCode).json(result);
  }),
};

export default MobileAdvanceLookupController;
