import { MobileSmartService } from './mobileSmart.service.js';
import { MobileSmartPdfService } from './mobileSmartPdf.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { ENV } from '../../../core/config/env.config.js';

export const MobileSmartController = {
  /**
   * Search Mobile Smart Verification
   * Combines TransUnion CIBIL Loan Analysis + Mobile Intelligence Discovered Alternates + PDF Report
   *
   * Supported routes:
   * - POST /api/v1/verify/mobile-smart
   * - GET  /api/v1/verify/mobile-smart
   * - POST /verify/mobile-smart
   * - POST /api/v1/mobile-smart
   * - POST /mobile-smart
   */
  searchMobileSmart: asyncHandler(async (req, res) => {
    const forename =
      req.body?.forename ||
      req.body?.first_name ||
      req.body?.firstName ||
      req.query?.forename ||
      req.query?.first_name ||
      req.query?.firstName ||
      req.body?.data?.first_name ||
      req.body?.data?.forename ||
      '';

    const surname =
      req.body?.surname ||
      req.body?.last_name ||
      req.body?.lastName ||
      req.query?.surname ||
      req.query?.last_name ||
      req.query?.lastName ||
      req.body?.data?.last_name ||
      req.body?.data?.surname ||
      '';

    const name =
      req.body?.name ||
      req.query?.name ||
      req.body?.data?.name ||
      '';

    const phone =
      req.body?.phone ||
      req.body?.mobile ||
      req.body?.phone_number ||
      req.body?.phoneNumber ||
      req.body?.mobile_number ||
      req.query?.phone ||
      req.query?.mobile ||
      req.query?.phone_number ||
      req.query?.phoneNumber ||
      req.query?.mobile_number ||
      req.body?.data?.phone ||
      req.body?.data?.phone_number ||
      '';

    const pan =
      req.body?.pan ||
      req.body?.pan_id ||
      req.body?.panId ||
      req.query?.pan ||
      req.query?.pan_id ||
      req.query?.panId ||
      req.body?.data?.pan ||
      req.body?.data?.pan_id ||
      '';

    const gender =
      req.body?.gender ||
      req.query?.gender ||
      req.body?.data?.gender ||
      'Male';

    const dob =
      req.body?.dob ||
      req.body?.date_of_birth ||
      req.body?.dateOfBirth ||
      req.query?.dob ||
      req.query?.date_of_birth ||
      req.query?.dateOfBirth ||
      req.body?.data?.dob ||
      req.body?.data?.date_of_birth ||
      '';

    const client_ref_num =
      req.body?.client_ref_num ||
      req.query?.client_ref_num ||
      req.body?.clientRefNum ||
      req.query?.clientRefNum ||
      null;

    if (!forename && !name) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'Missing required parameter: forename (or first_name) is mandatory.',
        status_message: 'Invalid request',
      });
    }

    if (!phone) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'Missing required parameter: phone (or phone_number) is mandatory.',
        status_message: 'Invalid request',
      });
    }

    if (!pan) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'Missing required parameter: pan (or pan_id) is mandatory.',
        status_message: 'Invalid request',
      });
    }

    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const baseUrl = host ? `${protocol}://${host}` : (ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com');
    const endpoint = req.originalUrl?.split('?')[0] || req.path || '/api/v1/verify/mobile-smart';

    const result = await MobileSmartService.verifyMobileSmart({
      forename,
      surname,
      name,
      phone,
      pan,
      gender,
      dob,
      client_ref_num,
      apiClient: req.apiClient,
      baseUrl,
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
        `attachment; filename="mobile_smart_report_${result.summary?.primary_phone || 'report'}.pdf"`
      );
      return res.status(200).send(result._pdfBuffer);
    }

    // Strip internal binary buffer reference so JSON response remains clean
    delete result._pdfBuffer;

    return res.status(httpCode).json(result);
  }),

  /**
   * Serve Mobile Smart Intelligence Report in PDF format
   * Endpoint: GET /api/v1/reports/mobile-smart/:token
   */
  getPdfReport: asyncHandler(async (req, res) => {
    const rawToken = req.params.token || '';
    const cleanToken = rawToken.replace(/\.pdf$/i, '').trim();

    if (!cleanToken) {
      throw ApiError.badRequest('Report token is required');
    }

    const reportData = await MobileSmartService.getReport(cleanToken);

    if (!reportData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Mobile Smart Report Not Found</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h2 { color: #f43f5e; margin-top: 0; }
            p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Report Not Found or Expired</h2>
            <p>The requested Mobile Smart Report token (<code>${cleanToken}</code>) has expired or was not found. Please regenerate via API.</p>
          </div>
        </body>
        </html>
      `);
    }

    let pdfBuffer;
    if (reportData._pdfBase64) {
      pdfBuffer = Buffer.from(reportData._pdfBase64, 'base64');
    } else {
      pdfBuffer = await MobileSmartPdfService.generatePdf(reportData);
    }

    const safeFilename = `mobile_smart_report_${reportData.phone || reportData.primary_phone || 'report'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    return res.status(200).send(pdfBuffer);
  }),
};

export default MobileSmartController;
