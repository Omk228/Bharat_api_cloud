import PricingService from './pricing.service.js';
import { ApiResponse } from '../../core/utils/apiResponse.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../../core/config/env.config.js';
import CredentialModel from '../credentials/credential.model.js';
import { userModel } from '../auth/user.model.js';

export class PricingController {
  /**
   * GET /api/v1/pricing
   * Returns user custom pricing map and catalog with effective prices
   */
  static getPricing = asyncHandler(async (req, res) => {
    let userId = null;

    // 1. Check if user email is explicitly provided via headers or query (highest priority for user-specific views)
    const userEmail = req.headers['x-user-email'] || req.query.email;
    if (userEmail) {
      try {
        const user = await userModel.findByEmail(String(userEmail).trim().toLowerCase());
        if (user?.id) {
          userId = user.id;
        }
      } catch (err) {}
    }

    // 2. Check if authenticated via verifyJwt (req.user)
    if (!userId && req.user?.id) {
      userId = req.user.id;
    }

    // 3. Try parsing Bearer token manually if route is optionally authenticated
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, ENV.JWT.SECRET);
          if (decoded?.id) {
            userId = decoded.id;
          }
        } catch (err) {
          // invalid/expired token - continue as unauthenticated
        }
      }
    }

    // 4. Alternatively check API ID / API Key headers or query params
    if (!userId) {
      const apiId = req.headers['x-api-id'] || req.query.api_id;
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      if (apiId && apiKey) {
        try {
          const cred = await CredentialModel.findActiveByApiIdAndKey(String(apiId).trim(), String(apiKey).trim());
          if (cred && cred.user_id) {
            userId = cred.user_id;
          }
        } catch (err) {}
      }
    }

    // 5. Query param user_id
    if (!userId && req.query.user_id) {
      userId = parseInt(req.query.user_id, 10) || null;
    }

    const data = await PricingService.getUserPricingMap(userId);

    return ApiResponse.success(
      res,
      {
        userId,
        is_customized: Object.values(data.pricing).some((p) => p !== 2.0 && p !== 1.1),
        pricing: data.pricing,
        assigned: data.assigned,
        revoked: data.revoked,
        catalog: data.catalog,
      },
      'Pricing catalog retrieved successfully'
    );
  });

  /**
   * POST /api/v1/pricing/assign
   * Admin: Assign / unassign an API to a user with optional custom price
   */
  static assignApi = asyncHandler(async (req, res) => {
    const { user_id, userId, catalog_id, catalogId, custom_price, customPrice, is_assigned, isAssigned } = req.body;
    const targetUserId = user_id || userId;
    const targetCatalogId = catalog_id || catalogId;
    const targetCustomPrice = custom_price !== undefined ? custom_price : customPrice;
    const targetIsAssigned = is_assigned !== undefined ? is_assigned : (isAssigned !== undefined ? isAssigned : 1);

    if (!targetUserId || !targetCatalogId) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'user_id and catalog_id are required.',
        result: null
      });
    }

    const result = await PricingService.assignApi({
      userId: targetUserId,
      catalogId: targetCatalogId,
      customPrice: targetCustomPrice,
      isAssigned: targetIsAssigned
    });

    return ApiResponse.success(res, result, 'API assignment updated successfully');
  });

  /**
   * POST /api/v1/pricing/bulk-assign
   * Admin: Bulk assign/unassign APIs to a user
   */
  static bulkAssign = asyncHandler(async (req, res) => {
    const { user_id, userId, assignments } = req.body;
    const targetUserId = user_id || userId;

    if (!targetUserId || !Array.isArray(assignments)) {
      return res.status(400).json({
        http_response_code: 400,
        result_code: 102,
        message: 'user_id and assignments array are required.',
        result: null
      });
    }

    const result = await PricingService.bulkAssign({
      userId: targetUserId,
      assignments
    });

    return ApiResponse.success(res, result, 'Bulk API assignments updated successfully');
  });
}

export default PricingController;
