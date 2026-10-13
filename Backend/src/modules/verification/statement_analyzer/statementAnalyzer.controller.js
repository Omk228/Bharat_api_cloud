import crypto from 'node:crypto';
import StatementAnalyzerService from './statementAnalyzer.service.js';
import { ApiError } from '../../../core/utils/apiError.js';
import { ENV } from '../../../core/config/env.config.js';

export class StatementAnalyzerController {
  /**
   * Helper to parse request body and extract binary PDF buffer from req.file
   */
  static parseRequestBody(req) {
    const body = { ...(req.body || {}) };
    let filename = 'statement.pdf';
    let fileBuffer = null;

    if (req.file) {
      fileBuffer = req.file.buffer;
      filename = req.file.originalname || filename;
    }

    return { body, fileBuffer, filename };
  }

  /**
   * Validate PDF file: existence, non-empty, magic bytes (%PDF-), and size
   */
  static validatePdfFile(fileBuffer, filename = 'statement.pdf') {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw ApiError.badRequest('PDF bank statement file is required and cannot be empty.');
    }

    const maxFileSizeMb = parseInt(process.env.STATEMENT_ANALYZER_MAX_FILE_SIZE_MB || ENV.STATEMENT_ANALYZER?.MAX_FILE_SIZE_MB || '25', 10);
    const maxSizeBytes = maxFileSizeMb * 1024 * 1024;

    if (fileBuffer.length > maxSizeBytes) {
      throw ApiError.badRequest(`File size exceeds maximum allowed limit of ${maxFileSizeMb}MB.`);
    }

    // Verify %PDF- magic bytes: 0x25 0x50 0x44 0x46 0x2D
    if (fileBuffer.length < 5) {
      throw ApiError.badRequest('Invalid file format. File must be a valid PDF document.');
    }

    const header = fileBuffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw ApiError.badRequest('Invalid PDF signature. File is not a valid PDF document.');
    }
  }

  /**
   * Validate report_type and report_subtype combinations according to upstream contract
   */
  static validateReportOptions(reportType, reportSubtype) {
    if (!reportType) return;

    const cleanType = String(reportType).trim().toLowerCase();
    const cleanSubtype = reportSubtype ? String(reportSubtype).trim().toLowerCase() : '';

    if (cleanType !== 'json' && cleanType !== 'xlsx') {
      throw ApiError.badRequest("Invalid report_type. Supported values are 'json' or 'xlsx'.");
    }

    if (cleanType === 'xlsx') {
      if (cleanSubtype && cleanSubtype !== 'type3') {
        throw ApiError.badRequest("For report_type 'xlsx', only report_subtype 'type3' is supported.");
      }
    }
  }

  /**
   * Public Handler for Statement Analyzer PDF (Srv2)
   * POST /api/v1/statement-analyzer
   */
  static async handleRequest(req, res, next) {
    try {
      const { body, fileBuffer, filename } = StatementAnalyzerController.parseRequestBody(req);

      const method = body.method || body.methodName || req.query?.method;
      const acceptancePolicy = body.acceptance_policy || body.acceptancePolicy || req.query?.acceptance_policy;
      const token = body.token || req.query?.token;
      const requestId = body.request_id || body.requestId || req.query?.request_id;
      const txnId = body.txn_id || body.txnId || req.query?.txn_id;
      const reportType = body.report_type || body.reportType || req.query?.report_type;
      const reportSubtype = body.report_subtype || body.reportSubtype || req.query?.report_subtype;
      const password = body.password || req.query?.password;
      const clientRefNum = body.client_ref_num || body.clientRefNum;
      const correlationId = `STA_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Validate Report Options if specified
      StatementAnalyzerController.validateReportOptions(reportType, reportSubtype);

      // Validate PDF if file buffer is provided
      if (fileBuffer) {
        StatementAnalyzerController.validatePdfFile(fileBuffer, filename);
      } else if (method === 'INITIATE_UPLOAD' && token) {
        // Step 2 with missing file
        throw ApiError.badRequest('PDF bank statement file is required for upload.');
      }

      // Delegate to service layer
      const result = await StatementAnalyzerService.processStatementAnalyzerRequest({
        method,
        acceptance_policy: acceptancePolicy,
        token,
        request_id: requestId,
        file: fileBuffer,
        filename,
        password,
        txn_id: txnId,
        report_type: reportType,
        report_subtype: reportSubtype,
        client_ref_num: clientRefNum,
        correlationId,
        apiClient: req.apiClient,
      });

      // Strip upstream headers and return clean BAC response
      return res.status(result.httpCode || 200).json(result.body);
    } catch (error) {
      next(error);
    }
  }
}

export default StatementAnalyzerController;
