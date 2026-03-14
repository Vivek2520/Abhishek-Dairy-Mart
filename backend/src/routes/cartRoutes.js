/**
 * Cart Routes
 * Defines all cart-related API endpoints
 * 
 * @module routes/cartRoutes
 */

const express = require('express');
const router = express.Router();

// Import controllers
const cartController = require('../controllers/cartController');

// Import validation middleware
const { cartValidation } = require('../middleware/validation');

// authentication helper for customer
const { authMiddleware } = require('../middleware/auth');

// Import async handler
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @route GET /api/cart
 * @description Get cart for logged in user
 * @access Private
 */
router.get('/', authMiddleware, asyncHandler(cartController.getCart));

/**
 * @route POST /api/cart
 * @description Add item to cart (task requirement mapping)
 * @access Private
 */
router.post('/', authMiddleware, cartValidation.addItem, asyncHandler(cartController.addToCart));

/**
 * @route POST /api/cart/items
 * @description Add item to cart (legacy)
 * @access Private
 */
router.post('/items', authMiddleware, cartValidation.addItem, asyncHandler(cartController.addToCart));

/**
 * @route PUT /api/cart/items/:productId
 * @description Update cart item quantity
 * @access Private
 */
router.put('/items/:productId', authMiddleware, asyncHandler(cartController.updateItem));

/**
 * @route DELETE /api/cart/:id
 * @description Remove item from cart (task requirement mapping)
 * @access Private
 */
router.delete('/:productId', authMiddleware, asyncHandler(cartController.removeFromCart));

/**
 * @route DELETE /api/cart/items/:productId
 * @description Remove item from cart (legacy)
 * @access Private
 */
router.delete('/items/:productId', authMiddleware, asyncHandler(cartController.removeFromCart));

/**
 * @route DELETE /api/cart
 * @description Clear cart
 * @access Private
 */
router.delete('/', authMiddleware, asyncHandler(cartController.clearCart));

/**
 * @route POST /api/cart/apply-coupon
 * @description Apply coupon code to cart
 * @access Private
 */
router.post('/apply-coupon', authMiddleware, asyncHandler(cartController.applyCoupon));

module.exports = router;
