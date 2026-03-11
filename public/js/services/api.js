/**
 * API Service - MySQL Backend Integration
 * Handles all HTTP requests to the backend server
 * 
 * @module services/api
 */

const API_BASE_URL = '/api';
const AUTH_SESSION_KEY = 'auth_session';
const TOKEN_KEY = 'auth_token';

// ============================================
// TOKEN MANAGEMENT
// ============================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token, remember = false) {
    if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        sessionStorage.setItem(TOKEN_KEY, token);
    }
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

function getStoredAuth() {
    try {
        const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

// ============================================
// API CLIENT
// ============================================

class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.timeout = 15000;
    }

    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const token = getToken();

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal,
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = 'Request failed';

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {}
                }

                // Handle 401 specifically - token might be expired
                if (response.status === 401) {
                    removeToken();
                    if (!endpoint.includes('/auth/login')) {
                        window.location.href = '/login';
                    }
                }

                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid server response');
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            let displayMessage = error.message;
            if (error.name === 'AbortError') {
                displayMessage = 'Request timeout. Please try again';
            } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                displayMessage = 'Cannot connect to server';
            }
            
            console.error('[API Error]:', error);
            throw new Error(displayMessage);
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Create API instance
const api = new ApiClient();

// ============================================
// AUTH API
// ============================================

const authApi = {
    // Register new user
    register: async (userData) => {
        const result = await api.post('/auth/register', userData);
        
        // Auto-login after registration
        if (result.success && result.data.token) {
            setToken(result.data.token, true);
            localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result.data));
        }
        
        return result;
    },

    // Login user
    login: async (credentials) => {
        const result = await api.post('/auth/login', credentials);
        
        if (result.success && result.data.token) {
            setToken(result.data.token, credentials.rememberMe);
            localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result.data));
        }
        
        return result;
    },

    // Logout user
    logout: async () => {
        try {
            await api.post('/auth/logout', {});
        } catch (e) {
            // Ignore logout API errors
        }
        removeToken();
        localStorage.removeItem(AUTH_SESSION_KEY);
    },

    // Verify token
    verify: async () => {
        return api.get('/auth/verify');
    },

    // Get profile
    getProfile: async () => {
        return api.get('/auth/profile');
    },

    // Update profile
    updateProfile: async (data) => {
        return api.put('/auth/profile', data);
    },

    // Change password
    changePassword: async (data) => {
        return api.put('/auth/password', data);
    },

    // Check if logged in
    isAuthenticated: () => {
        return !!getToken();
    },

    // Get current user from storage
    getCurrentUser: () => {
        const auth = getStoredAuth();
        return auth ? auth.user : null;
    }
};

// ============================================
// PRODUCT API
// ============================================

const productApi = {
    getAll: async (filters = {}) => {
        return api.get('/products', filters);
    },
    getById: async (id) => {
        return api.get(`/products/${id}`);
    },
    getStats: async () => {
        return api.get('/products/stats');
    }
};

// ============================================
// ORDER API
// ============================================

const orderApi = {
    create: async (orderData) => {
        return api.post('/orders', orderData);
    },
    getAll: async (filters = {}) => {
        return api.get('/orders', filters);
    },
    getMy: async () => {
        return api.get('/orders/my/orders');
    },
    getById: async (orderId) => {
        return api.get(`/orders/${orderId}`);
    },
    getStats: async () => {
        return api.get('/orders/stats');
    }
};

// ============================================
// ADMIN API
// ============================================

const adminApi = {
    // Admin auth
    login: async (credentials) => {
        const result = await api.post('/admin/auth/login', credentials);
        
        if (result.success && result.data.token) {
            setToken(result.data.token, true);
            localStorage.setItem('admin_token', result.data.token);
            localStorage.setItem('adminUser', JSON.stringify(result.data.admin));
        }
        
        return result;
    },

    logout: async () => {
        try {
            await api.post('/admin/auth/logout', {});
        } catch (e) {}
        removeToken();
        localStorage.removeItem('admin_token');
        localStorage.removeItem('adminUser');
    },

    verify: async () => {
        return api.get('/admin/auth/verify');
    },

    // Users
    getUsers: async (filters = {}) => {
        return api.get('/admin/users', filters);
    },
    getUser: async (id) => {
        return api.get(`/admin/users/${id}`);
    },
    createUser: async (data) => {
        return api.post('/admin/users', data);
    },
    updateUser: async (id, data) => {
        return api.put(`/admin/users/${id}`, data);
    },
    deleteUser: async (id, action = 'block') => {
        return api.delete(`/admin/users/${id}?action=${action}`);
    },

    // Dashboard
    getStats: async () => {
        return api.get('/admin/dashboard/stats');
    },

    // Products (admin)
    getAllProducts: async (filters = {}) => {
        return api.get('/products/admin/all', filters);
    },
    createProduct: async (data) => {
        return api.post('/products', data);
    },
    updateProduct: async (id, data) => {
        return api.put(`/products/${id}`, data);
    },
    deleteProduct: async (id) => {
        return api.delete(`/products/${id}`);
    },

    // Orders (admin)
    getAllOrders: async (filters = {}) => {
        return api.get('/orders/admin/all', filters);
    },
    updateOrderStatus: async (orderId, data) => {
        return api.put(`/orders/${orderId}/status`, data);
    }
};

// ============================================
// EXPORTS
// ============================================

export { api, authApi, productApi, orderApi, adminApi };

// Make available globally for non-module scripts
window.ApiClient = ApiClient;
window.api = api;
window.authApi = authApi;
window.productApi = productApi;
window.orderApi = orderApi;
window.adminApi = adminApi;

