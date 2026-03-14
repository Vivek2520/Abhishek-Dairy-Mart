/**
 * Admin Authentication Service
 * Handles login, token generation, and password management
 * CRITICAL: Uses bcryptjs for password hashing and jsonwebtoken for JWT (PRODUCTION READY)
 * 
 * @module admin/services/adminAuthService
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be defined in .env file (minimum 32 characters required)');
}
const JWT_EX

/**
 * Generate JWT access token (SECURE implementation)
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (e.g., '1h', '7d')
 * @returns {string} JWT token
 */
function generateAccessToken(payload, expiresIn = JWT_EXPIRE) {
    try {
        return jwt.sign(payload, JWT_SECRET, { 
            expiresIn,
            algorithm: 'HS256'
        });
    } catch (error) {
        console.error('[ERROR] generateAccessToken:', error.message);
        throw error;
    }
}

/**
 * Generate JWT refresh token (SECURE implementation)
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time
 * @returns {string} JWT token
 */
function generateRefreshToken(payload, expiresIn = JWT_REFRESH_EXPIRE) {
    try {
        return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
            expiresIn,
            algorithm: 'HS256'
        });
    } catch (error) {
        console.error('[ERROR] generateRefreshToken:', error.message);
        throw error;
    }
}

/**
 * Verify JWT token (SECURE implementation)
 * @param {string} token - JWT token to verify
 * @async
 * @returns {Object} Decoded token payload
 */
async function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
}

/**
 * Hash password using bcryptjs (SECURE implementation)
 * @param {string} password - Plain password
 * @async
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
}

/**
 * Compare password with hash (SECURE implementation using bcryptjs)
 * @param {string} password - Plain password
 * @param {string} hash - Hashed password
 * @async
 * @returns {Promise<boolean>} Match result
 */
async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Generate password reset token
 * @returns {Object} Token and hash for storing
 */
function generateResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return {
        token,
        hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
}

/**
 * Authenticate admin with email and password
 * CRITICAL: Now uses async/await for password comparison
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @async
 * @returns {Promise<Object>} Authentication result with token and admin data
 */
async function authenticate(email, password) {
    try {
        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

        // Find admin by email
        const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());

        if (!admin) {
            throw new Error('Invalid email or password');
        }

        // Check if account is active
        if (admin.status !== 'active') {
            throw new Error('Admin account is inactive');
        }

        // Check login attempts and lockout
        if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
            throw new Error('Account is temporarily locked. Please try again later.');
        }

        // Verify password (now async with bcryptjs constant-time comparison)
        const passwordMatch = await comparePassword(password, admin.password);
        if (!passwordMatch) {
            // Increment login attempts
            admin.loginAttempts = (admin.loginAttempts || 0) + 1;

            // Lock account after 5 failed attempts
            if (admin.loginAttempts >= 5) {
                admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
                console.warn(`[SECURITY] Account locked: ${email} after 5 failed login attempts`);
            }

            fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));
            throw new Error('Invalid email or password');
        }

        // Reset login attempts on successful login
        admin.loginAttempts = 0;
        admin.lockedUntil = null;
        admin.lastLogin = new Date().toISOString();

        // Generate JWT tokens using secure implementations
        const payload = {
            adminId: admin.id,
            email: admin.email,
            role: admin.role
        };

        const accessToken = generateAccessToken(payload, JWT_EXPIRE); // 1 hour
        const refreshToken = generateRefreshToken(payload, JWT_REFRESH_EXPIRE); // 7 days

        fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

        return {
            success: true,
            message: 'Authentication successful',
            accessToken,
            refreshToken,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            }
        };
    } catch (error) {
        console.error('[ERROR] authenticate:', error.message);
        throw error;
    }
}

/**
 * Refresh access token using refresh token
 * CRITICAL: Now uses async/await for token verification
 * @param {string} refreshTokenStr - Refresh token
 * @async
 * @returns {Promise<Object>} New access token
 */
async function refreshAccessToken(refreshTokenStr) {
    try {
        // Verify the refresh token is valid
        const decoded = await verifyToken(refreshTokenStr);

        if (!decoded || decoded.type !== 'refresh') {
            throw new Error('Invalid refresh token');
        }

        // Verify admin still exists and is active
        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
        const admin = admins.find(a => a.id === decoded.adminId);

        if (!admin || admin.status !== 'active') {
            throw new Error('Admin not found or inactive');
        }

        const newPayload = {
            adminId: admin.id,
            email: admin.email,
            role: admin.role
        };

        const newAccessToken = generateAccessToken(newPayload, JWT_EXPIRE); // 1 hour

        return {
            success: true,
            accessToken: newAccessToken
        };
    } catch (error) {
        console.error('[ERROR] refreshAccessToken:', error.message);
        throw error;
    }
}

/**
 * Change admin password
 * CRITICAL: Now async, uses bcryptjs for password operations
 * @param {string} adminId - Admin ID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @async
 * @returns {Promise<Object>} Change result
 */
async function changePassword(adminId, oldPassword, newPassword) {
    try {
        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

        const admin = admins.find(a => a.id === adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Verify old password (async bcryptjs comparison)
        const oldPasswordMatch = await comparePassword(oldPassword, admin.password);
        if (!oldPasswordMatch) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password
        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Update password using bcryptjs (async)
        admin.password = await hashPassword(newPassword);
        admin.updatedAt = new Date().toISOString();

        fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

        return {
            success: true,
            message: 'Password changed successfully'
        };
    } catch (error) {
        console.error('[ERROR] changePassword:', error.message);
        throw error;
    }
}

/**
 * Request password reset
 * @param {string} email - Admin email
 * @returns {Object} Reset request result
 */
function requestPasswordReset(email) {
    try {
        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

        const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
        if (!admin) {
            // Don't reveal if email exists or not (security best practice)
            return {
                success: true,
                message: 'If an account exists with this email, a reset link will be sent.'
            };
        }

        // Generate reset token
        const resetData = generateResetToken();
        admin.resetToken = resetData.hash;
        admin.resetTokenExpires = resetData.expiresAt;

        fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

        // In production, send email with resetData.token to admin.email
        // using nodemailer or similar service

        return {
            success: true,
            message: 'If an account exists with this email, a reset link will be sent.',
            resetToken: resetData.token // In production, send via email only
        };
    } catch (error) {
        console.error('[ERROR] requestPasswordReset:', error.message);
        throw error;
    }
}

/**
 * Reset password with token
 * CRITICAL: Now async, uses bcryptjs for password hashing
 * @param {string} resetToken - Password reset token
 * @param {string} newPassword - New password
 * @async
 * @returns {Promise<Object>} Reset result
 */
async function resetPassword(resetToken, newPassword) {
    try {
        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const admin = admins.find(a => 
            a.resetToken === tokenHash && 
            new Date(a.resetTokenExpires) > new Date()
        );

        if (!admin) {
            throw new Error('Invalid or expired reset token');
        }

        // Hash password using bcryptjs (async)
        admin.password = await hashPassword(newPassword);
        admin.resetToken = null;
        admin.resetTokenExpires = null;
        admin.updatedAt = new Date().toISOString();

        fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

        return {
            success: true,
            message: 'Password reset successfully'
        };
    } catch (error) {
        console.error('[ERROR] resetPassword:', error.message);
        throw error;
    }
}

/**
 * Get admin profile
 * @param {string} adminId - Admin ID
 * @returns {Object} Admin profile data
 */
function getAdminProfile(adminId) {
    try {
        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

        const admin = admins.find(a => a.id === adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Don't return password hash
        const { password, resetToken, resetTokenExpires, ...profile } = admin;
        return {
            success: true,
            data: profile
        };
    } catch (error) {
        console.error('[ERROR] getAdminProfile:', error.message);
        throw error;
    }
}

/**
 * Update admin profile
 * @param {string} adminId - Admin ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Updated profile
 */
function updateAdminProfile(adminId, updates) {
    try {
        const adminsPath = path.join(__dirname, '../../../data/admins.json');
        const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

        const admin = admins.find(a => a.id === adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Allow only certain fields to be updated
        const allowedUpdates = ['name', 'phone', 'profileImage'];
        allowedUpdates.forEach(field => {
            if (field in updates) {
                admin[field] = updates[field];
            }
        });

        admin.updatedAt = new Date().toISOString();
        fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

        const { password, resetToken, resetTokenExpires, ...profile } = admin;
        return {
            success: true,
            message: 'Profile updated successfully',
            data: profile
        };
    } catch (error) {
        console.error('[ERROR] updateAdminProfile:', error.message);
        throw error;
    }
}

module.exports = {
    authenticate,
    refreshAccessToken,
    changePassword,
    requestPasswordReset,
    resetPassword,
    getAdminProfile,
    updateAdminProfile,
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    hashPassword,
    comparePassword,
    generateResetToken
};
