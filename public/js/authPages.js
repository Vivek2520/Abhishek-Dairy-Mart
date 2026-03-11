/**
 * Auth Pages Handler
 * Handles login, signup, profile pages
 * 
 * @module authPages
 */

import { authApi } from './services/api.js';
import { 
    applyLoginSession, 
    ensureAuthenticated, 
    logoutUser, 
    getCurrentUser,
    getReturnUrl 
} from './authHelpers.js';

// DOM Elements
function el(id) {
    return document.getElementById(id);
}

function query(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// ============================================
// UI HELPERS
// ============================================

function showMessage(targetId, message, type = 'info') {
    const target = el(targetId);
    if (!target) return;

    const toneClass = type === 'error' 
        ? 'text-red-700 bg-red-50 border-red-200' 
        : type === 'success' 
            ? 'text-green-700 bg-green-50 border-green-200' 
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

// ============================================
// FORM HANDLERS
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const email = String(el('loginEmail')?.value || el('loginIdentifier')?.value || '').trim();
    const password = String(el('loginPassword')?.value || '').trim();
    const rememberMe = !!el('rememberMe')?.checked;

    if (!email || !password) {
        showMessage('formMessage', 'Email and password are required.', 'error');
        return;
    }

    try {
        const result = await authApi.login({ email, password, rememberMe });
        
        if (result.success) {
            applyLoginSession(result, rememberMe);
            showMessage('formMessage', 'Login successful! Redirecting...', 'success');
            window.setTimeout(() => {
                window.location.href = getPostLoginRedirect();
            }, 500);
        } else {
            showMessage('formMessage', result.message || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('formMessage', error.message || 'Login failed', 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    hideMessage('formMessage');

    const name = String(el('signupName')?.value || '').trim();
    const email = String(el('signupEmail')?.value || '').trim().toLowerCase();
    const phone = String(el('signupPhone')?.value || '').trim();
    const password = String(el('signupPassword')?.value || '');
    const confirmPassword = String(el('signupConfirmPassword')?.value || '');

    if (!name || !email || !password || !confirmPassword) {
        showMessage('formMessage', 'Please fill all required fields.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('formMessage', 'Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('formMessage', 'Password must be at least 6 characters.', 'error');
        return;
    }

    try {
        const result = await authApi.register({
            name,
            email,
            phone,
            password
        });

        if (result.success) {
            showMessage('formMessage', 'Registration successful! Redirecting to login...', 'success');
            window.setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            showMessage('formMessage', result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('formMessage', error.message || 'Registration failed', 'error');
    }
}

async function loadProfileDashboard() {
    const authenticated = await ensureAuthenticated({ redirectIfMissing: true });
    if (!authenticated) return;

    try {
        const result = await authApi.getProfile();
        
        if (result.success) {
            const user = result.data;

            if (el('profileName')) el('profileName').textContent = user.name || '-';
            if (el('profileEmail')) el('profileEmail').textContent = user.email || '-';
            if (el('profilePhone')) el('profilePhone').textContent = user.phone || 'Not set';
            if (el('profileVerified')) el('profileVerified').textContent = user.is_email_verified ? 'Verified' : 'Not Verified';
            if (el('profileJoined')) el('profileJoined').textContent = new Date(user.created_at).toLocaleDateString();
        }

        // Load orders
        try {
            const ordersResult = await fetch('/api/orders/my/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`
                }
            });
            
            if (ordersResult.ok) {
                const ordersData = await ordersResult.json();
                const orders = ordersData.data || [];
                const ordersList = el('profileOrders');

                if (ordersList) {
                    ordersList.innerHTML = '';
                    if (orders.length === 0) {
                        ordersList.innerHTML = '<p class="text-gray-500">No orders yet</p>';
                    } else {
                        orders.slice(0, 5).forEach((order) => {
                            const row = document.createElement('div');
                            row.className = 'border rounded-lg p-3';
                            row.innerHTML = `
                                <div class="flex justify-between items-center">
                                    <span class="font-medium">${order.order_id}</span>
                                    <span class="badge ${order.order_status === 'delivered' ? 'badge-success' : 'badge-warning'}">${order.order_status}</span>
                                </div>
                                <div class="text-sm text-gray-600 mt-1">
                                    ₹${order.total_amount} • ${new Date(order.created_at).toLocaleDateString()}
                                </div>
                            `;
                            ordersList.appendChild(row);
                        });
                    }
                }
            }
        } catch (orderError) {
            console.log('Could not load orders:', orderError);
        }

    } catch (error) {
        showMessage('formMessage', error.message || 'Failed to load profile', 'error');
    }
}

// ============================================
// PAGE INITIALIZERS
// ============================================

async function initLoginPage() {
    const authenticated = await ensureAuthenticated({ redirectIfMissing: false });
    if (authenticated) {
        window.location.href = getPostLoginRedirect();
        return;
    }

    el('loginForm')?.addEventListener('submit', handleLogin);
}

async function initSignupPage() {
    const authenticated = await ensureAuthenticated({ redirectIfMissing: false });
    if (authenticated) {
        window.location.href = '/';
        return;
    }

    el('signupForm')?.addEventListener('submit', handleSignup);
}

async function initProfilePage() {
    el('logoutBtn')?.addEventListener('click', logoutUser);
    await loadProfileDashboard();
}

// ============================================
// INIT
// ============================================

const pageInitializers = {
    login: initLoginPage,
    signup: initSignupPage,
    profile: initProfilePage
};

document.addEventListener('DOMContentLoaded', async () => {
    const page = document.body.getAttribute('data-page');
    if (!page || !pageInitializers[page]) return;
    
    console.log('[Auth] Initializing page:', page);
    await pageInitializers[page]();
});

// Also handle scripts loaded via regular script tag
if (typeof window !== 'undefined') {
    window.initLoginPage = initLoginPage;
    window.initSignupPage = initSignupPage;
    window.initProfilePage = initProfilePage;
    window.handleLogin = handleLogin;
    window.handleSignup = handleSignup;
}

