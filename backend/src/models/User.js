/**
 * User Model
 * Defines the MongoDB schema for user data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: () => uuidv4(),
            unique: true,
            required: true,
            index: true
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must not exceed 100 characters'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            index: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email'
            ]
        },
        username: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            match: [
                /^[a-zA-Z0-9._-]+$/,
                'Username can only contain letters, numbers, dot, underscore and hyphen'
            ]
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false // Don't include password by default
        },
        phone: {
            type: String,
            match: [
                /^[6-9]\d{9}$/,
                'Please provide a valid 10-digit Indian phone number'
            ]
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationToken: String,
        emailVerificationTokenExpiry: Date,
        passwordResetToken: String,
        passwordResetTokenExpiry: Date,
        lastLoginAt: Date,
        lastLoginIP: String,
        addresses: [
            {
                id: String,
                name: String,
                phone: String,
                street: String,
                city: String,
                state: String,
                pincode: String,
                isDefault: Boolean
            }
        ],
        wishlistItems: [
            {
                productId: String,
                addedAt: Date
            }
        ],
        preferences: {
            newsletter: {
                type: Boolean,
                default: false
            },
            notifications: {
                type: Boolean,
                default: true
            }
        },
        metadata: {
            source: String, // 'email', 'google', 'facebook'
            googleId: String,
            facebookId: String
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'blocked'],
            default: 'active'
        }
    },
    {
        timestamps: true,
        collection: 'users'
    }
);

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Compare passwords
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get user data without sensitive info
 */
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationTokenExpiry;
    delete obj.passwordResetToken;
    delete obj.passwordResetTokenExpiry;
    return obj;
};

/**
 * Indexes for performance
 */
userSchema.index({ email: 1, isEmailVerified: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'metadata.googleId': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
