/**
 * CSRF Protection Middleware
 * Prevents Cross-Site Request Forgery attacks
 * CRITICAL SECURITY ENHANCEMENT
 * 
 * Implementation: Uses double-submit cookie pattern
 * - CSRF token stored in cookie and required in request header
 * - Token validation on state-changing requests (POST, PUT, DELETE)
 */

const crypto = require('crypto');
const { AppError } = require('../utils/AppError');

// In-memory token store (for development)
// In production: use Redis or session store
const tokenStore = new Map();

/**
 * Generates a CSRF token
 * @param {string} sessionId - Unique session identifier
 * @returns {string} CSRF token
 */
const generateCSRFToken = (sessionId) => {
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store in memory with expiration (5 minutes)
    tokenStore.set(sessionId, {
        token,
        createdAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000)
    });

    return token;
};

/**
 * Validates a CSRF token
 * @param {string} sessionId - Unique session identifier
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid
 */
const validateCSRFToken = (sessionId, token) => {
    const storedData = tokenStore.get(sessionId);

    if (!storedData || Date.now() > storedData.expiresAt) {
        return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(storedData.token),
        Buffer.from(token)
    );
};

/**
 * Middleware to generate and provide CSRF tokens
 * Should be used for routes that serve forms (GET requests)
 * 
 * Sets headers:
 * - X-CSRF-Token: Token for forms
 * - Set-Cookie: Session ID if not present
 */
const csrfGenerateMiddleware = (req, res, next) => {
    try {
        // Get or create session ID
        let sessionId = req.cookies?.sessionId || crypto.randomBytes(16).toString('hex');
        
        if (!req.cookies?.sessionId) {
            res.cookie('sessionId', sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
        }

        // Generate CSRF token
        const csrfToken = generateCSRFToken(sessionId);

        // Store in response locals so templates can access it
        res.locals.csrfToken = csrfToken;

        // Also set as header for SPA/AJAX requests
        res.setHeader('X-CSRF-Token', csrfToken);

        next();
    } catch (err) {
        next(new AppError('Failed to generate CSRF token', 500));
    }
};

/**
 * Middleware to validate CSRF tokens on state-changing requests
 * Should be used on POST, PUT, DELETE, PATCH routes
 * 
 * Expects token in one of these locations:
 * - X-CSRF-Token header (preferred for AJAX)
 * - _csrf form field (for HTML forms)
 * - csrf query parameter (fallback)
 */
const csrfValidateMiddleware = (req, res, next) => {
    // Only validate on state-changing requests
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return next();
    }

    // Skip CSRF validation for public auth endpoints (login, forgot-password, reset-password, refresh)
    // Using exact match or checking the end of the path for flexibility
    const publicAuthPaths = [
        '/admin/auth/login',
        '/admin/auth/forgot-password',
        '/admin/auth/reset-password',
        '/admin/auth/refresh',
        // Customer auth endpoints
        '/users/register',
        '/users/login',
        '/users/logout',
        '/users/forgot-password',
        '/users/reset-password',
        '/users/request-email-otp',
        '/users/verify-email-otp',
        '/users/google-login'
    ];
    
    // Parse URL to remove query string for accurate path matching
    // req.originalUrl might be '/api/users/login?callbackUrl=/' so we need to extract only the path
    const fullUrl = req.originalUrl || req.path;
    const requestPath = fullUrl.split('?')[0]; // Remove query string
    
    const isPublicAuthEndpoint = publicAuthPaths.some(path => 
        requestPath.endsWith(path) || requestPath === `/api${path}`
    );
    
    if (isPublicAuthEndpoint) {
        return next();
    }

    try {
        const sessionId = req.cookies?.sessionId;

        if (!sessionId) {
            return next(new AppError('Missing session identifier. Please refresh the page.', 403));
        }

        // Try to get token from different sources
        const token =
            req.headers['x-csrf-token'] ||
            req.body?._csrf ||
            req.query?.csrf ||
            req.headers['x-requested-with'];

        if (!token) {
            return next(new AppError('Missing CSRF token. Please include X-CSRF-Token header.', 403));
        }

        // Validate token
        if (!validateCSRFToken(sessionId, token)) {
            return next(new AppError('Invalid CSRF token. Please refresh the page and try again.', 403));
        }

        // Regenerate token after validation (prevents token reuse)
        const newToken = generateCSRFToken(sessionId);
        res.setHeader('X-CSRF-Token', newToken);

        next();
    } catch (err) {
        next(new AppError('CSRF token validation failed', 403));
    }
};

/**
 * Cleanup middleware to remove expired tokens
 * Should be called periodically (via setInterval or cron)
 */
const cleanupExpiredTokens = () => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, data] of tokenStore.entries()) {
        if (now > data.expiresAt) {
            tokenStore.delete(sessionId);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
        console.log(`[CSRF] Cleaned up ${cleanedCount} expired tokens`);
    }
};

// Cleanup every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);

module.exports = {
    csrfGenerateMiddleware,
    csrfValidateMiddleware,
    generateCSRFToken,
    validateCSRFToken,
    cleanupExpiredTokens
};
