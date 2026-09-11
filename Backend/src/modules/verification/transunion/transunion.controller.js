import { TransunionVerificationService } from './transunion.service.js';
import { generateCibilPdfReport } from './transunion-pdf.generator.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';
import { ApiError } from '../../../core/utils/apiError.js';

import { ENV } from '../../../core/config/env.config.js';

export const TransunionController = {
  /**
   * TransUnion Score Hybrid CIBIL API
   * Endpoint: POST /srv5/transunion-Score-Hybrid
   */
  verifyTransunion: asyncHandler(async (req, res) => {
    const {
      forename,
      surname,
      phone_number,
      gender,
      pan_id,
      date_of_birth,
      client_ref_num,
    } = req.body || {};

    const baseUrl = ENV.APP_BASE_URL || 'https://brown-goldfish-546701.hostingersite.com';

    const result = await TransunionVerificationService.verifyTransunionScoreHybrid({
      forename,
      surname,
      phone_number,
      gender,
      pan_id,
      date_of_birth,
      client_ref_num,
      apiClient: req.apiClient,
      baseUrl,
    });

    return res.status(200).json(result);
  }),

  /**
   * Serve CIBIL Credit Information Report in PDF format
   * Endpoint: GET /api/v1/reports/cibil/:token
   */
  getPdfReport: asyncHandler(async (req, res) => {
    const rawToken = req.params.token || '';
    const cleanToken = rawToken.replace(/\.pdf$/i, '').trim();

    if (!cleanToken) {
      throw ApiError.badRequest('Report token is required');
    }

    const reportData = await TransunionVerificationService.getReport(cleanToken);

    if (!reportData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>CIBIL Report Expired or Not Found</title>
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
            <p>The requested CIBIL Credit Report token (<code>${cleanToken}</code>) has expired or was not generated yet. Please generate a new report via API.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Generate PDF Buffer
    const pdfBuffer = await generateCibilPdfReport(reportData);

    const safeFilename = `CIBIL_Report_${reportData.pan_id || 'CIR'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    return res.end(pdfBuffer);
  }),
};

export default TransunionController;
