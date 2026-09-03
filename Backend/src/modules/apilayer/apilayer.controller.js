import ApiLayerService from './apilayer.service.js';

export class ApiLayerController {
  /**
   * Handle IP Geolocation Lookup
   */
  static async lookupIp(req, res, next) {
    try {
      const targetIp =
        req.params.ip ||
        req.query.ip ||
        req.body.ip ||
        req.body.ip_address ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '182.156.19.94';

      const result = await ApiLayerService.lookupIp(targetIp);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handle Requester IP Lookup (/check)
   */
  static async checkRequesterIp(req, res, next) {
    try {
      const targetIp =
        req.query.ip ||
        req.body.ip ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '182.156.19.94';

      const result = await ApiLayerService.lookupIp(targetIp);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default ApiLayerController;
