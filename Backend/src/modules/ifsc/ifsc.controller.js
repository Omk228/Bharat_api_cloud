import IfscService from './ifsc.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

export class IfscController {
  /**
   * Handle IFSC Lookup Request
   * Supports:
   *  GET /:ifsc               (Razorpay root style: e.g. /YESB0DNB002)
   *  GET /ifsc/:ifsc          (Dedicated route: e.g. /ifsc/YESB0DNB002)
   *  GET /ifsc?ifsc=...       (Query param style)
   *  POST /ifsc               (Body: { ifsc: "YESB0DNB002" })
   */
  static getIfscDetails = asyncHandler(async (req, res, next) => {
    const rawIfsc =
      req.params?.ifsc ||
      req.query?.ifsc ||
      req.body?.ifsc ||
      req.query?.ifsc_code ||
      req.body?.ifsc_code;

    // Safety guard: if this handler was reached with internal system files (e.g. favicon.ico), pass along
    if (!rawIfsc || rawIfsc === 'favicon.ico' || rawIfsc === 'robots.txt') {
      return next();
    }

    const client_ref_num =
      req.headers['x-client-ref-num'] ||
      req.query?.client_ref_num ||
      req.body?.client_ref_num;

    const result = await IfscService.getIfscDetails({
      ifsc: rawIfsc,
      client_ref_num,
      apiClient: req.apiClient,
    });

    if (!result.isFound) {
      return res.status(404).send(result.error || 'Not Found');
    }

    return res.status(200).json(result.data);
  });
}

export default IfscController;
