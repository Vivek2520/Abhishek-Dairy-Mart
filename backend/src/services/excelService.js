/**
 * Excel Export Service
 * Responsible for appending orders to a master Excel workbook and for
 * generating on-demand reports. Uses `exceljs` to manipulate .xlsx files.
 *
 * The primary file is stored under `<dataDir>/<exportsDir>/orders.xlsx`.
 * A simple in-memory queue is used to serialize writes and avoid concurrent
 * corruption when many orders arrive at once.
 *
 * @module services/excelService
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { config } = require('../config');
const { AppError } = require('../utils/AppError');

const exportsDirPath = path.join(config.paths.dataDir, config.paths.exportsDir);
const ordersFilePath = path.join(exportsDirPath, 'orders.xlsx');

// simple queue to serialize append operations
let queue = [];
let writing = false;

async function _ensureWorkbook() {
    // ensure directory exists
    fs.mkdirSync(exportsDirPath, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(ordersFilePath)) {
        await workbook.xlsx.readFile(ordersFilePath);
    }
    let sheet = workbook.getWorksheet('Orders');
    if (!sheet) {
        sheet = workbook.addWorksheet('Orders');
        sheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'User ID', key: 'userId', width: 20 },
            { header: 'Customer Name', key: 'customerName', width: 30 },
            { header: 'Customer Phone', key: 'customerPhone', width: 20 },
            { header: 'Shipping Address', key: 'address', width: 40 },
            { header: 'Products', key: 'products', width: 50 },
            { header: 'Quantities', key: 'quantities', width: 20 },
            { header: 'Subtotal', key: 'subtotal', width: 15 },
            { header: 'Delivery Charge', key: 'deliveryCharge', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Total Amount', key: 'totalAmount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Order Status', key: 'orderStatus', width: 20 }
        ];
    }
    return workbook;
}

async function _appendRow(order) {
    const workbook = await _ensureWorkbook();
    const sheet = workbook.getWorksheet('Orders');

    const products = order.items.map(i => i.name).join(', ');
    const quantities = order.items.map(i => i.quantity).join(', ');

    sheet.addRow({
        orderId: order.orderId,
        date: order.createdAt,
        userId: order.userId || '',
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: order.deliveryAddress,
        products,
        quantities,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        discount: order.discountAmount || 0,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        orderStatus: order.status
    });

    await workbook.xlsx.writeFile(ordersFilePath);
}

function appendOrder(order) {
    // queue the order for writing
    queue.push(order);
    processQueue();
}

async function processQueue() {
    if (writing) return;
    writing = true;
    while (queue.length > 0) {
        const ord = queue.shift();
        try {
            await _appendRow(ord);
        } catch (err) {
            console.error('[excelService] failed to append order:', err.message);
        }
    }
    writing = false;
}

/**
 * Generate a fresh Excel file based on filter options and return its path.
 * If no range provided it simply returns the main file.
 *
 * @param {Object} options - { startDate, endDate }
 * @param {Array} orders - array of order objects to export
 * @returns {Promise<string>} path to generated file
 */
async function generateReport(orders = [], options = {}) {
    // if orders array provided, create temporary workbook
    if (!orders || orders.length === 0) {
        // nothing to do - return primary file if exists
        if (fs.existsSync(ordersFilePath)) return ordersFilePath;
        throw new AppError('No orders available to export', 404, 'DataError');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');
    sheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'User ID', key: 'userId', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 30 },
        { header: 'Customer Phone', key: 'customerPhone', width: 20 },
        { header: 'Shipping Address', key: 'address', width: 40 },
        { header: 'Products', key: 'products', width: 50 },
        { header: 'Quantities', key: 'quantities', width: 20 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'Delivery Charge', key: 'deliveryCharge', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Order Status', key: 'orderStatus', width: 20 }
    ];

    orders.forEach(order => {
        const products = order.items.map(i => i.name).join(', ');
        const quantities = order.items.map(i => i.quantity).join(', ');
        sheet.addRow({
            orderId: order.orderId,
            date: order.createdAt,
            userId: order.userId || '',
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            address: order.deliveryAddress,
            products,
            quantities,
            subtotal: order.subtotal,
            deliveryCharge: order.deliveryCharge,
            discount: order.discountAmount || 0,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            orderStatus: order.status
        });
    });

    const filename = `orders_${Date.now()}.xlsx`;
    const filePath = path.join(exportsDirPath, filename);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
}

module.exports = {
    appendOrder,
    generateReport
};
