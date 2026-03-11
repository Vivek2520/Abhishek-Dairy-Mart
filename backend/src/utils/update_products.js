const fs = require('fs');
const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));

// Add productId to products that don't have it
products.forEach((p, index) => {
    if (!p.productId) {
        // Generate productId: PRD + padded index
        p.productId = 'PRD' + String(index + 1).padStart(6, '0');
    }
});

fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
console.log('Added productId to all products');
console.log('Sample productIds:', products.slice(0, 5).map(p => p.productId));
