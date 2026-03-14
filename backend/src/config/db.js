// config/db.js
// MySQL connection pool setup using mysql2/promise
// environment variables se credentials aayenge (.env file)

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// optional: pool error handler
pool.on('error', (err) => {
    console.error('MySQL pool error', err);
});

// Test database connection on startup (with 5s timeout)
async function testDatabaseConnection() {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Database connection timeout (5s)')), 5000)
  );

  try {
    await Promise.race([pool.query('SELECT 1'), timeoutPromise]);
    console.log('[DB] Database connection successful');
    return true;
  } catch (error) {
    console.error('[DB] Database connection failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('[DB] Production mode: Terminating server due to DB failure');
      process.exit(1);
    }
    throw error;
  }
}

// Quick health check for /api/health
async function checkDatabaseHealth() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = pool;
module.exports.testDatabaseConnection = testDatabaseConnection;
module.exports.checkDatabaseHealth = checkDatabaseHealth;
