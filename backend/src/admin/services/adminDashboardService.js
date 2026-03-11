/**
 * Admin Dashboard Service
 * Calculates dashboard metrics and analytics
 * 
 * @module admin/services/adminDashboardService
 */

const fs = require('fs');
const path = require('path');

/**
 * Get dashboard metrics
 * @returns {Object} Dashboard metrics
 */
function getDashboardMetrics() {
    try {
        // Load all necessary data
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const productsPath = path.join(__dirname, '../../../products.json');
        const usersPath = path.join(__dirname, '../../../data/users.json');
        const settingsPath = path.join(__dirname, '../../../data/settings.json');

        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        // Calculate time-based metrics
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Today's metrics
        const todayOrders = orders.filter(o => new Date(o.createdAt || o.orderDate) >= todayStart);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Weekly metrics
        const weekOrders = orders.filter(o => new Date(o.createdAt || o.orderDate) >= weekStart);
        const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Monthly metrics
        const monthOrders = orders.filter(o => new Date(o.createdAt || o.orderDate) >= monthStart);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Total metrics
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Product metrics
        const activeProducts = products.filter(p => p.status !== 'inactive').length;
        const lowStockProducts = products.filter(p => {
            const qty = p.stock || p.quantity || 0;
            return qty <= (settings.notifications?.stockAlertThreshold || 10);
        });

        // Order status breakdown
        const orderStatuses = {
            pending: orders.filter(o => o.status === 'pending').length,
            confirmed: orders.filter(o => o.status === 'confirmed').length,
            processing: orders.filter(o => o.status === 'processing').length,
            outForDelivery: orders.filter(o => o.status === 'out-for-delivery').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            returned: orders.filter(o => o.status === 'returned').length
        };

        // Payment status breakdown
        const paymentStatuses = {
            paid: orders.filter(o => o.paymentStatus === 'paid').length,
            pending: orders.filter(o => o.paymentStatus === 'pending').length,
            failed: orders.filter(o => o.paymentStatus === 'failed').length
        };

        // Customer metrics
        const totalCustomers = users.length;
        const todayNewCustomers = users.filter(u => 
            new Date(u.registrationDate) >= todayStart
        ).length;
        const repeatCustomers = users.filter(u => (u.totalOrders || 0) > 1).length;

        return {
            success: true,
            data: {
                // Revenue metrics
                revenue: {
                    today: todayRevenue,
                    thisWeek: weekRevenue,
                    thisMonth: monthRevenue,
                    total: totalRevenue,
                    average: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0
                },

                // Order metrics
                orders: {
                    today: todayOrders.length,
                    thisWeek: weekOrders.length,
                    thisMonth: monthOrders.length,
                    total: orders.length,
                    statuses: orderStatuses,
                    paymentStatuses: paymentStatuses,
                    pending: orderStatuses.pending
                },

                // Product metrics
                products: {
                    total: products.length,
                    active: activeProducts,
                    inactive: products.filter(p => p.status === 'inactive').length,
                    lowStock: lowStockProducts.length,
                    outOfStock: products.filter(p => {
                        const qty = p.stock || p.quantity || 0;
                        return qty <= 0;
                    }).length
                },

                // Customer metrics
                customers: {
                    total: totalCustomers,
                    todayNew: todayNewCustomers,
                    repeat: repeatCustomers,
                    active: users.filter(u => u.status === 'active').length,
                    blocked: users.filter(u => u.status === 'blocked').length
                },

                // Alerts
                alerts: {
                    lowStockProducts: lowStockProducts.map(p => ({
                        id: p.id || p.productId,
                        name: p.name,
                        currentStock: p.stock || p.quantity || 0,
                        threshold: settings.notifications?.stockAlertThreshold || 10
                    })),
                    pendingOrders: orderStatuses.pending,
                    failedPayments: paymentStatuses.failed
                }
            }
        };
    } catch (error) {
        console.error('[ERROR] getDashboardMetrics:', error.message);
        throw error;
    }
}

/**
 * Get sales chart data
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {Object} Chart data
 */
function getSalesChartData(period = 'daily') {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        let labels = [];
        let datasets = [];
        const now = new Date();

        if (period === 'daily') {
            // Last 30 days
            const dayData = {};
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                dayData[dateStr] = 0;
            }

            orders.forEach(o => {
                const orderDate = (o.createdAt || o.orderDate || '').split('T')[0];
                if (dayData.hasOwnProperty(orderDate)) {
                    dayData[orderDate] += o.totalAmount || 0;
                }
            });

            labels = Object.keys(dayData);
            datasets = [{
                label: 'Daily Revenue',
                data: Object.values(dayData),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)'
            }];
        } else if (period === 'weekly') {
            // Last 12 weeks
            const weekData = {};
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - (date.getDay() + 7 * i));
                const weekStr = `Week ${Math.ceil((date.getMonth() * 4 + (date.getDate() / 7)) / 1)}`;
                weekData[weekStr] = 0;
            }

            orders.forEach(o => {
                const orderDate = new Date(o.createdAt || o.orderDate);
                const weekNum = Math.ceil((orderDate.getMonth() * 4 + (orderDate.getDate() / 7)) / 1);
                const weekStr = `Week ${weekNum}`;
                if (weekData.hasOwnProperty(weekStr)) {
                    weekData[weekStr] += o.totalAmount || 0;
                }
            });

            labels = Object.keys(weekData);
            datasets = [{
                label: 'Weekly Revenue',
                data: Object.values(weekData),
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.1)'
            }];
        } else if (period === 'monthly') {
            // Last 12 months
            const monthData = {};
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                const monthStr = date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
                monthData[monthStr] = 0;
            }

            orders.forEach(o => {
                const orderDate = new Date(o.createdAt || o.orderDate);
                const monthStr = orderDate.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
                if (monthData.hasOwnProperty(monthStr)) {
                    monthData[monthStr] += o.totalAmount || 0;
                }
            });

            labels = Object.keys(monthData);
            datasets = [{
                label: 'Monthly Revenue',
                data: Object.values(monthData),
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.1)'
            }];
        }

        return {
            success: true,
            data: {
                labels,
                datasets
            }
        };
    } catch (error) {
        console.error('[ERROR] getSalesChartData:', error.message);
        throw error;
    }
}

/**
 * Get top-selling products
 * @param {number} limit - Number of products to return
 * @returns {Object} Top products data
 */
function getTopProducts(limit = 10) {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const productsPath = path.join(__dirname, '../../../products.json');

        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        // Count product sales
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

        // Combine with product data
        const topProducts = products
            .map(p => ({
                id: p.id || p.productId,
                name: p.name,
                sales: productSales[p.id || p.productId] || { quantity: 0, revenue: 0 }
            }))
            .sort((a, b) => b.sales.quantity - a.sales.quantity)
            .slice(0, limit);

        return {
            success: true,
            data: topProducts
        };
    } catch (error) {
        console.error('[ERROR] getTopProducts:', error.message);
        throw error;
    }
}

/**
 * Get recent orders
 * @param {number} limit - Number of orders to return
 * @returns {Object} Recent orders
 */
function getRecentOrders(limit = 10) {
    try {
        const ordersPath = path.join(__dirname, '../../../orders.json');
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate))
            .slice(0, limit)
            .map(o => ({
                id: o.id || o.orderId,
                customerName: o.customerName,
                amount: o.totalAmount,
                status: o.status,
                paymentStatus: o.paymentStatus,
                createdAt: o.createdAt || o.orderDate
            }));

        return {
            success: true,
            data: recentOrders
        };
    } catch (error) {
        console.error('[ERROR] getRecentOrders:', error.message);
        throw error;
    }
}

/**
 * Get recent user registrations
 * @param {number} limit - Number of users to return
 * @returns {Object} Recent users
 */
function getRecentUsers(limit = 10) {
    try {
        const usersPath = path.join(__dirname, '../../../data/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        const recentUsers = users
            .sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
            .slice(0, limit)
            .map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                registrationDate: u.registrationDate
            }));

        return {
            success: true,
            data: recentUsers
        };
    } catch (error) {
        console.error('[ERROR] getRecentUsers:', error.message);
        throw error;
    }
}

module.exports = {
    getDashboardMetrics,
    getSalesChartData,
    getTopProducts,
    getRecentOrders,
    getRecentUsers
};
