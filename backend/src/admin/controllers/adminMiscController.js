/**
 * Admin Controllers Batch File
 * Contains controllers for Categories, Coupons, Inventory, Reports, and Settings
 */

const categoryService = require('../services/adminCategoryService');
const couponService = require('../services/adminCouponService');
const inventoryService = require('../services/adminInventoryService');
const reportService = require('../services/adminReportService');
const settingsService = require('../services/adminSettingsService');
const fs = require('fs');
const path = require('path');
const { config } = require('../../config');
const { AppError } = require('../../utils/AppError');

// ============================================
// CATEGORY CONTROLLERS
// ============================================

const categoryController = {
    getAll: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/categories`);
            const result = categoryService.getAllCategories(req.query);
            console.log(`[RESPONSE] Retrieved ${result.data.length} categories`);
            res.status(200).json(result);
        } catch (error) {
            console.error(`[ERROR] GET /categories: ${error.message}`);
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/categories/${req.params.id}`);
            const result = categoryService.getCategoryById(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                next(new AppError(error.message, 404, 'NotFoundError'));
            } else {
                next(error);
            }
        }
    },

    create: async (req, res, next) => {
        try {
            console.log(`[REQUEST] POST /api/admin/categories`);
            if (!req.body.name) {
                throw new AppError('Category name is required', 400, 'ValidationError');
            }
            const result = categoryService.createCategory(req.body);
            eventBus.emit('dataChanged', { type: 'category', action: 'create', data: result.data });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {
            console.log(`[REQUEST] PUT /api/admin/categories/${req.params.id}`);
            const result = categoryService.updateCategory(req.params.id, req.body);
            eventBus.emit('dataChanged', { type: 'category', action: 'update', data: result.data });
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                next(new AppError(error.message, 404, 'NotFoundError'));
            } else {
                next(error);
            }
        }
    },

    delete: async (req, res, next) => {
        try {
            console.log(`[REQUEST] DELETE /api/admin/categories/${req.params.id}`);
            const result = categoryService.deleteCategory(req.params.id);
            eventBus.emit('dataChanged', { type: 'category', action: 'delete', id: req.params.id });
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                next(new AppError(error.message, 404, 'NotFoundError'));
            } else {
                next(error);
            }
        }
    }
};

// ============================================
// COUPON CONTROLLERS
// ============================================

const couponController = {
    getAll: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/coupons`);
            const result = couponService.getAllCoupons(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/coupons/${req.params.id}`);
            const result = couponService.getCouponById(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                next(new AppError(error.message, 404, 'NotFoundError'));
            } else {
                next(error);
            }
        }
    },

    create: async (req, res, next) => {
        try {
            console.log(`[REQUEST] POST /api/admin/coupons`);
            if (!req.body.code) {
                throw new AppError('Coupon code is required', 400, 'ValidationError');
            }
            const result = couponService.createCoupon(req.body);
            eventBus.emit('dataChanged', { type: 'coupon', action: 'create', data: result.data });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {
            console.log(`[REQUEST] PUT /api/admin/coupons/${req.params.id}`);
            const result = couponService.updateCoupon(req.params.id, req.body);
            eventBus.emit('dataChanged', { type: 'coupon', action: 'update', data: result.data });
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                next(new AppError(error.message, 404, 'NotFoundError'));
            } else {
                next(error);
            }
        }
    },

    delete: async (req, res, next) => {
        try {
            console.log(`[REQUEST] DELETE /api/admin/coupons/${req.params.id}`);
            const result = couponService.deleteCoupon(req.params.id);
            eventBus.emit('dataChanged', { type: 'coupon', action: 'delete', id: req.params.id });
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                next(new AppError(error.message, 404, 'NotFoundError'));
            } else {
                next(error);
            }
        }
    }
};

// ============================================
// INVENTORY CONTROLLERS
// ============================================

const inventoryController = {
    getStatus: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/inventory`);
            const result = inventoryService.getInventoryStatus(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getAlerts: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/inventory/alerts`);
            const result = inventoryService.getLowStockAlerts();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    adjustStock: async (req, res, next) => {
        try {
            console.log(`[REQUEST] POST /api/admin/inventory/adjust`);
            const { productId, changeQuantity, reason } = req.body;
            if (!productId || changeQuantity === undefined) {
                throw new AppError('Product ID and change quantity are required', 400, 'ValidationError');
            }
            const result = inventoryService.adjustStock(productId, parseInt(changeQuantity), reason);
            eventBus.emit('dataChanged', { type: 'inventory', action: 'adjust', data: { productId, changeQuantity } });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getLogs: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/inventory/logs`);
            const result = inventoryService.getInventoryLogs(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    setReorderLevel: async (req, res, next) => {
        try {
            console.log(`[REQUEST] PUT /api/admin/inventory/reorder-level`);
            const { productId, reorderLevel } = req.body;
            if (!productId || reorderLevel === undefined) {
                throw new AppError('Product ID and reorder level are required', 400, 'ValidationError');
            }
            const result = inventoryService.setReorderLevel(productId, reorderLevel);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
};

// ============================================
// REPORT CONTROLLERS
// ============================================

const eventBus = require('../../utils/eventBus');
const excelService = require('../../services/excelService');
const orderService = require('../../services/orderService');

const reportController = {
    getSales: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/reports/sales`);
            const result = reportService.getSalesReport(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getProducts: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/reports/products`);
            const result = reportService.getProductReport(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getUsers: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/reports/users`);
            const result = reportService.getUserReport(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getInventory: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/reports/inventory`);
            const result = reportService.getInventoryReport(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    exportOrders: async (req, res, next) => {
        try {
            console.log('[REQUEST] GET /api/admin/exports/orders');
            // optionally accept date filters in query
            const orders = orderService.loadOrders();
            const filePath = await excelService.generateReport(orders, req.query);
            res.download(filePath);
        } catch (error) {
            next(error);
        }
    },

    exportUsers: async (req, res, next) => {
        try {
            console.log('[REQUEST] GET /api/admin/exports/users');
            const filePath = path.join(config.paths.exportsDir, 'users', 'users.xlsx');
            if (!fs.existsSync(filePath)) {
                throw new AppError('User export not available', 404, 'DataError');
            }
            res.download(filePath);
        } catch (error) {
            next(error);
        }
    }
};


// ============================================
// SETTINGS CONTROLLERS
// ============================================

const settingsController = {
    get: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/settings`);
            const result = settingsService.getSettings();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {
            console.log(`[REQUEST] PUT /api/admin/settings`);
            const result = settingsService.updateSettings(req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getPayment: async (req, res, next) => {
        try {
            console.log(`[REQUEST] GET /api/admin/settings/payment`);
            const result = settingsService.getPaymentSettings();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    updatePayment: async (req, res, next) => {
        try {
            console.log(`[REQUEST] PUT /api/admin/settings/payment`);
            const result = settingsService.updatePaymentSettings(req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = {
    categoryController,
    couponController,
    inventoryController,
    reportController,
    settingsController
};
