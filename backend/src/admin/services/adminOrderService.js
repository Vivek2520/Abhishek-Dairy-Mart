/**
 * Admin Order Service
 * Handles order management operations
 * 
 * @module admin/services/adminOrderService
 */

const fs = require('fs');
const path = require('path');

/**
 * Get all orders with filters and pagination
 * @param {Object} options - Filter and pagination options
 * @returns {Object} Orders with pagination
 */
function getAllOrders(options = {}) {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        let orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        // Filter by status
        if (options.status) {
            orders = orders.filter(o => o.status === options.status);
        }

        // Filter by payment status
        if (options.paymentStatus) {
            orders = orders.filter(o => o.paymentStatus === options.paymentStatus);
        }

        // Filter by date range
        if (options.startDate || options.endDate) {
            const start = options.startDate ? new Date(options.startDate) : null;
            const end = options.endDate ? new Date(options.endDate) : null;

            orders = orders.filter(o => {
                const orderDate = new Date(o.createdAt || o.orderDate);
                if (start && orderDate < start) return false;
                if (end && orderDate > end) return false;
                return true;
            });
        }

        // Search by customer name or order ID
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            orders = orders.filter(o =>
                (o.customerName || '').toLowerCase().includes(searchLower) ||
                (o.id || o.orderId || '').toString().includes(searchLower)
            );
        }

        // Sort
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

        orders.sort((a, b) => {
            if (sortBy === 'amount') {
                return (a.totalAmount - b.totalAmount) * sortOrder;
            } else if (sortBy === 'date' || sortBy === 'createdAt') {
                return (new Date(a.createdAt || a.orderDate) - new Date(b.createdAt || b.orderDate)) * sortOrder;
            }
            return 0;
        });

        // Pagination
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;
        const total = orders.length;

        const paginatedOrders = orders.slice(skip, skip + limit);

        return {
            success: true,
            data: paginatedOrders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getAllOrders:', error.message);
        throw error;
    }
}

/**
 * Get order by ID
 * @param {string|number} orderId - Order ID
 * @returns {Object} Order data
 */
function getOrderById(orderId) {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        const order = orders.find(o =>
            o.id === orderId || o.orderId === orderId ||
            o.id == orderId || o.orderId == orderId
        );

        if (!order) {
            throw new Error('Order not found');
        }

        return {
            success: true,
            data: order
        };
    } catch (error) {
        console.error('[ERROR] getOrderById:', error.message);
        throw error;
    }
}

/**
 * Update order status
 * @param {string|number} orderId - Order ID
 * @param {string} status - New status
 * @returns {Object} Updated order
 */
function updateOrderStatus(orderId, status) {
    try {
        const validStatuses = ['pending', 'confirmed', 'processing', 'out-for-delivery', 'delivered', 'cancelled', 'returned'];

        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const ordersPath = path.join(__dirname, '../../../orders.json');
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        const order = orders.find(o =>
            o.id === orderId || o.orderId === orderId ||
            o.id == orderId || o.orderId == orderId
        );

        if (!order) {
            throw new Error('Order not found');
        }

        const oldStatus = order.status;
        order.status = status;
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
            status: status,
            timestamp: new Date().toISOString(),
            changedBy: 'admin'
        });
        order.updatedAt = new Date().toISOString();

        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));

        // Log activity
        logActivity('order_status_updated', 'order', order.id || order.orderId, order.id || order.orderId, {
            oldStatus,
            newStatus: status
        });

        return {
            success: true,
            message: 'Order status updated successfully',
            data: order
        };
    } catch (error) {
        console.error('[ERROR] updateOrderStatus:', error.message);
        throw error;
    }
}

/**
 * Add comment to order
 * @param {string|number} orderId - Order ID
 * @param {string} comment - Comment text
 * @returns {Object} Updated order
 */
function addComment(orderId, comment) {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        const order = orders.find(o =>
            o.id === orderId || o.orderId === orderId ||
            o.id == orderId || o.orderId == orderId
        );

        if (!order) {
            throw new Error('Order not found');
        }

        order.comments = order.comments || [];
        order.comments.push({
            id: Date.now().toString(),
            text: comment,
            timestamp: new Date().toISOString(),
            author: 'admin'
        });

        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));

        logActivity('order_comment_added', 'order', order.id || order.orderId, order.id || order.orderId, {
            comment
        });

        return {
            success: true,
            message: 'Comment added successfully',
            data: order
        };
    } catch (error) {
        console.error('[ERROR] addComment:', error.message);
        throw error;
    }
}

/**
 * Process refund for order
 * @param {string|number} orderId - Order ID
 * @param {number} amount - Refund amount
 * @param {string} reason - Refund reason
 * @returns {Object} Refund result
 */
function processRefund(orderId, amount, reason) {
    try {
        const ordersPath = path.join(__dirname, '../../../../database/seeds/orders.json');
        const transactionsPath = path.join(__dirname, '../../../../database/seeds/transactions.json');

        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];
        const transactions = JSON.parse(fs.readFileSync(transactionsPath, 'utf8')) || [];

        const order = orders.find(o =>
            o.id === orderId || o.orderId === orderId ||
            o.id == orderId || o.orderId == orderId
        );

        if (!order) {
            throw new Error('Order not found');
        }

        // Find transaction
        const transaction = transactions.find(t => t.orderId === (order.id || order.orderId));

        if (!transaction) {
            throw new Error('Transaction not found for this order');
        }

        if (transaction.status !== 'success') {
            throw new Error('Can only refund successful transactions');
        }

        const refundAmount = amount || transaction.amount;

        if (refundAmount > transaction.amount) {
            throw new Error('Refund amount cannot exceed transaction amount');
        }

        // Process refund
        transaction.refundId = `REF${Date.now()}`;
        transaction.refundAmount = refundAmount;
        transaction.refundStatus = 'initiated';
        transaction.refundReason = reason;
        transaction.refundInitiatedAt = new Date().toISOString();

        order.refundStatus = 'initiated';
        order.refundAmount = refundAmount;
        order.refundReason = reason;

        fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));
        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));

        logActivity('refund_initiated', 'order', order.id || order.orderId, order.id || order.orderId, {
            refundAmount,
            reason
        });

        return {
            success: true,
            message: 'Refund initiated successfully',
            data: {
                refundId: transaction.refundId,
                amount: refundAmount
            }
        };
    } catch (error) {
        console.error('[ERROR] processRefund:', error.message);
        throw error;
    }
}

/**
 * Generate invoice (PDF simulation - returns invoice data)
 * @param {string|number} orderId - Order ID
 * @returns {Object} Invoice data
 */
function generateInvoice(orderId) {
    try {
        const ordersPath = path.join(__dirname, '../../../../database/seeds/orders.json');
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');

        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        const order = orders.find(o =>
            o.id === orderId || o.orderId === orderId ||
            o.id == orderId || o.orderId == orderId
        );

        if (!order) {
            throw new Error('Order not found');
        }

        const invoiceData = {
            invoiceNumber: `INV-${order.id || order.orderId}`,
            invoiceDate: new Date().toISOString().split('T')[0],
            orderDate: (order.createdAt || order.orderDate || '').split('T')[0],
            store: {
                name: settings.storeName,
                email: settings.storeEmail,
                phone: settings.storePhone,
                address: settings.storeAddress
            },
            customer: {
                name: order.customerName,
                phone: order.customerPhone,
                address: order.deliveryAddress || ''
            },
            items: order.items || [],
            subtotal: order.subtotal || (order.totalAmount - (order.deliveryCharge || 0)),
            deliveryCharge: order.deliveryCharge || 0,
            tax: (order.totalAmount * (settings.taxRate || 18)) / 100,
            total: order.totalAmount,
            paymentMethod: order.paymentMethod || 'COD',
            status: order.status
        };

        return {
            success: true,
            message: 'Invoice generated successfully',
            data: invoiceData
        };
    } catch (error) {
        console.error('[ERROR] generateInvoice:', error.message);
        throw error;
    }
}

/**
 * Log activity for audit trail
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

        if (logs.length > 10000) {
            logs.splice(0, logs.length - 10000);
        }

        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('[ERROR] logActivity:', error.message);
    }
}

module.exports = {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    addComment,
    processRefund,
    generateInvoice
};
