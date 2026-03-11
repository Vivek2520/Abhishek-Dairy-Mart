/**
 * Admin Dashboard Routes
 * 
 * @module admin/routes/adminDashboardRoutes
 */

const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardController');

// Note: Authentication middleware is applied at the aggregator (src/admin/routes/index.js)
// Do NOT apply adminAuthMiddleware again here, as it would be applied twice

// GET /api/admin/dashboard/metrics
router.get('/metrics', adminDashboardController.getMetrics);

// GET /api/admin/dashboard/charts
router.get('/charts', adminDashboardController.getChartData);

// GET /api/admin/dashboard/top-products
router.get('/top-products', adminDashboardController.getTopProducts);

// GET /api/admin/dashboard/recent-orders
router.get('/recent-orders', adminDashboardController.getRecentOrders);

// GET /api/admin/dashboard/recent-users
router.get('/recent-users', adminDashboardController.getRecentUsers);

module.exports = router;
