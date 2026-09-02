import jwt from 'jsonwebtoken';
import { ApiError } from '../../core/utils/apiError.js';
import { ENV } from '../../core/config/env.config.js';
import { userModel } from './user.model.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

/**
 * Middleware to verify JWT authentication token
 */
export const verifyJwt = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT.SECRET);
    
    // Optional: fetch user from DB if needed
    const user = await userModel.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired, please log in again');
    }
    throw ApiError.unauthorized('Invalid or corrupted authentication token');
  }
});

export default verifyJwt;
