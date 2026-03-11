/**
 * MongoDB Connection Configuration
 * Handles connection to MongoDB database
 */

const mongoose = require('mongoose');
const { config } = require('./index');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/abhishek-dairy';

let connection = null;

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
    if (connection) {
        console.log('[DB] Using existing MongoDB connection');
        return connection;
    }

    try {
        console.log('[DB] Connecting to MongoDB...');
        console.log(`[DB] URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

        connection = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority'
        });

        console.log('[DB] MongoDB connected successfully');
        console.log(`[DB] Database: ${connection.connection.name}`);
        console.log(`[DB] Host: ${connection.connection.host}`);

        return connection;
    } catch (error) {
        console.error('[DB] MongoDB connection error:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('ECONNREFUSED')) {
            console.error('[DB] ERROR: MongoDB server is not running');
            console.error('[DB] Start MongoDB with: mongod');
        } else if (error.message.includes('authentication failed')) {
            console.error('[DB] ERROR: MongoDB authentication failed');
            console.error('[DB] Check MONGODB_URI in .env file');
        }
        
        throw error;
    }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
    if (connection) {
        try {
            await mongoose.disconnect();
            connection = null;
            console.log('[DB] MongoDB disconnected');
        } catch (error) {
            console.error('[DB] Error disconnecting MongoDB:', error.message);
        }
    }
};

/**
 * Check if MongoDB is connected
 */
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

module.exports = {
    connectDB,
    disconnectDB,
    isConnected,
    mongoose
};
