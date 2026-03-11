/**
 * Admin Inventory Service
 * Handles inventory management and stock adjustments
 */

const fs = require('fs');
const path = require('path');

function getInventoryStatus(options = {}) {
    try {
        const productsPath = path.join(__dirname, '../../../../database/seeds/products.json');
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');

        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const threshold = settings.notifications?.stockAlertThreshold || 10;

        let inventory = products.map(p => ({
            id: p.id,
            productId: p.productId,
            name: p.name,
            category: p.category,
            quantity: p.quantity || p.stock || 0,
            reorderLevel: p.reorderLevel || threshold,
            status: p.quantity <= 0 ? 'out-of-stock' : 
                    p.quantity <= threshold ? 'low-stock' : 'in-stock'
        }));

        if (options.status) {
            inventory = inventory.filter(i => i.status === options.status);
        }

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            inventory = inventory.filter(i =>
                (i.name || '').toLowerCase().includes(searchLower)
            );
        }

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;
        const total = inventory.length;

        const paginatedInventory = inventory.slice(skip, skip + limit);

        return {
            success: true,
            data: paginatedInventory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getInventoryStatus:', error.message);
        throw error;
    }
}

function getLowStockAlerts(options = {}) {
    try {
        const productsPath = path.join(__dirname, '../../../../database/seeds/products.json');
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');

        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const threshold = settings.notifications?.stockAlertThreshold || 10;

        const lowStockProducts = products
            .filter(p => (p.quantity || p.stock || 0) <= threshold)
            .map(p => ({
                id: p.id,
                productId: p.productId,
                name: p.name,
                category: p.category,
                currentStock: p.quantity || p.stock || 0,
                alertThreshold: threshold,
                severity: (p.quantity || p.stock || 0) <= 0 ? 'critical' : 'warning'
            }));

        return {
            success: true,
            data: lowStockProducts
        };
    } catch (error) {
        console.error('[ERROR] getLowStockAlerts:', error.message);
        throw error;
    }
}

function adjustStock(productId, changeQuantity, reason = '') {
    try {
        const productsPath = path.join(__dirname, '../../../../database/seeds/products.json');
        const logsPath = path.join(__dirname, '../../../../database/seeds/inventory_logs.json');

        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8')) || [];

        const product = products.find(p => p.id == productId || p.productId === productId);

        if (!product) {
            throw new Error('Product not found');
        }

        const previousQuantity = product.quantity || product.stock || 0;
        const newQuantity = previousQuantity + changeQuantity;

        if (newQuantity < 0) {
            throw new Error('Stock quantity cannot be negative');
        }

        product.quantity = newQuantity;
        product.updatedAt = new Date().toISOString();

        // Log the adjustment
        logs.push({
            id: `INV${String(logs.length + 1).padStart(6, '0')}`,
            productId: productId,
            previousQuantity,
            newQuantity,
            changeQuantity,
            reason: reason || 'manual_adjustment',
            notes: reason,
            adminId: 'ADM001',
            createdAt: new Date().toISOString()
        });

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));

        return {
            success: true,
            message: 'Stock adjusted successfully',
            data: {
                productId,
                previousQuantity,
                newQuantity,
                changeQuantity
            }
        };
    } catch (error) {
        console.error('[ERROR] adjustStock:', error.message);
        throw error;
    }
}

function getInventoryLogs(options = {}) {
    try {
        const logsPath = path.join(__dirname, '../../../data/inventory_logs.json');
        let logs = JSON.parse(fs.readFileSync(logsPath, 'utf8')) || [];

        if (options.productId) {
            logs = logs.filter(l => l.productId == options.productId);
        }

        logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;
        const total = logs.length;

        const paginatedLogs = logs.slice(skip, skip + limit);

        return {
            success: true,
            data: paginatedLogs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[ERROR] getInventoryLogs:', error.message);
        throw error;
    }
}

function setReorderLevel(productId, reorderLevel) {
    try {
        const productsPath = path.join(__dirname, '../../../products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8')) || [];

        const product = products.find(p => p.id == productId || p.productId === productId);

        if (!product) {
            throw new Error('Product not found');
        }

        product.reorderLevel = parseInt(reorderLevel);
        product.updatedAt = new Date().toISOString();

        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        return {
            success: true,
            message: 'Reorder level updated successfully',
            data: {
                productId,
                reorderLevel: product.reorderLevel
            }
        };
    } catch (error) {
        console.error('[ERROR] setReorderLevel:', error.message);
        throw error;
    }
}

module.exports = {
    getInventoryStatus,
    getLowStockAlerts,
    adjustStock,
    getInventoryLogs,
    setReorderLevel
};
