// appState.js
// Manages global application state with caching and filters

export class AppStateManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentCategory = 'all';
        this.currentSearch = '';
        this.isLoading = false;
        this.isInitialized = false;
        this.abortController = null;
        
        // Cache configuration
        this.cacheKey = 'abhishek_products_cache';
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    getCachedProducts() {
        try {
            const cached = sessionStorage.getItem(this.cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < this.cacheExpiry) {
                    console.log('[Cache] Using cached products');
                    return data;
                }
            }
        } catch (e) {
            console.warn('[Cache] Read error:', e);
        }
        return null;
    }

    setCachedProducts(products) {
        try {
            sessionStorage.setItem(this.cacheKey, JSON.stringify({
                data: products,
                timestamp: Date.now()
            }));
            console.log('[Cache] Products cached');
        } catch (e) {
            console.warn('[Cache] Write error:', e);
        }
    }

    clearCache() {
        sessionStorage.removeItem(this.cacheKey);
    }

    filterProducts() {
        let filtered = this.products;

        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category && p.category.toLowerCase() === this.currentCategory.toLowerCase());
        }

        // Filter by search
        if (this.currentSearch.trim() !== '') {
            const term = this.currentSearch.toLowerCase().trim();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term)) ||
                (p.category && p.category.toLowerCase().includes(term))
            );
        }

        this.filteredProducts = filtered;
    }

    reset() {
        this.products = [];
        this.filteredProducts = [];
        this.currentCategory = 'all';
        this.currentSearch = '';
        this.isLoading = false;
        this.isInitialized = false;
    }
}

// export a shared instance
export const AppState = new AppStateManager();

// expose for legacy inline handlers/components
window.AppState = AppState;
