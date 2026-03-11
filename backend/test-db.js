// test-db.js
// Simple script to test MySQL connection via pool
// Run with: node test-db.js

const db = require('./src/config/db');

async function testConnection() {
    try {
        // Simple query to test connection
        const [rows] = await db.execute('SELECT 1 as test');
        console.log('✅ Connected - MySQL database is working!');
        console.log('Test result:', rows[0]);
    } catch (error) {
        console.log('❌ Failed - MySQL connection error:', error.message);
    } finally {
        // Close the pool to exit cleanly
        await db.end();
        process.exit(0);
    }
}

testConnection();