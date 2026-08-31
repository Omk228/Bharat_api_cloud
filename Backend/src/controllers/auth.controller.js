import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  /**
   * Register Controller
   */
  register: asyncHandler(async (req, res) => {
    const { name, company_name, email, password } = req.body;
    const result = await authService.register({ name, company_name, email, password });
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

  /**
   * Update Profile Controller (Protected)
   */
  updateProfile: asyncHandler(async (req, res) => {
    const { display_name, company_name, plan } = req.body;
    const updated = await authService.updateProfile(req.user.id, { display_name, company_name, plan });
    return ApiResponse.success(res, updated, 'Profile updated successfully');
  }),
};

export default authController;
