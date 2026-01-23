const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Load products from JSON file
function loadProducts() {
    const productsPath = path.join(__dirname, 'products.json');
    try {
        const data = fs.readFileSync(productsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Load orders from JSON file
function loadOrders() {
    const ordersPath = path.join(__dirname, 'orders.json');
    try {
        const data = fs.readFileSync(ordersPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Save orders to JSON file
function saveOrders(orders) {
    const ordersPath = path.join(__dirname, 'orders.json');
    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
}

// Routes

// Get all products
app.get('/api/products', (req, res) => {
    try {
        const products = loadProducts();
        const category = req.query.category;
        const search = req.query.search;

        let filtered = products;

        // Filter by category
        if (category && category !== 'all') {
            filtered = filtered.filter(p => p.category === category);
        }

        // Filter by search term
        if (search) {
            const searchTerm = search.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm)
            );
        }

        res.json({
            success: true,
            count: filtered.length,
            data: filtered
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    try {
        const products = loadProducts();
        const product = products.find(p => p.id === parseInt(req.params.id));
        
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get products by category
app.get('/api/categories/:category', (req, res) => {
    try {
        const products = loadProducts();
        const filtered = products.filter(p => p.category === req.params.category);
        
        res.json({
            success: true,
            category: req.params.category,
            count: filtered.length,
            data: filtered
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create order
app.post('/api/orders', (req, res) => {
    try {
        const { customerName, customerPhone, items, totalAmount, deliveryAddress } = req.body;

        // Validation
        if (!customerName || !customerPhone || !items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const orders = loadOrders();
        const orderId = 'ORD' + Date.now();
        
        const newOrder = {
            orderId,
            customerName,
            customerPhone,
            items,
            totalAmount,
            deliveryAddress,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        orders.push(newOrder);
        saveOrders(orders);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: newOrder
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get orders
app.get('/api/orders', (req, res) => {
    try {
        const orders = loadOrders();
        res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get order by ID
app.get('/api/orders/:orderId', (req, res) => {
    try {
        const orders = loadOrders();
        const order = orders.find(o => o.orderId === req.params.orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date() });
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Products endpoint: http://localhost:${PORT}/api/products`);
    console.log(`📋 Orders endpoint: http://localhost:${PORT}/api/orders`);
    console.log(`✅ API is ready to serve requests`);
});
