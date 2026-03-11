/**
 * Database Initialization Script
 * Automatically creates all required tables if they don't exist
 * 
 * @module config/initDb
 */

const db = require('./db');

/**
 * Initialize all database tables
 */
const initializeDatabase = async () => {
    console.log('[DB] Starting database initialization...');
    
    try {
        // Create users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                phone VARCHAR(20),
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                is_email_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                INDEX idx_email (email),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Users table ready');

        // Create categories table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                parent_id INT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
                INDEX idx_parent (parent_id),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Categories table ready');

        // Create products table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id VARCHAR(50) UNIQUE,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category_id INT,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                discount DECIMAL(5, 2) DEFAULT 0,
                stock INT DEFAULT 0,
                unit VARCHAR(20) DEFAULT 'piece',
                image VARCHAR(255),
                status ENUM('active', 'inactive') DEFAULT 'active',
                stock_sold INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                INDEX idx_category (category_id),
                INDEX idx_status (status),
                INDEX idx_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Products table ready');

        // Create orders table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                user_id INT,
                customer_name VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                customer_email VARCHAR(150),
                delivery_address TEXT,
                items JSON NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                discount_amount DECIMAL(10, 2) DEFAULT 0,
                tax_amount DECIMAL(10, 2) DEFAULT 0,
                shipping_charge DECIMAL(10, 2) DEFAULT 0,
                payment_method ENUM('cash', 'card', 'upi', 'online') DEFAULT 'cash',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                order_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_order_id (order_id),
                INDEX idx_user (user_id),
                INDEX idx_status (order_status),
                INDEX idx_payment (payment_status),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Orders table ready');

        // Create coupons table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL UNIQUE,
                type ENUM('percentage', 'fixed') NOT NULL,
                value DECIMAL(10, 2) NOT NULL,
                min_order_amount DECIMAL(10, 2) DEFAULT 0,
                usage_limit INT DEFAULT NULL,
                usage_count INT DEFAULT 0,
                applicable_categories JSON,
                applicable_products JSON,
                expiry_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_expiry (expiry_date),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Coupons table ready');

        // Create carts table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS carts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE KEY unique_cart_item (user_id, product_id),
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Carts table ready');

        // Create addresses table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS addresses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100),
                address_line1 VARCHAR(255) NOT NULL,
                address_line2 VARCHAR(255),
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100),
                pincode VARCHAR(10),
                phone VARCHAR(20),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Addresses table ready');

        // Create admin_logs table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50),
                entity_id INT,
                details JSON,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_admin (admin_id),
                INDEX idx_action (action),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Admin logs table ready');

        // Create inventory_logs table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS inventory_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                adjustment INT NOT NULL,
                previous_stock INT NOT NULL,
                new_stock INT NOT NULL,
                reason VARCHAR(255),
                admin_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_product (product_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Inventory logs table ready');

        // Create settings table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(50) NOT NULL UNIQUE,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_key (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[DB] ✓ Settings table ready');

        // Insert default admin if not exists
        const bcrypt = require('bcryptjs');
        const defaultPassword = await bcrypt.hash('admin123', 10);
        
        await db.execute(`
            INSERT IGNORE INTO users (name, email, phone, password, role, is_email_verified)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['Admin', 'admin@abhishek.com', '9876543210', defaultPassword, 'admin', true]);
        console.log('[DB] ✓ Default admin user created');

        // Insert default categories if not exists
        const categoriesExist = await db.execute('SELECT COUNT(*) as count FROM categories');
        if (categoriesExist[0][0].count === 0) {
            await db.execute(`
                INSERT INTO categories (name, description) VALUES
                ('Dairy', 'Milk and dairy products'),
                ('Snacks', 'Namkeen and snacks'),
                ('Biscuits', 'Biscuits and cookies'),
                ('Beverages', 'Drinks and beverages'),
                ('Grocery', 'Daily grocery items')
            `);
            console.log('[DB] ✓ Default categories inserted');
        }

        // Insert default settings if not exists
        const settingsExist = await db.execute('SELECT COUNT(*) as count FROM settings');
        if (settingsExist[0][0].count === 0) {
            await db.execute(`
                INSERT INTO settings (setting_key, setting_value) VALUES
                ('store_name', 'Abhishek Dairy & General Store'),
                ('contact_phone', '9876543210'),
                ('contact_email', 'contact@abhishekdairy.com'),
                ('tax_rate', '0'),
                ('shipping_charge', '50'),
                ('free_shipping_above', '500'),
                ('currency', 'INR')
            `);
            console.log('[DB] ✓ Default settings inserted');
        }

        console.log('[DB] ✅ Database initialization complete!\n');
        return true;

    } catch (error) {
        console.error('[DB] ❌ Database initialization error:', error.message);
        throw error;
    }
};

module.exports = { initializeDatabase };

