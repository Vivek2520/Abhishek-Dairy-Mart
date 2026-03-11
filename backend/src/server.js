/**
 * Main Server File - Abhishek Dairy & General Store
 * Node.js + Express + MySQL Backend
 * 
 * @version 2.0.0
 * @author Abhishek Dairy
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import database config
const db = require('./config/db');
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

// CORS - Allow all origins for development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    try {
        // Test database connection
        await db.execute('SELECT 1');
        res.json({ 
            status: 'ok', 
            message: 'Server is running',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({ 
            status: 'error', 
            message: 'Server running but DB not connected',
            database: 'disconnected',
            error: error.message,
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
        // Test database connection first
        console.log('[Server] Testing database connection...');
        await db.execute('SELECT 1');
        console.log('[Server] ✅ Database connection successful');
        
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

