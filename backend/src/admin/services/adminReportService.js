/**
 * Admin Reports Service
 * Generates various reports and analytics
 */

const fs = require('fs');
const path = require('path');

function getSalesReport(options = {}) {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const ordersData = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        let orders = ordersData;

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

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        const ordersByStatus = {};
        orders.forEach(o => {
            const status = o.status || 'unknown';
            ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
        });

        const revenueByStatus = {};
        orders.forEach(o => {
            const status = o.status || 'unknown';
            revenueByStatus[status] = (revenueByStatus[status] || 0) + (o.totalAmount || 0);
        });

        return {
            success: true,
            data: {
                period: {
                    startDate: options.startDate,
                    endDate: options.endDate
                },
                summary: {
                    totalOrders,
                    totalRevenue,
                    avgOrderValue
                },
                byStatus: {
                    orders: ordersByStatus,
                    revenue: revenueByStatus
                }
            }
        };
    } catch (error) {
        console.error('[ERROR] getSalesReport:', error.message);
        throw error;
    }
}

function getProductReport(options = {}) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const ordersPath = path.join(__dirname, '../../../orders.json');

        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        const productSales = {};
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productId = item.productId || item.id;
                    if (!productSales[productId]) {
                        productSales[productId] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[productId].quantity += item.quantity || 1;
                    productSales[productId].revenue += item.price ? (item.price * (item.quantity || 1)) : 0;
                });
            }
        });

        const topProducts = products
            .map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                sales: productSales[p.id] || { quantity: 0, revenue: 0 }
            }))
            .sort((a, b) => b.sales.quantity - a.sales.quantity)
            .slice(0, 20);

        const totalProductsRevenueMap = {};
        Object.entries(productSales).forEach(([key, value]) => {
            totalProductsRevenueMap[key] = value;
        });

        return {
            success: true,
            data: {
                topSelling: topProducts,
                totalProductsSold: Object.values(productSales).reduce((sum, p) => sum + p.quantity, 0),
                totalProductRevenue: Object.values(productSales).reduce((sum, p) => sum + p.revenue, 0)
            }
        };
    } catch (error) {
        console.error('[ERROR] getProductReport:', error.message);
        throw error;
    }
}

function getUserReport(options = {}) {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        const now = new Date();
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

        const newUsers = users.filter(u => new Date(u.registrationDate) >= monthAgo).length;
        const repeatCustomers = users.filter(u => (u.totalOrders || 0) > 1).length;
        const avgOrderValue = users.length > 0
            ? Math.round(users.reduce((sum, u) => sum + (u.totalSpent || 0), 0) / users.filter(u => u.totalOrders > 0).length)
            : 0;

        return {
            success: true,
            data: {
                totalCustomers: users.length,
                activeCustomers: users.filter(u => u.status === 'active').length,
                newUsersLastMonth: newUsers,
                repeatCustomers,
                avgOrderValue,
                avgOrdersPerCustomer: users.length > 0
                    ? (users.reduce((sum, u) => sum + (u.totalOrders || 0), 0) / users.length).toFixed(2)
                    : 0
            }
        };
    } catch (error) {
        console.error('[ERROR] getUserReport:', error.message);
        throw error;
    }
}

function getInventoryReport(options = {}) {
    try {
        const productsPath = path.join(__dirname, '../../../../database/seeds/products.json');
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');

        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const threshold = settings.notifications?.stockAlertThreshold || 10;

        const lowStockCount = products.filter(p => (p.quantity || 0) <= threshold).length;
        const outOfStockCount = products.filter(p => (p.quantity || 0) <= 0).length;
        const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);

        return {
            success: true,
            data: {
                totalProducts: products.length,
                totalQuantity: products.reduce((sum, p) => sum + (p.quantity || 0), 0),
                totalInventoryValue,
                lowStockProducts: lowStockCount,
                outOfStockProducts: outOfStockCount,
                avgStockValue: products.length > 0 ? Math.round(totalInventoryValue / products.length) : 0
            }
        };
    } catch (error) {
        console.error('[ERROR] getInventoryReport:', error.message);
        throw error;
    }
}

module.exports = {
    getSalesReport,
    getProductReport,
    getUserReport,
    getInventoryReport
};
