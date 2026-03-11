/**
 * Custom Error Class
 * Extends the built-in Error class to add status code and error type
 * 
 * @module utils/AppError
 */

/**
 * Custom Application Error
 * @extends Error
 */
class AppError extends Error {
    /**
     * Creates a new Application Error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} errorType - Type of error for categorization
     */
    constructor(message, statusCode, errorType = 'Error') {
        super(message);
        
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.errorType = errorType;
        this.isOperational = true;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Creates a 400 Bad Request error
 * @param {string} message - Error message
 * @returns {AppError}
 */
const badRequest = (message = 'Bad Request') => 
    new AppError(message, 400, 'BadRequestError');

/**
 * Creates a 401 Unauthorized error
 * @param {string} message - Error message
 * @returns {AppError}
 */
const unauthorized = (message = 'Unauthorized') => 
    new AppError(message, 401, 'UnauthorizedError');

/**
 * Creates a 403 Forbidden error
 * @param {string} message - Error message
 * @returns {AppError}
 */
const forbidden = (message = 'Forbidden') => 
    new AppError(message, 403, 'ForbiddenError');

/**
 * Creates a 404 Not Found error
 * @param {string} message - Error message
 * @returns {AppError}
 */
const notFound = (message = 'Resource not found') => 
    new AppError(message, 404, 'NotFoundError');

/**
 * Creates a 422 Validation Error
 * @param {string} message - Error message
 * @returns {AppError}
 */
const validationError = (message = 'Validation failed') => 
    new AppError(message, 422, 'ValidationError');

/**
 * Creates a 500 Internal Server Error
 * @param {string} message - Error message
 * @returns {AppError}
 */
const serverError = (message = 'Internal Server Error') => 
    new AppError(message, 500, 'InternalServerError');

module.exports = {
    AppError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    validationError,
    serverError
};
