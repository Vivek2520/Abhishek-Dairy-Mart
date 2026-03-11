/**
 * Admin Product Routes
 * 
 * @module admin/routes/adminProductRoutes
 */

const express = require('express');
const router = express.Router();
const adminProductController = require('../controllers/adminProductController');
const { adminRoleMiddleware } = require('../middleware/adminAuth');

// Note: Authentication middleware is applied at the aggregator (src/admin/routes/index.js)
// Do NOT apply adminAuthMiddleware again here, as it would be applied twice

// GET /api/admin/products
router.get('/', adminProductController.getAllProducts);

// POST /api/admin/products
router.post('/', adminProductController.createProduct);

// GET /api/admin/products/:id
router.get('/:id', adminProductController.getProductById);

// PUT /api/admin/products/:id
router.put('/:id', adminProductController.updateProduct);

// DELETE /api/admin/products/:id
router.delete('/:id', adminProductController.deleteProduct);

// PUT /api/admin/products/:id/restore
router.put('/:id/restore', adminProductController.restoreProduct);

// POST /api/admin/products/bulk/delete
router.post('/bulk/delete', adminProductController.bulkDeleteProducts);

// PUT /api/admin/products/bulk/status
router.put('/bulk/status', adminProductController.bulkUpdateStatus);

module.exports = router;
