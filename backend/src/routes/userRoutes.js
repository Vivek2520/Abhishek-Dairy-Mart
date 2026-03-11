/**
 * User Routes
 * Defines all customer user-related API endpoints
 * 
 * @module routes/userRoutes
 */

const express = require('express');
const router = express.Router();

// Import controllers
const userController = require('../controllers/userController');

// Import validation middleware
const { userValidation } = require('../middleware/validation');
// authentication helper for customer
const { authMiddleware } = require('../middleware/auth');

// Import async handler
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @route POST /api/users/register
 * @description Register a new customer
 * @access Public
 */
router.post('/register', userValidation.register, asyncHandler(userController.register));

/**
 * @route POST /api/users/login
 * @description Login customer
 * @access Public
 */
router.post('/login', userValidation.login, asyncHandler(userController.login));

/**
 * @route GET /api/users/auth-config
 * @description Get safe auth client-side configuration
 * @access Public
 */
router.get('/auth-config', asyncHandler(userController.getAuthConfig));

/**
 * @route POST /api/users/google-login
 * @description Login customer with Google ID token
 * @access Public
 */
router.post('/google-login', asyncHandler(userController.googleLogin));

/**
 * @route POST /api/users/logout
 * @description Logout customer
 * @access Public
 */
router.post('/logout', asyncHandler(userController.logout));

/**
 * @route POST /api/users/request-email-otp
 * @description Send email OTP for verification
 * @access Public
 */
router.post('/request-email-otp', asyncHandler(userController.requestEmailOtp));

/**
 * @route POST /api/users/verify-email-otp
 * @description Verify email OTP
 * @access Public
 */
router.post('/verify-email-otp', asyncHandler(userController.verifyEmailOtp));

/**
 * @route POST /api/users/forgot-password
 * @description Request password reset
 * @access Public
 */
router.post('/forgot-password', userValidation.forgotPassword, asyncHandler(userController.forgotPassword));

/**
 * @route POST /api/users/reset-password
 * @description Reset password using token
 * @access Public
 */
router.post('/reset-password', userValidation.resetPassword, asyncHandler(userController.resetPassword));

/**
 * @route GET /api/users/validate
 * @description Validate authentication token
 * @access Private
 */
router.get('/validate', authMiddleware, asyncHandler(userController.validateToken));

/**
 * @route GET /api/users/profile
 * @description Get user profile
 * @access Private
 */
router.get('/profile', authMiddleware, asyncHandler(userController.getProfile));

/**
 * @route PUT /api/users/profile
 * @description Update user profile
 * @access Private
 */
router.put('/profile', authMiddleware, asyncHandler(userController.updateProfile));

/**
 * @route PUT /api/users/password
 * @description Change password
 * @access Private
 */
router.put('/password', authMiddleware, userValidation.changePassword, asyncHandler(userController.changePassword));

/**
 * @route GET /api/users/addresses
 * @description Get all saved addresses
 * @access Private
 */
router.get('/addresses', authMiddleware, asyncHandler(userController.getAddresses));

/**
 * @route POST /api/users/addresses
 * @description Add a new address
 * @access Private
 */
router.post('/addresses', authMiddleware, userValidation.address, asyncHandler(userController.addAddress));

/**
 * @route DELETE /api/users/addresses/:addressId
 * @description Remove an address
 * @access Private
 */
router.delete('/addresses/:addressId', authMiddleware, asyncHandler(userController.removeAddress));

/**
 * @route GET /api/users/wishlist
 * @description Get wishlist
 * @access Private
 */
router.get('/wishlist', authMiddleware, asyncHandler(userController.getWishlist));

/**
 * @route POST /api/users/wishlist
 * @description Add to wishlist
 * @access Private
 */
router.post('/wishlist', authMiddleware, asyncHandler(userController.addToWishlist));

/**
 * @route DELETE /api/users/wishlist/:productId
 * @description Remove from wishlist
 * @access Private
 */
router.delete('/wishlist/:productId', authMiddleware, asyncHandler(userController.removeFromWishlist));

module.exports = router;
