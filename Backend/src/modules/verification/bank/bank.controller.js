import BankVerificationService from './bank.service.js';
import { asyncHandler } from '../../../core/utils/asyncHandler.js';

export class BankVerificationController {
  /**
   * Bank Verification Penny Less Handler (POST /idfc/beneficiary)
   */
  static verifyBankPennyLess = asyncHandler(async (req, res) => {
    // Extract parameters from body or query (flexible parameter naming)
    const creditorAccountId =
      req.body.creditorAccountId ||
      req.body.account_number ||
      req.body.accountNumber ||
      req.body.account ||
      req.query.creditorAccountId;

    const ifscCode =
      req.body.ifscCode ||
      req.body.ifsc_code ||
      req.body.ifsc ||
      req.query.ifscCode;

    const client_ref_num = req.body.client_ref_num || req.body.clientRefNum || null;

    if (!creditorAccountId || !ifscCode) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        request_id: `req_${Date.now()}`,
        client_ref_num,
        message: 'Missing required parameters: creditorAccountId and ifscCode are mandatory.',
        status_message: 'Invalid request parameters',
        result: null
      });
    }

    const verificationResult = await BankVerificationService.verifyBankPennyLess({
      creditorAccountId: String(creditorAccountId),
      ifscCode: String(ifscCode),
      client_ref_num,
      apiClient: req.apiClient
    });

    const statusCode = verificationResult.http_response_code || 200;
    return res.status(statusCode).json(verificationResult);
  });

  /**
   * Bank Account Validation V2 Handler (POST /api/v1/bank/account-validation)
   */
  static verifyBankAccountV2 = asyncHandler(async (req, res) => {
    const account_number =
      req.body.account_number ||
      req.body.accountNumber ||
      req.body.account_no ||
      req.body.creditorAccountId ||
      req.body.account ||
      req.query.account_number ||
      req.query.account;

    const ifsc_code =
      req.body.ifsc_code ||
      req.body.ifscCode ||
      req.body.ifsc ||
      req.query.ifsc_code ||
      req.query.ifsc;

    const client_ref_num = req.body.client_ref_num || req.body.clientRefNum || null;

    const verificationResult = await BankVerificationService.verifyBankAccountV2({
      account_number: account_number ? String(account_number) : '',
      ifsc_code: ifsc_code ? String(ifsc_code) : '',
      client_ref_num,
      apiClient: req.apiClient,
      endpoint: req.originalUrl?.split('?')[0] || '/api/v1/bank/account-validation',
    });

    const statusCode = verificationResult.http_response_code || 200;
    return res.status(statusCode).json(verificationResult);
  });
}

export default BankVerificationController;
