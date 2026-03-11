/**
 * JWT Authentication Middleware
 * Handles user and admin authentication
 * 
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in token
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
    const secret = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
    return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
    return jwt.verify(token, secret);
};

/**
 * Middleware to authenticate regular users
 */
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = verifyToken(token);
            
            // Check if user still exists and is active
            const [users] = await db.execute(
                'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND role = ?',
                [decoded.id, 'user']
            );
            
            if (users.length === 0 || !users[0].is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token or user not found.'
                });
            }
            
            req.user = users[0];
            next();
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token.'
            });
        }
    } catch (error) {
        console.error('[Auth] User authentication error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

/**
 * Middleware to authenticate admin users
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Admin token required.'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = verifyToken(token);
            
            // Check if user is admin
            const [users] = await db.execute(
                'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND role = ?',
                [decoded.id, 'admin']
            );
            
            if (users.length === 0 || !users[0].is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin privileges required.'
                });
            }
            
            req.admin = users[0];
            next();
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired admin token.'
            });
        }
    } catch (error) {
        console.error('[Auth] Admin authentication error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user to request if valid token present
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        
        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = verifyToken(token);
            const [users] = await db.execute(
                'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
                [decoded.id]
            );
            
            if (users.length > 0 && users[0].is_active) {
                req.user = users[0];
            }
        } catch (jwtError) {
            // Token invalid, but we continue without user
        }
        
        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    generateToken,
    verifyToken,
    authenticateUser,
    authenticateAdmin,
    optionalAuth
};

