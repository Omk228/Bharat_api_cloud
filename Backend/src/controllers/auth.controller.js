import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  /**
   * Register Controller
   */
  register: asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return ApiResponse.created(res, result, 'User registered successfully');
  }),

  /**
   * Login Controller
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return ApiResponse.success(res, result, 'User logged in successfully');
  }),

  /**
   * Get Current User Profile Controller (Protected)
   */
  getMe: asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user.id);
    return ApiResponse.success(res, profile, 'Profile fetched successfully');
  }),
};

export default authController;
