/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch promise rejections
 * Prevents unhandled promise rejection warnings and crashes
 * 
 * @module utils/asyncHandler
 */

/**
 * Wraps an async route handler to catch promise rejections
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware that catches errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Alternative async handler using try-catch pattern
 * Useful for explicit error handling
 */
const asyncHandlerTryCatch = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    asyncHandler,
    asyncHandlerTryCatch
};
