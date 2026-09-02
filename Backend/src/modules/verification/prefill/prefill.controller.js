import PrefillVerificationService from './prefill.service.js';

export class PrefillVerificationController {
  /**
   * Handle Mobile to Prefill Request
   * Endpoint: POST /srv4/credit-report/prefill
   */
  static async verifyPrefill(req, res, next) {
    try {
      const mobileNumber =
        req.body.mobile_number ||
        req.body.mobileNumber ||
        req.body.mobile ||
        req.body.phone;

      const firstName =
        req.body.first_name ||
        req.body.firstName ||
        req.body.name;

      const lastName =
        req.body.last_name ||
        req.body.lastName ||
        '';

      const clientRefNum = req.body.client_ref_num || req.body.clientRefNum;

      if (!mobileNumber || !firstName) {
        return res.status(400).json({
          http_response_code: 400,
          result_code: 102,
          message: 'Missing required parameters: mobile_number and first_name are mandatory.',
          status_message: 'Invalid request'
        });
      }

      const cleanMobile = String(mobileNumber).trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          http_response_code: 400,
          result_code: 102,
          message: 'Invalid 10-digit Indian mobile number format.',
          status_message: 'Invalid request'
        });
      }

      const verificationResult = await PrefillVerificationService.verifyMobilePrefill({
        mobile_number: cleanMobile,
        first_name: firstName,
        last_name: lastName,
        client_ref_num: clientRefNum,
        apiClient: req.apiClient
      });

      return res.status(200).json(verificationResult);
    } catch (err) {
      next(err);
    }
  }
}

export default PrefillVerificationController;
