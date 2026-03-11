/**
 * Admin Authentication Middleware
 * Verifies JWT tokens and checks admin status
 * CRITICAL: Updated to use jsonwebtoken library instead of mock JWT decode
 * 
 * @module admin/middleware/adminAuth
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { AppError } = require('../../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key-in-production-12345';

/**
 * Middleware to verify admin JWT token
 * CRITICAL: Now uses proper jwt.verify() from jsonwebtoken package
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminAuthMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No authorization token provided', 401, 'UnauthorizedError');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify and decode token using jsonwebtoken (proper HS256 verification)
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                throw new AppError('Token has expired', 401, 'TokenExpiredError');
            } else if (jwtError.name === 'JsonWebTokenError') {
                throw new AppError('Invalid token signature', 401, 'InvalidTokenError');
            } else {
                throw new AppError('Token verification failed', 401, 'UnauthorizedError');
            }
        }

        // Load admin to verify they still exist and are active
        const adminsPath = path.join(__dirname, '../../data/admins.json');
        if (!fs.existsSync(adminsPath)) {
            throw new AppError('Admin data not found', 500, 'ServerError');
        }

        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
        const admin = admins.find(a => a.id === decoded.adminId);

        if (!admin) {
            throw new AppError('Admin not found', 404, 'NotFoundError');
        }

        if (admin.status !== 'active') {
            throw new AppError('Admin account is inactive', 403, 'ForbiddenError');
        }

        // Attach admin info to request
        req.admin = {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions
        };

        // Update last activity timestamp (async approach to prevent blocking)
        setImmediate(() => {
            try {
                const adminsData = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
                const adminData = adminsData.find(a => a.id === decoded.adminId);
                if (adminData) {
                    adminData.lastLogin = new Date().toISOString();
                    fs.writeFileSync(adminsPath, JSON.stringify(adminsData, null, 2));
                }
            } catch (err) {
                console.error('[WARNING] Failed to update admin lastLogin:', err.message);
            }
        });

        next();
    } catch (error) {
        console.error('[ERROR] adminAuthMiddleware:', error.message);
        next(error);
    }
};

/**
 * Middleware to check admin role/permissions
 * @param {string|string[]} requiredRole - Required role(s)
 * @returns {Function} Middleware function
 */
const adminRoleMiddleware = (requiredRole) => {
    return (req, res, next) => {
        try {
            if (!req.admin) {
                throw new AppError('Admin not authenticated', 401, 'UnauthorizedError');
            }

            // Super admin has all permissions
            if (req.admin.role === 'super_admin') {
                return next();
            }

            const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

            if (!rolesArray.includes(req.admin.role)) {
                throw new AppError('Insufficient permissions for this action', 403, 'ForbiddenError');
            }

            next();
        } catch (error) {
            console.error('[ERROR] adminRoleMiddleware:', error.message);
            next(error);
        }
    };
};

/**
 * Middleware to check specific permissions
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @returns {Function} Middleware function
 */
const adminPermissionMiddleware = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.admin) {
                throw new AppError('Admin not authenticated', 401, 'UnauthorizedError');
            }

            // Super admin has all permissions
            if (req.admin.permissions.includes('all')) {
                return next();
            }

            const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
            const hasPermission = permissionsArray.some(p => req.admin.permissions.includes(p));

            if (!hasPermission) {
                throw new AppError('Insufficient permissions for this action', 403, 'ForbiddenError');
            }

            next();
        } catch (error) {
            console.error('[ERROR] adminPermissionMiddleware:', error.message);
            next(error);
        }
    };
};

module.exports = {
    adminAuthMiddleware,
    adminRoleMiddleware,
    adminPermissionMiddleware
};
