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
}

export default BankVerificationController;
