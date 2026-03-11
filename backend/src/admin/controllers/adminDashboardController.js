/**
 * Admin Dashboard Controller
 * Handles dashboard metrics and analytics endpoints
 * 
 * @module admin/controllers/adminDashboardController
 */

const adminDashboardService = require('../services/adminDashboardService');
const { AppError } = require('../../utils/AppError');

/**
 * Get dashboard metrics
 * @route GET /api/admin/dashboard/metrics
 */
const getMetrics = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/admin/dashboard/metrics - Admin: ${req.admin?.id}`);

        const result = adminDashboardService.getDashboardMetrics();

        console.log(`[RESPONSE] Dashboard metrics retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getMetrics: ${error.message}`);
        next(error);
    }
};

/**
 * Get sales chart data
 * @route GET /api/admin/dashboard/charts
 */
const getChartData = async (req, res, next) => {
    try {
        const { period } = req.query;

        console.log(`[REQUEST] GET /api/admin/dashboard/charts - Period: ${period || 'daily'}`);

        if (period && !['daily', 'weekly', 'monthly'].includes(period)) {
            throw new AppError('Invalid period. Must be daily, weekly, or monthly.', 400, 'ValidationError');
        }

        const result = adminDashboardService.getSalesChartData(period || 'daily');

        console.log(`[RESPONSE] Chart data retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getChartData: ${error.message}`);
        next(error);
    }
};

/**
 * Get top products
 * @route GET /api/admin/dashboard/top-products
 */
const getTopProducts = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        console.log(`[REQUEST] GET /api/admin/dashboard/top-products - Limit: ${limit}`);

        const limitNum = Math.min(parseInt(limit) || 10, 100);

        const result = adminDashboardService.getTopProducts(limitNum);

        console.log(`[RESPONSE] Top products retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getTopProducts: ${error.message}`);
        next(error);
    }
};

/**
 * Get recent orders
 * @route GET /api/admin/dashboard/recent-orders
 */
const getRecentOrders = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        console.log(`[REQUEST] GET /api/admin/dashboard/recent-orders - Limit: ${limit}`);

        const limitNum = Math.min(parseInt(limit) || 10, 100);

        const result = adminDashboardService.getRecentOrders(limitNum);

        console.log(`[RESPONSE] Recent orders retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getRecentOrders: ${error.message}`);
        next(error);
    }
};

/**
 * Get recent users
 * @route GET /api/admin/dashboard/recent-users
 */
const getRecentUsers = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        console.log(`[REQUEST] GET /api/admin/dashboard/recent-users - Limit: ${limit}`);

        const limitNum = Math.min(parseInt(limit) || 10, 100);

        const result = adminDashboardService.getRecentUsers(limitNum);

        console.log(`[RESPONSE] Recent users retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getRecentUsers: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getMetrics,
    getChartData,
    getTopProducts,
    getRecentOrders,
    getRecentUsers
};
