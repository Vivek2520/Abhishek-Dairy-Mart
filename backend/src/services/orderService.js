/**
 * Order Data Service
 * Handles all order-related data operations
 * 
 * @module services/orderService
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');
const { AppError, badRequest } = require('../utils/AppError');

/**
 * Gets the full path to the orders file
 * @returns {string} Full path to orders.json
 */
const getOrdersFilePath = () => {
    return path.join(config.paths.dataDir, config.paths.ordersFile);
};

/**
 * Loads orders from the JSON file
 * @returns {Array} Array of orders
 * @throws {AppError} If file cannot be read or parsed
 */
const loadOrders = () => {
    const filePath = getOrdersFilePath();
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.warn(`[WARNING] Orders file not found at: ${filePath}`);
            return [];
        }

        const data = fs.readFileSync(filePath, 'utf8');
        const orders = JSON.parse(data);
        
        console.log(`[INFO] Loaded ${orders.length} orders from file`);
        return orders;
    } catch (error) {
        console.error(`[ERROR] Failed to load orders: ${error.message}`);
        throw new AppError('Failed to load orders', 500, 'DataError');
    }
};

/**
 * Saves orders to the JSON file
 * @param {Array} orders - Array of orders to save
 * @throws {AppError} If file cannot be written
 */
const saveOrders = (orders) => {
    const filePath = getOrdersFilePath();
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf8');
        console.log(`[INFO] Saved ${orders.length} orders to file`);
    } catch (error) {
        console.error(`[ERROR] Failed to save orders: ${error.message}`);
        throw new AppError('Failed to save orders', 500, 'DataError');
    }
};

/**
 * Generates a unique order ID
 * Format: ORD + timestamp + short uuid
 * @returns {string} Unique order ID
 */
const generateOrderId = () => {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0].toUpperCase();
    return `ORD${timestamp}${shortUuid}`;
};

/**
 * Creates a new order
 * @param {Object} orderData - Order data
 * @returns {Object} Created order
 * @throws {AppError} If validation fails
 */
const createOrder = (orderData) => {
    const {
        customerName,
        customerPhone,
        items,
        deliveryAddress,
        userId,
        couponCode,
        discountAmount
    } = orderData;

    // Validate items
    if (!items || items.length === 0) {
        throw badRequest('At least one item is required');
    }

    // compute subtotal from items to avoid tampering
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    let totalAmount = subtotal + config.order.deliveryCharge;
    if (discountAmount && discountAmount > 0) {
        totalAmount -= discountAmount;
    }

    // Validate minimum order amount on final total
    if (totalAmount < config.order.minOrderAmount) {
        throw badRequest(`Minimum order amount is ₹${config.order.minOrderAmount}`);
    }

    const orders = loadOrders();

    const newOrder = {
        orderId: generateOrderId(),
        customerName,
        customerPhone,
        userId: userId || null,
        items: items.map(item => ({
            id: item.id,
            productId: item.productId || null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
        })),
        couponCode: couponCode || null,
        discountAmount: discountAmount || 0,
        subtotal,
        deliveryCharge: config.order.deliveryCharge,
        totalAmount,
        deliveryAddress,
        status: 'pending',
        paymentMethod: 'whatsapp', // Default payment method
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    orders.push(newOrder);
    saveOrders(orders);
    
    console.log(`[INFO] New order created: ${newOrder.orderId}`);
    return newOrder;
};

/**
 * Finds an order by ID
 * @param {string} orderId - Order ID to find
 * @returns {Object|null} Order object or null if not found
 */
const findOrderById = (orderId) => {
    const orders = loadOrders();
    return orders.find(o => o.orderId === orderId || String(o.orderId) === orderId) || null;
};

/**
 * Get orders belonging to a specific user ID
 * @param {string} userId
 * @returns {Array} orders
 */
const getOrdersByUserId = (userId) => {
    if (!userId) return [];
    const orders = loadOrders();
    return orders.filter(o => o.userId === userId);
};

/**
 * Updates order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Object|null} Updated order or null if not found
 */
const updateOrderStatus = (orderId, status) => {
    const validStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        throw badRequest('Invalid status value');
    }
    
    const orders = loadOrders();
    const orderIndex = orders.findIndex(o => o.orderId === orderId);
    
    if (orderIndex === -1) {
        return null;
    }
    
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    
    saveOrders(orders);
    return orders[orderIndex];
};

/**
 * Gets order statistics
 * @returns {Object} Statistics object
 */
const getOrderStats = () => {
    const orders = loadOrders();
    
    const pending = orders.filter(o => o.status === 'pending').length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    
    const totalRevenue = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0);
    
    return {
        totalOrders: orders.length,
        pending,
        confirmed,
        delivered,
        cancelled,
        totalRevenue
    };
};

module.exports = {
    loadOrders,
    saveOrders,
    generateOrderId,
    createOrder,
    findOrderById,
    getOrdersByUserId,
    updateOrderStatus,
    getOrderStats,
    getOrdersFilePath
};
