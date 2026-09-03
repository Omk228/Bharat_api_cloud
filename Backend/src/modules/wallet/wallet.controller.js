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
    const { limit = 50, offset = 0, type, search } = req.query;
    const transactions = await walletService.getTransactions(req.user.id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      type,
      search,
    });
    return ApiResponse.success(res, transactions, 'Wallet transactions fetched successfully');
  }),

  /**
   * Get API Hit Logs
   */
  getHitLogs: asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0, statusCode, search } = req.query;
    const logs = await walletService.getHitLogs(req.user.id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      statusCode: statusCode ? parseInt(statusCode, 10) : null,
      search,
    });
    return ApiResponse.success(res, logs, 'API hit logs fetched successfully');
  }),

  /**
   * Top-up Wallet Balance
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
};

export default walletController;
