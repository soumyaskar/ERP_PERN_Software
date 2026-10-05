const pool = require('../config/db');

// Step 1: Convert an ACCEPTED Quotation to a Sales Order
const createSalesOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { quotation_id } = req.body;

        await client.query('BEGIN');

        // 1. Check if Quotation exists and is ACCEPTED
        const qRes = await client.query('SELECT * FROM quotations WHERE id = $1', [quotation_id]);
        if (qRes.rows.length === 0) throw new Error('Quotation not found');
        
        const quotation = qRes.rows[0];
        if (quotation.status !== 'ACCEPTED') {
            throw new Error('Only ACCEPTED quotations can be converted to Sales Orders.');
        }

        // 2. Create the Sales Order (Catches duplicate conversions via UNIQUE constraint)
        const order_number = `SO-${Date.now()}`;
        const orderRes = await client.query(
            `INSERT INTO sales_orders (order_number, quotation_id, customer_id, total_amount, status) 
             VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`,
            [order_number, quotation.id, quotation.customer_id, quotation.grand_total]
        );
        const order = orderRes.rows[0];

        // 3. Copy items from quotation_items to sales_order_items
        const itemsRes = await client.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [quotation_id]);
        const insertedItems = [];
        
        for (let item of itemsRes.rows) {
            const iRes = await client.query(
                `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, line_amount) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [order.id, item.product_id, item.quantity, item.unit_price, item.line_amount]
            );
            insertedItems.push(iRes.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Sales Order Created', order, items: insertedItems });

    } catch (error) {
        await client.query('ROLLBACK');
        // Handle the unique constraint error if quotation is converted twice
        if (error.code === '23505') {
            return res.status(400).json({ error: 'A Sales Order already exists for this Quotation.' });
        }
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// Step 2: Confirm Order & Reserve Inventory safely
const confirmOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params; // Sales Order ID

        await client.query('BEGIN');

        const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
        if (orderRes.rows.length === 0) throw new Error('Order not found');
        if (orderRes.rows[0].status !== 'PENDING') throw new Error('Only PENDING orders can be confirmed');

        const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);

        // Loop through items and reserve inventory safely
        for (let item of itemsRes.rows) {
            // CRITICAL: FOR UPDATE locks this row so no one else can read/modify it until we COMMIT
            const invRes = await client.query(
                `SELECT physical_qty, reserved_qty FROM inventory WHERE product_id = $1 FOR UPDATE`, 
                [item.product_id]
            );
            
            if (invRes.rows.length === 0) throw new Error(`Inventory record missing for product ${item.product_id}`);
            
            const { physical_qty, reserved_qty } = invRes.rows[0];
            const available = physical_qty - reserved_qty;

            if (item.quantity > available) {
                throw new Error(`Insufficient stock for product. Requested: ${item.quantity}, Available: ${available}`);
            }

            // Increase reserved quantity
            await client.query(
                `UPDATE inventory SET reserved_qty = reserved_qty + $1 WHERE product_id = $2`,
                [item.quantity, item.product_id]
            );
        }

        // Update Order Status
        const updatedOrder = await client.query(
            `UPDATE sales_orders SET status = 'CONFIRMED' WHERE id = $1 RETURNING *`, [id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Order Confirmed and Inventory Reserved', order: updatedOrder.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};
const getOrders = async (req, res) => {
    try {
        const query = `
            SELECT so.*, c.company_name 
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            ORDER BY so.created_at DESC
        `;
        const orders = await pool.query(query);
        res.json(orders.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = { createSalesOrder, confirmOrder , getOrders };