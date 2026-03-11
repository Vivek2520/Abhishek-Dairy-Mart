/**
 * User Authentication Routes
 * Handles signup, login, logout, profile management
 * 
 * @module routes/authRoutes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { generateToken, authenticateUser } = require('../middleware/auth');

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
// PUBLIC ROUTES
// ============================================

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
], validateRequest, async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // Check if user already exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        const [result] = await db.execute(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [name, email.toLowerCase(), phone || null, hashedPassword, 'user']
        );
        
        // Generate token
        const token = generateToken({ id: result.insertId, email, role: 'user' });
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                userId: result.insertId,
                token,
                user: {
                    id: result.insertId,
                    name,
                    email: email.toLowerCase(),
                    role: 'user'
                }
            }
        });
        
    } catch (error) {
        console.error('[Auth] Register error:', error);
        
        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], validateRequest, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const [users] = await db.execute(
            'SELECT id, name, email, password, role, is_active FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        const user = users[0];
        
        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is blocked. Please contact support.'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Update last login
        await db.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );
        
        // Generate token
        const token = generateToken({ id: user.id, email: user.email, role: user.role });
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
        
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', authenticateUser, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        data: { user: req.user }
    });
});

// ============================================
// PROTECTED ROUTES (Require Authentication)
// ============================================

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, name, email, phone, role, is_email_verified, is_active, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: users[0]
        });
        
    } catch (error) {
        console.error('[Auth] Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile', authenticateUser, [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
], validateRequest, async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        await db.execute(
            'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
            [name || null, phone || null, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
        
    } catch (error) {
        console.error('[Auth] Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * PUT /api/auth/password
 * Change user password
 */
router.put('/password', authenticateUser, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validateRequest, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Get current password hash
        const [users] = await db.execute(
            'SELECT password FROM users WHERE id = ?',
            [req.user.id]
        );
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
        
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('[Auth] Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client should remove token)
 */
router.post('/logout', authenticateUser, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = router;

