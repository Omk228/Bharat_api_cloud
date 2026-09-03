import GeocodingService from './geocoding.service.js';

export class GeocodingController {
  /**
   * Handle Reverse Geocoding Request
   * Accepts lat/lon via query params, URL route params, or JSON body
   */
  static async reverseGeocode(req, res, next) {
    try {
      const lat =
        req.params.lat ||
        req.query.lat ||
        req.query.latitude ||
        req.body?.lat ||
        req.body?.latitude;

      const lon =
        req.params.lon ||
        req.params.lng ||
        req.query.lon ||
        req.query.lng ||
        req.query.longitude ||
        req.body?.lon ||
        req.body?.lng ||
        req.body?.longitude;

      const result = await GeocodingService.reverseGeocode(lat, lon);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default GeocodingController;
