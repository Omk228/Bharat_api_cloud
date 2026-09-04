import UanService from './uan.service.js';

export class UanController {
  /**
   * Handle Mobile To UAN V2 Request
   * Endpoint: POST /srv3/uan-mobile
   */
  static async verifyMobileToUan(req, res, next) {
    try {
      const mobile =
        req.body?.mobile ||
        req.body?.mobile_number ||
        req.body?.mobileNumber ||
        req.body?.phone ||
        req.query?.mobile;

      const clientRefNum = req.body?.client_ref_num || req.body?.clientRefNum;

      if (!mobile) {
        return res.status(400).json({
          status: {
            code: 400,
            type: 'failed',
            message: 'Missing required parameter: mobile is mandatory.',
          },
          message: 'Missing required parameter: mobile is mandatory.',
          data: null,
        });
      }

      const cleanMobile = String(mobile).trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          status: {
            code: 400,
            type: 'failed',
            message: 'Invalid 10-digit Indian mobile number format.',
          },
          message: 'Invalid 10-digit Indian mobile number format.',
          data: null,
        });
      }

      const result = await UanService.verifyMobileToUan({
        mobile: cleanMobile,
        client_ref_num: clientRefNum,
        apiClient: req.apiClient,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle UAN To Employment History V2 Request
   * Endpoint: POST /srv3/uan-direct
   */
  static async verifyUanDirect(req, res, next) {
    try {
      const uan =
        req.body?.uan ||
        req.body?.uan_number ||
        req.body?.uanNumber ||
        req.query?.uan;

      const clientRefNum = req.body?.client_ref_num || req.body?.clientRefNum;

      if (!uan) {
        return res.status(400).json({
          status: {
            code: 400,
            type: 'failed',
            message: 'Missing required parameter: uan is mandatory.',
          },
          message: 'Missing required parameter: uan is mandatory.',
          data: null,
        });
      }

      const cleanUan = String(uan).trim().replace(/\D/g, '');
      if (!/^\d{12}$/.test(cleanUan)) {
        return res.status(400).json({
          status: {
            code: 400,
            type: 'failed',
            message: 'Invalid 12-digit Indian UAN format.',
          },
          message: 'Invalid 12-digit Indian UAN format.',
          data: null,
        });
      }

      const result = await UanService.verifyUanDirect({
        uan: cleanUan,
        client_ref_num: clientRefNum,
        apiClient: req.apiClient,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default UanController;
