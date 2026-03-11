/**
 * Product Routes
 * Public and admin product management
 * 
 * @module routes/productRoutes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');

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
 * GET /api/products
 * Get all products with filters
 */
router.get('/', async (req, res) => {
    try {
        const { category, search, status = 'active', page = 1, limit = 50 } = req.query;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.status = ?
        `;
        const params = [status];
        
        if (category && category !== 'all') {
            query += ' AND c.name = ?';
            params.push(category);
        }
        
        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        // Get total count
        const countQuery = query.replace(/SELECT p\.\*, c\.name as category_name.*FROM products p/, 'SELECT COUNT(*) as total FROM products p');
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;
        
        // Add pagination
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [products] = await db.execute(query, params);
        
        res.json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: products
        });
        
    } catch (error) {
        console.error('[Products] Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products'
        });
    }
});

/**
 * GET /api/products/stats
 * Get product statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_products,
                SUM(CASE WHEN stock < 10 AND stock > 0 THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(stock) as total_stock
            FROM products WHERE status = 'active'
        `);
        
        res.json({
            success: true,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('[Products] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get stats'
        });
    }
});

/**
 * GET /api/products/:id
 * Get single product
 */
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        const [products] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = ? OR p.product_id = ?
        `, [productId, productId]);
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            data: products[0]
        });
        
    } catch (error) {
        console.error('[Products] Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product'
        });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /api/products/admin/all
 * Get all products for admin (including inactive)
 */
router.get('/admin/all', authenticateAdmin, async (req, res) => {
    try {
        const { search, category, status, page = 1, limit = 50 } = req.query;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        const params = [];
        
        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        if (category) {
            query += ' AND c.name = ?';
            params.push(category);
        }
        
        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        // Get total count
        const countResult = await db.execute(query.replace(/SELECT p\.\*, c\.name.*FROM products p/, 'SELECT COUNT(*) as total FROM products p'), params);
        const total = countResult[0][0].total;
        
        // Add pagination
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [products] = await db.execute(query, params);
        
        res.json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: products
        });
        
    } catch (error) {
        console.error('[Products] Admin get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products'
        });
    }
});

/**
 * POST /api/products
 * Create new product
 */
router.post('/', authenticateAdmin, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category_id').optional().isInt().withMessage('Invalid category')
], validateRequest, async (req, res) => {
    try {
        const { name, description, category_id, price, discount = 0, stock = 0, unit = 'piece', image, status = 'active' } = req.body;
        
        const productId = 'PRD' + Date.now();
        
        const [result] = await db.execute(
            `INSERT INTO products (product_id, name, description, category_id, price, discount, stock, unit, image, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [productId, name, description || '', category_id || null, price, discount, stock, unit, image || '', status]
        );
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { id: result.insertId, product_id: productId }
        });
        
    } catch (error) {
        console.error('[Products] Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
});

/**
 * PUT /api/products/:id
 * Update product
 */
router.put('/:id', authenticateAdmin, [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
], validateRequest, async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, category_id, price, discount, stock, unit, image, status } = req.body;
        
        // Check if product exists
        const [existing] = await db.execute('SELECT id FROM products WHERE id = ? OR product_id = ?', [productId, productId]);
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        await db.execute(
            `UPDATE products SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category_id = COALESCE(?, category_id),
                price = COALESCE(?, price),
                discount = COALESCE(?, discount),
                stock = COALESCE(?, stock),
                unit = COALESCE(?, unit),
                image = COALESCE(?, image),
                status = COALESCE(?, status)
            WHERE id = ? OR product_id = ?`,
            [name || null, description || null, category_id || null, price || null, discount || null, stock || null, unit || null, image || null, status || null, productId, productId]
        );
        
        res.json({
            success: true,
            message: 'Product updated successfully'
        });
        
    } catch (error) {
        console.error('[Products] Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
});

/**
 * DELETE /api/products/:id
 * Delete product
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        
        const [existing] = await db.execute('SELECT id FROM products WHERE id = ? OR product_id = ?', [productId, productId]);
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        await db.execute('DELETE FROM products WHERE id = ? OR product_id = ?', [productId, productId]);
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
        
    } catch (error) {
        console.error('[Products] Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
});

/**
 * PUT /api/products/:id/stock
 * Update product stock
 */
router.put('/:id/stock', authenticateAdmin, [
    body('adjustment').isInt().withMessage('Adjustment must be an integer'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
], validateRequest, async (req, res) => {
    try {
        const productId = req.params.id;
        const { adjustment, reason } = req.body;
        
        // Get current stock
        const [products] = await db.execute('SELECT id, stock FROM products WHERE id = ? OR product_id = ?', [productId, productId]);
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const previousStock = products[0].stock;
        const newStock = Math.max(0, previousStock + adjustment);
        
        // Update stock
        await db.execute('UPDATE products SET stock = ? WHERE id = ? OR product_id = ?', [newStock, productId, productId]);
        
        // Log inventory change
        await db.execute(
            `INSERT INTO inventory_logs (product_id, adjustment, previous_stock, new_stock, reason, admin_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [products[0].id, adjustment, previousStock, newStock, reason, req.admin.id]
        );
        
        res.json({
            success: true,
            message: 'Stock updated successfully',
            data: { previous_stock: previousStock, new_stock: newStock, adjustment }
        });
        
    } catch (error) {
        console.error('[Products] Update stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock'
        });
    }
});

module.exports = router;

