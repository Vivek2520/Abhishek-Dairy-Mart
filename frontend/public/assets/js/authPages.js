import { userApi, orderApi } from './services/api.js';
import {
    applyLoginSession,
    ensureAuthenticated,
    logoutUser
} from './authHelpers.js';

function el(id) {
    return document.getElementById(id);
}

function query(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setMessage(targetId, message, type = 'info') {
    const target = el(targetId);
    if (!target) return;

    const toneClass =
        type === 'error' ? 'text-red-700 bg-red-50 border-red-200'
            : type === 'success' ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-blue-700 bg-blue-50 border-blue-200';

    target.className = `border rounded-lg px-3 py-2 text-sm ${toneClass}`;
    target.textContent = message;
    target.classList.remove('hidden');
}

function hideMessage(targetId) {
    const target = el(targetId);
    if (!target) return;
    target.classList.add('hidden');
    target.textContent = '';
}

function getPostLoginRedirect() {
    const returnTo = query('returnTo');
    if (!returnTo) return '/';
    try {
        const decoded = decodeURIComponent(returnTo);
        return decoded.startsWith('/') ? decoded : '/';
    } catch (_) {
        return '/';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const emailOrUsername = String(el('loginIdentifier')?.value || '').trim();
    const password = String(el('loginPassword')?.value || '');
    const rememberMe = !!el('rememberMe')?.checked;

    if (!emailOrUsername || !password) {
        setMessage('formMessage', 'Email/username and password are required.', 'error');
        return;
    }

    try {
        const result = await userApi.login({ emailOrUsername, password, rememberMe });
        applyLoginSession(result, rememberMe);
        setMessage('formMessage', 'Login successful. Redirecting...', 'success');
        window.setTimeout(() => {
            window.location.href = getPostLoginRedirect();
        }, 500);
    } catch (error) {
        setMessage('formMessage', error.message || 'Login failed', 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const name = String(el('signupName')?.value || '').trim();
    const email = String(el('signupEmail')?.value || '').trim().toLowerCase();
    const password = String(el('signupPassword')?.value || '');
    const confirmPassword = String(el('signupConfirmPassword')?.value || '');

    if (!name || !email || !password || !confirmPassword) {
        setMessage('formMessage', 'Please fill all required fields.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        setMessage('formMessage', 'Passwords do not match.', 'error');
        return;
    }

    try {
        await userApi.register({
            name,
            email,
            password,
            confirmPassword
        });

        setMessage('formMessage', 'Registration successful. OTP sent to your email.', 'success');
        window.setTimeout(() => {
            window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        }, 700);
    } catch (error) {
        setMessage('formMessage', error.message || 'Registration failed', 'error');
    }
}

async function handleVerifyOtp(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const email = String(el('verifyEmail')?.value || '').trim().toLowerCase();
    const otp = String(el('verifyOtp')?.value || '').trim();

    if (!email || !otp) {
        setMessage('formMessage', 'Email and OTP are required.', 'error');
        return;
    }

    try {
        await userApi.verifyEmailOtp({ email, otp });
        setMessage('formMessage', 'Email verified. Redirecting to login...', 'success');
        window.setTimeout(() => {
            window.location.href = '/login';
        }, 600);
    } catch (error) {
        setMessage('formMessage', error.message || 'OTP verification failed', 'error');
    }
}

async function handleResendOtp() {
    hideMessage('formMessage');
    const email = String(el('verifyEmail')?.value || '').trim().toLowerCase();

    if (!email) {
        setMessage('formMessage', 'Please enter your email first.', 'error');
        return;
    }

    try {
        const result = await userApi.requestEmailOtp(email);
        setMessage('formMessage', result.message || 'OTP sent.', 'success');
    } catch (error) {
        setMessage('formMessage', error.message || 'Failed to resend OTP', 'error');
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const email = String(el('forgotEmail')?.value || '').trim().toLowerCase();
    if (!email) {
        setMessage('formMessage', 'Email is required.', 'error');
        return;
    }

    try {
        const result = await userApi.forgotPassword(email);
        let message = result.message || 'If the account exists, a reset link has been sent.';
        if (result.resetToken) {
            message += ` Dev token: ${result.resetToken}`;
        }
        setMessage('formMessage', message, 'success');
    } catch (error) {
        setMessage('formMessage', error.message || 'Failed to request reset', 'error');
    }
}

async function handleResetPassword(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const resetToken = String(el('resetToken')?.value || '').trim();
    const newPassword = String(el('newPassword')?.value || '');
    const confirmPassword = String(el('confirmPassword')?.value || '');

    if (!resetToken || !newPassword || !confirmPassword) {
        setMessage('formMessage', 'All fields are required.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        setMessage('formMessage', 'Passwords do not match.', 'error');
        return;
    }

    try {
        await userApi.resetPassword({ resetToken, newPassword, confirmPassword });
        setMessage('formMessage', 'Password reset successful. Redirecting to login...', 'success');
        window.setTimeout(() => {
            window.location.href = '/login';
        }, 700);
    } catch (error) {
        setMessage('formMessage', error.message || 'Password reset failed', 'error');
    }
}

async function loadProfileDashboard() {
    const authenticated = await ensureAuthenticated({ redirectIfMissing: true });
    if (!authenticated) return;

    try {
        const profileResult = await userApi.getProfile();
        const user = profileResult.data || {};

        if (el('profileName')) el('profileName').textContent = user.name || '-';
        if (el('profileEmail')) el('profileEmail').textContent = user.email || '-';
        if (el('profileUsername')) el('profileUsername').textContent = user.username || '-';
        if (el('profilePhone')) el('profilePhone').textContent = user.phone || '-';
        if (el('profileVerified')) el('profileVerified').textContent = user.isEmailVerified ? 'Verified' : 'Not Verified';

        const ordersResult = await orderApi.getMy();
        const orders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
        const ordersList = el('profileOrders');

        if (ordersList) {
            ordersList.innerHTML = '';
            if (orders.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'text-gray-500';
                empty.textContent = 'No orders yet';
                ordersList.appendChild(empty);
            } else {
                orders.slice(0, 10).forEach((order) => {
                    const row = document.createElement('div');
                    row.className = 'border rounded-lg p-3';
                    row.innerHTML = `
                        <div class="font-semibold">${order.orderId}</div>
                        <div class="text-sm text-gray-600">Status: ${order.status}</div>
                        <div class="text-sm text-gray-600">Total: Rs.${order.totalAmount}</div>
                    `;
                    ordersList.appendChild(row);
                });
            }
        }
    } catch (error) {
        setMessage('formMessage', error.message || 'Failed to load profile', 'error');
    }
}

async function handleGoogleLoginResponse(credential) {
    hideMessage('formMessage');
    try {
        const result = await userApi.googleLogin({
            idToken: credential,
            rememberMe: true
        });
        applyLoginSession(result, true);
        setMessage('formMessage', 'Google login successful. Redirecting...', 'success');
        window.setTimeout(() => {
            window.location.href = getPostLoginRedirect();
        }, 500);
    } catch (error) {
        setMessage('formMessage', error.message || 'Google login failed', 'error');
    }
}

function initGoogleLogin() {
    const googleContainer = el('googleLoginButton');
    if (!googleContainer) return;
    userApi.authConfig().then((configResp) => {
        const clientId = configResp?.data?.googleClientId || '';
        if (!clientId) {
            googleContainer.classList.add('hidden');
            return;
        }

        const attemptRender = (attempt = 0) => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => handleGoogleLoginResponse(response.credential)
                });

                window.google.accounts.id.renderButton(googleContainer, {
                    theme: 'outline',
                    size: 'large',
                    width: 320
                });
                return;
            }

            if (attempt < 20) {
                window.setTimeout(() => attemptRender(attempt + 1), 150);
            } else {
                googleContainer.classList.add('hidden');
            }
        };

        attemptRender();
    }).catch(() => {
        googleContainer.classList.add('hidden');
    });
}

async function initLoginPage() {
    const authenticated = await ensureAuthenticated({ redirectIfMissing: false });
    if (authenticated) {
        window.location.href = '/';
        return;
    }

    el('loginForm')?.addEventListener('submit', handleLogin);
    initGoogleLogin();
}

async function initSignupPage() {
    const authenticated = await ensureAuthenticated({ redirectIfMissing: false });
    if (authenticated) {
        window.location.href = '/';
        return;
    }

    el('signupForm')?.addEventListener('submit', handleSignup);
}

async function initVerifyEmailPage() {
    const email = query('email');
    if (email && el('verifyEmail')) {
        el('verifyEmail').value = email;
    }

    el('verifyForm')?.addEventListener('submit', handleVerifyOtp);
    el('resendOtpBtn')?.addEventListener('click', handleResendOtp);
}

async function initForgotPasswordPage() {
    el('forgotForm')?.addEventListener('submit', handleForgotPassword);
}

async function initResetPasswordPage() {
    const token = query('token');
    if (token && el('resetToken')) {
        el('resetToken').value = token;
    }

    el('resetForm')?.addEventListener('submit', handleResetPassword);
}

async function initProfilePage() {
    el('logoutBtn')?.addEventListener('click', logoutUser);
    await loadProfileDashboard();
}

const pageInitializers = {
    login: initLoginPage,
    signup: initSignupPage,
    verify: initVerifyEmailPage,
    forgot: initForgotPasswordPage,
    reset: initResetPasswordPage,
    profile: initProfilePage
};

document.addEventListener('DOMContentLoaded', async () => {
    const page = document.body.getAttribute('data-page');
    if (!page || !pageInitializers[page]) return;
    await pageInitializers[page]();
});
