/**
 * Admin Authentication Controller
 * Handles login, logout, password reset, and profile endpoints
 * 
 * @module admin/controllers/adminAuthController
 */

const adminAuthService = require('../services/adminAuthService');
const { AppError } = require('../../utils/AppError');

/**
 * Admin login endpoint
 * CRITICAL: Updated to handle async authentication with bcryptjs
 * @route POST /api/admin/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        console.log(`[REQUEST] POST /api/admin/auth/login - Email: ${email}`);

        // Validate required fields
        if (!email || !password) {
            throw new AppError('Email and password are required', 400, 'ValidationError');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Invalid email format', 400, 'ValidationError');
        }

        // Authenticate admin (now async with bcryptjs)
        const result = await adminAuthService.authenticate(email, password);

        // Set tokens in secure cookies (optional)
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        console.log(`[RESPONSE] Admin ${result.admin.email} logged in successfully`);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                admin: result.admin
            }
        });
    } catch (error) {
        console.error(`[ERROR] login: ${error.message}`);
        next(error);
    }
};

/**
 * Admin logout endpoint
 * @route POST /api/admin/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        console.log(`[REQUEST] POST /api/admin/auth/logout - Admin: ${req.admin?.id}`);

        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        console.log(`[RESPONSE] Admin ${req.admin?.email} logged out`);

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error(`[ERROR] logout: ${error.message}`);
        next(error);
    }
};

/**
 * Refresh access token endpoint
 * CRITICAL: Updated to handle async token refresh with JWT verification
 * @route POST /api/admin/auth/refresh
 */
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        console.log(`[REQUEST] POST /api/admin/auth/refresh`);

        if (!refreshToken) {
            throw new AppError('Refresh token is required', 400, 'ValidationError');
        }

        // Refresh token operation is now async
        const result = await adminAuthService.refreshAccessToken(refreshToken);

        console.log(`[RESPONSE] Access token refreshed`);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: result.accessToken
            }
        });
    } catch (error) {
        console.error(`[ERROR] refresh: ${error.message}`);
        next(error);
    }
};

/**
 * Request password reset endpoint
 * @route POST /api/admin/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        console.log(`[REQUEST] POST /api/admin/auth/forgot-password - Email: ${email}`);

        if (!email) {
            throw new AppError('Email is required', 400, 'ValidationError');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Invalid email format', 400, 'ValidationError');
        }

        const result = adminAuthService.requestPasswordReset(email);

        console.log(`[RESPONSE] Password reset requested for ${email}`);

        // In production, email the reset token to the admin
        // For demo purposes, returning the token (NEVER do this in production)

        res.status(200).json({
            success: true,
            message: result.message,
            resetToken: process.env.NODE_ENV === 'development' ? result.resetToken : undefined
        });
    } catch (error) {
        console.error(`[ERROR] forgotPassword: ${error.message}`);
        next(error);
    }
};

/**
 * Reset password endpoint
 * CRITICAL: Updated to handle async bcryptjs password hashing
 * @route POST /api/admin/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;

        console.log(`[REQUEST] POST /api/admin/auth/reset-password`);

        // Validate required fields
        if (!resetToken || !newPassword || !confirmPassword) {
            throw new AppError('Reset token, new password, and confirmation are required', 400, 'ValidationError');
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            throw new AppError('Passwords do not match', 400, 'ValidationError');
        }

        // Validate password strength
        if (newPassword.length < 8) {
            throw new AppError('Password must be at least 8 characters long', 400, 'ValidationError');
        }

        // Reset password operation is now async
        const result = await adminAuthService.resetPassword(resetToken, newPassword);

        console.log(`[RESPONSE] Password reset successful`);

        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error(`[ERROR] resetPassword: ${error.message}`);
        next(error);
    }
};

/**
 * Get admin profile endpoint
 * @route GET /api/admin/auth/profile
 */
const getProfile = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/admin/auth/profile - Admin: ${req.admin?.id}`);

        const result = adminAuthService.getAdminProfile(req.admin.id);

        console.log(`[RESPONSE] Admin profile retrieved`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] getProfile: ${error.message}`);
        next(error);
    }
};

/**
 * Update admin profile endpoint
 * @route PUT /api/admin/auth/profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, profileImage } = req.body;

        console.log(`[REQUEST] PUT /api/admin/auth/profile - Admin: ${req.admin?.id}`);

        if (!name && !phone && !profileImage) {
            throw new AppError('At least one field is required for update', 400, 'ValidationError');
        }

        const result = adminAuthService.updateAdminProfile(req.admin.id, {
            name,
            phone,
            profileImage
        });

        console.log(`[RESPONSE] Admin profile updated`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] updateProfile: ${error.message}`);
        next(error);
    }
};

/**
 * Change password endpoint
 * CRITICAL: Updated to handle async bcryptjs password operations
 * @route POST /api/admin/auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        console.log(`[REQUEST] POST /api/admin/auth/change-password - Admin: ${req.admin?.id}`);

        // Validate required fields
        if (!oldPassword || !newPassword || !confirmPassword) {
            throw new AppError('All password fields are required', 400, 'ValidationError');
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            throw new AppError('New passwords do not match', 400, 'ValidationError');
        }

        // Validate password strength
        if (newPassword.length < 8) {
            throw new AppError('Password must be at least 8 characters long', 400, 'ValidationError');
        }

        // Check old password is different
        if (oldPassword === newPassword) {
            throw new AppError('New password must be different from current password', 400, 'ValidationError');
        }

        // Change password operation is now async
        const result = await adminAuthService.changePassword(req.admin.id, oldPassword, newPassword);

        console.log(`[RESPONSE] Password changed for admin ${req.admin.id}`);

        res.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] changePassword: ${error.message}`);
        next(error);
    }
};

/**
 * Verify admin session endpoint
 * @route GET /api/admin/auth/verify
 */
const verify = async (req, res, next) => {
    try {
        console.log(`[REQUEST] GET /api/admin/auth/verify - Admin: ${req.admin?.id}`);

        res.status(200).json({
            success: true,
            message: 'Session is valid',
            admin: req.admin
        });
    } catch (error) {
        console.error(`[ERROR] verify: ${error.message}`);
        next(error);
    }
};

module.exports = {
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword,
    verify
};
