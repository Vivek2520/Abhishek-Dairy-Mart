/**
 * Coupon Service
 * Provides validation and usage tracking for coupons that are created via
 * the admin dashboard. This module is used by both customer-facing endpoints
 * and the admin APIs.
 *
 * The data format is stored in `data/coupons.json`. When a coupon is applied or
 * used, the `usageCount` is incremented and an optional per-user counter is
 * maintained in `usageByUser` (an object mapping userId -> count).
 *
 * @module services/couponService
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const { AppError, badRequest } = require('../utils/AppError');
const productService = require('./productService');

// ==========================================================================
// Helper functions for loading / saving coupons
// ==========================================================================

const getCouponsFilePath = () => {
    return path.join(config.paths.dataDir, 'coupons.json');
};

function loadCoupons() {
    const filePath = getCouponsFilePath();
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) || [];
    } catch (err) {
        console.error('[couponService] failed to load coupons:', err.message);
        throw new AppError('Failed to load coupons', 500, 'DataError');
    }
}

function saveCoupons(coupons) {
    const filePath = getCouponsFilePath();
    try {
        fs.writeFileSync(filePath, JSON.stringify(coupons, null, 2), 'utf8');
    } catch (err) {
        console.error('[couponService] failed to save coupons:', err.message);
        throw new AppError('Failed to save coupons', 500, 'DataError');
    }
}

// ==========================================================================
// Core business logic
// ==========================================================================

function findCouponByCode(code) {
    if (!code) return null;
    const coupons = loadCoupons();
    return coupons.find(c => c.code.toUpperCase() === String(code).toUpperCase()) || null;
}

/**
 * Validate a coupon against a cart.
 *
 * @param {string} code - Coupon code entered by customer
 * @param {number} cartTotal - Current cart subtotal (before delivery/discount)
 * @param {Array} items - Cart items array, each { productId, price, quantity }
 * @param {string} [userId] - Optional user id (for per-user limits)
 *
 * @returns {{ discount: number, newTotal: number, coupon: Object }}
 * @throws {AppError} if coupon is invalid or cannot be applied.
 */
function validateCoupon(code, cartTotal, items = [], userId = null) {
    const coupon = findCouponByCode(code);
    if (!coupon) {
        throw badRequest('Coupon not found');
    }
    if (coupon.status !== 'active') {
        throw badRequest('Coupon is not active');
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        throw badRequest('Coupon has expired');
    }
    if (coupon.minimumOrderAmount && cartTotal < coupon.minimumOrderAmount) {
        throw badRequest(`Minimum order amount for this coupon is ₹${coupon.minimumOrderAmount}`);
    }
    if (coupon.maximumOrderAmount && cartTotal > coupon.maximumOrderAmount) {
        throw badRequest(`Cart exceeds maximum allowed for this coupon`);
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw badRequest('Coupon usage limit reached');
    }
    if (coupon.perUserLimit && userId) {
        const byUser = coupon.usageByUser || {};
        const used = byUser[userId] || 0;
        if (used >= coupon.perUserLimit) {
            throw badRequest('You have already used this coupon');
        }
    }

    // check applicability to products or categories
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        const matches = items.some(i => coupon.applicableProducts.includes(i.productId));
        if (!matches) {
            throw badRequest('Coupon not valid for selected products');
        }
    }
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        const products = productService.loadProducts();
        const matches = items.some(i => {
            const p = productService.findProductById(products, i.productId);
            return p && coupon.applicableCategories.includes(p.category);
        });
        if (!matches) {
            throw badRequest('Coupon not valid for selected categories');
        }
    }

    // compute discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
        discount = cartTotal * (coupon.discountValue / 100);
    } else {
        discount = coupon.discountValue;
    }
    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
    }
    discount = parseFloat(discount.toFixed(2));

    const newTotal = parseFloat((cartTotal - discount).toFixed(2));

    return { discount, newTotal, coupon };
}

/**
 * Record that a coupon has been used. This updates global and per-user counters.
 *
 * @param {string} code
 * @param {string} [userId]
 */
function recordUsage(code, userId = null) {
    const coupons = loadCoupons();
    const idx = coupons.findIndex(c => c.code.toUpperCase() === String(code).toUpperCase());
    if (idx === -1) return;
    const coupon = coupons[idx];

    coupon.usageCount = (coupon.usageCount || 0) + 1;
    if (userId) {
        coupon.usageByUser = coupon.usageByUser || {};
        coupon.usageByUser[userId] = (coupon.usageByUser[userId] || 0) + 1;
    }
    coupon.updatedAt = new Date().toISOString();
    coupons[idx] = coupon;
    saveCoupons(coupons);
}

module.exports = {
    loadCoupons,
    findCouponByCode,
    validateCoupon,
    recordUsage
};
