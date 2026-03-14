/**
 * Cart Controller
 * Handles all cart-related HTTP requests
 * 
 * @module controllers/cartController
 */

const cartServiceDB = require('../services/cartServiceDB');
const db = require('../config/db');
const { AppError } = require('../utils/AppError');

/**
 * Get user's cart
 * @route GET /api/cart
 */
const getCart = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        console.log(`[REQUEST] GET /api/cart - User: ${userId}`);

        const cart = await cartServiceDB.getCart(userId);

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        console.error(`[ERROR] getCart: ${error.message}`);
        next(error);
    }
};

/**
 * Add item to cart
 * @route POST /api/cart/items
 */
const addToCart = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId, quantity = 1 } = req.body;
        
        console.log(`[REQUEST] POST /api/cart/items - User: ${userId}, Product: ${productId}`);

        // Verify product exists
        const [product] = await db.execute('SELECT id FROM products WHERE id = ?', [productId]);
        if (product.length === 0) {
            throw new AppError('Product not found', 404, 'NotFoundError');
        }

        const cart = await cartServiceDB.addItem(userId, productId, quantity);

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            data: cart
        });
    } catch (error) {
        console.error(`[ERROR] addToCart: ${error.message}`);
        next(error);
    }
};

/**
 * Update item quantity
 * @route PUT /api/cart/items/:productId
 */
const updateCartItem = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId } = req.params;
        const { quantity } = req.body;
        
        console.log(`[REQUEST] PUT /api/cart/items/${productId} - User: ${userId}, Qty: ${quantity}`);

        if (!productId) {
            throw new AppError('Product ID is required', 400, 'ValidationError');
        }

        if (quantity === undefined || quantity === null) {
            throw new AppError('Quantity is required', 400, 'ValidationError');
        }

        if (quantity < 0) {
            throw new AppError('Quantity cannot be negative', 400, 'ValidationError');
        }

        const cart = await cartServiceDB.updateItemQuantity(userId, productId, quantity);

        res.status(200).json({
            success: true,
            message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
            data: cart
        });
    } catch (error) {
        console.error(`[ERROR] updateCartItem: ${error.message}`);
        next(error);
    }
};

/**
 * Remove item from cart
 * @route DELETE /api/cart/items/:productId
 */
const removeFromCart = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId } = req.params;
        
        console.log(`[REQUEST] DELETE /api/cart/items/${productId} - User: ${userId}`);

        if (!productId) {
            throw new AppError('Product ID is required', 400, 'ValidationError');
        }

        const cart = await cartServiceDB.removeItem(userId, productId);

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: cart
        });
    } catch (error) {
        console.error(`[ERROR] removeFromCart: ${error.message}`);
        next(error);
    }
};

/**
 * Clear cart
 * @route DELETE /api/cart
 */
const clearCart = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        console.log(`[REQUEST] DELETE /api/cart - User: ${userId}`);

        const cart = await cartServiceDB.clearCart(userId);

        res.status(200).json({
            success: true,
            message: 'Cart cleared',
            data: cart
        });
    } catch (error) {
        console.error(`[ERROR] clearCart: ${error.message}`);
        next(error);
    }
};

/**
 * Merge local cart with server cart
 * @route POST /api/cart/merge
 */
const mergeCart = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { localItems } = req.body;
        
        console.log(`[REQUEST] POST /api/cart/merge - User: ${userId}`);

        const cart = await cartServiceDB.mergeCart(userId, localItems);

        res.status(200).json({
            success: true,
            message: 'Cart merged successfully',
            data: cart
        });
    } catch (error) {
        console.error(`[ERROR] mergeCart: ${error.message}`);
        next(error);
    }
};

/**
 * Apply coupon to current user's cart
 * @route POST /api/cart/apply-coupon
 */
const applyCoupon = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { code } = req.body;

        console.log(`[REQUEST] POST /api/cart/apply-coupon - User: ${userId}, Code: ${code}`);

        if (!code) {
            throw new AppError('Coupon code is required', 400, 'ValidationError');
        }

        const cart = await cartServiceDB.getCart(userId);

        // validate coupon against cart subtotal and items
        const { discount, newTotal, coupon } = couponService.validateCoupon(
            code,
            cart.subtotal,
            cart.items,
            userId
        );

        // store coupon info on cart for later order creation
        // TODO: Coupon support
        res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                discount: 0,
                total: cart.total,
                coupon: { code }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                discount,
                total: newTotal,
                coupon
            }
        });
    } catch (error) {
        console.error(`[ERROR] applyCoupon: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    mergeCart,
    applyCoupon
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    mergeCart
};
