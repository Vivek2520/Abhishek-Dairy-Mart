/**
 * Admin Order Routes
 * 
 * @module admin/routes/adminOrderRoutes
 */

const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');

// Note: Authentication middleware is applied at the aggregator (src/admin/routes/index.js)
// Do NOT apply adminAuthMiddleware again here, as it would be applied twice

// GET /api/admin/orders
router.get('/', adminOrderController.getAllOrders);

// GET /api/admin/orders/:id
router.get('/:id', adminOrderController.getOrderById);

// PUT /api/admin/orders/:id/status
router.put('/:id/status', adminOrderController.updateOrderStatus);

// POST /api/admin/orders/:id/comment
router.post('/:id/comment', adminOrderController.addComment);

// POST /api/admin/orders/:id/refund
router.post('/:id/refund', adminOrderController.processRefund);

// GET /api/admin/orders/:id/invoice
router.get('/:id/invoice', adminOrderController.generateInvoice);

module.exports = router;
