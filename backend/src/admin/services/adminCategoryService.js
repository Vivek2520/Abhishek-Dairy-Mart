/**
 * Admin Category Service
 * Handles category management operations
 */

const fs = require('fs');
const path = require('path');

function getAllCategories(options = {}) {
    try {
        const categoriesPath = path.join(__dirname, '../../../data/categories.json');
        let categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) || [];

        if (options.status) {
            categories = categories.filter(c => c.status === options.status);
        }

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            categories = categories.filter(c =>
                (c.name || '').toLowerCase().includes(searchLower)
            );
        }

        categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        return {
            success: true,
            data: categories
        };
    } catch (error) {
        console.error('[ERROR] getAllCategories:', error.message);
        throw error;
    }
}

function getCategoryById(categoryId) {
    try {
        const categoriesPath = path.join(__dirname, '../../../data/categories.json');
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) || [];

        const category = categories.find(c => c.id === categoryId);

        if (!category) {
            throw new Error('Category not found');
        }

        return {
            success: true,
            data: category
        };
    } catch (error) {
        console.error('[ERROR] getCategoryById:', error.message);
        throw error;
    }
}

function createCategory(categoryData) {
    try {
        const categoriesPath = path.join(__dirname, '../../../data/categories.json');
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) || [];

        if (!categoryData.name) {
            throw new Error('Category name is required');
        }

        const newCategory = {
            id: `CAT${String(categories.filter(c => c.id.startsWith('CAT')).length + 1).padStart(3, '0')}`,
            name: categoryData.name,
            description: categoryData.description || '',
            image: categoryData.image || null,
            parentId: categoryData.parentId || null,
            status: categoryData.status || 'active',
            displayOrder: categoryData.displayOrder || categories.length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        categories.push(newCategory);
        fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));

        return {
            success: true,
            message: 'Category created successfully',
            data: newCategory
        };
    } catch (error) {
        console.error('[ERROR] createCategory:', error.message);
        throw error;
    }
}

function updateCategory(categoryId, updates) {
    try {
        const categoriesPath = path.join(__dirname, '../../../data/categories.json');
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) || [];

        const category = categories.find(c => c.id === categoryId);

        if (!category) {
            throw new Error('Category not found');
        }

        const allowedFields = ['name', 'description', 'image', 'parentId', 'status', 'displayOrder'];
        allowedFields.forEach(field => {
            if (field in updates && updates[field] !== undefined) {
                category[field] = updates[field];
            }
        });

        category.updatedAt = new Date().toISOString();
        fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));

        return {
            success: true,
            message: 'Category updated successfully',
            data: category
        };
    } catch (error) {
        console.error('[ERROR] updateCategory:', error.message);
        throw error;
    }
}

function deleteCategory(categoryId) {
    try {
        const categoriesPath = path.join(__dirname, '../../../data/categories.json');
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) || [];

        const index = categories.findIndex(c => c.id === categoryId);

        if (index === -1) {
            throw new Error('Category not found');
        }

        categories.splice(index, 1);
        fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));

        return {
            success: true,
            message: 'Category deleted successfully'
        };
    } catch (error) {
        console.error('[ERROR] deleteCategory:', error.message);
        throw error;
    }
}

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
