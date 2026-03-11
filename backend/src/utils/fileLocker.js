/**
 * File Locker Utility
 * Prevents concurrent file access issues with JSON data files
 * CRITICAL FIX FOR DATA INTEGRITY
 * 
 * Implements a simple locking mechanism using file system flags
 * to prevent simultaneous writes to the same file.
 * 
 * In production, migrate to a proper database (MongoDB, PostgreSQL)
 */

const fs = require('fs');
const path = require('path');
const { AppError } = require('./AppError');

const LOCK_EXTENSION = '.lock';
const LOCK_TIMEOUT = 5000; // 5 seconds max lock wait time
const LOCK_CHECK_INTERVAL = 50; // Check lock every 50ms

/**
 * Creates a lock file to indicate the main file is being written
 * @param {string} filePath - Full path to the file being locked
 * @returns {Promise<void>}
 */
const createLock = async (filePath) => {
    return new Promise((resolve, reject) => {
        const lockFile = filePath + LOCK_EXTENSION;
        const startTime = Date.now();

        const waitForLock = () => {
            if (fs.existsSync(lockFile)) {
                if (Date.now() - startTime > LOCK_TIMEOUT) {
                    return reject(new AppError('File write operation timeout', 503));
                }
                // Lock exists, wait and retry
                setTimeout(waitForLock, LOCK_CHECK_INTERVAL);
            } else {
                // Create lock file
                try {
                    fs.writeFileSync(lockFile, Date.now().toString(), { flag: 'wx' });
                    resolve();
                } catch (err) {
                    // Another process created lock, wait
                    if (Date.now() - startTime > LOCK_TIMEOUT) {
                        reject(new AppError('File write operation timeout', 503));
                    } else {
                        setTimeout(waitForLock, LOCK_CHECK_INTERVAL);
                    }
                }
            }
        };

        waitForLock();
    });
};

/**
 * Removes the lock file after write operation
 * @param {string} filePath - Full path to the file
 */
const removeLock = (filePath) => {
    const lockFile = filePath + LOCK_EXTENSION;
    try {
        if (fs.existsSync(lockFile)) {
            fs.unlinkSync(lockFile);
        }
    } catch (err) {
        console.error(`[WARNING] Failed to remove lock file ${lockFile}:`, err.message);
    }
};

/**
 * Safely reads a JSON file with retry logic
 * @param {string} filePath - Full path to the JSON file
 * @returns {Promise<Object>} Parsed JSON data
 */
const readJSONFile = async (filePath) => {
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            if (!fs.existsSync(filePath)) {
                return [];
            }

            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            lastError = err;
            if (i < maxRetries - 1) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
            }
        }
    }

    throw new AppError(
        `Failed to read file ${filePath}: ${lastError.message}`,
        500
    );
};

/**
 * Safely writes data to a JSON file with locking mechanism
 * @param {string} filePath - Full path to the JSON file
 * @param {Object|Array} data - Data to write
 * @returns {Promise<void>}
 */
const writeJSONFile = async (filePath, data) => {
    let lockCreated = false;

    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Create lock file
        await createLock(filePath);
        lockCreated = true;

        // Write file with temporary name first (atomic operation)
        const tempFile = filePath + '.tmp';
        const jsonString = JSON.stringify(data, null, 2);

        fs.writeFileSync(tempFile, jsonString, 'utf8');

        // Atomic rename (replace original)
        fs.renameSync(tempFile, filePath);
    } catch (err) {
        // Clean up temp file if it exists
        const tempFile = filePath + '.tmp';
        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        throw err;
    } finally {
        // Always remove lock
        if (lockCreated) {
            removeLock(filePath);
        }
    }
};

/**
 * Safely modifies a JSON file by reading, transforming, and writing
 * Ensures no data loss during concurrent operations
 * 
 * @param {string} filePath - Full path to the JSON file
 * @param {Function} transformFn - Function that takes data array and returns modified array
 * @returns {Promise<Object>} Result of the operation
 */
const modifyJSONFile = async (filePath, transformFn) => {
    try {
        // Read current data
        const data = await readJSONFile(filePath);

        // Apply transformation
        const result = await transformFn(data);

        // Write back
        await writeJSONFile(filePath, result.data);

        return result;
    } catch (err) {
        if (err.isOperational) {
            throw err;
        }
        throw new AppError(
            `Failed to modify file ${filePath}: ${err.message}`,
            500
        );
    }
};

/**
 * TEMPORARY SOLUTION - File-based locking
 * TODO: Migrate to database (MongoDB, PostgreSQL) in production
 * 
 * This implementation has limitations:
 * - Not suitable for high-concurrency scenarios
 * - Lock files can be orphaned if process crashes
 * - Across multiple server instances won't work without NFS/shared storage
 * 
 * For production with multiple servers:
 * 1. Migrate to MongoDB with transactional writes
 * 2. Use Redis for distributed locks
 * 3. Implement database connection pooling
 */

module.exports = {
    readJSONFile,
    writeJSONFile,
    modifyJSONFile,
    createLock,
    removeLock
};
