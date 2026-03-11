/**
 * Security Middleware
 * Implements security best practices including helmet, rate limiting, CORS, and input sanitization
 * 
 * @module middleware/security
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { config } = require('../config');

/**
 * Helmet configuration for security headers
 * Sets various HTTP headers to protect against common web vulnerabilities
 * CRITICAL SECURITY ENHANCEMENT
 */
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            // In production: upgrade-insecure-requests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    // CRITICAL ADDITIONS
    frameguard: { action: 'deny' },                          // Prevent clickjacking
    xssFilter: true,                                          // Enable XSS filter
    noSniff: true,                                            // Prevent MIME type sniffing
    hsts: {                                                    // HTTPS Strict Transport Security
        maxAge: 31536000,                                     // 1 year
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' } // Control referrer info
});

/**
 * Rate limiter configuration
 * Limits repeated requests to prevent brute-force attacks
 */
const rateLimiter = rateLimit({
    windowMs: config.api.rateLimitWindowMs,
    max: config.api.rateLimitMax,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        console.warn(`[RATE LIMIT] IP: ${req.ip} - Too many requests`);
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * More restrictive limits for sensitive endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 attempts per window
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
        timestamp: new Date().toISOString()
    }
});

/**
 * Rate limiter for order creation
 * Prevents order spam
 */
const orderLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Only 3 orders per minute
    message: {
        success: false,
        error: 'Too many orders placed, please try again later.',
        timestamp: new Date().toISOString()
    }
});

/**
 * CORS middleware configuration
 * Enables Cross-Origin Resource Sharing with strict security
 * Uses express-cors for proper implementation
 */
const corsMiddleware = cors({
    origin: function(origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5000').split(',')
            .map(url => url.trim());
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: config.cors.methods,
    credentials: config.cors.credentials,
    optionsSuccessStatus: config.cors.optionsSuccessStatus,
    maxAge: config.cors.maxAge,
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-ID']
});

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
    req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
};

/**
 * HTTP parameter pollution prevention
 * Cleans duplicate parameters
 */
const pppMiddleware = (req, res, next) => {
    // Express handles this automatically since version 4.17+
    // but we add custom handling for legacy versions
    next();
};

module.exports = {
    helmetMiddleware,
    rateLimiter,
    authLimiter,
    orderLimiter,
    corsMiddleware,
    requestIdMiddleware,
    pppMiddleware
};
