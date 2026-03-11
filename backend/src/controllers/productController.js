/**
 * Product Controller
 * Handles all product-related HTTP requests
 * 
 * @module controllers/productController
 */

const productService = require('../services/productService');
const { AppError } = require('../utils/AppError');

/**
 * Gets all products with optional filtering
 * @route GET /api/products
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllProducts = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/products - Query:`, req.query);

        // Load products
        let products = await productService.loadProducts();

        // Filter by category
        const { category, search } = req.query;
        
        if (category && category !== 'all') {
            products = productService.filterByCategory(products, category);
        }

        // Filter by search term
        if (search) {
            products = productService.searchProducts(products, search);
        }

        console.log(`[RESPONSE] Returning ${products.length} products`);

        // Return success response
        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error(`[ERROR] getAllProducts: ${error.message}`);
        next(error);
    }
};

/**
 * Gets a single product by ID
 * @route GET /api/products/:id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`[REQUEST] GET /api/products/${id}`);

        // Load products
        const products = await productService.loadProducts();

        // Find product
        const product = productService.findProductById(products, id);

        if (!product) {
            console.log(`[WARNING] Product not found: ${id}`);
            throw new AppError('Product not found', 404, 'NotFoundError');
        }

        console.log(`[RESPONSE] Product found: ${product.name}`);

        // Return success response
        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error(`[ERROR] getProductById: ${error.message}`);
        next(error);
    }
};

/**
 * Gets products by category
 * @route GET /api/categories/:category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getProductsByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
        console.log(`[REQUEST] GET /api/categories/${category}`);

        // Load products
        const products = await productService.loadProducts();

        // Filter by category
        const filtered = productService.filterByCategory(products, category);

        console.log(`[RESPONSE] Found ${filtered.length} products in category: ${category}`);

        // Return success response
        res.status(200).json({
            success: true,
            category: category,
            count: filtered.length,
            data: filtered
        });
    } catch (error) {
        console.error(`[ERROR] getProductsByCategory: ${error.message}`);
        next(error);
    }
};

/**
 * Gets all unique categories
 * @route GET /api/categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllCategories = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/categories`);

        // Load products
        const products = await productService.loadProducts();

        // Get unique categories
        const categories = productService.getCategories(products);

        console.log(`[RESPONSE] Found ${categories.length} categories`);

        // Return success response
        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error(`[ERROR] getAllCategories: ${error.message}`);
        next(error);
    }
};

/**
 * Gets product statistics
 * @route GET /api/products/stats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getProductStats = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/products/stats`);

        // Load products
        const products = await productService.loadProducts();

        // Get statistics
        const stats = productService.getProductStats(products);

        console.log(`[RESPONSE] Product stats:`, stats);

        // Return success response
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error(`[ERROR] getProductStats: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    getProductsByCategory,
    getAllCategories,
    getProductStats
};
