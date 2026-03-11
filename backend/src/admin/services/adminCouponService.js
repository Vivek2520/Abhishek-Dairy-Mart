/**
 * Admin Coupon Service
 * Handles coupon management operations
 */

const fs = require('fs');
const path = require('path');

function getAllCoupons(options = {}) {
    try {
        const couponsPath = path.join(__dirname, '../../../data/coupons.json');
        let coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8')) || [];

        if (options.status) {
            coupons = coupons.filter(c => c.status === options.status);
        }

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            coupons = coupons.filter(c => c.code.toLowerCase().includes(searchLower));
        }

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;
        const total = coupons.length;

        const paginatedCoupons = coupons.slice(skip, skip + limit);

        return {
            success: true,
            data: paginatedCoupons,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getAllCoupons:', error.message);
        throw error;
    }
}

function getCouponById(couponId) {
    try {
        const couponsPath = path.join(__dirname, '../../../data/coupons.json');
        const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8')) || [];

        const coupon = coupons.find(c => c.id === couponId);

        if (!coupon) {
            throw new Error('Coupon not found');
        }

        return {
            success: true,
            data: coupon
        };
    } catch (error) {
        console.error('[ERROR] getCouponById:', error.message);
        throw error;
    }
}

function createCoupon(couponData) {
    try {
        const couponsPath = path.join(__dirname, '../../../data/coupons.json');
        const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8')) || [];

        if (!couponData.code || !couponData.discountValue) {
            throw new Error('Code and discount value are required');
        }

        const newCoupon = {
            id: `CPN${String(coupons.length + 1).padStart(6, '0')}`,
            code: couponData.code.toUpperCase(),
            discountType: couponData.discountType || 'percentage',
            discountValue: parseFloat(couponData.discountValue),
            minimumOrderAmount: parseFloat(couponData.minimumOrderAmount || 0),
            maximumOrderAmount: couponData.maximumOrderAmount ? parseFloat(couponData.maximumOrderAmount) : null,
            usageLimit: parseInt(couponData.usageLimit || 0),
            usageCount: 0,
            expiryDate: couponData.expiryDate || null,
            applicableProducts: couponData.applicableProducts || [],
            applicableCategories: couponData.applicableCategories || [],
            status: couponData.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        coupons.push(newCoupon);
        fs.writeFileSync(couponsPath, JSON.stringify(coupons, null, 2));

        return {
            success: true,
            message: 'Coupon created successfully',
            data: newCoupon
        };
    } catch (error) {
        console.error('[ERROR] createCoupon:', error.message);
        throw error;
    }
}

function updateCoupon(couponId, updates) {
    try {
        const couponsPath = path.join(__dirname, '../../../data/coupons.json');
        const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8')) || [];

        const coupon = coupons.find(c => c.id === couponId);

        if (!coupon) {
            throw new Error('Coupon not found');
        }

        const allowedFields = ['code', 'discountType', 'discountValue', 'minimumOrderAmount', 
                             'maximumOrderAmount', 'usageLimit', 'expiryDate', 'applicableProducts', 
                             'applicableCategories', 'status'];
        
        allowedFields.forEach(field => {
            if (field in updates && updates[field] !== undefined) {
                coupon[field] = updates[field];
            }
        });

        coupon.updatedAt = new Date().toISOString();
        fs.writeFileSync(couponsPath, JSON.stringify(coupons, null, 2));

        return {
            success: true,
            message: 'Coupon updated successfully',
            data: coupon
        };
    } catch (error) {
        console.error('[ERROR] updateCoupon:', error.message);
        throw error;
    }
}

function deleteCoupon(couponId) {
    try {
        const couponsPath = path.join(__dirname, '../../../data/coupons.json');
        const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8')) || [];

        const index = coupons.findIndex(c => c.id === couponId);

        if (index === -1) {
            throw new Error('Coupon not found');
        }

        coupons.splice(index, 1);
        fs.writeFileSync(couponsPath, JSON.stringify(coupons, null, 2));

        return {
            success: true,
            message: 'Coupon deleted successfully'
        };
    } catch (error) {
        console.error('[ERROR] deleteCoupon:', error.message);
        throw error;
    }
}

module.exports = {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon
};
