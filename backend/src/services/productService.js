/**
 * Product Data Service
 * Handles all product-related data operations
 * 
 * @module services/productService
 */

const fs = require('fs').promises;
const path = require('path');
const { config } = require('../config');
const { AppError } = require('../utils/AppError');

/**
 * Gets the full path to the products file
 * @returns {string} Full path to products.json
 */
const getProductsFilePath = () => {
    return path.join(config.paths.dataDir, config.paths.productsFile);
};

/**
 * Loads products from the JSON file asynchronously
 * @returns {Promise<Array>} Array of products
 * @throws {AppError} If file cannot be read or parsed
 */
const loadProducts = async () => {
    const filePath = getProductsFilePath();

    try {
        // Check if file exists without throwing
        const stats = await fs.stat(filePath).catch(() => false);
        if (!stats) {
            console.warn(`[WARNING] Products file not found at: ${filePath}`);
            return [];
        }

        const data = await fs.readFile(filePath, 'utf8');
        const products = JSON.parse(data);

        console.log(`[INFO] Loaded ${products.length} products from file`);
        return products;
    } catch (error) {
        console.error(`[ERROR] Failed to load products: ${error.message}`);
        throw new AppError('Failed to load products', 500, 'DataError');
    }
};

/**
 * Saves products to the JSON file asynchronously
 * @param {Array} products - Array of products to save
 * @throws {AppError} If file cannot be written
 */
const saveProducts = async (products) => {
    const filePath = getProductsFilePath();

    try {
        await fs.writeFile(filePath, JSON.stringify(products, null, 2), 'utf8');
        console.log(`[INFO] Saved ${products.length} products to file`);
    } catch (error) {
        console.error(`[ERROR] Failed to save products: ${error.message}`);
        throw new AppError('Failed to save products', 500, 'DataError');
    }
};

/**
 * Finds a product by various ID formats
 * Supports: numeric id, string productId, exact match, and partial match
 * @param {Array} products - Array of products to search
 * @param {string|number} id - Product ID to find
 * @returns {Object|null} Product object or null if not found
 */
const findProductById = (products, id) => {
    if (id === undefined || id === null || id === '') {
        return null;
    }

    const idStr = String(id).trim();
    
    // 1. Try to find by numeric id (if id is numeric string or number)
    if (!isNaN(parseInt(idStr))) {
        const numericId = parseInt(idStr);
        let product = products.find(p => p.id === numericId);
        if (product) return product;
    }
    
    // 2. Try by productId string (exact match)
    let product = products.find(p => p.productId === idStr);
    if (product) return product;
    
    // 3. Try by id as string (exact match)
    product = products.find(p => String(p.id) === idStr);
    if (product) return product;
    
    // 4. Try partial match for productId (backwards compatibility)
    product = products.find(p => p.productId && p.productId.includes(idStr));
    if (product) return product;
    
    return null;
};

/**
 * Filters products by category
 * @param {Array} products - Array of products
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered products
 */
const filterByCategory = (products, category) => {
    if (!category || category.toLowerCase() === 'all') {
        return products;
    }
    const cat = category.toLowerCase();
    return products.filter(p => p.category && p.category.toLowerCase() === cat);
};

/**
 * Searches products by name or description
 * @param {Array} products - Array of products
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered products
 */
const searchProducts = (products, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return products;
    }
    
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
};

/**
 * Gets all unique categories from products
 * @param {Array} products - Array of products
 * @returns {Array} Array of unique categories
 */
const getCategories = (products) => {
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories).sort();
};

/**
 * Gets product statistics
 * @param {Array} products - Array of products
 * @returns {Object} Statistics object
 */
const getProductStats = (products) => {
    const categories = getCategories(products);
    const inStock = products.filter(p => p.stock === 'In Stock').length;
    const lowStock = products.filter(p => p.stock === 'Low Stock').length;
    const outOfStock = products.filter(p => p.stock === 'Out of Stock').length;
    
    return {
        totalProducts: products.length,
        categories: categories.length,
        categoryList: categories,
        inStock,
        lowStock,
        outOfStock
    };
};

module.exports = {
    loadProducts,
    saveProducts,
    findProductById,
    filterByCategory,
    searchProducts,
    getCategories,
    getProductStats,
    getProductsFilePath
};
