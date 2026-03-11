/**
 * Admin Order Controller
 * Handles order management endpoints
 * 
 * @module admin/controllers/adminOrderController
 */

const adminOrderService = require('../services/adminOrderService');
const { AppError } = require('../../utils/AppError');

/**
 * Get all orders
 * @route GET /api/admin/orders
 */
const getAllOrders = async (req, res, next) => {
    try {
        const { page, limit, status, paymentStatus, search, startDate, endDate, sortBy, sortOrder } = req.query;

        console.log(`[REQUEST] GET /api/admin/orders - Query:`, req.query);

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status,
            paymentStatus,
            search,
            startDate,
            endDate,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'desc'
        };

        const result = adminOrderService.getAllOrders(options);

        console.log(`[RESPONSE] Retrieved ${result.data.length} orders`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getAllOrders: ${error.message}`);
        next(error);
    }
};

/**
 * Get order by ID
 * @route GET /api/admin/orders/:id
 */
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] GET /api/admin/orders/${id}`);

        const result = adminOrderService.getOrderById(id);

        console.log(`[RESPONSE] Order retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getOrderById: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Update order status
 * @route PUT /api/admin/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log(`[REQUEST] PUT /api/admin/orders/${id}/status - Status: ${status}`);

        if (!status) {
            throw new AppError('Status is required', 400, 'ValidationError');
        }

        const result = adminOrderService.updateOrderStatus(id, status);

        console.log(`[RESPONSE] Order status updated: ${status}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] updateOrderStatus: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else if (error.message.includes('Invalid status')) {
            next(new AppError(error.message, 400, 'ValidationError'));
        } else {
            next(error);
        }
    }
};

/**
 * Add comment to order
 * @route POST /api/admin/orders/:id/comment
 */
const addComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        console.log(`[REQUEST] POST /api/admin/orders/${id}/comment`);

        if (!comment || comment.trim() === '') {
            throw new AppError('Comment text is required', 400, 'ValidationError');
        }

        const result = adminOrderService.addComment(id, comment);

        console.log(`[RESPONSE] Comment added successfully`);

        res.status(201).json(result);
    } catch (error) {
        console.error(`[ERROR] addComment: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Process refund
 * @route POST /api/admin/orders/:id/refund
 */
const processRefund = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        console.log(`[REQUEST] POST /api/admin/orders/${id}/refund - Amount: ${amount}`);

        if (!amount || amount <= 0) {
            throw new AppError('Valid refund amount is required', 400, 'ValidationError');
        }

        if (!reason || reason.trim() === '') {
            throw new AppError('Refund reason is required', 400, 'ValidationError');
        }

        const result = adminOrderService.processRefund(id, amount, reason);

        console.log(`[RESPONSE] Refund processed successfully`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] processRefund: ${error.message}`);
        next(error);
    }
};

/**
 * Generate invoice
 * @route GET /api/admin/orders/:id/invoice
 */
const generateInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] GET /api/admin/orders/${id}/invoice`);

        const result = adminOrderService.generateInvoice(id);

        console.log(`[RESPONSE] Invoice generated`);

        // For production, you would generate PDF here and send it
        // For now, returning invoice data
        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] generateInvoice: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    addComment,
    processRefund,
    generateInvoice
};
