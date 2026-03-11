// init.js
// main entry module for the application, imports other modules and starts the app

import { AppState } from './appState.js';
import { UIManager, AppUI } from './uiManager.js';
import { cart } from './services/cart.js';
import { productApi } from './services/api.js';
// productCard is heavy; load lazily when products render
let productActions;
import { updateAuthUI, ensureAuthenticated } from './authHelpers.js';
// authHelpers.js will export functions previously in main.js

// helper for debounced handlers, can also import from uiManager if exported

let appUI;

// Keep legacy global access working for modules/components that still use window.
window.AppState = AppState;

// dynamically load productCard module when needed
async function loadProductComponents() {
    if (!productActions) {
        const mod = await import('./components/productCard.js');
        productActions = mod.productActions;
        // attach to global for older code
        window.productActions = productActions;
    }
}

function normalizeProductsResponse(resp) {
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray(resp.data)) return resp.data;
    return [];
}

async function loadProductsFromLocalFile() {
    const response = await fetch('/products.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Local products fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return normalizeProductsResponse(data);
}

function areProductsEqual(listA, listB) {
    if (!Array.isArray(listA) || !Array.isArray(listB)) return false;
    if (listA.length !== listB.length) return false;
    try {
        return JSON.stringify(listA) === JSON.stringify(listB);
    } catch (_) {
        return false;
    }
}

async function fetchProductsWithFallback() {
    let products = [];

    try {
        const resp = await productApi.getAll();
        products = normalizeProductsResponse(resp);
    } catch (apiError) {
        console.warn('[Products] API load failed, trying local products.json fallback:', apiError);
    }

    if (!Array.isArray(products) || products.length === 0) {
        products = await loadProductsFromLocalFile();
    }

    return products;
}

// search / filter handlers - exported for use in other modules
export function handleCategoryChange(category) {
    AppState.currentCategory = category;
    AppState.filterProducts();
    appUI.displayProducts(AppState.filteredProducts);
}

export function handleSearchChange(searchTerm) {
    AppState.currentSearch = searchTerm;
    AppState.filterProducts();
    appUI.displayProducts(AppState.filteredProducts);
}

async function loadProducts() {
    let cached = null;

    try {
        appUI.showInitialLoading();
        AppState.isLoading = true;
        cached = AppState.getCachedProducts();

        if (Array.isArray(cached) && cached.length > 0) {
            AppState.products = cached;
            AppState.filteredProducts = [...cached];
            AppState.isInitialized = true;
            await loadProductComponents();
            appUI.hideLoading();
            appUI.displayProducts(AppState.filteredProducts);
        }

        const products = await fetchProductsWithFallback();

        AppState.products = products;
        AppState.filteredProducts = [...AppState.products];
        if (AppState.products.length > 0) {
            AppState.setCachedProducts(AppState.products);
        }
        AppState.isInitialized = true;
        appUI.hideLoading();
        await loadProductComponents();
        if (!areProductsEqual(cached, AppState.products)) {
            appUI.displayProducts(AppState.products);
        }
    } catch (error) {
        console.error('[Products] Error loading:', error);
        appUI.hideLoading();
        if (Array.isArray(cached) && cached.length > 0) {
            console.warn('[Products] Refresh failed, keeping cached products');
            appUI.displayProducts(cached);
        } else {
            appUI.displayProducts([]);
        }
    } finally {
        AppState.isLoading = false;
    }
}

function initEventListeners() {
    // mobile menu toggle
    const menuBtn = document.getElementById('menuToggle');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.toggle('hidden');
            }
        });
    }
    
    // search input listener
    const searchInput = document.getElementById('searchProduct');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchChange(e.target.value);
            }, 300);
        });
    }
    
    // category filter listeners
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (filterButtons) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                if (category) {
                    handleCategoryChange(category);
                    // Update active state
                    filterButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
    }
}

// initialize application
async function initApp() {
    console.log('🚀 Initializing Abhishek Dairy Store (module version)...');
    const isAuthenticated = await ensureAuthenticated({ redirectIfMissing: true });
    if (!isAuthenticated) return;

    appUI = new UIManager();
    window.AppUI = appUI;
    await updateAuthUI();
    cart.load();
    initEventListeners();
    await loadProducts();
    console.log('✅ Application initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// expose global utilities that other legacy code might expect
window.handleCategoryChange = handleCategoryChange;
window.filterByCategory = handleCategoryChange;
window.handleSearchChange = handleSearchChange;
window.reloadProducts = async function reloadProducts() {
    AppState.clearCache();
    await loadProducts();
};
window.productActions = productActions;
