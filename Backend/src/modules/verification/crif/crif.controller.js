import { CrifVerificationService } from './crif.service.js';
import { generateCrifReportPdf } from './crif-pdf.generator.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { ENV } from '../../../core/config/env.config.js';

export const CrifController = {
  /**
   * CRIF High Mark Credit Score V4 Controller
   * Endpoint: POST /crif/Credit-ScoreV4 and POST /api/v1/crif/Credit-ScoreV4
   */
  verifyCrifScore: asyncHandler(async (req, res) => {
    const {
      mobile_no,
      first_name,
      last_name,
      name_lookup,
    } = req.body || {};

    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const baseUrl = host ? `${protocol}://${host}` : (ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com');

    const result = await CrifVerificationService.verifyCrifScoreV4({
      mobile_no,
      first_name,
      last_name,
      name_lookup,
      apiClient: req.apiClient,
      baseUrl,
    });

    return res.status(200).json(result);
  }),

  /**
   * Serve CRIF High Mark Credit Information Report in PDF format
   * Endpoint: GET /api/v1/reports/crif/:token and GET /reports/crif/:token
   */
  getPdfReport: asyncHandler(async (req, res) => {
    const rawToken = req.params.token || '';
    const cleanToken = rawToken.replace(/\.pdf$/i, '').trim();

    if (!cleanToken) {
      throw ApiError.badRequest('Report token is required');
    }

    const reportData = await CrifVerificationService.getReport(cleanToken);

    if (!reportData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>CRIF High Mark Report Not Found</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h2 { color: #f43f5e; margin-top: 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Credit Report Not Found</h2>
            <p>The requested CRIF High Mark Report token (<code>${cleanToken}</code>) has expired or was not found. Please generate a new report via API.</p>
          </div>
        </body>
        </html>
      `);
    }

    const pdfBuffer = await generateCrifReportPdf(reportData);
    const safeFilename = `CRIF_HighMark_Report_${cleanToken}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    return res.end(pdfBuffer);
  }),
};

export default CrifController;
