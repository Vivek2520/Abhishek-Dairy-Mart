/**
 * Order Routes
 * Public and admin order management
 * 
 * @module routes/orderRoutes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateUser, authenticateAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    next();
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * POST /api/orders
 * Create new order
 */
router.post('/', optionalAuth, [
    body('customerName').trim().notEmpty().withMessage('Customer name is required'),
    body('customerPhone').trim().notEmpty().withMessage('Phone is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Valid total amount is required')
], validateRequest, async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, deliveryAddress, items, totalAmount, paymentMethod = 'cash', notes } = req.body;
        
        const orderId = 'ORD' + Date.now();
        
        // Insert order
        const [result] = await db.execute(
            `INSERT INTO orders (order_id, user_id, customer_name, customer_phone, customer_email, delivery_address, items, total_amount, payment_method, order_status, payment_status, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                req.user ? req.user.id : null,
                customerName,
                customerPhone,
                customerEmail || null,
                deliveryAddress || null,
                JSON.stringify(items),
                totalAmount,
                paymentMethod,
                'pending',
                'pending',
                notes || null
            ]
        );
        
        // Update product stock (simplified - in production you'd handle this more carefully)
        for (const item of items) {
            if (item.productId || item.id) {
                await db.execute(
                    'UPDATE products SET stock = stock - ?, stock_sold = stock_sold + ? WHERE id = ?',
                    [item.quantity, item.quantity, item.productId || item.id]
                );
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                orderId,
                order_id: orderId
            }
        });
        
    } catch (error) {
        console.error('[Orders] Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

/**
 * GET /api/orders
 * Get all orders (public - for testing)
 */
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND order_status = ?';
            params.push(status);
        }
        
        // Get count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;
        
        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [orders] = await db.execute(query, params);
        
        // Parse JSON items
        const parsedOrders = orders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));
        
        res.json({
            success: true,
            count: orders.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: parsedOrders
        });
        
    } catch (error) {
        console.error('[Orders] Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get orders'
        });
    }
});

/**
 * GET /api/orders/:orderId
 * Get single order by order ID
 */
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE order_id = ?',
            [orderId]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const order = orders[0];
        order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        
        res.json({
            success: true,
            data: order
        });
        
    } catch (error) {
        console.error('[Orders] Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order'
        });
    }
});

// ============================================
// PROTECTED ROUTES
// ============================================

/**
 * GET /api/orders/my
 * Get current user's orders
 */
router.get('/my/orders', authenticateUser, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        let query = 'SELECT * FROM orders WHERE user_id = ?';
        const params = [req.user.id];
        
        if (status) {
            query += ' AND order_status = ?';
            params.push(status);
        }
        
        // Get count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;
        
        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [orders] = await db.execute(query, params);
        
        // Parse JSON items
        const parsedOrders = orders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));
        
        res.json({
            success: true,
            count: orders.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: parsedOrders
        });
        
    } catch (error) {
        console.error('[Orders] Get my orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get orders'
        });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /api/orders/admin/all
 * Get all orders for admin
 */
router.get('/admin/all', authenticateAdmin, async (req, res) => {
    try {
        const { status, paymentStatus, search, page = 1, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND order_status = ?';
            params.push(status);
        }
        
        if (paymentStatus && paymentStatus !== 'all') {
            query += ' AND payment_status = ?';
            params.push(paymentStatus);
        }
        
        if (search) {
            query += ' AND (order_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Get count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;
        
        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [orders] = await db.execute(query, params);
        
        // Parse JSON items
        const parsedOrders = orders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));
        
        res.json({
            success: true,
            count: orders.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: parsedOrders
        });
        
    } catch (error) {
        console.error('[Orders] Admin get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get orders'
        });
    }
});

/**
 * PUT /api/orders/:orderId/status
 * Update order status (admin)
 */
router.put('/:orderId/status', authenticateAdmin, [
    body('orderStatus').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status')
], validateRequest, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus, paymentStatus } = req.body;
        
        const [existing] = await db.execute(
            'SELECT id FROM orders WHERE order_id = ?',
            [orderId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        let updateQuery = 'UPDATE orders SET ';
        const updates = [];
        const params = [];
        
        if (orderStatus) {
            updates.push('order_status = ?');
            params.push(orderStatus);
        }
        
        if (paymentStatus) {
            updates.push('payment_status = ?');
            params.push(paymentStatus);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        updateQuery += updates.join(', ');
        updateQuery += ' WHERE order_id = ?';
        params.push(orderId);
        
        await db.execute(updateQuery, params);
        
        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
        
    } catch (error) {
        console.error('[Orders] Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

/**
 * GET /api/orders/stats
 * Get order statistics
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN order_status = 'shipped' THEN 1 ELSE 0 END) as shipped,
                SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN total_amount ELSE 0 END) as today_revenue,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as today_orders
            FROM orders
        `);
        
        res.json({
            success: true,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('[Orders] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order stats'
        });
    }
});

module.exports = router;

