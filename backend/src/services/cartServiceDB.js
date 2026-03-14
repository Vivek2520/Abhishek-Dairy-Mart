/**
 * Cart Service - MySQL Database Implementation
 * @module services/cartServiceDB
 */

const db = require('../config/db');
const { AppError } = require('../utils/AppError');

/**
 * Get user's cart with product details
 */
const getCart = async (userId) => {
  const [cartItems] = await db.execute(`
    SELECT c.*, p.name, p.price, p.image, p.unit 
    FROM carts c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `, [userId]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return {
    userId,
    items: cartItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    deliveryCharge: 50,
    total: parseFloat((subtotal + 50).toFixed(2)),
    itemCount: cartItems.length
  };
};

/**
 * Add or update item in cart
 */
const addItem = async (userId, productId, quantity = 1) => {
  if (!productId || quantity < 1) {
    throw new AppError('Valid product ID and quantity required', 400);
  }

  // Check if item exists, update or insert
  const [existing] = await db.execute(
    'SELECT id FROM carts WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  );

  if (existing.length > 0) {
    // Update quantity
    await db.execute(
      'UPDATE carts SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?',
      [quantity, existing[0].id]
    );
  } else {
    // Insert new item
    await db.execute(
      'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
      [userId, productId, quantity]
    );
  }

  return getCart(userId);
};

/**
 * Update item quantity (0 = remove)
 */
const updateItemQuantity = async (userId, productId, quantity) => {
  await db.execute(
    'DELETE FROM carts WHERE user_id = ? AND product_id = ? AND quantity <= 0',
    [userId, productId]
  );

  await db.execute(
    'UPDATE carts SET quantity = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ?',
    [quantity, userId, productId]
  );

  return getCart(userId);
};

/**
 * Remove item from cart
 */
const removeItem = async (userId, productId) => {
  await db.execute(
    'DELETE FROM carts WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  );

  return getCart(userId);
};

/**
 * Clear entire cart
 */
const clearCart = async (userId) => {
  await db.execute('DELETE FROM carts WHERE user_id = ?', [userId]);
  return getCart(userId);
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart
};

