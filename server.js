const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 2000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Menu data file
const MENU_FILE = path.join(__dirname, 'menu.json');

// Initialize menu data
const initializeMenu = async () => {
    try {
        await fs.access(MENU_FILE);
    } catch {
        const initialMenu = {
            categories: [
                {
                    id: 1,
                    name: "Coffee Specialties",
                    items: [
                        { id: 1, name: "Serados Special Blend", price: 220, description: "Our signature coffee blend" },
                        { id: 2, name: "Nepali Chiya", price: 80, description: "Traditional Nepali tea with milk" },
                        { id: 3, name: "Masala Chai", price: 100, description: "Spiced Indian tea" },
                        { id: 4, name: "Cold Brew Coffee", price: 180, description: "Smooth cold brewed coffee" }
                    ]
                },
                {
                    id: 2,
                    name: "Local Delights",
                    items: [
                        { id: 5, name: "Momo Platter", price: 320, description: "Steamed dumplings with dipping sauce" },
                        { id: 6, name: "Sel Roti", price: 120, description: "Traditional Nepali rice doughnut" },
                        { id: 7, name: "Sukuti Sandwich", price: 250, description: "Dried meat sandwich with local spices" }
                    ]
                },
                {
                    id: 3,
                    name: "Pastries & Snacks",
                    items: [
                        { id: 8, name: "Butter Croissant", price: 160, description: "Freshly baked French pastry" },
                        { id: 9, name: "Samosa", price: 80, description: "Fried pastry with potato filling" },
                        { id: 10, name: "Chocolate Muffin", price: 180, description: "Fresh baked chocolate muffin" }
                    ]
                },
                {
                    id: 4,
                    name: "Refreshments",
                    items: [
                        { id: 11, name: "Lassi", price: 160, description: "Traditional yogurt drink" },
                        { id: 12, name: "Fresh Lime Soda", price: 100, description: "Refreshing lime drink" },
                        { id: 13, name: "Iced Tea", price: 120, description: "Chilled tea with lemon" }
                    ]
                }
            ]
        };
        await fs.writeFile(MENU_FILE, JSON.stringify(initialMenu, null, 2));
    }
};

// Get all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const data = await fs.readFile(MENU_FILE, 'utf8');
        const menu = JSON.parse(data);
        res.json(menu);
    } catch (error) {
        console.error('Error reading menu:', error);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

// Add new item to menu
app.post('/api/menu', async (req, res) => {
    try {
        const data = await fs.readFile(MENU_FILE, 'utf8');
        const menu = JSON.parse(data);
        const newItem = req.body;
        
        // Add the new item to the appropriate category
        const category = menu.categories.find(c => c.id === newItem.categoryId);
        if (category) {
            newItem.id = Date.now(); // Simple ID generation
            category.items.push(newItem);
            await fs.writeFile(MENU_FILE, JSON.stringify(menu, null, 2));
            res.status(201).json(newItem);
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ error: 'Failed to add menu item' });
    }
});

// Submit order
app.post('/api/order', async (req, res) => {
    try {
        const order = req.body;
        const orderData = {
            ...order,
            orderId: Date.now(),
            timestamp: new Date().toISOString(),
            status: 'received'
        };
        
        console.log('New order received:', orderData);
        
        // In a real app, you would save to a database
        // For now, just return success
        res.json({ 
            success: true, 
            message: 'Order received!', 
            orderId: orderData.orderId 
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

// Get cities for dropdown
app.get('/api/cities', (req, res) => {
    const cities = [
        { id: 1, name: "Bhairahawa" },
        { id: 2, name: "Kathmandu" },
        { id: 3, name: "Pokhara" },
        { id: 4, name: "Mustang" },
        { id: 5, name: "Butwal" }
    ];
    res.json(cities);
});

// Start server
app.listen(PORT, async () => {
    await initializeMenu();
    console.log(`Serados Cafe Server running on http://localhost:${PORT}`);
});