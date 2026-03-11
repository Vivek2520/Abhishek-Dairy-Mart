// config/db.js
// MySQL connection pool setup using mysql2/promise
// environment variables se credentials aayenge (.env file)

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mywebsite_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// optional: pool error handler
pool.on('error', (err) => {
    console.error('MySQL pool error', err);
});

module.exports = pool;
