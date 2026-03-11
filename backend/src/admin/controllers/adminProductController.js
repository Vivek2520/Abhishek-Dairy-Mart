/**
 * Admin Product Controller
 * Handles product management endpoints
 * 
 * @module admin/controllers/adminProductController
 */

const adminProductService = require('../services/adminProductService');
const eventBus = require('../../utils/eventBus');
const { AppError } = require('../../utils/AppError');

/**
 * Get all products
 * @route GET /api/admin/products
 */
const getAllProducts = async (req, res, next) => {
    try {
        const { page, limit, search, category, status, sortBy, sortOrder } = req.query;

        console.log(`[REQUEST] GET /api/admin/products - Query:`, req.query);

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search,
            category,
            status,
            sortBy: sortBy || 'name',
            sortOrder: sortOrder || 'asc'
        };

        const result = adminProductService.getAllProducts(options);

        console.log(`[RESPONSE] Retrieved ${result.data.length} products`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getAllProducts: ${error.message}`);
        next(error);
    }
};

/**
 * Get product by ID
 * @route GET /api/admin/products/:id
 */
const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] GET /api/admin/products/${id}`);

        const result = adminProductService.getProductById(id);

        console.log(`[RESPONSE] Product retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getProductById: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Create new product
 * @route POST /api/admin/products
 */
const createProduct = async (req, res, next) => {
    try {
        console.log(`[REQUEST] POST /api/admin/products - Body:`, { ...req.body, images: '[...]' });

        // Validate required fields
        if (!req.body.name) {
            throw new AppError('Product name is required', 400, 'ValidationError');
        }

        if (!req.body.price) {
            throw new AppError('Product price is required', 400, 'ValidationError');
        }

        if (!req.body.quantity && !req.body.stock) {
            throw new AppError('Product quantity/stock is required', 400, 'ValidationError');
        }

        const result = adminProductService.createProduct(req.body);
        eventBus.emit('dataChanged', { type: 'product', action: 'create', data: result.data });
        console.log(`[RESPONSE] Product created: ${result.data.productId}`);
        res.status(201).json(result);
    } catch (error) {
        console.error(`[ERROR] createProduct: ${error.message}`);
        next(error);
    }
};

/**
 * Update product
 * @route PUT /api/admin/products/:id
 */
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] PUT /api/admin/products/${id} - Body:`, { ...req.body, images: '[...]' });

        const result = adminProductService.updateProduct(id, req.body);
        eventBus.emit('dataChanged', { type: 'product', action: 'update', data: result.data });
        console.log(`[RESPONSE] Product updated: ${id}`);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] updateProduct: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Delete product (soft delete)
 * @route DELETE /api/admin/products/:id
 */
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] DELETE /api/admin/products/${id}`);

        const result = adminProductService.deleteProduct(id);
        eventBus.emit('dataChanged', { type: 'product', action: 'delete', id });
        console.log(`[RESPONSE] Product deleted: ${id}`);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] deleteProduct: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Restore deleted product
 * @route PUT /api/admin/products/:id/restore
 */
const restoreProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        console.log(`[REQUEST] PUT /api/admin/products/${id}/restore`);

        const result = adminProductService.restoreProduct(id);

        console.log(`[RESPONSE] Product restored: ${id}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] restoreProduct: ${error.message}`);
        if (error.message.includes('not found')) {
            next(new AppError(error.message, 404, 'NotFoundError'));
        } else {
            next(error);
        }
    }
};

/**
 * Bulk delete products
 * @route POST /api/admin/products/bulk/delete
 */
const bulkDeleteProducts = async (req, res, next) => {
    try {
        const { productIds } = req.body;

        console.log(`[REQUEST] POST /api/admin/products/bulk/delete - IDs:`, productIds);

        if (!Array.isArray(productIds) || productIds.length === 0) {
            throw new AppError('Product IDs array is required and must not be empty', 400, 'ValidationError');
        }

        const result = adminProductService.bulkDeleteProducts(productIds);

        console.log(`[RESPONSE] Bulk delete completed - Deleted: ${result.deletedCount}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] bulkDeleteProducts: ${error.message}`);
        next(error);
    }
};

/**
 * Bulk update product status
 * @route PUT /api/admin/products/bulk/status
 */
const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { productIds, status } = req.body;

        console.log(`[REQUEST] PUT /api/admin/products/bulk/status - Status: ${status}`);

        if (!Array.isArray(productIds) || productIds.length === 0) {
            throw new AppError('Product IDs array is required and must not be empty', 400, 'ValidationError');
        }

        if (!status) {
            throw new AppError('Status is required', 400, 'ValidationError');
        }

        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400, 'ValidationError');
        }

        const result = adminProductService.bulkUpdateStatus(productIds, status);

        console.log(`[RESPONSE] Bulk status update completed - Updated: ${result.updatedCount}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] bulkUpdateStatus: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    bulkDeleteProducts,
    bulkUpdateStatus
};
