/**
 * Authentication Helpers
 * Handles login session, logout, and auth state
 * 
 * @module authHelpers
 */

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ============================================
// TOKEN MANAGEMENT
// ============================================

export function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token, remember = false) {
    if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        sessionStorage.setItem(TOKEN_KEY, token);
    }
}

export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

// ============================================
// USER MANAGEMENT
// ============================================

export function getCurrentUser() {
    try {
        const userData = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    } catch (e) {
        return null;
    }
}

export function setCurrentUser(user, remember = false) {
    const userData = JSON.stringify(user);
    if (remember) {
        localStorage.setItem(USER_KEY, userData);
    } else {
        sessionStorage.setItem(USER_KEY, userData);
    }
}

export function removeCurrentUser() {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
}

// ============================================
// AUTH STATE
// ============================================

export function isAuthenticated() {
    return !!getToken();
}

export function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

export function isAdmin() {
    return getUserRole() === 'admin';
}

// ============================================
// LOGIN SESSION
// ============================================

export function applyLoginSession(result, remember = false) {
    if (result.data && result.data.token) {
        setToken(result.data.token, remember);
        setCurrentUser(result.data.user, remember);
    }
}

export async function ensureAuthenticated(options = { redirectIfMissing: true }) {
    try {
        const token = getToken();
        
        if (!token) {
            if (options.redirectIfMissing) {
                window.location.href = '/login?returnTo=' + encodeURIComponent(window.location.pathname);
            }
            return false;
        }

        // Optionally verify with server
        if (options.verify !== false) {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                removeToken();
                removeCurrentUser();
                if (options.redirectIfMissing) {
                    window.location.href = '/login';
                }
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('[Auth] Check error:', error);
        if (options.redirectIfMissing) {
            window.location.href = '/login';
        }
        return false;
    }
}

// ============================================
// LOGOUT
// ============================================

export async function logoutUser() {
    try {
        // Call logout API
        const token = getToken();
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.log('[Auth] Logout API error:', error);
    } finally {
        removeToken();
        removeCurrentUser();
        window.location.href = '/login';
    }
}

export async function logoutAdmin() {
    try {
        const token = getToken();
        if (token) {
            await fetch('/api/admin/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.log('[Admin] Logout error:', error);
    } finally {
        removeToken();
        removeCurrentUser();
        localStorage.removeItem('admin_token');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin';
    }
}

// ============================================
// UI HELPERS
// ============================================

export function updateAuthUI() {
    const user = getCurrentUser();
    
    // Update user name displays
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = user ? user.name : '';
    });

    // Update login/logout buttons
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    if (isAuthenticated()) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (signupBtn) signupBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (signupBtn) signupBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

// ============================================
// REDIRECT HELPERS
// ============================================

export function getReturnUrl(defaultUrl = '/') {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    
    if (returnTo && returnTo.startsWith('/')) {
        return returnTo;
    }
    return defaultUrl;
}

export function redirectAfterLogin() {
    const returnTo = getReturnUrl('/');
    window.location.href = returnTo;
}

// Make functions available globally
window.getToken = getToken;
window.setToken = setToken;
window.removeToken = removeToken;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.isAuthenticated = isAuthenticated;
window.getUserRole = getUserRole;
window.isAdmin = isAdmin;
window.applyLoginSession = applyLoginSession;
window.ensureAuthenticated = ensureAuthenticated;
window.logoutUser = logoutUser;
window.logoutAdmin = logoutAdmin;
window.updateAuthUI = updateAuthUI;
window.getReturnUrl = getReturnUrl;
window.redirectAfterLogin = redirectAfterLogin;

