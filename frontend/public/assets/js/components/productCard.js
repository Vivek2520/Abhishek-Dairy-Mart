/**
 * Product Card Component
 * Renders product cards with XSS protection
 * 
 * @module components/productCard
 */

/**
 * Product Card Renderer
 * Creates HTML for product cards with proper escaping
 */
class ProductCardRenderer {
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Format price for display
     * @param {number|string} price - Price value
     * @returns {string} Formatted price
     */
    static formatPrice(price) {
        if (typeof price === 'number') {
            return `₹${price}`;
        }
        return price || '₹0';
    }

    /**
     * Get stock badge class
     * @param {string} stock - Stock status
     * @returns {Object} CSS classes for stock badge
     */
    static getStockClasses(stock) {
        if (stock === 'In Stock') {
            return {
                bg: 'bg-green-100',
                text: 'text-green-600',
                label: 'In Stock'
            };
        } else if (stock === 'Low Stock') {
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-600',
                label: 'Low Stock'
            };
        } else {
            return {
                bg: 'bg-red-100',
                text: 'text-red-600',
                label: 'Out of Stock'
            };
        }
    }

    /**
     * Create product card HTML
     * @param {Object} product - Product object
     * @param {number} index - Index for animation delay
     * @returns {string} HTML string
     */
    static createCard(product, index = 0) {
        const stock = this.getStockClasses(product.stock);
        const priceDisplay = this.formatPrice(product.price);
        
        // Safely escape all user-generated content
        const name = this.escapeHtml(product.name);
        const description = product.description ? this.escapeHtml(product.description) : '';
        const mrpDisplay = product.mrp ? `<span class="text-sm text-gray-400 line-through ml-2">₹${product.mrp}</span>` : '';
        
        // Handle custom attributes if present
        let customAttrsHTML = '';
        if (product.customAttributes && Array.isArray(product.customAttributes) && product.customAttributes.length > 0) {
            customAttrsHTML = '<div class="mt-2 flex flex-wrap gap-1">';
            product.customAttributes.forEach(attr => {
                const key = this.escapeHtml(attr.key);
                const value = this.escapeHtml(attr.value);
                customAttrsHTML += `<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">${key}: ${value}</span>`;
            });
            customAttrsHTML += '</div>';
        }

        return `
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden card-hover fade-in" 
                 style="animation-delay: ${index * 0.05}s"
                 data-product-id="${product.id}">
                <div class="relative h-48 overflow-hidden">
                    <img src="${product.image}" 
                         alt="${name}" 
                         class="w-full h-full object-cover" 
                         loading="lazy" 
                         onerror="this.src='https://placehold.co/300x300?text=Product'">
                    <div class="absolute top-4 right-4 ${stock.bg} ${stock.text} text-xs font-bold px-3 py-1 rounded-full">
                        ${stock.label}
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="font-bold text-gray-800 text-lg mb-1 line-clamp-2">${name}</h3>
                    ${description ? `<p class="text-sm text-gray-500 mb-2 line-clamp-1">${description}</p>` : ''}
                    ${customAttrsHTML}
                    <div class="flex justify-between items-center mt-4">
                        <div>
                            <span class="text-2xl font-bold text-blue-600">${priceDisplay}</span>${mrpDisplay}
                        </div>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition" 
                                onclick="window.productActions.addToCart(${product.id})"
                                aria-label="Add ${name} to cart">
                            <i class="fas fa-shopping-cart mr-2"></i>Add
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create skeleton loading card
     * @returns {string} HTML string
     */
    static createSkeleton() {
        return `
            <div class="skeleton-card">
                <div class="skeleton h-48 w-full"></div>
                <div class="p-6 space-y-3">
                    <div class="skeleton h-4 w-3/4 rounded"></div>
                    <div class="skeleton h-4 w-1/2 rounded"></div>
                    <div class="flex justify-between pt-2">
                        <div class="skeleton h-6 w-20 rounded"></div>
                        <div class="skeleton h-10 w-24 rounded-lg"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create multiple skeleton cards
     * @param {number} count - Number of skeletons
     * @returns {string} HTML string
     */
    static createSkeletons(count = 8) {
        return Array(count).fill(null).map(() => this.createSkeleton()).join('');
    }
}

/**
 * Product Actions
 * Handles user interactions with products
 */
class ProductActions {
    /**
     * Add product to cart
     * @param {number} productId - Product ID
     */
    addToCart(productId) {
        // Find product in state
        const product = window.AppState.filteredProducts.find(p => p.id === productId)
            || window.AppState.products.find(p => p.id === productId);

        if (product) {
            window.cart.add(product);
            window.AppUI.showNotification(`✅ ${product.name} added to cart!`, 'success');
        } else {
            console.error('[Product] Product not found:', productId);
            window.AppUI.showNotification('❌ Product not found', 'error');
        }
    }

    /**
     * View product details
     * @param {number} productId - Product ID
     */
    viewDetails(productId) {
        console.log('[Product] View details:', productId);
        // Future: Open product detail modal
    }
}

// expose for module imports
export { ProductCardRenderer, ProductActions };

// create a default singleton for convenience
export const productActions = new ProductActions();
