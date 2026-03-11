/**
 * API Service
 * Handles all HTTP requests to the backend server
 * 
 * @module services/api
 */

const API_BASE_URL = '/api';
const AUTH_SESSION_KEY = 'auth_session';
const CSRF_TOKEN_KEY = 'csrf_token';

function getStoredAuthToken() {
    try {
        const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.token ? parsed.token : null;
    } catch (_) {
        return null;
    }
}

function getStoredCsrfToken() {
    return sessionStorage.getItem(CSRF_TOKEN_KEY) || localStorage.getItem(CSRF_TOKEN_KEY) || null;
}

function storeCsrfToken(token) {
    if (!token) return;
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
}

/**
 * API Service class for making HTTP requests
 */
class ApiService {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.timeout = 10000; // 10 seconds timeout
    }

    /**
     * Makes a fetch request with timeout and error handling
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise} Response JSON
     */
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const authToken = getStoredAuthToken();
            const csrfToken = getStoredCsrfToken();
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            const nextCsrfToken = response.headers.get('x-csrf-token');
            if (nextCsrfToken) {
                storeCsrfToken(nextCsrfToken);
            }

            // Handle non-OK responses with specific error messages
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = '';

                if (response.status === 405) {
                    errorMessage = 'Server error: Method not allowed';
                } else if (response.status === 404) {
                    errorMessage = 'Resource not found';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later';
                } else if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || `Request failed: ${response.status}`;
                    } catch (e) {
                        errorMessage = `Server error: ${response.status} ${response.statusText}`;
                    }
                } else {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }

                throw new Error(errorMessage);
            }

            // Check if response has valid JSON content
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid server response format');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Provide specific error messages based on error type
            let displayMessage = error.message;
            if (error.name === 'AbortError') {
                displayMessage = 'Request timeout. Please try again';
            } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                displayMessage = 'Network error: Unable to connect to server';
            } else if (error.name === 'SyntaxError') {
                displayMessage = 'Server response error: Invalid data format';
            } else if (error.message.includes('JSON')) {
                displayMessage = 'Server error: Invalid response format';
            }
            
            console.error('[API Error]:', error);
            throw new Error(displayMessage);
        }
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise} Response data
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise} Response data
     */
    async post(endpoint, data) {
        return this.request(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise} Response data
     */
    async put(endpoint, data) {
        return this.request(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise} Response data
     */
    async delete(endpoint) {
        return this.request(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE'
        });
    }
}

// Create global API instance
const api = new ApiService();

// Product API methods
const productApi = {
    getAll: async (filters = {}) => {
        return api.get('/products', filters);
    },
    getById: async (id) => {
        return api.get(`/products/${id}`);
    },
    getByCategory: async (category) => {
        return api.get(`/categories/${category}`);
    },
    getCategories: async () => {
        return api.get('/categories');
    },
    getStats: async () => {
        return api.get('/products/stats');
    }
};

// Order API methods
const orderApi = {
    create: async (orderData) => {
        return api.post('/orders', orderData);
    },
    getAll: async () => {
        return api.get('/orders');
    },
    getMy: async () => {
        return api.get('/orders/me');
    },
    getById: async (orderId) => {
        return api.get(`/orders/${orderId}`);
    },
    getStats: async () => {
        return api.get('/orders/stats');
    }
};

// ============================================
// USER AUTHENTICATION API
// ============================================

const userApi = {
    register: async (userData) => {
        return api.post('/users/register', userData);
    },
    login: async (credentials) => {
        return api.post('/users/login', credentials);
    },
    authConfig: async () => {
        return api.get('/users/auth-config');
    },
    googleLogin: async (payload) => {
        return api.post('/users/google-login', payload);
    },
    logout: async () => {
        return api.post('/users/logout', {});
    },
    requestEmailOtp: async (email) => {
        return api.post('/users/request-email-otp', { email });
    },
    verifyEmailOtp: async (payload) => {
        return api.post('/users/verify-email-otp', payload);
    },
    forgotPassword: async (email) => {
        return api.post('/users/forgot-password', { email });
    },
    resetPassword: async (payload) => {
        return api.post('/users/reset-password', payload);
    },
    validateToken: async () => {
        return api.get('/users/validate');
    },
    getProfile: async () => {
        return api.get('/users/profile');
    },
    updateProfile: async (profileData) => {
        return api.put('/users/profile', profileData);
    },
    changePassword: async (passwordData) => {
        return api.put('/users/password', passwordData);
    },
    getAddresses: async () => {
        return api.get('/users/addresses');
    },
    addAddress: async (address) => {
        return api.post('/users/addresses', address);
    },
    removeAddress: async (addressId) => {
        return api.delete(`/users/addresses/${addressId}`);
    },
    getWishlist: async () => {
        return api.get('/users/wishlist');
    },
    addToWishlist: async (productId) => {
        return api.post('/users/wishlist', { productId });
    },
    removeFromWishlist: async (productId) => {
        return api.delete(`/users/wishlist/${productId}`);
    }
};

// Cart API methods
const cartApi = {
    getCart: async () => {
        return api.get('/cart');
    },
    addItem: async (productId, quantity = 1) => {
        return api.post('/cart/items', { productId, quantity });
    },
    updateItem: async (productId, quantity) => {
        return api.put(`/cart/items/${productId}`, { quantity });
    },
    removeItem: async (productId) => {
        return api.delete(`/cart/items/${productId}`);
    },
    clearCart: async () => {
        return api.delete('/cart');
    },
    mergeCart: async (localItems) => {
        return api.post('/cart/merge', { localItems });
    }
};

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.listeners = [];
    }

    async init() {
        try {
            const result = await userApi.validateToken();
            if (result.success) {
                this.currentUser = result.data;
                this.isAuthenticated = true;
                this.notifyListeners();
            }
        } catch (error) {
            console.log('[Auth] Not authenticated');
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    async login(emailOrUsername, password, rememberMe = false) {
        const result = await userApi.login({ emailOrUsername, password, rememberMe });
        if (result.success) {
            this.currentUser = result.data;
            this.isAuthenticated = true;
            this.notifyListeners();
            return result;
        }
        throw new Error(result.message);
    }

    async register(userData) {
        const result = await userApi.register(userData);
        return result;
    }

    async logout() {
        try {
            await userApi.logout();
        } catch (error) {
            console.log('[Auth] Logout API error:', error);
        }
        this.currentUser = null;
        this.isAuthenticated = false;
        this.notifyListeners();
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback({
            user: this.currentUser,
            isAuthenticated: this.isAuthenticated
        }));
    }
}

// Create global instances
const authManager = new AuthManager();

// Export for module imports
export { api, productApi, orderApi, userApi, cartApi, authManager, AuthManager };

// Export for global use
window.ApiService = ApiService;
window.api = api;
window.productApi = productApi;
window.orderApi = orderApi;
window.userApi = userApi;
window.cartApi = cartApi;
window.authManager = authManager;
