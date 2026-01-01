require('dotenv').config();
// console.log('DB_HOST:', process.env.DB_HOST);
// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(empty)');
// console.log('DB_NAME:', process.env.DB_NAME);

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8005;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Menu data file
const MENU_FILE = path.join(__dirname, 'menu.json');

/* =========================
   MySQL CONNECTION POOL
   ========================= */
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB connection once
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err.message);
    } else {
        console.log('✅ Connected to MySQL database');
        connection.release();
    }
});

/* =========================
   INITIALIZE MENU FILE
   ========================= */
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

/* =========================
   ROUTES
   ========================= */

// Get menu
app.get('/api/menu', async (req, res) => {
    try {
        const data = await fs.readFile(MENU_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

// Place order
app.post('/api/order', (req, res) => {
    const order = req.body;
    const orderId = 'SER' + Date.now();

    const sql = `
        INSERT INTO orders
        (order_id, customer_name, phone, city, address, pickup_time, items, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        orderId,
        order.name,
        order.phone,
        order.city,
        order.location,
        order.pickupTime || '30 minutes',
        JSON.stringify(order.items),
        order.total
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('❌ Order insert failed:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        res.json({
            success: true,
            message: 'Order placed successfully!',
            orderId
        });
    });
});

// Get all orders
app.get('/api/orders', (req, res) => {
    db.query(
        'SELECT * FROM orders ORDER BY order_date DESC LIMIT 50',
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch orders' });
            }

            results.forEach(o => {
                try {
                    o.items = JSON.parse(o.items);
                } catch {
                    o.items = [];
                }
            });

            res.json(results);
        }
    );
});

// Update order status
app.put('/api/orders/:id/status', (req, res) => {
    const sql = 'UPDATE orders SET status = ? WHERE order_id = ? OR id = ?';

    db.query(sql, [req.body.status, req.params.id, req.params.id], err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update status' });
        }
        res.json({ success: true });
    });
});

// Cities
app.get('/api/cities', (req, res) => {
    res.json([
        { id: 1, name: "Bhairahawa" },
        { id: 2, name: "Kathmandu" },
        { id: 3, name: "Pokhara" },
        { id: 4, name: "Mustang" },
        { id: 5, name: "Butwal" }
    ]);
});

/* =========================
   START SERVER
   ========================= */
app.listen(PORT, async () => {
    await initializeMenu();
    console.log(`🚀 Server running on port ${PORT}`);
});
