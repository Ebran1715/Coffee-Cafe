const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Data files
const MENU_FILE = path.join(__dirname, 'menu.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Initialize files
const initializeFiles = async () => {
    try {
        // Create menu file if it doesn't exist
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
        console.log('✅ Menu file created');
    }
    
    try {
        // Create orders file if it doesn't exist
        await fs.access(ORDERS_FILE);
    } catch {
        await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
        console.log('✅ Orders file created');
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

// Submit order (SAVES TO JSON FILE)
app.post('/api/order', async (req, res) => {
    console.log('📦 Received order:', req.body);
    
    try {
        const order = req.body;
        const orderId = 'SER' + Date.now();
        
        // Read existing orders
        let orders = [];
        try {
            const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
            orders = JSON.parse(ordersData);
        } catch (error) {
            console.log('Starting new orders file');
        }
        
        // Create new order object
        const newOrder = {
            id: orders.length + 1,
            order_id: orderId,
            customer_name: order.name,
            phone: order.phone,
            city: order.city,
            address: order.location,
            pickup_time: order.pickupTime || '30 minutes',
            items: order.items,
            total_amount: order.total,
            status: 'received',
            order_date: new Date().toISOString()
        };
        
        // Add to orders array
        orders.push(newOrder);
        
        // Save to file
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        
        console.log('✅ Order saved to JSON file. ID:', orderId);
        
        res.json({ 
            success: true, 
            message: 'Order received successfully!', 
            orderId: orderId
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
app.get('/api/orders', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Return latest 50 orders
        const recentOrders = orders.slice(-50).reverse();
        
        res.json(recentOrders);
    } catch (error) {
        console.error('Error reading orders:', error);
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        const order = orders.find(o => 
            o.order_id === req.params.id || 
            o.id.toString() === req.params.id
        );
        
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error reading order:', error);
        res.status(500).json({ error: 'Failed to load order' });
    }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        let orders = JSON.parse(ordersData);
        
        const orderIndex = orders.findIndex(o => 
            o.order_id === req.params.id || 
            o.id.toString() === req.params.id
        );
        
        if (orderIndex === -1) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        // Update status
        orders[orderIndex].status = status;
        
        // Save updated orders
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        
        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Get order statistics
app.get('/api/orders/stats', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        if (orders.length === 0) {
            res.json({
                total_orders: 0,
                total_revenue: 0,
                avg_order_value: 0
            });
            return;
        }
        
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        const avgOrderValue = totalRevenue / totalOrders;
        
        // Group by status
        const statusCounts = {};
        const cityCounts = {};
        
        orders.forEach(order => {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
            cityCounts[order.city] = (cityCounts[order.city] || 0) + 1;
        });
        
        res.json({
            total_orders: totalOrders,
            total_revenue: totalRevenue,
            avg_order_value: avgOrderValue,
            status_counts: statusCounts,
            city_counts: cityCounts
        });
    } catch (error) {
        console.error('Error reading orders stats:', error);
        res.status(500).json({ error: 'Failed to load statistics' });
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

// Export orders to CSV
app.get('/api/orders/export/csv', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        let csv = 'Order ID,Customer Name,Phone,City,Total Amount,Status,Order Date\n';
        
        orders.forEach(order => {
            const itemsText = order.items.map(item => 
                `${item.name} (x${item.quantity})`
            ).join('; ');
            
            csv += `"${order.order_id}","${order.customer_name}","${order.phone}","${order.city}","${itemsText}",${order.total_amount},"${order.status}","${order.order_date}"\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment('serados_orders.csv');
        res.send(csv);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Serve admin pages
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Start server
app.listen(PORT, async () => {
    await initializeFiles();
    console.log(`🚀 Serados Cafe Server running on http://localhost:${PORT}`);
    console.log(`📝 Orders are saved to: orders.json`);
    console.log(`📋 Menu is loaded from: menu.json`);
    console.log(`📞 Orders API: http://localhost:${PORT}/api/order`);
    console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
});
