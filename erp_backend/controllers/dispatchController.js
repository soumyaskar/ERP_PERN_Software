const pool = require('../config/db');

const createDispatch = async (req, res) => {
    const client = await pool.connect();
    try {
        const { sales_order_id, vehicle_number, driver_name } = req.body;

        await client.query('BEGIN');

        // 1. Verify Sales Order exists and is CONFIRMED
        const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [sales_order_id]);
        if (orderRes.rows.length === 0) throw new Error('Sales Order not found');
        if (orderRes.rows[0].status !== 'CONFIRMED') {
            throw new Error('Only CONFIRMED orders can be dispatched');
        }

        // 2. Generate dispatch number
        const dispatch_number = `DSP-${Date.now()}`;

        // 3. Create Dispatch Record
        const dispatchRes = await client.query(
            `INSERT INTO dispatches (dispatch_number, sales_order_id, vehicle_number, driver_name) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [dispatch_number, sales_order_id, vehicle_number, driver_name]
        );
        const dispatch = dispatchRes.rows[0];

        // 4. Get items and deduct inventory
        const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [sales_order_id]);
        const insertedItems = [];

        for (let item of itemsRes.rows) {
            // CRITICAL: Reduce BOTH physical and reserved quantities since stock has left the building
            await client.query(
                `UPDATE inventory 
                 SET physical_qty = physical_qty - $1, 
                     reserved_qty = reserved_qty - $1 
                 WHERE product_id = $2`,
                [item.quantity, item.product_id]
            );

            // Record dispatch item
            const dItemRes = await client.query(
                `INSERT INTO dispatch_items (dispatch_id, product_id, quantity) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [dispatch.id, item.product_id, item.quantity]
            );
            insertedItems.push(dItemRes.rows[0]);
        }

        // 5. Update Sales Order status to DISPATCHED
        await client.query(`UPDATE sales_orders SET status = 'DISPATCHED' WHERE id = $1`, [sales_order_id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Order Dispatched Successfully', dispatch, items: insertedItems });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getDispatches = async (req, res) => {
    try {
        const query = `
            SELECT d.*, so.order_number 
            FROM dispatches d
            JOIN sales_orders so ON d.sales_order_id = so.id
            ORDER BY d.created_at DESC
        `;
        const dispatches = await pool.query(query);
        res.json(dispatches.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createDispatch, getDispatches };