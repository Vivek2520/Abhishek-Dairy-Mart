/**
 * Admin Settings Service
 * Manages store and system settings
 */

const fs = require('fs');
const path = require('path');

function getSettings() {
    try {
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        return {
            success: true,
            data: settings
        };
    } catch (error) {
        console.error('[ERROR] getSettings:', error.message);
        throw error;
    }
}

function updateSettings(updates) {
    try {
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        const allowedFields = [
            'storeName', 'storeEmail', 'storePhone', 'storeAddress', 'currency',
            'taxRate', 'deliveryCharge', 'minOrderAmount', 'paymentMethods',
            'notifications', 'twoFactorAuth', 'sessionTimeout'
        ];

        allowedFields.forEach(field => {
            if (field in updates && updates[field] !== undefined) {
                settings[field] = updates[field];
            }
        });

        settings.updatedAt = new Date().toISOString();
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

        return {
            success: true,
            message: 'Settings updated successfully',
            data: settings
        };
    } catch (error) {
        console.error('[ERROR] updateSettings:', error.message);
        throw error;
    }
}

function getPaymentSettings() {
    try {
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        const paymentSettings = {
            paymentMethods: settings.paymentMethods || [],
            gateways: {
                razorpay: {
                    enabled: true,
                    keyId: process.env.RAZORPAY_KEY_ID || '',
                    keySecret: process.env.RAZORPAY_KEY_SECRET ? '***' : ''
                },
                stripe: {
                    enabled: false,
                    publishableKey: process.env.STRIPE_PUBLIC_KEY || '',
                    secretKey: process.env.STRIPE_SECRET_KEY ? '***' : ''
                }
            }
        };

        return {
            success: true,
            data: paymentSettings
        };
    } catch (error) {
        console.error('[ERROR] getPaymentSettings:', error.message);
        throw error;
    }
}

function updatePaymentSettings(updates) {
    try {
        const settingsPath = path.join(__dirname, '../../../../database/seeds/settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        if (updates.paymentMethods) {
            settings.paymentMethods = updates.paymentMethods;
        }

        settings.updatedAt = new Date().toISOString();
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

        return {
            success: true,
            message: 'Payment settings updated successfully',
            data: settings
        };
    } catch (error) {
        console.error('[ERROR] updatePaymentSettings:', error.message);
        throw error;
    }
}

module.exports = {
    getSettings,
    updateSettings,
    getPaymentSettings,
    updatePaymentSettings
};
