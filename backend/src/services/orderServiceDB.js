/**
 * Order Service - MySQL Database Implementation
 * @module services/orderServiceDB
 */

const db = require('../config/db');
const { AppError } = require('../utils/AppError');

/**
 * Create new order from cart items
 */
const createOrder = async (orderData) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    items,
    totalAmount,
    paymentMethod = 'cash',
    userId
  } = orderData;

  if (!items || items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  const orderId = 'ORD' + Date.now();

  // Insert order
  const [result] = await db.execute(
    `INSERT INTO orders (order_id, user_id, customer_name, customer_phone, customer_email, delivery_address, items, total_amount, payment_method) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      userId || null,
      customerName,
      customerPhone,
      customerEmail || null,
      deliveryAddress,
      JSON.stringify(items),
      totalAmount,
      paymentMethod
    ]
  );

  // Clear user's cart
  if (userId) {
    await db.execute('DELETE FROM carts WHERE user_id = ?', [userId]);
  }

  const [order] = await db.execute(
    'SELECT * FROM orders WHERE id = ?',
    [result.insertId]
  );

  return {
    success: true,
    orderId: order[0].order_id,
    id: order[0].id,
    totalAmount: order[0].total_amount
  };
};

/**
 * Get all orders (public for testing)
 */
const getAllOrders = async () => {
  const [orders] = await db.execute(`
    SELECT * FROM orders 
    ORDER BY created_at DESC 
    LIMIT 50
  `);

  return orders.map(order => ({
    ...order,
    items: JSON.parse(order.items)
  }));
};

/**
 * Get orders for specific user
 */
const getOrdersByUserId = async (userId) => {
  const [orders] = await db.execute(`
    SELECT * FROM orders 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `, [userId]);

  return orders.map(order => ({
    ...order,
    items: JSON.parse(order.items)
  }));
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrdersByUserId
};

