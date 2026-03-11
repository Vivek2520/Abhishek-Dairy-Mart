/**
 * Cart Service
 * Manages shopping cart functionality with localStorage persistence
 * 
 * @module services/cart
 */

const CART_STORAGE_KEY = 'abhishek_cart';
const DELIVERY_CHARGE = 50;
const MIN_ORDER_AMOUNT = 299;

/**
 * Cart Service class
 * Handles all cart operations including add, remove, update, and persistence
 */
export class CartService {
    constructor() {
        this.items = [];
        this.couponCode = null;
        this.discount = 0;
        this.load();
    }

    /**
     * Load cart from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            const data = saved ? JSON.parse(saved) : null;
            if (data) {
                this.items = data.items || [];
                this.couponCode = data.couponCode || null;
                this.discount = data.discount || 0;
            } else {
                this.items = [];
            }
        } catch (error) {
            console.error('[Cart] Failed to load cart:', error);
            this.items = [];
            this.couponCode = null;
            this.discount = 0;
        }
    }

    /**
     * Save cart to localStorage
     */
    save() {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
                items: this.items,
                couponCode: this.couponCode,
                discount: this.discount
            }));
        } catch (error) {
            console.error('[Cart] Failed to save cart:', error);
        }
    }

    /**
     * Get cart items
     * @returns {Array} Cart items
     */
    getItems() {
        return this.items;
    }

    /**
     * Get total number of items in cart
     * @returns {number} Total item count
     */
    getItemCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * Get subtotal (before delivery charge)
     * @returns {number} Subtotal amount
     */
    getSubtotal() {
        return this.items.reduce((total, item) => {
            const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace('₹', '')) || 0;
            return total + (price * item.quantity);
        }, 0);
    }

    /**
     * Get current discount (applied coupon)
     */
    getDiscount() {
        return this.discount || 0;
    }

    /**
     * Apply coupon locally
     */
    applyCoupon(code, amount) {
        this.couponCode = code;
        this.discount = amount || 0;
        this.save();
    }

    /**
     * Remove any applied coupon
     */
    clearCoupon() {
        this.couponCode = null;
        this.discount = 0;
        this.save();
    }

    /**
     * Get delivery charge
     * @returns {number} Delivery charge
     */
    getDeliveryCharge() {
        return this.getSubtotal() >= MIN_ORDER_AMOUNT ? 0 : DELIVERY_CHARGE;
    }

    /**
     * Get total amount (subtotal + delivery)
     * @returns {number} Total amount
     */
    getTotal() {
        return this.getSubtotal() + this.getDeliveryCharge();
    }

    /**
     * Check if cart meets minimum order amount
     * @returns {boolean} True if minimum order is met
     */
    meetsMinimumOrder() {
        return this.getSubtotal() >= MIN_ORDER_AMOUNT;
    }

    /**
     * Get minimum order amount
     * @returns {number} Minimum order amount
     */
    getMinimumOrder() {
        return MIN_ORDER_AMOUNT;
    }

    /**
     * Add item to cart
     * @param {Object} product - Product to add
     */
    add(product) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: product.id,
                productId: product.productId || null,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
        
        this.save();
    }

    /**
     * Remove item from cart
     * @param {number} productId - Product ID to remove
     */
    remove(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
    }

    /**
     * Update item quantity
     * @param {number} productId - Product ID
     * @param {number} quantity - New quantity
     */
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        
        if (item) {
            if (quantity <= 0) {
                this.remove(productId);
            } else {
                item.quantity = quantity;
                this.save();
            }
        }
    }

    /**
     * Increment item quantity by 1
     * @param {number} productId - Product ID
     */
    increment(productId) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity += 1;
            this.save();
        }
    }

    /**
     * Decrement item quantity by 1
     * @param {number} productId - Product ID
     */
    decrement(productId) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (item.quantity <= 1) {
                this.remove(productId);
            } else {
                item.quantity -= 1;
                this.save();
            }
        }
    }

    /**
     * Clear all items from cart
     */
    clear() {
        this.items = [];
        this.save();
    }

    /**
     * Check if cart is empty
     * @returns {boolean} True if cart is empty
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Generate WhatsApp order message
     * @param {Object} customerDetails - Customer information
     * @returns {string} Formatted WhatsApp message
     */
    generateWhatsAppMessage(customerDetails) {
        const { name, phone, address } = customerDetails;
        
        let message = `*🛒 Abhishek Dairy & General Store - New Order*\n\n`;
        message += `*👤 Customer Details:*\n`;
        message += `Name: ${this.escapeText(name)}\n`;
        message += `Phone: ${this.escapeText(phone)}\n`;
        message += `Address: ${this.escapeText(address)}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        message += `*📦 Order Items:*\n`;
        this.items.forEach((item, index) => {
            const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace('₹', '')) || 0;
            const itemTotal = price * item.quantity;
            message += `${index + 1}. ${this.escapeText(item.name)}\n`;
            message += `   Qty: ${item.quantity} × ₹${price} = ₹${itemTotal}\n`;
        });

        const subtotal = this.getSubtotal();
        const delivery = this.getDeliveryCharge();
        const total = this.getTotal();

        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `*💰 Bill Summary:*\n`;
        message += `Subtotal: ₹${subtotal}\n`;
        if (delivery > 0) {
            message += `Delivery: ₹${delivery} (Free above ₹${MIN_ORDER_AMOUNT})\n`;
        } else {
            message += `Delivery: FREE\n`;
        }
        message += `*Total: ₹${total}*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `✅ Thank you for ordering!\nWe will confirm within 5 minutes.`;

        return message;
    }

    /**
     * Escape special characters for WhatsApp message
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeText(text) {
        if (!text) return '';
        return text.toString()
            .replace(/_/g, '\\_')
            .replace(/\*/g, '\\*')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/~/g, '\\~')
            .replace(/`/g, '\\`')
            .replace(/>/g, '\\>')
            .replace(/#/g, '\\#')
            .replace(/\+/g, '\\+')
            .replace(/-/g, '\\-')
            .replace(/=/g, '\\=')
            .replace(/\|/g, '\\|')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/\./g, '\\.');
    }

    /**
     * Create order payload for API
     * @param {Object} customerDetails - Customer information
     * @returns {Object} Order data
     */
    createOrderPayload(customerDetails) {
        const payload = {
            customerName: customerDetails.name,
            customerPhone: customerDetails.phone,
            items: this.items.map(item => ({
                id: item.id,
                productId: item.productId,
                name: item.name,
                price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace('₹', '')) || 0,
                quantity: item.quantity
            })),
            totalAmount: this.getTotal(),
            deliveryAddress: customerDetails.address
        };
        if (this.couponCode) {
            payload.couponCode = this.couponCode;
            payload.discountAmount = this.discount;
        }
        return payload;
    }
}

// singleton
export const cart = new CartService();

// Export for global use
window.CartService = CartService;
window.cart = cart;
