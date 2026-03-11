/**
 * User Service
 * Handles customer auth/profile persistence and security workflows.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');
const { AppError } = require('../utils/AppError');
const { addOrUpdateUser } = require('../utils/excelExporter');

const EMAIL_OTP_TTL_MINUTES = Number(process.env.EMAIL_OTP_TTL_MINUTES || 10);
const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000;

const getUsersFilePath = () => {
    const dataPath = path.join(config.paths.dataDir, 'data', 'users.json');
    const legacyPath = path.join(config.paths.dataDir, 'users.json');

    if (fs.existsSync(dataPath) && fs.existsSync(legacyPath)) {
        try {
            const dataUsers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const legacyUsers = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
            return (Array.isArray(dataUsers) && dataUsers.length >= (Array.isArray(legacyUsers) ? legacyUsers.length : 0))
                ? dataPath
                : legacyPath;
        } catch (_) {
            return dataPath;
        }
    }

    if (fs.existsSync(dataPath)) return dataPath;
    if (fs.existsSync(legacyPath)) return legacyPath;
    return dataPath;
};

const ensureUsersFile = () => {
    const filePath = getUsersFilePath();
    const dirName = path.dirname(filePath);

    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
    }

    return filePath;
};

const loadUsersRaw = () => {
    try {
        const filePath = ensureUsersFile();
        const data = fs.readFileSync(filePath, 'utf8');
        const users = JSON.parse(data);
        return Array.isArray(users) ? users : [];
    } catch (error) {
        console.error(`[ERROR] Failed to load users: ${error.message}`);
        throw new AppError('Failed to load users', 500, 'DataError');
    }
};

const saveUsersRaw = (users) => {
    try {
        const filePath = ensureUsersFile();
        fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
        console.log(`[INFO] Saved ${users.length} users to file`);
    } catch (error) {
        console.error(`[ERROR] Failed to save users: ${error.message}`);
        throw new AppError('Failed to save users', 500, 'DataError');
    }
};

const sanitizeUser = (user) => {
    if (!user) return null;

    const {
        password,
        resetToken,
        resetTokenExpires,
        emailVerificationOtpHash,
        emailVerificationOtpExpires,
        ...safe
    } = user;

    return safe;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeUsername = (username) => String(username || '').trim().toLowerCase();
const normalizePhone = (phone) => String(phone || '').trim();

const isValidPasswordPolicy = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8 || password.length > 72) return false;
    return /^(?=.*[A-Za-z])(?=.*\d).+$/.test(password);
};

const createOtpData = () => {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000).toISOString();
    return { otp, hash, expiresAt };
};

const generateResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
    return { token, hash, expiresAt };
};

const sendEmail = async ({ to, subject, text }) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('[WARNING] SMTP is not configured; skipping outbound email');
        return false;
    }

    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: Number(process.env.SMTP_PORT || 587) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text
        });
        return true;
    } catch (error) {
        console.warn(`[WARNING] Could not send email: ${error.message}`);
        return false;
    }
};

const sendVerificationOtpEmail = async (user, otp) => {
    if (!user.email) return false;

    const text = [
        `Hi ${user.name || 'Customer'},`,
        '',
        `Your Abhishek Dairy account verification OTP is: ${otp}`,
        `This OTP expires in ${EMAIL_OTP_TTL_MINUTES} minutes.`,
        '',
        'If you did not request this, please ignore this email.'
    ].join('\n');

    return sendEmail({
        to: user.email,
        subject: 'Verify Your Account OTP',
        text
    });
};

const sendResetPasswordEmail = async (user, resetToken) => {
    if (!user.email) return false;
    const appUrl = process.env.APP_URL || `http://localhost:${config.server.port}`;
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    const text = [
        `Hi ${user.name || 'Customer'},`,
        '',
        'You requested a password reset.',
        `Reset link: ${resetUrl}`,
        '',
        'The link expires in 24 hours. If you did not request this, ignore this email.'
    ].join('\n');

    return sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        text
    });
};

const getUniqueUsername = (users, requestedUsername, email) => {
    const base =
        normalizeUsername(requestedUsername)
        || normalizeEmail(email).split('@')[0]
        || `user${Date.now()}`;

    let candidate = base.replace(/[^a-z0-9._-]/g, '').slice(0, 30) || `user${Date.now()}`;
    let suffix = 1;

    while (users.some((u) => normalizeUsername(u.username) === candidate)) {
        const next = `${base}${suffix}`.replace(/[^a-z0-9._-]/g, '').slice(0, 30);
        candidate = next || `user${Date.now()}${suffix}`;
        suffix += 1;
    }

    return candidate;
};

const loadUsers = () => loadUsersRaw().map(sanitizeUser);
const saveUsers = (users) => saveUsersRaw(users);

const findUserById = (id) => {
    const users = loadUsersRaw();
    return users.find((u) => u.id === id) || null;
};

const findUserByEmail = (email) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const users = loadUsersRaw();
    return users.find((u) => normalizeEmail(u.email) === normalized) || null;
};

const findUserByUsername = (username) => {
    const normalized = normalizeUsername(username);
    if (!normalized) return null;
    const users = loadUsersRaw();
    return users.find((u) => normalizeUsername(u.username) === normalized) || null;
};

const findUserByEmailOrUsername = (identifier) => {
    const normalized = String(identifier || '').trim();
    if (!normalized) return null;

    const users = loadUsersRaw();
    const lower = normalized.toLowerCase();

    return users.find((u) =>
        normalizeEmail(u.email) === lower || normalizeUsername(u.username) === lower
    ) || null;
};

const findUserByPhone = (phone) => {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    const users = loadUsersRaw();
    return users.find((u) => normalizePhone(u.phone) === normalized) || null;
};

const createUser = async (userData) => {
    const {
        name,
        email,
        password,
        confirmPassword,
        username,
        phone
    } = userData;

    if (!name || !name.trim()) {
        throw new AppError('Name is required', 400, 'ValidationError');
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        throw new AppError('Email is required', 400, 'ValidationError');
    }

    if (!isValidPasswordPolicy(password)) {
        throw new AppError('Password must be 8-72 chars and include letters and numbers', 400, 'ValidationError');
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
        throw new AppError('Passwords do not match', 400, 'ValidationError');
    }

    const users = loadUsersRaw();

    if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
        throw new AppError('Email already registered', 400, 'ValidationError');
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && users.some((u) => normalizePhone(u.phone) === normalizedPhone)) {
        throw new AppError('Phone number already registered', 400, 'ValidationError');
    }

    const finalUsername = getUniqueUsername(users, username, normalizedEmail);
    const passwordHash = await bcrypt.hash(password, 12);
    const otpData = createOtpData();

    const newUser = {
        id: uuidv4(),
        name: name.trim(),
        username: finalUsername,
        email: normalizedEmail,
        phone: normalizedPhone || null,
        password: passwordHash,
        authProvider: 'local',
        googleId: null,
        isEmailVerified: false,
        emailVerificationOtpHash: otpData.hash,
        emailVerificationOtpExpires: otpData.expiresAt,
        addresses: [],
        wishlist: [],
        orders: [],
        resetToken: null,
        resetTokenExpires: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null
    };

    users.push(newUser);
    saveUsersRaw(users);

    sendVerificationOtpEmail(newUser, otpData.otp).catch((err) => {
        console.warn(`[WARNING] OTP email delivery failed: ${err.message}`);
    });

    addOrUpdateUser(newUser).catch((err) => {
        console.error(`[ERROR] Failed to write new user to Excel: ${err.message}`);
    });

    return sanitizeUser(newUser);
};

const validatePassword = async (userId, password) => {
    const user = findUserById(userId);
    if (!user || !user.password) return false;
    return bcrypt.compare(password, user.password);
};

const updateUser = (userId, updateData) => {
    const users = loadUsersRaw();
    const idx = users.findIndex((u) => u.id === userId);

    if (idx === -1) {
        throw new AppError('User not found', 404, 'NotFoundError');
    }

    const current = users[idx];
    const updates = {};
    let verificationOtpToSend = null;

    if (updateData.name !== undefined) {
        updates.name = String(updateData.name || '').trim();
    }

    if (updateData.username !== undefined) {
        const nextUsername = normalizeUsername(updateData.username);
        if (!nextUsername) {
            throw new AppError('Username cannot be empty', 400, 'ValidationError');
        }
        const exists = users.some((u) => u.id !== userId && normalizeUsername(u.username) === nextUsername);
        if (exists) {
            throw new AppError('Username already in use', 400, 'ValidationError');
        }
        updates.username = nextUsername;
    }

    if (updateData.email !== undefined) {
        const nextEmail = normalizeEmail(updateData.email);
        if (!nextEmail) {
            throw new AppError('Email cannot be empty', 400, 'ValidationError');
        }
        const exists = users.some((u) => u.id !== userId && normalizeEmail(u.email) === nextEmail);
        if (exists) {
            throw new AppError('Email already in use', 400, 'ValidationError');
        }

        if (nextEmail !== normalizeEmail(current.email)) {
            const otpData = createOtpData();
            updates.emailVerificationOtpHash = otpData.hash;
            updates.emailVerificationOtpExpires = otpData.expiresAt;
            updates.isEmailVerified = false;
            verificationOtpToSend = otpData.otp;
        }

        updates.email = nextEmail;
    }

    if (updateData.addresses !== undefined) updates.addresses = updateData.addresses;
    if (updateData.wishlist !== undefined) updates.wishlist = updateData.wishlist;
    if (updateData.phone !== undefined) updates.phone = normalizePhone(updateData.phone) || null;

    updates.updatedAt = new Date().toISOString();

    users[idx] = { ...current, ...updates };
    saveUsersRaw(users);

    addOrUpdateUser(users[idx]).catch((err) => {
        console.error(`[ERROR] Failed to update user in Excel: ${err.message}`);
    });

    if (verificationOtpToSend) {
        sendVerificationOtpEmail(users[idx], verificationOtpToSend).catch((err) => {
            console.warn(`[WARNING] Email verification OTP send failed: ${err.message}`);
        });
    }

    return sanitizeUser(users[idx]);
};

const updatePassword = async (userId, newPassword) => {
    if (!isValidPasswordPolicy(newPassword)) {
        throw new AppError('Password must be 8-72 chars and include letters and numbers', 400, 'ValidationError');
    }

    const users = loadUsersRaw();
    const idx = users.findIndex((u) => u.id === userId);

    if (idx === -1) {
        throw new AppError('User not found', 404, 'NotFoundError');
    }

    users[idx].password = await bcrypt.hash(newPassword, 12);
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);
};

const addOrderToUser = (userId, summary) => {
    const users = loadUsersRaw();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return;

    users[idx].orders = users[idx].orders || [];
    users[idx].orders.push(summary);
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);
};

const addAddress = (userId, address) => {
    const user = findUserById(userId);
    if (!user) throw new AppError('User not found', 404, 'NotFoundError');

    const addresses = Array.isArray(user.addresses) ? user.addresses : [];
    addresses.push({
        id: uuidv4(),
        ...address,
        createdAt: new Date().toISOString()
    });

    return updateUser(userId, { addresses });
};

const removeAddress = (userId, addressId) => {
    const user = findUserById(userId);
    if (!user) throw new AppError('User not found', 404, 'NotFoundError');

    const addresses = (user.addresses || []).filter((a) => a.id !== addressId);
    return updateUser(userId, { addresses });
};

const addToWishlist = (userId, productId) => {
    const user = findUserById(userId);
    if (!user) throw new AppError('User not found', 404, 'NotFoundError');

    const wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];
    if (!wishlist.includes(productId)) wishlist.push(productId);
    return updateUser(userId, { wishlist });
};

const removeFromWishlist = (userId, productId) => {
    const user = findUserById(userId);
    if (!user) throw new AppError('User not found', 404, 'NotFoundError');

    const wishlist = (user.wishlist || []).filter((id) => id !== productId);
    return updateUser(userId, { wishlist });
};

const requestPasswordReset = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const users = loadUsersRaw();
    const idx = users.findIndex((u) => normalizeEmail(u.email) === normalizedEmail);

    if (idx === -1) {
        return {
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.'
        };
    }

    const resetData = generateResetToken();
    users[idx].resetToken = resetData.hash;
    users[idx].resetTokenExpires = resetData.expiresAt;
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);

    sendResetPasswordEmail(users[idx], resetData.token).catch((err) => {
        console.warn(`[WARNING] Password reset email failed: ${err.message}`);
    });

    return {
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
        resetToken: resetData.token
    };
};

const resetPassword = async (resetToken, newPassword) => {
    if (!isValidPasswordPolicy(newPassword)) {
        throw new AppError('Password must be 8-72 chars and include letters and numbers', 400, 'ValidationError');
    }

    const tokenHash = crypto.createHash('sha256').update(String(resetToken)).digest('hex');
    const users = loadUsersRaw();

    const idx = users.findIndex((u) =>
        u.resetToken === tokenHash
        && u.resetTokenExpires
        && new Date(u.resetTokenExpires).getTime() > Date.now()
    );

    if (idx === -1) {
        throw new AppError('Invalid or expired reset token', 400, 'ValidationError');
    }

    users[idx].password = await bcrypt.hash(newPassword, 12);
    users[idx].resetToken = null;
    users[idx].resetTokenExpires = null;
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);

    addOrUpdateUser(users[idx]).catch(() => {});
    return { success: true, message: 'Password has been reset successfully' };
};

const requestEmailVerificationOtp = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const users = loadUsersRaw();
    const idx = users.findIndex((u) => normalizeEmail(u.email) === normalizedEmail);

    if (idx === -1) {
        return {
            success: true,
            message: 'If an account exists, an OTP has been sent to the email.'
        };
    }

    const otpData = createOtpData();
    users[idx].emailVerificationOtpHash = otpData.hash;
    users[idx].emailVerificationOtpExpires = otpData.expiresAt;
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);

    sendVerificationOtpEmail(users[idx], otpData.otp).catch((err) => {
        console.warn(`[WARNING] Email OTP delivery failed: ${err.message}`);
    });

    return {
        success: true,
        message: 'If an account exists, an OTP has been sent to the email.'
    };
};

const verifyEmailOtp = async (email, otp) => {
    const normalizedEmail = normalizeEmail(email);
    const otpValue = String(otp || '').trim();

    if (!otpValue) {
        throw new AppError('OTP is required', 400, 'ValidationError');
    }

    const users = loadUsersRaw();
    const idx = users.findIndex((u) => normalizeEmail(u.email) === normalizedEmail);

    if (idx === -1) {
        throw new AppError('Invalid email or OTP', 400, 'ValidationError');
    }

    const user = users[idx];

    if (user.isEmailVerified) {
        return { success: true, message: 'Email already verified', data: sanitizeUser(user) };
    }

    if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpires) {
        throw new AppError('OTP not requested or expired', 400, 'ValidationError');
    }

    if (new Date(user.emailVerificationOtpExpires).getTime() < Date.now()) {
        throw new AppError('OTP expired. Please request a new OTP.', 400, 'ValidationError');
    }

    const incomingHash = crypto.createHash('sha256').update(otpValue).digest('hex');
    const a = Buffer.from(user.emailVerificationOtpHash);
    const b = Buffer.from(incomingHash);
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!match) {
        throw new AppError('Invalid OTP', 400, 'ValidationError');
    }

    users[idx].isEmailVerified = true;
    users[idx].emailVerificationOtpHash = null;
    users[idx].emailVerificationOtpExpires = null;
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);

    return {
        success: true,
        message: 'Email verified successfully',
        data: sanitizeUser(users[idx])
    };
};

const verifyGoogleIdToken = async (idToken) => {
    const token = String(idToken || '').trim();
    if (!token) throw new AppError('Google ID token is required', 400, 'ValidationError');

    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
    const response = await fetch(verifyUrl);

    if (!response.ok) {
        throw new AppError('Invalid Google token', 401, 'AuthError');
    }

    const payload = await response.json();
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

    if (!payload.email || !emailVerified) {
        throw new AppError('Google account email is not verified', 401, 'AuthError');
    }

    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && payload.aud !== configuredClientId) {
        throw new AppError('Google token audience mismatch', 401, 'AuthError');
    }

    return {
        googleId: payload.sub,
        email: normalizeEmail(payload.email),
        name: payload.name || payload.given_name || 'Google User'
    };
};

const loginWithGoogleIdToken = async (idToken) => {
    const googleData = await verifyGoogleIdToken(idToken);
    const users = loadUsersRaw();

    let user = users.find((u) =>
        u.googleId === googleData.googleId || normalizeEmail(u.email) === googleData.email
    );

    if (!user) {
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 12);

        user = {
            id: uuidv4(),
            name: googleData.name,
            username: getUniqueUsername(users, null, googleData.email),
            email: googleData.email,
            phone: null,
            password: passwordHash,
            authProvider: 'google',
            googleId: googleData.googleId,
            isEmailVerified: true,
            emailVerificationOtpHash: null,
            emailVerificationOtpExpires: null,
            addresses: [],
            wishlist: [],
            orders: [],
            resetToken: null,
            resetTokenExpires: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };

        users.push(user);
    } else {
        user.googleId = googleData.googleId;
        user.authProvider = 'google';
        user.isEmailVerified = true;
        user.name = user.name || googleData.name;
        user.lastLoginAt = new Date().toISOString();
        user.updatedAt = new Date().toISOString();
    }

    saveUsersRaw(users);

    addOrUpdateUser(user).catch((err) => {
        console.error(`[ERROR] Failed to update Google user in Excel: ${err.message}`);
    });

    return sanitizeUser(user);
};

const markLastLogin = (userId) => {
    const users = loadUsersRaw();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return;
    users[idx].lastLoginAt = new Date().toISOString();
    users[idx].updatedAt = new Date().toISOString();
    saveUsersRaw(users);
};

module.exports = {
    loadUsers,
    saveUsers,
    findUserById,
    findUserByEmail,
    findUserByUsername,
    findUserByEmailOrUsername,
    findUserByPhone,
    createUser,
    validatePassword,
    updateUser,
    updatePassword,
    addOrderToUser,
    addAddress,
    removeAddress,
    addToWishlist,
    removeFromWishlist,
    getUsersFilePath,
    requestPasswordReset,
    resetPassword,
    requestEmailVerificationOtp,
    verifyEmailOtp,
    loginWithGoogleIdToken,
    markLastLogin,
    sanitizeUser
};
