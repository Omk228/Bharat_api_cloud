import { healthService } from './health.service.js';
import { ApiResponse } from '../../core/utils/apiResponse.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

export const healthController = {
  /**
   * Health Check Handler
   */
  check: asyncHandler(async (req, res) => {
    const health = await healthService.getHealthStatus();
    return ApiResponse.success(res, health, 'Service is healthy and fully operational');
  }),
};

export default healthController;
