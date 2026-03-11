/**
 * Admin Product Service
 * Handles CRUD operations for products
 * 
 * @module admin/services/adminProductService
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all products with filters and pagination
 * @param {Object} options - Filter, search, and pagination options
 * @returns {Object} Products with pagination info
 */
function getAllProducts(options = {}) {
    try {
        const productsPath = path.join(__dirname, '../../../../database/seeds/products.json');
        const categoriesPath = path.join(__dirname, '../../../../database/seeds/categories.json');

        let products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) || [];

        // Filter by status (exclude deleted by default)
        if (options.includeDeleted !== true) {
            products = products.filter(p => p.deletedAt === undefined);
        }

        // Filter by category
        if (options.category && options.category !== 'all') {
            products = products.filter(p => p.category === options.category || p.categoryId === options.category);
        }

        // Filter by status (active/inactive)
        if (options.status) {
            products = products.filter(p => (p.status || 'active') === options.status);
        }

        // Search by name or description
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            products = products.filter(p =>
                (p.name || '').toLowerCase().includes(searchLower) ||
                (p.description || '').toLowerCase().includes(searchLower)
            );
        }

        // Sort
        const sortBy = options.sortBy || 'name';
        const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
        products.sort((a, b) => {
            if (sortBy === 'price') {
                return (a.price - b.price) * sortOrder;
            } else if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '') * sortOrder;
            }
            return 0;
        });

        // Pagination
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;
        const total = products.length;

        const paginatedProducts = products.slice(skip, skip + limit);

        // Enrich with category data
        paginatedProducts.forEach(p => {
            const cat = categories.find(c => c.id === p.categoryId || c.name === p.category);
            if (cat) {
                p.categoryName = cat.name;
            }
        });

        return {
            success: true,
            data: paginatedProducts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getAllProducts:', error.message);
        throw error;
    }
}

/**
 * Get single product by ID
 * @param {string|number} productId - Product ID
 * @returns {Object} Product data
 */
function getProductById(productId) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        const product = products.find(p =>
            p.id === productId || p.productId === productId ||
            p.id == productId || p.productId == productId
        );

        if (!product) {
            throw new Error('Product not found');
        }

        return {
            success: true,
            data: product
        };
    } catch (error) {
        console.error('[ERROR] getProductById:', error.message);
        throw error;
    }
}

/**
 * Create new product
 * @param {Object} productData - Product details
 * @returns {Object} Created product
 */
function createProduct(productData) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        // Validate required fields
        if (!productData.name) {
            throw new Error('Product name is required');
        }

        if (!productData.price) {
            throw new Error('Product price is required');
        }

        // Generate ID if not provided
        const newProduct = {
            id: Math.max(...products.map(p => p.id || 0), 0) + 1,
            productId: productData.productId || `PRD${String(Math.max(...products.map(p => parseInt(p.productId?.substring(3)) || 0), 0) + 1).padStart(6, '0')}`,
            name: productData.name,
            description: productData.description || '',
            category: productData.category || productData.categoryId || 'general',
            categoryId: productData.categoryId,
            price: parseFloat(productData.price),
            mrp: parseFloat(productData.mrp || productData.price),
            discount: productData.discount || 0,
            discountType: productData.discountType || 'percentage',
            quantity: parseInt(productData.quantity || productData.stock || 0),
            stock: productData.stock || 'In Stock',
            unit: productData.unit || 'piece',
            image: productData.image || productData.images?.[0],
            images: productData.images || [],
            brand: productData.brand || '',
            weight: productData.weight || '',
            expiryDate: productData.expiryDate || null,
            additionalAttributes: productData.additionalAttributes || {},
            status: productData.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        products.push(newProduct);
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        // Log activity
        logActivity('product_created', 'product', newProduct.id, newProduct.name, {});

        return {
            success: true,
            message: 'Product created successfully',
            data: newProduct
        };
    } catch (error) {
        console.error('[ERROR] createProduct:', error.message);
        throw error;
    }
}

/**
 * Update product
 * @param {string|number} productId - Product ID
 * @param {Object} updates - Updated product data
 * @returns {Object} Updated product
 */
function updateProduct(productId, updates) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        const product = products.find(p =>
            p.id === productId || p.productId === productId ||
            p.id == productId || p.productId == productId
        );

        if (!product) {
            throw new Error('Product not found');
        }

        // Track changes for activity log
        const changes = {};

        // Update allowed fields
        const allowedFields = [
            'name', 'description', 'category', 'categoryId', 'price', 'mrp',
            'discount', 'discountType', 'quantity', 'stock', 'unit', 'image',
            'images', 'brand', 'weight', 'expiryDate', 'additionalAttributes', 'status'
        ];

        allowedFields.forEach(field => {
            if (field in updates && updates[field] !== undefined) {
                if (field === 'price' || field === 'mrp' || field === 'quantity' || field === 'discount') {
                    updates[field] = parseFloat(updates[field]);
                }

                if (product[field] !== updates[field]) {
                    changes[field] = {
                        oldValue: product[field],
                        newValue: updates[field]
                    };
                }

                product[field] = updates[field];
            }
        });

        product.updatedAt = new Date().toISOString();

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        // Log activity
        if (Object.keys(changes).length > 0) {
            logActivity('product_updated', 'product', product.id, product.name, changes);
        }

        return {
            success: true,
            message: 'Product updated successfully',
            data: product
        };
    } catch (error) {
        console.error('[ERROR] updateProduct:', error.message);
        throw error;
    }
}

/**
 * Soft delete product
 * @param {string|number} productId - Product ID
 * @returns {Object} Deletion result
 */
function deleteProduct(productId) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        const product = products.find(p =>
            p.id === productId || p.productId === productId ||
            p.id == productId || p.productId == productId
        );

        if (!product) {
            throw new Error('Product not found');
        }

        // Soft delete
        product.deletedAt = new Date().toISOString();
        product.status = 'deleted';

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        logActivity('product_deleted', 'product', product.id, product.name, {});

        return {
            success: true,
            message: 'Product deleted successfully'
        };
    } catch (error) {
        console.error('[ERROR] deleteProduct:', error.message);
        throw error;
    }
}

/**
 * Restore deleted product
 * @param {string|number} productId - Product ID
 * @returns {Object} Restoration result
 */
function restoreProduct(productId) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        const product = products.find(p =>
            (p.id === productId || p.productId === productId ||
            p.id == productId || p.productId == productId) &&
            p.deletedAt !== undefined
        );

        if (!product) {
            throw new Error('Product not found or not deleted');
        }

        product.deletedAt = undefined;
        product.status = 'active';

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        logActivity('product_restored', 'product', product.id, product.name, {});

        return {
            success: true,
            message: 'Product restored successfully',
            data: product
        };
    } catch (error) {
        console.error('[ERROR] restoreProduct:', error.message);
        throw error;
    }
}

/**
 * Bulk delete products
 * @param {array} productIds - Array of product IDs
 * @returns {Object} Bulk deletion result
 */
function bulkDeleteProducts(productIds) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        let deletedCount = 0;
        products.forEach(product => {
            if (productIds.includes(product.id) || productIds.includes(product.productId)) {
                if (product.deletedAt === undefined) {
                    product.deletedAt = new Date().toISOString();
                    product.status = 'deleted';
                    deletedCount++;
                }
            }
        });

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        logActivity('products_bulk_deleted', 'products', null, null, { count: deletedCount });

        return {
            success: true,
            message: `${deletedCount} product(s) deleted successfully`,
            deletedCount
        };
    } catch (error) {
        console.error('[ERROR] bulkDeleteProducts:', error.message);
        throw error;
    }
}

/**
 * Bulk update product status
 * @param {array} productIds - Array of product IDs
 * @param {string} status - New status
 * @returns {Object} Bulk update result
 */
function bulkUpdateStatus(productIds, status) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        let updatedCount = 0;
        products.forEach(product => {
            if (productIds.includes(product.id) || productIds.includes(product.productId)) {
                if (product.status !== status) {
                    product.status = status;
                    product.updatedAt = new Date().toISOString();
                    updatedCount++;
                }
            }
        });

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        logActivity('products_bulk_status_updated', 'products', null, null, { count: updatedCount, status });

        return {
            success: true,
            message: `${updatedCount} product(s) status updated to ${status}`,
            updatedCount
        };
    } catch (error) {
        console.error('[ERROR] bulkUpdateStatus:', error.message);
        throw error;
    }
}

/**
 * Log activity for audit trail
 * @param {string} action - Action type
 * @param {string} entityType - Entity type
 * @param {string|number} entityId - Entity ID
 * @param {string} entityName - Entity name
 * @param {Object} changes - Changes made
 */
function logActivity(action, entityType, entityId, entityName, changes) {
    try {
        const logsPath = path.join(__dirname, '../../../../database/seeds/activity_logs.json');
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8')) || [];

        logs.push({
            id: `ACT${String(logs.length + 1).padStart(6, '0')}`,
            action,
            entityType,
            entityId,
            entityName,
            changes,
            createdAt: new Date().toISOString()
        });

        // Keep only last 10000 logs
        if (logs.length > 10000) {
            logs.splice(0, logs.length - 10000);
        }

        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('[ERROR] logActivity:', error.message);
    }
}

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
