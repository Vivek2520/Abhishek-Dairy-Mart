import { api, userApi, orderApi } from './services/api.js';
import {
    clearAuthSession,
    getAuthSession,
    isAuthenticatedSession,
    saveAuthSession,
    withAutoLogout
} from './services/authSession.js';

const AUTH_PAGES = new Set([
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email'
]);

let logoutTimer = null;

function getPathname() {
    return (window.location.pathname || '/').toLowerCase();
}

function redirectToLogin() {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const encoded = encodeURIComponent(returnTo || '/');
    window.location.href = `/login?returnTo=${encoded}`;
}

function scheduleAutoLogout() {
    if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
    }

    logoutTimer = withAutoLogout(async () => {
        try { await api.post('/users/logout', {}); } catch (_) {}
        if (!AUTH_PAGES.has(getPathname())) {
            redirectToLogin();
        }
    });
}

export function isLoggedIn() {
    return isAuthenticatedSession();
}

export function setAuthToken(token) {
    if (!token) {
        clearAuthSession();
        return;
    }

    const current = getAuthSession() || {};
    saveAuthSession({
        token,
        expiresAt: current.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: current.user || null,
        rememberMe: !!current.rememberMe
    });
    scheduleAutoLogout();
}

export function applyLoginSession(authResponse, rememberMeOverride) {
    const rememberMe = rememberMeOverride ?? authResponse?.session?.rememberMe ?? false;
    const expiresAt = authResponse?.session?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    saveAuthSession({
        token: authResponse?.token || null,
        expiresAt,
        user: authResponse?.data || null,
        rememberMe
    });

    scheduleAutoLogout();
}

export async function logoutUser() {
    clearAuthSession();
    try { await api.post('/users/logout', {}); } catch (_) {}
    await updateAuthUI();

    if (!AUTH_PAGES.has(getPathname())) {
        redirectToLogin();
    }
}

export async function ensureAuthenticated({ redirectIfMissing = true } = {}) {
    if (!isAuthenticatedSession()) {
        try {
            const resp = await userApi.validateToken();
            saveAuthSession({
                token: null,
                expiresAt: resp?.session?.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                user: resp?.data || null,
                rememberMe: true
            });
            scheduleAutoLogout();
            return true;
        } catch (_) {
            if (redirectIfMissing && !AUTH_PAGES.has(getPathname())) {
                redirectToLogin();
            }
            return false;
        }
    }

    try {
        await userApi.validateToken();
        scheduleAutoLogout();
        return true;
    } catch (_) {
        clearAuthSession();
        if (redirectIfMissing && !AUTH_PAGES.has(getPathname())) {
            redirectToLogin();
        }
        return false;
    }
}

function createLink(text, href) {
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    a.className = 'text-gray-700 hover:text-blue-600 font-medium';
    return a;
}

function createButton(text, className, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.className = className;
    btn.onclick = onClick;
    return btn;
}

export async function updateAuthUI() {
    const containers = [
        document.getElementById('authArea'),
        document.getElementById('authAreaMobile')
    ];

    let session = getAuthSession();
    if (session) {
        try {
            const resp = await userApi.validateToken();
            session = { ...session, user: resp.data };
            saveAuthSession(session);
            scheduleAutoLogout();
        } catch (_) {
            clearAuthSession();
            session = null;
        }
    }

    for (const container of containers) {
        if (!container) continue;
        container.innerHTML = '';

        if (session && session.user) {
            const profileName = session.user.name || session.user.username || 'Profile';
            container.appendChild(createLink(profileName, '/profile'));
            container.appendChild(
                createButton(
                    'Logout',
                    'text-red-600 hover:text-red-800 font-medium',
                    logoutUser
                )
            );
        } else {
            container.appendChild(createLink('Login', '/login'));
            container.appendChild(createLink('Register', '/signup'));
        }
    }
}

export function showModal(id) {
    document.getElementById(id)?.classList.add('active');
}

export function hideModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

export async function loadProfileIntoModal() {
    const profileNameInput = document.getElementById('profileName');
    const profileEmailInput = document.getElementById('profileEmail');
    const ordersList = document.getElementById('ordersList');

    const profileResp = await userApi.getProfile();
    const user = profileResp.data || {};

    if (profileNameInput) profileNameInput.value = user.name || '';
    if (profileEmailInput) profileEmailInput.value = user.email || '';

    if (ordersList) {
        const ordersResp = await orderApi.getMy();
        const orders = Array.isArray(ordersResp?.data) ? ordersResp.data : [];

        ordersList.innerHTML = '';
        if (orders.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No orders yet';
            ordersList.appendChild(li);
        } else {
            orders.slice(0, 10).forEach((order) => {
                const li = document.createElement('li');
                li.textContent = `${order.orderId} - Rs.${order.totalAmount} - ${order.status}`;
                ordersList.appendChild(li);
            });
        }
    }
}
