/**
 * Admin User Service
 * Handles user management operations
 * 
 * @module admin/services/adminUserService
 */

const fs = require('fs');
const path = require('path');

/**
 * Get all users with filters and pagination
 * @param {Object} options - Filter and pagination options
 * @returns {Object} Users with pagination
 */
function getAllUsers(options = {}) {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        let users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        // Filter by status
        if (options.status) {
            users = users.filter(u => u.status === options.status);
        }

        // Search
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            users = users.filter(u =>
                (u.name || '').toLowerCase().includes(searchLower) ||
                (u.email || '').toLowerCase().includes(searchLower) ||
                (u.phone || '').includes(searchLower)
            );
        }

        // Filter by date range
        if (options.startDate || options.endDate) {
            const start = options.startDate ? new Date(options.startDate) : null;
            const end = options.endDate ? new Date(options.endDate) : null;

            users = users.filter(u => {
                const regDate = new Date(u.registrationDate);
                if (start && regDate < start) return false;
                if (end && regDate > end) return false;
                return true;
            });
        }

        // Sort
        const sortBy = options.sortBy || 'registrationDate';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

        users.sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '') * sortOrder;
            } else if (sortBy === 'registrationDate') {
                return (new Date(a.registrationDate) - new Date(b.registrationDate)) * sortOrder;
            } else if (sortBy === 'totalOrders') {
                return ((a.totalOrders || 0) - (b.totalOrders || 0)) * sortOrder;
            }
            return 0;
        });

        // Pagination
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;
        const total = users.length;

        const paginatedUsers = users.slice(skip, skip + limit);

        return {
            success: true,
            data: paginatedUsers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getAllUsers:', error.message);
        throw error;
    }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object} User data
 */
function getUserById(userId) {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        const user = users.find(u => u.id === userId);

        if (!user) {
            throw new Error('User not found');
        }

        return {
            success: true,
            data: user
        };
    } catch (error) {
        console.error('[ERROR] getUserById:', error.message);
        throw error;
    }
}

/**
 * Block user
 * @param {string} userId - User ID
 * @param {string} reason - Block reason
 * @returns {Object} Updated user
 */
function blockUser(userId, reason = '') {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        const user = users.find(u => u.id === userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.status === 'blocked') {
            throw new Error('User is already blocked');
        }

        const oldStatus = user.status;
        user.status = 'blocked';
        user.blockReason = reason;
        user.blockedAt = new Date().toISOString();
        user.updatedAt = new Date().toISOString();

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

        logActivity('user_blocked', 'user', user.id, user.name, {
            reason,
            oldStatus
        });

        return {
            success: true,
            message: 'User blocked successfully',
            data: user
        };
    } catch (error) {
        console.error('[ERROR] blockUser:', error.message);
        throw error;
    }
}

/**
 * Unblock user
 * @param {string} userId - User ID
 * @returns {Object} Updated user
 */
function unblockUser(userId) {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        const user = users.find(u => u.id === userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.status !== 'blocked') {
            throw new Error('User is not blocked');
        }

        user.status = 'active';
        user.blockReason = null;
        user.blockedAt = null;
        user.updatedAt = new Date().toISOString();

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

        logActivity('user_unblocked', 'user', user.id, user.name, {});

        return {
            success: true,
            message: 'User unblocked successfully',
            data: user
        };
    } catch (error) {
        console.error('[ERROR] unblockUser:', error.message);
        throw error;
    }
}

/**
 * Get user order history
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Object} User orders
 */
function getUserOrders(userId, options = {}) {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        const ordersPath = path.join(__dirname, '../../../../database/seeds/orders.json');

        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8')) || [];

        const user = users.find(u => u.id === userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Get user's orders - prefer matching userId if present
        let userOrders = orders.filter(o => (o.userId && o.userId === userId) || o.customerName === user.name);

        // Filter by status if provided
        if (options.status) {
            userOrders = userOrders.filter(o => o.status === options.status);
        }

        // Sort by date
        userOrders.sort((a, b) =>
            new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate)
        );

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;

        const paginatedOrders = userOrders.slice(skip, skip + limit);

        return {
            success: true,
            data: paginatedOrders,
            pagination: {
                page,
                limit,
                total: userOrders.length,
                pages: Math.ceil(userOrders.length / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getUserOrders:', error.message);
        throw error;
    }
}

/**
 * Get user statistics
 * @returns {Object} User statistics
 */
function getUserStatistics() {
    try {
        const usersPath = path.join(__dirname, '../../../../database/seeds/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8')) || [];

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const blockedUsers = users.filter(u => u.status === 'blocked').length;

        const todayNew = users.filter(u => new Date(u.registrationDate) >= todayStart).length;
        const weekNew = users.filter(u => new Date(u.registrationDate) >= weekStart).length;
        const monthNew = users.filter(u => new Date(u.registrationDate) >= monthStart).length;

        const repeatCustomers = users.filter(u => (u.totalOrders || 0) > 1).length;

        const avgOrderValue = users.length > 0
            ? Math.round(users.reduce((sum, u) => sum + (u.totalSpent || 0), 0) / users.length)
            : 0;

        return {
            success: true,
            data: {
                total: totalUsers,
                active: activeUsers,
                blocked: blockedUsers,
                new: {
                    today: todayNew,
                    thisWeek: weekNew,
                    thisMonth: monthNew
                },
                repeat: repeatCustomers,
                avgOrderValue
            }
        };
    } catch (error) {
        console.error('[ERROR] getUserStatistics:', error.message);
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
    getAllUsers,
    getUserById,
    blockUser,
    unblockUser,
    getUserOrders,
    getUserStatistics
};
