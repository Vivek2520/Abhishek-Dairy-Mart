/**
 * Admin User Routes
 * 
 * @module admin/routes/adminUserRoutes
 */

const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');

// Note: Authentication middleware is applied at the aggregator (src/admin/routes/index.js)
// Do NOT apply adminAuthMiddleware again here, as it would be applied twice

// GET /api/admin/users/statistics/overview
router.get('/statistics/overview', adminUserController.getUserStatistics);

// GET /api/admin/users
router.get('/', adminUserController.getAllUsers);

// GET /api/admin/users/:id
router.get('/:id', adminUserController.getUserById);

// PUT /api/admin/users/:id/block
router.put('/:id/block', adminUserController.blockUser);

// PUT /api/admin/users/:id/unblock
router.put('/:id/unblock', adminUserController.unblockUser);

// GET /api/admin/users/:id/orders
router.get('/:id/orders', adminUserController.getUserOrders);

module.exports = router;
