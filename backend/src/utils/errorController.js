/**
 * Global Error Controller
 * Handles all errors in the application and sends consistent error responses
 * 
 * @module utils/errorController
 */

const { AppError } = require('./AppError');
const { config, isProduction } = require('../config');

/**
 * Handles Multer file upload errors
 * @param {Error} err - Error object from Multer
 * @returns {AppError} Formatted error
 */
const handleMulterError = (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return new AppError('File size too large', 400, 'MulterError');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return new AppError('Unexpected file field', 400, 'MulterError');
    }
    return new AppError(err.message, 400, 'MulterError');
};

/**
 * Handles JWT errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
const handleJWTError = () => 
    new AppError('Invalid token. Please log in again.', 401, 'JWTError');

/**
 * Handles JWT expired errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
const handleJWTExpiredError = () => 
    new AppError('Your token has expired. Please log in again.', 401, 'JWTExpiredError');

/**
 * Development error handler - returns detailed error information
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';
    
    res.status(statusCode).json({
        success: false,
        status: status,
        error: err.errorType || 'Error',
        message: err.message,
        stack: err.stack,
        timestamp: err.timestamp || new Date().toISOString()
    });
};

/**
 * Production error handler - returns sanitized error information
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // Operational errors - send message to client
    if (err.isOperational) {
        return res.status(statusCode).json({
            success: false,
            status: status,
            error: err.errorType,
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }

    // Programming or unknown errors - don't leak error details
    console.error('ERROR 💥:', err);
    
    res.status(500).json({
        success: false,
        status: 'error',
        error: 'InternalServerError',
        message: isProduction() ? 'Something went wrong!' : err.message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorController = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.timestamp = new Date().toISOString();

    // Log error for debugging
    if (isProduction()) {
        console.error(`[ERROR] ${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    } else {
        console.error(`[ERROR] ${err.stack}`);
    }

    // Handle specific error types
    if (err.name === 'MulterError') {
        error = handleMulterError(err);
    } else if (err.name === 'JsonWebTokenError') {
        error = handleJWTError();
    } else if (err.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    }

    // Send error response based on environment
    if (isProduction()) {
        sendErrorProd(error, res);
    } else {
        sendErrorDev(error, res);
    }
};

/**
 * 404 handler for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Route ${req.originalUrl} not found on this server`,
        404,
        'NotFoundError'
    );
    next(error);
};

module.exports = {
    errorController,
    notFoundHandler
};
