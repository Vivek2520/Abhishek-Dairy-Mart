/**
 * Admin Authentication Routes
 * 
 * @module admin/routes/adminAuthRoutes
 */

const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { adminAuthMiddleware } = require('../middleware/adminAuth');

/**
 * Public Routes (no authentication required)
 */

// POST /api/admin/auth/login
router.post('/login', adminAuthController.login);

// POST /api/admin/auth/forgot-password
router.post('/forgot-password', adminAuthController.forgotPassword);

// POST /api/admin/auth/reset-password
router.post('/reset-password', adminAuthController.resetPassword);

// POST /api/admin/auth/refresh
router.post('/refresh', adminAuthController.refresh);

/**
 * Protected Routes (authentication required)
 */

// GET /api/admin/auth/verify
router.get('/verify', adminAuthMiddleware, adminAuthController.verify);

// POST /api/admin/auth/logout
router.post('/logout', adminAuthMiddleware, adminAuthController.logout);

// GET /api/admin/auth/profile
router.get('/profile', adminAuthMiddleware, adminAuthController.getProfile);

// PUT /api/admin/auth/profile
router.put('/profile', adminAuthMiddleware, adminAuthController.updateProfile);

// POST /api/admin/auth/change-password
router.post('/change-password', adminAuthMiddleware, adminAuthController.changePassword);

module.exports = router;
