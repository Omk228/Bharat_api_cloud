/**
 * Standard API Response Structure
 */
export class ApiResponse {
  constructor(statusCode = 200, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
  }

  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return res.status(201).json(new ApiResponse(201, data, message));
  }
}

export default ApiResponse;
