/**
 * User Controller
 * Customer authentication and profile APIs.
 */

const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { config } = require('../config');
const { AppError } = require('../utils/AppError');

const buildSessionMeta = (rememberMe) => {
    const maxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return {
        rememberMe: !!rememberMe,
        maxAgeMs,
        expiresAt: new Date(Date.now() + maxAgeMs).toISOString(),
        jwtExpiresIn: rememberMe ? '30d' : '24h'
    };
};

const issueAuthResponse = (res, user, rememberMe = false, message = 'Login successful') => {
    const session = buildSessionMeta(rememberMe);
    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            username: user.username,
            type: 'customer'
        },
        config.jwt.secret,
        { expiresIn: session.jwtExpiresIn }
    );

    return res.status(200)
        .cookie('token', token, {
            httpOnly: true,
            secure: config.server.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: session.maxAgeMs
        })
        .json({
            success: true,
            message,
            token,
            session: {
                rememberMe: session.rememberMe,
                expiresAt: session.expiresAt
            },
            data: user
        });
};

const register = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, username, phone } = req.body;
        console.log(`[REQUEST] POST /api/users/register - Email: ${email}`);

        const user = await userService.createUser({
            name,
            email,
            password,
            confirmPassword,
            username,
            phone
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email using OTP.',
            requiresEmailVerification: true,
            data: user
        });
    } catch (error) {
        console.error(`[ERROR] register: ${error.message}`);
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { emailOrUsername, password, rememberMe } = req.body;
        console.log(`[REQUEST] POST /api/users/login - Identifier: ${emailOrUsername}`);

        if (!emailOrUsername || !String(emailOrUsername).trim()) {
            throw new AppError('Email or username is required', 400, 'ValidationError');
        }

        if (!password || !String(password).trim()) {
            throw new AppError('Password is required', 400, 'ValidationError');
        }

        const user = userService.findUserByEmailOrUsername(emailOrUsername);
        if (!user) {
            throw new AppError('Invalid credentials', 401, 'AuthError');
        }

        const isValidPassword = await userService.validatePassword(user.id, password);
        if (!isValidPassword) {
            throw new AppError('Invalid credentials', 401, 'AuthError');
        }

        if (user.isEmailVerified === false) {
            throw new AppError('Email not verified. Please verify OTP first.', 403, 'AuthError');
        }

        userService.markLastLogin(user.id);
        const safeUser = userService.sanitizeUser(userService.findUserById(user.id));
        return issueAuthResponse(res, safeUser, !!rememberMe);
    } catch (error) {
        console.error(`[ERROR] login: ${error.message}`);
        next(error);
    }
};

const getAuthConfig = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                googleClientId: process.env.GOOGLE_CLIENT_ID || ''
            }
        });
    } catch (error) {
        next(error);
    }
};

const googleLogin = async (req, res, next) => {
    try {
        const { idToken, rememberMe } = req.body;
        console.log('[REQUEST] POST /api/users/google-login');

        if (!idToken) {
            throw new AppError('Google token is required', 400, 'ValidationError');
        }

        const user = await userService.loginWithGoogleIdToken(idToken);
        return issueAuthResponse(res, user, !!rememberMe, 'Google login successful');
    } catch (error) {
        console.error(`[ERROR] googleLogin: ${error.message}`);
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        console.log('[REQUEST] POST /api/users/logout');

        res.status(200)
            .clearCookie('token')
            .json({
                success: true,
                message: 'Logout successful'
            });
    } catch (error) {
        console.error(`[ERROR] logout: ${error.message}`);
        next(error);
    }
};

const validateToken = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = userService.findUserById(userId);

        if (!user) {
            throw new AppError('User not found', 404, 'NotFoundError');
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: userService.sanitizeUser(user),
            session: {
                expiresAt: req.user?.exp ? new Date(req.user.exp * 1000).toISOString() : null
            }
        });
    } catch (error) {
        console.error(`[ERROR] validateToken: ${error.message}`);
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        console.log(`[REQUEST] GET /api/users/profile - User: ${userId}`);

        const user = userService.findUserById(userId);
        if (!user) {
            throw new AppError('User not found', 404, 'NotFoundError');
        }

        res.status(200).json({
            success: true,
            data: userService.sanitizeUser(user)
        });
    } catch (error) {
        console.error(`[ERROR] getProfile: ${error.message}`);
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { name, email, username, phone } = req.body;
        console.log(`[REQUEST] PUT /api/users/profile - User: ${userId}`);

        const updatedUser = userService.updateUser(userId, { name, email, username, phone });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error(`[ERROR] updateProfile: ${error.message}`);
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        console.log(`[REQUEST] PUT /api/users/password - User: ${userId}`);

        if (!currentPassword || !newPassword) {
            throw new AppError('Current and new password are required', 400, 'ValidationError');
        }

        const isValid = await userService.validatePassword(userId, currentPassword);
        if (!isValid) {
            throw new AppError('Current password is incorrect', 401, 'AuthError');
        }

        await userService.updatePassword(userId, newPassword);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error(`[ERROR] changePassword: ${error.message}`);
        next(error);
    }
};

const getAddresses = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = userService.findUserById(userId);

        if (!user) {
            throw new AppError('User not found', 404, 'NotFoundError');
        }

        const addresses = user.addresses || [];
        res.status(200).json({
            success: true,
            count: addresses.length,
            data: addresses
        });
    } catch (error) {
        console.error(`[ERROR] getAddresses: ${error.message}`);
        next(error);
    }
};

const addAddress = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { label, street, city, state, pincode, landmark, isDefault } = req.body;

        if (!street || !city || !pincode) {
            throw new AppError('Street, city and pincode are required', 400, 'ValidationError');
        }

        const address = {
            label: label || 'Home',
            street: String(street).trim(),
            city: String(city).trim(),
            state: state ? String(state).trim() : 'Madhya Pradesh',
            pincode: String(pincode).trim(),
            landmark: landmark ? String(landmark).trim() : null,
            isDefault: !!isDefault
        };

        const updatedUser = userService.addAddress(userId, address);
        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: updatedUser.addresses
        });
    } catch (error) {
        console.error(`[ERROR] addAddress: ${error.message}`);
        next(error);
    }
};

const removeAddress = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { addressId } = req.params;
        const updatedUser = userService.removeAddress(userId, addressId);

        res.status(200).json({
            success: true,
            message: 'Address removed successfully',
            data: updatedUser.addresses
        });
    } catch (error) {
        console.error(`[ERROR] removeAddress: ${error.message}`);
        next(error);
    }
};

const getWishlist = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = userService.findUserById(userId);

        if (!user) {
            throw new AppError('User not found', 404, 'NotFoundError');
        }

        const wishlist = user.wishlist || [];
        res.status(200).json({
            success: true,
            count: wishlist.length,
            data: wishlist
        });
    } catch (error) {
        console.error(`[ERROR] getWishlist: ${error.message}`);
        next(error);
    }
};

const addToWishlist = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId } = req.body;

        if (!productId) {
            throw new AppError('Product ID is required', 400, 'ValidationError');
        }

        const updatedUser = userService.addToWishlist(userId, productId);
        res.status(201).json({
            success: true,
            message: 'Added to wishlist',
            data: updatedUser.wishlist
        });
    } catch (error) {
        console.error(`[ERROR] addToWishlist: ${error.message}`);
        next(error);
    }
};

const removeFromWishlist = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId } = req.params;
        const updatedUser = userService.removeFromWishlist(userId, productId);

        res.status(200).json({
            success: true,
            message: 'Removed from wishlist',
            data: updatedUser.wishlist
        });
    } catch (error) {
        console.error(`[ERROR] removeFromWishlist: ${error.message}`);
        next(error);
    }
};

const requestEmailOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new AppError('Email is required', 400, 'ValidationError');
        }

        const result = await userService.requestEmailVerificationOtp(email);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error(`[ERROR] requestEmailOtp: ${error.message}`);
        next(error);
    }
};

const verifyEmailOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            throw new AppError('Email and OTP are required', 400, 'ValidationError');
        }

        const result = await userService.verifyEmailOtp(email, otp);
        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error(`[ERROR] verifyEmailOtp: ${error.message}`);
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new AppError('Email is required', 400, 'ValidationError');
        }

        const result = await userService.requestPasswordReset(email);
        res.status(200).json({
            success: true,
            message: result.message,
            resetToken: config.server.nodeEnv === 'development' ? result.resetToken : undefined
        });
    } catch (error) {
        console.error(`[ERROR] forgotPassword: ${error.message}`);
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;

        if (!resetToken || !newPassword || !confirmPassword) {
            throw new AppError('Token and passwords are required', 400, 'ValidationError');
        }

        if (newPassword !== confirmPassword) {
            throw new AppError('Passwords do not match', 400, 'ValidationError');
        }

        const result = await userService.resetPassword(resetToken, newPassword);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error(`[ERROR] resetPassword: ${error.message}`);
        next(error);
    }
};

module.exports = {
    register,
    login,
    getAuthConfig,
    googleLogin,
    logout,
    validateToken,
    getProfile,
    updateProfile,
    changePassword,
    getAddresses,
    addAddress,
    removeAddress,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    requestEmailOtp,
    verifyEmailOtp,
    forgotPassword,
    resetPassword
};
