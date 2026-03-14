/**
 * Main Server File - Abhishek Dairy & General Store
 * Node.js + Express + MySQL Backend
 * 
 * @version 2.0.0
 * @author Abhishek Dairy
 */

const express = require('express');\nconst { corsMiddleware, helmetMiddleware, compressionMiddleware, xssMiddleware, mongoSanitizeMiddleware, apiLimiter, loginLimiter } = require('./middleware/security');\nconst httpsRedirect = require('./middleware/httpsRedirect');\nconst path = require('path');

// Load environment variables
require('dotenv').config();

// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ ERROR: JWT_SECRET must be set in backend/.env (min 32 chars)');
  process.exit(1);
}
if (!process.env.DB_HOST || !process.env.DB_NAME) {
  console.error('❌ ERROR: DB_HOST and DB_NAME required in backend/.env');
  process.exit(1);
}
console.log('✅ Environment validated successfully');

if (!process.env.CORS_ORIGINS) {
  console.warn('⚠️  WARNING: CORS_ORIGINS not set. Using fallback origins only (dev mode)');
}

// Import database config
const db = require('./config/db');
const testDatabaseConnection = require('./config/db').testDatabaseConnection;
const checkDatabaseHealth = require('./config/db').checkDatabaseHealth;
const { initializeDatabase } = require('./config/initDb');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// Secure CORS middleware (environment-validated)
app.use(corsMiddleware);

// HTTPS Enforcement for production (reverse proxy aware)\napp.set('trust proxy', 1);\napp.use(httpsRedirect);\n\n// Production security middlewares\napp.use(helmetMiddleware);\napp.use(compressionMiddleware);\napp.use(xssMiddleware);\napp.use(mongoSanitizeMiddleware);

// Body parsers (100kb limit for security)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
 
// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/admin/auth/login', loginLimiter);

// ============================================
// STATIC FILE SERVING
// ============================================

// Serve frontend public folder
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Serve images
app.use('/image', express.static(path.join(__dirname, '../../frontend/public/assets/images')));
app.use('/images', express.static(path.join(__dirname, '../../frontend/public/assets/images')));

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '../../frontend/public/admin')));

// ============================================
// ROUTES
// ============================================

// API Routes
app.use('/api/auth', authRoutes);           // User authentication
app.use('/api/admin', adminUserRoutes);    // Admin management
app.use('/api/products', productRoutes);     // Products
app.use('/api/orders', orderRoutes);        // Orders

// ============================================
// FRONTEND PAGE ROUTES
// ============================================

// Main index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// Auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/signup.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/profile.html'));
});

// Admin routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/admin/dashboard.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/admin/dashboard.html'));
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
    const isDbHealthy = await checkDatabaseHealth();
    
    if (isDbHealthy) {
        res.status(200).json({ 
            status: 'OK', 
            server: 'running',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(500).json({ 
            status: 'ERROR',
            server: 'running', 
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Endpoint not found',
        path: req.path 
    });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
    console.error('[Server] Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
    try {
        console.log('[Server] Environment: ' + (process.env.NODE_ENV || 'development'));
        console.log('[Server] Testing database connection...');
        
        await testDatabaseConnection();
        
        // Initialize database (create tables if needed)
        console.log('[Server] Initializing database tables...');
        await initializeDatabase();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('\n===========================================');
            console.log('🚀 Abhishek Dairy Server Started');
            console.log('===========================================');
            console.log(`📍 Server:   http://localhost:${PORT}`);
            console.log(`📦 API:      http://localhost:${PORT}/api`);
            console.log(`🖼️  Images:   http://localhost:${PORT}/image/`);
            console.log(`👤 Admin:    http://localhost:${PORT}/admin`);
            console.log('===========================================\n');
            
            console.log('📋 API Endpoints:');
            console.log('   POST   /api/auth/register    - User registration');
            console.log('   POST   /api/auth/login      - User login');
            console.log('   GET    /api/auth/profile    - Get user profile');
            console.log('   GET    /api/products        - Get products');
            console.log('   POST   /api/orders          - Create order');
            console.log('   GET    /api/orders          - Get orders');
            console.log('   POST   /api/admin/auth/login    - Admin login');
            console.log('   GET    /api/admin/users         - Get all users (admin)');
            console.log('   GET    /api/admin/dashboard/stats - Dashboard stats');
            console.log('');
        });
        
    } catch (error) {
        console.error('\n❌ Failed to start server:');
        console.error(error.message);
        console.log('\nPlease ensure:');
        console.log('1. MySQL server is running (XAMPP)');
        console.log('2. Database "mywebsite_db" exists');
        console.log('3. .env file has correct DB credentials\n');
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    process.exit(0);
});

startServer();

module.exports = app;

