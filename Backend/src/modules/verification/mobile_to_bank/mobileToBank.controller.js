import MobileToBankService from './mobileToBank.service.js';

export class MobileToBankController {
  /**
   * Handle Mobile To Bank Advance Verification Request
   * Endpoint: POST /srv3/mobile-to-bank/advance
   */
  static async verifyMobileToBankAdvance(req, res, next) {
    try {
      const mobileNumber =
        req.body.mobile_number ||
        req.body.mobileNumber ||
        req.body.mobile ||
        req.body.phone;

      const consent = req.body.consent || 'Y';
      const clientRefNum = req.body.client_ref_num || req.body.clientRefNum;

      if (!mobileNumber) {
        return res.status(400).json({
          http_response_code: 400,
          result_code: 102,
          message: 'Missing required parameter: mobile_number is mandatory.',
          status_message: 'Invalid request',
          result: null,
        });
      }

      const cleanMobile = String(mobileNumber).trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          http_response_code: 400,
          result_code: 102,
          message: 'Invalid 10-digit Indian mobile number format.',
          status_message: 'Invalid request',
          result: null,
        });
      }

      const verificationResult = await MobileToBankService.verifyMobileToBankAdvance({
        mobile_number: cleanMobile,
        consent,
        client_ref_num: clientRefNum,
        apiClient: req.apiClient,
      });

      return res.status(verificationResult.http_response_code || 200).json(verificationResult);
    } catch (err) {
      next(err);
    }
  }
}

export default MobileToBankController;
