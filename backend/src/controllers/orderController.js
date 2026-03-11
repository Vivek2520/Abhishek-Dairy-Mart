/**
 * Order Controller
 * Handles all order-related HTTP requests
 * 
 * @module controllers/orderController
 */

const orderService = require('../services/orderService');
const couponService = require('../services/couponService');
const excelService = require('../services/excelService');
const userService = require('../services/userService');
const { AppError } = require('../utils/AppError');

/**
 * Creates a new order
 * @route POST /api/orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createOrder = async (req, res, next) => {
    try {
        console.log(`[REQUEST] POST /api/orders - Body:`, req.body);

        const { customerName, customerPhone, items, deliveryAddress, couponCode, discountAmount } = req.body;

        // Validate required fields
        if (!customerName || !customerPhone || !items || items.length === 0) {
            throw new AppError('Missing required fields', 400, 'ValidationError');
        }

        // optionally attach userId if authenticated
        const userId = req.user ? req.user.userId : null;

        // Create order using service (will recalc totals)
        const newOrder = orderService.createOrder({
            customerName,
            customerPhone,
            items,
            deliveryAddress,
            userId,
            couponCode,
            discountAmount
        });

        console.log(`[RESPONSE] Order created: ${newOrder.orderId}`);

        // record coupon usage if applied
        if (couponCode) {
            try { couponService.recordUsage(couponCode, userId); } catch (e) {}
        }

        // if user is logged in, append summary to user profile
        if (userId) {
            userService.addOrderToUser(userId, {
                orderId: newOrder.orderId,
                totalAmount: newOrder.totalAmount,
                createdAt: newOrder.createdAt
            });
        }

        // append to excel file asynchronously
        excelService.appendOrder(newOrder);

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: newOrder
        });
    } catch (error) {
        console.error(`[ERROR] createOrder: ${error.message}`);
        next(error);
    }
};

/**
 * Gets all orders
 * @route GET /api/orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllOrders = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/orders`);

        // Load orders
        const orders = orderService.loadOrders();

        console.log(`[RESPONSE] Returning ${orders.length} orders`);

        // Return success response
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error(`[ERROR] getAllOrders: ${error.message}`);
        next(error);
    }
};

/**
 * Gets a single order by ID
 * @route GET /api/orders/:orderId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getOrderById = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        console.log(`[REQUEST] GET /api/orders/${orderId}`);

        // Find order
        const order = orderService.findOrderById(orderId);

        if (!order) {
            console.log(`[WARNING] Order not found: ${orderId}`);
            throw new AppError('Order not found', 404, 'NotFoundError');
        }

        console.log(`[RESPONSE] Order found: ${order.orderId}`);

        // Return success response
        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error(`[ERROR] getOrderById: ${error.message}`);
        next(error);
    }
};

/**
 * Updates order status
 * @route PATCH /api/orders/:orderId/status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        console.log(`[REQUEST] PATCH /api/orders/${orderId}/status - Status: ${status}`);

        if (!status) {
            throw new AppError('Status is required', 400, 'ValidationError');
        }

        // Update order status
        const updatedOrder = orderService.updateOrderStatus(orderId, status);

        if (!updatedOrder) {
            throw new AppError('Order not found', 404, 'NotFoundError');
        }

        console.log(`[RESPONSE] Order status updated: ${updatedOrder.orderId} -> ${status}`);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: updatedOrder
        });
    } catch (error) {
        console.error(`[ERROR] updateOrderStatus: ${error.message}`);
        next(error);
    }
};

/**
 * Gets order statistics
 * @route GET /api/orders/stats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getOrdersForUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        console.log(`[REQUEST] GET /api/orders/user/${userId}`);
        const orders = orderService.getOrdersByUserId(userId);
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error(`[ERROR] getOrdersForUser: ${error.message}`);
        next(error);
    }
};

const getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) {
            throw new AppError('Authentication required', 401, 'AuthError');
        }
        console.log(`[REQUEST] GET /api/orders/me - User: ${userId}`);
        const orders = orderService.getOrdersByUserId(userId);
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error(`[ERROR] getMyOrders: ${error.message}`);
        next(error);
    }
};

const getOrderStats = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/orders/stats`);

        // Get statistics
        const stats = orderService.getOrderStats();

        console.log(`[RESPONSE] Order stats:`, stats);

        // Return success response
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error(`[ERROR] getOrderStats: ${error.message}`);
        next(error);
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    getOrdersForUser,
    getMyOrders,
    getOrderStats
};
