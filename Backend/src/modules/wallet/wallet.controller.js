import { walletService } from './wallet.service.js';
import { ApiResponse } from '../../core/utils/apiResponse.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

export const walletController = {
  /**
   * Get Live Wallet Balance & Statistics
   */
  getBalance: asyncHandler(async (req, res) => {
    const data = await walletService.getBalance(req.user.id);
    return ApiResponse.success(res, data, 'Wallet balance fetched successfully');
  }),

  /**
   * Get Wallet Transactions
   */
  getTransactions: asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0, type, status, search } = req.query;
    const transactions = await walletService.getTransactions(req.user.id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      type,
      status,
      search,
    });
    return ApiResponse.success(res, transactions, 'Wallet recharge transactions fetched successfully');
  }),

  /**
   * Get API Hit Logs
   */
  getHitLogs: asyncHandler(async (req, res) => {
    const { limit = 10000, offset = 0, statusCode, search, startDate, endDate, date } = req.query;
    const logs = await walletService.getHitLogs(req.user.id, {
      limit: limit === 'all' ? 'all' : parseInt(limit, 10) || 10000,
      offset: parseInt(offset, 10) || 0,
      statusCode: statusCode ? (statusCode === 'all' ? null : parseInt(statusCode, 10)) : null,
      search,
      startDate,
      endDate,
      date,
    });
    return ApiResponse.success(res, logs, 'API hit logs fetched successfully');
  }),

  /**
   * Top-up Wallet Balance (Direct/Instant Legacy)
   */
  topup: asyncHandler(async (req, res) => {
    const { amount, method, referenceId } = req.body;
    const result = await walletService.topupWallet(req.user.id, {
      amount,
      method,
      referenceId,
    });
    return ApiResponse.success(res, result, 'Wallet topped up successfully');
  }),

  /**
   * Submit Recharge Request with UTR for Admin Verification
   */
  submitRechargeRequest: asyncHandler(async (req, res) => {
    const { amount, utr_number, method, screenshot } = req.body;
    const result = await walletService.submitRechargeRequest(req.user.id, {
      amount,
      utr_number,
      method,
      screenshot,
    });
    return ApiResponse.success(
      res,
      result,
      'Recharge request submitted successfully. Please allow 2-5 minutes for admin verification.',
      201
    );
  }),

  /**
   * Admin: Get all recharge requests
   */
  getAdminRecharges: asyncHandler(async (req, res) => {
    const { status, search, limit = 50, offset = 0 } = req.query;
    const data = await walletService.getAdminRechargeRequests({
      status,
      search,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    return ApiResponse.success(res, data, 'Admin recharge requests fetched successfully');
  }),

  /**
   * Admin: Approve a recharge request
   */
  approveRecharge: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { adminNotes } = req.body || {};
    const result = await walletService.approveRechargeRequest(id, { adminNotes });
    return ApiResponse.success(res, result, 'Recharge request approved and wallet balance credited successfully');
  }),

  /**
   * Admin: Reject a recharge request
   */
  rejectRecharge: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await walletService.rejectRechargeRequest(id, { reason });
    return ApiResponse.success(res, result, 'Recharge request rejected');
  }),
};

export default walletController;
