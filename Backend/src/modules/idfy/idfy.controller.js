import IdfyService from './idfy.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

export class IdfyController {
  /**
   * IDFY Bank Account Verification Handler
   * POST /idfy/validate_bank_account
   */
  static validateBankAccount = asyncHandler(async (req, res) => {
    const bank_account_no =
      req.body.bank_account_no ||
      req.body.creditorAccountId ||
      req.body.account_number ||
      req.body.accountNumber ||
      req.body.account ||
      req.query.bank_account_no ||
      req.query.creditorAccountId;

    const bank_ifsc_code =
      req.body.bank_ifsc_code ||
      req.body.ifscCode ||
      req.body.ifsc_code ||
      req.body.ifsc ||
      req.query.bank_ifsc_code ||
      req.query.ifscCode;

    const nf_verification = req.body.nf_verification !== undefined
      ? req.body.nf_verification
      : req.query.nf_verification !== undefined
      ? req.query.nf_verification
      : true;

    const client_ref_num = req.body.client_ref_num || req.body.clientRefNum || null;

    if (!bank_account_no || !bank_ifsc_code) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        request_id: `req_${Date.now()}`,
        client_ref_num,
        message: 'Missing required parameters: bank_account_no and bank_ifsc_code are mandatory.',
        status_message: 'Invalid request parameters',
        result: null
      });
    }

    const verificationResult = await IdfyService.validateBankAccount({
      bank_account_no: String(bank_account_no),
      bank_ifsc_code: String(bank_ifsc_code),
      nf_verification,
      client_ref_num,
      apiClient: req.apiClient
    });

    const statusCode = verificationResult.http_response_code || 200;
    return res.status(statusCode).json(verificationResult);
  });
}

export default IdfyController;
