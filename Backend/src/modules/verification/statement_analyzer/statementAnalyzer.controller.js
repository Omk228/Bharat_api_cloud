import StatementAnalyzerService from './statementAnalyzer.service.js';

export class StatementAnalyzerController {
  /**
   * POST /srv2/statement-upload
   * POST /srv2/statement-analyzer
   */
  static async handleRequest(req, res, next) {
    try {
      const body = req.body || {};
      const hostBase = `${req.protocol}://${req.get('host')}`;

      const response = await StatementAnalyzerService.processStatementAnalyzerRequest({
        method: body.method || body.methodName,
        acceptance_policy: body.acceptance_policy || body.acceptancePolicy,
        token: body.token,
        request_id: body.request_id || body.requestId,
        file: body.file,
        txn_id: body.txn_id || body.txnId,
        report_type: body.report_type || body.reportType,
        report_subtype: body.report_subtype || body.reportSubtype,
        client_ref_num: body.client_ref_num || body.clientRefNum,
        apiClient: {
          ...(req.apiClient || {}),
          hostBase,
        },
        rawBody: body,
      });

      const httpCode = response.http_response_code || 200;
      return res.status(httpCode).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default StatementAnalyzerController;
