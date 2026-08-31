import { healthService } from '../services/health.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthController = {
  /**
   * Get server & database health status
   */
  getHealth: asyncHandler(async (req, res) => {
    const healthData = await healthService.getHealthStatus();
    return ApiResponse.success(res, healthData, 'Server is healthy and running');
  }),
};

export default healthController;
