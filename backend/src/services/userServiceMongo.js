/**
 * User Service (MongoDB Version)
 * Handles customer authentication and profile management using MongoDB
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');

const EMAIL_OTP_TTL_MINUTES = Number(process.env.EMAIL_OTP_TTL_MINUTES || 10);
const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Validate password policy
 */
const isValidPasswordPolicy = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8 || password.length > 72) return false;
    return /^(?=.*[A-Za-z])(?=.*\d).+$/.test(password);
};

/**
 * Normalize email
 */
const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return null;
    return email.trim().toLowerCase();
};

/**
 * Normalize phone number
 */
const normalizePhone = (phone) => {
    if (!phone || typeof phone !== 'string') return null;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 ? cleaned : null;
};

/**
 * Create a new user
 */
const createUser = async (userData) => {
    const { name, email, password, confirmPassword, username, phone } = userData;

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

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username: username?.toLowerCase() }]
    });

    if (existingUser) {
        if (existingUser.email === normalizedEmail) {
            throw new AppError('Email already registered', 400, 'ValidationError');
        }
        throw new AppError('Username already taken', 400, 'ValidationError');
    }

    try {
        const normalizedPhone = normalizePhone(phone);

        const user = new User({
            id: uuidv4(),
            name: name.trim(),
            email: normalizedEmail,
            username: username ? username.toLowerCase() : undefined,
            password,
            phone: normalizedPhone,
            isEmailVerified: false,
            status: 'active'
        });

        await user.save();

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            phone: user.phone,
            isEmailVerified: user.isEmailVerified
        };
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw new AppError(`${field} already exists`, 400, 'DuplicateError');
        }
        throw error;
    }
};

/**
 * Find user by email or username
 */
const findUserByEmailOrUsername = async (emailOrUsername) => {
    const normalized = normalizeEmail(emailOrUsername);

    const user = await User.findOne({
        $or: [
            { email: normalized },
            { username: emailOrUsername.toLowerCase() }
        ]
    }).select('+password');

    return user;
};

/**
 * Find user by ID
 */
const findUserById = async (userId, includePassword = false) => {
    const query = User.findOne({ id: userId });
    if (includePassword) query.select('+password');
    return query;
};

/**
 * Validate password
 */
const validatePassword = async (userId, candidatePassword) => {
    const user = await findUserById(userId, true);
    if (!user) return false;
    return user.comparePassword(candidatePassword);
};

/**
 * Generate email OTP
 */
const generateEmailOtp = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new AppError('User not found', 404, 'NotFoundError');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = otp;
    user.emailVerificationTokenExpiry = new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000);

    await user.save();

    return {
        otp,
        email: user.email,
        expiresIn: EMAIL_OTP_TTL_MINUTES
    };
};

/**
 * Verify email OTP
 */
const verifyEmailOtp = async (email, otp) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new AppError('User not found', 404, 'NotFoundError');
    }

    if (!user.emailVerificationToken || !user.emailVerificationTokenExpiry) {
        throw new AppError('No OTP found. Please request a new one.', 400, 'ValidationError');
    }

    if (Date.now() > user.emailVerificationTokenExpiry) {
        throw new AppError('OTP expired. Please request a new one.', 400, 'ValidationError');
    }

    if (user.emailVerificationToken !== otp) {
        throw new AppError('Invalid OTP', 400, 'ValidationError');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;

    await user.save();

    return {
        id: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified
    };
};

/**
 * Generate password reset token
 */
const generatePasswordResetToken = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        // For security, don't reveal if user exists
        return { message: 'If account exists, reset link has been sent', resetToken: null };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await user.save();

    return {
        resetToken,
        email: user.email,
        expiresIn: PASSWORD_RESET_TTL_MS / 1000
    };
};

/**
 * Reset password
 */
const resetPassword = async (resetToken, newPassword, confirmPassword) => {
    if (!resetToken || !newPassword || !confirmPassword) {
        throw new AppError('All fields are required', 400, 'ValidationError');
    }

    if (newPassword !== confirmPassword) {
        throw new AppError('Passwords do not match', 400, 'ValidationError');
    }

    if (!isValidPasswordPolicy(newPassword)) {
        throw new AppError('Password must be 8-72 chars and include letters and numbers', 400, 'ValidationError');
    }

    const user = await User.findOne({ passwordResetToken: resetToken });

    if (!user) {
        throw new AppError('Invalid or expired reset token', 400, 'ValidationError');
    }

    if (Date.now() > user.passwordResetTokenExpiry) {
        throw new AppError('Password reset token has expired', 400, 'ValidationError');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;

    await user.save();

    return {
        id: user.id,
        email: user.email,
        message: 'Password reset successful'
    };
};

/**
 * Update user last login
 */
const updateLastLogin = async (userId, ipAddress) => {
    await User.findOneAndUpdate(
        { id: userId },
        {
            lastLoginAt: new Date(),
            lastLoginIP: ipAddress,
            status: 'active'
        }
    );
};

/**
 * Get user profile
 */
const getUserProfile = async (userId) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError('User not found', 404, 'NotFoundError');
    }
    return user.toJSON();
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, updateData) => {
    const allowedFields = ['name', 'phone'];
    const updates = {};

    allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
            updates[field] = updateData[field];
        }
    });

    const user = await User.findOneAndUpdate(
        { id: userId },
        updates,
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('User not found', 404, 'NotFoundError');
    }

    return user.toJSON();
};

module.exports = {
    createUser,
    findUserByEmailOrUsername,
    findUserById,
    validatePassword,
    generateEmailOtp,
    verifyEmailOtp,
    generatePasswordResetToken,
    resetPassword,
    updateLastLogin,
    getUserProfile,
    updateUserProfile,
    normalizeEmail,
    normalizePhone,
    isValidPasswordPolicy
};
