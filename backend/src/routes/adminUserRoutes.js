/**
 * Admin User Management Routes
 * CRUD operations for users (Admin only)
 * 
 * @module routes/adminUserRoutes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, param, query } = require('express-validator');
const db = require('../config/db');
const { authenticateAdmin, generateToken } = require('../middleware/auth');

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
// ADMIN AUTH ROUTES
// ============================================

/**
 * POST /api/admin/auth/login
 * Admin login - returns JWT token
 */
router.post('/auth/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], validateRequest, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find admin user
        const [users] = await db.execute(
            'SELECT id, name, email, password, role, is_active FROM users WHERE email = ? AND role = ?',
            [email.toLowerCase(), 'admin']
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
        
        const admin = users[0];
        
        // Check if admin is active
        if (!admin.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Admin account is blocked'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
        
        // Update last login
        await db.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [admin.id]
        );
        
        // Generate token
        const token = generateToken({ id: admin.id, email: admin.email, role: 'admin' });
        
        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                token,
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role
                }
            }
        });
        
    } catch (error) {
        console.error('[Admin Auth] Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

/**
 * POST /api/admin/auth/logout
 * Admin logout
 */
router.post('/auth/logout', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

/**
 * GET /api/admin/auth/verify
 * Verify admin token
 */
router.get('/auth/verify', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Admin token is valid',
        data: { admin: req.admin }
    });
});

// ============================================
// USER MANAGEMENT ROUTES (Admin only)
// ============================================

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { search, status, role, page = 1, limit = 20 } = req.query;
        
        let query = 'SELECT id, name, email, phone, role, is_active, is_email_verified, created_at, last_login FROM users WHERE 1=1';
        const params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (status === 'active') {
            query += ' AND is_active = TRUE';
        } else if (status === 'blocked') {
            query += ' AND is_active = FALSE';
        }
        
        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
        
        // Get total count
        const countQuery = query.replace('SELECT id, name, email, phone, role, is_active, is_email_verified, created_at, last_login', 'SELECT COUNT(*) as total');
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;
        
        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [users] = await db.execute(query, params);
        
        res.json({
            success: true,
            count: users.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: users
        });
        
    } catch (error) {
        console.error('[Admin] Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});

/**
 * GET /api/admin/users/:id
 * Get single user by ID
 */
router.get('/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        const [users] = await db.execute(
            'SELECT id, name, email, phone, role, is_active, is_email_verified, created_at, last_login FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Get user's order count
        const [orderCount] = await db.execute(
            'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
            [userId]
        );
        
        const user = users[0];
        user.total_orders = orderCount[0].count;
        
        res.json({
            success: true,
            data: user
        });
        
    } catch (error) {
        console.error('[Admin] Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user'
        });
    }
});

/**
 * POST /api/admin/users
 * Create new user (admin can create users manually)
 */
router.post('/users', authenticateAdmin, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
], validateRequest, async (req, res) => {
    try {
        const { name, email, phone, password, role = 'user' } = req.body;
        
        // Check if email already exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.execute(
            'INSERT INTO users (name, email, phone, password, role, is_email_verified) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email.toLowerCase(), phone || null, hashedPassword, role, true]
        );
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { userId: result.insertId }
        });
        
    } catch (error) {
        console.error('[Admin] Create user error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

/**
 * PUT /api/admin/users/:id
 * Update user details
 */
router.put('/users/:id', authenticateAdmin, [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone'),
    body('is_active').optional().isBoolean().withMessage('Invalid status')
], validateRequest, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { name, email, phone, is_active } = req.body;
        
        // Check if user exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check email uniqueness if changing
        if (email) {
            const [emailCheck] = await db.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email.toLowerCase(), userId]
            );
            
            if (emailCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
        }
        
        // Update user
        await db.execute(
            `UPDATE users SET 
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                is_active = COALESCE(?, is_active)
            WHERE id = ?`,
            [name || null, email ? email.toLowerCase() : null, phone || null, is_active !== undefined ? is_active : null, userId]
        );
        
        res.json({
            success: true,
            message: 'User updated successfully'
        });
        
    } catch (error) {
        console.error('[Admin] Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete (permanent) or Block user
 */
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { action = 'block' } = req.query;
        
        // Cannot delete own admin account
        if (userId === req.admin.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot perform action on your own account'
            });
        }
        
        if (action === 'delete') {
            // Permanent delete
            await db.execute('DELETE FROM users WHERE id = ?', [userId]);
            
            res.json({
                success: true,
                message: 'User deleted permanently'
            });
        } else {
            // Block/Unblock
            const [user] = await db.execute('SELECT is_active FROM users WHERE id = ?', [userId]);
            
            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const newStatus = user[0].is_active ? false : true;
            await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);
            
            res.json({
                success: true,
                message: newStatus ? 'User unblocked' : 'User blocked'
            });
        }
        
    } catch (error) {
        console.error('[Admin] Delete/block user error:', error);
        res.status(500).json({
            success: false,
            message: 'Operation failed'
        });
    }
});

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
    try {
        // Get user stats
        const [userStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_30_days
            FROM users WHERE role = 'user'
        `);
        
        // Get order stats
        const [orderStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as today_orders,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN total_amount ELSE 0 END) as today_revenue,
                SUM(total_amount) as total_revenue
            FROM orders
        `);
        
        // Get product stats
        const [productStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_products,
                SUM(CASE WHEN stock < 10 AND stock > 0 THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM products WHERE status = 'active'
        `);
        
        res.json({
            success: true,
            data: {
                users: userStats[0],
                orders: orderStats[0],
                products: productStats[0]
            }
        });
        
    } catch (error) {
        console.error('[Admin] Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard stats'
        });
    }
});

module.exports = router;

