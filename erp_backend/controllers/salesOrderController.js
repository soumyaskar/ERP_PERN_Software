const pool = require('../config/db');

// 1. Get all Sales Orders with items and customer info
const getOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                so.id,
                so.order_number,
                so.quotation_id,
                q.quotation_number,
                so.customer_id,
                c.company_name as customer_name,
                c.contact_person,
                c.email as customer_email,
                c.city as customer_city,
                so.order_date,
                so.total_amount,
                so.status,
                so.created_at,
                d.dispatch_number,
                d.vehicle_number,
                d.driver_name,
                d.dispatch_date,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', soi.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'unit', p.unit,
                            'quantity', soi.quantity,
                            'unit_price', soi.unit_price,
                            'line_amount', soi.line_amount
                        )
                    ) FILTER (WHERE soi.id IS NOT NULL), '[]'
                ) AS items
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
            LEFT JOIN products p ON soi.product_id = p.id
            LEFT JOIN dispatches d ON so.id = d.sales_order_id
            GROUP BY so.id, c.id, q.id, d.id
            ORDER BY so.created_at DESC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Get single Sales Order
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                so.*,
                q.quotation_number,
                c.company_name as customer_name,
                c.contact_person,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', soi.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'unit', p.unit,
                            'quantity', soi.quantity,
                            'unit_price', soi.unit_price,
                            'line_amount', soi.line_amount
                        )
                    ) FILTER (WHERE soi.id IS NOT NULL), '[]'
                ) AS items
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
            LEFT JOIN products p ON soi.product_id = p.id
            WHERE so.id = $1
            GROUP BY so.id, c.id, q.id
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sales Order not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Confirm Sales Order & Reserve Inventory (Admin only, concurrency protected)
const confirmOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Row-level lock on the sales order to prevent concurrent confirmation
        const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderRes.rows.length === 0) {
            throw new Error('Sales Order not found');
        }
        const order = orderRes.rows[0];

        if (order.status !== 'PENDING') {
            throw new Error(`Order cannot be confirmed. Current status is ${order.status}`);
        }

        // Fetch all line items for this sales order
        const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);
        if (itemsRes.rows.length === 0) {
            throw new Error('Cannot confirm an order with no product line items');
        }

        // CRITICAL CONCURRENCY & INTEGRITY CHECK:
        // Lock inventory rows FOR UPDATE in order of product_id to prevent deadlocks
        // and evaluate live available stock (physical - reserved - damaged)
        const sortedItems = [...itemsRes.rows].sort((a, b) => a.product_id.localeCompare(b.product_id));

        for (const item of sortedItems) {
            const invRes = await client.query(
                `SELECT product_id, physical_qty, reserved_qty, damaged_qty 
                 FROM inventory 
                 WHERE product_id = $1 
                 FOR UPDATE`,
                [item.product_id]
            );

            if (invRes.rows.length === 0) {
                throw new Error(`Inventory record not found for product ID ${item.product_id}`);
            }

            const inv = invRes.rows[0];
            const availableQty = inv.physical_qty - inv.reserved_qty - inv.damaged_qty;

            if (item.quantity > availableQty) {
                throw new Error(
                    `Insufficient available inventory. Required ${item.quantity}, but only ${availableQty} available.`
                );
            }
        }

        // All items have sufficient stock -> Reserve quantities
        for (const item of sortedItems) {
            await client.query(
                `UPDATE inventory 
                 SET reserved_qty = reserved_qty + $1, updated_at = NOW() 
                 WHERE product_id = $2`,
                [item.quantity, item.product_id]
            );
        }

        // Update sales order status to CONFIRMED
        const updatedOrder = await client.query(
            `UPDATE sales_orders SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );

        await client.query('COMMIT');
        res.status(200).json({ 
            message: 'Order confirmed and inventory reserved successfully', 
            order: updatedOrder.rows[0] 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// 4. Dispatch Sales Order (Admin only)
const dispatchOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { vehicle_number, driver_name, dispatch_date } = req.body;

        if (!vehicle_number || !driver_name) {
            return res.status(400).json({ error: 'Vehicle number and Driver name are required for dispatch' });
        }

        await client.query('BEGIN');

        // Row-level lock on the sales order
        const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderRes.rows.length === 0) {
            throw new Error('Sales Order not found');
        }
        const order = orderRes.rows[0];

        if (order.status === 'CANCELLED') {
            throw new Error('Cannot dispatch a cancelled order');
        }
        if (order.status === 'DISPATCHED') {
            throw new Error('Order has already been dispatched');
        }
        if (order.status !== 'CONFIRMED') {
            throw new Error(`Only CONFIRMED orders can be dispatched. Current status is ${order.status}`);
        }

        // Prevent duplicate dispatch
        const existingDispatch = await client.query('SELECT * FROM dispatches WHERE sales_order_id = $1', [id]);
        if (existingDispatch.rows.length > 0) {
            throw new Error('Dispatch record already exists for this order');
        }

        // Generate dispatch number: DSP-YYYYMMDD-XXXX
        const countRes = await client.query('SELECT COUNT(*) FROM dispatches');
        const seq = parseInt(countRes.rows[0].count, 10) + 1;
        const dispatchNumber = `DSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;

        // Create dispatch record
        const dispatchRes = await client.query(
            `INSERT INTO dispatches (dispatch_number, sales_order_id, dispatch_date, vehicle_number, driver_name) 
             VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5) 
             RETURNING *`,
            [dispatchNumber, id, dispatch_date || null, vehicle_number, driver_name]
        );
        const dispatch = dispatchRes.rows[0];

        // Fetch sales order line items
        const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);
        const insertedDispatchItems = [];

        // When stock is dispatched: Physical Quantity decreases AND Reserved Quantity decreases
        for (const item of itemsRes.rows) {
            const invRes = await client.query(
                `SELECT reserved_qty, physical_qty FROM inventory WHERE product_id = $1 FOR UPDATE`,
                [item.product_id]
            );
            const inv = invRes.rows[0];

            if (item.quantity > inv.reserved_qty) {
                throw new Error(`Dispatch quantity exceeds reserved inventory for product`);
            }

            // Deduct both physical and reserved
            await client.query(
                `UPDATE inventory 
                 SET physical_qty = physical_qty - $1, 
                     reserved_qty = reserved_qty - $1, 
                     updated_at = NOW() 
                 WHERE product_id = $2`,
                [item.quantity, item.product_id]
            );

            // Record in dispatch_items
            const dItemRes = await client.query(
                `INSERT INTO dispatch_items (dispatch_id, product_id, quantity) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [dispatch.id, item.product_id, item.quantity]
            );
            insertedDispatchItems.push(dItemRes.rows[0]);
        }

        // Update sales order status to DISPATCHED
        await client.query(`UPDATE sales_orders SET status = 'DISPATCHED', updated_at = NOW() WHERE id = $1`, [id]);

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Order dispatched successfully',
            dispatch,
            items: insertedDispatchItems
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// 5. Cancel Sales Order (and release reserved inventory if it was CONFIRMED)
const cancelOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderRes.rows.length === 0) {
            throw new Error('Sales Order not found');
        }
        const order = orderRes.rows[0];

        if (order.status === 'DISPATCHED') {
            throw new Error('Cannot cancel an order that has already been dispatched');
        }
        if (order.status === 'CANCELLED') {
            throw new Error('Order is already cancelled');
        }

        // If the order was CONFIRMED, release the reserved inventory
        if (order.status === 'CONFIRMED') {
            const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);
            for (const item of itemsRes.rows) {
                await client.query(
                    `UPDATE inventory 
                     SET reserved_qty = GREATEST(0, reserved_qty - $1), updated_at = NOW() 
                     WHERE product_id = $2`,
                    [item.quantity, item.product_id]
                );
            }
        }

        const updatedOrder = await client.query(
            `UPDATE sales_orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );

        await client.query('COMMIT');
        res.status(200).json({
            message: 'Order cancelled successfully and reserved inventory released',
            order: updatedOrder.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getOrders,
    getOrderById,
    confirmOrder,
    dispatchOrder,
    cancelOrder
};