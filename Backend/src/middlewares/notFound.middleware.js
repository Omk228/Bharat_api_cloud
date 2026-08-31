import { ApiError } from '../utils/apiError.js';

/**
 * 404 Not Found Middleware for unhandled routes
 */
export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFoundHandler;
