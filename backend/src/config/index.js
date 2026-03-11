/**
 * Configuration Module
 * Centralizes environment variables and application configuration
 * 
 * @module config/index
 */

require('dotenv').config();

/**
 * Validates critical environment variables at startup
 * Throws if required variables are missing in production
 * CRITICAL SECURITY ENHANCEMENT - Prevents misconfiguration
 */
const validateEnvironment = () => {
    const requiredEnvVars = ['JWT_SECRET', 'ADMIN_PASSWORD_HASH', 'NODE_ENV'];
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
        const isProduction = process.env.NODE_ENV === 'production';
        const errorMsg = `Missing critical environment variables: ${missingVars.join(', ')}`;
        
        if (isProduction) {
            throw new Error(`[FATAL] ${errorMsg}`);
        } else {
            console.warn(`[WARNING] ${errorMsg}`);
        }
    }

    // Validate JWT_SECRET is strong enough
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        const errorMsg = 'JWT_SECRET must be at least 32 characters long';
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`[FATAL] ${errorMsg}`);
        } else {
            console.warn(`[WARNING] ${errorMsg}`);
        }
    }
};

// Validate on load
validateEnvironment();

/**
 * Application configuration object
 * Contains all environment-based settings
 */
const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development'
    },

    // API Configuration
    api: {
        prefix: '/api',
        rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100, // Limit each IP to 100 requests per windowMs
    },

    // File Paths
    paths: {
        dataDir: process.env.DATA_DIR || __dirname + '/../..',
        productsFile: process.env.PRODUCTS_FILE || 'products.json',
        ordersFile: process.env.ORDERS_FILE || 'orders.json',
        exportsDir: process.env.EXPORTS_DIR || 'exports'  // folder for generated Excel/CSV files
    },

    // Order Configuration
    order: {
        minOrderAmount: 299,
        deliveryCharge: 50
    },

    // WhatsApp Configuration
    whatsapp: {
        phoneNumber: process.env.WHATSAPP_PHONE || '917879355368'
    },

    // CORS Configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        credentials: true,
        optionsSuccessStatus: 200,
        maxAge: 86400 // 24 hours
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'abhishek-dairy-store-jwt-secret-key-2024',
        expiresIn: '7d', // 7 days
        cookieName: 'token'
    }
};

/**
 * Checks if the application is running in production mode
 * @returns {boolean} True if in production
 */
const isProduction = () => config.server.nodeEnv === 'production';

/**
 * Checks if the application is running in development mode
 * @returns {boolean} True if in development
 */
const isDevelopment = () => config.server.nodeEnv === 'development';

module.exports = {
    config,
    isProduction,
    isDevelopment
};
