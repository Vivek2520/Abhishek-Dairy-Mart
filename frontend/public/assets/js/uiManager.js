// uiManager.js
// Handles DOM updates and user interactions

import { ProductCardRenderer, ProductActions } from './components/productCard.js';
import { AppState } from './appState.js';
import { cart } from './services/cart.js';
import { productApi } from './services/api.js';

export class UIManager {
    constructor() {
        this.elements = {
            productsContainer: document.getElementById('productsContainer'),
            initialLoadingSpinner: document.getElementById('initialLoadingSpinner'),
            filterLoadingSpinner: document.getElementById('filterLoadingSpinner'),
            noProducts: document.getElementById('noProducts'),
            searchProduct: document.getElementById('searchProduct'),
            clearSearch: document.getElementById('clearSearch'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            categoryFilters: document.getElementById('categoryFilters')
        };
    }

    showInitialLoading() {
        if (!this.elements.productsContainer) return;

        if (this.elements.initialLoadingSpinner) {
            this.elements.initialLoadingSpinner.classList.remove('hidden');
        }
        if (this.elements.noProducts) {
            this.elements.noProducts.classList.add('hidden');
        }

        this.elements.productsContainer.innerHTML = ProductCardRenderer.createSkeletons(8);
        this.elements.productsContainer.style.opacity = '0.5';
        this.elements.productsContainer.style.pointerEvents = 'none';
    }

    hideLoading() {
        if (!this.elements.productsContainer) return;

        if (this.elements.initialLoadingSpinner) {
            this.elements.initialLoadingSpinner.classList.add('hidden');
        }
        if (this.elements.filterLoadingSpinner) {
            this.elements.filterLoadingSpinner.classList.add('hidden');
        }

        this.elements.productsContainer.style.opacity = '1';
        this.elements.productsContainer.style.pointerEvents = 'auto';
    }

    displayProducts(products) {
        if (!this.elements.productsContainer) return;

        if (!products || products.length === 0) {
            this.elements.productsContainer.innerHTML = '';
            if (this.elements.noProducts) {
                this.elements.noProducts.classList.remove('hidden');
            }
            return;
        }
        
        // Hide no products message
        if (this.elements.noProducts) {
            this.elements.noProducts.classList.add('hidden');
        }
        
        // incremental render to avoid huge DOM updates
        const BATCH = 50;
        let index = 0;
        this.elements.productsContainer.innerHTML = '';
        const appendBatch = () => {
            const fragment = document.createDocumentFragment();
            const end = Math.min(index + BATCH, products.length);
            for (; index < end; index++) {
                const p = products[index];
                const div = document.createElement('div');
                if (ProductCardRenderer && ProductCardRenderer.createCard) {
                    try {
                        div.innerHTML = ProductCardRenderer.createCard(p, index);
                        fragment.appendChild(div.firstElementChild);
                    } catch (err) {
                        console.error('[ProductCard] Error rendering:', err, p);
                    }
                }
            }
            this.elements.productsContainer.appendChild(fragment);
            attachLazyObserver();
            if (index < products.length) {
                // schedule next batch after a small delay
                setTimeout(appendBatch, 0);
            } else {
                console.log(`[Products] Finished rendering ${products.length} products`);
            }
        };
        appendBatch();
    }

    showNotification(msg, type = 'info') {
        // simple toast
        const el = document.createElement('div');
        el.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white bg-${type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue'}-600`;
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
}

// helper to attach observer to images for incremental loading (optional)
function attachLazyObserver() {
    if ('IntersectionObserver' in window) {
        const imgs = document.querySelectorAll('img[loading="lazy"]');
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    io.unobserve(img);
                }
            });
        });
        imgs.forEach(img => io.observe(img));
    }
}

// export a shared UI instance placeholder; initialized later
export let AppUI;
