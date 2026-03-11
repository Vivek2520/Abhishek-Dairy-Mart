// imageOptimizer.js
// lazy load images and handle fallbacks

export class ImageOptimizer {
    static setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const images = document.querySelectorAll('img[loading="lazy"]');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                        }
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });
            images.forEach(img => observer.observe(img));
        }
    }

    static addFallback(img) {
        img.onerror = function() {
            this.src = 'https://placehold.co/300x300?text=No+Image';
            this.style.objectFit = 'contain';
        };
    }

    static preloadCritical() {
        // preload above-the-fold images
        const criticalImages = document.querySelectorAll('[data-preload]');
        criticalImages.forEach(img => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = img.src;
            document.head.appendChild(link);
        });
    }
}

// initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ImageOptimizer.setupLazyLoading());
} else {
    ImageOptimizer.setupLazyLoading();
}
