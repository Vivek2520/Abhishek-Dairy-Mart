/**
 * Admin User Controller
 * Handles user management endpoints
 * 
 * @module admin/controllers/adminUserController
 */

const adminUserService = require('../services/adminUserService');
const { AppError } = require('../../utils/AppError');

/**
 * Get all users
 * @route GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
    try {
        const { page, limit, status, search, sortBy, sortOrder, startDate, endDate } = req.query;

        console.log(`[REQUEST] GET /api/admin/users - Query:`, req.query);

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status,
            search,
            sortBy: sortBy || 'registrationDate',
            sortOrder: sortOrder || 'desc',
            startDate,
            endDate
        };

        const result = adminUserService.getAllUsers(options);

        console.log(`[RESPONSE] Retrieved ${result.data.length} users`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getAllUsers: ${error.message}`);
        next(error);
    }
};

/**
 * Get user by ID
 * @route GET /api/admin/users/:id
 */
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] GET /api/admin/users/${id}`);

        const result = adminUserService.getUserById(id);

        console.log(`[RESPONSE] User retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getUserById: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Block user
 * @route PUT /api/admin/users/:id/block
 */
const blockUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        console.log(`[REQUEST] PUT /api/admin/users/${id}/block`);

        const result = adminUserService.blockUser(id, reason || '');

        console.log(`[RESPONSE] User blocked: ${id}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] blockUser: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(new AppError(error.message, 400, 'BadRequestError'));
        }
    }
};

/**
 * Unblock user
 * @route PUT /api/admin/users/:id/unblock
 */
const unblockUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] PUT /api/admin/users/${id}/unblock`);

        const result = adminUserService.unblockUser(id);

        console.log(`[RESPONSE] User unblocked: ${id}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] unblockUser: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(new AppError(error.message, 400, 'BadRequestError'));
        }
    }
};

/**
 * Get user orders
 * @route GET /api/admin/users/:id/orders
 */
const getUserOrders = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page, limit, status } = req.query;

        console.log(`[REQUEST] GET /api/admin/users/${id}/orders`);

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status
        };

        const result = adminUserService.getUserOrders(id, options);

        console.log(`[RESPONSE] Retrieved ${result.data.length} user orders`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getUserOrders: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Get user statistics
 * @route GET /api/admin/users/statistics/overview
 */
const getUserStatistics = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/admin/users/statistics/overview`);

        const result = adminUserService.getUserStatistics();

        console.log(`[RESPONSE] User statistics retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getUserStatistics: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    blockUser,
    unblockUser,
    getUserOrders,
    getUserStatistics
};
