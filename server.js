const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Menu data file
const MENU_FILE = path.join(__dirname, 'menu.json');

// MySQL Database Connection - UPDATE THESE CREDENTIALS
const db = mysql.createConnection({
    host: 'localhost',          // Usually localhost
    user: 'root',              // XAMPP default
    password: '',              // XAMPP default is empty
    port: 3306,                // Default MySQL port
    database: 'serados_cafe_db' // We'll create this
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        console.log('Please check:');
        console.log('1. Is XAMPP MySQL running?');
        console.log('2. Port 3306 is free?');
        console.log('3. Username/password correct?');
        return;
    }
    console.log('✅ Connected to MySQL database');
    initializeDatabase();
});

// Create database and tables if they don't exist
function initializeDatabase() {
    // Create database
    db.query('CREATE DATABASE IF NOT EXISTS serados_cafe_db', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            return;
        }
        
        console.log('✅ Database ready');
        
        // Use the database
        db.changeUser({ database: 'serados_cafe_db' }, (err) => {
            if (err) {
                console.error('Error switching database:', err);
                return;
            }
            
            // Create orders table
            const createOrdersTable = `
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id VARCHAR(50) UNIQUE,
                    customer_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    city VARCHAR(50) NOT NULL,
                    address TEXT NOT NULL,
                    pickup_time VARCHAR(50),
                    items TEXT NOT NULL,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    status ENUM('received', 'preparing', 'ready', 'completed') DEFAULT 'received',
                    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            db.query(createOrdersTable, (err) => {
                if (err) {
                    console.error('❌ Error creating orders table:', err);
                } else {
                    console.log('✅ Orders table ready');
                }
            });
        });
    });
}

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

// Submit order (SAVES TO MYSQL DATABASE)
app.post('/api/order', (req, res) => {
    console.log('📦 Received order:', req.body);
    
    try {
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
        
        console.log('📊 Executing SQL with values:', values);
        
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('❌ Database error:', err);
                res.status(500).json({ 
                    success: false, 
                    error: 'Database error: ' + err.message 
                });
                return;
            }
            
            console.log('✅ Order saved to MySQL. ID:', result.insertId);
            
            res.json({ 
                success: true, 
                message: 'Order received successfully!', 
                orderId: orderId,
                mysqlId: result.insertId
            });
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error: ' + error.message 
        });
    }
});

// Get all orders (for admin view)
app.get('/api/orders', (req, res) => {
    const sql = 'SELECT * FROM orders ORDER BY order_date DESC LIMIT 50';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: 'Failed to fetch orders' });
            return;
        }
        
        // Parse items from JSON string
        results.forEach(order => {
            try {
                order.items = JSON.parse(order.items);
            } catch (e) {
                order.items = [];
            }
        });
        
        res.json(results);
    });
});

// Get order by ID
app.get('/api/orders/:id', (req, res) => {
    const sql = 'SELECT * FROM orders WHERE order_id = ? OR id = ?';
    
    db.query(sql, [req.params.id, req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching order:', err);
            res.status(500).json({ error: 'Failed to fetch order' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        const order = results[0];
        try {
            order.items = JSON.parse(order.items);
        } catch (e) {
            order.items = [];
        }
        
        res.json(order);
    });
});

// Update order status
app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const sql = 'UPDATE orders SET status = ? WHERE order_id = ? OR id = ?';
    
    db.query(sql, [status, req.params.id, req.params.id], (err, result) => {
        if (err) {
            console.error('Error updating order status:', err);
            res.status(500).json({ error: 'Failed to update order status' });
            return;
        }
        
        res.json({ success: true, message: 'Order status updated' });
    });
});

// Get order statistics
app.get('/api/orders/stats', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_orders,
            SUM(total_amount) as total_revenue,
            AVG(total_amount) as avg_order_value,
            status,
            city
        FROM orders 
        GROUP BY status, city
        ORDER BY total_orders DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching order stats:', err);
            res.status(500).json({ error: 'Failed to fetch statistics' });
            return;
        }
        
        res.json(results);
    });
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
    console.log(`🚀 Serados Cafe Server running on http://localhost:${PORT}`);
    console.log(`📊 Using MySQL database: serados_cafe_db`);
    console.log(`📞 Orders API: http://localhost:${PORT}/api/order`);
});
