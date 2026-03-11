/**
 * Cart Service
 * Handles all cart-related data operations
 * 
 * @module services/cartService
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');
const { AppError } = require('../utils/AppError');

/**
 * Gets the full path to the carts file
 * @returns {string} Full path to carts.json
 */
const getCartsFilePath = () => {
    return path.join(config.paths.dataDir, 'carts.json');
};

/**
 * Loads carts from the JSON file
 * @returns {Array} Array of carts
 */
const loadCarts = () => {
    const filePath = getCartsFilePath();
    
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
            return [];
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[ERROR] Failed to load carts: ${error.message}`);
        return [];
    }
};

/**
 * Saves carts to the JSON file
 * @param {Array} carts - Array of carts to save
 */
const saveCarts = (carts) => {
    const filePath = getCartsFilePath();
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(carts, null, 2), 'utf8');
    } catch (error) {
        console.error(`[ERROR] Failed to save carts: ${error.message}`);
        throw new AppError('Failed to save cart', 500, 'DataError');
    }
};

/**
 * Gets a user's cart
 * @param {string} userId - User ID
 * @returns {Object} User's cart
 */
// helper used repeatedly to recalc totals and timestamps on a cart object
const recalcCart = (cart) => {
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.total = cart.subtotal + cart.deliveryCharge - (cart.discount || 0);
    cart.updatedAt = new Date().toISOString();
};

const getCart = (userId) => {
    const carts = loadCarts();
    let cart = carts.find(c => c.userId === userId);
    
    if (!cart) {
        // Create empty cart for user
        cart = {
            userId,
            items: [],
            subtotal: 0,
            deliveryCharge: config.order.deliveryCharge || 50,
            total: 0,
            couponCode: null,
            discount: 0,
            updatedAt: new Date().toISOString()
        };
        carts.push(cart);
        saveCarts(carts);
    }
    
    // Recalc to ensure totals are fresh
    recalcCart(cart);
    
    return cart;
};

/**
 * Adds an item to the cart
 * @param {string} userId - User ID
 * @param {Object} product - Product object
 * @param {number} quantity - Quantity to add
 * @returns {Object} Updated cart
 */
const addItem = (userId, product, quantity = 1) => {
    const carts = loadCarts();
    let cart = carts.find(c => c.userId === userId);
    
    if (!cart) {
        cart = {
            userId,
            items: [],
            subtotal: 0,
            deliveryCharge: config.order.deliveryCharge || 50,
            total: 0,
            createdAt: new Date().toISOString()
        };
        carts.push(cart);
    }
    
    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex > -1) {
        // Update quantity
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        // Add new item
        cart.items.push({
            id: uuidv4(),
            productId: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: product.image || '',
            quantity: quantity
        });
    }
    
    // Recalculate totals and respect any active coupon/discount
    recalcCart(cart);
    
    saveCarts(carts);
    
    return cart;
};

/**
 * Updates item quantity in cart
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {number} quantity - New quantity
 * @returns {Object} Updated cart
 */
const updateItemQuantity = (userId, productId, quantity) => {
    const carts = loadCarts();
    const cartIndex = carts.findIndex(c => c.userId === userId);
    
    if (cartIndex === -1) {
        throw new AppError('Cart not found', 404, 'NotFoundError');
    }
    
    const cart = carts[cartIndex];
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
        throw new AppError('Item not found in cart', 404, 'NotFoundError');
    }
    
    if (quantity <= 0) {
        // Remove item
        cart.items.splice(itemIndex, 1);
    } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
    }
    
    // Recalculate totals (refund coupon/discount if necessary)
    recalcCart(cart);
    
    saveCarts(carts);
    
    return cart;
};

/**
 * Removes an item from cart
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Object} Updated cart
 */
const removeItem = (userId, productId) => {
    const carts = loadCarts();
    const cartIndex = carts.findIndex(c => c.userId === userId);
    
    if (cartIndex === -1) {
        throw new AppError('Cart not found', 404, 'NotFoundError');
    }
    
    const cart = carts[cartIndex];
    cart.items = cart.items.filter(item => item.productId !== productId);
    
    // Recalculate totals after removal
    recalcCart(cart);
    
    saveCarts(carts);
    
    return cart;
};

/**
 * Clears the cart
 * @param {string} userId - User ID
 * @returns {Object} Empty cart
 */
const clearCart = (userId) => {
    const carts = loadCarts();
    const cartIndex = carts.findIndex(c => c.userId === userId);
    
    if (cartIndex > -1) {
        carts[cartIndex].items = [];
        carts[cartIndex].couponCode = null;
        carts[cartIndex].discount = 0;
        recalcCart(carts[cartIndex]);
        saveCarts(carts);
        
        return carts[cartIndex];
    }
    
    // Create empty cart
    const cart = {
        userId,
        items: [],
        subtotal: 0,
        deliveryCharge: config.order.deliveryCharge || 50,
        total: config.order.deliveryCharge || 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    carts.push(cart);
    saveCarts(carts);
    
    return cart;
};

/**
 * Merges local cart with server cart
 * @param {string} userId - User ID
 * @param {Array} localItems - Items from localStorage cart
 * @returns {Object} Merged cart
 */
const mergeCart = (userId, localItems) => {
    const serverCart = getCart(userId);
    
    if (!localItems || localItems.length === 0) {
        return serverCart;
    }
    
    const carts = loadCarts();
    const cartIndex = carts.findIndex(c => c.userId === userId);
    
    if (cartIndex === -1) {
        return serverCart;
    }
    
    const cart = carts[cartIndex];
    
    // Merge items
    localItems.forEach(localItem => {
        const existingIndex = cart.items.findIndex(item => item.productId === localItem.id);
        
        if (existingIndex > -1) {
            // Update quantity (use higher of the two)
            cart.items[existingIndex].quantity = Math.max(
                cart.items[existingIndex].quantity,
                localItem.quantity || 1
            );
        } else {
            // Add new item
            cart.items.push({
                id: uuidv4(),
                productId: localItem.id,
                name: localItem.name || 'Unknown Product',
                price: parseFloat(localItem.price) || 0,
                image: localItem.image || '',
                quantity: localItem.quantity || 1
            });
        }
    });
    
    // Recalculate totals after merge
    recalcCart(cart);
    
    saveCarts(carts);
    
    return cart;
};

/**
 * Apply coupon to cart
 * @param {string} userId - User ID
 * @param {string} code - Coupon code
 * @param {number} discount - Discount amount
 * @returns {Object} Updated cart
 */
const applyCoupon = (userId, code, discount) => {
    const carts = loadCarts();
    const cartIndex = carts.findIndex(c => c.userId === userId);
    
    if (cartIndex === -1) {
        throw new AppError('Cart not found', 404, 'NotFoundError');
    }
    
    const cart = carts[cartIndex];
    cart.couponCode = code;
    cart.discount = discount || 0;
    
    recalcCart(cart);
    saveCarts(carts);
    
    return cart;
};

module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    mergeCart,
    applyCoupon,
    loadCarts,
    saveCarts
};
