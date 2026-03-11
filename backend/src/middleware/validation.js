/**
 * Validation Middleware
 * Provides input validation and sanitization for API requests
 * 
 * @module middleware/validation
 */

const { body, param, query, validationResult } = require('express-validator');
const { validationError } = require('../utils/AppError');

/**
 * Middleware to check validation results
 * Throws a validation error if any validation failed
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        throw validationError(errorMessages);
    }
    next();
};

/**
 * Validation rules for getting all products
 */
const getProductsValidation = [
    query('category')
        .optional()
        .trim()
        .escape()
        .isLength({ max: 50 })
        .withMessage('Category must be less than 50 characters'),
    query('search')
        .optional()
        .trim()
        .escape()
        .isLength({ max: 100 })
        .withMessage('Search term must be less than 100 characters'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    validate
];

/**
 * Validation rules for getting a single product
 */
const getProductValidation = [
    param('id')
        .trim()
        .notEmpty()
        .withMessage('Product ID is required')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid product ID format'),
    validate
];

/**
 * Validation rules for creating an order
 */
const createOrderValidation = [
    body('customerName')
        .trim()
        .notEmpty()
        .withMessage('Customer name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Customer name must be between 2 and 100 characters')
        .escape(),
    body('customerPhone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit Indian phone number'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item is required'),
    body('items.*.id')
        .notEmpty()
        .withMessage('Product ID is required for each item')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid product ID format'),
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    body('totalAmount')
        .isFloat({ min: 0 })
        .withMessage('Total amount must be a positive number'),
    body('deliveryAddress')
        .trim()
        .notEmpty()
        .withMessage('Delivery address is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Address must be between 10 and 500 characters')
        .escape(),
    validate
];

/**
 * Validation rules for getting orders
 */
const getOrdersValidation = [
    param('orderId')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Order ID is required')
        .matches(/^ORD[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid order ID format'),
    validate
];

/**
 * Sanitization rules for product queries
 */
const sanitizeProductQuery = [
    query('category').trim().escape(),
    query('search').trim().escape(),
    validate
];

/**
 * Sanitization rules for order input
 */
const sanitizeOrderInput = [
    body('customerName').trim().escape(),
    body('customerPhone').trim(),
    body('deliveryAddress').trim().escape(),
    body('items.*.name').trim().escape(),
    validate
];

// ============================================
// USER VALIDATION RULES
// ============================================

/**
 * Validation rules for user registration
 */
const userRegistrationValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .escape(),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('Username can only contain letters, numbers, dot, underscore and hyphen'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8, max: 72 })
        .withMessage('Password must be between 8 and 72 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
        .withMessage('Password must include at least one letter and one number'),
    body('confirmPassword')
        .trim()
        .notEmpty()
        .withMessage('Please confirm your password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit Indian phone number'),
    validate
];

/**
 * Validation rules for user login
 */
const userLoginValidation = [
    body('emailOrUsername')
        .trim()
        .notEmpty()
        .withMessage('Email or username is required')
        .isLength({ max: 120 })
        .withMessage('Email or username is too long'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required'),
    body('rememberMe')
        .optional()
        .isBoolean()
        .withMessage('Remember me must be true or false'),
    validate
];

/**
 * Validation rules for password change
 */
const passwordChangeValidation = [
    body('currentPassword')
        .trim()
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8, max: 72 })
        .withMessage('New password must be between 8 and 72 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
        .withMessage('New password must include at least one letter and one number'),
    validate
];

/**
 * Validation rules for profile update
 */
const profileUpdateValidation = [
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Name cannot be empty')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .escape(),
    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    validate
];

/**
 * Validation rules for address
 */
const addressValidation = [
    body('street')
        .trim()
        .notEmpty()
        .withMessage('Street address is required')
        .isLength({ min: 5, max: 200 })
        .withMessage('Street address must be between 5 and 200 characters')
        .escape(),
    body('city')
        .trim()
        .notEmpty()
        .withMessage('City is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('City must be between 2 and 50 characters')
        .escape(),
    body('state')
        .optional()
        .trim()
        .escape(),
    body('pincode')
        .trim()
        .notEmpty()
        .withMessage('Pincode is required')
        .matches(/^\d{6}$/)
        .withMessage('Please provide a valid 6-digit pincode'),
    body('landmark')
        .optional()
        .trim()
        .escape(),
    body('label')
        .optional()
        .trim()
        .escape(),
    validate
];

// Export validation object for cleaner imports
// Extra validations for password reset
const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    validate
];

const resetPasswordValidation = [
    body('resetToken')
        .trim()
        .notEmpty()
        .withMessage('Reset token is required'),
    body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8, max: 72 })
        .withMessage('New password must be between 8 and 72 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
        .withMessage('New password must include at least one letter and one number'),
    body('confirmPassword')
        .trim()
        .notEmpty()
        .withMessage('Please confirm your new password')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match'),
    validate
];

const userValidation = {
    register: userRegistrationValidation,
    login: userLoginValidation,
    changePassword: passwordChangeValidation,
    updateProfile: profileUpdateValidation,
    address: addressValidation,
    forgotPassword: forgotPasswordValidation,
    resetPassword: resetPasswordValidation
};

// ============================================
// CART VALIDATION RULES
// ============================================

/**
 * Validation rules for adding item to cart
 */
const addItemValidation = [
    body('productId')
        .trim()
        .notEmpty()
        .withMessage('Product ID is required')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid product ID format'),
    body('quantity')
        .optional()
        .isInt({ min: 1, max: 99 })
        .withMessage('Quantity must be between 1 and 99'),
    validate
];

/**
 * Validation rules for updating cart item
 */
const updateItemValidation = [
    param('productId')
        .trim()
        .notEmpty()
        .withMessage('Product ID is required')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid product ID format'),
    body('quantity')
        .isInt({ min: 0, max: 99 })
        .withMessage('Quantity must be between 0 and 99'),
    validate
];

/**
 * Validation rules for applying coupon
 */
const applyCouponValidation = [
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Coupon code is required')
        .isLength({ min: 3, max: 20 })
        .withMessage('Invalid coupon code'),
    validate
];

const cartValidation = {
    addItem: addItemValidation,
    updateItem: updateItemValidation,
    applyCoupon: applyCouponValidation
};

module.exports = {
    validate,
    getProductsValidation,
    getProductValidation,
    createOrderValidation,
    getOrdersValidation,
    sanitizeProductQuery,
    sanitizeOrderInput,
    userValidation,
    cartValidation
};
